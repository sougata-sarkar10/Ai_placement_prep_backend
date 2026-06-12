import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  platformId: { type: String, unique: true, sparse: true }, // Added for custom lowercase handles (e.g., dev_sarkar99)
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String },
  provider: { type: String, enum: ['local', 'google', 'linkedin'], default: 'local' },
  providerId: { type: String },
  avatar: { type: String },
  otpCode: { type: String },
  otpExpires: { type: Date }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);