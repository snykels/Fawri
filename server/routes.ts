import type { Express } from "express";
import { createServer, type Server } from "http";
import { GoogleGenAI } from "@google/genai";
import ExcelJS from "exceljs";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { productDataSchema, type ProductData } from "@shared/schema";

const smartAnalysisPrompt = `**أنت خبير مزدوج:**
1. **وكيل استخبارات المنتجات (Product Intelligence Agent)** - متخصص في البحث العكسي (OSINT)
2. **خبير SEO للتجارة الإلكترونية (Technical eCommerce SEO Specialist)** - محلل بيانات منتجات

مهمتك: تحليل صور المنتج واستخراج "البصمة الرقمية الكاملة" باتباع منهجية البحث الاستخباراتي المتسلسل.

---

## 🔍 المرحلة الأولى: التدقيق البصري واستخراج الكلمات المفتاحية

### Visual Audit & OCR:
- قم بإجراء OCR لأي كود أو نص على العبوة
- حلل "النية البحثية" (Search Intent): ما الكلمات المفتاحية التي سيستخدمها العميل؟
- حدد البراند (Brand) والسلسلة (Series)
- استخرج المميزات الفريدة: شكل، لون، أزرار، حجم

---

## 🎯 المرحلة الثانية: صيد المعرفات التقنية (The Identifier Hunt)

### البحث المتسلسل:
1. **البحث عن MPN:** استخدم الكلمات المفتاحية للعثور على رقم تصنيع القطعة (Manufacturer Part Number)
2. **البحث عن SKU/ASIN:** ابحث في Amazon/eBay لاستخراج الـ ASIN أو SKU
3. **استخراج GTIN/EAN:** بناءً على MPN و ASIN، قم بالبحث المتقاطع (Cross-Reference) للعثور على الباركود العالمي

---

## ✅ المرحلة الثالثة: حلقة التحقق العكسي (Validation Loop)

- قم بـ "بحث عكسي" بالباركود للتأكد أنه يظهر نفس المنتج
- تأكد أن المواصفات تتطابق مع الصورة (اللون، الإصدار، الحجم)
- إذا لم تجد الباركود، قدم رقم الموديل (MPN) بدقة عالية

---

## 📋 البيانات المطلوبة (JSON فقط):

{
  "product_name": "[الماركة] [السلسلة] [الموديل] [السعة/الذاكرة] [اللون] - اسم محسن للمتجر",
  "seo_title": "عنوان SEO محسن لـ Google Shopping (50 حرف كحد أقصى)",
  "marketing_description": "وصف تسويقي احترافي 50-100 كلمة مع كلمات مفتاحية رئيسية",
  "full_description": "وصف شامل: المواصفات التقنية، محتويات العلبة، الضمان، مع Long-tail Keywords",
  "category": "التصنيف المناسب (مثال: هواتف ذكية، سماعات، أجهزة منزلية)",
  "brand": "اسم الماركة بالعربي",
  "sku_barcode": "الباركود الدولي (GTIN/EAN/UPC 12-13 رقم) أو رقم الموديل (MPN)"
}

---

## 🏷️ الماركات المعروفة:
سامسونج، آبل، شاومي، هواوي، أوبو، فيفو، ريلمي، ون بلس، هونر، نوكيا، موتورولا، سوني، جوجل، إنفينكس، تكنو، ريدمي، بوكو، أنكر، جي بي إل، بوز، إل جي، فيليبس، لينوفو، أسوس، إتش بي، ديل

---

## ⚠️ قواعد صارمة للـ SEO:
1. **ممنوع "غير معروف" أو "Unknown" أو "N/A"** - ضروري لـ Google Merchant
2. **لا تترك أي حقل فارغ** - استخدم معرفتك للاستنتاج
3. **الأولوية للباركود (GTIN)** - ضروري لفهرسة المنتج
4. **أجب بـ JSON فقط** - بدون markdown أو نص إضافي

---

ابدأ التحليل الآن...`;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/generate", async (req, res) => {
    try {
      const { frontImage, backImage } = req.body;

      if (!frontImage || !backImage) {
        return res.status(400).json({
          success: false,
          error: "Both front and back images are required",
        });
      }

      const processImage = async (base64Image: string): Promise<Buffer> => {
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(cleanBase64, "base64");

        const processed = await sharp(imageBuffer)
          .resize(1000, 1000, {
            fit: "contain",
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality: 85 })
          .toBuffer();

        return processed;
      };

      const [frontBuffer, backBuffer] = await Promise.all([
        processImage(frontImage),
        processImage(backImage),
      ]);

      const processedFrontBase64 = frontBuffer.toString("base64");
      const processedBackBase64 = backBuffer.toString("base64");

      let geminiApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
      let baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
      let apiVersion = "";

      if (!geminiApiKey) {
        return res.status(400).json({
          success: false,
          error: "Gemini API key not configured",
        });
      }

      const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: baseUrl ? {
          apiVersion,
          baseUrl,
        } : undefined,
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: smartAnalysisPrompt },
              { text: "الصورة الأمامية للمنتج:" },
              { inlineData: { mimeType: "image/jpeg", data: processedFrontBase64 } },
              { text: "الصورة الخلفية للمنتج (الباركود والمواصفات):" },
              { inlineData: { mimeType: "image/jpeg", data: processedBackBase64 } },
            ],
          },
        ],
      });

      const content = response.text;

      if (!content) {
        return res.status(500).json({
          success: false,
          error: "No response from AI",
        });
      }

      let productData: ProductData;
      try {
        const jsonContent = content.replace(/```json\n?|\n?```/g, "").trim();
        productData = productDataSchema.parse(JSON.parse(jsonContent));
      } catch (parseError) {
        console.error("Parse error:", parseError, "Content:", content);
        return res.status(500).json({
          success: false,
          error: "Failed to parse AI response",
        });
      }

      return res.json({
        success: true,
        data: productData,
        frontImageBase64: processedFrontBase64,
        backImageBase64: processedBackBase64,
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to generate listing",
      });
    }
  });

  app.post("/api/download-excel", async (req, res) => {
    try {
      const { productData, frontImageBase64 } = req.body;

      if (!productData) {
        return res.status(400).json({ error: "Product data is required" });
      }

      const validationResult = productDataSchema.safeParse(productData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid product data format",
          details: validationResult.error.errors 
        });
      }

      const validatedData = validationResult.data;

      const templatePath = path.join(process.cwd(), "attached_assets", "Salla_Products_Template_1765491101794.xlsx");
      
      const workbook = new ExcelJS.Workbook();
      
      if (fs.existsSync(templatePath)) {
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.worksheets[0];
        
        if (worksheet) {
          const newRowNumber = worksheet.rowCount + 1;
          const newRow = worksheet.getRow(newRowNumber);
          
          const normalFont = { strike: false, bold: false };
          
          const setCellValue = (cellNum: number, value: string | number) => {
            const cell = newRow.getCell(cellNum);
            cell.value = value;
            cell.font = normalFont;
          };
          
          setCellValue(1, "منتج");
          setCellValue(2, validatedData.product_name);
          setCellValue(3, validatedData.category);
          setCellValue(4, "");
          setCellValue(5, "");
          setCellValue(6, "");
          setCellValue(7, 0);
          setCellValue(8, validatedData.full_description);
          setCellValue(9, "نعم");
          setCellValue(10, validatedData.sku_barcode);
          setCellValue(11, 0);
          setCellValue(12, "");
          setCellValue(13, "");
          setCellValue(14, "");
          setCellValue(15, "");
          setCellValue(16, "");
          setCellValue(17, "");
          setCellValue(18, 0.1);
          setCellValue(19, "كيلوغرام");
          setCellValue(20, validatedData.brand);
          setCellValue(21, validatedData.seo_title);
          setCellValue(22, "");
          setCellValue(23, validatedData.sku_barcode);
          setCellValue(24, "");
          setCellValue(25, "");
          setCellValue(26, "");
          setCellValue(27, "تفعيل");
          setCellValue(28, "");
          
          newRow.commit();
        }
      } else {
        const worksheet = workbook.addWorksheet("Salla Products Template Sheet", {
          views: [{ rightToLeft: true }],
        });

        const headers = [
          "النوع",
          "أسم المنتج",
          "تصنيف المنتج",
          "صورة المنتج",
          "وصف صورة المنتج",
          "نوع المنتج",
          "سعر المنتج",
          "الوصف",
          "هل يتطلب شحن؟",
          "رمز المنتج sku",
          "سعر التكلفة",
          "السعر المخفض",
          "تاريخ بداية التخفيض",
          "تاريخ نهاية التخفيض",
          "اقصي كمية لكل عميل",
          "إخفاء خيار تحديد الكمية",
          "اضافة صورة عند الطلب",
          "الوزن",
          "وحدة الوزن",
          "الماركة",
          "العنوان الترويجي",
          "تثبيت المنتج",
          "الباركود",
          "السعرات الحرارية",
          "MPN",
          "GTIN",
          "خاضع للضريبة ؟",
          "سبب عدم الخضوع للضريبة",
        ];

        worksheet.addRow(headers);
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { horizontal: "right" };

        const dataRow = [
          "منتج",
          validatedData.product_name || "",
          validatedData.category || "",
          "",
          "",
          "",
          0,
          validatedData.full_description || "",
          "نعم",
          validatedData.sku_barcode || "",
          0,
          "",
          "",
          "",
          "",
          "",
          "",
          0.1,
          "كيلوغرام",
          validatedData.brand || "",
          validatedData.seo_title || "",
          "",
          validatedData.sku_barcode || "",
          "",
          "",
          "",
          "تفعيل",
          "",
        ];

        worksheet.addRow(dataRow);

        worksheet.columns.forEach((column) => {
          column.width = 20;
        });
      }

      const filename = validatedData.sku_barcode 
        ? `salla-product-${validatedData.sku_barcode}.xlsx`
        : "salla-product-listing.xlsx";

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${filename}`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      console.error("Excel generation error:", error);
      return res.status(500).json({ error: "Failed to generate Excel file" });
    }
  });

  return httpServer;
}
