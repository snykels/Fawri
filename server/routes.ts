import type { Express } from "express";
import { createServer, type Server } from "http";
import { GoogleGenAI } from "@google/genai";
import ExcelJS from "exceljs";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { productDataSchema, type ProductData } from "@shared/schema";

const smartAnalysisPrompt = `**أنت ثلاثة خبراء في شخص واحد:**
1. **وكيل استخبارات المنتجات (Product Intelligence Agent)** - متخصص في البحث العكسي (OSINT)
2. **خبير SEO للتجارة الإلكترونية (Technical eCommerce SEO Specialist)** - محلل بيانات منتجات
3. **باحث صور المنتجات (Product Image Researcher)** - يبحث عن أفضل صور احترافية من المصادر الرسمية

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

## 🖼️ المرحلة الرابعة: البحث عن صورة احترافية (Google Lens Style)

### مهم جداً - ابحث عن صورة المنتج مثل Google Lens:
بعد تحديد المنتج، تخيل أنك تستخدم Google Lens للبحث عن صور المنتج:

#### خطوات البحث (مثل Google Lens → Google Shopping):
1. استخدم اسم المنتج الكامل (Brand + Model + Variant) للبحث
2. ابحث في "Google Shopping" عن المنتج - ستجد صور احترافية من المتاجر
3. اختر أفضل صورة من المنتجات المطابقة

#### المصادر بالترتيب (حسب الأولوية):
1. **Google Shopping / المتاجر الإلكترونية** - تظهر صور احترافية للمنتجات
2. **الموقع الرسمي للشركة المصنعة** (samsung.com, apple.com, xiaomi.com, huawei.com, oppo.com, brave.com.sa, etc.)
3. **GSMArena** للهواتف والتابلت (fdn.gsmarena.com, cdn.gsmarena.com)
4. **Amazon** (m.media-amazon.com, images-na.ssl-images-amazon.com)
5. **Noon** (f.nooncdn.com)
6. **AliExpress** (ae01.alicdn.com)
7. **المتاجر السعودية** (jarir.com, extra.com, sharafdg.com)

### متطلبات الصورة:
- يجب أن تكون HTTPS
- يجب أن تكون صورة واضحة للمنتج على خلفية بيضاء أو شفافة
- يجب أن تطابق اللون والموديل المحدد
- يفضل الصور عالية الجودة (PNG أو JPG)
- **الأفضل: صورة المنتج فقط بدون العلبة أو الإكسسوارات**

---

## 📱 للهواتف والتابلت - وصف مفصل:

### وصف SEO (سطر ونصف - 20-40 كلمة):
وصف قصير للظهور في نتائج البحث، يحتوي على الكلمات المفتاحية الأساسية

### الوصف التسويقي (50-100 كلمة):
اذكر: المعالج، الكاميرا، الشاشة، نظام التشغيل، التخزين، البطارية
استخدم كلمات مفتاحية جذابة ولغة تحفيزية

### الوصف الكامل المفصل (300-600 كلمة):
- المواصفات التفصيلية الكاملة: الأبعاد، الوزن، المعالج، معالج الرسومات، منفذ الشحن، السرعة، الشاشة، الكاميرات، البطارية، الشحن السريع
- محتويات العلبة: الجهاز، الشاحن، الكابل، دليل المستخدم، الضمان
- نسخة الشرق الأوسط والضمان
- جميع المميزات والتقنيات المدعومة
- استخدم gsmarena.com أو devicespecifications.com للتأكد من المعلومات
- ممنوع الفيسات التعبيرية
- ممنوع رموز التحرير (### أو ****)
- اكتب اسم الماركة بالعربي والإنجليزي

---

## 📋 البيانات المطلوبة (JSON فقط):

{
  "product_name": "[الماركة] [السلسلة] [الموديل]، [السعة] جيجا، [الرام] جيجا - [اللون]",
  "seo_title": "",
  "seo_description": "وصف SEO قصير 20-40 كلمة للظهور في نتائج البحث",
  "marketing_description": "وصف تسويقي 50-100 كلمة يشمل المعالج والكاميرا والشاشة والبطارية",
  "full_description": "وصف كامل ومفصل 300-600 كلمة: جميع المواصفات التفصيلية، محتويات العلبة، نسخة الشرق الأوسط، جميع المميزات",
  "category": "التصنيف (هواتف ذكية / تابلت / سماعات / أجهزة منزلية)",
  "brand": "اسم الماركة بالعربي",
  "sku_barcode": "الباركود (GTIN/EAN/UPC 12-13 رقم) أو رقم الموديل (MPN)",
  "product_image_url": "رابط HTTPS لصورة احترافية من المصدر الرسمي أو GSMArena أو Amazon",
  "product_name_en": "English product name: [Brand] [Series] [Model], [Storage]GB, [RAM]GB - [Color]",
  "seo_description_en": "Short English SEO description 20-40 words",
  "marketing_description_en": "English marketing description 50-100 words",
  "full_description_en": "Full English description 300-600 words with all specifications",
  "category_en": "Category in English (Smartphones / Tablets / Headphones / Home Appliances)",
  "brand_en": "Brand name in English"
}

---

## 🏷️ الماركات المعروفة:
سامسونج Samsung، آبل Apple، شاومي Xiaomi، هواوي Huawei، أوبو OPPO، فيفو Vivo، ريلمي Realme، ون بلس OnePlus، هونر Honor، نوكيا Nokia، موتورولا Motorola، سوني Sony، جوجل Google، إنفينكس Infinix، تكنو Tecno، ريدمي Redmi، بوكو POCO، أنكر Anker، جي بي إل JBL

---

## ⚠️ قواعد صارمة:
1. **ممنوع "غير معروف" أو "Unknown" أو "N/A"**
2. **لا تترك أي حقل فارغ**
3. **الأولوية للباركود (GTIN)**
4. **أجب بـ JSON فقط** - بدون markdown
5. **ممنوع الفيسات التعبيرية**
6. **product_image_url يجب أن يكون رابط HTTPS حقيقي من مصدر موثوق**

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

      // Validate product_image_url is from trusted sources
      if (productData.product_image_url) {
        const trustedImageDomains = [
          "gsmarena.com",
          "fdn.gsmarena.com",
          "fdn2.gsmarena.com",
          "cdn.gsmarena.com",
          "amazon.com",
          "m.media-amazon.com",
          "images-na.ssl-images-amazon.com",
          "images-eu.ssl-images-amazon.com",
          "noon.com",
          "f.nooncdn.com",
          "samsung.com",
          "images.samsung.com",
          "image-us.samsung.com",
          "apple.com",
          "store.storeimages.cdn-apple.com",
          "xiaomi.com",
          "i01.appmifile.com",
          "i02.appmifile.com",
          "oppo.com",
          "image.oppo.com",
          "vivo.com",
          "realme.com",
          "infinixmobility.com",
          "tecno-mobile.com",
          "oneplus.com",
          "opc.img.shopping.com",
          "cdn.shopify.com",
          "static.wixstatic.com",
          "aliexpress.com",
          "ae01.alicdn.com",
          "ae02.alicdn.com",
          "ae03.alicdn.com",
          "alicdn.com",
          "jarir.com",
          "extra.com",
          "sharafdg.com",
          "brave.com.sa",
          "huawei.com",
          "consumer.huawei.com",
          "img.huaweicloud.com",
          "honor.com",
          "hihonor.com",
          "motorola.com",
          "nokia.com",
          "sony.com",
          "lg.com",
          "lenovo.com",
          "asus.com",
          "anker.com",
          "jbl.com",
          "harmankardon.com",
          "bose.com",
        ];

        try {
          const imageUrl = new URL(productData.product_image_url);
          const hostname = imageUrl.hostname.toLowerCase();
          const isTrusted = imageUrl.protocol === "https:" && 
            trustedImageDomains.some(domain => hostname === domain || hostname.endsWith("." + domain));
          
          if (!isTrusted) {
            console.log("Rejected untrusted image URL:", productData.product_image_url);
            productData.product_image_url = "";
          }
        } catch {
          // Invalid URL format
          productData.product_image_url = "";
        }
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
          setCellValue(4, validatedData.product_image_url || "");
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
          setCellValue(21, "");
          setCellValue(22, "");
          setCellValue(23, validatedData.sku_barcode);
          setCellValue(24, "");
          setCellValue(25, "");
          setCellValue(26, "");
          setCellValue(27, "نعم");
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
          validatedData.product_image_url || "",
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
          "",
          "",
          validatedData.sku_barcode || "",
          "",
          "",
          "",
          "نعم",
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

  // Upload image to imgbb and return permanent URL
  app.post("/api/upload-image", async (req, res) => {
    try {
      const { imageBase64 } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          error: "Image is required",
        });
      }

      // Remove base64 prefix first for accurate size calculation
      const cleanBase64ForSize = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      
      // Decode base64 and check actual binary size
      let decodedBuffer: Buffer;
      try {
        decodedBuffer = Buffer.from(cleanBase64ForSize, "base64");
      } catch {
        return res.status(400).json({
          success: false,
          error: "Invalid image data",
        });
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (decodedBuffer.length > maxSize) {
        return res.status(400).json({
          success: false,
          error: "Image too large (max 10MB)",
        });
      }

      const imgbbApiKey = process.env.IMGBB_API_KEY;
      if (!imgbbApiKey) {
        return res.status(500).json({
          success: false,
          error: "Image upload service not configured",
        });
      }

      // Remove base64 prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      // Prepare form data for imgbb API
      const formData = new URLSearchParams();
      formData.append("key", imgbbApiKey);
      formData.append("image", cleanBase64);

      const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        console.error("imgbb HTTP error:", response.status);
        return res.status(500).json({
          success: false,
          error: "Image upload service temporarily unavailable",
        });
      }

      const result = await response.json();

      if (!result.success) {
        console.error("imgbb upload error:", result);
        return res.status(500).json({
          success: false,
          error: "Failed to upload image",
        });
      }

      return res.json({
        success: true,
        url: result.data.url,
        display_url: result.data.display_url,
      });
    } catch (error: any) {
      console.error("Image upload error:", error);
      return res.status(500).json({
        success: false,
        error: "Image upload failed",
      });
    }
  });

  // Verify if an image URL is accessible (restricted to trusted domains)
  app.post("/api/verify-image-url", async (req, res) => {
    try {
      const { url } = req.body;

      if (!url || typeof url !== "string") {
        return res.status(400).json({
          success: false,
          valid: false,
          error: "URL is required",
        });
      }

      // Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.json({
          success: false,
          valid: false,
          reason: "Invalid URL format",
        });
      }

      // Only allow HTTPS and trusted domains to prevent SSRF
      const trustedDomains = [
        "gsmarena.com",
        "fdn.gsmarena.com",
        "fdn2.gsmarena.com",
        "cdn.gsmarena.com",
        "amazon.com",
        "m.media-amazon.com",
        "images-na.ssl-images-amazon.com",
        "images-eu.ssl-images-amazon.com",
        "noon.com",
        "f.nooncdn.com",
        "samsung.com",
        "images.samsung.com",
        "image-us.samsung.com",
        "apple.com",
        "store.storeimages.cdn-apple.com",
        "xiaomi.com",
        "i01.appmifile.com",
        "i02.appmifile.com",
        "oppo.com",
        "image.oppo.com",
        "vivo.com",
        "realme.com",
        "infinixmobility.com",
        "tecno-mobile.com",
        "oneplus.com",
        "opc.img.shopping.com",
        "cdn.shopify.com",
        "static.wixstatic.com",
        "aliexpress.com",
        "ae01.alicdn.com",
        "ae02.alicdn.com",
        "ae03.alicdn.com",
        "alicdn.com",
        "jarir.com",
        "extra.com",
        "sharafdg.com",
        "huawei.com",
        "consumer.huawei.com",
        "img.huaweicloud.com",
        "honor.com",
        "hihonor.com",
        "motorola.com",
        "nokia.com",
        "sony.com",
        "lg.com",
        "lenovo.com",
        "asus.com",
        "anker.com",
        "jbl.com",
        "harmankardon.com",
        "bose.com",
        "imgbb.com",
        "i.ibb.co",
      ];

      const hostname = parsedUrl.hostname.toLowerCase();
      const isTrusted = trustedDomains.some(
        (domain) => hostname === domain || hostname.endsWith("." + domain)
      );

      if (parsedUrl.protocol !== "https:" || !isTrusted) {
        return res.json({
          success: false,
          valid: false,
          reason: "URL not from trusted source",
        });
      }

      // DNS lookup to prevent SSRF via DNS rebinding to private IPs
      const dns = await import("dns").then(m => m.promises);
      try {
        const addresses = await dns.lookup(hostname, { all: true });
        const privateIPRanges = [
          /^127\./,                    // Loopback
          /^10\./,                     // Private Class A
          /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private Class B
          /^192\.168\./,               // Private Class C
          /^169\.254\./,               // Link-local
          /^0\./,                      // Current network
          /^::1$/,                     // IPv6 loopback
          /^fe80:/i,                   // IPv6 link-local
          /^fc00:/i,                   // IPv6 unique local
          /^fd/i,                      // IPv6 unique local
        ];
        
        const hasPrivateIP = addresses.some((addr: { address: string }) => 
          privateIPRanges.some(range => range.test(addr.address))
        );
        
        if (hasPrivateIP) {
          return res.json({
            success: false,
            valid: false,
            reason: "URL resolves to private network",
          });
        }
      } catch (dnsError) {
        return res.json({
          success: false,
          valid: false,
          reason: "DNS lookup failed",
        });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(url, { 
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const contentType = response.headers.get("content-type") || "";

        if (response.ok && contentType.startsWith("image/")) {
          return res.json({
            success: true,
            valid: true,
            contentType,
          });
        }

        return res.json({
          success: false,
          valid: false,
          reason: response.ok ? "Not an image" : `HTTP ${response.status}`,
        });
      } catch (fetchError: any) {
        clearTimeout(timeout);
        return res.json({
          success: false,
          valid: false,
          reason: fetchError.name === "AbortError" ? "Request timeout" : "URL not accessible",
        });
      }
    } catch (error: any) {
      return res.json({
        success: false,
        valid: false,
        reason: "Verification failed",
      });
    }
  });

  return httpServer;
}
