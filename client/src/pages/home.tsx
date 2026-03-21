import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { ImageUploadCard } from "@/components/image-upload-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/lib/language-provider";
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
  const { isEnglish } = useLanguage();
  const { toast } = useToast();

  const [progress, setProgress] = useState(0);

  const canGenerate = frontImage && backImage;

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
        throw new Error(isEnglish ? "Both images are required" : "يرجى إرفاق الصورتين معاً");
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
          const remaining = 95 - prev;
          const increment = Math.max(0.1, remaining * 0.05);
          return prev + increment;
        });
      }, 2000); // Slower progress for better "feel"
    } else if (productData) {
      setProgress(100);
    } else {
      setProgress(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [generateMutation.isPending, productData]);

  // Auto-trigger analysis
  useEffect(() => {
    if (canGenerate && !productData && !generateMutation.isPending && !generateMutation.isError) {
      generateMutation.mutate();
    }
  }, [canGenerate, productData, generateMutation, canGenerate]);

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
    generateMutation.reset();
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 relative overflow-hidden font-sans">
      <div className="ambient-glow" />
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <div className="space-y-8">
          <div className="text-center space-y-4 mb-20 mt-8">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight italic uppercase">
              {isEnglish ? "Intelligent" : "تحليل"}{" "}
              <span className="text-primary">{isEnglish ? "Product" : "المنتج"}</span>{" "}
              {isEnglish ? "Sense" : "بذكاء"}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-bold opacity-80 decoration-primary/20 underline-offset-4 decoration-2">
              {isEnglish 
                ? "Upload product shots to extract high-accuracy data for Salla & Zid using advanced AI sense." 
                : "ارفع صور المنتج وسيقوم الذكاء الاصطناعي بتحليلها واستخراج البيانات تلقائياً لمنصتي سلة وزد بدقة متناهية"}
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

              <div className="flex flex-col items-center justify-center mt-12 mb-16 gap-4">
                <div className={`flex flex-col items-center gap-4 transition-all duration-500 ${canGenerate ? 'scale-110' : 'opacity-40 scale-100'}`}>
                   <Button
                    size="lg"
                    className={`bolt-button px-16 py-10 text-2xl gap-4 rounded-[2.5rem] font-black shadow-2xl transition-all duration-500 ${canGenerate ? (generateMutation.isError ? 'bg-destructive/20 border-destructive/50 text-destructive' : 'bg-primary shadow-primary/40 border-primary/20 scale-105') : 'bg-muted shadow-none border-transparent grayscale'}`}
                    disabled={!generateMutation.isError && canGenerate} // Only clickable if error or manual
                    onClick={() => generateMutation.isError && generateMutation.mutate()}
                  >
                    {generateMutation.isPending ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : generateMutation.isError ? (
                      <RefreshCw className="h-8 w-8" />
                    ) : (
                      <ScanBarcode className="h-8 w-8" />
                    )}
                    {generateMutation.isPending 
                      ? (isEnglish ? "SENSING PRODUCT..." : "جاري الاستشعار...") 
                      : generateMutation.isError
                        ? (isEnglish ? "RETRY VISION" : "إعادة المحاولة")
                        : (isEnglish ? "VISION READY" : "بانتظار الصور...")
                    }
                  </Button>
                  {canGenerate && !generateMutation.isPending && !generateMutation.isError && (
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-primary font-black text-sm uppercase tracking-widest animate-pulse"
                    >
                      {isEnglish ? "Auto-Analysis Triggered" : "بداء التحليل التلقائي"}
                    </motion.p>
                  )}
                </div>
              </div>

              <Card className="p-16 glass rounded-[3rem] shadow-2xl border-primary/5">
                <div className="flex flex-col items-center justify-center text-center space-y-6">
                  <div className="p-6 rounded-3xl bg-primary/10 border border-primary/20 shadow-inner group transition-transform hover:scale-110">
                    <Upload className="h-12 w-12 text-primary" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-black italic uppercase tracking-tight">
                      {isEnglish ? "Awaiting Input" : "بانتظار صور المنتج..."}
                    </h3>
                    <p className="text-muted-foreground max-w-md font-bold mx-auto opacity-70">
                      {isEnglish ? "Connect your product shots to begin the data extraction magic." : "ارفع صورة المنتج الأمامية والخلفية لنبدأ السحر"}
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {generateMutation.isPending && (
            <Card className="p-16 glass border-primary/20 shadow-2xl rounded-[3rem]">
              <div className="flex flex-col items-center justify-center text-center space-y-8 max-w-lg mx-auto w-full">
                <div className="w-full space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xl font-black text-primary italic uppercase">{Math.round(progress)}%</span>
                    <span className="text-sm font-bold text-primary uppercase tracking-widest">{isEnglish ? "Analyzing Vision..." : "جاري التحليل..."}</span>
                  </div>
                  <Progress value={progress} className="h-4 w-full rounded-full bg-primary/10 border border-primary/5 shadow-inner" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black italic uppercase">
                    {isEnglish ? "Processing Data" : "جاري تحليل المنتج..."}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md font-bold opacity-70">
                    {isEnglish ? "AI is sense-extracting all mandatory catalog fields." : "يتم استخراج البيانات باستخدام الذكاء الاصطناعي"}
                  </p>
                </div>
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
              </div>
            </Card>
          )}

          {productData && !generateMutation.isPending && (
            <div className="space-y-6">
              {/* Header Status */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-[0.2em] bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-xl">
                  <Check className="h-3 w-3 mr-1.5" />
                  {isEnglish ? "Catalog Extract Ready" : "تم التحليل بنجاح"}
                </Badge>
              </div>

              {/* Layout Content */}
              <div className="grid gap-8 lg:grid-cols-3">
                {/* Product Image Column */}
                <div className="lg:col-span-1">
                  <Card className="overflow-hidden glass shadow-2xl rounded-[3rem] border-primary/5 sticky top-28">
                    <div className="p-8">
                      <div className="flex flex-col items-center gap-6">
                        {((productData.images && productData.images.length > 0) || productData.product_image_url) ? (
                          <Carousel className="w-full" opts={{ loop: true }}>
                            <CarouselContent>
                              {(productData.images && productData.images.length > 0
                                ? productData.images
                                : [productData.product_image_url]).filter(Boolean).map((imgUrl, index) => (
                                  <CarouselItem key={index}>
                                    <div className="group relative aspect-square rounded-[2rem] bg-white border border-primary/10 shadow-inner overflow-hidden">
                                      <img
                                        src={imgUrl}
                                        alt="Product"
                                        className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-700"
                                      />
                                      {/* Hover Action */}
                                      <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button size="icon" variant="secondary" className="rounded-xl shadow-xl hover:scale-110 transition-all" onClick={() => window.open(imgUrl, "_blank")}>
                                          <ExternalLink className="h-5 w-5" />
                                        </Button>
                                        <Button size="icon" variant="secondary" className="rounded-xl shadow-xl hover:scale-110 transition-all" onClick={() => {
                                          navigator.clipboard.writeText(imgUrl || "");
                                          toast({ title: isEnglish ? "Link Copied" : "تم نسخ الرابط" });
                                        }}>
                                          <Copy className="h-5 w-5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CarouselItem>
                                ))}
                            </CarouselContent>
                            <div className="flex justify-center gap-2 mt-4">
                                <CarouselPrevious className="static translate-y-0 rounded-xl" />
                                <CarouselNext className="static translate-y-0 rounded-xl" />
                            </div>
                          </Carousel>
                        ) : (
                          <div className="w-full aspect-square rounded-[2rem] bg-card/20 border-2 border-dashed border-primary/20 flex flex-col items-center justify-center p-8">
                            <Package className="h-16 w-16 text-primary/30 mb-4" />
                            <p className="text-center font-bold text-sm opacity-50 uppercase tracking-widest">{isEnglish ? "NO IMAGE" : "بدون صورة"}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Data Column */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Basic Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <DataBox label={isEnglish ? "Product Identity" : "اسم المنتج"} value={getText(productData.product_name, productData.product_name_en)} dataTestId="text-product-name" big />
                    <DataBox label={isEnglish ? "Brand" : "الماركة"} value={getText(productData.brand, productData.brand_en)} dataTestId="text-brand" />
                    <DataBox label={isEnglish ? "Category" : "التصنيف"} value={getText(productData.category, productData.category_en)} dataTestId="text-category" />
                    <DataBox label="BARCODE" value={productData.barcode} dataTestId="text-barcode" mono />
                    <DataBox label="SKU" value={productData.sku} dataTestId="text-sku" mono primary />
                  </div>

                  {/* Descriptions */}
                  <div className="space-y-4">
                    <DescBox icon={Search} label={isEnglish ? "SEO Vision" : "وصف SEO"} value={getText(productData.seo_description || "", productData.seo_description_en)} />
                    <DescBox icon={FileText} label={isEnglish ? "Marketing Blurb" : "الوصف التسويقي"} value={getText(productData.marketing_description, productData.marketing_description_en)} />
                    <DescBox icon={Package} label={isEnglish ? "Technical Specifications" : "الوصف الكامل"} value={getText(productData.full_description, productData.full_description_en)} expandable />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-4 pt-4">
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1 py-7 text-lg gap-2 rounded-2xl border-primary/10 glass hover:bg-primary/5 font-bold transition-all"
                      onClick={handleReset}
                    >
                      <RefreshCw className="h-5 w-5" />
                      {isEnglish ? "NEW PRODUCT" : "منتج جديد"}
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 py-7 text-lg gap-3 rounded-2xl bg-[#00b289] hover:bg-[#008f6e] text-white shadow-xl shadow-[#00b289]/10 font-black transition-all"
                      disabled={downloadMutation.isPending}
                      onClick={() => downloadMutation.mutate()}
                    >
                      <Download className="h-6 w-6" />
                      SALLA EXPORT
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 py-7 text-lg gap-3 rounded-2xl bg-[#7e3af2] hover:bg-[#6c2bd9] text-white shadow-xl shadow-[#7e3af2]/10 font-black transition-all"
                      disabled={downloadZidMutation.isPending}
                      onClick={() => downloadZidMutation.mutate()}
                    >
                      <Download className="h-6 w-6" />
                      ZID EXPORT
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-primary/5 mt-20 relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
           <p className="text-sm font-black italic opacity-40 uppercase tracking-widest">
            {isEnglish ? "Product of SLOQ INC." : "مُنتج من شركة SLOQ INC."}
          </p>
          <div className="flex gap-8">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Vision Sense AI</span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">v2.0 Beta</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DataBox({ label, value, big, mono, primary, dataTestId }: { label: string; value: string; big?: boolean; mono?: boolean; primary?: boolean; dataTestId?: string }) {
  const { isEnglish } = useLanguage();
  const { toast } = useToast();
  
  return (
    <div 
      className={`p-6 rounded-3xl glass border-primary/10 hover:bg-primary/5 transition-all cursor-pointer group ${big ? 'md:col-span-2' : ''}`}
      onClick={() => {
        navigator.clipboard.writeText(value);
        toast({ title: isEnglish ? "Field Copied" : "تم نسخ الحقل" });
      }}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{label}</p>
          <p className={`font-bold leading-tight ${big ? 'text-2xl' : 'text-lg'} ${mono ? 'font-mono tracking-tighter' : ''} ${primary ? 'text-primary' : 'text-foreground'}`} data-testid={dataTestId}>
            {value || "---"}
          </p>
        </div>
        <Copy className="h-4 w-4 text-primary opacity-0 group-hover:opacity-40 transition-opacity" />
      </div>
    </div>
  );
}

function DescBox({ icon: Icon, label, value, expandable }: { icon: any; label: string; value: string; expandable?: boolean }) {
  const { isEnglish } = useLanguage();
  const { toast } = useToast();
  
  if (!value) return null;

  return (
    <Card className={`glass border-primary/5 hover:border-primary/20 transition-all rounded-3xl overflow-hidden group`}>
      <div 
        className="p-6 cursor-pointer hover:bg-primary/5 transition-colors"
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast({ title: isEnglish ? "Message Copied" : "تم نسخ النص" });
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest opacity-60">
              {label}
            </h4>
          </div>
          <Copy className="h-4 w-4 text-primary opacity-0 group-hover:opacity-40 transition-opacity" />
        </div>
        <div className={`text-sm font-bold leading-relaxed whitespace-pre-wrap ${expandable ? 'max-h-[250px] overflow-y-auto pr-2' : ''}`}>
          {value}
        </div>
      </div>
    </Card>
  );
}
