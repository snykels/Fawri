/**
 * سكريبت اختبار تدفق OAuth لسلة
 * 
 * هذا السكريبت يساعد في اختبار تدفق OAuth الكامل
 * 
 * كيفية الاستخدام:
 * 1. تأكد من تشغيل الخادم: npm run dev
 * 2. نفذ السكريبت: npx tsx test-salla-oauth-flow.ts
 */

const BASE_URL = 'http://localhost:3000';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function getAuthUrl(): Promise<string | null> {
  try {
    console.log('\n📋 الخطوة 1: جلب رابط التفويض...');
    
    // أولاً، نحتاج لتسجيل الدخول كأدمن
    const loginResponse = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });

    if (!loginResponse.ok) {
      console.error('❌ فشل تسجيل الدخول كأدمن');
      return null;
    }

    // الحصول على الكوكيز من الاستجابة
    const cookies = loginResponse.headers.get('set-cookie');
    
    // جلب رابط التفويض
    const authResponse = await fetch(`${BASE_URL}/api/salla/auth-url`, {
      headers: cookies ? { 'Cookie': cookies } : {}
    });

    const authData = await authResponse.json();
    
    if (authData.success) {
      console.log('✅ تم جلب رابط التفويض بنجاح');
      console.log(`\n🔗 رابط التفويض:\n${authData.authUrl}\n`);
      return authData.authUrl;
    } else {
      console.error('❌ فشل جلب رابط التفويض:', authData.message);
      return null;
    }
  } catch (error: any) {
    console.error('❌ خطأ:', error.message);
    return null;
  }
}

async function simulateOAuthCallback(code: string): Promise<boolean> {
  try {
    console.log('\n📋 الخطوة 2: محاكاة استدعاء Callback...');
    
    const response = await fetch(`${BASE_URL}/api/salla/callback?code=${code}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ تم تبادل الكود بالتوكنات بنجاح');
      return true;
    } else {
      console.error('❌ فشل تبادل الكود:', data.message);
      return false;
    }
  } catch (error: any) {
    console.error('❌ خطأ:', error.message);
    return false;
  }
}

async function testPublishAfterAuth(): Promise<void> {
  try {
    console.log('\n📋 الخطوة 3: اختبار النشر بعد التفويض...');
    
    const productData = {
      productName: "هاتف سامسونج جالكسي S24 الترا، 256 جيجا، 12 جيجا رام - أسود"
    };

    const response = await fetch(`${BASE_URL}/api/publish-to-salla`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ تم النشر بنجاح!');
      console.log('\n📊 تفاصيل المنتج:');
      console.log(`  - الاسم: ${result.data?.productName}`);
      console.log(`  - عنوان SEO: ${result.data?.seoTitle}`);
      console.log(`  - SKU: ${result.data?.sku}`);
      console.log(`  - الباركود: ${result.data?.barcode}`);
      console.log(`  - معرف المنتج في سلة: ${result.data?.sallaProductId || 'غير محدد'}`);
    } else {
      console.error('❌ فشل النشر:', result.error);
    }
  } catch (error: any) {
    console.error('❌ خطأ:', error.message);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 اختبار تدفق OAuth لسلة');
  console.log('='.repeat(60));

  // الخطوة 1: جلب رابط التفويض
  const authUrl = await getAuthUrl();
  
  if (!authUrl) {
    console.log('\n❌ لا يمكن المتابعة بدون رابط التفويض');
    process.exit(1);
  }

  // في التطبيق الحقيقي، المستخدم يزور الرابط ويوافق
  // هنا نحتاج الكود من المستخدم
  console.log('\n⚠️  ملاحظة مهمة:');
  console.log('في التطبيق الحقيقي، يجب عليك:');
  console.log('1. زيارة رابط التفويض أعلاه');
  console.log('2. تسجيل الدخول إلى حساب سلة');
  console.log('3. الموافقة على تفويض التطبيق');
  console.log('4. سيتم تحويلك تلقائياً إلى صفحة Callback');
  console.log('5. سيتم حفظ التوكنات تلقائياً');
  
  console.log('\n📝 للاختبار اليدوي:');
  console.log(`1. افتح الرابط: ${authUrl}`);
  console.log('2. سجل الدخول ووافق');
  console.log('3. انسخ الكود من الرابط المحوّل إليه');
  console.log('4. شغّل السكريبت مرة أخرى مع الكود:');
  console.log('   npx tsx test-salla-oauth-flow.ts <CODE>');
  
  // إذا تم تمرير كود، نحاول تبادله
  const code = process.argv[2];
  if (code) {
    console.log(`\n🔄 جاري تبادل الكود: ${code}`);
    const success = await simulateOAuthCallback(code);
    
    if (success) {
      // اختبار النشر
      await testPublishAfterAuth();
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ انتهى الاختبار');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('\n❌ خطأ في تشغيل السكريبت:', error.message);
  process.exit(1);
});