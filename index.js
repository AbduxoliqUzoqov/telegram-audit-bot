import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import User from './models/users.js'
import Msg from './models/msgs.js'

const app = express()
app.use(express.json())

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/audit_bot'
let isConnected = false
async function connectDb() {
  if (isConnected) return
  if (mongoose.connection.readyState === 1) {
    isConnected = true
    return
  }
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    isConnected = true
    console.log('✅ Connected to MongoDB')
  } catch (err) {
    console.error('❌ MongoDB connection error:', err)
    throw err
  }
}

const SECRET = process.env.WEBHOOK_SECRET
const PORT = process.env.PORT || 3000
const admin = process.env.ADMIN_ID
const connectionOwners = new Map()
let logs = [], botUsername = ''

async function api(method, params) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params)
  })
  return r.json()
}

async function apiMultipart(method, formData) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
    method: 'POST', body: formData
  })
  return r.json()
}

function getMimeType(type) {
  switch (type) {
    case 'photo': return 'image/jpeg';
    case 'video': return 'video/mp4';
    case 'voice': return 'audio/ogg';
    case 'audio': return 'audio/mpeg';
    case 'animation': return 'video/mp4';
    case 'video_note': return 'video/mp4';
    default: return 'application/octet-stream';
  }
}

function getExtension(type, mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'audio/ogg') return 'ogg';
  switch (type) {
    case 'photo': return 'jpg';
    case 'video': return 'mp4';
    case 'voice': return 'ogg';
    case 'audio': return 'mp3';
    case 'animation': return 'mp4';
    case 'video_note': return 'mp4';
    default: return 'bin';
  }
}

function extractMedia(m) {
  if (m.photo && m.photo.length > 0) {
    const photo = m.photo[m.photo.length - 1]; // highest resolution
    return {
      type: 'photo',
      file_id: photo.file_id,
      file_unique_id: photo.file_unique_id,
      file_size: photo.file_size
    };
  }
  if (m.video) {
    return {
      type: 'video',
      file_id: m.video.file_id,
      file_unique_id: m.video.file_unique_id,
      file_name: m.video.file_name || null,
      file_size: m.video.file_size || null,
      mime_type: m.video.mime_type || null
    };
  }
  if (m.document) {
    return {
      type: 'document',
      file_id: m.document.file_id,
      file_unique_id: m.document.file_unique_id,
      file_name: m.document.file_name || null,
      file_size: m.document.file_size || null,
      mime_type: m.document.mime_type || null
    };
  }
  if (m.voice) {
    return {
      type: 'voice',
      file_id: m.voice.file_id,
      file_unique_id: m.voice.file_unique_id,
      file_size: m.voice.file_size || null,
      mime_type: m.voice.mime_type || null
    };
  }
  if (m.audio) {
    return {
      type: 'audio',
      file_id: m.audio.file_id,
      file_unique_id: m.audio.file_unique_id,
      file_name: m.audio.file_name || null,
      file_size: m.audio.file_size || null,
      mime_type: m.audio.mime_type || null
    };
  }
  if (m.sticker) {
    return {
      type: 'sticker',
      file_id: m.sticker.file_id,
      file_unique_id: m.sticker.file_unique_id,
      file_size: m.sticker.file_size || null
    };
  }
  if (m.animation) {
    return {
      type: 'animation',
      file_id: m.animation.file_id,
      file_unique_id: m.animation.file_unique_id,
      file_name: m.animation.file_name || null,
      file_size: m.animation.file_size || null,
      mime_type: m.animation.mime_type || null
    };
  }
  if (m.video_note) {
    return {
      type: 'video_note',
      file_id: m.video_note.file_id,
      file_unique_id: m.video_note.file_unique_id,
      file_size: m.video_note.file_size || null
    };
  }
}

function formatSender(from) {
  if (!from) return 'Noma\'lum';
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Noma\'lum';
  const username = from.username ? ` (@${from.username})` : '';
  return `<b>${name}</b>${username}`;
}

