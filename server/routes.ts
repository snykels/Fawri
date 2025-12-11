import type { Express } from "express";
import { createServer, type Server } from "http";
import { GoogleGenAI } from "@google/genai";
import ExcelJS from "exceljs";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { productDataSchema, type ProductData } from "@shared/schema";

const smartAnalysisPrompt = `**أنت وكيل استخبارات المنتجات (Product Intelligence Agent) ومتخصص في البحث العكسي (OSINT).**

مهمتك: تحليل صور المنتج واستخراج بياناته الكاملة باتباع منهجية البحث الاستخباراتي المتسلسل.

---

## 🔍 خطوات العمل (The Workflow):

### الخطوة 1: التحليل البصري واستخراج النص (Visual Analysis & OCR)
- حلل الصورة بدقة واستخرج:
  * أي نص مكتوب على العلبة أو الملصقات
  * الشعارات والعلامات التجارية
  * الأرقام التسلسلية ورموز المنتج
  * الباركود (UPC/EAN) إن وجد
- حدد نوع المنتج والمميزات الفريدة (شكل، لون، أزرار، حجم)
- أنشئ كلمات مفتاحية دقيقة للبحث

### الخطوة 2: محاكاة البحث الأولي (Initial Search Simulation)
- افترض أنك تبحث بالكلمات المفتاحية في Google Images وAmazon
- حدد "اسم المنتج التجاري" الأقرب وماركته
- تعرف على السلسلة والإصدار (Series/Generation)

### الخطوة 3: حلقة استخراج البيانات (Data Mining Loop) - الأهم!
1. **من الاسم إلى الموديل:** ابحث عن رقم الموديل (Model Number/MPN) الدقيق
2. **من الموديل إلى المعرفات:** استخدم رقم الموديل للعثور على:
   - رقم ASIN (أمازون)
   - أرقام القطع أو المعرفات الأخرى
3. **من المعرفات إلى الباركود:** حوّل المعرفات للعثور على GTIN/EAN/UPC

### الخطوة 4: التحقق العكسي (Reverse Verification)
- بعد العثور على البيانات، تحقق: هل البحث بالباركود يعيدنا لنفس المنتج؟
- إذا كانت النتيجة متطابقة، اعتمد المعلومات
- إذا لم تجد الباركود، اكتب رقم الموديل (MPN) بدلاً منه

---

## 📋 البيانات المطلوبة (JSON فقط):

\`\`\`json
{
  "product_name": "[الماركة] [السلسلة] [الموديل] [السعة/الذاكرة] [اللون]",
  "seo_title": "عنوان SEO جذاب ومختصر (50 حرف كحد أقصى)",
  "marketing_description": "وصف تسويقي احترافي 50-100 كلمة يبرز المميزات",
  "full_description": "وصف شامل يتضمن: المواصفات التقنية، محتويات العلبة، معلومات الضمان",
  "category": "التصنيف المناسب (مثال: هواتف ذكية، سماعات، أجهزة منزلية)",
  "brand": "اسم الماركة بالعربي",
  "sku_barcode": "الباركود (UPC/EAN 12-13 رقم) أو رقم الموديل (MPN)"
}
\`\`\`

---

## 🏷️ الماركات المعروفة:
سامسونج، آبل، شاومي، هواوي، أوبو، فيفو، ريلمي، ون بلس، هونر، نوكيا، موتورولا، سوني، جوجل، إنفينكس، تكنو، ريدمي، بوكو، أنكر، جي بي إل، بوز، سوني، إل جي، فيليبس

---

## ⚠️ قواعد صارمة:
1. **ممنوع "غير معروف" أو "Unknown" أو "N/A"** - يجب إيجاد كل البيانات
2. **لا تترك أي حقل فارغ** - استخدم معرفتك للاستنتاج
3. **الأولوية للباركود** - إذا لم تجده، استخدم رقم الموديل
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
          worksheet.spliceRows(1, 1);
          
          const newRowNumber = worksheet.rowCount + 1;
          const newRow = worksheet.getRow(newRowNumber);
          
          newRow.getCell(1).value = "منتج";
          newRow.getCell(2).value = validatedData.product_name;
          newRow.getCell(3).value = validatedData.category;
          newRow.getCell(4).value = "";
          newRow.getCell(5).value = "";
          newRow.getCell(6).value = "";
          newRow.getCell(7).value = 0;
          newRow.getCell(8).value = validatedData.full_description;
          newRow.getCell(9).value = "نعم";
          newRow.getCell(10).value = validatedData.sku_barcode;
          newRow.getCell(11).value = 0;
          newRow.getCell(12).value = "";
          newRow.getCell(13).value = "";
          newRow.getCell(14).value = "";
          newRow.getCell(15).value = "";
          newRow.getCell(16).value = "";
          newRow.getCell(17).value = "";
          newRow.getCell(18).value = 0.1;
          newRow.getCell(19).value = "كيلوغرام";
          newRow.getCell(20).value = validatedData.brand;
          newRow.getCell(21).value = validatedData.seo_title;
          newRow.getCell(22).value = "";
          newRow.getCell(23).value = validatedData.sku_barcode;
          newRow.getCell(24).value = "";
          newRow.getCell(25).value = "";
          newRow.getCell(26).value = "";
          newRow.getCell(27).value = "تفعيل";
          newRow.getCell(28).value = "";
          
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
