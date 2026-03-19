import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { ImageUploadCard } from "@/components/image-upload-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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

  const [progress, setProgress] = useState(0);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (generateMutation.isPending) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          // Non-linear progress simulation
          const remaining = 95 - prev;
          const increment = Math.max(0.1, remaining * 0.05);
          return prev + increment;
        });
      }, 200);
    } else if (productData) {
      setProgress(100);
    } else {
      setProgress(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [generateMutation.isPending, productData]);

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
      a.download = `salla-product-${productData.sku || "listing"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: isEnglish ? "Download Complete" : "اكتمل التحميل",
        description: isEnglish ? "File downloaded successfully" : "تم تحميل ملف الإكسل بنجاح",
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

  const downloadZidMutation = useMutation({
    mutationFn: async () => {
      if (!productData) {
        throw new Error(isEnglish ? "No product data to download" : "لا توجد بيانات للتحميل");
      }

      const response = await fetch("/api/download-zid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productData }),
      });

      if (!response.ok) {
        throw new Error(isEnglish ? "Failed to generate Zid file" : "فشل في إنشاء ملف زد");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zid-product-${productData.sku || "listing"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: isEnglish ? "Download Complete" : "اكتمل التحميل",
        description: isEnglish ? "File downloaded successfully" : "تم تحميل ملف الإكسل بنجاح",
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
    setProgress(0);
  };

  const canGenerate = frontImage && backImage;

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 relative overflow-hidden">
      <div className="ambient-glow" />
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <div className="space-y-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight font-arabic leading-tight" dir="rtl">
              تحليل <span className="italic text-primary">المنتج</span> بذكاء
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-arabic" dir="rtl">
              ارفع صور المنتج وسيقوم الذكاء الاصطناعي بتحليلها واستخراج البيانات تلقائياً لمنصتي سلة وزد بدقة متناهية
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

              <div className="flex justify-center mt-12">
                <Button
                  size="lg"
                  className="bolt-button px-10 py-7 text-xl gap-3 rounded-full bg-primary hover:bg-primary/90 text-white border border-white/20 shadow-[0_0_20px_rgba(20,136,252,0.3)] transition-all duration-300"
                  disabled={!canGenerate}
                  onClick={() => generateMutation.mutate()}
                  data-testid="button-generate"
                >
                  <ScanBarcode className="h-6 w-6" />
                  تحليل وإضافة المنتج
                </Button>
              </div>

              <Card className="p-16 glass rounded-[2.5rem] shadow-2xl">
                <div className="flex flex-col items-center justify-center text-center space-y-6">
                  <div className="p-5 rounded-full bg-primary/10 border border-primary/20">
                    <Upload className="h-10 w-10 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold font-arabic" dir="rtl">
                      بانتظار صور المنتج...
                    </h3>
                    <p className="text-muted-foreground max-w-md font-arabic mx-auto" dir="rtl">
                      ارفع صورة المنتج الأمامية والخلفية لنبدأ السحر
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {generateMutation.isPending && (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto w-full">
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
                    <span className="text-sm font-medium text-primary font-arabic" dir="rtl">جاري التحليل...</span>
                  </div>
                  <Progress value={progress} className="h-3 w-full" />
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
                <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/20 px-3 py-1">
                  <Check className="h-3 w-3 ml-1" />
                  {isEnglish ? "Analysis Complete" : "تم التحليل بنجاح"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-white/10 hover:bg-white/5"
                  onClick={() => setIsEnglish(!isEnglish)}
                  data-testid="button-toggle-language"
                >
                  <Languages className="h-4 w-4" />
                  {isEnglish ? "عربي" : "English"}
                </Button>
              </div>

              {/* Product Image - Prominent Display */}
              <Card className="overflow-hidden glass shadow-2xl rounded-[3rem]">
                <div className="p-8 sm:p-12">
                  <div className="flex flex-col items-center gap-6">
                    {((productData.images && productData.images.length > 0) || productData.product_image_url) ? (
                      <Carousel className="w-full max-w-lg mx-auto" opts={{ loop: true }}>
                        <CarouselContent>
                          {(productData.images && productData.images.length > 0
                            ? productData.images
                            : [productData.product_image_url]).filter(Boolean).map((imgUrl, index) => (
                              <CarouselItem key={index}>
                                <div className="flex items-center justify-center p-1">
                                  <div className="w-full aspect-square rounded-[2rem] bg-white border border-black/5 dark:border-white/10 shadow-inner overflow-hidden relative group transition-all duration-300">
                                    <img
                                      src={imgUrl}
                                      alt={`${getText(productData.product_name, productData.product_name_en)} - ${index + 1}`}
                                      className="w-full h-full object-contain p-6"
                                      data-testid={`img-product-${index}`}
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const placeholder = e.currentTarget.nextElementSibling;
                                        if (placeholder) placeholder.classList.remove('hidden');
                                      }}
                                    />
                                    <div className={`w-full h-full flex flex-col items-center justify-center bg-muted absolute inset-0 hidden`}>
                                      <Package className="h-20 w-20 text-muted-foreground mb-3 opacity-20" />
                                      <p className="text-sm text-muted-foreground font-medium">
                                        {isEnglish ? "Image not found" : "لم يتم العثور على صورة"}
                                      </p>
                                    </div>

                                    {/* Tools Overlay */}
                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                                      <div className="w-full p-3 bg-background/95 backdrop-blur-sm border-t flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1 text-xs gap-2 font-medium"
                                          onClick={() => {
                                            navigator.clipboard.writeText(imgUrl || "");
                                            toast({ title: isEnglish ? "Copied" : "تم النسخ" });
                                          }}
                                        >
                                          <Copy className="h-3.5 w-3.5" />
                                          {isEnglish ? "Copy URL" : "نسخ الرابط"}
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="outline"
                                          className="h-9 w-9"
                                          onClick={() => window.open(imgUrl, "_blank")}
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="outline"
                                          className="h-9 w-9"
                                          onClick={async () => {
                                            if (!imgUrl) return;
                                            try {
                                              const response = await fetch(`/api/download-image?url=${encodeURIComponent(imgUrl)}`);
                                              if (!response.ok) throw new Error("Download failed");
                                              const blob = await response.blob();
                                              const url = window.URL.createObjectURL(blob);
                                              const a = document.createElement('a');
                                              a.href = url;
                                              a.download = `product-image-${index + 1}.jpg`;
                                              document.body.appendChild(a);
                                              a.click();
                                              window.URL.revokeObjectURL(url);
                                              document.body.removeChild(a);
                                              toast({ title: isEnglish ? "Download Complete" : "اكتمل التحميل" });
                                            } catch (error) {
                                              toast({ title: isEnglish ? "Download Failed" : "فشل التحميل", variant: "destructive" });
                                            }
                                          }}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CarouselItem>
                            ))}
                        </CarouselContent>
                        <div className="absolute top-1/2 -left-4 sm:-left-12 transform -translate-y-1/2 flex">
                          <CarouselPrevious />
                        </div>
                        <div className="absolute top-1/2 -right-4 sm:-right-12 transform -translate-y-1/2 flex">
                          <CarouselNext />
                        </div>
                      </Carousel>
                    ) : (
                      <div className="w-full max-w-md aspect-square rounded-xl bg-muted/50 border-2 border-dashed flex flex-col items-center justify-center p-8">
                        <Package className="h-20 w-20 text-muted-foreground/30 mb-4" />
                        <p className="text-center text-muted-foreground font-arabic" dir="rtl">
                          {isEnglish ? "No product images found" : "لم يتم العثور على صور رسمية للمنتج"}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground font-medium px-4 py-1.5 bg-muted rounded-full">
                      {productData.images && productData.images.length > 1
                        ? (isEnglish ? "Swipe to see multiple angles" : "اسحب لرؤية المزيد من الصور")
                        : (isEnglish ? "Official source image" : "صورة من المصدر الرسمي")
                      }
                    </p>
                  </div>
                </div>
              </Card>

              {/* Product Info Grid */}
              <div className="grid gap-3 md:grid-cols-2">
                {/* Product Name */}
                <button
                  type="button"
                  className={`md:col-span-2 flex items-center justify-between gap-3 p-5 rounded-2xl glass shadow-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isEnglish ? 'text-left' : 'text-right'}`}
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
                  className={`flex items-center justify-between gap-3 p-5 rounded-2xl glass shadow-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isEnglish ? 'text-left' : 'text-right'}`}
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
                  className={`flex items-center justify-between gap-3 p-5 rounded-2xl glass shadow-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isEnglish ? 'text-left' : 'text-right'}`}
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

                {/* Barcode */}
                <button
                  type="button"
                  className={`flex items-center justify-between gap-3 p-5 rounded-2xl glass shadow-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isEnglish ? 'text-left' : 'text-right'}`}
                  onClick={() => handleCopyText(productData.barcode, isEnglish ? "Barcode" : "الباركود")}
                  title={isEnglish ? "Click to copy" : "انقر للنسخ"}
                  data-testid="button-copy-barcode"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <Barcode className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{isEnglish ? "Barcode" : "الباركود"}</p>
                      <p className="font-mono text-base font-bold" data-testid="text-barcode">
                        {productData.barcode}
                      </p>
                    </div>
                  </div>
                  <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>

                {/* SKU */}
                <button
                  type="button"
                  className={`flex items-center justify-between gap-3 p-5 rounded-2xl glass shadow-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isEnglish ? 'text-left' : 'text-right'}`}
                  onClick={() => handleCopyText(productData.sku, "SKU")}
                  title={isEnglish ? "Click to copy" : "انقر للنسخ"}
                  data-testid="button-copy-sku"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">SKU</p>
                      <p className="font-mono text-base font-bold" data-testid="text-sku">
                        {productData.sku}
                      </p>
                    </div>
                  </div>
                  <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>

                {/* Image URL */}
                {productData.product_image_url && (
                  <div className="p-5 rounded-2xl glass shadow-sm">
                    <p className="text-xs text-muted-foreground mb-2">{isEnglish ? "Image URL" : "رابط الصورة"}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs gap-1 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                        onClick={handleCopyImageUrl}
                        aria-label={isEnglish ? "Copy image URL" : "نسخ رابط الصورة"}
                        data-testid="button-copy-image-url"
                      >
                        {copiedUrl ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                        {copiedUrl ? (isEnglish ? "Copied" : "تم النسخ") : (isEnglish ? "Copy URL" : "نسخ الرابط")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
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
                <Card className="glass shadow-sm rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    className={`w-full p-5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isEnglish ? 'text-left' : 'text-right'}`}
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
              <Card className="glass shadow-sm rounded-2xl overflow-hidden">
                <button
                  type="button"
                  className={`w-full p-5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isEnglish ? 'text-left' : 'text-right'}`}
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
              <Card className="glass shadow-sm rounded-2xl overflow-hidden">
                <button
                  type="button"
                  className={`w-full p-6 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isEnglish ? 'text-left' : 'text-right'} max-h-[400px] overflow-y-auto`}
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
                  className="px-8 py-6 text-lg gap-2 bg-[#00b289] hover:bg-[#008f6e] text-white" // Salla Green
                  disabled={downloadMutation.isPending}
                  onClick={() => downloadMutation.mutate()}
                  data-testid="button-download"
                >
                  {downloadMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {isEnglish ? "Generating..." : "جاري المعالجة..."}
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[10px] opacity-80 uppercase tracking-tight">Export for</span>
                        <span className="font-bold">Salla</span>
                      </div>
                      <Download className="h-5 w-5 ml-1" />
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  className="px-8 py-6 text-lg gap-2 bg-[#7e3af2] hover:bg-[#6c2bd9] text-white" // Zid Purple
                  disabled={downloadZidMutation.isPending}
                  onClick={() => downloadZidMutation.mutate()}
                  data-testid="button-download-zid"
                >
                  {downloadZidMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {isEnglish ? "Generating..." : "جاري المعالجة..."}
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[10px] opacity-80 uppercase tracking-tight">Export for</span>
                        <span className="font-bold">Zid</span>
                      </div>
                      <Download className="h-5 w-5 ml-1" />
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
            مُدخل البيانات بالذكاء الإصطناعي - احدى منتجات SLOQ INC.
          </p>
        </div>
      </footer>
    </div>
  );
}
