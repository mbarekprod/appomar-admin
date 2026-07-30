# لوحة تحكم الشيف — مطعم الفنان (Admin Panel)

موقع منفصل، خاص بالشيف فقط، ومربوط بنفس مشروع Firebase متاع الموقع
الأساسي (base-resto-3d1e8) — يعني الداتا (زبائن، نقاط، إيفينمونات، منتجات...)
مشتركة بين الموقعين.

## ⚠️ خطوة أولى وإجبارية قبل النشر

افتح `admin-config.js` وبدّل الإيميل بإيميلك الحقيقي (لازم يكون عندو حساب
Firebase Auth مسجّل من قبل — تنجم تصنعو من صفحة `login.html` متاع الموقع
الأساسي، أو تزيدو يدوياً من Firebase Console > Authentication):

```js
export const ADMIN_EMAILS = [
  "chef@elfanen.com"   // ⬅️ بدلها بإيميلك
];
```

بدون هالخطوة، **حتى إيميل ما يقدر يدخل للوحة**، والموقع باش يعاود يرجعك
لصفحة الدخول على طول.

## 🔒 كيفاش يخدم الأمان

- الدخول يستعمل Firebase Auth (نفس نظام login.html متاع الموقع الأساسي).
- بعد ما يدخل المستخدم، `auth-guard.js` يتأكد بلي الإيميل موجود فـ
  `ADMIN_EMAILS`. إذا ماشي موجود (مثلاً زبون عادي عندو حساب) — يتسجل خروجو
  دغري ويرجع لصفحة الدخول.
- هذا مهم لأن الزبائن يقدرو يصنعو حسابات بأنفسهم من `login.html` متاع
  الموقع الأساسي (نفس Firebase Auth) — فـ بلاصة التحقق فالإيميل ضرورية.

> للحماية الإضافية (اختياري): تنجم تزيد Firestore Security Rules تمنع
> القراءة/الكتابة على "categories/products/variants/settings" إلا للإيميلات
> المحدّدة، باش حتى لو حد فتح Console يدوياً ما يقدرش يبدّل الداتا.

## 📁 الملفات

| ملف | الوظيفة |
|---|---|
| `login.html` | صفحة دخول الشيف (Firebase Auth) |
| `index.html` | لوحة التحكم (محمية) |
| `app.js` | كل منطق اللوحة (Firestore CRUD) |
| `auth-guard.js` | التحقق من الصلاحية قبل عرض اللوحة |
| `admin-config.js` | قائمة الإيميلات المسموح لها بالدخول |
| `firebase.js` | إعدادات Firebase (نفس مشروع الموقع الأساسي) |
| `style.css` | تنسيق اللوحة |

## 🧩 الأقسام المتوفرة فاللوحة

- **الأصناف / المنتجات / الخيارات** — نظام منيو ديناميكي جديد (Firestore)
- **نقاط الوفاء** — مربوطة بجدول `users` (نفس جدول login.html/cartefidelite.html)
- **عجلة الحظ** — حفظ توقيت الشغل (`settings/wheelSchedule`) + سجل النتائج
  (`prizes`)
- **الإيفينمونات** — مربوطة مباشرة بـ `evenment.html` متاع الموقع الأساسي
  (نفس الحقول: title/description/date/time/image)
- **المواقع** — تعرض بيانات GPS اللي يكتبها `index.html` متاع الموقع
  الأساسي (`locations` collection)
- **الإشعارات** — تسجيل فـ Firestore + زر يفتح Firebase Console للإرسال
  الفعلي (الإرسال الحقيقي لل Push يحتاج Cloud Function، ماشي حاجة تنعمل
  من طرف العميل مباشرة)

## ⚠️ ملاحظات مهمة على الربط مع الموقع الأساسي

1. **قسم "المنتجات" الجديد ماشي مربوط بـ `menu.html` الحالية** — `menu.html`
   لطول لهنا صفحة ثابتة (HTML عادي) ماشي مقروءة من Firestore. إذا تحب
   المنيو الجديد يبان فعلياً للزبائن، لازم `menu.html` تتحول باش تقرا من
   `categories`/`products` بدل ما تكون مكتوبة يدوياً.
2. **توقيت عجلة الحظ محفوظ فـ Firestore بس `wheel.js` الحالي ما يقراهش** —
   الجوائز والتوقيت فـ `wheel.js` مكتوبين مباشرة فالكود (hardcoded). إذا
   تحب التحكم الحقيقي فوقت اشتغال العجلة من اللوحة، لازم تزيد كود فـ
   `wheel.js` يقرا `settings/wheelSchedule` قبل ما يخلي المستخدم يلعب.
3. **جدول "prizes" لنتائج العجلة فارغ حالياً** — `wheel.js` الحالي ما
   يكتبش نتيجة كل دورة فـ Firestore، فـ سجل "نتائج العجلات" باش يبقى فارغ
   حتى تزيد سطر `addDoc` فـ `wheel.js` بعد كل spin.

نلقالك نعملهم إذا تحب — قوللي بصح.

## 🚀 النشر على GitHub Pages

```bash
git init
git add .
git commit -m "Admin panel - مطعم الفنان"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO-NAME.git
git push -u origin main
```

بعدها من إعدادات الـ repo فـ GitHub: **Settings > Pages > Branch: main**
وحفظ. الموقع يولي متاح على:
`https://USERNAME.github.io/REPO-NAME/`

(الرابط الافتراضي باش يفتح `login.html`؟ لا — GitHub Pages يفتح
`index.html` بالأول. بما إن `index.html` عندنا محمي بـ auth-guard، إذا
المستخدم ماشي مسجل دخول، باش يترجعلو دغري لـ `login.html` تلقائياً —
فماشي مشكل.)
