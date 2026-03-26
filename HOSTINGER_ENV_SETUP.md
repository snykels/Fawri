# 🔧 إعداد المتغيرات البيئية في Hostinger

## ⚠️ ملاحظة مهمة
في Hostinger، لا تقم برفع ملف `.env` إلى السيرفر لأنه سيتم حذفه. بدلاً من ذلك، استخدم واجهة Hostinger لإضافة المتغيرات البيئية.

## 📋 خطوات الإعداد

### 1. اذهب إلى لوحة تحكم Hostinger
1. سجل الدخول إلى حسابك في Hostinger
2. اذهب إلى **Hosting** → اختر موقعك
3. اضغط على **Manage** → **Settings & Redeploy**

### 2. إضافة المتغيرات البيئية
اذهب إلى **Environment Variables** وأضف جميع المتغيرات التالية:

#### 🔵 متغيرات Salla OAuth2 (مطلوبة)
```
SALLA_CLIENT_ID=your_salla_client_id_here
SALLA_CLIENT_SECRET=your_salla_client_secret_here
SALLA_REDIRECT_URI=https://upload.fawri.cloud/api/salla/callback
SALLA_SECRET_KEY=your_salla_secret_key_here
SALLA_WEBHOOK_SECRET=your_salla_webhook_secret_here
```

#### 🟢 متغيرات Google Gemini AI (مطلوبة لتحليل المنتجات)
```
AI_INTEGRATIONS_GEMINI_API_KEY=your_gemini_api_key_here
AI_INTEGRATIONS_GEMINI_BASE_URL=
```

#### 🟡 متغيرات Google Cloud Vision API (مطلوبة لاستخراج النصوص)
```
CLOUD_VISION_API_KEY=your_cloud_vision_api_key_here
```

#### 🔴 متغيرات Google Custom Search API (اختيارية)
```
GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_google_custom_search_engine_id_here
```

#### 🟣 متغيرات رفع الصور (مطلوبة)
```
IMGBB_API_KEY=your_imgbb_api_key_here
```

#### 🟠 متغيرات قاعدة البيانات
```
DATABASE_URL=file:./dev.db
DATABASE_DIR=./fawri_data
```

#### ⚙️ متغيرات السيرفر
```
PORT=3000
NODE_ENV=production
API_BASE_URL=https://upload.fawri.cloud
UPLOAD_DOMAIN=https://upload.fawri.cloud
MAX_IMAGE_SIZE=10485760
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
```

#### 🌐 متغيرات الفرونت إند (Vite)
```
VITE_API_BASE_URL=https://upload.fawri.cloud
VITE_SALLA_AUTH_URL=https://accounts.salla.sa/oauth2/authorize
VITE_SALLA_CLIENT_ID=your_salla_client_id_here
```

### 3. إعادة النشر
بعد إضافة جميع المتغيرات:
1. اضغط على **Redeploy** أو **Rebuild**
2. انتظر حتى يكتمل النشر (2-5 دقائق)
3. تحقق من أن الموقع يعمل بشكل صحيح

## 🔗 URLs المهمة
- **الإنتاج**: https://upload.fawri.cloud
- **OAuth Callback**: https://upload.fawri.cloud/api/salla/callback
- **Webhook**: https://upload.fawri.cloud/api/salla/webhook
- **API Docs**: https://upload.fawri.cloud/api

## 📝 ملاحظات مهمة

### ❌ لا تفعل هذا:
- لا ترفع ملف `.env` إلى المستودع
- لا تضع المفاتيح في الكود مباشرة
- لا تشارك المفاتيح مع أي شخص

### ✅ افعل هذا:
- أضف جميع المتغيرات من خلال واجهة Hostinger
- تأكد من إضافة جميع المفاتيح قبل إعادة النشر
- احفظ نسخة احتياطية من المفاتيح في مكان آمن
- قم بتجديد المفاتيح بشكل دوري

### 🔍 كيفية التحقق من المتغيرات:
1. اذهب إلى **Hostinger** → **Environment Variables**
2. تحقق من وجود جميع المتغيرات المذكورة أعلاه
3. تأكد من عدم وجود أخطاء إملائية في أسماء المتغيرات
4. تأكد من أن القيم صحيحة

## 🆘 استكشاف الأخطاء

### إذا فشل تحليل المنتجات:
1. تحقق من `AI_INTEGRATIONS_GEMINI_API_KEY`
2. تحقق من أن المفتاح صالح وليس منتهي الصلاحية
3. تحقق من حساب Google Cloud لديك

### إذا فشل استخراج النصوص من الصور:
1. تحقق من `CLOUD_VISION_API_KEY`
2. تحقق من تفعيل Cloud Vision API في Google Cloud Console

### إذا فشل رفع الصور:
1. تحقق من `IMGBB_API_KEY`
2. تحقق من أن المفتاح صالح

### إذا فشل تسجيل الدخول بسلة:
1. تحقق من `SALLA_CLIENT_ID` و `SALLA_CLIENT_SECRET`
2. تحقق من أن `SALLA_REDIRECT_URI` يطابق إعدادات التطبيق في سلة
3. تحقق من تفعيل OAuth في تطبيق سلة
