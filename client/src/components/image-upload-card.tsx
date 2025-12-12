import { useCallback, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ImageUploadCardProps {
  label: string;
  labelAr: string;
  sublabel: string;
  sublabelAr: string;
  image: File | null;
  onImageChange: (file: File | null) => void;
  testId: string;
}

export function ImageUploadCard({
  label,
  labelAr,
  sublabel,
  sublabelAr,
  image,
  onImageChange,
  testId,
}: ImageUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!image) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    }
  }, [image]);

  const handleFile = useCallback(
    (file: File | null) => {
      if (file && file.type.startsWith("image/")) {
        onImageChange(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    },
    [onImageChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    onImageChange(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  }, [onImageChange, previewUrl]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card className="relative overflow-visible">
      <div className="p-6">
        <div className="mb-4 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-lg font-semibold">{label}</h3>
            <h3 className="text-lg font-semibold font-arabic" dir="rtl">{labelAr}</h3>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">{sublabel}</p>
            <p className="text-sm text-muted-foreground font-arabic" dir="rtl">{sublabelAr}</p>
          </div>
        </div>

        {!image ? (
          <label
            htmlFor={testId}
            className={`flex flex-col items-center justify-center min-h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">
                Drag and drop your image here
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                or click to browse files
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WEBP up to 10MB
              </p>
            </div>
            <input
              id={testId}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              data-testid={testId}
            />
          </label>
        ) : (
          <div className="relative min-h-64 rounded-lg overflow-hidden bg-muted">
            <img
              src={previewUrl || ""}
              alt="Preview"
              className="w-full h-64 object-contain"
              data-testid={`${testId}-preview`}
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={handleRemove}
              data-testid={`${testId}-remove`}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm p-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{image.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(image.size)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
