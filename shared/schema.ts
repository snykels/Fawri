import { z } from "zod";

export const productDataSchema = z.object({
  product_name: z.string(),
  seo_title: z.string(),
  marketing_description: z.string(),
  full_description: z.string(),
  category: z.string(),
  brand: z.string(),
  sku_barcode: z.string(),
  subtitle: z.string(),
});

export type ProductData = z.infer<typeof productDataSchema>;

export const generateListingRequestSchema = z.object({
  frontImage: z.string(),
  backImage: z.string(),
});

export type GenerateListingRequest = z.infer<typeof generateListingRequestSchema>;

export const generateListingResponseSchema = z.object({
  success: z.boolean(),
  data: productDataSchema.optional(),
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
