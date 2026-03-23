import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

// Manually load .env file
console.log("APP STARTING...");

// Hardcoded persistent absolute path for Hostinger environment with local fallback
const APP_ROOT = process.env.DATABASE_DIR || path.resolve(process.cwd(), "fawri_data");
console.log("APP_ROOT:", APP_ROOT);
console.log("process.cwd():", process.cwd());

// Ensure the directory exists
if (!fs.existsSync(APP_ROOT)) {
  console.log("Creating APP_ROOT directory...");
  fs.mkdirSync(APP_ROOT, { recursive: true });
}

const envPath = path.resolve(APP_ROOT, ".env");
console.log("Checking for .env at:", envPath);

if (fs.existsSync(envPath)) {
  console.log(".env file FOUND, loading...");
  const envConfig = fs.readFileSync(envPath, "utf-8");
  envConfig.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, ""); // Remove quotes if present
      process.env[key] = value;
      console.log(`Loaded ${key} from .env`);
    }
  });
} else {
  console.log(".env file NOT FOUND at:", envPath);
}

// Manual database initialization for production environments
const dbPath = path.resolve(APP_ROOT, "sqlite.db");
console.log("Initializing database at:", dbPath);
const sqliteInit = new Database(dbPath);

sqliteInit.exec(`
  CREATE TABLE IF NOT EXISTS uploaded_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    sku TEXT,
    barcode TEXT,
    front_image_url TEXT,
    back_image_url TEXT,
    is_synced INTEGER DEFAULT 0 NOT NULL,
    uploaded_at INTEGER NOT NULL,
    synced_at INTEGER,
    product_data TEXT,
    salla_product_id TEXT
  );

  CREATE TABLE IF NOT EXISTS salla_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
`);
console.log("Database initialized successfully.");
sqliteInit.close();

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '15mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '15mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5001", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
