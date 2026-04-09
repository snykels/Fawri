import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-provider";
import { 
  User, 
  Store, 
  Package, 
  LogOut, 
  Upload, 
  TrendingUp,
  ShoppingCart,
  Globe,
  RefreshCw
} from "lucide-react";

interface UserData {
  id: number;
  email: string;
  name: string;
  sallaMerchantId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: number;
  productName: string;
  sku: string;
  barcode: string;
  isSynced: boolean;
  uploadedAt: string;
  sallaProductId?: string;
}

interface StoreStats {
  totalProducts: number;
  syncedProducts: number;
  pendingProducts: number;
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { isEnglish, toggleLanguage } = useLanguage();
  const { theme } = useTheme();
  const [user, setUser] = useState<UserData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<StoreStats>({ totalProducts: 0, syncedProducts: 0, pendingProducts: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      // التحقق من حالة المصادقة
      const authResponse = await fetch('/api/user/check-auth');
      const authData = await authResponse.json();

      if (!authData.isAuthenticated) {
        setLocation('/login');
        return;
      }

      setUser(authData.data);

      // جلب منتجات المستخدم
      const productsResponse = await fetch('/api/user/products');
      const productsData = await productsResponse.json();

      if (productsData.success) {
        setProducts(productsData.data);
        
        // حساب الإحصائيات
        const total = productsData.data.length;
        const synced = productsData.data.filter((p: Product) => p.isSynced).length;
        const pending = total - synced;
        
        setStats({
          totalProducts: total,
          syncedProducts: synced,
          pendingProducts: pending
        });
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLocation('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/user/logout', { method: 'POST' });
      setLocation('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const refreshData = () => {
    setIsLoading(true);
    checkAuthAndLoadData();
  };

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-4 bg-background overflow-hidden font-sans">
        <div className="ambient-glow" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <RefreshCw className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground text-lg">
            {isEnglish ? "Loading your dashboard..." : "جاري تحميل لوحة التحكم..."}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden font-sans">
      <div className="ambient-glow" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={theme === "dark" ? "/logo-dark.png" : "/logo_light.png"} 
              alt="Fawri Logo" 
              className="h-8 w-auto"
            />
            <h1 className="text-xl font-bold text-foreground">
              {isEnglish ? "Dashboard" : "لوحة التحكم"}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-2">
              <Globe className="w-4 h-4" />
              {isEnglish ? "العربية" : "English"}
            </Button>
            
            <Button variant="ghost" size="sm" onClick={refreshData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {isEnglish ? "Refresh" : "تحديث"}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut 
                ? (isEnglish ? "Logging out..." : "جاري تسجيل الخروج...") 
                : (isEnglish ? "Logout" : "تسجيل الخروج")
              }
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {isEnglish ? `Welcome, ${user?.name || 'User'}` : `مرحباً، ${user?.name || 'المستخدم'}`}
            </h2>
            <p className="text-muted-foreground">
              {isEnglish 
                ? `Connected to Salla Store: ${user?.sallaMerchantId || 'Your Store'}` 
                : `متصل بمتجر سلة: ${user?.sallaMerchantId || 'متجرك'}`
              }
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {isEnglish ? "Total Products" : "إجمالي المنتجات"}
                </CardTitle>
                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.totalProducts}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  {isEnglish ? "Synced to Salla" : "متزامن مع سلة"}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {stats.syncedProducts}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  {isEnglish ? "Pending Sync" : "في انتظار المزامنة"}
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {stats.pendingProducts}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/publish')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Upload className="w-6 h-6 text-primary" />
                  {isEnglish ? "Upload New Product" : "رفع منتج جديد"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {isEnglish 
                    ? "Upload product images and automatically generate SEO-optimized listing" 
                    : "ارفع صور المنتج وأنشئ وصفاً محسناً لمحركات البحث تلقائياً"
                  }
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/admin')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Store className="w-6 h-6 text-primary" />
                  {isEnglish ? "Manage Products" : "إدارة المنتجات"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {isEnglish 
                    ? "View and manage all your products and their sync status" 
                    : "عرض وإدارة جميع منتجاتك وحالة مزامنتها"
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Products */}
          {products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Package className="w-5 h-5" />
                  {isEnglish ? "Recent Products" : "أحدث المنتجات"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <h4 className="font-medium text-foreground">{product.productName}</h4>
                        <p className="text-sm text-muted-foreground">
                          SKU: {product.sku} | {isEnglish ? "Barcode" : "الباركود"}: {product.barcode}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        product.isSynced 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                      }`}>
                        {product.isSynced 
                          ? (isEnglish ? "Synced" : "متزامن") 
                          : (isEnglish ? "Pending" : "قيد الانتظار")
                        }
                      </div>
                    </div>
                  ))}
                </div>
                
                {products.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" onClick={() => setLocation('/admin')}>
                      {isEnglish ? `View All ${products.length} Products` : `عرض جميع المنتجات (${products.length})`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {products.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {isEnglish ? "No Products Yet" : "لا توجد منتجات بعد"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {isEnglish 
                    ? "Start by uploading your first product" 
                    : "ابدأ برفع أول منتج لك"
                  }
                </p>
                <Button onClick={() => setLocation('/publish')}>
                  <Upload className="w-4 h-4 mr-2" />
                  {isEnglish ? "Upload First Product" : "رفع أول منتج"}
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
}