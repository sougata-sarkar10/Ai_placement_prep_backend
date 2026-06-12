import express from 'express';
import multer from 'multer';
import { analyzeResumeData } from '../services/resumeAnalyzer.js';

const router = express.Router();

// Configure memory storage thresholds so we never bloat disk drives with temporary PDF uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Maximum file cap size of 5 Megabytes
});

// Primary API Entry point: POST /api/resume/analyze
router.post('/analyze', upload.single('resume'), async (req, res) => {
  try {
    const { targetSector, jobDescription } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: "Missing required file parameter resource stream." });
    }
    if (!targetSector) {
      return res.status(400).json({ success: false, error: "Please pick an industry sector target before generating reports." });
    }

    // Pass the raw memory data block straight down to the AI processing utility lines
    const reportAnalysis = await analyzeResumeData(file.buffer, targetSector, jobDescription);

    return res.status(200).json({
      success: true,
      analysis: reportAnalysis
    });

  } catch (error) {
    console.error("Caught Endpoint Exception inside Resume Core Router:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during document assessment processing."
    });
  }
});

export default router;