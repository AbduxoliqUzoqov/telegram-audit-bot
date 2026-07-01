# Telegram Business Audit Bot

Telegram Secretary Mode (Chat Bots) orqali shaxsiy akkauntga bog'lanib, chatlardagi yozishmalarni nazorat qiluvchi va xavfsizligini ta'minlovchi Webhook-bot. 

Suhbatdoshlar xabarlarni **tahrirlasa (edit)** yoki **o'chirib tashlasa (delete)**, bot darhol sizning shaxsiy chatingizga ularning asl nusxasini bildirishnoma ko'rinishida yuboradi.

---

## 🚀 Asosiy Imkoniyatlar

1. **Tahrirlangan xabarlar audit-nazorati**:
   - Xabar tahrirlanganda, eski va yangi matn/caption holatlarini solishtirib chiroyli blokda yuboradi.
2. **O'chirilgan xabarlarni tiklash**:
   - Suhbatdosh xabarni o'chirsa, uning asl matni va media fayllarini sizga yetkazadi.
3. **⏱ Bir martalik / Taymerli xabarlarni yuklab olish (Bypass)**:
   - Telegram bir martalik ko'riladigan rasm, video, audio yoki video-kruglyak xabarlarini webhook orqali botga uzatmaydi.
   - **Yechim:** Agar o'sha bir martalik xabarga **reply (javob)** qilib yozsangiz, bot orqa fonda uning `file_id`sini oladi, Telegram serverlaridan binary (buffer) ko'rinishida yuklab oladi va sizga to'g'ri formatda (rasm bo'lsa rasm, video bo'lsa video qilib) qayta yuklab yuboradi!

---

## 📁 Loyiha Strukturasi

```text
audit_bot/
├── index.js             # Asosiy kirish nuqtasi va barcha webhook handlerlar
├── models/
│   ├── msgs.js          # Xabarlar tarixi uchun Mongoose modeli (ownerId, chatId, messageId compound index)
│   └── users.js         # Bot foydalanuvchilari va faol ulanishlar statusi
├── vercel.json          # Vercel serverless platformasi uchun marshrutlash sozlamalari
├── package.json         # Loyiha modullari va scriptlari
└── README.md            # Ushbu yo'riqnoma
```

---

## 🛠 O'rnatish va Sozlash

### 1. Lokal o'rnatish

Loyihani klonlang va bog'liqliklarni o'rnating:
```bash
npm install
```

### 2. Muhit o'zgaruvchilari (`.env`)

`.env.example` faylini `.env` ko'rinishida nusxalang va to'ldiring:
```bash
cp .env.example .env
```

| Kalit | Tavsif |
|---|---|
| `BOT_TOKEN` | @BotFather orqali olingan Telegram bot tokeni |
| `WEBHOOK_SECRET` | Webhook so'rovlarini himoyalash uchun ixtiyoriy maxfiy satr |
| `PORT` | Mahalliy port (standart: 3000) |
| `MONGO_URI` | MongoDB ma'lumotlar bazasi ulanish manzili |
| `ADMIN_ID` | Bot adminining shaxsiy Telegram ID raqami |

---

## 💻 Serverni ishga tushirish

### Lokal testlash (Nodemon orqali):
```bash
npm run dev
```

---

## 🚀 Vercel Platformasiga Joylash (Deploy)

Ushbu bot Vercel Serverless muhitiga to'liq moslashtirilgan. Joylash uchun quyidagi ketma-ketlikni bajaring:

1. **Vercel CLI ni o'rnating** (agar o'rnatilmagan bo'lsa):
   ```bash
   npm i -g vercel
   ```
2. **Loyihani deploy qiling**:
   ```bash
   vercel
   ```
3. Vercel loyihasi sozlamalarida (Dashboard ➜ Settings ➜ Environment Variables) quyidagi o'zgaruvchilarni kiriting:
   - `BOT_TOKEN`
   - `WEBHOOK_SECRET`
   - `MONGO_URI`
   - `ADMIN_ID`
4. O'zgarishlarni kuchga kiritish va production nashrini chiqarish:
   ```bash
   vercel --prod
   ```
5. **Webhookni o'rnatish**:
   Brauzeringizda quyidagi manzilni oching (siz belgilagan `WEBHOOK_SECRET` qiymatini `secret` o'zgaruvchisiga bering):
   `https://SIZNING-VERCEL-DOMAIN.vercel.app/?set=setwebhook&secret=YOUR_WEBHOOK_SECRET`
   Va ochilgan sahifadagi **Set** tugmasini bosing. Bu Telegram tizimiga to'g'ri webhook yangilanishlar ro'yxatini bog'laydi. Xavfsizlik maqsadida, agar `secret` noto'g'ri bo'lsa, xizmat bot tokenini oshkor qilmaydi va so'rovni rad etadi (403 Forbidden).

---

## ⚙️ Botni Akkauntga Bog'lash

1. **Secretary Mode ni yoqish**:
   - Telegram'da `@BotFather` botiga kiring.
   - `/mybots` buyrug'ini yuboring ➜ Botingizni tanlang ➜ **Bot Settings** ➜ **Secretary Mode** ➜ **Turn on** tugmasini bosing.
2. **Akkauntga ulash**:
   - Telegram ilovangizda: **Sozlamalar (Settings) ➜ Telegram Business ➜ Chat-botlar (Chat Bots)** bo'limiga kiring.
   - Bot username'ini qidirib topib, ulanishni tasdiqlang.
   - Botga xabarlarni o'qish (Manage Messages) ruxsatini bering.

---

## 🤖 Bot Buyruqlari

* `/start` - Botni ishga tushiradi, taymerli xabarlarni qanday saqlab qolish haqida batafsil ma'lumot beradi.
* `/yordam` - Akkauntni botga bog'lash va audit faoliyati bo'yicha to'liq yo'riqnomani taqdim etadi.
* **Boshqa oddiy xabarlar** - Botga shaxsiy chatingizdan yozilgan boshqa ixtiyoriy xabarlarga bot chiroyli javob qaytarib, o'z vazifasini eslatib qo'yadi.