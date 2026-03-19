import { db } from './server/db';
import * as schema from './shared/schema';
import { desc } from 'drizzle-orm';
async function test() {
  try {
    const res = await db.select().from(schema.uploadedProducts).orderBy(desc(schema.uploadedProducts.uploadedAt));
    console.log("Success:", res.length);
  } catch(e: any) {
    console.log("Error object:", e);
    console.log("Error message:", e.message);
  }
}
test();
