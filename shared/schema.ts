import { z } from "zod";

export const productDataSchema = z.object({
  product_name: z.string().min(1, "اسم المنتج مطلوب"),
  seo_title: z.string().min(1, "عنوان SEO مطلوب"),
  marketing_description: z.string().min(1, "الوصف التسويقي مطلوب"),
  full_description: z.string().min(1, "الوصف الكامل مطلوب"),
  category: z.string().min(1, "التصنيف مطلوب"),
  brand: z.string().min(1, "الماركة مطلوبة"),
  sku_barcode: z.string().min(1, "الباركود مطلوب"),
});

export type ProductData = z.infer<typeof productDataSchema>;

export const analysisResultSchema = z.object({
  barcode: z.string().nullable(),
  modelNumber: z.string().nullable(),
  brand: z.string().nullable(),
  ram: z.string().nullable(),
  storage: z.string().nullable(),
  color: z.string().nullable(),
  confidence: z.number(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export const generateListingRequestSchema = z.object({
  frontImage: z.string(),
  backImage: z.string(),
  apiKey: z.string().optional(),
  provider: z.enum(["openai", "gemini", "openrouter"]).optional(),
  useAI: z.boolean().optional(),
});

export type GenerateListingRequest = z.infer<typeof generateListingRequestSchema>;

export const generateListingResponseSchema = z.object({
  success: z.boolean(),
  data: productDataSchema.optional(),
  analysis: analysisResultSchema.optional(),
  stages: z.array(z.string()).optional(),
  method: z.enum(["ocr", "ai_enhanced"]).optional(),
  error: z.string().optional(),
});

export type GenerateListingResponse = z.infer<typeof generateListingResponseSchema>;

export const sallaExcelRowSchema = z.object({
  type: z.literal("منتج"),
  productName: z.string(),
  category: z.string(),
  brand: z.string(),
  description: z.string(),
  subtitle: z.string(),
  sku: z.string(),
  barcode: z.string(),
  pageTitle: z.string(),
  marketingDescription: z.string(),
  requiresShipping: z.literal("نعم"),
  price: z.number(),
  costPrice: z.number(),
  quantity: z.number(),
  weight: z.number(),
  taxable: z.literal("تفعيل"),
});

export type SallaExcelRow = z.infer<typeof sallaExcelRowSchema>;
