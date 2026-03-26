import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { GoogleGenAI } from "@google/genai";
import ExcelJS from "exceljs";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { productDataSchema, type ProductData } from "@shared/schema";
import { image_search } from "duckduckgo-images-api";
import { db } from "./db";
import { uploadedProducts, sallaTokens, sallaWebhookEvents, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import crypto from "crypto";
import { getValidAccessToken, saveDeveloperToken } from "./salla-oauth";
import { buildProductPrompt, imageAnalysisPrompt } from "./prompts";

const MemoryStore = createMemoryStore(session);

// استخدام البرومبت المحسّن من prompts.ts
const smartAnalysisPrompt = imageAnalysisPrompt;

interface CloudVisionResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
    }>;
  }>;
}

async function performOCR(imageBuffer: Buffer, apiKey: string): Promise<string> {
  try {
    console.log(`[OCR] Starting OCR for image size: ${imageBuffer.length}`);
    const base64Image = imageBuffer.toString('base64');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout for OCR

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "TEXT_DETECTION" }]
          }
        ]
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error("Cloud Vision API Error:", response.status, await response.text());
      return "";
    }

    const data = await response.json() as CloudVisionResponse;
    const text = data.responses[0]?.textAnnotations?.[0]?.description || "";
    console.log(`[OCR] Success, found text length: ${text.length}`);
    return text;
  } catch (error) {
    console.error("OCR Failed:", error);
    return "";
  }
}

