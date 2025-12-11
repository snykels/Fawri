import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { ImageUploadCard } from "@/components/image-upload-card";
import { ProductPreview } from "@/components/product-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  ScanBarcode,
  FileText,
  Cpu,
  Eye,
  Wand2,
} from "lucide-react";
import type { ProductData, GenerateListingResponse, AnalysisResult } from "@shared/schema";

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
  const [useAI, setUseAI] = useState(true);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [stages, setStages] = useState<string[]>([]);
  const [method, setMethod] = useState<string>("");
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
          useAI,
        }
      );

      const response = await res.json() as GenerateListingResponse;

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to generate listing");
      }

      return response;
    },
    onSuccess: (response) => {
      setProductData(response.data!);
      setAnalysisResult(response.analysis || null);
      setStages(response.stages || []);
      setMethod(response.method || "");
      toast({
        title: "تم إنشاء القائمة",
        description: response.method === "ai_enhanced" 
          ? "تم تحسين البيانات بالذكاء الاصطناعي"
          : "تم استخراج البيانات بتحليل OCR",
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

  const hasBuiltInSupport = settings.provider !== "openai";
  const hasApiKey = getCurrentApiKey().length > 0;
  const canGenerate = frontImage && backImage;

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
              Upload your product images. The system will analyze them using OCR and barcode detection, with optional AI enhancement.
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto font-arabic" dir="rtl">
              ارفع صور المنتج. سيتم تحليلها باستخدام OCR واكتشاف الباركود، مع خيار التحسين بالذكاء الاصطناعي.
            </p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Analysis Options
                <span className="font-arabic mr-2">خيارات التحليل</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id="use-ai"
                    checked={useAI}
                    onCheckedChange={setUseAI}
                    data-testid="switch-use-ai"
                  />
                  <Label htmlFor="use-ai" className="flex flex-col gap-1 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4" />
                      AI Enhancement
                      <span className="font-arabic">تحسين بالذكاء الاصطناعي</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {useAI ? "AI will verify and enhance OCR results" : "Only OCR analysis, no AI"}
                    </span>
                  </Label>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {useAI ? `AI: ${getProviderLabel()}` : "OCR Only"}
                  </Badge>
                  {useAI && hasApiKey && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-500/50">
                      Your API Key
                    </Badge>
                  )}
                  {useAI && hasBuiltInSupport && !hasApiKey && (
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-500/50">
                      Built-in Credits
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

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

          {generateMutation.isPending && stages.length > 0 && (
            <Card className="p-6">
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  مراحل التحليل
                </h3>
                <div className="space-y-2">
                  {stages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-arabic" dir="rtl">{stage}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-muted-foreground">جاري المعالجة...</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {productData && !generateMutation.isPending && (
            <div className="space-y-6">
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">
                  تم إنشاء القائمة بنجاح
                </AlertTitle>
                <AlertDescription className="flex flex-col gap-1">
                  <span>
                    {method === "ai_enhanced" 
                      ? "تم تحسين البيانات بالذكاء الاصطناعي" 
                      : "تم استخراج البيانات بتحليل OCR فقط"}
                  </span>
                  {analysisResult && (
                    <span className="text-xs">
                      دقة التحليل: {Math.round(analysisResult.confidence)}%
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {analysisResult && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      نتائج التحليل
                      <span className="text-sm font-normal text-muted-foreground">
                        Analysis Results
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {analysisResult.barcode && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Barcode</p>
                          <p className="font-mono text-sm font-medium">{analysisResult.barcode}</p>
                        </div>
                      )}
                      {analysisResult.brand && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Brand</p>
                          <p className="text-sm font-medium">{analysisResult.brand}</p>
                        </div>
                      )}
                      {analysisResult.modelNumber && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Model</p>
                          <p className="font-mono text-sm font-medium">{analysisResult.modelNumber}</p>
                        </div>
                      )}
                      {analysisResult.storage && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Storage</p>
                          <p className="text-sm font-medium">{analysisResult.storage}</p>
                        </div>
                      )}
                      {analysisResult.ram && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">RAM</p>
                          <p className="text-sm font-medium">{analysisResult.ram}</p>
                        </div>
                      )}
                      {analysisResult.color && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Color</p>
                          <p className="text-sm font-medium">{analysisResult.color}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {stages.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      مراحل التحليل
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stages.map((stage, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="font-arabic" dir="rtl">{stage}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

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
                  <h3 className="text-lg font-medium">
                    Ready to Analyze Your Product
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md font-arabic" dir="rtl">
                    ارفع صور المنتج أعلاه. سيتم استخدام OCR لاستخراج النصوص والباركود، مع خيار التحسين بالذكاء الاصطناعي.
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Upload both product images above. OCR will extract text and barcode, with optional AI enhancement.
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
          <p className="text-center text-sm text-muted-foreground mt-1">
            Salla Product Lister AI - Automate your e-commerce product listings
          </p>
        </div>
      </footer>
    </div>
  );
}
