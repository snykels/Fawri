import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import ExcelJS from "exceljs";
import sharp from "sharp";
import { productDataSchema, type ProductData } from "@shared/schema";
import { analyzeProductImages, type ExtractedProductData } from "./image-analyzer";

const systemPrompt = `You are a Salla E-commerce Expert. Analyze the Back Image for barcode/specs and Front Image for appearance.
Output strictly valid JSON with keys: product_name, seo_title, marketing_description, full_description, category, brand, sku_barcode, subtitle.

Rules:
1. **Name:** [Brand] + [Model] + [Storage/RAM] + [Color].
2. **SEO Title:** Max 50 chars, catchy.
3. **Description:**
   - Short Section (50-100 words).
   - Long Section (Title, Short Desc, Detailed Features, Specs list, Box contents, Usage, Video URL).
   - No Emojis, No markdown symbols like ###.
4. **Data:**
   - Extract Barcode from image.
   - Verify specs (RAM/Storage) from text in the image.
   - If text is blurry, infer from visual model identity.

Respond with JSON only, no markdown formatting or code blocks.`;

const enhancementPrompt = `You are a Salla E-commerce Expert. Enhance the following product data extracted via OCR analysis.

Current extracted data:
{EXTRACTED_DATA}

Based on the product images provided, please:
1. Verify and correct any OCR errors in the extracted data
2. Enhance the marketing_description to be more compelling (50-100 words, Arabic)
3. Improve the full_description with better formatting and more details
4. Confirm or correct the brand, category, and specs

Output strictly valid JSON with these keys: product_name, seo_title, marketing_description, full_description, category, brand, sku_barcode, subtitle.
Keep Arabic text professional. No emojis.`;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/generate", async (req, res) => {
    try {
      const { frontImage, backImage, apiKey, provider = "gemini", useAI = true } = req.body;

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

      const { analysis, productData: extractedData, stages } = await analyzeProductImages(frontBuffer, backBuffer);

      let finalData: ProductData;

      if (!useAI) {
        finalData = {
          product_name: extractedData.product_name,
          seo_title: extractedData.seo_title,
          marketing_description: extractedData.marketing_description,
          full_description: extractedData.full_description,
          category: extractedData.category,
          brand: extractedData.brand,
          sku_barcode: extractedData.sku_barcode,
          subtitle: extractedData.subtitle,
        };

        return res.json({
          success: true,
          data: finalData,
          analysis: {
            barcode: analysis.barcode,
            modelNumber: analysis.modelNumber,
            brand: analysis.brand,
            ram: analysis.ram,
            storage: analysis.storage,
            color: analysis.color,
            confidence: analysis.confidence,
          },
          stages,
          method: "ocr",
        });
      }

      const processedFrontBase64 = frontBuffer.toString("base64");
      const processedBackBase64 = backBuffer.toString("base64");

      let content: string | null = null;
      const prompt = enhancementPrompt.replace("{EXTRACTED_DATA}", JSON.stringify(extractedData, null, 2));

      if (provider === "gemini") {
        let geminiApiKey = apiKey;
        let baseUrl = undefined;
        let apiVersion = "v1beta";

        if (!geminiApiKey && process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
          geminiApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
          baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
          apiVersion = "";
        }

        if (!geminiApiKey) {
          finalData = extractedData as ProductData;
          return res.json({
            success: true,
            data: finalData,
            analysis: {
              barcode: analysis.barcode,
              modelNumber: analysis.modelNumber,
              brand: analysis.brand,
              ram: analysis.ram,
              storage: analysis.storage,
              color: analysis.color,
              confidence: analysis.confidence,
            },
            stages: [...stages, "تحذير: لا يوجد مفتاح API للتحسين بالذكاء الاصطناعي"],
            method: "ocr",
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
                { text: prompt },
                { text: "Here are the product images for verification. First is front, second is back:" },
                { inlineData: { mimeType: "image/jpeg", data: processedFrontBase64 } },
                { inlineData: { mimeType: "image/jpeg", data: processedBackBase64 } },
              ],
            },
          ],
        });

        content = response.text || null;

      } else if (provider === "openrouter") {
        let openrouterApiKey = apiKey;
        let baseUrl = "https://openrouter.ai/api/v1";

        if (!openrouterApiKey && process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY) {
          openrouterApiKey = process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY;
          baseUrl = process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL || baseUrl;
        }

        if (!openrouterApiKey) {
          finalData = extractedData as ProductData;
          return res.json({
            success: true,
            data: finalData,
            analysis: {
              barcode: analysis.barcode,
              modelNumber: analysis.modelNumber,
              brand: analysis.brand,
              ram: analysis.ram,
              storage: analysis.storage,
              color: analysis.color,
              confidence: analysis.confidence,
            },
            stages: [...stages, "تحذير: لا يوجد مفتاح API للتحسين بالذكاء الاصطناعي"],
            method: "ocr",
          });
        }

        const openrouter = new OpenAI({
          baseURL: baseUrl,
          apiKey: openrouterApiKey,
        });

        const response = await openrouter.chat.completions.create({
          model: "google/gemini-2.5-flash-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "text", text: "Here are the product images for verification. First is front, second is back:" },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${processedFrontBase64}` } },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${processedBackBase64}` } },
              ],
            },
          ],
          max_tokens: 2048,
        });

        content = response.choices[0].message.content;

      } else {
        if (!apiKey) {
          finalData = extractedData as ProductData;
          return res.json({
            success: true,
            data: finalData,
            analysis: {
              barcode: analysis.barcode,
              modelNumber: analysis.modelNumber,
              brand: analysis.brand,
              ram: analysis.ram,
              storage: analysis.storage,
              color: analysis.color,
              confidence: analysis.confidence,
            },
            stages: [...stages, "تحذير: لا يوجد مفتاح API للتحسين بالذكاء الاصطناعي - مطلوب لـ OpenAI"],
            method: "ocr",
          });
        }

        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "text", text: "Here are the product images for verification. First is front, second is back:" },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${processedFrontBase64}` } },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${processedBackBase64}` } },
              ],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 2048,
        });

        content = response.choices[0].message.content;
      }

      if (!content) {
        finalData = extractedData as ProductData;
        return res.json({
          success: true,
          data: finalData,
          analysis: {
            barcode: analysis.barcode,
            modelNumber: analysis.modelNumber,
            brand: analysis.brand,
            ram: analysis.ram,
            storage: analysis.storage,
            color: analysis.color,
            confidence: analysis.confidence,
          },
          stages: [...stages, "لم يتم الحصول على رد من الذكاء الاصطناعي"],
          method: "ocr",
        });
      }

      try {
        const jsonContent = content.replace(/```json\n?|\n?```/g, "").trim();
        finalData = productDataSchema.parse(JSON.parse(jsonContent));
        stages.push("تم تحسين البيانات بالذكاء الاصطناعي بنجاح");
      } catch (parseError) {
        console.error("Parse error:", parseError, "Content:", content);
        finalData = extractedData as ProductData;
        stages.push("فشل تحليل رد الذكاء الاصطناعي، تم استخدام بيانات OCR");
      }

      return res.json({
        success: true,
        data: finalData,
        analysis: {
          barcode: analysis.barcode,
          modelNumber: analysis.modelNumber,
          brand: analysis.brand,
          ram: analysis.ram,
          storage: analysis.storage,
          color: analysis.color,
          confidence: analysis.confidence,
        },
        stages,
        method: "ai_enhanced",
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
      const { productData } = req.body;

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

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Products", {
        views: [{ rightToLeft: true }],
      });

      const headers = [
        "النوع",
        "أسم المنتج",
        "تصنيف المنتج",
        "الماركة",
        "الوصف",
        "العنوان الترويجي",
        "رمز المنتج sku",
        "الباركود",
        "عنوان صفحة المنتج (Page Title)",
        "وصف تسويقي مختصر",
        "هل يتطلب شحن؟",
        "السعر",
        "سعر التكلفة",
        "الكمية",
        "الوزن",
        "خاضع للضريبة ؟",
      ];

      worksheet.addRow(headers);

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { horizontal: "right" };

      const dataRow = [
        "منتج",
        validatedData.product_name || "",
        validatedData.category || "",
        validatedData.brand || "",
        validatedData.full_description || "",
        validatedData.subtitle || "",
        validatedData.sku_barcode || "",
        validatedData.sku_barcode || "",
        validatedData.seo_title || "",
        validatedData.marketing_description || "",
        "نعم",
        0,
        0,
        0,
        0.1,
        "تفعيل",
      ];

      worksheet.addRow(dataRow);

      worksheet.columns.forEach((column) => {
        column.width = 25;
      });

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
