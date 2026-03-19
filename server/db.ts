import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "sqlite.db");
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