async function manualDuckDuckGoSearch(query: string): Promise<string[]> {
  try {
    console.log(`[Manual Search] Trying DuckDuckGo for: ${query}`);
    let mainPageText = "";

    // Method from test-image-search.ts which is verified to work
    try {
      const mainPageRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iar=images&iax=images&ia=images`);
      mainPageText = await mainPageRes.text();
      const vqdMatch = mainPageText.match(/vqd=['\"]([^'\"]+)['\"]/);
      const vqd = vqdMatch ? vqdMatch[1] : null;

      if (vqd) {
        const searchUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqd}`;
        const res = await fetch(searchUrl);

        if (res.ok) {
          const data = await res.json() as any;
          if (data.results && Array.isArray(data.results)) {
            console.log(`[Manual Search] DDG Success: ${data.results.length} images`);
            return data.results.map((r: any) => r.image).filter(Boolean);
          }
        }
      } else {
        console.log("[Manual Search] Could not find vqd token.");
      }
    } catch (ddgError) {
      console.log("[Manual Search] DDG failed, trying fallbacks...", ddgError);
    }

    // 2. Bing Fallback with better regex
    console.log("[Manual Search] Trying Bing fallback...");
    const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const bingRes = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1`, {
      headers: { "User-Agent": userAgent }
    });
    const bingText = await bingRes.text();
    const bingMatches = bingText.match(/murl&quot;:&quot;(https?:\/\/.*?)&quot;/g);
    if (bingMatches && bingMatches.length > 0) {
      const cleaned = bingMatches.map(m => m.match(/murl&quot;:&quot;(.*?)&quot;/)?.[1]).filter(Boolean) as string[];
      console.log(`[Manual Search] Bing Success: ${cleaned.length} images`);
      return cleaned;
    }

    // 3. Google Fallback (Limited)
    console.log("[Manual Search] Trying Google fallback...");
    const googleRes = await fetch(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" }
    });
    const googleText = await googleRes.text();
    const googleMatches = googleText.match(/\[\"(https?:\/\/.*?)\",\d+,\d+\]/g);
    if (googleMatches && googleMatches.length > 0) {
      const cleaned = googleMatches.map(m => m.match(/\[\"(.*?)\"/)?.[1]).filter(Boolean) as string[];
      console.log(`[Manual Search] Google Success: ${cleaned.length} images`);
      return cleaned;
    }

    // 4. Last resort: generic URL search
    const genericUrls = mainPageText.match(/https?:\/\/[^\"'\\s]+\.(?:jpg|jpeg|png|webp)/gi);

    if (genericUrls && genericUrls.length > 0) {
      return (Array.from(new Set(genericUrls)) as string[]).filter((u: string) => !u.includes("duckduckgo.com"));
    }

    return [];
  } catch (error) {
    console.error("[Manual Search] Error:", error);
    return [];
  }
}

async function findProductImages(query: string, limit: number = 8): Promise<string[]> {

  try {
    console.log(`[Image Search] Searching for: ${query}`);

    // Try multiple query variations if needed based on user feedback
    const queries = [
      query,
      query + " official product photo",
      query + " site:gsmarena.com OR site:noon.com OR site:amazon.ae", // Regional focus
      query + " site:samsung.com OR site:apple.com OR site:mi.com OR site:huawei.com", // Official sites
      query.replace(/official white background product/i, "").trim() + " product white background",
      query + " white background"
    ];

    let allResults: string[] = [];
    for (const q of queries) {
      console.log(`[Image Search] Trying query variation: ${q}`);
      let results: string[] = [];
      try {
        // Try library first
        results = (await image_search({
          query: q,
          moderate: true,
          iterations: 1
        })).map((r: any) => r.image);
      } catch (e) {
        console.log(`[Image Search] Library failed for ${q}, trying manual fallback...`);
      }

      // If library fails or returns nothing, try manual
      if (!results || results.length === 0) {
        results = await manualDuckDuckGoSearch(q);
      }

      if (results && results.length > 0) {
        allResults = [...allResults, ...results];
        if (allResults.length >= 30) break; // More results for better filtering
      }
    }


    if (allResults.length === 0) {
      console.log("[Image Search] No results found across all variations.");
      return [];
    }

    const images: string[] = [];
    const seenUrls = new Set<string>();

    const verifyImage = async (url: string): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased timeout to 5s

        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/*",
            "Range": "bytes=0-1024",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) return false;

        const contentType = response.headers.get("content-type") || "";
        // If it's a 200 OK and from a trusted domain, we can be more lenient even if content-type is wonky
        const urlObj = new URL(url);
        const trusted = ["nooncdn.com", "amazon.com", "ssl-images-amazon.com", "media-amazon.com", "gsmarena.com", "samsung.com", "apple.com"].some(d => urlObj.hostname.includes(d));

        return contentType.startsWith("image/") || (trusted && response.status === 200);
      } catch (e: any) {
        return false;
      }
    };

    for (const url of allResults) {
      if (images.length >= limit) break;

      if (!url || !url.startsWith("https://") || seenUrls.has(url)) continue;
      seenUrls.add(url);

      const lowerUrl = url.toLowerCase();
      // Heuristics to avoid garbage
      if (lowerUrl.includes("logo") || lowerUrl.includes("icon") || lowerUrl.includes("banner") || lowerUrl.includes("placeholder")) continue;

      // Prioritize common product image patterns
      const isLikelyProduct = lowerUrl.includes("product") || lowerUrl.includes("media") || lowerUrl.includes("nooncdn") || lowerUrl.includes("amazon");

      const isImage = /\.(jpg|jpeg|png|webp)$/.test(lowerUrl);
      if (!isImage && !lowerUrl.includes("images")) continue;

      if (await verifyImage(url)) {
        console.log(`[Image Search] Verified: ${url}`);
        images.push(url);
      }
    }

    return images;
  } catch (error) {
    console.error("[Image Search] Error:", error);
    return [];
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Production-ready session setup for admin
  app.use(session({
    cookie: { maxAge: 86400000, secure: false },
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: "salla-admin-secret"
  }));

  // Create uploads dir
  const uploadsDir = path.join(process.cwd(), "attached_assets", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  // Salla Credentials from Environment Variables or hardcoded fallbacks
  const SALLA_CLIENT_ID = process.env.SALLA_CLIENT_ID || "3b98cad1-c0ea-415c-9a98-f9288cc95365";
  const SALLA_SECRET_KEY = process.env.SALLA_SECRET_KEY || "1ad23a9c67438be75908c28ba0ce500f294609933dfebc50d80a95cb0fc14ee0";

  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "admin") {
      (req.session as any).isAdmin = true;
      return res.json({ success: true });
    }
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.session && req.session.isAdmin) {
      return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized" });
  };

  // Middleware للتحقق من هوية المستخدم (العميل)
  const requireUser = async (req: any, res: any, next: any) => {
    try {
      // التحقق من وجود معرف المستخدم في الجلسة
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: "يجب تسجيل الدخول أولاً",
          requireLogin: true
        });
      }

      // جلب بيانات المستخدم من قاعدة البيانات
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (user.length === 0 || !user[0].isActive) {
        // حذف الجلسة إذا كان المستخدم غير موجود أو غير نشط
        req.session.destroy(() => {});
        return res.status(401).json({ 
          success: false, 
          message: "جلسة منتهية، يرجى تسجيل الدخول مرة أخرى",
          requireLogin: true
        });
      }

      // التحقق من صلاحية توكن سلة
      const now = new Date();
      const expiresAt = user[0].sallaTokenExpiresAt;
      
      if (expiresAt && now >= expiresAt) {
        // التوكن منتهي الصلاحية - محاولة التحديث
        console.log(`[Auth] Token expired for user ${user[0].email}, attempting refresh...`);
        
        if (user[0].sallaRefreshToken) {
          try {
            const SALLA_CLIENT_ID = process.env.SALLA_CLIENT_ID || "3b98cad1-c0ea-415c-9a98-f9288cc95365";
            const SALLA_SECRET_KEY = process.env.SALLA_SECRET_KEY || "1ad23a9c67438be75908c28ba0ce500f294609933dfebc50d80a95cb0fc14ee0";
            
            const refreshResponse = await fetch("https://accounts.salla.sa/oauth2/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
              },
              body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: user[0].sallaRefreshToken,
                client_id: SALLA_CLIENT_ID,
                client_secret: SALLA_SECRET_KEY,
              }),
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              
              // تحديث التوكنات في قاعدة البيانات
              await db.update(users)
                .set({
                  sallaAccessToken: refreshData.access_token,
                  sallaRefreshToken: refreshData.refresh_token,
                  sallaTokenExpiresAt: new Date(Date.now() + refreshData.expires_in * 1000),
                  updatedAt: new Date(),
                })
                .where(eq(users.id, userId));
              
              console.log(`[Auth] Token refreshed successfully for user ${user[0].email}`);
            } else {
              // فشل التحديث - حذف الجلسة
              console.error(`[Auth] Failed to refresh token for user ${user[0].email}`);
              req.session.destroy(() => {});
              return res.status(401).json({ 
                success: false, 
                message: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى",
                requireLogin: true
              });
            }
          } catch (refreshError) {
            console.error(`[Auth] Error refreshing token:`, refreshError);
            req.session.destroy(() => {});
            return res.status(401).json({ 
              success: false, 
              message: "حدث خطأ في تحديث الجلسة، يرجى تسجيل الدخول مرة أخرى",
              requireLogin: true
            });
          }
        } else {
          // لا يوجد refresh token
          req.session.destroy(() => {});
          return res.status(401).json({ 
            success: false, 
            message: "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى",
            requireLogin: true
          });
        }
      }

      // إضافة بيانات المستخدم إلى الطلب
      req.user = user[0];
      next();
    } catch (error) {
      console.error("[Auth] Error in requireUser middleware:", error);
      return res.status(500).json({ 
        success: false, 
        message: "حدث خطأ في التحقق من الهوية" 
      });
    }
  };

  app.get("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const products = await db.select().from(uploadedProducts).orderBy(desc(uploadedProducts.uploadedAt));
      res.json({ success: true, data: products });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/admin/products/:id/sync", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isSynced } = req.body;
      const updated = await db.update(uploadedProducts)
        .set({ 
          isSynced, 
          syncedAt: isSynced ? new Date() : null 
        })
        .where(eq(uploadedProducts.id, parseInt(id)))
        .returning();
      
      res.json({ success: true, data: updated[0] });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Salla API Endpoint to pull products
  app.get("/api/salla/products", async (req, res) => {
    // Optional auth using secret key
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${SALLA_SECRET_KEY}`) {
      // we can optionally reject or allow if they don't send it, but let's enforce it since keys were provided
      return res.status(401).json({ error: "Unauthorized Salla Partner" });
    }

    try {
      const pendingProducts = await db.select().from(uploadedProducts)
        .where(eq(uploadedProducts.isSynced, false))
        .orderBy(desc(uploadedProducts.uploadedAt));
      res.json({ success: true, count: pendingProducts.length, data: pendingProducts });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Salla Webhook / Callback to mark as synced
  app.post("/api/salla/webhook/sync", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${SALLA_SECRET_KEY}`) {
      return res.status(401).json({ error: "Unauthorized Salla Partner" });
    }

    try {
      const { id } = req.body; // array of IDs or single ID
      if (!id) return res.status(400).json({ error: "Product id(s) required" });

      const ids = Array.isArray(id) ? id : [id];
      const results = [];
      for (const prodId of ids) {
        const updated = await db.update(uploadedProducts)
          .set({ isSynced: true, syncedAt: new Date() })
          .where(eq(uploadedProducts.id, parseInt(prodId)))
          .returning();
        if (updated.length > 0) results.push(updated[0]);
      }
      res.json({ success: true, syncedCount: results.length, data: results });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // --- SALLA DIRECT TOKEN ROUTE (using OAuth2 service) ---
  app.post("/api/salla/token", requireAdmin, async (req, res) => {
    const { token } = req.body;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: "A valid token is required" });
    }

    try {
      // استخدام خدمة OAuth2 لحفظ التوكن
      await saveDeveloperToken(token, "custom_app_store");

      res.json({ success: true, message: "Salla access token saved successfully." });
    } catch (err: any) {
      console.error("Error saving Salla token:", err);
      res.status(500).json({ success: false, message: "Error saving token: " + err.message });
    }
  });

  // --- SALLA OAUTH2 CALLBACK ROUTE ---
  app.get("/api/salla/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).json({ success: false, message: "Authorization code is required" });
      }

      // استيراد دالة تبادل الكود
      const { exchangeCodeForTokens } = await import("./salla-oauth");
      
      const tokens = await exchangeCodeForTokens(code as string, state as string);
      
      if (tokens) {
        // جلب معلومات التاجر من سلة
        try {
          const merchantResponse = await fetch("https://api.salla.dev/admin/v2/store", {
            headers: {
              "Authorization": `Bearer ${tokens.access_token}`,
              "Accept": "application/json"
            }
          });
          
          if (merchantResponse.ok) {
            const merchantData = await merchantResponse.json();
            const merchantEmail = merchantData.data?.email || `merchant_${Date.now()}@salla.com`;
            const merchantName = merchantData.data?.name || "تاجر سلة";
            const merchantId = merchantData.data?.id?.toString();
            
            // التحقق من وجود المستخدم أو إنشاء واحد جديد
            const existingUser = await db.select().from(users).where(eq(users.email, merchantEmail)).limit(1);
            
            if (existingUser.length === 0) {
              // إنشاء مستخدم جديد
              await db.insert(users).values({
                email: merchantEmail,
                name: merchantName,
                sallaMerchantId: merchantId,
                sallaAccessToken: tokens.access_token,
                sallaRefreshToken: tokens.refresh_token,
                sallaTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
              });
              console.log(`[OAuth Callback] New user created: ${merchantEmail}`);
            } else {
              // تحديث بيانات المستخدم الموجود
              await db.update(users)
                .set({
                  name: merchantName,
                  sallaMerchantId: merchantId,
                  sallaAccessToken: tokens.access_token,
                  sallaRefreshToken: tokens.refresh_token,
                  sallaTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
                  updatedAt: new Date(),
                })
                .where(eq(users.email, merchantEmail));
              console.log(`[OAuth Callback] User updated: ${merchantEmail}`);
            }
          }
        } catch (merchantErr) {
          console.error("[OAuth Callback] Failed to fetch merchant info:", merchantErr);
          // لا نفشل العملية إذا فشل جلب معلومات التاجر
        }
        
        res.json({ 
          success: true, 
          message: "Salla OAuth2 tokens saved successfully. The system will automatically refresh tokens when needed." 
        });
      } else {
        res.status(500).json({ success: false, message: "Failed to exchange authorization code for tokens" });
      }
    } catch (err: any) {
      console.error("Salla OAuth2 callback error:", err);
      res.status(500).json({ success: false, message: "OAuth2 callback failed: " + err.message });
    }
  });

  // --- SALLA AUTHORIZATION URL ROUTE ---
  app.get("/api/salla/auth-url", requireAdmin, async (req, res) => {
    try {
      const { getAuthorizationUrl } = await import("./salla-oauth");
      const redirectUri = req.query.redirect_uri as string || `https://upload.fawri.cloud/api/salla/callback`;
      const authUrl = getAuthorizationUrl(redirectUri);
      
      res.json({ 
        success: true, 
        authUrl,
        message: "Redirect user to this URL to authorize the application"
      });
    } catch (err: any) {
      console.error("Error generating auth URL:", err);
      res.status(500).json({ success: false, message: "Failed to generate authorization URL" });
    }
  });

  // --- USER AUTHENTICATION ROUTES ---
  
  // الحصول على معلومات المستخدم الحالي
  app.get("/api/user/me", requireUser, async (req: any, res) => {
    try {
      const user = req.user;
      
      // عدم إرجاع التوكنات في الاستجابة للأمان
      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          sallaMerchantId: user.sallaMerchantId,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error: any) {
      console.error("[User API] Error fetching user info:", error);
      res.status(500).json({ 
        success: false, 
        message: "حدث خطأ في جلب معلومات المستخدم" 
      });
    }
  });

  // تسجيل خروج المستخدم
  app.post("/api/user/logout", async (req: any, res) => {
    try {
      req.session.destroy(() => {
        res.json({ success: true, message: "تم تسجيل الخروج بنجاح" });
      });
    } catch (error: any) {
      console.error("[User API] Error logging out:", error);
      res.status(500).json({ 
        success: false, 
        message: "حدث خطأ في تسجيل الخروج" 
      });
    }
  });

  // التحقق من حالة المصادقة
  app.get("/api/user/check-auth", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.json({ 
          success: false, 
          isAuthenticated: false,
          message: "غير مسجل الدخول" 
        });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (user.length === 0 || !user[0].isActive) {
        req.session.destroy(() => {});
        return res.json({ 
          success: false, 
          isAuthenticated: false,
          message: "المستخدم غير موجود أو غير نشط" 
        });
      }

      res.json({
        success: true,
        isAuthenticated: true,
        data: {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name,
          sallaMerchantId: user[0].sallaMerchantId
        }
      });
    } catch (error: any) {
      console.error("[User API] Error checking auth:", error);
      res.status(500).json({ 
        success: false, 
        isAuthenticated: false,
        message: "حدث خطأ في التحقق من المصادقة" 
      });
    }
  });

  // جلب منتجات المستخدم الحالي
  app.get("/api/user/products", requireUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // للآن نرجع جميع المنتجات - يمكن لاحقاً تصفية حسب المستخدم
      const products = await db.select()
        .from(uploadedProducts)
        .orderBy(desc(uploadedProducts.uploadedAt));
      
      res.json({ 
        success: true, 
        data: products 
      });
    } catch (error: any) {
      console.error("[User API] Error fetching products:", error);
      res.status(500).json({ 
        success: false, 
        message: "حدث خطأ في جلب المنتجات" 
      });
    }
  });

  // نشر منتج للمستخدم الحالي
  app.post("/api/user/publish", requireUser, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { productName, frontImage, backImage } = req.body;

      if (!productName || typeof productName !== "string") {
        return res.status(400).json({
          success: false,
          error: "اسم المنتج مطلوب",
        });
      }

      console.log(`[User Publish] User ${userId} publishing: ${productName}`);

      // استيراد خدمة النشر
      const { processAndPublish } = await import("./salla-publisher");

      // معالجة الصور إذا تم توفيرها
      let frontImageBase64: string | undefined;
      let backImageBase64: string | undefined;

      if (frontImage && typeof frontImage === "string") {
        frontImageBase64 = frontImage.replace(/^data:image\/\w+;base64,/, "");
      }

      if (backImage && typeof backImage === "string") {
        backImageBase64 = backImage.replace(/^data:image\/\w+;base64,/, "");
      }

      // تنفيذ العملية الكاملة
      const result = await processAndPublish(
        productName,
        frontImageBase64,
        backImageBase64
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || "فشلت عملية النشر",
        });
      }

      return res.json({
        success: true,
        data: {
          productName: result.productData?.productName,
          seoTitle: result.productData?.seoTitle,
          description: result.productData?.description,
          sku: result.productData?.sku,
          barcode: result.productData?.barcode,
          images: result.productData?.images,
          sallaProductId: result.sallaProductId,
        },
        message: "تم نشر المنتج على سلة بنجاح",
      });
    } catch (error: any) {
      console.error("[User Publish] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "حدث خطأ في عملية النشر",
      });
    }
  });

  // الحصول على رابط تفويض سلة للمستخدم
  app.get("/api/user/salla/auth-url", requireUser, async (req: any, res) => {
    try {
      const { getAuthorizationUrl } = await import("./salla-oauth");
      const redirectUri = `https://upload.fawri.cloud/api/salla/callback`;
      const authUrl = getAuthorizationUrl(redirectUri);
      
      res.json({ 
        success: true, 
        authUrl,
        message: "قم بزيارة الرابط لتفويض حساب سلة"
      });
    } catch (err: any) {
      console.error("[User Auth] Error generating auth URL:", err);
      res.status(500).json({ success: false, message: "فشل في إنشاء رابط التفويض" });
    }
  });


  app.post("/api/generate", async (req, res) => {
    try {
      const { frontImage, backImage } = req.body;

      if (!frontImage || !backImage) {
        return res.status(400).json({
          success: false,
          error: "Both front and back images are required",
        });
      }

      const processImage = async (base64Image: string): Promise<Buffer> => {
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(cleanBase64, "base64");

        const processed = await sharp(imageBuffer)
          .resize(1000, 1000, {
            fit: "contain",
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality: 85 })
          .toBuffer();

        return processed;
      };

      const [frontBuffer, backBuffer] = await Promise.all([
        processImage(frontImage),
        processImage(backImage),
      ]);

      const processedFrontBase64 = frontBuffer.toString("base64");
      const processedBackBase64 = backBuffer.toString("base64");

      let geminiApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
      console.log("Gemini API key status:", geminiApiKey ? `FOUND (length: ${geminiApiKey.length})` : "NOT FOUND");
      let baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
      let apiVersion = "";

      if (!geminiApiKey) {
        return res.status(400).json({
          success: false,
          error: "Gemini API key not configured",
        });
      }

      // Perform OCR if key is available
      let ocrText = "";
      const cloudVisionKey = process.env.CLOUD_VISION_API_KEY;

      if (cloudVisionKey) {
        console.log("Performing Cloud Vision OCR...");
        const [frontOCR, backOCR] = await Promise.all([
          performOCR(frontBuffer, cloudVisionKey),
          performOCR(backBuffer, cloudVisionKey)
        ]);
        ocrText = `\n\n[DETECTED TEXT FROM IMAGE (CLOUD VISION OCR)]:\nFront Image Text: ${frontOCR}\nBack Image Text: ${backOCR}\n\n⚠️ IMPORTANT: Verify the Model Number against the text above. If the image says 'G30', do NOT output 'G20'.`;
        console.log("OCR Match Result:", ocrText);
      }

      const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: baseUrl ? {
          apiVersion,
          baseUrl,
        } : undefined,
      });

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [
          {
            role: "user",
            parts: [
              { text: smartAnalysisPrompt + ocrText },
              { inlineData: { mimeType: "image/jpeg", data: processedFrontBase64 } },
              { text: "الصورة الخلفية للمنتج (الباركود والمواصفات):" },
              { inlineData: { mimeType: "image/jpeg", data: processedBackBase64 } },
            ],
          },
        ],
      });

      const content = response.text;

      if (!content) {
        return res.status(500).json({
          success: false,
          error: "No response from AI",
        });
      }

      let productData: ProductData;
      try {
        // Robust JSON extraction
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON object found in response");
        }

        const jsonContent = jsonMatch[0];
        productData = productDataSchema.parse(JSON.parse(jsonContent));
      } catch (parseError) {
        console.error("Parse error:", parseError);
        console.error("Raw content that failed parsing:", content);
        return res.status(500).json({
          success: false,
          error: "Failed to parse AI response. Please try again.",
        });
      }

      // Validate product_image_url is from trusted sources
      if (productData.product_image_url) {
        const trustedImageDomains = [
          "gsmarena.com",
          "fdn.gsmarena.com",
          "fdn2.gsmarena.com",
          "cdn.gsmarena.com",
          "amazon.com",
          "m.media-amazon.com",
          "images-na.ssl-images-amazon.com",
          "images-eu.ssl-images-amazon.com",
          "noon.com",
          "f.nooncdn.com",
          "samsung.com",
          "images.samsung.com",
          "image-us.samsung.com",
          "apple.com",
          "store.storeimages.cdn-apple.com",
          "xiaomi.com",
          "i01.appmifile.com",
          "i02.appmifile.com",
          "oppo.com",
          "image.oppo.com",
          "vivo.com",
          "realme.com",
          "infinixmobility.com",
          "tecno-mobile.com",
          "oneplus.com",
          "opc.img.shopping.com",
          "cdn.shopify.com",
          "static.wixstatic.com",
          "aliexpress.com",
          "ae01.alicdn.com",
          "ae02.alicdn.com",
          "ae03.alicdn.com",
          "alicdn.com",
          "jarir.com",
          "extra.com",
          "sharafdg.com",
          "brave.com.sa",
          "huawei.com",
          "consumer.huawei.com",
          "img.huaweicloud.com",
          "honor.com",
          "hihonor.com",
          "motorola.com",
          "nokia.com",
          "sony.com",
          "lg.com",
          "lenovo.com",
          "asus.com",
          "anker.com",
          "jbl.com",
          "harmankardon.com",
          "bose.com",
          "amazon.ae",
          "m.media-amazon.ae",
          "nooncdn.com",
          "f.nooncdn.com",
        ];

        try {
          const imageUrl = new URL(productData.product_image_url);
          // Allow any HTTPS URL for now to increase hit rate, since we verify content-type anyway
          const isHttps = imageUrl.protocol === "https:";

          if (!isHttps) {
            console.log("Rejected non-HTTPS image URL:", productData.product_image_url);
            productData.product_image_url = "";
          } else {
            // Verify the image URL is actually accessible and returns an image
            try {
              console.log("Verifying AI image URL:", productData.product_image_url);
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds

              let imageResponse = await fetch(productData.product_image_url, {
                method: "HEAD",
                signal: controller.signal,
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  "Accept": "image/*,*/*;q=0.8",
                },
              });

              if (!imageResponse.ok) {
                console.log("AI Image HEAD failed, trying GET:", productData.product_image_url);
                imageResponse = await fetch(productData.product_image_url, {
                  method: "GET",
                  signal: controller.signal,
                  headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "image/*",
                    "Range": "bytes=0-1024",
                  },
                });
              }

              clearTimeout(timeoutId);

              if (!imageResponse.ok) {
                console.log("AI Image URL not accessible (status:", imageResponse.status, "):", productData.product_image_url);
                productData.product_image_url = "";
              } else {
                const contentType = imageResponse.headers.get("content-type") || "";
                if (!contentType.startsWith("image/")) {
                  console.log("URL does not return an image (content-type:", contentType, "):", productData.product_image_url);
                  productData.product_image_url = "";
                } else {
                  console.log("AI Image URL verified successfully:", productData.product_image_url);
                }
              }
            } catch (fetchError: any) {
              console.log("Failed to verify AI image URL:", fetchError.message, productData.product_image_url);
              // Don't clear URL on timeout if it looks like a valid major domain
              const hostname = imageUrl.hostname.toLowerCase();
              const highlyTrusted = ["amazon.com", "media-amazon.com", "samsung.com", "apple.com", "gsmarena.com", "noon.com"];
              if (highlyTrusted.some(d => hostname.includes(d))) {
                console.log("Keeping URL despite verification error as it is from a highly trusted source");
              } else {
                productData.product_image_url = "";
              }
            }
          }
        } catch {
          // Invalid URL format
          productData.product_image_url = "";
        }
      }

      // Always perform image search to get multiple angles/options
      console.log("Performing image search for multiple angles...");

      // Build a clean search query: Brand + Model + "product white background"
      const cleanBrand = productData.brand || "";
      const cleanName = productData.product_name || "";
      const searchQuery = `${cleanName} ${cleanBrand} official white background product`.replace(/\s+/g, ' ').trim();

      const foundImages = await findProductImages(searchQuery);

      if (foundImages.length > 0) {
        // If we found images via search
        if (!productData.product_image_url) {
          // If AI didn't provide one, use the first search result
          productData.product_image_url = foundImages[0];
        } else {
          // If AI provided one, ensure it's in the list if it's not already
          if (!foundImages.includes(productData.product_image_url)) {
            // Add AI image to the beginning if verified, otherwise just trust search
            foundImages.unshift(productData.product_image_url);
          }
        }

        productData.images = foundImages;
        console.log(`Total images found: ${foundImages.length}`);
      } else if (productData.product_name_en) {
        // Try English name if Arabic search fails
        console.log("Trying fallback search with English name...");
        const cleanNameEn = productData.product_name_en.replace(/box|packaging|retail/gi, "").trim();
        const searchQueryEn = `${cleanNameEn} product white background`;
        const foundImagesEn = await findProductImages(searchQueryEn);

        if (foundImagesEn.length > 0) {
          if (!productData.product_image_url) {
            productData.product_image_url = foundImagesEn[0];
          } else if (!foundImagesEn.includes(productData.product_image_url)) {
            foundImagesEn.unshift(productData.product_image_url);
          }
          productData.images = foundImagesEn;
          console.log(`Total images found (English search): ${foundImagesEn.length}`);
        }
      }

      // Ensure images array exists even if empty
      if (!productData.images) {
        productData.images = productData.product_image_url ? [productData.product_image_url] : [];
      }

      // Generate SKU if not provided by AI
      if (!productData.sku || productData.sku.trim() === "") {
        // Generate SKU from barcode if available, otherwise from brand + random
        if (productData.barcode) {
          productData.sku = `SKU-${productData.barcode.slice(-8)}`;
        } else {
          const brandPrefix = productData.brand_en?.substring(0, 3).toUpperCase() || "PRD";
          const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
          productData.sku = `${brandPrefix}-${randomSuffix}`;
        }
        console.log(`Generated SKU: ${productData.sku}`);
      }

      // Save images to local files for direct links
      const hostUrl = `${req.protocol}://${req.get('host')}`;
      const frontFilename = `front_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const backFilename = `back_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const frontPath = path.join(process.cwd(), "attached_assets", "uploads", frontFilename);
      const backPath = path.join(process.cwd(), "attached_assets", "uploads", backFilename);
      
      fs.writeFileSync(frontPath, frontBuffer);
      fs.writeFileSync(backPath, backBuffer);

      const frontImageUrl = `${hostUrl}/uploads/${frontFilename}`;
      const backImageUrl = `${hostUrl}/uploads/${backFilename}`;

      // Insert into our Database
      let productId = null;
      try {
        const inserted = await db.insert(uploadedProducts).values({
          productName: productData.product_name || "Unknown Product",
          sku: productData.sku,
          barcode: productData.barcode,
          frontImageUrl,
          backImageUrl,
          productData: productData,
        }).returning({ id: uploadedProducts.id });
        if (inserted.length > 0) productId = inserted[0].id;
        console.log("Product saved to database. ID:", productId);

        // Attempt Salla auto-upload if token exists (using OAuth2 with auto-refresh)
        if (productId) {
          try {
            const accessToken = await getValidAccessToken();
            if (accessToken) {
              console.log("Found valid Salla token, attempting auto-upload to Salla...");
              
              const reqImages = [];
              if (productData.images && productData.images.length > 0) {
                productData.images.slice(0, 4).forEach(url => reqImages.push({ original: url }));
              }
              if (frontImageUrl) reqImages.push({ original: frontImageUrl });
              
              const sallaPayload = {
                name: productData.product_name || "Unknown Product",
                price: 1, // Defaulting to 1 so the product can be created easily
                status: "out_of_stock",
                product_type: "product",
                quantity: 0,
                description: productData.full_description || productData.marketing_description || "",
                sku: productData.sku,
                barcode: productData.barcode,
                images: reqImages.length > 0 ? reqImages : undefined
              };

              const uploadRes = await fetch("https://api.salla.dev/admin/v2/products", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${accessToken}`
                },
                body: JSON.stringify(sallaPayload)
              });

              if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                await db.update(uploadedProducts)
                  .set({ isSynced: true, syncedAt: new Date(), sallaProductId: uploadData.data?.id?.toString() })
                  .where(eq(uploadedProducts.id, productId));
                console.log("Successfully auto-uploaded to Salla:", uploadData.data?.id);
              } else {
                const errData = await uploadRes.text();
                console.error("Salla auto-upload API failed:", errData);
              }
            } else {
              console.log("No valid Salla token available for auto-upload");
            }
          } catch (sallaErr) {
            console.error("Salla auto-upload error:", sallaErr);
            // Don't fail the request if Salla upload fails
          }
        }
      } catch (dbErr) {
        console.error("Failed to save product to DB or Salla:", dbErr);
        // We do not fail the request if DB insert fails
      }

      return res.json({
        success: true,
        data: productData,
        frontImageBase64: processedFrontBase64,
        backImageBase64: processedBackBase64,
        directLinks: {
          front: frontImageUrl,
          back: backImageUrl
        }
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to generate listing",
      });
    }
  });

  app.post("/api/download-excel", async (req, res) => {
    try {
      const { productData, frontImageBase64 } = req.body;

      if (!productData) {
        return res.status(400).json({ error: "Product data is required" });
      }

      const validationResult = productDataSchema.safeParse(productData);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid product data format",
          details: validationResult.error.errors
        });
      }

      const validatedData = validationResult.data;

      const templatePath = path.join(process.cwd(), "attached_assets", "Salla_Products_Template_1765491101794.xlsx");

      const workbook = new ExcelJS.Workbook();

      if (fs.existsSync(templatePath)) {
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.worksheets[0];

        if (worksheet) {
          const newRowNumber = worksheet.rowCount + 1;
          const newRow = worksheet.getRow(newRowNumber);

          const normalFont = { strike: false, bold: false };

          const setCellValue = (cellNum: number, value: string | number) => {
            const cell = newRow.getCell(cellNum);
            cell.value = value;
            cell.font = normalFont;
          };

          setCellValue(1, "منتج");
          setCellValue(2, validatedData.product_name);
          setCellValue(3, validatedData.category);
          setCellValue(4, validatedData.product_image_url || "");
          setCellValue(5, "");
          setCellValue(6, "");
          setCellValue(7, 0);
          setCellValue(8, validatedData.full_description);
          setCellValue(9, "نعم");
          setCellValue(10, validatedData.sku);
          setCellValue(11, 0);
          setCellValue(12, "");
          setCellValue(13, "");
          setCellValue(14, "");
          setCellValue(15, "");
          setCellValue(16, "");
          setCellValue(17, "");
          setCellValue(18, 0.1);
          setCellValue(19, "كيلوغرام");
          setCellValue(20, validatedData.brand);
          setCellValue(21, "");
          setCellValue(22, "");
          setCellValue(23, validatedData.barcode);
          setCellValue(24, "");
          setCellValue(25, "");
          setCellValue(26, "");
          setCellValue(27, "نعم");
          setCellValue(28, "");

          newRow.commit();
        }
      } else {
        const worksheet = workbook.addWorksheet("Salla Products Template Sheet", {
          views: [{ rightToLeft: true }],
        });

        const headers = [
          "النوع",
          "أسم المنتج",
          "تصنيف المنتج",
          "صورة المنتج",
          "وصف صورة المنتج",
          "نوع المنتج",
          "سعر المنتج",
          "الوصف",
          "هل يتطلب شحن؟",
          "رمز المنتج sku",
          "سعر التكلفة",
          "السعر المخفض",
          "تاريخ بداية التخفيض",
          "تاريخ نهاية التخفيض",
          "اقصي كمية لكل عميل",
          "إخفاء خيار تحديد الكمية",
          "اضافة صورة عند الطلب",
          "الوزن",
          "وحدة الوزن",
          "الماركة",
          "العنوان الترويجي",
          "تثبيت المنتج",
          "الباركود",
          "السعرات الحرارية",
          "MPN",
          "GTIN",
          "خاضع للضريبة ؟",
          "سبب عدم الخضوع للضريبة",
        ];

        worksheet.addRow(headers);
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { horizontal: "right" };

        const dataRow = [
          "منتج",
          validatedData.product_name || "",
          validatedData.category || "",
          validatedData.product_image_url || "",
          "",
          "",
          0,
          validatedData.full_description || "",
          "نعم",
          validatedData.sku || "",
          0,
          "",
          "",
          "",
          "",
          "",
          "",
          0.1,
          "كيلوغرام",
          validatedData.brand || "",
          "",
          "",
          validatedData.barcode || "",
          "",
          "",
          "",
          "نعم",
          "",
        ];

        worksheet.addRow(dataRow);

        worksheet.columns.forEach((column) => {
          column.width = 20;
        });
      }

      const filename = validatedData.sku
        ? `salla-product-${validatedData.sku}.xlsx`
        : "salla-product-listing.xlsx";

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      console.error("Excel generation error:", error);
      return res.status(500).json({ error: "Failed to generate Excel file" });
    }
  });

  // Upload image to imgbb and return permanent URL
  app.post("/api/upload-image", async (req, res) => {
    try {
      const { imageBase64 } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          error: "Image is required",
        });
      }

      // Remove base64 prefix first for accurate size calculation
      const cleanBase64ForSize = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      // Decode base64 and check actual binary size
      let decodedBuffer: Buffer;
      try {
        decodedBuffer = Buffer.from(cleanBase64ForSize, "base64");
      } catch {
        return res.status(400).json({
          success: false,
          error: "Invalid image data",
        });
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (decodedBuffer.length > maxSize) {
        return res.status(400).json({
          success: false,
          error: "Image too large (max 10MB)",
        });
      }

      const imgbbApiKey = process.env.IMGBB_API_KEY;
      if (!imgbbApiKey) {
        return res.status(500).json({
          success: false,
          error: "Image upload service not configured",
        });
      }

      // Remove base64 prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      // Prepare form data for imgbb API
      const formData = new URLSearchParams();
      formData.append("key", imgbbApiKey);
      formData.append("image", cleanBase64);

      const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        console.error("imgbb HTTP error:", response.status);
        return res.status(500).json({
          success: false,
          error: "Image upload service temporarily unavailable",
        });
      }

      const result = await response.json();

      if (!result.success) {
        console.error("imgbb upload error:", result);
        return res.status(500).json({
          success: false,
          error: "Failed to upload image",
        });
      }

      return res.json({
        success: true,
        url: result.data.url,
        display_url: result.data.display_url,
      });
    } catch (error: any) {
      console.error("Image upload error:", error);
      return res.status(500).json({
        success: false,
        error: "Image upload failed",
      });
    }
  });

  // Verify if an image URL is accessible (restricted to trusted domains)
  app.post("/api/verify-image-url", async (req, res) => {
    try {
      const { url } = req.body;

      if (!url || typeof url !== "string") {
        return res.status(400).json({
          success: false,
          valid: false,
          error: "URL is required",
        });
      }

      // Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.json({
          success: false,
          valid: false,
          reason: "Invalid URL format",
        });
      }

      // Only allow HTTPS and trusted domains to prevent SSRF
      const trustedDomains = [
        "gsmarena.com",
        "fdn.gsmarena.com",
        "fdn2.gsmarena.com",
        "cdn.gsmarena.com",
        "amazon.com",
        "m.media-amazon.com",
        "images-na.ssl-images-amazon.com",
        "images-eu.ssl-images-amazon.com",
        "noon.com",
        "f.nooncdn.com",
        "samsung.com",
        "images.samsung.com",
        "image-us.samsung.com",
        "apple.com",
        "store.storeimages.cdn-apple.com",
        "xiaomi.com",
        "i01.appmifile.com",
        "i02.appmifile.com",
        "oppo.com",
        "image.oppo.com",
        "vivo.com",
        "realme.com",
        "infinixmobility.com",
        "tecno-mobile.com",
        "oneplus.com",
        "opc.img.shopping.com",
        "cdn.shopify.com",
        "static.wixstatic.com",
        "aliexpress.com",
        "ae01.alicdn.com",
        "ae02.alicdn.com",
        "ae03.alicdn.com",
        "alicdn.com",
        "jarir.com",
        "extra.com",
        "sharafdg.com",
        "huawei.com",
        "consumer.huawei.com",
        "img.huaweicloud.com",
        "honor.com",
        "hihonor.com",
        "motorola.com",
        "nokia.com",
        "sony.com",
        "lg.com",
        "lenovo.com",
        "asus.com",
        "anker.com",
        "jbl.com",
        "harmankardon.com",
        "bose.com",
        "imgbb.com",
        "i.ibb.co",
      ];

      const hostname = parsedUrl.hostname.toLowerCase();
      const isTrusted = trustedDomains.some(
        (domain) => hostname === domain || hostname.endsWith("." + domain)
      );

      if (parsedUrl.protocol !== "https:" || !isTrusted) {
        return res.json({
          success: false,
          valid: false,
          reason: "URL not from trusted source",
        });
      }

      // DNS lookup to prevent SSRF via DNS rebinding to private IPs
      const dns = await import("dns").then(m => m.promises);
      try {
        const addresses = await dns.lookup(hostname, { all: true });
        const privateIPRanges = [
          /^127\./,                    // Loopback
          /^10\./,                     // Private Class A
          /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private Class B
          /^192\.168\./,               // Private Class C
          /^169\.254\./,               // Link-local
          /^0\./,                      // Current network
          /^::1$/,                     // IPv6 loopback
          /^fe80:/i,                   // IPv6 link-local
          /^fc00:/i,                   // IPv6 unique local
          /^fd/i,                      // IPv6 unique local
        ];

        const hasPrivateIP = addresses.some((addr: { address: string }) =>
          privateIPRanges.some(range => range.test(addr.address))
        );

        if (hasPrivateIP) {
          return res.json({
            success: false,
            valid: false,
            reason: "URL resolves to private network",
          });
        }
      } catch (dnsError) {
        return res.json({
          success: false,
          valid: false,
          reason: "DNS lookup failed",
        });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      try {
        console.log(`[Verify API] Trying HEAD: ${url}`);
        let response = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          }
        });

        if (!response.ok) {
          console.log(`[Verify API] HEAD failed, trying GET: ${url}`);
          response = await fetch(url, {
            method: "GET",
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Range": "bytes=0-1024",
            }
          });
        }

        clearTimeout(timeout);

        const contentType = response.headers.get("content-type") || "";

        if (response.ok && contentType.startsWith("image/")) {
          return res.json({
            success: true,
            valid: true,
            contentType,
          });
        }

        // If it's a trusted domain and we got a timeout or slightly weird response, maybe just allow it?
        // Actually, if we're here, HEAD and GET failed. 
        return res.json({
          success: false,
          valid: false,
          reason: response.ok ? "Not an image" : `HTTP ${response.status}`,
        });
      } catch (fetchError: any) {
        clearTimeout(timeout);
        // Be very lenient for trusted domains if they timeout
        if (isTrusted && (fetchError.name === "AbortError" || fetchError.message.includes("timeout"))) {
          return res.json({
            success: true,
            valid: true, // Mark as valid (low confidence) since it's a trusted domain
            warning: "Verification timed out, but domain is trusted",
          });
        }

        return res.json({
          success: false,
          valid: false,
          reason: fetchError.name === "AbortError" ? "Request timeout" : "URL not accessible",
        });
      }
    } catch (error: any) {
      return res.json({
        success: false,
        valid: false,
        reason: "Verification failed",
      });
    }
  });


  // ============================================
  // نقطة النشر المباشر على سلة (الجديدة)
  // ============================================
  
  app.post("/api/publish-to-salla", async (req, res) => {
    try {
      const { productName, frontImage, backImage } = req.body;

      if (!productName || typeof productName !== "string") {
        return res.status(400).json({
          success: false,
          error: "اسم المنتج مطلوب",
        });
      }

      console.log(`[Publish API] Received request for: ${productName}`);

      // استيراد خدمة النشر
      const { processAndPublish } = await import("./salla-publisher");

      // معالجة الصور إذا تم توفيرها
      let frontImageBase64: string | undefined;
      let backImageBase64: string | undefined;

      if (frontImage && typeof frontImage === "string") {
        frontImageBase64 = frontImage.replace(/^data:image\/\w+;base64,/, "");
      }

      if (backImage && typeof backImage === "string") {
        backImageBase64 = backImage.replace(/^data:image\/\w+;base64,/, "");
      }

      // تنفيذ العملية الكاملة
      const result = await processAndPublish(
        productName,
        frontImageBase64,
        backImageBase64
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || "فشلت عملية النشر",
        });
      }

      return res.json({
        success: true,
        data: {
          productName: result.productData?.productName,
          seoTitle: result.productData?.seoTitle,
          description: result.productData?.description,
          sku: result.productData?.sku,
          barcode: result.productData?.barcode,
          images: result.productData?.images,
          sallaProductId: result.sallaProductId,
        },
        message: "تم نشر المنتج على سلة بنجاح",
      });
    } catch (error: any) {
      console.error("[Publish API] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "حدث خطأ في عملية النشر",
      });
    }
  });

  // نقطة نهاية لتوليد المحتوى فقط (بدون نشر)
  app.post("/api/generate-content", async (req, res) => {
    try {
      const { productName, ocrText } = req.body;

      if (!productName || typeof productName !== "string") {
        return res.status(400).json({
          success: false,
          error: "اسم المنتج مطلوب",
        });
      }

      console.log(`[Generate API] Generating content for: ${productName}`);

      // استيراد خدمة النشر
      const { generateProductContent } = await import("./salla-publisher");

      const result = await generateProductContent(
        productName,
        ocrText || ""
      );

      if (!result) {
        return res.status(500).json({
          success: false,
          error: "فشل في توليد المحتوى",
        });
      }

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("[Generate API] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "حدث خطأ في توليد المحتوى",
      });
    }
  });

  // Download image proxy
  app.get("/api/download-image", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;

      if (!imageUrl) {
        return res.status(400).send("Image URL is required");
      }

      // Reuse the trusted domain logic
      const trustedDomains = [
        "gsmarena.com",
        "fdn.gsmarena.com",
        "fdn2.gsmarena.com",
        "cdn.gsmarena.com",
        "amazon.com",
        "m.media-amazon.com",
        "images-na.ssl-images-amazon.com",
        "images-eu.ssl-images-amazon.com",
        "noon.com",
        "f.nooncdn.com",
        "samsung.com",
        "images.samsung.com",
        "image-us.samsung.com",
        "apple.com",
        "store.storeimages.cdn-apple.com",
        "xiaomi.com",
        "i01.appmifile.com",
        "i02.appmifile.com",
        "oppo.com",
        "image.oppo.com",
        "vivo.com",
        "realme.com",
        "infinixmobility.com",
        "tecno-mobile.com",
        "oneplus.com",
        "opc.img.shopping.com",
        "cdn.shopify.com",
        "static.wixstatic.com",
        "aliexpress.com",
        "ae01.alicdn.com",
        "ae02.alicdn.com",
        "ae03.alicdn.com",
        "alicdn.com",
        "jarir.com",
        "extra.com",
        "sharafdg.com",
        "huawei.com",
        "consumer.huawei.com",
        "img.huaweicloud.com",
        "honor.com",
        "hihonor.com",
        "motorola.com",
        "nokia.com",
        "sony.com",
        "lg.com",
        "lenovo.com",
        "asus.com",
        "anker.com",
        "jbl.com",
        "harmankardon.com",
        "bose.com",
        "imgbb.com",
        "i.ibb.co",
      ];

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(imageUrl);
      } catch {
        return res.status(400).send("Invalid URL");
      }

      const hostname = parsedUrl.hostname.toLowerCase();
      const isTrusted = trustedDomains.some(
        (domain) => hostname === domain || hostname.endsWith("." + domain)
      );

      if (parsedUrl.protocol !== "https:" || !isTrusted) {
        return res.status(403).send("URL not from trusted source");
      }

      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch image");
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      // Extract filename from URL or default
      const pathname = parsedUrl.pathname;
      const filename = path.basename(pathname) || "product-image.jpg";

      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.send(buffer);
    } catch (error) {
      console.error("Download proxy error:", error);
      res.status(500).send("Failed to process download");
    }
  });

  app.post("/api/download-zid", async (req, res) => {
    try {
      const { productData } = req.body;

      if (!productData) {
        return res.status(400).json({ error: "Product data is required" });
      }

      const validationResult = productDataSchema.safeParse(productData);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid product data format",
          details: validationResult.error.errors
        });
      }

      const validatedData = validationResult.data;
      const templatePath = path.join(process.cwd(), "attached_assets", "import_products_example_2025-zid.xlsx");

      const workbook = new ExcelJS.Workbook();

      if (fs.existsSync(templatePath)) {
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.worksheets[0];

        if (worksheet) {
          // Clear example products starting from Row 3 to Row 15 to ensure a clean file
          for (let i = 3; i <= 15; i++) {
            worksheet.getRow(i).values = [];
          }

          const targetRowNumber = 3;
          const targetRow = worksheet.getRow(targetRowNumber);
          const normalFont = { strike: false, bold: false };

          const setCellValue = (cellNum: number, value: string | number) => {
            const cell = targetRow.getCell(cellNum);
            cell.value = value;
            cell.font = normalFont;
          };

          // Mapping based on Row 2 of Zid template (exactly 33 columns for the main data part)
          setCellValue(1, validatedData.sku);
          setCellValue(2, validatedData.product_name);
          setCellValue(3, validatedData.product_name_en || "");
          setCellValue(4, "kg");
          setCellValue(5, 0.1);
          setCellValue(6, 0); // price
          setCellValue(7, 0); // sale_price
          setCellValue(8, 0); // cost
          setCellValue(9, 100); // quantity
          setCellValue(10, validatedData.category);
          setCellValue(11, validatedData.category_en || "");
          setCellValue(12, validatedData.seo_description || ""); // categories_description_ar
          setCellValue(13, validatedData.seo_description_en || ""); // categories_description_en
          setCellValue(14, ""); // categories_images
          setCellValue(15, "1"); // published

          // Zid supports comma separated image URLs
          const allImages = (validatedData.images && validatedData.images.length > 0)
            ? validatedData.images.join(",")
            : (validatedData.product_image_url || "");
          setCellValue(16, allImages);
          setCellValue(17, validatedData.product_name); // images_alt_text
          setCellValue(18, "0"); // vat_free (0 = No)
          setCellValue(19, 1); // minimum_quantity_per_order
          setCellValue(20, 100); // maximum_quantity_per_order
          setCellValue(21, "نعم"); // shipping_required (Yes)
          setCellValue(22, validatedData.barcode || "");
          setCellValue(23, validatedData.brand || ""); // keywords (or tags)
          setCellValue(24, validatedData.full_description); // description_ar
          setCellValue(25, validatedData.full_description_en || ""); // description_en
          setCellValue(26, validatedData.marketing_description); // short_description_ar
          setCellValue(27, validatedData.marketing_description_en || ""); // short_description_en
          setCellValue(28, validatedData.seo_title || ""); // product_page_title_ar
          setCellValue(29, validatedData.seo_title || ""); // product_page_title_en
          setCellValue(30, validatedData.seo_description || ""); // product_page_description_ar
          setCellValue(31, validatedData.seo_description_en || ""); // product_page_description_en
          setCellValue(32, ""); // product_page_url
          setCellValue(33, "لا"); // has_variants (No)

        }
      } else {
        // Fallback if template doesn't exist
        const worksheet = workbook.addWorksheet("Zid Products", {
          views: [{ rightToLeft: true }],
        });

        // Simplified headers for Zid if template is missing
        const headers = [
          "sku", "name_ar", "name_en", "weight_unit", "weight", "price", "sale_price", "cost", "quantity",
          "categories_ar", "categories_en", "description_ar", "description_en", "barcode", "images"
        ];

        worksheet.addRow(headers);
        worksheet.getRow(1).font = { bold: true };

        const dataRow = [
          validatedData.sku,
          validatedData.product_name,
          validatedData.product_name_en || "",
          "kg",
          0.1,
          0,
          "",
          "",
          0,
          validatedData.category,
          validatedData.category_en || "",
          validatedData.full_description,
          validatedData.full_description_en || "",
          validatedData.barcode,
          validatedData.product_image_url || "",
        ];

        worksheet.addRow(dataRow);
      }

      const filename = validatedData.sku
        ? `zid-product-${validatedData.sku}.xlsx`
        : "zid-product-listing.xlsx";

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);
    } catch (error: any) {
      console.error("Zid Excel generation error:", error);
      return res.status(500).json({ error: "Failed to generate Zid Excel file" });
    }
  });

  // ============================================
  // Webhook Handlers لأحداث سلة
  // ============================================

  /**
   * معالج Webhook الرئيسي - يستقبل جميع الأحداث من سلة
   * يجب تسجيل هذا الرابط في لوحة تحكم سلة كـ Webhook URL
   * الرابط: https://yourdomain.com/api/salla/webhook
   */
  app.post("/api/salla/webhook", async (req, res) => {
    try {
      // التحقق من صحة الطلب (اختياري ولكن مُنصح به)
      const webhookSecret = process.env.SALLA_WEBHOOK_SECRET;
      if (webhookSecret) {
        const signature = req.headers['x-salla-signature'];
        // TODO: التحقق من التوقيع باستخدام HMAC
      }

      const { event, merchant, data, created_at } = req.body;

      if (!event) {
        return res.status(400).json({ error: "Event type is required" });
      }

      console.log(`[Salla Webhook] Received event: ${event}`, {
        merchant: merchant?.id,
        createdAt: created_at
      });

      // حفظ الحدث في قاعدة البيانات
      try {
        await db.insert(sallaWebhookEvents).values({
          merchantId: merchant?.id?.toString(),
          eventType: event,
          eventId: req.body.id?.toString(),
          payload: req.body,
          processed: false,
        });
        console.log(`[Salla Webhook] Event saved to database`);
      } catch (dbError) {
        console.error("[Salla Webhook] Failed to save event:", dbError);
        // لا نفشل الطلب إذا فشل حفظ قاعدة البيانات
      }

      // معالجة الحدث بناءً على النوع
      switch (event) {
        case 'app.install':
          await handleAppInstall(data, merchant);
          break;

        case 'app.uninstall':
          await handleAppUninstall(data, merchant);
          break;

        case 'app.store.authorize':
          await handleAppStoreAuthorize(data, merchant);
          break;

        case 'product.create':
          await handleProductCreate(data, merchant);
          break;

        case 'product.update':
          await handleProductUpdate(data, merchant);
          break;

        case 'order.create':
          await handleOrderCreate(data, merchant);
          break;

        case 'order.update':
          await handleOrderUpdate(data, merchant);
          break;

        default:
          console.log(`[Salla Webhook] Unhandled event type: ${event}`);
      }

      // تحديث حالة الحدث كمعالج
      try {
        await db.update(sallaWebhookEvents)
          .set({ 
            processed: true, 
            processedAt: new Date() 
          })
          .where(eq(sallaWebhookEvents.eventId, req.body.id?.toString()));
      } catch (updateError) {
        console.error("[Salla Webhook] Failed to update event status:", updateError);
      }

      // الرد بنجاح (مطلوب من سلة خلال 5 ثوانٍ)
      res.status(200).json({ success: true, message: "Webhook received" });

    } catch (error: any) {
      console.error("[Salla Webhook] Error processing webhook:", error);
      // نرد بـ 200 حتى لا يتم إرسال الحدث مرة أخرى
      res.status(200).json({ success: false, error: error.message });
    }
  });

  /**
   * معالج حدث تثبيت التطبيق
   */
  async function handleAppInstall(data: any, merchant: any) {
    console.log(`[App Install] App installed by merchant: ${merchant?.id}`);
    console.log(`[App Install] Store name: ${merchant?.name || 'Unknown'}`);
    
    // يمكن هنا:
    // 1. إرسال بريد ترحيبي
    // 2. إنشاء إعدادات افتراضية للمتجر
    // 3. تسجيل المتجر في قاعدة البيانات
    // 4. إرسال إشعار للفريق
  }

  /**
   * معالج حدث إزالة التطبيق
   */
  async function handleAppUninstall(data: any, merchant: any) {
    console.log(`[App Uninstall] App uninstalled by merchant: ${merchant?.id}`);
    
    // يمكن هنا:
    // 1. تنظيف البيانات المرتبطة بالمتجر
    // 2. إرسال استبيان لسبب الإزالة
    // 3. تحديث حالة الاشتراك
  }

  /**
   * معالج حدث إنشاء منتج
   */
  async function handleProductCreate(data: any, merchant: any) {
    console.log(`[Product Create] New product created: ${data?.id}`);
    console.log(`[Product Create] Product name: ${data?.name}`);
    
    // يمكن هنا:
    // 1. مزامنة المنتج مع قاعدة البيانات المحلية
    // 2. تحسين SEO تلقائياً
    // 3. إضافة وصف بالذكاء الاصطناعي
    // 4. البحث عن صور إضافية
  }

  /**
   * معالج حدث تحديث منتج
   */
  async function handleProductUpdate(data: any, merchant: any) {
    console.log(`[Product Update] Product updated: ${data?.id}`);
    console.log(`[Product Update] Product name: ${data?.name}`);
    
    // يمكن هنا:
    // 1. تحديث المنتج في قاعدة البيانات المحلية
    // 2. التحقق من تغييرات السعر
    // 3. إشعار المشتركين بتغيير المنتج
  }

  /**
   * معالج حدث إنشاء طلب
   */
  async function handleOrderCreate(data: any, merchant: any) {
    console.log(`[Order Create] New order created: ${data?.id}`);
    console.log(`[Order Create] Total: ${data?.total?.amount} ${data?.total?.currency}`);
    
    // يمكن هنا:
    // 1. تسجيل الطلب في قاعدة البيانات
    // 2. إرسال إشعار لصاحب المتجر
    // 3. تحديث المخزون
    // 4. إنشاء فاتورة
  }

  /**
   * معالج حدث تحديث طلب
   */
  async function handleOrderUpdate(data: any, merchant: any) {
    console.log(`[Order Update] Order updated: ${data?.id}`);
    console.log(`[Order Update] Status: ${data?.status}`);
    
    // يمكن هنا:
    // 1. تحديث حالة الطلب
    // 2. إرسال إشعار للعميل
    // 3. تحديث التقارير
  }

  /**
   * معالج حدث تفويض التطبيق (app.store.authorize)
   * هذا الحدث يأتي مع التوكنات عند تثبيت التطبيق
   */
  async function handleAppStoreAuthorize(data: any, merchant: any) {
    console.log(`[App Store Authorize] Received authorization for merchant: ${merchant}`);
    console.log(`[App Store Authorize] Data:`, JSON.stringify(data, null, 2));
    
    try {
      // استخراج التوكنات من البيانات
      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;
      const expiresIn = data.expires; // expires هو timestamp بالثواني
      const merchantId = merchant?.toString();
      
      if (!accessToken || !refreshToken) {
        console.error("[App Store Authorize] Missing tokens in data");
        return;
      }
      
      // حساب تاريخ انتهاء الصلاحية
      const expiresAt = new Date(expiresIn * 1000); // تحويل من ثواني إلى milliseconds
      
      console.log(`[App Store Authorize] Saving tokens for merchant: ${merchantId}`);
      console.log(`[App Store Authorize] Access token: ${accessToken.substring(0, 20)}...`);
      console.log(`[App Store Authorize] Expires at: ${expiresAt.toISOString()}`);
      
      // حفظ التوكنات في قاعدة البيانات
      await db.insert(sallaTokens).values({
        merchantId: merchantId,
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: expiresAt,
      });
      
      console.log(`[App Store Authorize] ✅ Tokens saved successfully for merchant: ${merchantId}`);
      
    } catch (error: any) {
      console.error("[App Store Authorize] Error saving tokens:", error);
    }
  }

  /**
   * محاكاة إرسال Webhook للاختبار
   */
  app.post("/api/salla/webhook/test", async (req, res) => {
    try {
      const { eventType, data } = req.body;
      
      const testEvent = {
        event: eventType || 'product.create',
        merchant: {
          id: 'test_merchant_123',
          name: 'متجر اختباري'
        },
        data: data || {
          id: 'test_product_456',
          name: 'منتج اختباري'
        },
        created_at: new Date().toISOString(),
        id: `test_${Date.now()}`
      };

      console.log(`[Webhook Test] Sending test event:`, testEvent);

      // محاكاة إرسال Webhook
      const response = await fetch(`https://upload.fawri.cloud/api/salla/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testEvent)
      });

      const result = await response.json();

      res.json({
        success: true,
        message: "Test webhook sent successfully",
        testEvent,
        response: result
      });
    } catch (error: any) {
      console.error("[Webhook Test] Error:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return httpServer;
}
