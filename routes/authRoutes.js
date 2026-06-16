import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import twilio from 'twilio'; 
import passport from 'passport';
import User from '../models/User.js';
import dotenv from 'dotenv';
import '../services/passportSetup.js'; // Ensure passport social strategies are initiated cleanly

// 1. Configure single environment variable scope loader
dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secure_orchestrator_hash_key_101";

// 👑 ENVIRONMENT RESOLUTION: Determine frontend origins dynamically to support both local and Render traffic
const FRONTEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://ai-placement-prep-ui.onrender.com' // Live Frontend on Render
  : 'http://localhost:5173';                    // Local Development Machine

// 2. Safe instantiator to prevent server boot failure if keys take a millisecond to load
const getTwilioClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("Missing Twilio credentials inside environment variables.");
  }
  return twilio(sid, token);
};

const createTokenAndSetCookie = (user, res) => {
  const token = jwt.sign({ id: user._id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Encrypted HTTPS only when live on Render
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // Essential for cross-site cookies on Render
    maxAge: 7 * 24 * 60 * 60 * 1000 
  });
};

// STANDARD REGISTRATION: POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ success: false, error: "Email is already registered inside our platform database." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword, provider: 'local' });

    createTokenAndSetCookie(newUser, res);
    return res.status(201).json({ success: true, user: { id: newUser._id, name: newUser.name, email: newUser.email } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// STANDARD LOGIN: POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, error: "Invalid credential entries." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, error: "Invalid credential entries." });

    createTokenAndSetCookie(user, res);
    return res.status(200).json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// LIVE MOBILE OTP REQUEST (Twilio REST Stream Sync)
router.post('/otp-request', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, error: "Please enter a valid phone number." });

  try {
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString(); 
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000); 

    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({ name: `User ${phone.slice(-4)}`, phone, provider: 'local' });
    }
    
    user.otpCode = generatedOtp;
    user.otpExpires = expiryTime;
    await user.save();

    // Call client wrapper dynamically
    const twilioClient = getTwilioClient();

    await twilioClient.messages.create({
      body: `Your PrepAI Platform verification safety access code is: ${generatedOtp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone 
    });

    console.log(`📡 [Twilio Success] Live SMS token transmitted successfully to: ${phone}`);
    return res.status(200).json({ success: true, message: "Verification OTP code sent to your phone!" });
  } catch (err) {
    console.error("Twilio Gateway Error:", err.message);
    return res.status(500).json({ success: false, error: `Failed to dispatch SMS payload: ${err.message}` });
  }
});

// 👑 MERGED & OPTIMIZED OTP VERIFY: POST /api/auth/otp-verify
router.post('/otp-verify', async (req, res) => {
  const { phone, otp, name, platformId } = req.body;
  try {
    const user = await User.findOne({ phone, otpCode: otp, otpExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ success: false, error: "Invalid or expired verification OTP entry." });

    user.otpCode = undefined;
    user.otpExpires = undefined;

    // Custom configuration parameters updates for sandboxed mobile registration pipelines
    if (name) user.name = name;
    if (platformId) {
      if (platformId.includes('@') || !/^[a-z0-9_.-]+$/.test(platformId)) {
        return res.status(400).json({ success: false, error: "Platform ID format rejected: Use only lowercase, numbers, and symbols (no '@')." });
      }
      
      const idTaken = await User.findOne({ platformId });
      if (idTaken && idTaken.phone !== phone) {
        return res.status(400).json({ success: false, error: "This unique Platform ID handle is already taken." });
      }
      user.platformId = platformId.toLowerCase().trim();
    }

    await user.save();

    createTokenAndSetCookie(user, res);
    return res.status(200).json({ success: true, user: { id: user._id, name: user.name, phone: user.phone, platformId: user.platformId } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DE-AUTHENTICATE / LOGOUT CLEARANCE
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
  });
  return res.status(200).json({ success: true, message: "Session token logs unmounted completely." });
});

// ---- REAL GOOGLE OAUTH REDIRECTS ----
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  prompt: 'select_account' 
}));

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/?error=oauth_failed` })(req, res, next);
}, (req, res) => {
  const token = jwt.sign({ id: req.user._id, name: req.user.name }, JWT_SECRET, { expiresIn: '7d' });
  
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  // 👑 FIXED: Dynamically redirects right back to the matching live layout domain base URL
  res.redirect(`${FRONTEND_URL}/?auth_success=true&name=${encodeURIComponent(req.user.name)}`);
});

// ---- FIXED LINKEDIN REDIRECT CHANNELS FORCING ACCOUNT SELECTION ----
router.get('/linkedin', passport.authenticate('linkedin', {
  prompt: 'login' 
}));

router.get('/linkedin/callback', (req, res, next) => {
  passport.authenticate('linkedin', { session: false, failureRedirect: `${FRONTEND_URL}/?error=oauth_failed` })(req, res, next);
}, (req, res) => {
  const token = jwt.sign({ id: req.user._id, name: req.user.name }, JWT_SECRET, { expiresIn: '7d' });
  
  res.cookie('token', token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', 
    maxAge: 7 * 24 * 60 * 60 * 1000 
  });
  
  // 👑 FIXED: Dynamically redirects right back to the matching live layout domain base URL
  res.redirect(`${FRONTEND_URL}/?auth_success=true&name=${encodeURIComponent(req.user.name)}`);
});

export default router;