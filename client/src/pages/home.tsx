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
  const { toast } = useToast();

  const handleCopyImageUrl = async () => {
    if (productData?.product_image_url) {
      await navigator.clipboard.writeText(productData.product_image_url);
      setCopiedUrl(true);
      toast({
        title: "تم النسخ",
        description: "تم نسخ رابط الصورة",
      });
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleCopyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ",
      description: `تم نسخ ${label}`,
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
        title: "تم إنشاء القائمة بنجاح",
        description: "تم تحليل الصور واستخراج البيانات",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل التوليد",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!productData) {
        throw new Error("No product data to download");
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
        throw new Error("Failed to generate Excel file");
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
        title: "اكتمل التحميل",
        description: "تم تحميل ملف Excel بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل التحميل",
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
            <div className="space-y-6">
              <Card className="overflow-visible">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-full lg:w-64 aspect-square rounded-lg bg-white border overflow-hidden relative group">
                        {productData.product_image_url ? (
                          <img
                            src={productData.product_image_url}
                            alt={productData.product_name}
                            className="w-full h-full object-contain"
                            data-testid="img-product"
                            onError={(e) => {
                              if (frontImageBase64) {
                                e.currentTarget.src = `data:image/jpeg;base64,${frontImageBase64}`;
                              }
                            }}
                          />
                        ) : frontImageBase64 ? (
                          <img
                            src={`data:image/jpeg;base64,${frontImageBase64}`}
                            alt={productData.product_name}
                            className="w-full h-full object-contain"
                            data-testid="img-product"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Package className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        {productData.product_image_url && (
                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs gap-1"
                                onClick={handleCopyImageUrl}
                                data-testid="button-copy-image-url"
                              >
                                {copiedUrl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                {copiedUrl ? "تم النسخ" : "نسخ الرابط"}
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => window.open(productData.product_image_url, "_blank")}
                                data-testid="button-open-image"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-4" dir="rtl">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              variant="secondary" 
                              className="text-xs cursor-pointer"
                              onClick={() => handleCopyText(productData.brand, "الماركة")}
                            >
                              {productData.brand}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="text-xs cursor-pointer"
                              onClick={() => handleCopyText(productData.category, "التصنيف")}
                            >
                              {productData.category}
                            </Badge>
                          </div>
                          <h3 
                            className="text-xl font-bold font-arabic cursor-pointer hover:text-primary transition-colors" 
                            data-testid="text-product-name"
                            onClick={() => handleCopyText(productData.product_name, "اسم المنتج")}
                            title="انقر للنسخ"
                          >
                            {productData.product_name}
                          </h3>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div 
                          className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => handleCopyText(productData.sku_barcode, "الباركود")}
                          title="انقر للنسخ"
                        >
                          <Barcode className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">الباركود/SKU</p>
                            <p className="font-mono text-sm font-medium truncate" data-testid="text-sku">
                              {productData.sku_barcode}
                            </p>
                          </div>
                        </div>
                        <div 
                          className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => handleCopyText(productData.seo_title || "", "عنوان SEO")}
                          title="انقر للنسخ"
                        >
                          <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">عنوان SEO</p>
                            <p className="text-sm font-medium truncate font-arabic">
                              {productData.seo_title || "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div 
                        className="space-y-2 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => handleCopyText(productData.marketing_description, "الوصف التسويقي")}
                        title="انقر للنسخ"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">الوصف التسويقي</p>
                        </div>
                        <p className="text-sm font-arabic leading-relaxed">
                          {productData.marketing_description}
                        </p>
                      </div>

                      <div 
                        className="space-y-2 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => handleCopyText(productData.full_description, "الوصف الكامل")}
                        title="انقر للنسخ"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">الوصف الكامل</p>
                        </div>
                        <p className="text-sm font-arabic leading-relaxed">
                          {productData.full_description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
                  رفع منتج آخر
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
                      جاري إنشاء الملف...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      تحميل ملف Excel لسلة
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
