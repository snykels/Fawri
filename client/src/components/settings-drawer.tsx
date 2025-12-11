import { useState, useEffect } from "react";
import { Settings, Key, CheckCircle, AlertCircle } from "lucide-react";
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

interface SettingsDrawerProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export function SettingsDrawer({ apiKey, onApiKeyChange }: SettingsDrawerProps) {
  const [localKey, setLocalKey] = useState(apiKey);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocalKey(apiKey);
  }, [apiKey]);

  const handleSave = () => {
    onApiKeyChange(localKey);
    setIsOpen(false);
  };

  const hasApiKey = apiKey.length > 0;

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
          {hasApiKey ? (
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
            Configure your OpenAI API key to enable AI-powered product listing
            generation.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-8 space-y-6">
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
                    API key required for generation
                  </span>
                </>
              )}
            </div>
          </div>
          <Button
            onClick={handleSave}
            className="w-full"
            data-testid="button-save-settings"
          >
            Save Settings
          </Button>
          <p className="text-xs text-muted-foreground">
            Your API key is stored locally in your browser and never sent to our
            servers. Get your key from{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              platform.openai.com
            </a>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
