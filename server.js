import dotenv from 'dotenv';
// CRITICAL: Load environment variables before ANY other internal services boot
dotenv.config(); 

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';

// 1. IMPORT ALL VERIFIED ROUTE CHANNELS
import authRoutes from './routes/authRoutes.js';
import codeRoutes from './routes/codeRoutes.js'; 
import testRoutes from './routes/testRoutes.js'; // Handlers for Aptitude arrays
import interviewRoutes from './routes/interviewRoutes.js';
// Add fallback/placeholders if these individual file files aren't created yet
import challengeRoutes from './routes/challengeRoutes.js'; 
import resumeRoutes from './routes/resumeRoutes.js';

import { ensurePistonIsRunning } from './services/dockerManager.js';

const app = express();

// 2. MIDDLEWARE PIPELINES
app.use(cors({
  origin: 'http://localhost:5173', // Your frontend Vite development address
  credentials: true // Permits secure HttpOnly cookie tokens to cross-verify ports
}));
app.use(express.json());
app.use(cookieParser()); 

// 3. SECURE SESSION BACKING (Passport and OAuth Anti-Forgery Dependency)
app.use(session({
  secret: process.env.JWT_SECRET || 'temporary_passport_session_encryption_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Switch to true down the line when linking production SSL certificates
}));

// Initialize background execution containers cleanly
ensurePistonIsRunning();

// 4. LIVE ROUTE MOUNTING GATEWAYS
app.use('/api/auth', authRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/challenges', challengeRoutes); // FIXES: 404 Pipeline Synchronizer Interrupted error!
app.use('/api/resume', resumeRoutes);

// 5. LIVE INTEGRATED DASHBOARD METRICS ROUTE
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

// 6. DB CONNECTION & PORT LISTENER INITIALIZATION
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL)
  .then(() => {
    console.log("MongoDB Cloud Pipeline Online! 🔌");
    app.listen(PORT, () => console.log(`🚀 Server is blazing on http://localhost:${PORT}`));
  })
  .catch(err => console.error("Database Connection Aborted:", err));