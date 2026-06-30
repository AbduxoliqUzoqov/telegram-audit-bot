import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true},
  firstName: { type: String , default:''},
  lastName: { type: String , default:''},
  username: { type: String},
  is_enabled: { type: Boolean, default: false},
  businessConnectionId: { type: String, default: null, index: true},
}, { timestamps: true })

export default mongoose.model('User', userSchema)