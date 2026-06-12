import express from 'express';
import multer from 'multer';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import InterviewSession from '../models/InterviewSession.js';
import { generateNextQuestion, generateFinalScorecard } from '../services/interviewAI.js';

const router = express.Router();
const MOCK_USER = "guest_developer_101";

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Extracts plain text from a raw PDF file buffer
 */
const extractTextFromBuffer = async (fileBuffer) => {
  try {
    const data = new Uint8Array(fileBuffer);
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  } catch (e) {
    console.warn("PDF parser skipped: Using generic text fallbacks.", e.message);
    return "";
  }
};

// 1. INITIALIZE CUSTOM INTERVIEW ROUTE: POST /api/interview/start
router.post('/start', upload.single('resume'), async (req, res) => {
  const { track, targetRole, jobDescription } = req.body;
  const file = req.file;

  if (!track) return res.status(400).json({ success: false, error: "Please select an interview track parameter." });

  try {
    // Terminate any trailing active sessions
    await InterviewSession.updateMany({ userId: MOCK_USER, status: 'active' }, { status: 'completed' });

    // Process PDF text extraction if a resume was uploaded
    let extractedResumeText = "";
    if (file) {
      extractedResumeText = await extractTextFromBuffer(file.buffer);
    }

    const assignedRole = targetRole || "Software Developer";

    // Request the first dynamic, tailored interview question from Gemini
    const firstQuestion = await generateNextQuestion(
      track, 
      [], 
      1, 
      assignedRole, 
      extractedResumeText, 
      jobDescription
    );

    const newSession = await InterviewSession.create({
      userId: MOCK_USER,
      track,
      targetRole: assignedRole,
      resumeTextContext: extractedResumeText,
      jobDescriptionContext: jobDescription || "",
      conversationLog: [{ question: firstQuestion, userAnswer: "" }]
    });

    return res.status(200).json({ success: true, session: newSession });
  } catch (error) {
    console.error("Interview Router Core Breakdown:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 2. RESPOND TO QUESTIONS: POST /api/interview/respond
router.post('/respond', async (req, res) => {
  const { sessionId, answer } = req.body;
  if (!sessionId || !answer) return res.status(400).json({ success: false, error: "Missing required tracking values." });

  try {
    const session = await InterviewSession.findById(sessionId);
    if (!session || session.status === 'completed') {
      return res.status(404).json({ success: false, error: "Active session structure not found." });
    }

    const currentRoundIndex = session.currentRound - 1;
    session.conversationLog[currentRoundIndex].userAnswer = answer;

    if (session.currentRound < session.totalRounds) {
      session.currentRound += 1;

      // Request next context-aware question from Gemini
      const nextQuestionText = await generateNextQuestion(
        session.track,
        session.conversationLog,
        session.currentRound,
        session.targetRole,
        session.resumeTextContext,
        session.jobDescriptionContext
      );

      session.conversationLog.push({ question: nextQuestionText, userAnswer: "" });
      await session.save();

      return res.status(200).json({ success: true, session });
    } else {
      // Final round completed! Generate customized metrics scorecard report
      session.status = 'completed';
      const computedScorecard = await generateFinalScorecard(session.track, session.conversationLog, session.targetRole);
      session.finalScorecard = computedScorecard;
      
      await session.save();
      return res.status(200).json({ success: true, session });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;