import { useState, useEffect } from "react";
import { Settings, Key, CheckCircle, AlertCircle, Cpu, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type AIProvider = "openai" | "gemini" | "openrouter";

export interface ProviderSettings {
  provider: AIProvider;
  openaiKey: string;
  geminiKey: string;
  openrouterKey: string;
}

interface SettingsDrawerProps {
  settings: ProviderSettings;
  onSettingsChange: (settings: ProviderSettings) => void;
}

export function SettingsDrawer({
  settings,
  onSettingsChange,
}: SettingsDrawerProps) {
  const [localSettings, setLocalSettings] = useState<ProviderSettings>(settings);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSettingsChange(localSettings);
    setIsOpen(false);
  };

  const getCurrentApiKey = () => {
    switch (localSettings.provider) {
      case "openai":
        return localSettings.openaiKey;
      case "gemini":
        return localSettings.geminiKey;
      case "openrouter":
        return localSettings.openrouterKey;
    }
  };

  const setCurrentApiKey = (key: string) => {
    switch (localSettings.provider) {
      case "openai":
        setLocalSettings({ ...localSettings, openaiKey: key });
        break;
      case "gemini":
        setLocalSettings({ ...localSettings, geminiKey: key });
        break;
      case "openrouter":
        setLocalSettings({ ...localSettings, openrouterKey: key });
        break;
    }
  };

  const hasBuiltInSupport = localSettings.provider !== "openai";
  const hasApiKey = getCurrentApiKey().length > 0;
  const isConfigured = hasBuiltInSupport || hasApiKey;

  const getProviderInfo = () => {
    switch (localSettings.provider) {
      case "openai":
        return {
          label: "OpenAI API Key",
          placeholder: "sk-...",
          helpText: "Get your key from platform.openai.com/api-keys",
          helpTextAr: "احصل على مفتاحك من platform.openai.com",
        };
      case "gemini":
        return {
          label: "Google AI API Key (Optional)",
          placeholder: "AIza...",
          helpText: "Leave empty to use built-in credits, or enter your own key from aistudio.google.com",
          helpTextAr: "اتركه فارغاً لاستخدام الرصيد المدمج، أو أدخل مفتاحك الخاص",
        };
      case "openrouter":
        return {
          label: "OpenRouter API Key (Optional)",
          placeholder: "sk-or-...",
          helpText: "Leave empty to use built-in credits, or enter your own key from openrouter.ai",
          helpTextAr: "اتركه فارغاً لاستخدام الرصيد المدمج، أو أدخل مفتاحك الخاص",
        };
    }
  };

  const providerInfo = getProviderInfo();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative"
          data-testid="button-settings"
        >
          <Settings className="h-5 w-5" />
          {isConfigured ? (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500" />
          ) : (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive animate-pulse" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </SheetTitle>
          <SheetDescription>
            Configure your AI provider for product listing generation.
          </SheetDescription>
          <p className="text-sm font-arabic" dir="rtl">
            إعدادات مزود الذكاء الاصطناعي
          </p>
        </SheetHeader>
        <div className="mt-8 space-y-6">
          <div className="space-y-3">
            <Label htmlFor="ai-provider" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              AI Provider
            </Label>
            <p className="text-xs text-muted-foreground font-arabic" dir="rtl">
              مزود الذكاء الاصطناعي
            </p>
            <Select
              value={localSettings.provider}
              onValueChange={(val) => setLocalSettings({ ...localSettings, provider: val as AIProvider })}
            >
              <SelectTrigger id="ai-provider" data-testid="select-provider">
                <SelectValue placeholder="Select AI provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">
                  Gemini (Google AI)
                </SelectItem>
                <SelectItem value="openrouter">
                  OpenRouter (Multiple Models)
                </SelectItem>
                <SelectItem value="openai">
                  OpenAI (GPT-4o)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="api-key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              {providerInfo.label}
            </Label>
            <Input
              id="api-key"
              type="password"
              placeholder={providerInfo.placeholder}
              value={getCurrentApiKey()}
              onChange={(e) => setCurrentApiKey(e.target.value)}
              data-testid="input-api-key"
            />
            <p className="text-xs text-muted-foreground">
              {providerInfo.helpText}
            </p>
            <p className="text-xs text-muted-foreground font-arabic" dir="rtl">
              {providerInfo.helpTextAr}
            </p>
          </div>

          {hasBuiltInSupport && !hasApiKey && (
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-600 dark:text-blue-400">
                Using built-in credits. Charges will be billed to your Replit account.
              </AlertDescription>
              <p className="text-xs font-arabic mt-1 text-blue-600" dir="rtl">
                يتم استخدام الرصيد المدمج. ستُحسب الرسوم على حساب Replit الخاص بك.
              </p>
            </Alert>
          )}

          {hasApiKey && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600 dark:text-green-400">
                Using your API key
              </span>
            </div>
          )}

          {!isConfigured && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">
                API key required for OpenAI
              </span>
            </div>
          )}

          <Button
            onClick={handleSave}
            className="w-full"
            data-testid="button-save-settings"
          >
            Save Settings
            <span className="font-arabic mr-2">حفظ</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
