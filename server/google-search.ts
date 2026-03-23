/**
 * خدمة البحث عن الصور باستخدام Google Custom Search API
 * تدعم البحث عن صور المنتجات بخلفية بيضاء
 */

interface GoogleSearchResponse {
  items?: Array<{
    link: string;
    image?: {
      thumbnailLink: string;
      width: number;
      height: number;
    };
  }>;
}

interface ImageSearchResult {
  url: string;
  width: number;
  height: number;
  thumbnail: string;
}

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

/**
 * البحث عن الصور باستخدام Google Custom Search API
 */
export async function searchImagesWithGoogle(
  query: string,
  limit: number = 10
): Promise<ImageSearchResult[]> {
  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    console.log("[Google Search] API keys not configured, skipping...");
    return [];
  }

  try {
    console.log(`[Google Search] Searching for: ${query}`);

    const params = new URLSearchParams({
      key: GOOGLE_SEARCH_API_KEY,
      cx: GOOGLE_SEARCH_ENGINE_ID,
      q: query,
      searchType: "image",
      num: Math.min(limit, 10).toString(),
      imgSize: "large",
      imgType: "photo",
      safe: "active",
      fileType: "jpg,png,webp",
    });

    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.error("[Google Search] API error:", response.status);
      return [];
    }

    const data = (await response.json()) as GoogleSearchResponse;

    if (!data.items || data.items.length === 0) {
      console.log("[Google Search] No results found");
      return [];
    }

    const results: ImageSearchResult[] = data.items
      .filter((item) => item.link && item.image)
      .map((item) => ({
        url: item.link,
        width: item.image?.width || 0,
        height: item.image?.height || 0,
        thumbnail: item.image?.thumbnailLink || item.link,
      }))
      .filter((result) => result.url.startsWith("https://"));

    console.log(`[Google Search] Found ${results.length} images`);
    return results;
  } catch (error) {
    console.error("[Google Search] Error:", error);
    return [];
  }
}

/**
 * البحث عن صور المنتجات بخلفية بيضاء
 */
export async function searchProductImages(
  brand: string,
  model: string,
  color?: string
): Promise<string[]> {
  const queries = [
    `${brand} ${model} ${color || ""} product white background`.trim(),
    `${brand} ${model} official product photo white background`,
    `${brand} ${model} site:gsmarena.com OR site:amazon.com OR site:samsung.com`,
    `${brand} ${model} ${color || ""} high resolution product image`,
  ];

  const allResults: string[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    if (allResults.length >= 10) break;
    console.log(`[Product Search] Trying query: ${query}`);
    const results = await searchImagesWithGoogle(query, 5);

    for (const result of results) {
      if (allResults.length >= 10) break;
      if (seenUrls.has(result.url)) continue;
      seenUrls.add(result.url);
      if (result.width >= 400 && result.height >= 400) {
        allResults.push(result.url);
        console.log(`[Product Search] Added image: ${result.url}`);
      }
    }
  }

  return allResults;
}

/**
 * التحقق من أن رابط الصورة صالح ومتاح
 */
export async function verifyImageUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    clearTimeout(timeout);
    if (!response.ok) return false;
    const contentType = response.headers.get("content-type") || "";
    return contentType.startsWith("image/");
  } catch {
    return false;
  }
}

/**
 * الحصول على أفضل صورة للمنتج
 */
export async function getBestProductImage(
  brand: string,
  model: string,
  color?: string
): Promise<string | null> {
  const images = await searchProductImages(brand, model, color);
  if (images.length === 0) return null;

  for (const imageUrl of images) {
    if (await verifyImageUrl(imageUrl)) {
      return imageUrl;
    }
  }
  return null;
}