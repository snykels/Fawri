import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import ExcelJS from "exceljs";
import sharp from "sharp";
import { productDataSchema, type ProductData } from "@shared/schema";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/generate", async (req, res) => {
    try {
      const { frontImage, backImage, apiKey, provider = "gemini" } = req.body;

      if (!frontImage || !backImage) {
        return res.status(400).json({
          success: false,
          error: "Both front and back images are required",
        });
      }

      const processImage = async (base64Image: string): Promise<string> => {
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

        return processed.toString("base64");
      };

      const [processedFront, processedBack] = await Promise.all([
        processImage(frontImage),
        processImage(backImage),
      ]);

      let content: string | null = null;

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
          return res.status(400).json({
            success: false,
            error: "Gemini API key is required. Please add your key in Settings or use built-in credits.",
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
                { text: systemPrompt },
                { text: "Analyze these product images and generate a complete Salla e-commerce listing. The first image is the front product shot, and the second is the back with specs and barcode." },
                { inlineData: { mimeType: "image/jpeg", data: processedFront } },
                { inlineData: { mimeType: "image/jpeg", data: processedBack } },
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
          return res.status(400).json({
            success: false,
            error: "OpenRouter API key is required. Please add your key in Settings or use built-in credits.",
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
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze these product images and generate a complete Salla e-commerce listing. The first image is the front product shot, and the second is the back with specs and barcode.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${processedFront}`,
                  },
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${processedBack}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 2048,
        });

        content = response.choices[0].message.content;

      } else {
        if (!apiKey) {
          return res.status(400).json({
            success: false,
            error: "OpenAI API key is required. Please add your key in Settings.",
          });
        }

        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze these product images and generate a complete Salla e-commerce listing. The first image is the front product shot, and the second is the back with specs and barcode.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${processedFront}`,
                  },
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${processedBack}`,
                  },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 2048,
        });

        content = response.choices[0].message.content;
      }

      if (!content) {
        return res.status(500).json({
          success: false,
          error: "No response from AI",
        });
      }

      let parsedData: ProductData;
      try {
        const jsonContent = content.replace(/```json\n?|\n?```/g, "").trim();
        parsedData = productDataSchema.parse(JSON.parse(jsonContent));
      } catch (parseError) {
        console.error("Parse error:", parseError, "Content:", content);
        return res.status(500).json({
          success: false,
          error: "Failed to parse AI response. Please try again.",
        });
      }

      return res.json({
        success: true,
        data: parsedData,
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
