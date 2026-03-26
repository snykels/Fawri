# 🔧 إعداد المتغيرات البيئية في Hostinger

## ⚠️ ملاحظة مهمة
في Hostinger، لا تقم برفع ملف `.env` إلى السيرفر لأنه سيتم حذفه. بدلاً من ذلك، استخدم واجهة Hostinger لإضافة المتغيرات البيئية.

## 📋 خطوات الإعداد

### 1. اذهب إلى لوحة تحكم Hostinger
1. سجل الدخول إلى حسابك في Hostinger
2. اذهب إلى **Hosting** → اختر موقعك
3. اضغط على **Manage** → **Settings & Redeploy**

### 2. إضافة المتغيرات البيئية
اذهب إلى **Environment Variables** وأضف المتغيرات التالية:

#### متغيرات Google APIs
```
AI_INTEGRATIONS_GEMINI_API_KEY=your_gemini_api_key
AI_INTEGRATIONS_GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
CLOUD_VISION_API_KEY=your_cloud_vision_api_key
```

#### متغيرات Salla OAuth2
```
SALLA_CLIENT_ID=your_salla_client_id
SALLA_SECRET_KEY=your_salla_secret_key
SALLA_REDIRECT_URI=https://upload.fawri.cloud/api/salla/callback
```

#### متغيرات رفع الصور
```
IMGBB_API_KEY=your_imgbb_api_key
```

#### متغيرات قاعدة البيانات (اختياري)
```
DATABASE_URL=sqlite:./fawri.db
```

### 3. إعادة النشر
بعد إضافة جميع المتغيرات:
1. اضغط على **Redeploy** أو **Rebuild**
2. انتظر حتى يكتمل النشر
3. تحقق من أن الموقع يعمل بشكل صحيح

## 🔗 URLs المهمة
- الإنتاج: https://upload.fawri.cloud
- OAuth Callback: https://upload.fawri.cloud/api/salla/callback
- Webhook: https://upload.fawri.cloud/api/salla/webhook

## 📝 ملاحظات
- لا تقم برفع ملف `.env` إلى المستودع
- المتغيرات البيئية يتم إضافتها من خلال واجهة Hostinger فقط
- تأكد من إضافة جميع المتغيرات قبل إعادة النشر
- يمكنك التحقق من المتغيرات من خلال واجهة Hostinger