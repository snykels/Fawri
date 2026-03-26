# دليل تكامل سلة (OAuth و Webhook)

## نظرة عامة

يتم تكامل تطبيق Fawri مع منصة سلة عبر نقطتين رئيسيتين:
1. **OAuth 2.0**: للمصادقة والوصول إلى API سلة
2. **Webhooks**: لاستقبال الأحداث من سلة في الوقت الفعلي

## 1. إعداد OAuth 2.0

### الخطوات:

1. **إنشاء تطبيق على سلة ديفلوبر**:
   - اذهب إلى [سلة ديفلوبر](https://developers.salla.sa)
   - أنشئ تطبيقاً جديداً
   - احصل على `Client ID` و `Client Secret`

2. **إعداد متغيرات البيئة**:
   ```env
   SALLA_CLIENT_ID="your_client_id"
   SALLA_CLIENT_SECRET="your_client_secret"
   SALLA_REDIRECT_URI="https://yourdomain.com/api/salla/callback"
   ```

3. **تسجيل Callback URL**:
   - في لوحة تحكم التطبيق على سلة
   - أضف: `https://yourdomain.com/api/salla/callback`

### APIs المتوفرة:

#### جلب رابط التفويض
```http
GET /api/salla/auth-url
Authorization: Bearer admin_session
```

**الاستجابة**:
```json
{
  "success": true,
  "authUrl": "https://accounts.salla.sa/oauth2/authorize?client_id=...",
  "message": "Redirect user to this URL to authorize the application"
}
```

#### Callback OAuth
```http
GET /api/salla/callback?code=xxx&state=yyy
```

يقوم تلقائياً بـ:
- تبادل Authorization Code بالتوكنات
- حفظ التوكنات في قاعدة البيانات
- تحديث التوكنات تلقائياً عند انتهاء صلاحيتها

#### حفظ Developer Token (للاختبار)
```http
POST /api/salla/token
Authorization: Bearer admin_session
Content-Type: application/json

{
  "token": "your_developer_token"
}
```

## 2. إعداد Webhooks

### الخطوات:

1. **تسجيل Webhook URL في سلة**:
   - في لوحة تحكم التطبيق على سلة
   - أضف Webhook URL: `https://yourdomain.com/api/salla/webhook`
   - اختر الأحداث التي تريد استقبالها

2. **إعداد متغيرات البيئة** (اختياري للتحقق من التوقيع):
   ```env
   SALLA_WEBHOOK_SECRET="your_webhook_secret"
   ```

### الأحداث المدعومة:

| الحدث | الوصف |
|-------|-------|
| `app.install` | تثبيت التطبيق |
| `app.uninstall` | إزالة التطبيق |
| `product.create` | إنشاء منتج جديد |
| `product.update` | تحديث منتج |
| `order.create` | إنشاء طلب جديد |
| `order.update` | تحديث حالة الطلب |

### API Webhook الرئيسي

```http
POST /api/salla/webhook
Content-Type: application/json

{
  "event": "product.create",
  "merchant": {
    "id": 12345,
    "name": "اسم المتجر"
  },
  "data": {
    "id": 999,
    "name": "اسم المنتج",
    "price": { "amount": 100, "currency": "SAR" }
  },
  "created_at": "2026-03-26T18:00:00Z",
  "id": "event_unique_id"
}
```

**الاستجابة**:
```json
{
  "success": true,
  "message": "Webhook received"
}
```

### API اختبار Webhook

```http
POST /api/salla/webhook/test
Content-Type: application/json

{
  "event": "product.update",
  "data": {
    "id": 777,
    "name": "منتج تجريبي"
  }
}
```

### مراقبة أحداث Webhook

```http
GET /api/admin/webhook-events
Authorization: Bearer admin_session
```

**الاستجابة**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "merchantId": "12345",
      "eventType": "product.create",
      "eventId": "event_unique_id",
      "payload": { ... },
      "processed": true,
      "processedAt": "2026-03-26T18:00:01Z",
      "createdAt": "2026-03-26T18:00:00Z"
    }
  ],
  "count": 1
}
```

## 3. قاعدة البيانات

### جدول salla_webhook_events

```sql
CREATE TABLE salla_webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id TEXT,
  event_type TEXT NOT NULL,
  event_id TEXT,
  payload TEXT,
  processed INTEGER DEFAULT 0 NOT NULL,
  processed_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
