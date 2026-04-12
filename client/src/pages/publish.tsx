import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, CheckCircle2, XCircle, Image as ImageIcon, Store, Link2, Plus, Trash2 } from "lucide-react";

interface SallaUser {
  id: number;
  email: string;
  name: string;
  sallaMerchantId: string | null;
  isActive: boolean;
}

interface PublishResult {
  productName: string;
  seoTitle: string;
  description: string;
  sku: string;
  barcode: string;
  images: string[];
  sallaProductId?: string;
}

interface ProductEntry {
  id: string;
  productName: string;
  frontImage: string | null;
  backImage: string | null;
  status: 'idle' | 'analyzing' | 'success' | 'error';
  result?: PublishResult;
  error?: string;
}

export default function PublishPage() {
  const [, setLocation] = useLocation();
  const [sallaUser, setSallaUser] = useState<SallaUser | null>(null);
  const [entries, setEntries] = useState<ProductEntry[]>([
    { id: Date.now().toString(), productName: "", frontImage: null, backImage: null, status: 'idle' }
  ]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResponse = await fetch('/api/user/check-auth');
        const authData = await authResponse.json();
        
        if (!authData.isAuthenticated) {
          setLocation('/login');
          return;
        }

        const userResponse = await fetch('/api/user/me');
        const userData = await userResponse.json();
        if (userData.success) {
          setSallaUser(userData.data);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setLocation('/login');
      }
    };
    
    checkAuth();
  }, [setLocation]);

  const addEntry = () => {
    setEntries(prev => [...prev, { id: Date.now().toString(), productName: "", frontImage: null, backImage: null, status: 'idle' }]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id: string, updates: Partial<ProductEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    entryId: string,
    field: 'frontImage' | 'backImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateEntry(entryId, { [field]: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handlePublishAll = async () => {
    setGlobalError(null);

    // Validate
    const invalidEntry = entries.find(e => !e.productName.trim());
    if (invalidEntry) {
      setGlobalError("يرجى إدخال اسم المنتج لجميع المنتجات المضافة");
      return;
    }

    if (!sallaUser?.sallaMerchantId) {
      setGlobalError("يجب ربط حساب سلة أولاً قبل نشر المنتجات");
      return;
    }

    setIsProcessingAll(true);

    for (const entry of entries) {
      if (entry.status === 'success') continue; // Skip already published

      updateEntry(entry.id, { status: 'analyzing', error: undefined });

      try {
        const response = await fetch("/api/user/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productName: entry.productName.trim(),
            frontImage: entry.frontImage || undefined,
            backImage: entry.backImage || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          if (data.requireSallaAuth) {
            handleConnectSalla();
            setIsProcessingAll(false);
            return;
          }
          throw new Error(data.error || "فشلت عملية النشر");
        }

        updateEntry(entry.id, { status: 'success', result: data.data });
      } catch (err: any) {
        updateEntry(entry.id, { status: 'error', error: err.message || "حدث خطأ أثناء النشر" });
      }
    }

    setIsProcessingAll(false);
  };

  const handleConnectSalla = async () => {
    try {
      const response = await fetch('/api/user/salla/auth-url');
      const data = await response.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting Salla:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/user/logout', { method: 'POST' });
      setLocation('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const allReady = entries.every(e => e.productName.trim().length > 0);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl" dir="rtl">
      {/* شريط العنوان مع حالة الربط بسلة */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
           <Button variant="outline" size="sm" onClick={() => setLocation('/admin')} className="gap-2 shrink-0">
             لوحة التحكم
           </Button>
           <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 shrink-0 text-destructive border-destructive hover:bg-destructive/10">
             تسجيل الخروج
           </Button>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-start border-b md:border-0 pb-4 md:pb-0 border-border">
          {sallaUser?.sallaMerchantId ? (
            <Badge variant="default" className="bg-green-600 gap-2 shrink-0">
              <Link2 className="w-3 h-3" /> متصل بسلة
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-2 shrink-0">
              <Store className="w-3 h-3" /> غير متصل بالسلة
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleConnectSalla} className="gap-2 shrink-0">
            <Store className="w-3 h-3" />
            {sallaUser?.sallaMerchantId ? 'تحديث الاتصال' : 'ربط سلة'}
          </Button>
        </div>
      </div>

      <div className="text-center mb-8 bg-blue-50/50 p-6 rounded-2xl dark:bg-card">
        <h1 className="text-3xl font-black mb-2 text-primary">الرفع المتعدد الذكي لمتجر سلة</h1>
        <p className="text-muted-foreground font-semibold">
          قم برفع منتج أو عدة منتجات دفعة واحدة. سيقوم النظام بتحليلها بالذكاء الاصطناعي ونشرها مباشرة على متجرك في سلة دون عناء.
        </p>
        {!sallaUser?.sallaMerchantId && (
          <Alert className="mt-4 max-w-lg mx-auto bg-amber-50 border-amber-200">
            <Store className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 font-bold">تنبيه الربط المطلوب</AlertTitle>
            <AlertDescription className="text-amber-700">
              يجب ربط حساب سلة أولاً قبل إمكانية رفع المنتجات. اضغط على أزرار الربط في الأعلى.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {globalError && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-8">
        {entries.map((entry, index) => (
          <Card key={entry.id} className={`overflow-hidden transition-all duration-300 border-2 ${entry.status === 'success' ? 'border-green-500/50 bg-green-50/10' : entry.status === 'analyzing' ? 'border-primary/50 shadow-primary/20 shadow-xl' : 'border-transparent shadow-md'}`}>
            <CardHeader className="bg-muted/30 pb-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                   المنتج {index + 1}
                   {entry.status === 'success' && <Badge className="bg-green-500">تم الرفع لسلة</Badge>}
                   {entry.status === 'analyzing' && <Badge className="bg-primary animate-pulse">جاري التحليل...</Badge>}
                </CardTitle>
              </div>
              {entries.length > 1 && entry.status !== 'analyzing' && (
                <Button variant="ghost" size="sm" onClick={() => removeEntry(entry.id)} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 ml-1" /> إزالة
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">اسم المنتج المقترح أو مراجعته *</label>
                <Input
                  placeholder="مثال: شاومي ريدمي 15 سي، 128 جيجابايت..."
                  value={entry.productName}
                  onChange={(e) => updateEntry(entry.id, { productName: e.target.value })}
                  disabled={entry.status === 'analyzing' || entry.status === 'success'}
                  className="text-right font-medium text-lg"
                  dir="rtl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">صورة المنتج الأمامية</label>
                  <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-primary transition-colors bg-white/50 dark:bg-background">
                    {entry.frontImage ? (
                      <div className="relative group">
                        <img src={entry.frontImage} alt="أمامي" className="max-h-40 mx-auto rounded shadow-sm" />
                        {entry.status !== 'analyzing' && entry.status !== 'success' && (
                          <Button variant="destructive" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => updateEntry(entry.id, { frontImage: null })}>حذف</Button>
                        )}
                      </div>
                    ) : (
                      <label className="cursor-pointer block py-4">
                        <Upload className="mx-auto h-8 w-8 text-primary/60 mb-2" />
                        <p className="text-sm font-bold text-muted-foreground">صورة الواجهة الأمامية</p>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, entry.id, 'frontImage')} disabled={entry.status === 'analyzing' || entry.status === 'success'} />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">صورة الباركود/الخلفية</label>
                  <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-primary transition-colors bg-white/50 dark:bg-background">
                    {entry.backImage ? (
                      <div className="relative group">
                        <img src={entry.backImage} alt="خلفي" className="max-h-40 mx-auto rounded shadow-sm" />
                        {entry.status !== 'analyzing' && entry.status !== 'success' && (
                          <Button variant="destructive" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => updateEntry(entry.id, { backImage: null })}>حذف</Button>
                        )}
                      </div>
                    ) : (
                      <label className="cursor-pointer block py-4">
                        <ImageIcon className="mx-auto h-8 w-8 text-primary/60 mb-2" />
                        <p className="text-sm font-bold text-muted-foreground">خلفية العلبة / التفاصيل</p>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, entry.id, 'backImage')} disabled={entry.status === 'analyzing' || entry.status === 'success'} />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {entry.error && (
                <Alert variant="destructive" className="mt-4">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>خطأ في تحليل المنتج</AlertTitle>
                  <AlertDescription>{entry.error}</AlertDescription>
                </Alert>
              )}

              {entry.result && (
                <div className="mt-4 bg-green-50/50 dark:bg-green-950/20 p-5 rounded-xl border border-green-200">
                  <div className="flex items-center gap-2 mb-4 text-green-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold">اكتمل التوليد وتم الرفع لسلة بنجاح</span>
                   {entry.result.sallaProductId && <Badge variant="outline" className="mr-auto">Salla ID: {entry.result.sallaProductId}</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                    <div>
                      <span className="text-muted-foreground">الاسم المعتمد:</span> <br />
                      <span className="text-foreground font-black">{entry.result.productName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الباركود (SKU):</span> <br />
                      <code className="text-primary bg-primary/10 px-2 py-0.5 rounded">{entry.result.sku}</code>
                    </div>
                  </div>
                  {entry.result.images && entry.result.images.length > 0 && (
                     <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                        {entry.result.images.map((img, i) => (
                          <img key={i} src={img} className="h-16 rounded border" alt="" onError={e => (e.target as any).src = '/placeholder.png'} />
                        ))}
                     </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/70 dark:bg-card/40 p-6 rounded-2xl border border-border shadow-lg sticky bottom-4 z-50 backdrop-blur-xl">
        <Button 
          variant="outline" 
          onClick={addEntry} 
          disabled={isProcessingAll}
          className="font-bold border-2 border-primary/20 hover:border-primary text-primary bg-white w-full md:w-auto h-12 rounded-xl"
        >
          <Plus className="w-5 h-5 ml-2" />
          إضافة منتج آخر
        </Button>

        <Button 
          onClick={handlePublishAll}
          disabled={isProcessingAll || !allReady || entries.every(e => e.status === 'success')}
          size="lg"
          className="w-full md:w-80 h-14 font-black shadow-primary/20 shadow-xl rounded-xl text-lg relative overflow-hidden"
        >
          {isProcessingAll ? (
            <>
              <Loader2 className="ml-2 h-6 w-6 animate-spin" />
              جاري تحليل ورفع {entries.filter(e => e.status !== 'success').length} منتج...
            </>
          ) : (
             <span className="flex items-center">
                تحليل ورفع الكل لسلة <Store className="w-5 h-5 mr-2" />
             </span>
          )}
        </Button>
      </div>
    </div>
  );
}
