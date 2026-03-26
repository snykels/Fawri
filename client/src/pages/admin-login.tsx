import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language-provider";
import { useTheme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Globe, Search, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const { isEnglish, toggleLanguage } = useLanguage();
  const { theme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        toast({ 
          title: isEnglish ? "Logged in successfully" : "تم الدخول بنجاح", 
          description: isEnglish ? "Welcome back, Admin." : "مرحباً بك مجدداً، أيها المشرف." 
        });
        setLocation("/admin"); // Redirect to the dashboard
      } else {
        toast({ 
          title: isEnglish ? "Login failed" : "فشل الدخول", 
          description: data.message, 
          variant: "destructive" 
        });
      }
    } catch {
      toast({ 
        title: "Error", 
        description: isEnglish ? "Login request failed" : "فشل طلب تسجيل الدخول", 
        variant: "destructive" 
      });
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
            <CardTitle className="text-2xl font-black tracking-tight uppercase italic text-primary">
              {isEnglish ? "Admin Console" : "لوحة المشرف"}
            </CardTitle>
            <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold opacity-70">
              {isEnglish ? "Secure Access Only" : "دخول آمن فقط"}
            </p>
          </CardHeader>
          <CardContent className="pt-8 px-8 pb-10 space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <Input 
                    type="text" 
                    placeholder={isEnglish ? "Username" : "اسم المستخدم"} 
                    className="bg-white/50 dark:bg-background/40 border-primary/10 focus-visible:ring-primary pl-10 pr-10 h-12 transition-all hover:bg-white dark:hover:bg-background/60 rounded-xl font-medium"
                    value={username} onChange={e => setUsername(e.target.value)} 
                  />
                  <Search className={`absolute ${isEnglish ? 'left-3' : 'right-3'} top-3.5 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors`} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative group">
                  <Input 
                    type="password" 
                    placeholder={isEnglish ? "Password" : "كلمة المرور"} 
                    className="bg-white/50 dark:bg-background/40 border-primary/10 focus-visible:ring-primary pl-10 pr-10 h-12 transition-all hover:bg-white dark:hover:bg-background/60 rounded-xl font-medium"
                    value={password} onChange={e => setPassword(e.target.value)} 
                  />
                  <ShieldCheck className={`absolute ${isEnglish ? 'left-3' : 'right-3'} top-3.5 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors`} />
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full bolt-button font-bold text-lg h-12 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl mt-4">
                {isEnglish ? "Authorize Entry" : "دخول اللوحة"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
