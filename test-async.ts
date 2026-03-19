import { db } from './server/db';
import * as schema from './shared/schema';
async function test() {
  try {
    const res = await db.select().from(schema.uploadedProducts);
    console.log("Success:", res);
  } catch(e: any) {
    console.log("Error:", e.message);
  }
}
test();
