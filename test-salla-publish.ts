/**
 * سكريبت اختبار نشر منتج على سلة
 * 
 * كيفية الاستخدام:
 * 1. تأكد من تشغيل الخادم: npm run dev
 * 2. نفذ السكريبت: npx tsx test-salla-publish.ts
 */

import 'dotenv/config';

const BASE_URL = process.env.TEST_BASE_URL || 'https://upload.fawri.cloud';

interface PublishResult {
  success: boolean;
  data?: any;
  error?: string;
}

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

async function testPublishToSalla(): Promise<PublishResult> {
  try {
    log('\n========================================', 'info');
    log('اختبار نشر منتج على سلة', 'info');
    log('========================================\n', 'info');

    // بيانات المنتج التجريبي
    const productData = {
      productName: "هاتف سامسونج جالكسي S24 الترا، 256 جيجا، 12 جيجا رام - أسود",
      frontImage: "", // اختياري - base64
      backImage: ""   // اختياري - base64
    };

    log(`اسم المنتج: ${productData.productName}`, 'info');
    log(`URL: ${BASE_URL}/api/publish-to-salla`, 'info');
    log('جاري النشر على سلة...\n', 'info');

    const response = await fetch(`${BASE_URL}/api/publish-to-salla`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      log('✅ تم النشر بنجاح!', 'success');
      log('\nتفاصيل المنتج:', 'info');
      log(`  - اسم المنتج: ${result.data?.productName}`, 'info');
      log(`  - عنوان SEO: ${result.data?.seoTitle}`, 'info');
      log(`  - SKU: ${result.data?.sku}`, 'info');
      log(`  - الباركود: ${result.data?.barcode}`, 'info');
      log(`  - معرف المنتج في سلة: ${result.data?.sallaProductId || 'غير محدد'}`, 'info');
      log(`  - عدد الصور: ${result.data?.images?.length || 0}`, 'info');
      
      if (result.data?.description) {
        const shortDesc = result.data.description.substring(0, 150);
        log(`  - الوصف: ${shortDesc}...`, 'info');
      }

      return { success: true, data: result.data };
    } else {
      log(`❌ فشل النشر`, 'error');
      log(`السبب: ${result.error || 'خطأ غير معروف'}`, 'error');
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    log(`❌ خطأ في الاتصال`, 'error');
    log(`السبب: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function testGenerateContent(): Promise<PublishResult> {
  try {
    log('\n========================================', 'info');
    log('اختبار توليد محتوى المنتج', 'info');
    log('========================================\n', 'info');

    const productData = {
      productName: "سماعات بلوتوث JBL تيون 520 BT - أسود",
      ocrText: "" // اختياري
    };

    log(`اسم المنتج: ${productData.productName}`, 'info');
    log(`URL: ${BASE_URL}/api/generate-content`, 'info');
    log('جاري توليد المحتوى...\n', 'info');

    const response = await fetch(`${BASE_URL}/api/generate-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      log('✅ تم توليد المحتوى بنجاح!', 'success');
      log('\nتفاصيل المنتج:', 'info');
      log(`  - اسم المنتج: ${result.data?.productName}`, 'info');
      log(`  - عنوان SEO: ${result.data?.seoTitle}`, 'info');
      log(`  - الماركة: ${result.data?.brand}`, 'info');
      log(`  - التصنيف: ${result.data?.category}`, 'info');
      log(`  - SKU: ${result.data?.sku}`, 'info');
      log(`  - الباركود: ${result.data?.barcode}`, 'info');
      log(`  - عدد الصور: ${result.data?.images?.length || 0}`, 'info');

      return { success: true, data: result.data };
    } else {
      log(`❌ فشل توليد المحتوى`, 'error');
      log(`السبب: ${result.error || 'خطأ غير معروف'}`, 'error');
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    log(`❌ خطأ في الاتصال`, 'error');
    log(`السبب: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n🚀 بدء اختبارات النشر على سلة\n', 'info');

  // اختبار 1: نشر منتج كامل على سلة
  const publishResult = await testPublishToSalla();

  // اختبار 2: توليد محتوى فقط
  const generateResult = await testGenerateContent();

  // ملخص النتائج
  log('\n========================================', 'info');
  log('ملخص النتائج', 'info');
  log('========================================\n', 'info');

  log(`1. نشر منتج على سلة: ${publishResult.success ? '✅ نجح' : '❌ فشل'}`, publishResult.success ? 'success' : 'error');
  log(`2. توليد محتوى: ${generateResult.success ? '✅ نجح' : '❌ فشل'}`, generateResult.success ? 'success' : 'error');

  const successCount = [publishResult.success, generateResult.success].filter(Boolean).length;
  log(`\nالإجمالي: ${successCount}/2 نجح`, successCount === 2 ? 'success' : 'error');

  // توصيات
  if (successCount === 2) {
    log('\n🎉 ممتاز! النشر على سلة يعمل بشكل صحيح!', 'success');
    log('\nيمكنك الآن:', 'info');
    log('1. استخدام أداة Fawri لتحليل صور المنتجات', 'info');
    log('2. النشر التلقائي على متجر سلة', 'info');
    log('3. مراقبة المنتجات من خلال لوحة تحكم سلة', 'info');
  } else {
    log('\n⚠️ هناك بعض المشاكل:', 'error');
    if (!publishResult.success) {
      log(`- نشر المنتج: ${publishResult.error}`, 'error');
    }
    if (!generateResult.success) {
      log(`- توليد المحتوى: ${generateResult.error}`, 'error');
    }
  }

  log('\n🔗 روابط مفيدة:', 'info');
  log('- لوحة تحكم سلة: https://developers.salla.sa', 'info');
  log('- API Documentation: https://docs.salla.sa/api', 'info');
}

// تشغيل الاختبارات
runTests().catch(error => {
  log(`\n❌ خطأ في تشغيل الاختبارات: ${error.message}`, 'error');
  process.exit(1);
});