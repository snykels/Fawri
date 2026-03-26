import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  LogOut, 
  Settings, 
  Package, 
  RefreshCw, 
  Search,
  Eye,
  ShieldCheck,
  AlertCircle,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/lib/language-provider";
import { useTheme } from "@/lib/theme-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useLocation } from "wouter";

export default function AdminPage() {
  const [, setLocation] = useLocation();
  
  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setLocation("/admin/login");
  };
  const [token, setToken] = useState("");
  const { toast } = useToast();
  const { isEnglish, toggleLanguage } = useLanguage();
  const { theme } = useTheme();

  const tokenMutation = useMutation({
    mutationFn: async (t: string) => {
      const res = await fetch("/api/salla/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save token");
      return data;
    },
    onSuccess: () => {
      toast({ 
        title: isEnglish ? "Integration Success" : "تم الربط بنجاح", 
        description: isEnglish ? "Salla Token saved successfully! Auto-upload is ready." : "تم حفظ رمز الوصول الخاص بسلة! الرفع التلقائي جاهز." 
      });
      setToken("");
    },
    onError: (err: Error) => {
      toast({ 
        title: isEnglish ? "Integration Failed" : "فشل الربط التقني", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products");
      if (res.status === 401) {
        setLocation("/admin/login");
        return { data: [] };
      }
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    }
  });

  const syncMutation = useMutation({
    mutationFn: async ({ id, isSynced }: { id: number; isSynced: boolean }) => {
      const res = await fetch(`/api/admin/products/${id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSynced })
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ 
        title: isEnglish ? "Status updated" : "تم تحديث الحالة", 
        description: isEnglish ? "Product sync status has been saved locally." : "تم حفظ حالة المزامنة للمنتج بنجاح." 
      });
    },
    onError: (err) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  });

  const products = data?.data || [];
  const syncedCount = products.filter((p: any) => p.isSynced).length;
  const pendingCount = products.length - syncedCount;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans">
      <div className="ambient-glow" />
      
      {/* Sidebar Layout */}
      <div className="flex h-screen overflow-hidden relative z-10">
        {/* Sidebar */}
        <aside className="w-72 bg-white/60 dark:bg-card/30 backdrop-blur-xl border-r border-border flex flex-col p-6 hidden lg:flex">
          <div className="flex items-center gap-3 mb-12 px-2">
             <img 
                src={theme === "dark" ? "/logo-dark.png" : "/logo_light.png"} 
                alt="Fawri Logo" 
                className="h-10 w-auto object-contain cursor-pointer"
                onClick={() => window.location.href = '/'}
              />
          </div>
          
          <nav className="flex-1 space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3 bg-white/80 dark:bg-background/50 text-foreground hover:bg-accent hover:text-accent-foreground font-bold h-12 transition-all border border-border shadow-sm rounded-xl">
              <Package className="w-5 h-5" />
              {isEnglish ? "Products List" : "قائمة المنتجات"}
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-primary/5 hover:text-primary h-12 transition-all font-bold rounded-xl opacity-60">
              <Settings className="w-5 h-5" />
              {isEnglish ? "Integrations" : "الربط التقني"}
            </Button>
          </nav>

          <div className="space-y-2 mt-auto">
             <Button variant="outline" size="sm" onClick={toggleLanguage} className="w-full justify-start gap-3 bg-white/50 dark:bg-card/20 hover:bg-white dark:hover:bg-card font-bold h-12 rounded-xl border border-border shadow-sm mb-2 transition-all">
                <Globe className="w-5 h-5 text-primary" />
                {isEnglish ? "العربية" : "English Mode"}
             </Button>
             <Button variant="outline" onClick={handleLogout} className="w-full justify-start gap-3 border-border bg-white/50 dark:bg-background/20 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all h-12 rounded-xl group font-bold">
                <LogOut className={`w-5 h-5 group-hover:${isEnglish ? 'translate-x-1' : '-translate-x-1'} transition-transform`} />
                {isEnglish ? "Secure Logout" : "تسجيل الخروج الآمن"}
             </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-8 lg:p-12">
          <div className="max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <motion.div 
                initial={{ opacity: 0, x: isEnglish ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h1 className="text-4xl font-black tracking-tight text-foreground uppercase italic">
                   {isEnglish ? "Dashboard" : "لوحة التحكم"}
                </h1>
                <p className="text-muted-foreground mt-1 font-bold italic opacity-70">
                   {isEnglish ? "Real-time Product Lifecycle Monitor" : "مراقبة دورة حياة المنتج في الوقت الفعلي"}
                </p>
              </motion.div>
              
              <div className="flex bg-white/70 dark:bg-card/40 border border-border backdrop-blur-md p-1.5 rounded-2xl shadow-sm">
                <Input
                  type="password"
                  placeholder={isEnglish ? "Salla Access Token" : "رمز الوصول لمتجر سلة"}
                  className="bg-transparent border-0 focus-visible:ring-0 w-64 text-sm font-bold placeholder:opacity-50"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <Button
                  size="sm"
                  className="shadow-lg shadow-primary/20 bolt-button font-bold rounded-xl"
                  disabled={!token || tokenMutation.isPending}
                  onClick={() => tokenMutation.mutate(token)}
                >
                  <RefreshCw className={`w-4 h-4 ${isEnglish ? 'mr-2' : 'ml-2'} ${tokenMutation.isPending ? 'animate-spin' : ''}`} />
                  {tokenMutation.isPending ? (isEnglish ? "Linking..." : "جاري الربط...") : (isEnglish ? "Connect Salla" : "ربط سلة")}
                </Button>
              </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard title={isEnglish ? "Total Uploads" : "إجمالي الرفوعات"} value={products.length} icon={Package} color="text-primary" delay={0.1} />
              <StatsCard title={isEnglish ? "Successfully Synced" : "مزامنة ناجحة"} value={syncedCount} icon={CheckCircle2} color="text-green-500" delay={0.2} />
              <StatsCard title={isEnglish ? "Pending Actions" : "بانتظار الإجراء"} value={pendingCount} icon={Clock} color="text-amber-500" delay={0.3} />
            </div>

            {/* Table Section */}
            <Card className="bg-white/70 dark:bg-card/40 border border-border shadow-xl hover:shadow-2xl transition-all overflow-hidden backdrop-blur-md rounded-[2rem]">
              <CardHeader className="border-b border-border/50 bg-background/30 px-8 py-6">
                <CardTitle className="text-xl flex items-center gap-2 font-black uppercase text-foreground">
                  <Package className="w-5 h-5 text-muted-foreground" />
                  {isEnglish ? "Sync History Log" : "سجل عمليات المزامنة"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px] w-full">
                  <Table>
                    <TableHeader className="bg-background/60 sticky top-0 z-10 backdrop-blur-xl border-b border-primary/10">
                      <TableRow className="hover:bg-transparent border-primary/5">
                        <TableHead className={`${isEnglish ? 'pl-8' : 'pr-8'} w-[200px]`}>{isEnglish ? "Timestamp" : "الوقت والتاريخ"}</TableHead>
                        <TableHead className="text-center w-[120px]">{isEnglish ? "Status" : "الحالة"}</TableHead>
                        <TableHead>{isEnglish ? "Product Specs" : "مواصفات المنتج"}</TableHead>
                        <TableHead className="text-center w-[150px]">{isEnglish ? "Catalog Img" : "صور المنتج"}</TableHead>
                        <TableHead className={`text-right ${isEnglish ? 'pr-8' : 'pl-8'}`}>{isEnglish ? "View" : "عرض"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <RefreshCw className="w-10 h-10 animate-spin text-primary opacity-40" />
                              <p className="text-muted-foreground font-black tracking-widest uppercase text-xs">Accessing Data Cluster...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : products.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center gap-4 opacity-30">
                              <Package className="w-16 h-16" />
                              <div className="space-y-1">
                                <p className="font-black text-2xl uppercase italic">{isEnglish ? "Empty Archive" : "الأرشيف فارغ"}</p>
                                <p className="text-sm font-bold">{isEnglish ? "Begin by processing your first item." : "ابدأ بتحليل أول منتج لتراه هنا."}</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        products.map((p: any, idx: number) => (
                           <TableRow
                              key={p.id}
                              className="group border-primary/5 hover:bg-primary/5 transition-all"
                            >
                              <TableCell className={`${isEnglish ? 'pl-8' : 'pr-8'} py-4`}>
                                <div className="flex flex-col">
                                  <span className="font-black text-foreground/90 uppercase text-[10px]">
                                     {p.uploadedAt ? format(new Date(p.uploadedAt), "MMM dd, yyyy", { locale: isEnglish ? undefined : arSA }) : "-"}
                                  </span>
                                  <span className="text-[9px] uppercase font-black text-primary/70 tracking-tighter">
                                     {p.uploadedAt ? format(new Date(p.uploadedAt), "HH:mm:ss") : ""}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center py-4">
                                <div className="flex flex-col items-center gap-2">
                                  <Checkbox 
                                    checked={p.isSynced} 
                                    className="w-5 h-5 border-primary/20 rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all hover:scale-110 shadow-lg"
                                    onCheckedChange={(checked) => syncMutation.mutate({ id: p.id, isSynced: !!checked })} 
                                  />
                                  {p.isSynced ? (
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[8px] font-black tracking-widest px-1.5 py-0 uppercase">
                                       {isEnglish ? "Synced" : "تمت"}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[8px] font-black tracking-widest px-1.5 py-0 uppercase">
                                       {isEnglish ? "Pending" : "قيد"}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="max-w-[300px] truncate font-black text-base text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">
                                   {p.productName}
                                </div>
                                <div className="flex gap-2 items-center mt-1">
                                  <code className="text-[8px] bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10 font-bold text-primary">SKU: {p.sku || "N/A"}</code>
                                  <code className="text-[8px] bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10 font-bold text-primary">BARCODE: {p.barcode || "N/A"}</code>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <Thumbnail url={p.frontImageUrl} label="Front" />
                                  <Thumbnail url={p.backImageUrl} label="Back" />
                                </div>
                              </TableCell>
                              <TableCell className={`text-right ${isEnglish ? 'pr-8' : 'pl-8'} py-4`}>
                                <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary transition-all h-8 w-8 p-0 rounded-xl" title="Inspect">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color, delay }: { title: string; value: number; icon: any; color: string; delay: number }) {
  const { isEnglish } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
    >
      <Card className="bg-white/70 dark:bg-card/40 border border-border hover:border-primary/40 transition-all hover:translate-y-[-6px] shadow-lg hover:shadow-xl group overflow-hidden rounded-[2rem]">
        <div className={`absolute top-0 ${isEnglish ? 'left-0' : 'right-0'} w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-all`} />
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase">{title}</p>
              <p className="text-4xl font-black tabular-nums">{value}</p>
            </div>
            <div className={`p-5 rounded-3xl bg-background/40 border border-primary/5 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all ${color}`}>
              <Icon className="w-10 h-10" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Thumbnail({ url, label }: { url?: string; label: string }) {
  if (!url) return <div className="w-12 h-16 bg-muted/40 rounded-lg border border-dashed border-border flex items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase">NULL</div>;
  
  return (
    <motion.div 
      whileHover={{ scale: 1.15, zIndex: 50 }}
      className="relative w-12 h-16 rounded-lg border border-border overflow-hidden bg-background shadow-md cursor-pointer group"
    >
      <img src={url} alt={label} className="w-full h-full object-cover transition-transform group-hover:scale-125 duration-700" />
      <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <ExternalLink className="w-5 h-5 text-white" />
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0" />
    </motion.div>
  );
}
