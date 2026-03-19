import { ThemeToggle } from "./theme-toggle";
import { FileSpreadsheet } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";

export function Header() {
  const { theme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-xl transition-all duration-300">
      <div className="flex h-16 items-center justify-between gap-4 px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img
              src={theme === "dark" ? "/logo-dark.png" : "/logo_light.png"}
              alt="فوري Fawri"
              className="h-10 w-auto object-contain"
            />
            <span className="text-xl font-bold tracking-tight text-foreground hidden sm:block">
              Fawri <span className="text-muted-foreground font-normal">| فوري</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary text-white rounded-md border border-white/20">
              Beta
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
