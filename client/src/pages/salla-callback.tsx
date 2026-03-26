import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";

export default function SallaCallbackPage() {
  const [, setLocation] = useLocation();
  const { isEnglish } = useLanguage();
  const { theme } = useTheme();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // استخراج الكود والـ state من URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (!code) {
          setStatus('error');
          setMessage(isEnglish ? 'Authorization code not found' : 'رمز التفويض غير موجود');
          return;
        }

        // إرسال الكود إلى الخادم لتبادل التوكنات
        const response = await fetch(`/api/salla/callback?code=${code}${state ? `&state=${state}` : ''}`);
        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage(isEnglish ? 'Successfully connected to Salla!' : 'تم الاتصال بسلة بنجاح!');
          
          // توجيه المستخدم إلى الصفحة الرئيسية بعد 2 ثانية
          setTimeout(() => {
            setLocation('/');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.message || (isEnglish ? 'Failed to connect to Salla' : 'فشل الاتصال بسلة'));
        }
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage(isEnglish ? 'An error occurred during connection' : 'حدث خطأ أثناء الاتصال');
      }
    };

    handleCallback();
  }, [isEnglish, setLocation]);

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 bg-background overflow-hidden font-sans">
      <div className="ambient-glow" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <Card className="bg-white/70 dark:bg-card/40 border-border hover:border-primary/40 shadow-2xl overflow-hidden backdrop-blur-2xl rounded-3xl transition-all">
          <CardHeader className="space-y-1 pb-6 pt-10 text-center border-b border-border/50">
            <div className="mx-auto w-40 mb-6 group cursor-pointer transition-transform hover:scale-105">
              <img 
                src={theme === "dark" ? "/logo-dark.png" : "/logo_light.png"} 
                alt="Fawri Logo" 
                className="w-full h-auto object-contain drop-shadow-xl" 
              />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-foreground">
              {isEnglish ? "Connecting to Salla" : "جاري الاتصال بسلة"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-10 px-8 flex flex-col items-center">
            
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <p className="text-muted-foreground text-center">
                  {isEnglish ? "Please wait while we connect your account..." : "يرجى الانتظار جاري ربط حسابك..."}
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center gap-4">
                <CheckCircle className="w-16 h-16 text-green-500" />
                <p className="text-green-600 font-bold text-center text-lg">
                  {message}
                </p>
                <p className="text-muted-foreground text-center text-sm">
                  {isEnglish ? "Redirecting to dashboard..." : "جاري التحويل إلى لوحة التحكم..."}
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-4">
                <XCircle className="w-16 h-16 text-red-500" />
                <p className="text-red-600 font-bold text-center text-lg">
                  {message}
                </p>
                <Button 
                  onClick={() => setLocation('/login')}
                  className="mt-4"
                >
                  {isEnglish ? "Try Again" : "حاول مرة أخرى"}
                </Button>
              </div>
            )}

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}