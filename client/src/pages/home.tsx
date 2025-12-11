import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { ImageUploadCard } from "@/components/image-upload-card";
import { ProductPreview } from "@/components/product-preview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProviderSettings } from "@/components/settings-drawer";
import {
  Loader2,
  Sparkles,
  Download,
  AlertCircle,
  Upload,
  CheckCircle2,
} from "lucide-react";
import type { ProductData, GenerateListingResponse } from "@shared/schema";

const defaultSettings: ProviderSettings = {
  provider: "gemini",
  openaiKey: "",
  geminiKey: "",
  openrouterKey: "",
};

export default function Home() {
  const [settings, setSettings] = useState<ProviderSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ai_settings");
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) };
        } catch {
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  });
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const { toast } = useToast();

  const handleSettingsChange = useCallback((newSettings: ProviderSettings) => {
    setSettings(newSettings);
    localStorage.setItem("ai_settings", JSON.stringify(newSettings));
  }, []);

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

  const getCurrentApiKey = () => {
    switch (settings.provider) {
      case "openai":
        return settings.openaiKey;
      case "gemini":
        return settings.geminiKey;
      case "openrouter":
        return settings.openrouterKey;
    }
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

      const res = await apiRequest(
        "POST",
        "/api/generate",
        {
          frontImage: frontBase64,
          backImage: backBase64,
          apiKey: getCurrentApiKey() || undefined,
          provider: settings.provider,
        }
      );

      const response = await res.json() as GenerateListingResponse;

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to generate listing");
      }

      return response.data;
    },
    onSuccess: (data) => {
      setProductData(data);
      toast({
        title: "Listing Generated",
        description: "Your product listing has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
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
        body: JSON.stringify({ productData }),
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
        title: "Download Complete",
        description: "Your Excel file has been downloaded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const hasBuiltInSupport = settings.provider !== "openai";
  const hasApiKey = getCurrentApiKey().length > 0;
  const isConfigured = hasBuiltInSupport || hasApiKey;
  const canGenerate = frontImage && backImage && isConfigured;

  const getProviderLabel = () => {
    switch (settings.provider) {
      case "gemini":
        return "Gemini";
      case "openrouter":
        return "OpenRouter";
      case "openai":
        return "OpenAI";
      default:
        return settings.provider;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold">Create Product Listing</h2>
            <p className="text-lg text-muted-foreground font-arabic" dir="rtl">
              إنشاء قائمة منتج جديدة
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Upload your product images and let AI analyze them to generate a
              complete Salla-ready listing. We'll extract the barcode, specs,
              and create optimized descriptions.
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                Using: {getProviderLabel()}
              </Badge>
              {hasApiKey && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-500/50">
                  Your API Key
                </Badge>
              )}
              {hasBuiltInSupport && !hasApiKey && (
                <Badge variant="outline" className="text-xs text-blue-600 border-blue-500/50">
                  Built-in Credits
                </Badge>
              )}
            </div>
          </div>

          {!isConfigured && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>API Key Required</AlertTitle>
              <AlertDescription>
                Please configure your OpenAI API key in Settings to enable
                AI-powered listing generation.
              </AlertDescription>
              <p className="text-sm font-arabic mt-2" dir="rtl">
                يرجى إدخال مفتاح API الخاص بـ OpenAI في الإعدادات
              </p>
            </Alert>
          )}

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
                  Analyzing Images...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Listing
                </>
              )}
            </Button>
          </div>

          {generateMutation.isPending && (
            <Card className="p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-muted" />
                  <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-medium">Processing your images with {getProviderLabel()}...</p>
                  <p className="text-sm text-muted-foreground">
                    Our AI is analyzing the product details, barcode, and specs
                  </p>
                  <p className="text-sm text-muted-foreground font-arabic" dir="rtl">
                    جاري تحليل صور المنتج...
                  </p>
                </div>
              </div>
            </Card>
          )}

          {productData && !generateMutation.isPending && (
            <div className="space-y-6">
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">
                  Listing Generated Successfully
                </AlertTitle>
                <AlertDescription>
                  Review the extracted data below and download your Excel file
                  when ready.
                </AlertDescription>
                <p className="text-sm font-arabic mt-2 text-green-600" dir="rtl">
                  تم إنشاء القائمة بنجاح. قم بمراجعة البيانات ثم تحميل الملف.
                </p>
              </Alert>

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
                      Generating Excel...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      Download Salla Excel
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
                  <h3 className="text-lg font-medium">
                    Ready to Generate Your Listing
                  </h3>
                  <h3 className="text-lg font-medium font-arabic" dir="rtl">
                    جاهز لإنشاء قائمة المنتج
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Upload both product images above, then click "Generate
                    Listing" to create your Salla-ready Excel file with
                    AI-extracted product data.
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md font-arabic" dir="rtl">
                    ارفع صور المنتج أعلاه، ثم اضغط على "إنشاء القائمة" لإنشاء ملف Excel جاهز لسلة
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Salla Product Lister AI - Automate your e-commerce product listings
          </p>
          <p className="text-center text-sm text-muted-foreground font-arabic mt-1" dir="rtl">
            أتمتة قوائم منتجات التجارة الإلكترونية
          </p>
        </div>
      </footer>
    </div>
  );
}
