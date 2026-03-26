/**
 * سكريبت لإنشاء جدول salla_webhook_events في قاعدة البيانات
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.resolve(process.env.DATABASE_DIR || path.resolve(process.cwd(), "fawri_data"), "sqlite.db");

console.log(`Database path: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.error("Database file not found!");
  process.exit(1);
}

const db = new Database(dbPath);

// إنشاء جدول salla_webhook_events
const createTableSQL = `
CREATE TABLE IF NOT EXISTS salla_webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id TEXT,
  event_type TEXT NOT NULL,
  event_id TEXT,
  payload TEXT,
  processed INTEGER DEFAULT 0 NOT NULL,
  processed_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
`;

try {
  db.exec(createTableSQL);
  console.log("✅ Table salla_webhook_events created successfully!");
  
  // التحقق من إنشاء الجدول
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("\nTables in database:");
  tables.forEach((table: any) => console.log(`  - ${table.name}`));
  
} catch (error) {
  console.error("❌ Error creating table:", error);
} finally {
  db.close();
}