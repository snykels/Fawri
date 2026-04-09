import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { isEnglish, toggleLanguage } = useLanguage();
  const { theme } = useTheme();
  
  const [step, setStep] = useState<"email" | "verify" | "salla">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testCode, setTestCode] = useState(""); // للاختبار فقط

  const sendVerification = async () => {
    if (!email || !email.includes("@")) {
      setError(isEnglish ? "Please enter a valid email" : "الرجاء إدخال بريد إلكتروني صحيح");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (data.success) {
        setStep("verify");
        // للاختبار - عرض الرمز للتطوير
        if (data.testCode) {
          setTestCode(data.testCode);
          console.log("Test code:", data.testCode);
        }
      } else {
        setError(data.error || (isEnglish ? "Failed to send code" : "فشل في إرسال الرمز"));
      }
    } catch (err) {
      setError(isEnglish ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndLogin = async () => {
    if (!code || code.length !== 6) {
      setError(isEnglish ? "Please enter 6-digit code" : "الرجاء إدخال رمز التحقق المكون من 6 أرقام");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-and-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();

      if (data.success) {
        setStep("salla");
      } else {
        setError(data.error || (isEnglish ? "Invalid code" : "الرمز غير صحيح"));
      }
    } catch (err) {
      setError(isEnglish ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const handleSallaAuth = async () => {
    const redirectUri = `${window.location.origin}/salla-callback`;
    const response = await fetch(`/api/salla/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`);
    const data = await response.json();
    
    if (data.success && data.authUrl) {
      window.location.href = data.authUrl;
    } else {
      setError(isEnglish ? "Failed to connect to Salla" : "فشل في الاتصال بسلة");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 bg-background overflow-hidden font-sans">
      <div className="ambient-glow" />
      
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
              {step === "email" 
                ? (isEnglish ? "Register" : "تسجيل جديد") 
                : step === "verify"
                  ? (isEnglish ? "Verify Email" : "التحقق من الإيميل")
                  : (isEnglish ? "Connect to Salla" : "ربط سلة")}
            </CardTitle>
            <p className="text-muted-foreground text-sm font-semibold opacity-80 pt-2 px-4">
              {step === "email" 
                ? (isEnglish ? "Enter your email to get started" : "أدخل بريدك الإلكتروني للبدء") 
                : step === "verify"
                  ? (isEnglish ? `We sent a code to ${email}` : `أرسلنا رمز التحقق إلى ${email}`)
                  : (isEnglish ? "Connect your Salla store" : "اربط متجرك في سلة")}
            </p>
          </CardHeader>
          
          <CardContent className="pt-8 pb-10 px-8 flex flex-col items-center">
            {step === "email" && (
              <div className="w-full space-y-4">
                <div className="relative">
                  <Mail className="absolute right-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Input 
                    type="email" 
                    placeholder={isEnglish ? "Your email" : "بريدك الإلكتروني"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pr-10 rounded-xl"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button 
                  onClick={sendVerification}
                  disabled={loading}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white shadow-xl rounded-2xl font-bold text-lg"
                >
                  {loading ? <Loader2 className="animate-spin" /> : (isEnglish ? "Send Code" : "إرسال الرمز")}
                </Button>
              </div>
            )}

            {step === "verify" && (
              <div className="w-full space-y-4">
                {testCode && (
                  <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg text-center mb-2">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      {isEnglish ? "Test Code:" : "رمز الاختبار:"} <strong>{testCode}</strong>
                    </p>
                  </div>
                )}
                <div className="relative">
                  <Input 
                    type="text" 
                    placeholder={isEnglish ? "6-digit code" : "رمز التحقق (6 أرقام)"}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-12 text-center text-2xl letter-spacing-4 rounded-xl"
                    maxLength={6}
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button 
                  onClick={verifyAndLogin}
                  disabled={loading || code.length !== 6}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white shadow-xl rounded-2xl font-bold text-lg"
                >
                  {loading ? <Loader2 className="animate-spin" /> : (isEnglish ? "Verify & Continue" : "تحقق والمتابعة")}
                </Button>
                <Button 
                  variant="link"
                  onClick={() => { setStep("email"); setError(""); }}
                  className="w-full"
                >
                  {isEnglish ? "Change email" : "تغيير الإيميل"}
                </Button>
              </div>
            )}

            {step === "salla" && (
              <div className="w-full space-y-4">
                <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg text-center mb-4">
                  <p className="text-green-700 dark:text-green-300 font-bold">
                    ✓ {isEnglish ? "Email verified!" : "تم التحقق من الإيميل!"}
                  </p>
                </div>
                <Button 
                  onClick={handleSallaAuth}
                  className="w-full h-14 bg-[#00b289] hover:bg-[#008f6e] text-white shadow-xl shadow-[#00b289]/20 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl flex items-center justify-center gap-3 font-bold text-lg"
                >
                  <img src="https://salla.network/cdn/images/salla-logo-white.svg" alt="Salla Logo" className="w-6 h-6 object-contain" />
                  {isEnglish ? "Connect Salla Store" : "ربط متجر سلة"}
                </Button>
                <Button 
                  variant="link"
                  onClick={() => setLocation("/dashboard")}
                  className="w-full"
                >
                  {isEnglish ? "Skip for now" : "تخطي في الوقت الحالي"}
                </Button>
              </div>
            )}

            <div className="mt-8">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/login")} 
                className="text-muted-foreground hover:text-primary transition-colors text-xs font-bold"
              >
                {isEnglish ? "Already have an account? Login" : "لديك حساب؟ تسجيل دخول"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
