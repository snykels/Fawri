# دليل إعداد تطبيق سلة (Salla App Setup Guide)

## ⚠️ المشكلة الحالية

عند فتح رابط التفويض، يظهر خطأ 404 لأن التطبيق على سلة ديفلوبر غير مُعدّ بشكل صحيح.

## 📋 خطوات إعداد التطبيق على سلة ديفلوبر

### الخطوة 1: إنشاء حساب مطور
1. اذهب إلى [سلة ديفلوبر](https://developers.salla.sa)
2. سجل الدخول أو أنشئ حساب جديد
3. اذهب إلى لوحة التحكم

### الخطوة 2: إنشاء تطبيق جديد
1. انقر على "إنشاء تطبيق جديد"
2. املأ البيانات التالية:
   - **اسم التطبيق**: Fawri Upload
   - **وصف التطبيق**: أداة ذكية لإنشاء ونشر المنتجات على سلة
   - **رابط الموقع**: https://upload.fawri.cloud
   - **رابط الدعم**: https://upload.fawri.cloud

### الخطوة 3: إعداد OAuth
1. في صفحة إعدادات التطبيق، اذهب إلى قسم "OAuth"
2. أضف **رابط الإعادة التالية (Callback URL)**:
```
https://upload.fawri.cloud/api/salla/callback
```
3. اختر **الصلاحيات (Scopes)**:
   - ✅ products.read
   - ✅ products.write
   - ✅ orders.read (اختياري)
   - ✅ store.read

4. احفظ التغييرات

### الخطوة 4: الحصول على بيانات الاعتماد
بعد إنشاء التطبيق، ستحصل على:
- **Client ID** (معرف العميل)
- **Client Secret** (سر العميل)

### الخطوة 5: تحديث ملف .env
حدث ملف `.env` بالبيانات الجديدة:

```env
SALLA_CLIENT_ID="الـ Client ID الجديد"
SALLA_CLIENT_SECRET="الـ Client Secret الجديد"
```

### الخطوة 6: (اختياري) إعداد Webhook
1. في صفحة إعدادات التطبيق، اذهب إلى قسم "Webhooks"
2. أضف **Webhook URL**:
```
https://upload.fawri.cloud/api/salla/webhook
```
3. اختر الأحداث:
   - ✅ app.install
   - ✅ app.uninstall
   - ✅ product.create
   - ✅ product.update
   - ✅ order.create
   - ✅ order.update

4. احفظ **Secret Alerts Key** وحدث ملف `.env`:
```env
SALLA_WEBHOOK_SECRET="الـ Secret Alerts Key"
```

## 🔍 التحقق من الإعداد

### اختبار 1: التحقق من Client ID
```bash
curl -s "https://accounts.salla.sa/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://upload.fawri.cloud/api/salla/callback&response_type=code&scope=products.read+products.write"
```

إذا ظهرت صفحة تسجيل الدخول في سلة، فالإعداد صحيح.

### اختبار 2: اختبار محلي
1. شغّل الخادم:
```bash
npm run dev
```

2. نفذ سكريبت الاختبار:
```bash
npx tsx test-salla-oauth-flow.ts
```

3. افتح الرابط المعروض في المتصفح

## ⚠️ ملاحظات مهمة

### 1. Client ID غير صحيح
الـ Client ID الحالي في ملف `.env`:
```
2e07dd96-250d-477f-baff-2b2b7ed9f4e7
```

لكن الكود يستخدم Client ID آخر كـ fallback:
```
3b98cad1-c0ea-415c-9a98-f9288cc95365
```

**الحل**: تأكد من أن Client ID في ملف `.env` مطابق للذي في سلة ديفلوبر.

### 2. Redirect URI غير مسجل
يجب أن يكون الـ Redirect URI مسجلاً في التطبيق على سلة:
```
https://upload.fawri.cloud/api/salla/callback
```

### 3. التطبيق غير مُفعّل
بعد إنشاء التطبيق، يجب:
- تفعيل التطبيق في سلة ديفلوبر
- الموافقة على شروط الاستخدام
- الانتظار حتى يتم مراجعة التطبيق (للتطبيقات العامة)

## 🛠️ استكشاف الأخطاء

### خطأ 404 عند فتح رابط التفويض
**السبب**: التطبيق غير موجود أو غير مُفعّل
**الحل**: 
1. تحقق من صحة Client ID
2. تأكد من تفعيل التطبيق في سلة ديفلوبر

### خطأ "Invalid redirect_uri"
**السبب**: الـ Redirect URI غير مسجل في التطبيق
**الحل**: أضف الـ Redirect URI في إعدادات OAuth

### خطأ "Invalid client"
**السبب**: Client ID أو Client Secret غير صحيح
**الحل**: تحقق من البيانات في ملف `.env`

## 📞 الدعم الفني

إذا واجهت مشاكل:
1. تحقق من [توثيق سلة](https://docs.salla.sa)
2. راسل دعم سلة ديفلوبر
3. راجع logs الخادم للأخطاء

## 🔗 روابط مفيدة

- [سلة ديفلوبر](https://developers.salla.sa)
- [توثيق OAuth](https://docs.salla.sa/oauth)
- [توثيق Webhooks](https://docs.salla.sa/webhooks)
- [API سلة](https://docs.salla.sa/api)

---

**ملاحظة**: هذا الدليل مخصص للاختبار المحلي. للنشر في الإنتاج، يجب استخدام HTTPS ونطاق حقيقي.