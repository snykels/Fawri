import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { ImageUploadCard } from "@/components/image-upload-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2,
  Download,
  Upload,
  ScanBarcode,
  RefreshCw,
  Tag,
  Barcode,
  FileText,
  Package,
  Copy,
  Check,
  ExternalLink,
  Languages,
  Search,
} from "lucide-react";
import type { ProductData } from "@shared/schema";

interface GenerateResponse {
  success: boolean;
  data?: ProductData;
  frontImageBase64?: string;
  backImageBase64?: string;
  error?: string;
}

export default function Home() {
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [frontImageBase64, setFrontImageBase64] = useState<string>("");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isEnglish, setIsEnglish] = useState(false);
  const { toast } = useToast();

  // Helper to get localized text
  const getText = (arField: string, enField: string | undefined) => {
    if (isEnglish && enField) return enField;
    return arField;
  };

  const handleCopyImageUrl = async () => {
    if (productData?.product_image_url) {
      await navigator.clipboard.writeText(productData.product_image_url);
      setCopiedUrl(true);
      toast({
        title: isEnglish ? "Copied" : "تم النسخ",
        description: isEnglish ? "Image URL copied" : "تم نسخ رابط الصورة",
      });
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleCopyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: isEnglish ? "Copied" : "تم النسخ",
      description: isEnglish ? `${label} copied` : `تم نسخ ${label}`,
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!frontImage || !backImage) {
        throw new Error("Both images are required");
      }

      const [frontBase64, backBase64] = await Promise.all([
        fileToBase64(frontImage),
        fileToBase64(backImage),
      ]);

      const res = await apiRequest("POST", "/api/generate", {
        frontImage: frontBase64,
        backImage: backBase64,
      });

      const response = await res.json() as GenerateResponse;

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to generate listing");
      }

      return response;
    },
    onSuccess: (response) => {
      setProductData(response.data!);
      setFrontImageBase64(response.frontImageBase64 || "");
      toast({
        title: isEnglish ? "Listing Created Successfully" : "تم إنشاء القائمة بنجاح",
        description: isEnglish ? "Product data extracted from images" : "تم تحليل الصور واستخراج البيانات",
      });
    },
    onError: (error: Error) => {
      toast({
        title: isEnglish ? "Generation Failed" : "فشل التوليد",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!productData) {
        throw new Error(isEnglish ? "No product data to download" : "لا توجد بيانات للتحميل");
      }

      const response = await fetch("/api/download-excel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          productData,
          frontImageBase64,
        }),
      });

      if (!response.ok) {
        throw new Error(isEnglish ? "Failed to generate Excel file" : "فشل في إنشاء ملف Excel");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salla-product-${productData.sku_barcode || "listing"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: isEnglish ? "Download Complete" : "اكتمل التحميل",
        description: isEnglish ? "Excel file downloaded successfully" : "تم تحميل ملف Excel بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: isEnglish ? "Download Failed" : "فشل التحميل",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReset = () => {
    setProductData(null);
    setFrontImage(null);
    setBackImage(null);
    setFrontImageBase64("");
    setCopiedUrl(false);
  };

  const canGenerate = frontImage && backImage;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold font-arabic" dir="rtl">
              إنشاء قائمة منتج لسلة
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto font-arabic" dir="rtl">
              ارفع صور المنتج (الأمامية والخلفية) وسيقوم الذكاء الاصطناعي بتحليلها واستخراج جميع البيانات تلقائياً
            </p>
          </div>

          {!productData && !generateMutation.isPending && (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <ImageUploadCard
                  label="Front Image"
                  labelAr="الصورة الأمامية"
                  sublabel="Product shot showing the item clearly"
                  sublabelAr="صورة المنتج بشكل واضح"
                  image={frontImage}
                  onImageChange={setFrontImage}
                  testId="input-front-image"
                />
                <ImageUploadCard
                  label="Back Image"
                  labelAr="الصورة الخلفية"
                  sublabel="Specs, barcode, and label information"
                  sublabelAr="المواصفات والباركود والملصق"
                  image={backImage}
                  onImageChange={setBackImage}
                  testId="input-back-image"
                />
              </div>

              <div className="flex justify-center">
                <Button
                  size="lg"
                  className="px-8 py-6 text-lg gap-2"
                  disabled={!canGenerate}
                  onClick={() => generateMutation.mutate()}
                  data-testid="button-generate"
                >
                  <ScanBarcode className="h-5 w-5" />
                  تحليل وإنشاء القائمة
                </Button>
              </div>

              <Card className="p-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 rounded-full bg-muted">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium font-arabic" dir="rtl">
                      جاهز لتحليل صور المنتج
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md font-arabic" dir="rtl">
                      ارفع صورة المنتج الأمامية والخلفية لاستخراج البيانات تلقائياً
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {generateMutation.isPending && (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium font-arabic" dir="rtl">
                    جاري تحليل المنتج...
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md font-arabic" dir="rtl">
                    يتم استخراج البيانات باستخدام الذكاء الاصطناعي
                  </p>
                </div>
              </div>
            </Card>
          )}

          {productData && !generateMutation.isPending && (
            <div className="space-y-4" dir={isEnglish ? "ltr" : "rtl"}>
              {/* Header with status and language toggle */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  <Check className="h-3 w-3 ml-1" />
                  {isEnglish ? "Analysis Complete" : "تم التحليل بنجاح"}
                </Badge>
                <Button
                  variant={isEnglish ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsEnglish(!isEnglish)}
                  data-testid="button-toggle-language"
                >
                  <Languages className="h-4 w-4" />
                  {isEnglish ? "عربي" : "English"}
                </Button>
              </div>

              {/* Product Image - Prominent Display */}
              <Card className="overflow-visible">
                <div className="p-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-64 h-64 rounded-lg bg-white border-2 overflow-hidden relative group shadow-sm">
                      {productData.product_image_url ? (
                        <img
                          src={productData.product_image_url}
                          alt={productData.product_name}
                          className="w-full h-full object-contain"
                          data-testid="img-product"
                          onError={(e) => {
                            // Hide broken image, show placeholder
                            e.currentTarget.style.display = 'none';
                            const placeholder = e.currentTarget.nextElementSibling;
                            if (placeholder) placeholder.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex flex-col items-center justify-center bg-muted ${productData.product_image_url ? 'hidden' : ''}`}>
                        <Package className="h-16 w-16 text-muted-foreground mb-2" />
                        <p className="text-xs text-muted-foreground text-center px-4">
                          {isEnglish ? "Official image not found" : "لم يتم العثور على صورة رسمية"}
                        </p>
                      </div>
                      {productData.product_image_url && (
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs gap-1"
                              onClick={handleCopyImageUrl}
                              aria-label={isEnglish ? "Copy image URL" : "نسخ رابط الصورة"}
                              data-testid="button-copy-image-url-preview"
                            >
                              {copiedUrl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copiedUrl ? (isEnglish ? "Copied" : "تم النسخ") : (isEnglish ? "Copy URL" : "نسخ الرابط")}
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => window.open(productData.product_image_url, "_blank")}
                              aria-label={isEnglish ? "Open image in new tab" : "فتح الصورة في نافذة جديدة"}
                              data-testid="button-open-image-preview"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    {productData.product_image_url && (
                      <p className="text-xs text-muted-foreground">{isEnglish ? "Official source image" : "صورة من المصدر الرسمي"}</p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Product Info Grid */}
              <div className="grid gap-3 md:grid-cols-2">
                {/* Product Name */}
                <button 
                  type="button"
                  className={`md:col-span-2 flex items-center justify-between gap-3 p-4 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 transition-colors ${isEnglish ? 'text-left' : 'text-right'}`}
                  onClick={() => handleCopyText(getText(productData.product_name, productData.product_name_en), isEnglish ? "Product Name" : "اسم المنتج")}
                  title={isEnglish ? "Click to copy" : "انقر للنسخ"}
                  data-testid="button-copy-product-name"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-1">{isEnglish ? "Product Name" : "اسم المنتج"}</p>
                    <p className="text-lg font-bold" data-testid="text-product-name">
                      {getText(productData.product_name, productData.product_name_en)}
                    </p>
                  </div>
                  <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>

                {/* Brand */}
                <button 
                  type="button"
                  className={`flex items-center justify-between gap-3 p-4 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 transition-colors ${isEnglish ? 'text-left' : 'text-right'}`}
                  onClick={() => handleCopyText(getText(productData.brand, productData.brand_en), isEnglish ? "Brand" : "الماركة")}
                  title={isEnglish ? "Click to copy" : "انقر للنسخ"}
                  data-testid="button-copy-brand"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-1">{isEnglish ? "Brand" : "الماركة"}</p>
                    <p className="text-base font-semibold" data-testid="text-brand">
                      {getText(productData.brand, productData.brand_en)}
                    </p>
                  </div>
                  <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>

                {/* Category */}
                <button 
                  type="button"
                  className={`flex items-center justify-between gap-3 p-4 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 transition-colors ${isEnglish ? 'text-left' : 'text-right'}`}
                  onClick={() => handleCopyText(getText(productData.category, productData.category_en), isEnglish ? "Category" : "التصنيف")}
                  title={isEnglish ? "Click to copy" : "انقر للنسخ"}
                  data-testid="button-copy-category"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-1">{isEnglish ? "Category" : "التصنيف"}</p>
                    <p className="text-base font-semibold" data-testid="text-category">
                      {getText(productData.category, productData.category_en)}
                    </p>
                  </div>
                  <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>

                {/* Barcode/SKU */}
                <button 
                  type="button"
                  className={`flex items-center justify-between gap-3 p-4 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 transition-colors ${isEnglish ? 'text-left' : 'text-right'}`}
                  onClick={() => handleCopyText(productData.sku_barcode, isEnglish ? "Barcode/SKU" : "الباركود")}
                  title={isEnglish ? "Click to copy" : "انقر للنسخ"}
                  data-testid="button-copy-sku"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <Barcode className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{isEnglish ? "Barcode / SKU" : "الباركود / SKU"}</p>
                      <p className="font-mono text-base font-bold" data-testid="text-sku">
                        {productData.sku_barcode}
                      </p>
                    </div>
                  </div>
                  <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>

                {/* Image URL */}
                {productData.product_image_url && (
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-2">{isEnglish ? "Image URL" : "رابط الصورة"}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs gap-1"
                        onClick={handleCopyImageUrl}
                        aria-label={isEnglish ? "Copy image URL" : "نسخ رابط الصورة"}
                        data-testid="button-copy-image-url"
                      >
                        {copiedUrl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedUrl ? (isEnglish ? "Copied" : "تم النسخ") : (isEnglish ? "Copy URL" : "نسخ الرابط")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => window.open(productData.product_image_url, "_blank")}
                        aria-label={isEnglish ? "Open image" : "فتح الصورة"}
                        data-testid="button-open-image"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {isEnglish ? "Open" : "فتح"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* SEO Description */}
              {(productData.seo_description || productData.seo_description_en) && (
                <Card>
                  <button 
                    type="button"
                    className={`w-full p-5 cursor-pointer hover:bg-muted/30 transition-colors ${isEnglish ? 'text-left' : 'text-right'}`}
                    onClick={() => handleCopyText(getText(productData.seo_description || "", productData.seo_description_en), isEnglish ? "SEO Description" : "وصف SEO")}
                    title={isEnglish ? "Click to copy" : "انقر للنسخ"}
                    data-testid="button-copy-seo-desc"
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        {isEnglish ? "SEO Description" : "وصف SEO"}
                      </h4>
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm leading-relaxed">
                      {getText(productData.seo_description || "", productData.seo_description_en)}
                    </p>
                  </button>
                </Card>
              )}

              {/* Marketing Description */}
              <Card>
                <button 
                  type="button"
                  className={`w-full p-5 cursor-pointer hover:bg-muted/30 transition-colors ${isEnglish ? 'text-left' : 'text-right'}`}
                  onClick={() => handleCopyText(getText(productData.marketing_description, productData.marketing_description_en), isEnglish ? "Marketing Description" : "الوصف التسويقي")}
                  title={isEnglish ? "Click to copy" : "انقر للنسخ"}
                  data-testid="button-copy-marketing-desc"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {isEnglish ? "Marketing Description" : "الوصف التسويقي"}
                    </h4>
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {getText(productData.marketing_description, productData.marketing_description_en)}
                  </p>
                </button>
              </Card>

              {/* Full Description */}
              <Card>
                <button 
                  type="button"
                  className={`w-full p-5 cursor-pointer hover:bg-muted/30 transition-colors ${isEnglish ? 'text-left' : 'text-right'} max-h-[400px] overflow-y-auto`}
                  onClick={() => handleCopyText(getText(productData.full_description, productData.full_description_en), isEnglish ? "Full Description" : "الوصف الكامل")}
                  title={isEnglish ? "Click to copy" : "انقر للنسخ"}
                  data-testid="button-copy-full-desc"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {isEnglish ? "Full Description" : "الوصف الكامل"}
                    </h4>
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {getText(productData.full_description, productData.full_description_en)}
                  </p>
                </button>
              </Card>

              <div className="flex justify-center gap-4 flex-wrap">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-6 py-6 text-lg gap-2"
                  onClick={handleReset}
                  data-testid="button-reset"
                >
                  <RefreshCw className="h-5 w-5" />
                  {isEnglish ? "Upload Another Product" : "رفع منتج آخر"}
                </Button>
                <Button
                  size="lg"
                  className="px-8 py-6 text-lg gap-2"
                  disabled={downloadMutation.isPending}
                  onClick={() => downloadMutation.mutate()}
                  data-testid="button-download"
                >
                  {downloadMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {isEnglish ? "Generating file..." : "جاري إنشاء الملف..."}
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      {isEnglish ? "Download Salla Excel" : "تحميل ملف Excel لسلة"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-center text-sm text-muted-foreground font-arabic" dir="rtl">
            منشئ قوائم سلة - أتمتة قوائم منتجات التجارة الإلكترونية
          </p>
        </div>
      </footer>
    </div>
  );
}
