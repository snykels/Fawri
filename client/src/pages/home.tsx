import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { ImageUploadCard } from "@/components/image-upload-card";
import { ProductPreview } from "@/components/product-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2,
  Download,
  Upload,
  CheckCircle2,
  ScanBarcode,
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
  const { toast } = useToast();

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
              disabled={!canGenerate || generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
              data-testid="button-generate"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري التحليل...
                </>
              ) : (
                <>
                  <ScanBarcode className="h-5 w-5" />
                  تحليل وإنشاء القائمة
                </>
              )}
            </Button>
          </div>

          {productData && !generateMutation.isPending && (
            <div className="space-y-6">
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600 font-arabic" dir="rtl">
                  تم إنشاء القائمة بنجاح
                </AlertTitle>
                <AlertDescription className="font-arabic" dir="rtl">
                  تم تحليل الصور واستخراج جميع البيانات بالذكاء الاصطناعي
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-arabic" dir="rtl">
                    بيانات المنتج
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">اسم المنتج</p>
                      <p className="text-sm font-medium font-arabic">{productData.product_name}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">الماركة</p>
                      <p className="text-sm font-medium font-arabic">{productData.brand}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">التصنيف</p>
                      <p className="text-sm font-medium font-arabic">{productData.category}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">الباركود/SKU</p>
                      <p className="font-mono text-sm font-medium">{productData.sku_barcode}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 md:col-span-2">
                      <p className="text-xs text-muted-foreground">عنوان SEO</p>
                      <p className="text-sm font-medium font-arabic">{productData.seo_title}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 md:col-span-2">
                      <p className="text-xs text-muted-foreground">الوصف التسويقي</p>
                      <p className="text-sm font-medium font-arabic">{productData.marketing_description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <ProductPreview data={productData} />

              <div className="flex justify-center">
                <Button
                  size="lg"
                  variant="secondary"
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

          {!productData && !generateMutation.isPending && (
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
