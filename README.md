# 🚀 نظام نشر المنتجات على سلة (Salla)

نظام ذكي متكامل لتحليل المنتجات ونشرها تلقائياً على منصة سلة للتجارة الإلكترونية.

## ✨ المميزات

- 🤖 **تحليل ذكي بالذكاء الاصطناعي**: استخدام Gemini AI لتحليل صور المنتجات
- 📷 **استخراج النصوص**: استخدام Google Vision API لاستخراج النصوص من الصور
- 🖼️ **بحث الصور الاحترافية**: البحث عن صور المنتجات بخلفية بيضاء
- 🔄 **تحديث التوكن التلقائي**: نظام OAuth2 مع تحديث تلقائي للتوكنات
- 📝 **وصف احترافي**: توليد وصف تسويقي محسّن لـ SEO
- 🏪 **نشر مباشر على سلة**: رفع المنتجات تلقائياً على متجر سلة
- 📊 **تصدير Excel**: تصدير المنتجات بصيغة Excel لمنصات سلة وزد

## 🛠️ التقنيات المستخدمة

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Google Gemini AI** لتحليل المنتجات
- **Google Cloud Vision** لاستخراج النصوص (OCR)
- **DuckDuckGo Image Search** للبحث عن الصور
- **Drizzle ORM** لقاعدة البيانات
- **SQLite** لقاعدة البيانات المحلية

### Frontend
- **React** + **TypeScript**
- **Tailwind CSS** للتصميم
- **Shadcn/ui** للمكونات
- **Framer Motion** للحركات

### APIs
- **Salla API v2** للنشر على منصة سلة
- **Google Vision API** لتحليل الصور
- **Gemini AI API** لتوليد المحتوى
- **imgbb API** لرفع الصور

## 📋 المتغيرات البيئية المطلوبة

```env
# Google APIs
AI_INTEGRATIONS_GEMINI_API_KEY=your_gemini_api_key
AI_INTEGRATIONS_GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
CLOUD_VISION_API_KEY=your_cloud_vision_api_key

# Salla OAuth2
SALLA_CLIENT_ID=your_salla_client_id
SALLA_SECRET_KEY=your_salla_secret_key
SALLA_REDIRECT_URI=https://yourdomain.com/api/salla/callback

# Image Upload
IMGBB_API_KEY=your_imgbb_api_key
```

## 🚀 التثبيت والتشغيل

### 1. تثبيت التبعيات
```bash
npm install
```

### 2. إعداد قاعدة البيانات
```bash
npm run db:push
```

### 3. تشغيل النظام
```bash
npm run dev
```

### 4. فتح المتصفح
```
http://localhost:5000
```

## 📖 طريقة الاستخدام

### 1. رفع صور المنتج
- ارفع الصورة الأمامية للمنتج
- ارفع الصورة الخلفية (الباركود والمواصفات)
- انقر على "تحليل المنتج"

### 2. مراجعة البيانات
- راجع اسم المنتج والوصف
- تحقق من الصور الاحترافية المستخرجة
- عدّل البيانات حسب الحاجة

### 3. النشر على سلة
- اضغط "نشر على سلة" للرفع التلقائي
- أو صدّر ملف Excel لرفعه يدوياً

## 🔧 نقاط النهاية (API Endpoints)

### تحليل المنتج
```
POST /api/generate
Body: { frontImage: "base64", backImage: "base64" }
```

### حفظ توكن سلة
```
POST /api/salla/token
Body: { token: "your_salla_token" }
```

### رابط تفويض OAuth2
```
GET /api/salla/auth-url
```

### استدعاء OAuth2
```
GET /api/salla/callback?code=xxx
```

### تصدير Excel
```
POST /api/download-excel
Body: { productData: {...} }
```

## 🔄 نظام تحديث التوكن التلقائي

النظام يدعم طريقتين للتعامل مع توكنات سلة:

### 1. Developer Token (للاختبار)
- التوكن لا ينتهي
- يُحفظ مباشرة بدون Refresh Token
- مناسب للاختبار والتطوير

### 2. OAuth2 Flow (للإنتاج)
- يطلب تفويض من التاجر
- يحصل على Access Token و Refresh Token
- يحدّث التوكن تلقائياً عند انتهاء صلاحيته
- مناسب للنشر الفعلي

## 📁 هيكل المشروع

```
├── server/
│   ├── routes.ts          # نقاط النهاية
│   ├── salla-oauth.ts     # خدمة OAuth2
│   ├── prompts.ts         # البرومبتات
│   ├── db.ts              # قاعدة البيانات
│   └── index.ts           # نقطة الدخول
├── client/
│   └── src/
│       ├── pages/         # الصفحات
│       ├── components/    # المكونات
│       └── lib/           # المكتبات المساعدة
├── shared/
│   └── schema.ts          # schemas مشتركة
└── attached_assets/       # الملفات المرفوعة
```

## 🎯 المنتجات المدعومة

- 📱 الهواتف الذكية
- 💻 الأجهزة اللوحية
- ⌚ الساعات الذكية
- 🎧 السماعات اللاسلكية
- 🔌 الشواحن والبطاريات
- 💾 كابلات ومحولات
- 🖥️ أجهزة كمبيوتر محمولة
- 🎮 أجهزة ألعاب

## 🔒 الأمان

- ✅ التحقق من صحة URLs الصور
- ✅ منع SSRF عبر DNS Rebinding
- ✅ التحقق من النطاقات الموثوقة فقط
- ✅ تشفير التوكنات في قاعدة البيانات
- ✅ التحقق من الجلسات للمسؤول

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل:
- البريد الإلكتروني: support@example.com
- GitHub Issues: https://github.com/your-repo/issues

## 📄 الترخيص

MIT License - يمكنك استخدام هذا المشروع لأغراض تجارية وغير تجارية.

---

**مُطور بـ ❤️ لتسهيل التجارة الإلكترونية في المنطقة العربية**