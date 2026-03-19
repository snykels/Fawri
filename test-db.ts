import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./shared/schema";
import { desc } from "drizzle-orm";
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite, { schema });
try {
  const products = db.select().from(schema.uploadedProducts).orderBy(desc(schema.uploadedProducts.uploadedAt)).all();
  console.log("Success:", products.length);
} catch (e: any) {
  console.log("Error object:", e);
  console.log("Error message:", e.message);
}
