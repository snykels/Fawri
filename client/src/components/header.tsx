import { ThemeToggle } from "./theme-toggle";
import { Languages } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { useLanguage } from "@/lib/language-provider";
import { Button } from "./ui/button";

export function Header() {
  const { theme } = useTheme();
  const { language, toggleLanguage, isEnglish } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/60 backdrop-blur-xl transition-all duration-300">
      <div className="flex h-20 items-center justify-between gap-4 px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <img
              src={theme === "dark" ? "/logo-dark.png" : "/logo_light.png"}
              alt="Fawri"
              className="h-12 w-auto object-contain hover:scale-105 transition-transform cursor-pointer"
              onClick={() => window.location.href = '/'}
            />
            <div className="h-8 w-[1px] bg-primary/20 hidden sm:block" />
            <span className="text-xl font-black tracking-tighter text-foreground hidden sm:block uppercase italic">
              Fawri <span className="text-primary font-bold">Sense</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 font-bold hover:bg-primary/10 hover:text-primary transition-all rounded-xl border border-transparent hover:border-primary/10"
            onClick={toggleLanguage}
          >
            <Languages className="h-4 w-4" />
            {isEnglish ? "العربية" : "English"}
          </Button>
          <div className="h-6 w-[1px] bg-primary/10 mx-1" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
