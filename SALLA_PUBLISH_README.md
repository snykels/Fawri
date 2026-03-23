# نظام النشر المباشر على سلة - Fawri

## نظرة عامة

نظام متكامل للنشر التلقائي للمنتجات على متجر سلة باستخدام الذكاء الاصطناعي. يقوم النظام تلقائياً بـ:
- تحليل النصوص من الصور (OCR)
- البحث عن صور المنتجات بخلفية بيضاء
- توليد أوصاف احترافية للمنتجات
- النشر المباشر على متجر سلة

## الميزات الرئيسية

### 1. تحليل النصوص (OCR)
- استخدام Google Cloud Vision API
- استخراج النصوص من صور المنتجات
- تحديد الموديل والباركود تلقائياً

### 2. البحث عن الصور
- البحث عبر Google Custom Search API
- البحث عبر DuckDuckGo (بديل مجاني)
- البحث عبر Bing و Google
- تصفية الصور غير المناسبة
- التحقق من جودة الصور

### 3. توليد المحتوى (AI)
- استخدام Gemini API
- برومبت احترافي محسن للمنتجات الإلكترونية
- دعم اللغة العربية والإنجليزية
- تحسين SEO تلقائي
- تنسيق HTML جاهز للنشر

### 4. النشر على سلة
- تكامل مباشر مع Salla API v2
- تحديث التوكن التلقائي (Refresh Token)
- حفظ المنتجات في قاعدة البيانات
- ربط الصور تلقائياً

## التثبيت والإعداد

### 1. تثبيت المتطلبات

```bash
npm install
```

### 2. إعداد متغيرات البيئة

انسخ ملف `.env.example` إلى `.env` واملأ البيانات:

```bash
cp .env.example .env
```

### 3. متغيرات البيئة المطلوبة

```env
# Google Cloud Vision API
CLOUD_VISION_API_KEY=your_key_here

# Gemini API
AI_INTEGRATIONS_GEMINI_API_KEY=your_key_here

# Google Custom Search (اختياري)
GOOGLE_SEARCH_API_KEY=your_key_here
GOOGLE_SEARCH_ENGINE_ID=your_id_here

# Salla API
SALLA_CLIENT_ID=your_client_id
SALLA_SECRET_KEY=your_secret_key
SALLA_REDIRECT_URI=https://yourdomain.com/api/salla/callback

# ImgBB API (لرفع الصور)
IMGBB_API_KEY=your_key_here
```

### 4. تشغيل التطبيق

```bash
# وضع التطوير
npm run dev

# وضع الإنتاج
npm run build
npm start
```

## APIs المتوفرة

### 1. النشر المباشر على سلة

```http
POST /api/publish-to-salla
Content-Type: application/json

{
  "productName": "شاومي ريدمي 15 سي، 128 جيجابايت، 6 جيجا رام - أزرق",
  "frontImage": "base64_image_data (اختياري)",
  "backImage": "base64_image_data (اختياري)"
}
```

**الاستجابة:**
```json
{
  "success": true,
  "data": {
    "productName": "شاومي ريدمي 15 سي، 128 جيجا بايت، 6 جيجا رام - أزرق",
    "seoTitle": "Xiaomi Redmi 15C - هاتف ذكي 128GB",
    "description": "<h3>...</h3><p>...</p>",
    "sku": "SKU-12345678",
    "barcode": "1234567890123",
    "images": ["https://...", "https://..."],
    "sallaProductId": "12345"
  },
  "message": "تم نشر المنتج على سلة بنجاح"
}
```

### 2. توليد المحتوى فقط (بدون نشر)

```http
POST /api/generate-content
Content-Type: application/json

{
  "productName": "شاومي ريدمي 15 سي",
  "ocrText": "النص المستخرج من الصورة (اختياري)"
}
```

### 3. التحقق من صلاحية التوكن

```http
GET /api/salla/auth-url
Authorization: Bearer admin_session
```

### 4. callback OAuth2

```http
GET /api/salla/callback?code=xxx&state=yyy
```

