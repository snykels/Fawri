import { ThemeToggle } from "./theme-toggle";
import { SettingsDrawer, type ProviderSettings } from "./settings-drawer";
import { FileSpreadsheet } from "lucide-react";

interface HeaderProps {
  settings: ProviderSettings;
  onSettingsChange: (settings: ProviderSettings) => void;
}

export function Header({
  settings,
  onSettingsChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-primary-foreground">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold leading-tight">
                Salla Product Lister AI
              </h1>
              <span className="text-lg font-bold font-arabic hidden md:inline" dir="rtl">
                منشئ قوائم سلة
              </span>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              AI-powered product listing generator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SettingsDrawer
            settings={settings}
            onSettingsChange={onSettingsChange}
          />
        </div>
      </div>
    </header>
  );
}
