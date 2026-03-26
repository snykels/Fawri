/**
 * سكريبت اختبار تكامل سلة (OAuth و Webhook)
 * 
 * كيفية الاستخدام:
 * 1. تأكد من تشغيل الخادم: npm run dev
 * 2. نفذ السكريبت: npx tsx test-salla-integration.ts
 */

const BASE_URL = process.env.TEST_BASE_URL || 'https://upload.fawri.cloud';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

async function testEndpoint(name: string, url: string, options?: RequestInit): Promise<TestResult> {
  try {
    log(`Testing: ${name}`, 'info');
    log(`URL: ${url}`, 'info');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();
    
    if (response.ok) {
      log(`Success: ${JSON.stringify(data).substring(0, 100)}...`, 'success');
      return { name, success: true, message: 'Success', data };
    } else {
      log(`Failed: ${response.status} - ${JSON.stringify(data)}`, 'error');
      return { name, success: false, message: `HTTP ${response.status}`, data };
    }
  } catch (error: any) {
    log(`Error: ${error.message}`, 'error');
    return { name, success: false, message: error.message };
  }
}

async function runTests() {
  log('='.repeat(60), 'info');
  log('بدء اختبار تكامل سلة (OAuth و Webhook)', 'info');
  log('='.repeat(60), 'info');

  // 1. اختبار جلب رابط التفويض
  results.push(await testEndpoint(
    'جلب رابط التفويض (OAuth Authorization URL)',
    `${BASE_URL}/api/salla/auth-url`
  ));

  // 2. اختبار Webhook الرئيسي
  results.push(await testEndpoint(
    'استقبال Webhook (app.install)',
    `${BASE_URL}/api/salla/webhook`,
    {
      method: 'POST',
      body: JSON.stringify({
        event: 'app.install',
        merchant: {
          id: 12345,
          name: 'متجر تجريبي للاختبار'
        },
        data: {
          app_id: 'test_app_123'
        },
        created_at: new Date().toISOString(),
        id: `test_install_${Date.now()}`
      })
    }
  ));

  // 3. اختبار Webhook إنشاء منتج
  results.push(await testEndpoint(
    'استقبال Webhook (product.create)',
    `${BASE_URL}/api/salla/webhook`,
    {
      method: 'POST',
      body: JSON.stringify({
        event: 'product.create',
        merchant: {
          id: 12345,
          name: 'متجر تجريبي للاختبار'
        },
        data: {
          id: 999,
          name: 'منتج تجريبي للاختبار',
          price: { amount: 100, currency: 'SAR' },
          sku: 'TEST-SKU-001'
        },
        created_at: new Date().toISOString(),
        id: `test_product_${Date.now()}`
      })
    }
  ));

  // 4. اختبار Webhook إنشاء طلب
  results.push(await testEndpoint(
    'استقبال Webhook (order.create)',
    `${BASE_URL}/api/salla/webhook`,
    {
      method: 'POST',
      body: JSON.stringify({
        event: 'order.create',
        merchant: {
          id: 12345,
          name: 'متجر تجريبي للاختبار'
        },
        data: {
          id: 888,
          reference_id: 'ORD-2026-001',
          total: { amount: 250, currency: 'SAR' },
          status: 'pending'
        },
        created_at: new Date().toISOString(),
        id: `test_order_${Date.now()}`
      })
    }
  ));

  // 5. اختبار API اختبار Webhook
  results.push(await testEndpoint(
    'اختبار Webhook عبر API المخصص',
    `${BASE_URL}/api/salla/webhook/test`,
    {
      method: 'POST',
      body: JSON.stringify({
        event: 'product.update',
        data: {
          id: 777,
          name: 'منتج محدث للاختبار',
          price: { amount: 150, currency: 'SAR' }
        }
      })
    }
  ));

  // طباعة النتائج
  log('='.repeat(60), 'info');
  log('ملخص النتائج', 'info');
  log('='.repeat(60), 'info');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    const status = result.success ? 'نجح' : 'فشل';
    log(`${index + 1}. ${icon} ${result.name}: ${status}`, result.success ? 'success' : 'error');
    if (!result.success) {
      log(`   السبب: ${result.message}`, 'error');
    }
  });

  log('-'.repeat(60), 'info');
  log(`الإجمالي: ${results.length} اختبار`, 'info');
  log(`نجح: ${successCount}`, 'success');
  log(`فشل: ${failCount}`, failCount > 0 ? 'error' : 'success');
  log('-'.repeat(60), 'info');

  // توصيات
  log('توصيات:', 'info');
  log('1. تأكد من إضافة Webhook URL في لوحة تحكم سلة:', 'info');
  log(`   ${BASE_URL}/api/salla/webhook`, 'info');
  log('2. تأكد من إعداد متغيرات البيئة التالية:', 'info');
  log('   - SALLA_CLIENT_ID', 'info');
  log('   - SALLA_CLIENT_SECRET', 'info');
  log('   - SALLA_REDIRECT_URI', 'info');
  log('   - SALLA_SECRET_KEY', 'info');
  log('3. لاختبار OAuth الكامل، قم بزيارة:', 'info');
  log(`   ${BASE_URL}/api/salla/auth-url`, 'info');
  log('4. لمراقبة أحداث Webhook، قم بزيارة:', 'info');
  log(`   ${BASE_URL}/api/admin/webhook-events (يتطلب تسجيل دخول)`, 'info');

  // روابط مفيدة
  log('روابط مفيدة:', 'info');
  log('- سلة ديفلوبر: https://developers.salla.sa', 'info');
  log('- توثيق Webhooks: https://docs.salla.sa/webhooks', 'info');
  log('- توثيق OAuth: https://docs.salla.sa/oauth', 'info');
}

// تشغيل الاختبارات
runTests().catch(error => {
  log(`خطأ في تشغيل الاختبارات: ${error.message}`, 'error');
  process.exit(1);
});