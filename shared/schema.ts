import { z } from "zod";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";

export const productDataSchema = z.object({
  product_name: z.string().min(1, "اسم المنتج مطلوب"),
  seo_title: z.string().optional().default(""),
  seo_description: z.string().optional().default(""),
  marketing_description: z.string().min(1, "الوصف التسويقي مطلوب"),
  full_description: z.string().min(1, "الوصف الكامل مطلوب"),
  category: z.string().min(1, "التصنيف مطلوب"),
  brand: z.string().min(1, "الماركة مطلوبة"),
  brand_en: z.string().optional().default(""),
  sku: z.string().optional().default(""),
  barcode: z.string().min(1, "الباركود مطلوب"),
  product_image_url: z.string().optional().default(""),
  product_name_en: z.string().optional().default(""),
  seo_description_en: z.string().optional().default(""),
  marketing_description_en: z.string().optional().default(""),
  full_description_en: z.string().optional().default(""),
  category_en: z.string().optional().default(""),
  video_url: z.string().optional().default(""),
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

export const uploadedProducts = sqliteTable("uploaded_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productName: text("product_name").notNull(),
  sku: text("sku"),
  barcode: text("barcode"),
  frontImageUrl: text("front_image_url"),
  backImageUrl: text("back_image_url"),
  isSynced: integer("is_synced", { mode: "boolean" }).default(false).notNull(),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" }),
  productData: text("product_data", { mode: "json" }), // store the full generated JSON
  sallaProductId: text("salla_product_id"),
});

export const sallaTokens = sqliteTable("salla_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  merchantId: text("merchant_id"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const insertSallaTokenSchema = createInsertSchema(sallaTokens);
export type SallaToken = typeof sallaTokens.$inferSelect;

export const insertUploadedProductSchema = createInsertSchema(uploadedProducts);
export type UploadedProduct = typeof uploadedProducts.$inferSelect;

// جدول أحداث Webhook من سلة
export const sallaWebhookEvents = sqliteTable("salla_webhook_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  merchantId: text("merchant_id"),
  eventType: text("event_type").notNull(), // مثل: product.create, order.create, app.install
  eventId: text("event_id"), // معرف الحدث من سلة
  payload: text("payload", { mode: "json" }), // البيانات الكاملة للحدث
  processed: integer("processed", { mode: "boolean" }).default(false).notNull(),
  processedAt: integer("processed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const insertSallaWebhookEventSchema = createInsertSchema(sallaWebhookEvents);
export type SallaWebhookEvent = typeof sallaWebhookEvents.$inferSelect;

// جدول المستخدمين/العملاء
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name"),
  sallaMerchantId: text("salla_merchant_id"),
  sallaAccessToken: text("salla_access_token"),
  sallaRefreshToken: text("salla_refresh_token"),
  sallaTokenExpiresAt: integer("salla_token_expires_at", { mode: "timestamp" }),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export type User = typeof users.$inferSelect;

// تحديث جدول المنتجات لإضافة معرف المستخدم
export const uploadedProductsWithUser = sqliteTable("uploaded_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  productName: text("product_name").notNull(),
  sku: text("sku"),
  barcode: text("barcode"),
  frontImageUrl: text("front_image_url"),
  backImageUrl: text("back_image_url"),
  isSynced: integer("is_synced", { mode: "boolean" }).default(false).notNull(),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" }),
  productData: text("product_data", { mode: "json" }),
  sallaProductId: text("salla_product_id"),
});
