import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-provider";

// صفحة لإضافة منتج عبر تصوير أمام وخلف وتحميله تلقائياً للسلة المرتبطة
export default function AddProductByPhotosPage() {
  const { isEnglish } = useLanguage();

  const [productName, setProductName] = useState<string>("");
  const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
  const [backImageBase64, setBackImageBase64] = useState<string | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [responseData, setResponseData] = useState<any>(null);

  const canSubmit = useMemo(() => {
    return productName.trim().length > 0 && !!frontImageBase64 && !!backImageBase64;
  }, [productName, frontImageBase64, backImageBase64]);

  // 读取文件并转为 base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.replace(/^data:\w+\/\w+;base64,/, ""));
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onFrontChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    // التحقق من النوع قبل القراءة
    if (!/^image\//.test(file.type)) {
      setError(isEnglish ? "Front image must be an image file" : "يجب أن تكون صورة أمامية" );
      return;
    }
    try {
      const base64 = await readFileAsBase64(file);
      setFrontImageBase64(base64);
      setFrontPreview(URL.createObjectURL(file)); // preview
    } catch {
      setError(isEnglish ? "Failed to read front image" : "فشل قراءة الصورة الأمامية");
    }
  };

  const onBackChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError(isEnglish ? "Back image must be an image file" : "يجب أن تكون صورة خلفية" );
      return;
    }
    try {
      const base64 = await readFileAsBase64(file);
      setBackImageBase64(base64);
      setBackPreview(URL.createObjectURL(file));
    } catch {
      setError(isEnglish ? "Failed to read back image" : "فشل قراءة الصورة الخلفية");
    }
  };

  const submit = async () => {
    setError(null);
    setSuccess(false);
    if (!canSubmit) {
      setError(isEnglish ? "Please provide a product name and both images" : "يرجى إدخال اسم المنتج وكلا الصورتين");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        productName,
        frontImage: frontImageBase64,
        backImage: backImageBase64,
      } as const;

      const res = await fetch("/api/user/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.error || (isEnglish ? "Publish failed" : "فشل النشر"));
      } else {
        setResponseData(data);
        setSuccess(true);
      }
    } catch (err) {
      setError(isEnglish ? "Network error" : "خطأ في الشبكة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-background font-sans flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <Card className="bg-white/90 dark:bg-card/70 border-border shadow-2xl">
          <CardHeader className="text-center pt-6 pb-4 border-b border-border/50">
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              {isEnglish ? "Add Product by Photos" : "إضافة المنتج بالصور"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  {isEnglish ? "Product Name" : "اسم المنتج"}
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={isEnglish ? "Enter product name" : "أدخل اسم المنتج"}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    {isEnglish ? "Front Image" : "الصورة الأمامية"}
                  </label>
                  <input type="file" accept="image/*" onChange={onFrontChange} />
                  {frontPreview && (
                    <img src={frontPreview} alt="Front Preview" className="mt-2 max-w-full h-auto" />
                  )}
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    {isEnglish ? "Back Image (Barcode/Details)" : "الصورة الخلفية (الباركود/المواصفات)"}
                  </label>
                  <input type="file" accept="image/*" onChange={onBackChange} />
                  {backPreview && (
                    <img src={backPreview} alt="Back Preview" className="mt-2 max-w-full h-auto" />
                  )}
                </div>
              </div>

              {error && <div className="text-red-600 font-medium">{error}</div>}
              {success && responseData && (
                <div className="text-green-700 font-semibold">
                  {isEnglish
                    ? "Product published successfully to Salla."
                    : "تم نشر المنتج بنجاح على سلة."}
                  {responseData?.data?.sallaProductId
                    ? ` ID: ${responseData.data.sallaProductId}`
                    : ""}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setProductName(""); setFrontImageBase64(null); setBackImageBase64(null); setFrontPreview(null); setBackPreview(null); setError(null); setSuccess(false); setResponseData(null); }}>
                  {isEnglish ? "Reset" : "إعادة تعيين"}
                </Button>
                <Button onClick={submit} disabled={!canSubmit || loading}>
                  {loading ? (isEnglish ? "Publishing..." : "جار النشر...") : (isEnglish ? "Publish to Salla" : "نشر إلى سلة")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
