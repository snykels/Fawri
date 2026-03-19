import { z } from "zod";
import { pgTable, text, serial, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const productDataSchema = z.object({
  product_name: z.string().min(1, "اسم المنتج مطلوب"),
  seo_title: z.string().optional().default(""),
  seo_description: z.string().optional().default(""),
  marketing_description: z.string().min(1, "الوصف التسويقي مطلوب"),
  full_description: z.string().min(1, "الوصف الكامل مطلوب"),
  category: z.string().min(1, "التصنيف مطلوب"),
  brand: z.string().min(1, "الماركة مطلوبة"),
  sku: z.string().optional().default(""),
  barcode: z.string().min(1, "الباركود مطلوب"),
  product_image_url: z.string().optional().default(""),
  // English translations
  product_name_en: z.string().optional().default(""),
  seo_description_en: z.string().optional().default(""),
  marketing_description_en: z.string().optional().default(""),
  full_description_en: z.string().optional().default(""),
  category_en: z.string().optional().default(""),
  brand_en: z.string().optional().default(""),
  images: z.array(z.string()).optional().default([]),
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

export const uploadedProducts = pgTable("uploaded_products", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  sku: text("sku"),
  barcode: text("barcode"),
  frontImageUrl: text("front_image_url"),
  backImageUrl: text("back_image_url"),
  isSynced: boolean("is_synced").default(false).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  syncedAt: timestamp("synced_at"),
  productData: json("product_data"), // store the full generated JSON
});

export const insertUploadedProductSchema = createInsertSchema(uploadedProducts);
export type UploadedProduct = typeof uploadedProducts.$inferSelect;
