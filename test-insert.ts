import { db } from './server/db';
import * as schema from './shared/schema';
async function test() {
  try {
    const inserted = await db.insert(schema.uploadedProducts).values({
      productName: "Test Product",
      sku: "TEST-SKU",
      barcode: "123456789",
      productData: { name: "Test" }
    }).returning();
    console.log("Success:", inserted[0].id);
  } catch(e: any) {
    console.log("Insert Error:", e.message);
  }
}
test();