## استخدام الواجهة

### صفحة النشر المباشر

1. اذهب إلى `/publish`
2. أدخل اسم المنتج بالتفصيل
3. (اختياري) ارفع صورة المنتج الأمامية والخلفية
4. اضغط "نشر على سلة" أو "توليد المحتوى فقط"

**مثال لاسم المنتج:**
```
شاومي ريدمي 15 سي، 128 جيجابايت، 6 جيجا رام - أزرق
```

## هيكل المشروع

```
server/
├── routes.ts              # نقاط نهاية API
├── salla-publisher.ts     # خدمة النشر على سلة
├── salla-oauth.ts         # خدمة OAuth2 لسلة
├── google-search.ts       # خدمة البحث عن الصور
├── prompts.ts             # البرومبتات للذكاء الاصطناعي
└── db.ts                  # قاعدة البيانات

client/src/
├── pages/
│   ├── publish.tsx        # صفحة النشر المباشر
│   ├── home.tsx           # الصفحة الرئيسية
│   └── admin.tsx          # لوحة الإدارة
└── App.tsx                # التوجيهات
```

## قاعدة البيانات

### جدول المنتجات
```sql
uploaded_products
├── id
├── product_name
├── sku
├── barcode
├── front_image_url
├── back_image_url
├── is_synced
├── synced_at
├── product_data (JSON)
└── salla_product_id
```

### جدول التوكنات
```sql
salla_tokens
├── id
├── merchant_id
├── access_token
├── refresh_token
├── expires_at
└── created_at
```

## البرومبت المستخدم

النظام يستخدم برومبت احترافي محسن يدعم:
- الهواتف الذكية
- الأجهزة اللوحية
- الساعات الذكية
- سماعات بلوتوث
- شواحن وبطاريات
- كابلات ومحولات
- أجهزة كمبيوتر محمولة
- أجهزة ألعاب

**هيكلية الوصف:**
1. عنوان جذاب مع الفائدة الرئيسية
2. وصف تسويقي مختصر (50-100 كلمة)
3. وصف تفصيلي HTML (200-500 كلمة)
4. المواصفات التفصيلية
5. محتويات العلبة
6. تعليمات الاستخدام
7. فيديو المراجعة الرسمي (إن وجد)
8. تحسين SEO

## تحديث التوكن التلقائي

النظام يدعم تحديث التوكن تلقائياً:
1. يحفظ التوكن مع تاريخ الانتهاء
2. قبل انتهاء الصلاحية بـ 5 دقائق، يحاول التحديث
3. إذا فشل التحديث، يحاول استخدام التوكن القديم
4. يدعم Developer Tokens (لا تنتهي)
5. يدعم Authorization Code Flow

## الأخطاء الشائعة

### 1. "Gemini API key not configured"
**الحل:** أضف `AI_INTEGRATIONS_GEMINI_API_KEY` في ملف `.env`

### 2. "No valid Salla token"
**الحل:** سجل الدخول من لوحة الإدارة واحفظ التوكن

### 3. "OCR Failed"
**الحل:** تأكد من صحة `CLOUD_VISION_API_KEY`

### 4. "Image search failed"
**الحل:** النظام سيستخدم DuckDuckGo تلقائياً كبديل

## التطوير

### إضافة نوع منتج جديد

1. تعديل `server/prompts.ts`
2. إضافة الأمثلة في البرومبت
3. تحديث `productDataSchema` في `shared/schema.ts`

### إضافة مصدر صور جديد

1. تعديل `server/google-search.ts`
2. إضافة دالة البحث الجديدة
3. تحديث `findProductImages` في `server/routes.ts`

## الأمان

- التحقق من URLs الصور (SSRF protection)
- التحقق من DNS للنطاقات الخاصة
- تشفير التوكنات في قاعدة البيانات
- التحقق من صلاحيات المسؤول

## الترخيص

MIT License

## الدعم

للأ вопросы والدعم، يرجى فتح issue في المستودع.