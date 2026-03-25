import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Package, Tag, FileText, Barcode } from "lucide-react";
import { useState } from "react";
import type { ProductData } from "@shared/schema";
import { useLanguage } from "@/lib/language-provider";

interface ProductPreviewProps {
  data: ProductData;
}

export function ProductPreview({ data }: ProductPreviewProps) {
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const { isEnglish } = useLanguage();

  return (
    <Card className="overflow-visible">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-5 w-5 text-primary" />
          <h3 className={`text-xl font-semibold ${isEnglish ? "" : "font-arabic"}`}>
            {isEnglish ? "Generated Product Data" : "بيانات المنتج"}
          </h3>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                {isEnglish ? "Product Name" : "اسم المنتج"}
              </div>
              <p
                className="text-lg font-medium"
                dir="auto"
                data-testid="text-product-name"
              >
                {data.product_name}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Barcode className="h-4 w-4" />
                {isEnglish ? "SKU / Barcode" : "رمز المنتج / الباركود"}
              </div>
              <p
                className="text-lg font-mono font-medium"
                data-testid="text-sku"
              >
                {data.sku || data.barcode}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{isEnglish ? "Brand" : "العلامة التجارية"}</p>
              <Badge variant="secondary" className="text-sm">
                {data.brand}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{isEnglish ? "Category" : "الفئة"}</p>
              <Badge variant="outline" className="text-sm">
                {data.category}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{isEnglish ? "SEO Title" : "عنوان السيو (SEO)"}</p>
            <p className="text-sm" dir="auto">
              {data.seo_title}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {isEnglish ? "Marketing Description" : "الوصف التسويقي"}
            </div>
            <p className="text-sm leading-relaxed" dir="auto">
              {data.marketing_description}
            </p>
          </div>

          <Collapsible open={isJsonOpen} onOpenChange={setIsJsonOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isJsonOpen ? "rotate-180" : ""
                }`}
              />
              {isEnglish ? "View Raw JSON" : "عرض البيانات الخام (JSON)"}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <pre className="p-4 rounded-lg bg-muted text-xs overflow-x-auto" dir="ltr">
                <code>{JSON.stringify(data, null, 2)}</code>
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </Card>
  );
}
