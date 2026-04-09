import { useLocation } from "wouter";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { isEnglish, toggleLanguage } = useLanguage();
  const { theme } = useTheme();

  // التحقق من حالة المصادقة عند تحميل الصفحة
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/check-auth');
        const data = await response.json();
        
        if (data.isAuthenticated) {
          // إذا كان المستخدم مسجل دخوله، توجيهه إلى لوحة التحكم
          setLocation('/dashboard');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // في حالة الخطأ، نترك المستخدم في صفحة تسجيل الدخول
      }
    };

    checkAuth();
  }, [setLocation]);

  const handleSallaLogin = async () => {
    try {
      // جلب رابط التفويض من الخادم
      const response = await fetch('/api/salla/auth-url');
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // توجيه المستخدم إلى صفحة تفويض سلة
        window.location.href = data.authUrl;
      } else {
        alert(isEnglish ? 'Failed to get authorization URL' : 'فشل في الحصول على رابط التفويض');
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
      alert(isEnglish ? 'An error occurred' : 'حدث خطأ');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 bg-background overflow-hidden font-sans">
      <div className="ambient-glow" />
      
      {/* Floating Language Toggle */}
      <div className="absolute top-6 right-6 z-50">
         <Button variant="ghost" size="sm" onClick={toggleLanguage} className="glass gap-2 font-bold px-4 h-10 rounded-xl border border-primary/10 hover:bg-white/50 dark:hover:bg-card/50 transition-all">
            <Globe className="w-4 h-4 text-primary" />
            {isEnglish ? "العربية" : "English"}
         </Button>
      </div>

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
              {isEnglish ? "Welcome to Fawri" : "مرحباً بك في فوري"}
            </CardTitle>
            <p className="text-muted-foreground text-sm font-semibold opacity-80 pt-2 px-4">
              {isEnglish ? "Sign in to access your intelligent product sense dashboard." : "سجل دخولك للوصول إلى لوحة تحكم المنتجات الذكية."}
            </p>
          </CardHeader>
          <CardContent className="pt-8 pb-10 px-8 flex flex-col items-center">
            
            {/* Login with Salla Button */}
            <Button 
                size="lg" 
                onClick={handleSallaLogin}
                className="w-full h-14 bg-[#00b289] hover:bg-[#008f6e] text-white shadow-xl shadow-[#00b289]/20 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl flex items-center justify-center gap-3 font-bold text-lg"
            >
                <img src="https://salla.network/cdn/images/salla-logo-white.svg" alt="Salla Logo" className="w-6 h-6 object-contain" />
                {isEnglish ? "Login with Salla" : "تسجيل مستخدم بواسطة سلة"}
            </Button>
            
            {/* Admin Link at the bottom */}
            <div className="mt-8">
                <Button 
                  variant="ghost" 
                  onClick={() => setLocation("/admin/login")} 
                  className="text-muted-foreground hover:text-primary transition-colors text-xs font-bold"
                >
                  {isEnglish ? "Admin Access" : "دخول المشرفين"}
                </Button>
            </div>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
