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

interface ProductPreviewProps {
  data: ProductData;
}

export function ProductPreview({ data }: ProductPreviewProps) {
  const [isJsonOpen, setIsJsonOpen] = useState(false);

  return (
    <Card className="overflow-visible">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Generated Product Data</h3>
          <span className="text-xl font-semibold font-arabic mr-auto" dir="rtl">بيانات المنتج</span>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                Product Name
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
                SKU / Barcode
              </div>
              <p
                className="text-lg font-mono font-medium"
                data-testid="text-sku"
              >
                {data.sku_barcode}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Brand</p>
              <Badge variant="secondary" className="text-sm">
                {data.brand}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Category</p>
              <Badge variant="outline" className="text-sm">
                {data.category}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">SEO Title</p>
            <p className="text-sm" dir="auto">
              {data.seo_title}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Marketing Description
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
              View Raw JSON
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <pre className="p-4 rounded-lg bg-muted text-xs overflow-x-auto">
                <code>{JSON.stringify(data, null, 2)}</code>
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </Card>
  );
}
