/**
 * خدمة النشر المباشر على سلة
 * تدعم النشر التلقائي مع تحديث التوكن
 */

import { GoogleGenAI } from "@google/genai";
import { db } from "./db";
import { uploadedProducts } from "@shared/schema";
import { getValidAccessToken } from "./salla-oauth";
import { buildProductPrompt } from "./prompts";
import { searchProductImages, getBestProductImage } from "./google-search";

interface SallaProductPayload {
  name: string;
  price: number;
  quantity: number;
  description: string;
  sku: string;
  barcode: string;
  product_type: string;
  status: string;
  images?: Array<{ original: string }>;
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

interface ProductGenerationResult {
  productName: string;
  seoTitle: string;
  description: string;
  sku: string;
  barcode: string;
  images: string[];
  category: string;
  brand: string;
}

/**
 * تحليل المنتج وتوليد المحتوى باستخدام Gemini
 */
export async function generateProductContent(
  productNameInput: string,
  ocrText: string = ""
): Promise<ProductGenerationResult | null> {
  try {
    const geminiApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error("[Salla Publisher] Gemini API key not configured");
      return null;
    }

    console.log(`[Salla Publisher] Generating content for: ${productNameInput}`);

    // بناء البرومبت
    const prompt = buildProductPrompt(productNameInput, ocrText);

    // إنشاء عميل Gemini
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // توليد المحتوى
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const content = response.text;
    if (!content) {
      console.error("[Salla Publisher] No response from Gemini");
      return null;
    }

    // استخراج JSON من الاستجابة
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Salla Publisher] No JSON found in response");
      return null;
    }

    const productData = JSON.parse(jsonMatch[0]);

    // البحث عن صور المنتج
    console.log("[Salla Publisher] Searching for product images...");
    const brand = productData.brand || "";
    const productName = productData.product_name_en || productData.product_name || "";
    const images = await searchProductImages(brand, productName);

    return {
      productName: productData.product_name || productNameInput,
      seoTitle: productData.seo_title || "",
      description: productData.full_description || productData.marketing_description || "",
      sku: productData.sku || generateSKU(productData.barcode),
      barcode: productData.barcode || "",
      images: images.slice(0, 5), // أول 5 صور
      category: productData.category || "إلكترونيات",
      brand: brand,
    };
  } catch (error) {
    console.error("[Salla Publisher] Error generating content:", error);
    return null;
  }
}

/**
 * توليد SKU من الباركود
 */
function generateSKU(barcode?: string): string {
  if (barcode) {
    return `SKU-${barcode.slice(-8)}`;
  }
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PRD-${randomSuffix}`;
}

/**
 * نشر المنتج على سلة
 * @param productData بيانات المنتج
 * @param accessToken توكن الوصول الخاص بالمستخدم (إذا لم يتم تحديده يستخدم التوكن العام)
 */
export async function publishToSalla(
  productData: ProductGenerationResult,
  accessToken?: string | null
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    // الحصول على توكن صالح - إما التوكن المحدد أو التوكن العام
    let token = accessToken || undefined;
    if (!token) {
      token = await getValidAccessToken() || undefined;
    }
    
    if (!token) {
      return {
        success: false,
        error: "لا يوجد توكن صالح لسلة. يرجى تسجيل الدخول أولاً.",
      };
    }

    console.log(`[Salla Publisher] Publishing product: ${productData.productName}`);

    // تجهيز الصور
    const images = productData.images.map((url) => ({ original: url }));

    // تجهيز بيانات المنتج
    const payload: SallaProductPayload = {
      name: productData.productName,
      price: 1, // سعر افتراضي
      quantity: 0,
      description: productData.description,
      sku: productData.sku,
      barcode: productData.barcode,
      product_type: "product",
      status: "out_of_stock",
      images: images.length > 0 ? images : undefined,
      metadata: {
        title: productData.seoTitle,
        description: productData.description.substring(0, 160),
        keywords: [productData.brand, productData.category],
      },
    };

    // إرسال الطلب لسلة
    const response = await fetch("https://api.salla.dev/admin/v2/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Salla Publisher] API error:", response.status, errorText);
      let errorMessage = `فشل النشر على سلة: ${response.status}`;
      
      // تحليل رسالة الخطأ من سلة
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = `فشل النشر على سلة: ${errorJson.message}`;
        } else if (errorJson.error) {
          errorMessage = `فشل النشر على سلة: ${errorJson.error}`;
        }
      } catch {
        // تجاهل خطأ التحليل
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    const result = await response.json();
    const productId = result.data?.id?.toString();

    console.log(`[Salla Publisher] Product published successfully: ${productId}`);

    return {
      success: true,
      productId,
    };
  } catch (error: any) {
    console.error("[Salla Publisher] Error publishing:", error);
    return {
      success: false,
      error: error.message || "حدث خطأ أثناء النشر",
    };
  }
}

/**
 * العملية الكاملة: تحليل الصور + توليد المحتوى + النشر على سلة
 * @param userAccessToken توكن المستخدم المخصص للنشر (اختياري)
 */
export async function processAndPublish(
  productNameInput: string,
  frontImageBase64?: string,
  backImageBase64?: string,
  userAccessToken?: string
): Promise<{
  success: boolean;
  productData?: ProductGenerationResult;
  sallaProductId?: string;
  error?: string;
}> {
  try {
    // 1. استخراج النص من الصور (OCR)
    let ocrText = "";
    if (frontImageBase64 || backImageBase64) {
      console.log("[Salla Publisher] Performing OCR on images...");
      // يمكن استخدام Cloud Vision هنا إذا كان متاحاً
      // حالياً نعتمد على النص المقدم من المستخدم
    }

    // 2. توليد المحتوى
    const productData = await generateProductContent(productNameInput, ocrText);
    if (!productData) {
      return {
        success: false,
        error: "فشل في توليد محتوى المنتج",
      };
    }

    // 3. النشر على سلة مع توكن المستخدم إذا كان متاحاً
    const publishResult = await publishToSalla(productData, userAccessToken);
    if (!publishResult.success) {
      return {
        success: false,
        productData,
        error: publishResult.error,
      };
    }

    // 4. حفظ المنتج في قاعدة البيانات
    try {
      await db.insert(uploadedProducts).values({
        productName: productData.productName,
        sku: productData.sku,
        barcode: productData.barcode,
        isSynced: true,
        syncedAt: new Date(),
        sallaProductId: publishResult.productId,
        productData: productData as any,
      });
      console.log("[Salla Publisher] Product saved to database");
    } catch (dbError) {
      console.error("[Salla Publisher] Database error:", dbError);
      // لا نفشل العملية إذا فشل حفظ قاعدة البيانات
    }

    return {
      success: true,
      productData,
      sallaProductId: publishResult.productId,
    };
  } catch (error: any) {
    console.error("[Salla Publisher] Process error:", error);
    return {
      success: false,
      error: error.message || "حدث خطأ في العملية",
    };
  }
}
