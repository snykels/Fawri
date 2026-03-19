import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
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
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setIsLoggedIn(true);
        toast({ title: "Logged in successfully", description: "Welcome back, Admin." });
      } else {
        toast({ title: "Login failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Login request failed", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-4 bg-background overflow-hidden font-sans">
        <div className="ambient-glow" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md z-10"
        >
          <Card className="glass border-primary/20 shadow-2xl overflow-hidden backdrop-blur-2xl bg-card/30">
            <CardHeader className="space-y-1 pb-6 text-center border-b border-primary/10">
              <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-primary/20 shadow-lg shadow-primary/10">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-black tracking-tight">Fawri Admin</CardTitle>
              <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold opacity-70">Control Center Access</p>
            </CardHeader>
            <CardContent className="pt-8 space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative group">
                    <Input 
                      type="text" 
                      placeholder="Username" 
                      className="bg-background/40 border-primary/10 focus-visible:ring-primary pl-10 h-12 transition-all hover:bg-background/60"
                      value={username} onChange={e => setUsername(e.target.value)} 
                    />
                    <Search className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative group">
                    <Input 
                      type="password" 
                      placeholder="Password" 
                      className="bg-background/40 border-primary/10 focus-visible:ring-primary pl-10 h-12 transition-all hover:bg-background/60"
                      value={password} onChange={e => setPassword(e.target.value)} 
                    />
                    <ShieldCheck className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                </div>
                <Button type="submit" size="lg" className="w-full bolt-button font-bold text-lg h-12 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Access Dashboard
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [token, setToken] = useState("");
  const { toast } = useToast();

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
      toast({ title: "Integration Success", description: "Salla Token saved successfully! Auto-upload is ready." });
      setToken("");
    },
    onError: (err: Error) => {
      toast({ title: "Integration Failed", description: err.message, variant: "destructive" });
    }
  });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products");
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
      toast({ title: "Status updated", description: "Product sync status has been saved locally." });
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
        <aside className="w-72 bg-card/20 backdrop-blur-2xl border-r border-primary/10 flex flex-col p-6 hidden lg:flex">
          <div className="flex items-center gap-3 mb-12 px-2">
            <div className="bg-primary p-2 rounded-xl shadow-xl shadow-primary/30">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <span className="font-black text-2xl tracking-tighter italic">FAWRI</span>
          </div>
          
          <nav className="flex-1 space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3 bg-primary/10 text-primary hover:bg-primary/20 font-bold h-12 transition-all border border-primary/5">
              <Package className="w-5 h-5" />
              Products
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:bg-primary/5 hover:text-primary h-12 transition-all font-medium">
              <Settings className="w-5 h-5" />
              Integrations
            </Button>
          </nav>

          <Button variant="outline" onClick={onLogout} className="mt-auto border-primary/10 bg-background/20 backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all gap-2 group font-bold">
            <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            Sign Out
          </Button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-8 lg:p-12">
          <div className="max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h1 className="text-4xl font-black tracking-tight text-foreground">Dashboard</h1>
                <p className="text-muted-foreground mt-1 font-medium italic opacity-70">Manage and monitor your Salla product syncs.</p>
              </motion.div>
              
              <div className="flex bg-card/30 border border-primary/10 backdrop-blur-xl p-1.5 rounded-2xl shadow-2xl">
                <Input
                  type="password"
                  placeholder="Salla Access Token"
                  className="bg-transparent border-0 focus-visible:ring-0 w-64 text-sm font-medium"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <Button
                  size="sm"
                  className="shadow-lg shadow-primary/20 bolt-button font-bold rounded-xl"
                  disabled={!token || tokenMutation.isPending}
                  onClick={() => tokenMutation.mutate(token)}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${tokenMutation.isPending ? 'animate-spin' : ''}`} />
                  {tokenMutation.isPending ? "Connecting..." : "Connect Salla"}
                </Button>
              </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard title="Total Uploaded" value={products.length} icon={Package} color="text-primary" delay={0.1} />
              <StatsCard title="Successfully Synced" value={syncedCount} icon={CheckCircle2} color="text-green-500" delay={0.2} />
              <StatsCard title="Awaiting Sync" value={pendingCount} icon={Clock} color="text-amber-500" delay={0.3} />
            </div>

            {/* Table Section */}
            <Card className="glass border-primary/10 shadow-2xl overflow-hidden backdrop-blur-2xl bg-card/20">
              <CardHeader className="border-b border-primary/5 bg-primary/5 px-8 py-6">
                <CardTitle className="text-xl flex items-center gap-2 font-bold uppercase tracking-wider opacity-90">
                  <Package className="w-5 h-5 text-primary" />
                  Recent Sync Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px] w-full">
                  <Table>
                    <TableHeader className="bg-background/60 sticky top-0 z-10 backdrop-blur-xl border-b border-primary/10">
                      <TableRow className="hover:bg-transparent border-primary/5">
                        <TableHead className="w-[200px] pl-8">Upload Time</TableHead>
                        <TableHead className="text-center w-[120px]">Status</TableHead>
                        <TableHead>Product Identity</TableHead>
                        <TableHead className="text-center w-[150px]">Visual Samples</TableHead>
                        <TableHead className="text-right pr-8">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <RefreshCw className="w-10 h-10 animate-spin text-primary opacity-40" />
                              <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">Decrypting Database...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : products.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center gap-4 opacity-30">
                              <Package className="w-16 h-16" />
                              <div className="space-y-1">
                                <p className="font-black text-2xl uppercase italic">No products found</p>
                                <p className="text-sm font-medium">Your upload activity will manifest here.</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <AnimatePresence>
                          {products.map((p: any, idx: number) => (
                            <motion.tr
                              key={p.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 + 0.5 }}
                              className="group border-primary/5 hover:bg-primary/5 transition-all"
                            >
                              <TableCell className="pl-8 py-6">
                                <div className="flex flex-col">
                                  <span className="font-bold text-foreground/90">{p.uploadedAt ? format(new Date(p.uploadedAt), "MMM dd, yyyy") : "-"}</span>
                                  <span className="text-[10px] uppercase font-black text-primary/70 tracking-tighter">{p.uploadedAt ? format(new Date(p.uploadedAt), "HH:mm:ss OOOO") : ""}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center py-6">
                                <div className="flex flex-col items-center gap-2">
                                  <Checkbox 
                                    checked={p.isSynced} 
                                    className="w-6 h-6 border-primary/20 rounded-lg data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all hover:scale-110 shadow-lg"
                                    onCheckedChange={(checked) => syncMutation.mutate({ id: p.id, isSynced: !!checked })} 
                                  />
                                  {p.isSynced ? (
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black tracking-widest px-2">SYNCED</Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-black tracking-widest px-2">PENDING</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-6">
                                <div className="max-w-[340px] truncate font-black text-lg text-foreground group-hover:text-primary transition-colors">{p.productName}</div>
                                <div className="flex gap-3 items-center mt-2">
                                  <code className="text-[10px] bg-primary/5 px-2 py-1 rounded-md border border-primary/10 font-bold text-primary">SKU: {p.sku || "N/A"}</code>
                                  <code className="text-[10px] bg-primary/5 px-2 py-1 rounded-md border border-primary/10 font-bold text-primary">BARCODE: {p.barcode || "N/A"}</code>
                                </div>
                              </TableCell>
                              <TableCell className="py-6">
                                <div className="flex items-center justify-center gap-3">
                                  <Thumbnail url={p.frontImageUrl} label="Front" />
                                  <Thumbnail url={p.backImageUrl} label="Back" />
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-8 py-6">
                                <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary transition-all h-10 w-10 p-0 rounded-xl border border-transparent hover:border-primary/10" title="Inspect Data">
                                  <Eye className="w-5 h-5" />
                                </Button>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
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
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
    >
      <Card className="glass border-primary/10 hover:border-primary/40 transition-all hover:translate-y-[-6px] shadow-2xl group bg-card/10 overflow-hidden">
        <div className={`absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-all`} />
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100 transition-opacity">{title}</p>
              <p className="text-5xl font-black tabular-nums tracking-tighter">{value}</p>
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
  if (!url) return <div className="w-12 h-16 bg-muted/30 rounded-xl border border-dashed border-primary/20 flex items-center justify-center text-[9px] font-black text-muted-foreground/40 uppercase">No Img</div>;
  
  return (
    <motion.div 
      whileHover={{ scale: 1.2, zIndex: 50, rotate: -2 }}
      className="relative w-12 h-16 rounded-xl border-2 border-primary/10 overflow-hidden bg-background shadow-2xl cursor-pointer group"
    >
      <img src={url} alt={label} className="w-full h-full object-cover transition-transform group-hover:scale-125 duration-700" />
      <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Eye className="w-5 h-5 text-white" />
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0" />
    </motion.div>
  );
}
