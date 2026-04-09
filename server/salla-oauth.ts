/**
 * خدمة Salla OAuth2 مع تحديث التوكن التلقائي
 * تدعم Authorization Code Flow و Refresh Token
 */

import { db } from "./db";
import { sallaTokens } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const SALLA_CLIENT_ID = process.env.SALLA_CLIENT_ID || "2e07dd96-250d-477f-baff-2b2b7ed9f4e7";
const SALLA_SECRET_KEY = process.env.SALLA_SECRET_KEY || "d8737751cc86dc78eb8e6cab321a5f416b328992fbd197c0247df509d71be805";
const SALLA_TOKEN_URL = "https://accounts.salla.sa/oauth2/token";
const SALLA_API_BASE = "https://api.salla.dev/admin/v2";

interface SallaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * الحصول على توكن صالح (مع تحديث تلقائي إذا انتهت صلاحيته)
 */
export async function getValidAccessToken(): Promise<string | null> {
  try {
    // جلب آخر توكن محفوظ
    const tokens = await db.select()
      .from(sallaTokens)
      .orderBy(desc(sallaTokens.createdAt))
      .limit(1);

    if (tokens.length === 0) {
      console.log("[Salla OAuth] No tokens found in database");
      return null;
    }

    const currentToken = tokens[0];
    const now = new Date();
    const expiresAt = new Date(currentToken.expiresAt);
    
    // التحقق مما إذا كان التوكن لا يزال صالحاً (مع هامش أمان 5 دقائق)
    const bufferTime = 5 * 60 * 1000; // 5 دقائق
    if (expiresAt.getTime() > now.getTime() + bufferTime) {
      console.log("[Salla OAuth] Using existing valid token");
      return currentToken.accessToken;
    }

    // التوكن منتهي الصلاحية - محاولة التحديث
    console.log("[Salla OAuth] Token expired, attempting refresh...");
    
    if (!currentToken.refreshToken) {
      console.log("[Salla OAuth] No refresh token available");
      return null;
    }

    const newTokens = await refreshAccessToken(currentToken.refreshToken);
    
    if (newTokens) {
      // حفظ التوكن الجديد
      await saveTokens(newTokens, currentToken.merchantId || undefined);
      return newTokens.access_token;
    }

    // إذا فشل التحديث، نرجع null للإشارة إلى ضرورة إعادة المصادقة
    console.error("[Salla OAuth] Refresh failed, returning null");
    return null;
    
  } catch (error) {
    console.error("[Salla OAuth] Error getting valid token or refreshing:", error);
    return null;
  }
}

/**
 * تحديث التوكن باستخدام Refresh Token
 */
async function refreshAccessToken(refreshToken: string): Promise<SallaTokenResponse | null> {
  try {
    const response = await fetch(SALLA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: SALLA_CLIENT_ID,
        client_secret: SALLA_SECRET_KEY,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Salla OAuth] Refresh failed:", response.status, errorText);
      return null;
    }

    const data = await response.json() as SallaTokenResponse;
    console.log("[Salla OAuth] Token refreshed successfully");
    return data;
  } catch (error) {
    console.error("[Salla OAuth] Refresh error:", error);
    return null;
  }
}

/**
 * تبادل Authorization Code بالتوكنات
 */
export async function exchangeCodeForTokens(code: string, merchantId?: string): Promise<SallaTokenResponse | null> {
  try {
    const response = await fetch(SALLA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: SALLA_CLIENT_ID,
        client_secret: SALLA_SECRET_KEY,
        redirect_uri: process.env.SALLA_REDIRECT_URI || "",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Salla OAuth] Code exchange failed:", response.status, errorText);
      return null;
    }

    const data = await response.json() as SallaTokenResponse;
    console.log("[Salla OAuth] Code exchanged successfully");
    
    // حفظ التوكنات
    await saveTokens(data, merchantId);
    
    return data;
  } catch (error: any) {
    console.error("[Salla OAuth] Code exchange error:", error.message);
    // يجب أن يتبع هذا فشل على الكلاينت side
    return null;
  }
}

/**
 * حفظ التوكنات في قاعدة البيانات
 */
async function saveTokens(tokenData: SallaTokenResponse, merchantId?: string): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    
    await db.insert(sallaTokens).values({
      merchantId: merchantId || null,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: expiresAt,
    });
    
    console.log("[Salla OAuth] Tokens saved to database");
  } catch (error) {
    console.error("[Salla OAuth] Error saving tokens:", error);
    throw error;
  }
}

/**
 * حفظ Developer Token (للاختبار)
 */
export async function saveDeveloperToken(token: string, merchantId?: string): Promise<void> {
  try {
    // Developer Tokens عادة لا تنتهي، نضع تاريخ بعيد
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // سنة واحدة
    
    await db.insert(sallaTokens).values({
      merchantId: merchantId || "developer",
      accessToken: token,
      refreshToken: "", // Developer tokens لا تحتاج refresh
      expiresAt: expiresAt,
    });
    
    console.log("[Salla OAuth] Developer token saved");
  } catch (error) {
    console.error("[Salla OAuth] Error saving developer token:", error);
    throw error;
  }
}

/**
 * إنشاء رابط التفويض
 */
export function getAuthorizationUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: SALLA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "products.read products.write",
  });
  
  if (state) {
    params.append("state", state);
  }
  
  return `https://accounts.salla.sa/oauth2/authorize?${params.toString()}`;
}