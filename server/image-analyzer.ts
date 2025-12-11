import Tesseract from "tesseract.js";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import sharp from "sharp";

export interface AnalysisResult {
  barcode: string | null;
  modelNumber: string | null;
  brand: string | null;
  ram: string | null;
  storage: string | null;
  color: string | null;
  rawText: string;
  confidence: number;
}

export interface ExtractedProductData {
  product_name: string;
  seo_title: string;
  marketing_description: string;
  full_description: string;
  category: string;
  brand: string;
  sku_barcode: string;
  subtitle: string;
}

const KNOWN_BRANDS = [
  "Samsung", "سامسونج",
  "Apple", "ابل", "آبل",
  "Xiaomi", "شاومي",
  "Huawei", "هواوي",
  "OPPO", "اوبو",
  "Vivo", "فيفو",
  "Realme", "ريلمي",
  "OnePlus", "ون بلس",
  "Honor", "هونر",
  "Nokia", "نوكيا",
  "Motorola", "موتورولا",
  "LG", "ال جي",
  "Sony", "سوني",
  "Google", "جوجل",
  "Infinix", "انفينكس",
  "Tecno", "تكنو",
  "Itel", "ايتل",
  "ZTE", "زد تي اي",
  "Lenovo", "لينوفو",
  "Asus", "اسوس",
  "TCL", "تي سي ال",
  "Nothing", "ناثينج",
  "Redmi", "ريدمي",
  "POCO", "بوكو",
];

const PHONE_CATEGORIES = [
  "هواتف ذكية",
  "جوالات",
  "موبايلات",
  "Smartphones",
];

export async function extractBarcodeFromImage(imageBuffer: Buffer): Promise<string | null> {
  try {
    const pngBuffer = await sharp(imageBuffer)
      .resize(1000, 1000, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();

    const png = PNG.sync.read(pngBuffer);
    const { data, width, height } = png;

    const imageData = new Uint8ClampedArray(data);
    const code = jsQR(imageData, width, height);

    if (code) {
      return code.data;
    }

    return null;
  } catch (error) {
    console.error("Barcode extraction error:", error);
    return null;
  }
}

export async function extractTextFromImage(imageBuffer: Buffer, lang: string = "eng+ara"): Promise<{ text: string; confidence: number }> {
  try {
    const processedBuffer = await sharp(imageBuffer)
      .resize(2000, 2000, { fit: "inside" })
      .sharpen()
      .normalize()
      .grayscale()
      .png()
      .toBuffer();

    const result = await Tesseract.recognize(processedBuffer, lang, {
      logger: () => {},
    });

    return {
      text: result.data.text,
      confidence: result.data.confidence,
    };
  } catch (error) {
    console.error("OCR error:", error);
    return { text: "", confidence: 0 };
  }
}

export function parseSpecsFromText(text: string): Partial<AnalysisResult> {
  const result: Partial<AnalysisResult> = {};

  const barcodeMatch = text.match(/\b(\d{12,14})\b/);
  if (barcodeMatch) {
    result.barcode = barcodeMatch[1];
  }

  const modelPatterns = [
    /Model[:\s]*([A-Z0-9\-]+)/i,
    /Model Number[:\s]*([A-Z0-9\-]+)/i,
    /型号[:\s]*([A-Z0-9\-]+)/i,
    /V\d{4}[A-Z]?/i,
    /SM-[A-Z]\d{3}[A-Z]?/i,
    /[A-Z]{2,3}\d{3,4}[A-Z]?/i,
  ];
  
  for (const pattern of modelPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.modelNumber = match[1] || match[0];
      break;
    }
  }

  for (const brand of KNOWN_BRANDS) {
    if (text.toLowerCase().includes(brand.toLowerCase())) {
      result.brand = brand;
      break;
    }
  }

  const ramPatterns = [
    /(\d+)\s*GB\s*RAM/i,
    /RAM[:\s]*(\d+)\s*GB/i,
    /(\d+)\s*جيجا\s*رام/i,
    /(\d+)\+\d+\s*GB/i,
  ];
  
  for (const pattern of ramPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.ram = match[1] + " GB";
      break;
    }
  }

  const storagePatterns = [
    /(\d+)\s*GB(?!\s*RAM)/i,
    /Storage[:\s]*(\d+)\s*GB/i,
    /ROM[:\s]*(\d+)\s*GB/i,
    /(\d+)\s*جيجا(?!\s*رام)/i,
    /(\d{2,3})GB/i,
  ];
  
  for (const pattern of storagePatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      if (value >= 32 && value <= 1024) {
        result.storage = value + " GB";
        break;
      }
    }
  }

  const colorPatterns = [
    /Color[:\s]*([A-Za-z\s]+)/i,
    /اللون[:\s]*([أ-ي\s]+)/,
    /(Black|White|Blue|Green|Gold|Silver|Red|Purple|Gray|Grey|Pink|Orange|Yellow|Teal|Mint)/i,
    /(أسود|أبيض|أزرق|أخضر|ذهبي|فضي|أحمر|بنفسجي|رمادي|وردي|برتقالي|أصفر)/,
  ];
  
  for (const pattern of colorPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.color = match[1].trim();
      break;
    }
  }

  return result;
}

