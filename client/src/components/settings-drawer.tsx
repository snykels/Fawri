import { useState, useEffect } from "react";
import { Settings, Key, CheckCircle, AlertCircle, Cpu } from "lucide-react";
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

export type AIProvider = "openai" | "gemini" | "openrouter";

interface SettingsDrawerProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  provider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
}

export function SettingsDrawer({
  apiKey,
  onApiKeyChange,
  provider,
  onProviderChange,
}: SettingsDrawerProps) {
  const [localKey, setLocalKey] = useState(apiKey);
  const [localProvider, setLocalProvider] = useState<AIProvider>(provider);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocalKey(apiKey);
    setLocalProvider(provider);
  }, [apiKey, provider]);

  const handleSave = () => {
    onApiKeyChange(localKey);
    onProviderChange(localProvider);
    setIsOpen(false);
  };

  const needsApiKey = localProvider === "openai";
  const hasApiKey = apiKey.length > 0;
  const isConfigured = !needsApiKey || hasApiKey;

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
      <SheetContent className="w-80">
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
              <span className="font-arabic" dir="rtl">مزود الذكاء الاصطناعي</span>
            </Label>
            <Select
              value={localProvider}
              onValueChange={(val) => setLocalProvider(val as AIProvider)}
            >
              <SelectTrigger id="ai-provider" data-testid="select-provider">
                <SelectValue placeholder="Select AI provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">
                  Gemini (Built-in - No API Key)
                </SelectItem>
                <SelectItem value="openrouter">
                  OpenRouter (Built-in - No API Key)
                </SelectItem>
                <SelectItem value="openai">
                  OpenAI (Requires API Key)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {localProvider === "gemini" && (
                <>Gemini uses Replit AI Integrations - charges billed to your credits.</>
              )}
              {localProvider === "openrouter" && (
                <>OpenRouter uses Replit AI Integrations - charges billed to your credits.</>
              )}
              {localProvider === "openai" && (
                <>OpenAI requires your own API key from platform.openai.com</>
              )}
            </p>
          </div>

          {needsApiKey && (
            <div className="space-y-3">
              <Label htmlFor="api-key" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                OpenAI API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
                data-testid="input-api-key"
              />
              <div className="flex items-center gap-2 text-xs">
                {hasApiKey ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">
                      API key configured
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-destructive" />
                    <span className="text-destructive">
                      API key required for OpenAI
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {!needsApiKey && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600 dark:text-green-400">
                Ready to use - no API key needed
              </span>
            </div>
          )}

          <Button
            onClick={handleSave}
            className="w-full"
            data-testid="button-save-settings"
          >
            Save Settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
