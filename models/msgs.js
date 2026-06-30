import mongoose from 'mongoose'

// Har bir kuzatilayotgan xabar (matn, media, va h.k.) shu yerda saqlanadi.
// Tahrirlanganda/o'chirilganda solishtirish uchun kerak.
const msgSchema = new mongoose.Schema({
  businessConnectionId: { type: String, required: true, index: true },
  chatId: { type: Number, required: true, index: true },
  messageId: { type: Number, required: true },
  from: {
    id: { type: Number, required: true },
    first_name: { type: String, default: '' },
    last_name: { type: String, default: '' },
    username: { type: String, default: '' }
  },
  text: { type: String, default: '' },
  caption: { type: String, default: '' },
  media: {
    type: { type: String, default: null }, // photo, video, document, voice, audio, sticker, animation, video_note
    file_id: { type: String, default: null },
    file_unique_id: { type: String, default: null },
    file_name: { type: String, default: null },
    file_size: { type: Number, default: null },
    mime_type: { type: String, default: null }
  },
  date: { type: Number, required: true }
}, { timestamps: true })

// 48 soatdan keyin o'chib ketishi uchun TTL (Time-To-Live) indeksi (48 * 3600 = 172800 soniya)
msgSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 })

// Har bir chat ichidagi xabar noyobligini ta'minlash uchun compound index
msgSchema.index({ businessConnectionId: 1, chatId: 1, messageId: 1 }, { unique: true })

export default mongoose.model('Msg', msgSchema)