export function generateProductContent(analysis: AnalysisResult): ExtractedProductData {
  const brand = analysis.brand || "Unknown";
  const model = analysis.modelNumber || "Product";
  const storage = analysis.storage || "";
  const ram = analysis.ram || "";
  const color = analysis.color || "";

  let productName = brand;
  if (model && model !== brand) {
    productName += ` ${model}`;
  }
  if (storage) {
    productName += `، ${storage}`;
  }
  if (ram) {
    productName += ` ${ram}`;
  }
  if (color) {
    productName += ` - ${color}`;
  }

  const seoTitle = `${brand} ${model} - ${storage || "جودة عالية"}`.substring(0, 50);

  const marketingDescription = `اكتشف ${brand} ${model}، الجهاز المثالي الذي يجمع بين الأداء القوي والتصميم الأنيق. ${storage ? `يأتي بسعة تخزين ${storage}` : ""} ${ram ? `وذاكرة ${ram}` : ""} لتجربة استخدام سلسة ومتميزة. تصميم عصري يناسب احتياجاتك اليومية.`;

  const fullDescription = `${brand} ${model} - جودة وأداء استثنائي

وصف مختصر:
اكتشف ${brand} ${model}، الحل المثالي للمستخدمين الباحثين عن الجودة والأداء العالي.

المواصفات:
${storage ? `- سعة التخزين: ${storage}` : ""}
${ram ? `- الذاكرة: ${ram}` : ""}
${color ? `- اللون: ${color}` : ""}
${analysis.modelNumber ? `- رقم الموديل: ${analysis.modelNumber}` : ""}
${analysis.barcode ? `- الباركود: ${analysis.barcode}` : ""}

محتويات العلبة:
- الجهاز
- كابل الشحن
- الشاحن
- دليل المستخدم
- كرت الضمان
- نسخة الشرق الأوسط

الضمان:
ضمان الوكيل الرسمي

لماذا تختار ${brand} ${model}؟
جودة موثوقة، أداء قوي، وتصميم عصري يلبي جميع احتياجاتك.`;

  return {
    product_name: productName,
    seo_title: seoTitle,
    marketing_description: marketingDescription,
    full_description: fullDescription,
    category: "هواتف ذكية",
    brand: analysis.brand || "",
    sku_barcode: analysis.barcode || "",
    subtitle: "خصم 7% (ابل باي - مدى)",
  };
}

export async function analyzeProductImages(
  frontImageBuffer: Buffer,
  backImageBuffer: Buffer
): Promise<{ analysis: AnalysisResult; productData: ExtractedProductData; stages: string[] }> {
  const stages: string[] = [];

  stages.push("جاري استخراج الباركود من الصورة الخلفية...");
  const barcode = await extractBarcodeFromImage(backImageBuffer);
  if (barcode) {
    stages.push(`تم العثور على الباركود: ${barcode}`);
  } else {
    stages.push("لم يتم العثور على باركود QR، جاري البحث في النص...");
  }

  stages.push("جاري قراءة النص من الصورة الخلفية (OCR)...");
  const backTextResult = await extractTextFromImage(backImageBuffer);
  stages.push(`تم استخراج النص بدقة ${Math.round(backTextResult.confidence)}%`);

  stages.push("جاري تحليل النص واستخراج المواصفات...");
  const backSpecs = parseSpecsFromText(backTextResult.text);

  stages.push("جاري قراءة النص من الصورة الأمامية...");
  const frontTextResult = await extractTextFromImage(frontImageBuffer);
  const frontSpecs = parseSpecsFromText(frontTextResult.text);

  const analysis: AnalysisResult = {
    barcode: barcode || backSpecs.barcode || frontSpecs.barcode || null,
    modelNumber: backSpecs.modelNumber || frontSpecs.modelNumber || null,
    brand: backSpecs.brand || frontSpecs.brand || null,
    ram: backSpecs.ram || frontSpecs.ram || null,
    storage: backSpecs.storage || frontSpecs.storage || null,
    color: backSpecs.color || frontSpecs.color || null,
    rawText: backTextResult.text + "\n---\n" + frontTextResult.text,
    confidence: (backTextResult.confidence + frontTextResult.confidence) / 2,
  };

  stages.push("جاري إنشاء محتوى المنتج...");
  const productData = generateProductContent(analysis);

  stages.push("اكتمل التحليل!");

  return { analysis, productData, stages };
}
