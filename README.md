# Express Audit Bot (Secretary Mode / Chat Automation)

Webhook asosidagi bot: Telegram Secretary Mode orqali profilingizga ulanib,
suhbatlardagi xabarlarni (matn, voice, audio) kuzatadi va xabar **tahrirlansa**
yoki **o'chirilsa**, adminlarga darhol bildirishnoma yuboradi.

## Tarkib

```
express_audit_bot/
├── index.js          # asosiy server va barcha handlerlar
├── models/
│   ├── voice.js       # xabarlarni saqlash sxemasi
│   └── admin.js       # admin ID'lar sxemasi
├── package.json
└── .env.example
```

## 1. O'rnatish

```bash
npm install
```

## 2. Sozlash

`.env.example` ni `.env` deb nomlang va to'ldiring:

```bash
cp .env.example .env
```

| O'zgaruvchi | Tavsif |
|---|---|
| `BOT_TOKEN` | @BotFather'dan olingan token |
| `WEBHOOK_SECRET` | Istalgan uzun tasodifiy satr (webhookni himoyalash uchun) |
| `PORT` | Server porti (hosting o'zi belgilasa shuni qoldiring) |
| `MONGO_URI` | MongoDB ulanish manzili |
| `ADMIN_ID` | Sizning Telegram user ID'ingiz |

**Diqqat:** `.env` faylini hech qachon ochiq joyga (GitHub'ga) yuklamang.

## 3. Serverni ishga tushirish

```bash
npm start
```

Bu serverni internetga ochiq joyda (Render, Railway, VPS va h.k.) ishlatishingiz kerak,
chunki Telegram webhook orqali sizning serveringizga `POST` so'rov yuboradi —
shuning uchun server ochiq, HTTPS manzilga ega bo'lishi shart.

## 4. Webhookni o'rnatish

Brauzerda serveringiz manzilini oching:

```
https://SIZNING-DOMAIN/?set=setwebhook
```

Chiqqan "Set" havolasini bosing — bu Telegram'ga webhook manzilini va kerakli
`allowed_updates` (jumladan `business_message`, `edited_business_message`,
`deleted_business_messages`) ro'yxatini yuboradi.

"Info" havolasi orqali webhook holatini tekshirib ko'rishingiz mumkin.

## 5. Botni profilga ulash

@BotFather'da:
- `/mybots` → botingiz → **Bot Settings → Secretary Mode → Turn on**

Telegram ilovasida:
- **Sozlamalar → Chat Automation** → bot username'ini kiritib ulang
- Kerakli ruxsatlarni (Manage Messages) yoqing
- Qaysi chatlarga bot kira olishini tanlang

## Qanday ishlaydi

1. **`business_message`** keladi → xabar (matn/voice/audio) MongoDB'ga saqlanadi.
2. **`edited_business_message`** keladi → bazadagi eski matn bilan solishtiriladi,
   farqi barcha adminlarga yuboriladi, baza yangilanadi.
3. **`deleted_business_messages`** keladi → bazadan eski xabar topiladi, kim yozgani
   va matni adminlarga yuboriladi, yozuv "o'chirilgan" deb belgilanadi (`deletedAt`).

## Admin tizimi

- `.env` dagi `ADMIN_ID` — asosiy (super) admin, har doim bildirishnoma oladi.
- Qo'shimcha adminlar `Admin` kolleksiyasiga yozilsa, ular ham bildirishnoma oladi
  (buni qo'shish uchun `/admin` komandasi logikasini to'liqlashtirish kerak —
  hozircha bazaviy struktura tayyor).

## Voice/Audio fayllarni yuklab olish — muhim nuance

Secretary Mode orqali kelgan `business_message`dagi `file_id` oddiy bot xabaridan farq qiladi:
fayl botning o'z fayllar omborida emas, balki **business ulanish orqali ko'rinadigan
foydalanuvchi sessiyasida** turadi. Shu sababli `getFile` so'rovida **albatta**
`business_connection_id` parametrini ham yuborish kerak — aks holda Telegram
faylni topa olmaydi.

Kodda bu `getBusinessFile(fileId, businessConnectionId)` funksiyasi orqali
amalga oshirilgan, va har bir voice/audio xabar kelganda avtomatik chaqiriladi.

**Diqqat:** `getFile` qaytargan yuklab olish manzili (`file_path`) faqat
taxminan **1 soat** amal qiladi. Agar faylni uzoq muddatga saqlash kerak bo'lsa,
shu manzildan darhol faylni o'z serveringizga (yoki bulutga) yuklab olishingiz
kerak — `fileUrl`ni faqat saqlab qo'yish kifoya emas, chunki muddati o'tib qoladi.


- `voice`/`audio` xabarlarning o'zi (fayl tarkibi) saqlanmaydi — faqat ularning
  Telegram `file_id`si va davomiyligi saqlanadi. Faylning o'zini yuklab olish
  uchun alohida `getFile` so'rovi kerak bo'ladi.
- Bu vosita faqat **o'zingizning** profilingiz uchun ishlatilishi mo'ljallangan.