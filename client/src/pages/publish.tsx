/**
 * صفحة النشر المباشر على سلة
 * تتيح للمستخدم نشر المنتجات مباشرة دون الحاجة لرفع صورتين
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Upload, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";

interface PublishResult {
  productName: string;
  seoTitle: string;
  description: string;
  sku: string;
  barcode: string;
  images: string[];
  sallaProductId?: string;
}

export default function PublishPage() {
  const [productName, setProductName] = useState("");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: (value: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!productName.trim()) {
      setError("يرجى إدخال اسم المنتج");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/publish-to-salla", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productName: productName.trim(),
          frontImage: frontImage || undefined,
          backImage: backImage || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "فشلت عملية النشر");
      }

      setResult(data.data);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء النشر");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateOnly = async () => {
    if (!productName.trim()) {
      setError("يرجى إدخال اسم المنتج");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productName: productName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "فشل في توليد المحتوى");
      }

      setResult(data.data);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء توليد المحتوى");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl" dir="rtl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">النشر المباشر على سلة</h1>
        <p className="text-muted-foreground">
          أدخل اسم المنتج وسيقوم النظام تلقائياً بتوليد الوصف والبحث عن الصور والنشر على سلة
        </p>
      </div>

      <div className="grid gap-6">
        {/* نموذج الإدخال */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات المنتج</CardTitle>
            <CardDescription>
              أدخل اسم المنتج بالتفصيل (مثال: شاومي ريدمي 15 سي، 128 جيجابايت، 6 جيجا رام - أزرق)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">اسم المنتج *</label>
              <Input
                placeholder="مثال: شاومي ريدمي 15 سي، 128 جيجابايت، 6 جيجا رام - أزرق"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="text-right"
                dir="rtl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* صورة المنتج الأمامية */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  صورة المنتج الأمامية (اختياري)
                </label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                  {frontImage ? (
                    <div className="relative">
                      <img
                        src={frontImage}
                        alt="صورة المنتج الأمامية"
                        className="max-h-40 mx-auto rounded"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 left-2"
                        onClick={() => setFrontImage(null)}
                      >
                        حذف
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        اضغط لرفع صورة المنتج الأمامية
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, setFrontImage)}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* صورة المنتج الخلفية */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  صورة المنتج الخلفية (اختياري)
                </label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                  {backImage ? (
                    <div className="relative">
                      <img
                        src={backImage}
                        alt="صورة المنتج الخلفية"
                        className="max-h-40 mx-auto rounded"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 left-2"
                        onClick={() => setBackImage(null)}
                      >
                        حذف
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        اضغط لرفع صورة المنتج الخلفية
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, setBackImage)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={handlePublish}
                disabled={isLoading || !productName.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري النشر...
                  </>
                ) : (
                  "نشر على سلة"
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleGenerateOnly}
                disabled={isLoading || !productName.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التوليد...
                  </>
                ) : (
                  "توليد المحتوى فقط"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* رسائل الخطأ */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>خطأ</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* نتائج النشر */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                تم بنجاح!
              </CardTitle>
              {result.sallaProductId && (
                <CardDescription>
                  رقم المنتج في سلة: {result.sallaProductId}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم المنتج</label>
                <p className="text-sm bg-muted p-2 rounded">{result.productName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">عنوان SEO</label>
                <p className="text-sm bg-muted p-2 rounded">{result.seoTitle}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">الوصف</label>
                <div
                  className="text-sm bg-muted p-3 rounded prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: result.description }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <p className="text-sm bg-muted p-2 rounded font-mono">{result.sku}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الباركود</label>
                  <p className="text-sm bg-muted p-2 rounded font-mono">{result.barcode || "غير متوفر"}</p>
                </div>
              </div>

              {result.images && result.images.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    الصور ({result.images.length})
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {result.images.map((img, index) => (
                      <img
                        key={index}
                        src={img}
                        alt={`صورة ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.png";
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}