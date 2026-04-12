import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language-provider";
import { useTheme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Globe, Store, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isEnglish, toggleLanguage } = useLanguage();
  const { theme } = useTheme();

  const handleSallaLogin = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/salla/auth-url");
      const data = await res.json();
      if (data.success && data.authUrl) {
         window.location.href = data.authUrl;
      } else {
        toast({ 
          title: isEnglish ? "Login failed" : "فشل الدخول", 
          description: data.message || "Could not reach Salla OAuth", 
          variant: "destructive" 
        });
        setIsLoading(false);
      }
    } catch {
      toast({ 
        title: "Error", 
        description: isEnglish ? "Login request failed" : "فشل طلب تسجيل الدخول", 
        variant: "destructive" 
      });
      setIsLoading(false);
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
        <Card className="glass border-primary/20 shadow-2xl overflow-hidden backdrop-blur-2xl bg-white/70 dark:bg-card/40 rounded-3xl">
          <CardHeader className="space-y-1 pb-6 pt-10 text-center border-b border-border/50">
            <div className="mx-auto w-32 mb-4 group cursor-pointer transition-transform hover:scale-105">
              <img 
                src={theme === "dark" ? "/logo-dark.png" : "/logo_light.png"} 
                alt="Fawri Logo" 
                className="w-full h-auto object-contain drop-shadow-xl" 
              />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-primary">
              {isEnglish ? "Store Control Panel" : "لوحة تحكم المتجر"}
            </CardTitle>
            <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold opacity-70">
              {isEnglish ? "Login via Salla Platform" : "الدخول عبر منصة سلة"}
            </p>
          </CardHeader>
          <CardContent className="pt-8 px-8 pb-10 space-y-4 text-center">
             <Store className="w-16 h-16 text-primary/50 mx-auto mb-4" />
             <p className="text-sm font-bold text-muted-foreground mb-4">
                {isEnglish ? "To analyze and upload your products, please authenticate using your Salla Merchant account." : "لتحليل ورفع منتجاتك، يرجى تسجيل الدخول باستخدام حساب كتاجر في منصة سلة."}
             </p>
            <Button onClick={handleSallaLogin} size="lg" disabled={isLoading} className="w-full bolt-button font-bold text-lg h-14 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl mt-4">
              {isLoading ? <Loader2 className="animate-spin w-6 h-6 mr-2" /> : <Store className="w-6 h-6 mr-2" />}
              {isEnglish ? "Login with Salla" : "تسجيل الدخول عبر سلة"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