```

## 4. اختبار التكامل

### تشغيل سكريبت الاختبار

```bash
# 1. تأكد من تشغيل الخادم
npm run dev

# 2. في terminal آخر، نفذ سكريبت الاختبار
npx tsx test-salla-integration.ts
```

### نتائج الاختبار المتوقعة

```
============================================================
بدء اختبار تكامل سلة (OAuth و Webhook)
============================================================
1. ❌ جلب رابط التفويض (OAuth Authorization URL): فشل
   السبب: HTTP 401 (يتطلب تسجيل دخول أدمن)
2. ✅ استقبال Webhook (app.install): نجح
3. ✅ استقبال Webhook (product.create): نجح
4. ✅ استقبال Webhook (order.create): نجح
5. ✅ اختبار Webhook عبر API المخصص: نجح
------------------------------------------------------------
الإجمالي: 5 اختبار
نجح: 4
فشل: 1
```

**ملاحظة**: فشل اختبار OAuth متوقع لأنه يتطلب تسجيل دخول أدمن.

## 5. معالجة الأحداث

### مثال: معالجة حدث إنشاء منتج

```typescript
async function handleProductCreate(data: any, merchant: any) {
  console.log(`[Product Create] New product created: ${data?.id}`);
  console.log(`[Product Create] Product name: ${data?.name}`);
  
  // يمكنك هنا:
  // 1. مزامنة المنتج مع قاعدة البيانات المحلية
  // 2. تحسين SEO تلقائياً
  // 3. إضافة وصف بالذكاء الاصطناعي
  // 4. البحث عن صور إضافية
}
```

### مثال: معالجة حدث إنشاء طلب

```typescript
async function handleOrderCreate(data: any, merchant: any) {
  console.log(`[Order Create] New order created: ${data?.id}`);
  console.log(`[Order Create] Total: ${data?.total?.amount} ${data?.total?.currency}`);
  
  // يمكنك هنا:
  // 1. تسجيل الطلب في قاعدة البيانات
  // 2. إرسال إشعار لصاحب المتجر
  // 3. تحديث المخزون
  // 4. إنشاء فاتورة
}
```

## 6. الأمان

### التحقق من توقيع Webhook (مطلوب في الإنتاج)

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### إضافة التحقق في routes.ts

```typescript
app.post("/api/salla/webhook", async (req, res) => {
  const webhookSecret = process.env.SALLA_WEBHOOK_SECRET;
  
  if (webhookSecret) {
    const signature = req.headers['x-salla-signature'] as string;
    const payload = JSON.stringify(req.body);
    
    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  }
  
  // معالجة الحدث...
});
```

## 7. استكشاف الأخطاء

### مشكلة: Webhook لا يستقبل الأحداث

**الحلول**:
1. تأكد من أن URL صحيح ومُسجل في لوحة تحكم سلة
2. تأكد من أن الخادم يعمل ومتاح من الإنترنت
3. تحقق من أن الأحداث محددة في لوحة تحكم سلة
4. تحقق من logs الخادم

### مشكلة: OAuth يفشل

**الحلول**:
1. تحقق من `SALLA_CLIENT_ID` و `SALLA_CLIENT_SECRET`
2. تأكد من أن `SALLA_REDIRECT_URI` يطابق المسجل في سلة
3. تحقق من أن الخادم متاح عبر HTTPS

### مشكلة: الجدول غير موجود

**الحل**:
```bash
npx tsx create-webhook-table.ts
```

## 8. روابط مفيدة

- [سلة ديفلوبر](https://developers.salla.sa)
- [توثيق OAuth](https://docs.salla.sa/oauth)
- [توثيق Webhooks](https://docs.salla.sa/webhooks)
- [API سلة](https://docs.salla.sa/api)

## 9. الخطوات التالية

1. ✅ إعداد OAuth للمصادقة
2. ✅ إعداد Webhooks لاستقبال الأحداث
3. ⬜ إضافة المزيد من معالجات الأحداث حسب الحاجة
4. ⬜ تحسين الأمان (التحقق من التوقيع)
5. ⬜ إعداد نظام إشعارات
6. ⬜ إنشاء تقارير من أحداث Webhook

---

**تاريخ آخر تحديث**: 2026-03-26
**الإصدار**: 1.0.0