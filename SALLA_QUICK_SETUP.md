# إعداد سريع لتطبيق سلة (Quick Setup)

## المشكلة
التطبيق على سلة ديفلوبر غير موجود (خطأ 404)

## الحل السريع - 3 خطوات فقط!

### الخطوة 1: إنشاء تطبيق على سلة ديفلوبر
1. اذهب إلى: https://developers.salla.sa
2. سجل الدخول بحساب سلة الخاص بك
3. انقر على **"إنشاء تطبيق جديد"**
4. املأ البيانات:
   - **اسم التطبيق**: `Fawri Upload`
   - **رابط الموقع**: `https://upload.fawri.cloud`

### الخطوة 2: إعداد OAuth
1. في صفحة التطبيق، اذهب إلى **"OAuth"**
2. أضف **Callback URL**:
```
https://upload.fawri.cloud/api/salla/callback
```
3. اختر الصلاحيات:
   - ✅ products.read
   - ✅ products.write
4. احفظ

### الخطوة 3: نسخ البيانات وتحديث .env
1. انسخ **Client ID** و **Client Secret** من صفحة التطبيق
2. افتح ملف `.env` في مشروعك
3. حدث القيم:
```env
SALLA_CLIENT_ID="الـ Client ID الجديد"
SALLA_CLIENT_SECRET="الـ Client Secret الجديد"
SALLA_SECRET_KEY="الـ Secret Key الجديد"
```

## بعد الإعداد - اختبار

1. أعد تشغيل الخادم:
```bash
npm run dev
```

2. نفذ الاختبار:
```bash
npx tsx test-salla-oauth-flow.ts
```

3. افتح الرابط المعروض في المتصفح
4. سجل الدخول ووافق
5. جرب نشر منتج:
```bash
npx tsx test-salla-publish.ts
```

## ⚠️ ملاحظات مهمة

- تأكد من أن **Client ID** في ملف `.env` يطابق الذي في سلة ديفلوبر
- تأكد من أن **Callback URL** مسجل في التطبيق
- إذا ظهر خطأ 404، فالتطبيق غير موجود أو غير مُفعّل

## 🔗 روابط مفيدة

- [سلة ديفلوبر](https://developers.salla.sa)
- [دليل إعداد التطبيق الكامل](SALLA_APP_SETUP_GUIDE.md)

---

**مجرد ما تسوي هالخطوات 3، التكامل بيشتغل 100%! 🚀**