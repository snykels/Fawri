import { useTheme } from "@/lib/theme-provider";
import { Settings } from "./Settings";

export function Header() {
  const { theme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/60 backdrop-blur-xl transition-all duration-300">
      <div className="flex h-20 items-center justify-between gap-4 px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <img
              src={theme === "dark" || theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "/logo-dark.png" : "/logo_light.png"}
              alt="Fawri"
              className="h-10 w-auto object-contain hover:scale-105 transition-transform cursor-pointer"
              onClick={() => window.location.href = '/'}
            />
            <div className="h-8 w-[1px] bg-primary/20 hidden sm:block" />
            <span className="text-xl font-black tracking-tighter text-foreground hidden sm:block uppercase italic">
              Fawri <span className="text-primary font-bold">Sense</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Settings />
        </div>
      </div>
    </header>
  );
}
