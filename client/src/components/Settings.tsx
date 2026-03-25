import { Settings2, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { useLanguage } from "@/lib/language-provider";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function Settings() {
  const { theme, setTheme } = useTheme();
  const { setLanguage, isEnglish } = useLanguage();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl hover:bg-primary/10 hover:text-primary transition-all group"
        >
          <Settings2 className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" />
          <span className="sr-only">Settings</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[200px] p-4 glass border-primary/10 rounded-[20px] shadow-2xl flex flex-col gap-6">
        {/* Theme Toggles */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme("system")}
            className={`flex-1 h-12 rounded-xl transition-all ${theme === 'system' ? 'bg-white/10 dark:bg-white/10' : 'hover:bg-primary/5'}`}
          >
            <Monitor className={`h-6 w-6 ${theme === 'system' ? 'text-primary' : 'opacity-70'}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme("dark")}
            className={`flex-1 h-12 rounded-xl transition-all ${theme === 'dark' ? 'bg-white/10 dark:bg-white/10' : 'hover:bg-primary/5'}`}
          >
            <Moon className={`h-6 w-6 ${theme === 'dark' ? 'text-primary' : 'opacity-70'}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme("light")}
            className={`flex-1 h-12 rounded-xl transition-all ${theme === 'light' ? 'bg-white/10 dark:bg-white/10' : 'hover:bg-primary/5'}`}
          >
            <Sun className={`h-6 w-6 ${theme === 'light' ? 'text-primary' : 'opacity-70'}`} />
          </Button>
        </div>

        {/* Language Button */}
        <div className="flex justify-end px-2">
          <button
            onClick={() => setLanguage(isEnglish ? "ar" : "en")}
            className="text-xl font-medium hover:text-primary transition-colors cursor-pointer tracking-wide"
          >
            {isEnglish ? "Language" : "اللغة"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
