import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

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
        toast({ title: "Logged in successfully" });
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
      <div className="flex bg-background min-h-screen items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-center">Admin Login</h2>
          <div className="space-y-2">
            <Input 
              type="text" 
              placeholder="Username" 
              value={username} onChange={e => setUsername(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Input 
              type="password" 
              placeholder="Password" 
              value={password} onChange={e => setPassword(e.target.value)} 
            />
          </div>
          <Button type="submit" className="w-full">Login</Button>
        </form>
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
      toast({ title: "Salla Token saved successfully! Auto-upload is ready." });
      setToken("");
    },
    onError: (err: Error) => {
      toast({ title: "Error saving token", description: err.message, variant: "destructive" });
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
      toast({ title: "Status updated" });
    },
    onError: (err) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  });

  const products = data?.data || [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Fawri Admin Dashboard</h1>
        <div className="flex gap-2 items-center">
          <div className="flex bg-card items-center gap-2 border rounded-md px-2 py-1 shadow-sm">
            <Input
              type="password"
              placeholder="Paste Salla Access Token (رمز الوصول)"
              className="h-8 w-64 border-0 focus-visible:ring-0 text-sm"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!token || tokenMutation.isPending}
              onClick={() => tokenMutation.mutate(token)}
            >
              {tokenMutation.isPending ? "Saving..." : "Save Token"}
            </Button>
          </div>
          <Button variant="outline" onClick={onLogout}>Logout</Button>
        </div>
      </div>
      
      <div className="rounded-md border bg-card">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Upload Time</th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">Synced?</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Sync Time</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Product Details</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Front Image</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Back Image</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="p-4 text-center">Loading...</td>
                </tr>
              )}
              {products.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="p-4 text-center">No products uploaded yet.</td>
                </tr>
              )}
              {products.map((p: any) => (
                <tr key={p.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <td className="p-4 align-middle">
                    {p.uploadedAt ? format(new Date(p.uploadedAt), "yyyy-MM-dd HH:mm:ss") : "-"}
                  </td>
                  <td className="p-4 align-middle text-center">
                    <Checkbox 
                      checked={p.isSynced} 
                      onCheckedChange={(checked) => syncMutation.mutate({ id: p.id, isSynced: !!checked })} 
                    />
                  </td>
                  <td className="p-4 align-middle">
                    {p.syncedAt ? format(new Date(p.syncedAt), "yyyy-MM-dd HH:mm:ss") : "-"}
                  </td>
                  <td className="p-4 align-middle font-medium">
                    {p.productName}
                    <div className="text-xs text-muted-foreground">
                      SKU: {p.sku || "N/A"} | Barcode: {p.barcode || "N/A"}
                    </div>
                  </td>
                  <td className="p-4 align-middle">
                    {p.frontImageUrl ? (
                      <a href={p.frontImageUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                        View Front
                      </a>
                    ) : "-"}
                  </td>
                  <td className="p-4 align-middle">
                    {p.backImageUrl ? (
                      <a href={p.backImageUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                        View Back
                      </a>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