function formatChat(chat) {
  if (!chat) return 'Noma\'lum';
  const name = [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.title || 'Noma\'lum';
  const username = chat.username ? ` (@${chat.username})` : `(ID: <code>${chat.id}</code>)`;
  return `<b>${name}</b> ${username}`;
}

async function sendAuditAlert(ownerChatId, text, media) {
  try {
    await api('sendChatAction', { chat_id: ownerChatId, action: 'typing' });
    if (media && media.file_id) {
      let method = '';
      const params = { chat_id: ownerChatId };

      switch (media.type) {
        case 'photo':
          method = 'sendPhoto';
          params.photo = media.file_id;
          break;
        case 'video':
          method = 'sendVideo';
          params.video = media.file_id;
          break;
        case 'document':
          method = 'sendDocument';
          params.document = media.file_id;
          break;
        case 'voice':
          method = 'sendVoice';
          params.voice = media.file_id;
          break;
        case 'audio':
          method = 'sendAudio';
          params.audio = media.file_id;
          break;
        case 'sticker':
          method = 'sendSticker';
          params.sticker = media.file_id;
          break;
        case 'animation':
          method = 'sendAnimation';
          params.animation = media.file_id;
          break;
        case 'video_note':
          method = 'sendVideoNote';
          params.video_note = media.file_id;
          break;
      }

      if (method) {
        const res = await api(method, {
          ...params,
          caption: text,
          parse_mode: 'HTML'
        });

        if (!res.ok) {
          console.warn(`⚠️ Failed to send media via file_id (${res.description}). Attempting secure download and re-upload...`);
          try {
            const getFileRes = await api('getFile', { file_id: media.file_id });
            if (getFileRes.ok && getFileRes.result.file_path) {
              const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${getFileRes.result.file_path}`;
              const fileRes = await fetch(fileUrl);
              if (fileRes.ok) {
                const arrayBuffer = await fileRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const formData = new FormData();
                formData.append('chat_id', ownerChatId.toString());
                if (text) {
                  formData.append('caption', text);
                  formData.append('parse_mode', 'HTML');
                }

                const mimeType = media.mime_type || getMimeType(media.type);
                const ext = getExtension(media.type, mimeType);
                const filename = media.file_name || `file_${media.file_unique_id || Date.now()}.${ext}`;

                const blob = new Blob([buffer], { type: mimeType });
                const fieldName = (media.type === 'video_note') ? 'video_note' : media.type;
                formData.append(fieldName, blob, filename);

                const uploadRes = await apiMultipart(method, formData);
                if (uploadRes.ok) {
                  console.log(`✅ Successfully re-uploaded protected media via secure buffer fallback (ID=${media.file_id})`);
                  return;
                } else {
                  console.error(`❌ Secure re-upload failed: ${uploadRes.description}`);
                }
              } else {
                console.error(`❌ Failed to download file from Telegram server: status ${fileRes.status}`);
              }
            } else {
              console.error(`❌ Failed to get file path from Telegram api: ${getFileRes.description}`);
            }
          } catch (fallbackErr) {
            console.error(`❌ Error in secure download/re-upload fallback:`, fallbackErr);
          }

          // If fallback also failed, we send the text message with a warning
          await api('sendMessage', {
            chat_id: ownerChatId,
            text: text + `\n\n⚠️ <i>[Tizim ushbu bir martalik / himoyalangan mediani yubora olmadi]</i>`,
            parse_mode: 'HTML'
          });
        }
      }
    } else {
      await api('sendMessage', {
        chat_id: ownerChatId,
        text: text,
        parse_mode: 'HTML'
      });
    }
  } catch (err) {
    console.error('❌ Failed to send audit alert:', err);
  }
}

async function loadBotInfo() {
  const r = await api('getMe', {})
  if (r.ok) { botUsername = r.result.username; console.log(`✅ Bot: @${botUsername}`) }
}

// Business (Secretary Mode) business_connection_id 

async function setupCmds() {
  await api('setMyCommands', {
    commands: [
      { command: 'start', description: 'Botni ishga tushirish' },
      { command: 'yordam', description: 'Yordam ko\'rsatish va yo\'riqnoma' }
    ]
  })
  await api('setChatMenuButton', {}).catch(() => { })
}

// ===== EXPRESS =====
app.get('/', (req, res) => {
  if (req.query?.set === 'setwebhook') {
    if (SECRET && req.query.secret !== SECRET) {
      return res.status(403).send('Forbidden: Invalid secret token')
    }
    const allowed = encodeURIComponent(JSON.stringify([
      'message', 'edited_message',
      'business_connection', 'business_message',
      'edited_business_message', 'deleted_business_messages',
      'callback_query', 'inline_query'
    ]))
    return res.send(
      `<a href="https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook?url=https://${req.get('host')}/webhook&secret_token=${SECRET}&allowed_updates=${allowed}">Set</a><br>` +
      `<a href="https://api.telegram.org/bot${process.env.BOT_TOKEN}/deleteWebhook">Del</a><br>` +
      `<a href="https://api.telegram.org/bot${process.env.BOT_TOKEN}/getWebhookInfo">Info</a>`
    )
  }
  res.send('Bot ishlayapti ✅')
})

app.get('/logs', (req, res) => {
  if (SECRET && req.query.secret !== SECRET) return res.sendStatus(403)
  res.json(logs)
})

app.post('/webhook', async (req, res) => {
  if (SECRET && req.headers['x-telegram-bot-api-secret-token'] !== SECRET) return res.sendStatus(403)
  try {
    await connectDb()
    const b = req.body; logs.unshift(b); logs = logs.slice(0, 12)

    if (b.message) await handleMessage(b.message)
    if (b.callback_query) await handleCallback(b.callback_query)
    if (b.inline_query) await handleInline(b.inline_query)

    // --- Secretary Mode (Chat Automation) update'lari ---
    if (b.business_connection) await handleBusinessConnection(b.business_connection)
    if (b.business_message) await handleBusinessMessage(b.business_message)
    if (b.edited_business_message) await handleEditedBusinessMessage(b.edited_business_message)
    if (b.deleted_business_messages) await handleDeletedBusinessMessages(b.deleted_business_messages)


  } catch (e) { console.error('❌', e) }
  res.sendStatus(200)
})

// ===== ODDIY MESSAGE (botga to'g'ridan-to'g'ri yozilgan) =====
async function handleMessage(m) {
  let user = await User.findOne({ userId: m.chat.id })
  if (!user) {
    user = new User({ userId: m.chat.id, firstName: m.chat.first_name, lastName: m.chat.last_name, username: m.chat.username })
    await user.save()
  } else {
    user.firstName = m.chat.first_name || user.firstName
    user.lastName = m.chat.last_name || user.lastName
    user.username = m.chat.username || user.username
    await user.save()
  }
  await api('sendChatAction', {
    chat_id: m.chat.id,
    action: 'typing'
  });
  if (m.text === '/start') {
    const welcomeText =
      `👋 <b>Assalomu alaykum, ${user.firstName}!</b>\n\n` +
      `🤖 Ushbu bot sizga shaxsiy yozishmalaringizni (Telegram Business Connection orqali) nazorat qilish va xavfsizligini ta'minlashda yordam beradi.\n\n` +
      `🚀 <b>Asosiy imkoniyatlar:</b>\n` +
      `• ✏️ <b>Tahrirlangan xabarlar:</b> Xabar o'zgartirilsa, eski va yangi holatini solishtirib beradi.\n` +
      `• 🗑 <b>O'chirilgan xabarlar:</b> Xabar o'chirib tashlansa, uning asl nusxasini tiklab yuboradi.\n` +
      `• ⏱ <b>Bir martalik / Taymerli xabarlar:</b> Agar suhbatdoshingiz sizga bir martalik rasm, video, ovozli xabar yoki kruglyak yuborsa, uni saqlab qolish uchun <b>o'sha xabarga reply (javob) qilib biror narsa yozib qo'ying</b>. Bot uni sizga darhol yuklab beradi!\n\n` +
      `⚙️ <i>Ulanish uchun: Mening profilim <b>(My Profile)</b> ➜ Chatlarni avtomatlashtirish <b>(Chat Automation)</b> bo'limidan ushbu botni tanlang. Batafsil ma'lumot uchun /yordam buyrug'ini bosing.</i>`

    await api('sendMessage', {
      chat_id: m.chat.id,
      text: welcomeText,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔗 Botni ulash', style: 'success', url: 'tg://settings/edit_profile' }],
          [{ text: '🧑‍💻Admin blog', style: 'primary', url: 'https://abduxoliq.alwaysdata.net' }]
        ]
      }
    })
  } else if (m.text === '/yordam') {
    const helpText =
      `📖 <b>Botdan foydalanish yo'riqnomasi:</b>\n\n` +
      `1️⃣ <b>Ulanish:</b>\n` +
      `Botni shaxsiy yozishmalaringizga ulash uchun:\n` +
      `• Sozlamalar (Settings) ➜ Mening profilim (My Profile) ➜ Chatlarni avtomatlashtirish (Chat Automation) bo'limiga kiring.\n` +
      `• Ushbu botni (<code>@${botUsername || 'shaxsiyauditbot'}</code>) tanlang va saqlang.\n\n` +
      `2️⃣ <b>Audit (Nazorat):</b>\n` +
      `• Bot ulanganidan so'ng, shaxsiy suhbatlaringizdagi xabarlar tahrirlansa yoki o'chirilsa, bot sizning ushbu shaxsiy chatingizga audit xabarlarini yuboradi.\n\n` +
      `3️⃣ <b>⏱ Bir martalik (o'chib ketadigan) xabarlar:</b>\n` +
      `• Kelgan taymerli rasm, video, ovoz yoki kruglyakni saqlab qolish uchun <b>o'sha xabarga reply (javob) qilib yozib qo'ying</b>. Bot uni sizga darhol yuklab beradi!`;

    await api('sendMessage', {
      chat_id: m.chat.id,
      text: helpText,
      parse_mode: 'HTML'
    })
  } else {
    if (m.text && !m.text.startsWith('/')) {
      const generalText =
        `ℹ️ <b>Assalomu alaykum!</b>\n\n` +
        `Men Telegram Business audit botiman. Shaxsiy chatingizda yozilgan oddiy xabarlarni qayta ishlamayman.\n\n` +
        `💡 <b>Men qanday vazifani bajaraman?</b>\n` +
        `• Shaxsiy akkauntingizga bog'langan holda, suhbatlaringizdagi o'chirilgan yoki tahrirlangan xabarlarni sizga yetkazib beriman.\n\n` +
        `⚙️ Botni faollashtirish va sozlash uchun /yordam buyrug'ini yuboring.`;

      await api('sendMessage', {
        chat_id: m.chat.id,
        text: generalText,
        parse_mode: 'HTML'
      })
    }
  }

}

async function handleCallback(cq) {
  console.log('callback_query:', cq.data)
}

async function handleInline(iq) {
  console.log('inline_query:', iq.query)
}

// ===== SECRETARY MODE: ulanish hodisasi =====
async function handleBusinessConnection(bc) {
  console.log(`🔗 Business connection: id=${bc.id}, user_chat_id=${bc.user_chat_id}, is_enabled=${bc.is_enabled}`)
  try {
    let user = await User.findOne({ userId: bc.user.id })
    const oldBcId = user ? user.businessConnectionId : null

    if (!user) {
      user = new User({
        userId: bc.user.id,
        firstName: bc.user.first_name || '',
        lastName: bc.user.last_name || '',
        username: bc.user.username || '',
        businessConnectionId: bc.id,
        is_enabled: bc.is_enabled
      })
    } else {
      user.firstName = bc.user.first_name || user.firstName
      user.lastName = bc.user.last_name || user.lastName
      user.username = bc.user.username || user.username
      user.businessConnectionId = bc.id
      user.is_enabled = bc.is_enabled
    }
    await user.save()
    console.log(`💾 User connection status saved: userId=${user.userId}, is_enabled=${user.is_enabled}`)

    // Update RAM Cache
    if (bc.is_enabled) {
      if (oldBcId && oldBcId !== bc.id) {
        connectionOwners.delete(oldBcId)
      }
      connectionOwners.set(bc.id, bc.user.id)
    } else {
      connectionOwners.delete(bc.id)
    }

    // Foydalanuvchiga ulanish holati haqida xabar berish
    const connectionStatusText = bc.is_enabled
      ? `🔔 <b>Telegram Business ulandi!</b>\n\nProfilingiz botga muvaffaqiyatli bog'landi. Endi shaxsiy yozishmalaringiz nazorati (audit) boshlandi.`
      : `🔕 <b>Telegram Business uzildi!</b>\n\nProfilingiz botdan uzildi. Yozishmalarni nazorat qilish to'xtatildi.`

    await api('sendMessage', {
      chat_id: bc.user.id,
      text: connectionStatusText,
      parse_mode: 'HTML'
    }).catch(err => console.error('❌ Error sending connection status to user:', err))
  } catch (err) {
    console.error('❌ Error handling business connection:', err)
  }
}

// ===== SECRETARY MODE: javob berilgan himoyalangan mediani yuborish =====
async function sendProtectedMediaAlert(ownerChatId, rm, chat) {
  try {
    const media = extractMedia(rm)
    if (!media || !media.file_id) return

    let method = '';
    switch (media.type) {
      case 'photo': method = 'sendPhoto'; break;
      case 'video': method = 'sendVideo'; break;
      case 'document': method = 'sendDocument'; break;
      case 'voice': method = 'sendVoice'; break;
      case 'audio': method = 'sendAudio'; break;
      case 'sticker': method = 'sendSticker'; break;
      case 'animation': method = 'sendAnimation'; break;
      case 'video_note': method = 'sendVideoNote'; break;
    }

    if (!method) return
    
    console.log(`⚡️ Downloading replied protected media of type "${media.type}" method "${method}" (ID=${media.file_id})...`)
    const getFileRes = await api('getFile', { business_connection_id: rm.business_connection_id, file_id: media.file_id })
    if (getFileRes.ok && getFileRes.result.file_path) {
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${getFileRes.result.file_path}`
      const fileRes = await fetch(fileUrl)
      if (fileRes.ok) {
        const arrayBuffer = await fileRes.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        let reportText = `🛡 <b>AUDIT: HIMOYALANGAN MEDIA (REPLY)</b>\n`
        reportText += `───────────────────\n`
        reportText += `👤 <b>Yuborgan:</b> ${formatSender(rm.from)}\n`
        reportText += `💬 <b>Chat:</b> ${formatChat(chat)}\n`
        reportText += `───────────────────`

        const formData = new FormData()
        formData.append('chat_id', ownerChatId.toString())
        formData.append('caption', reportText)
        formData.append('parse_mode', 'HTML')

        const mimeType = media.mime_type || getMimeType(media.type)
        const ext = getExtension(media.type, mimeType)
        const filename = media.file_name || `file_${media.file_unique_id || Date.now()}.${ext}`

        const blob = new Blob([buffer], { type: mimeType })
        const fieldName = (media.type === 'video_note') ? 'video_note' : media.type
        formData.append(fieldName, blob, filename)
        
        const uploadRes = await apiMultipart(method, formData)
        if (uploadRes.ok) {
          console.log(`✅ Successfully sent replied protected media: type="${media.type}" to Owner=${ownerChatId}`)
        } else {
          console.error(`❌ Failed to upload replied protected media: ${uploadRes.description}`)
        }
      } else {
        console.error(`❌ Failed to download replied file from Telegram server: status ${fileRes.status}`)
      }
    } else {
      console.error(`❌ Failed to get path for replied file: ${getFileRes.description}`)
    }
  } catch (err) {
    console.error('❌ Error handling protected media reply alert:', err)
  }
}

// ===== SECRETARY MODE: yangi xabar =====
async function handleBusinessMessage(m) {
  try {
    let ownerId = connectionOwners.get(m.business_connection_id)
    if (!ownerId) {
      const owner = await User.findOne({ businessConnectionId: m.business_connection_id })
      if (owner) {
        ownerId = owner.userId
        connectionOwners.set(m.business_connection_id, ownerId)
      }
    }

    if (!ownerId) {
      console.warn(`⚠️ Owner not found for connection ID: ${m.business_connection_id}`)
      return
    }

    // Capture replied-to protected media if it exists (async non-blocking)
    if (m.reply_to_message) {
      sendProtectedMediaAlert(ownerId, m.reply_to_message, m.chat).catch(err => {
        console.error('❌ Error in sendProtectedMediaAlert:', err)
      })
    }

    const media = extractMedia(m)
    let text = m.text || ''
    if (!text && !m.caption) {
      if (m.location) text = '📍 [Lokatsiya/Joylashuv]'
      else if (m.contact) text = '👤 [Kontakt]'
      else if (m.poll) text = '📊 [So\'rovnoma]'
      else if (m.venue) text = '🏢 [Joy/Venue]'
      else if (m.game) text = '🎮 [O\'yin]'
      else if (m.dice) text = `🎲 [Dice: ${m.dice.value}]`
    }

    const chatName = [m.chat.first_name, m.chat.last_name].filter(Boolean).join(' ') || m.chat.title || 'Noma\'lum'
    const isOutgoing = (m.chat.id !== m.from.id)

    const msgData = {
      ownerId: ownerId,
      chatId: m.chat.id,
      chatName: chatName,
      isOutgoing: isOutgoing,
      messageId: m.message_id,
      from: {
        id: m.from.id,
        first_name: m.from.first_name || '',
        last_name: m.from.last_name || '',
        username: m.from.username || ''
      },
      text: text,
      caption: m.caption || '',
      media: media || {
        type: null,
        file_id: null,
        file_unique_id: null,
        file_name: null,
        file_size: null,
        mime_type: null
      },
      date: m.date
    }

    await Msg.findOneAndUpdate(
      { ownerId: ownerId, chatId: m.chat.id, messageId: m.message_id },
      msgData,
      { upsert: true, returnDocument: 'after' }
    )
    console.log(`💾 Saved message: ID=${m.message_id} in Chat=${m.chat.id} (Owner=${ownerId}, Outgoing=${isOutgoing})`)
  } catch (err) {
    console.error('❌ Error saving business message:', err)
  }
}

//  ===== SECRETARY MODE: xabar tahrirlandi =====
async function handleEditedBusinessMessage(m) {
  try {
    let ownerId = connectionOwners.get(m.business_connection_id)
    if (!ownerId) {
      const owner = await User.findOne({ businessConnectionId: m.business_connection_id })
      if (owner) {
        ownerId = owner.userId
        connectionOwners.set(m.business_connection_id, ownerId)
      }
    }

    if (!ownerId) {
      console.warn(`⚠️ Owner not found for connection ID: ${m.business_connection_id}`)
      return
    }

    const oldMsg = await Msg.findOne({
      ownerId: ownerId,
      chatId: m.chat.id,
      messageId: m.message_id
    })

    const newMedia = extractMedia(m)
    let newText = m.text || ''
    if (!newText && !m.caption) {
      if (m.location) newText = '📍 [Lokatsiya/Joylashuv]'
      else if (m.contact) newText = '👤 [Kontakt]'
      else if (m.poll) newText = '📊 [So\'rovnoma]'
      else if (m.venue) newText = '🏢 [Joy/Venue]'
      else if (m.game) newText = '🎮 [O\'yin]'
      else if (m.dice) newText = `🎲 [Dice: ${m.dice.value}]`
    }

    if (oldMsg) {
      const isTextDiff = oldMsg.text !== newText
      const isCaptionDiff = oldMsg.caption !== (m.caption || '')
      const isMediaDiff = (oldMsg.media?.file_id || null) !== (newMedia?.file_id || null)

      if (isTextDiff || isCaptionDiff || isMediaDiff) {
        const formattedTime = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

        let reportText = `✏️ <b>AUDIT: XABAR TAHRIRLANDI</b>\n`
        reportText += `───────────────────\n`
        reportText += `👤 <b>Yuborgan:</b> ${formatSender(oldMsg.from)}\n`
        reportText += `💬 <b>Chat:</b> ${formatChat(m.chat)}\n`
        reportText += `───────────────────\n\n`

        if (isTextDiff) {
          reportText += `❌ <b>ESKI MATN:</b>\n`
          reportText += `<blockquote>${oldMsg.text || '[Bo\'sh]'}</blockquote>\n`
          reportText += `✅ <b>YANGI MATN:</b>\n`
          reportText += `<blockquote>${newText || '[Bo\'sh]'}</blockquote>\n\n`
        }

        if (isCaptionDiff) {
          reportText += `❌ <b>ESKI IZOH (Caption):</b>\n`
          reportText += `<blockquote>${oldMsg.caption || '[Bo\'sh]'}</blockquote>\n`
          reportText += `✅ <b>YANGI IZOH (Caption):</b>\n`
          reportText += `<blockquote>${m.caption || '[Bo\'sh]'}</blockquote>\n\n`
        }

        if (isMediaDiff) {
          reportText += `⚠️ <b>MEDIA O'ZGARTIRILDI:</b>\n`
          reportText += `• Eski media turi: <code>${oldMsg.media?.type || 'yo\'q'}</code>\n`
          reportText += `• Yangi media turi: <code>${newMedia?.type || 'yo\'q'}</code>\n\n`
        }

        reportText += `<i>🕒 Tahrirlangan vaqt: ${formattedTime}</i>`

        // Send comparative notification and the original media to the owner
        await sendAuditAlert(ownerId, reportText, oldMsg.media)
      }
    }

    const chatName = [m.chat.first_name, m.chat.last_name].filter(Boolean).join(' ') || m.chat.title || 'Noma\'lum'
    const isOutgoing = (m.chat.id !== m.from.id)

    // Update stored message with the new state
    const updatedData = {
      ownerId: ownerId,
      chatName: chatName,
      isOutgoing: isOutgoing,
      text: newText,
      caption: m.caption || '',
      media: newMedia || {
        type: null,
        file_id: null,
        file_unique_id: null,
        file_name: null,
        file_size: null,
        mime_type: null
      },
      date: m.date
    }

    await Msg.findOneAndUpdate(
      { ownerId: ownerId, chatId: m.chat.id, messageId: m.message_id },
      { $set: updatedData },
      { upsert: true }
    )
    console.log(`💾 Updated edited message ID=${m.message_id} in Chat=${m.chat.id}`)
  } catch (err) {
    console.error('❌ Error handling edited business message:', err)
  }
}

// ===== SECRETARY MODE: xabar(lar) o'chirildi =====
async function handleDeletedBusinessMessages(event) {
  try {
    let ownerId = connectionOwners.get(event.business_connection_id)
    if (!ownerId) {
      const owner = await User.findOne({ businessConnectionId: event.business_connection_id })
      if (owner) {
        ownerId = owner.userId
        connectionOwners.set(event.business_connection_id, ownerId)
      }
    }

    if (!ownerId) {
      console.warn(`⚠️ Owner not found for connection ID: ${event.business_connection_id}`)
      return
    }

    for (const msgId of event.message_ids) {
      const oldMsg = await Msg.findOne({
        ownerId: ownerId,
        chatId: event.chat.id,
        messageId: msgId
      })

      if (oldMsg) {
        const contentText = oldMsg.text || oldMsg.caption || ''
        const formattedTime = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

        let reportText = `🗑 <b>AUDIT: XABAR O'CHIRILDI</b>\n`
        reportText += `───────────────────\n`
        reportText += `👤 <b>Yuborgan:</b> ${formatSender(oldMsg.from)}\n`
        reportText += `💬 <b>Chat:</b> ${formatChat(event.chat)}\n`
        reportText += `───────────────────\n\n`

        if (contentText) {
          reportText += `📝 <b>O'CHIRILGAN MAZMUN:</b>\n`
          reportText += `<blockquote>${contentText}</blockquote>\n`
        }

        if (oldMsg.media?.type) {
          reportText += `📁 <b>Media turi:</b> <code>${oldMsg.media.type}</code>\n`
        }

        reportText += `\n<i>🕒 O'chirilgan vaqt: ${formattedTime}</i>`

        // Send alert along with deleted media
        await sendAuditAlert(ownerId, reportText, oldMsg.media)

        // Delete from DB
        await Msg.deleteOne({ _id: oldMsg._id })
        console.log(`🗑 Deleted message ID=${msgId} from database`)
      }
    }
  } catch (err) {
    console.error('❌ Error handling deleted business messages:', err)
  }
}

// Cache loading helper
async function loadConnectionCache() {
  try {
    const users = await User.find({ is_enabled: true })
    for (const u of users) {
      if (u.businessConnectionId) {
        connectionOwners.set(u.businessConnectionId, u.userId)
      }
    }
    console.log(`⚡️ Cached ${connectionOwners.size} active business connections`)
  } catch (err) {
    console.error('❌ Error loading connection cache:', err)
  }
}

// ===== START =====
app.listen(PORT, async () => {
  try {
    await connectDb()
    await loadBotInfo(); await setupCmds(); await loadConnectionCache()
  } catch (err) {
    console.error('❌ Startup error:', err)
  }
  console.log(`✅ Server port ${PORT}`)
})

export default app