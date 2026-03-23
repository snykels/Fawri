import { Settings2, Monitor, Moon, Sun, Languages, Check } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { useLanguage } from "@/lib/language-provider";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "./ui/dropdown-menu";

export function Settings() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, isEnglish } = useLanguage();

  const themes = [
    { id: "light", icon: Sun, label: isEnglish ? "Light" : "فاتح" },
    { id: "dark", icon: Moon, label: isEnglish ? "Dark" : "داكن" },
    { id: "system", icon: Monitor, label: isEnglish ? "System" : "تلقائي" },
  ];

  const languages = [
    { id: "ar", label: "العربية" },
    { id: "en", label: "English" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl hover:bg-primary/10 hover:text-primary transition-all group"
        >
          <Settings2 className="h-5 w-5 group-hover:rotate-90 transition-transform duration-500" />
          <span className="sr-only">Settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 glass border-primary/10 rounded-2xl p-2 shadow-2xl">
        <DropdownMenuLabel className="px-3 py-2 text-xs font-black uppercase tracking-widest opacity-50">
          {isEnglish ? "Preferences" : "التفضيلات"}
        </DropdownMenuLabel>
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="rounded-xl flex items-center gap-2 px-3 py-2.5 cursor-pointer">
            <div className="p-1 rounded-lg bg-primary/10 text-primary">
              {theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </div>
            <span className="font-bold flex-1">{isEnglish ? "Appearance" : "المظهر"}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="glass border-primary/10 rounded-2xl p-2 min-w-[150px] shadow-2xl">
            {themes.map((t) => (
              <DropdownMenuItem
                key={t.id}
                className="rounded-xl flex items-center gap-2 px-3 py-2.5 cursor-pointer group"
                onClick={() => setTheme(t.id as any)}
              >
                <t.icon className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className={`flex-1 ${theme === t.id ? "font-black text-primary" : "font-medium"}`}>
                  {t.label}
                </span>
                {theme === t.id && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="rounded-xl flex items-center gap-2 px-3 py-2.5 cursor-pointer">
            <div className="p-1 rounded-lg bg-primary/10 text-primary">
              <Languages className="h-4 w-4" />
            </div>
            <span className="font-bold flex-1">{isEnglish ? "Language" : "اللغة"}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="glass border-primary/10 rounded-2xl p-2 min-w-[150px] shadow-2xl">
            {languages.map((l) => (
              <DropdownMenuItem
                key={l.id}
                className="rounded-xl flex items-center gap-2 px-3 py-2.5 cursor-pointer group"
                onClick={() => setLanguage(l.id as any)}
              >
                <span className={`flex-1 ${language === l.id ? "font-black text-primary" : "font-medium"}`}>
                  {l.label}
                </span>
                {language === l.id && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator className="bg-primary/5 mx-2 my-2" />
        
        <div className="px-3 py-2">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] opacity-30 text-center">
                Vision Sense v2.1
            </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
