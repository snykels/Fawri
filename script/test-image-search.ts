import { image_search } from "duckduckgo-images-api";

async function verifyImage(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        console.log(`Verifying (HEAD): ${url}`);
        let response = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "image/*,*/*;q=0.8",
            },
        });

        if (!response.ok) {
            console.log(`HEAD failed (${response.status}), trying GET...`);
            response = await fetch(url, {
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
        const contentType = response.headers.get("content-type") || "";
        const isValid = response.ok && contentType.startsWith("image/");
        console.log(`Result: ${isValid ? "VALID" : "INVALID"} (${contentType})`);
        return isValid;
    } catch (e: any) {
        console.log(`Error: ${e.message}`);
        return false;
    }
}

async function manualDuckDuckGoSearch(query: string): Promise<string[]> {
    try {
        console.log(`[Manual Search] Attempting direct fetch for: ${query}`);
        const mainPageRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iar=images&iax=images&ia=images`);
        const mainPageText = await mainPageRes.text();
        const vqdMatch = mainPageText.match(/vqd=['\"]([^'\"]+)['\"]/);
        const vqd = vqdMatch ? vqdMatch[1] : null;

        if (!vqd) {
            console.log("[Manual Search] Could not find vqd token.");
            return [];
        }

        const res = await fetch(`https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqd}`);
        const data = await res.json() as any;

        if (data.results && Array.isArray(data.results)) {
            return data.results.map((r: any) => r.image).filter(Boolean);
        }
        return [];
    } catch (error) {
        console.error("[Manual Search] Error:", error);
        return [];
    }
}

async function test() {
    const query = "iphone official white background product";
    console.log(`Searching for: ${query}`);

    let results = [];
    try {
        results = await image_search({ query, moderate: true, iterations: 1 });
    } catch (e) {
        console.log("Library threw an error, using manual fallback...");
    }

    if (!results || results.length === 0) {
        console.log("Library returned no results, using manual fallback...");
        results = await manualDuckDuckGoSearch(query);
    }

    if (!results || results.length === 0) {
        console.log("No results found.");
        return;
    }

    const validImages = [];
    // Convert to strings for verification if they are objects from the library
    const urls = results.map((r: any) => typeof r === 'string' ? r : r.image);

    for (const url of urls.slice(0, 5)) {
        if (url && url.startsWith("https://")) {
            const ok = await verifyImage(url);
            if (ok) validImages.push(url);
        }
    }

    console.log("\nSummary:");
    console.log(`Total valid images found: ${validImages.length}`);
    validImages.forEach((img, i) => console.log(`${i + 1}: ${img}`));
}

test();
