import dotenv from 'dotenv';
// CRITICAL: Initialize environment variables at the absolute top of the compilation stream
dotenv.config(); 

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';

// 1. ROUTE PIPELINE MODULE IMPORTS
import authRoutes from './routes/authRoutes.js';
import codeRoutes from './routes/codeRoutes.js'; 
import testRoutes from './routes/testRoutes.js'; 
import interviewRoutes from './routes/interviewRoutes.js';
import challengeRoutes from './routes/challengeRoutes.js'; 
import resumeRoutes from './routes/resumeRoutes.js';

import { ensurePistonIsRunning } from './services/dockerManager.js';

const app = express();

// 2. STABLE ENV-AWARE CORS MIDDLEWARE (Handles dual environment traffic)
const allowedOrigins = [
  'http://localhost:5173',
  'https://ai-placement-prep-ui.onrender.com' // Authorized Cloud Production Domain Layout
];

app.use(cors({
  origin: function (origin, callback) {
    // Permit server-to-server or programmatic test runner tools with empty origins
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by system cross-origin access rules (CORS)'));
    }
  },
  credentials: true // Crucial parameter forcing the storage of cookie strings over networks
}));

app.use(express.json());
app.use(cookieParser()); 

// 3. SECURE SESSION BACKING WITH ENV OPTIMIZATION
app.use(session({
  secret: process.env.JWT_SECRET || 'temporary_passport_session_encryption_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    // Secure flag enforces cookies only transmit over encrypted HTTPS channels on Render
    secure: process.env.NODE_ENV === 'production', 
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
  }
}));

// 4. ENV CONDITIONAL DOCKER INVOCATION (Prevents initialization crash loops on Render cloud servers)
if (process.env.NODE_ENV !== 'production') {
  ensurePistonIsRunning();
} else {
  console.log("🐳 [Docker Sync] Cloud environment active. Intercepting and rerouting sandbox calls to remote cluster pipelines.");
}

// 5. API ROUTE ROUTING GATEWAYS
app.use('/api/auth', authRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/challenges', challengeRoutes); 
app.use('/api/resume', resumeRoutes);

// 6. DASHBOARD METRICS RESILIENT CORE FALLBACK ENDPOINT
app.get('/api/dashboard/metrics', (req, res) => {
  return res.json({
    success: true,
    aptitudeSolved: 0,
    codingSolved: 0,
    interviewsCompleted: 0,
    resumeAtsScore: 0,
    recentActivity: []
  });
});

// 7. MONGO CONNECTIVITY STRATEGY & LISTENER LAUNCH
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL)
  .then(() => {
    console.log("MongoDB Cloud Pipeline Online! 🔌");
    app.listen(PORT, () => console.log(`🚀 Server is blazing on port ${PORT}`));
  })
  .catch(err => console.error("Database Connection Aborted:", err));