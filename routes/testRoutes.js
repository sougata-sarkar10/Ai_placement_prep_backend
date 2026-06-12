import express from 'express';
import AptitudeQuestion from '../models/AptitudeQuestion.js';

const router = express.Router();

/**
 * FETCH APTITUDE QUESTIONS WITH AUTO-FALLBACK
 * Route: GET /api/tests/aptitude
 */
router.get('/aptitude', async (req, res) => {
  const { category, topic, difficulty } = req.query;
  
  // Build a highly adaptive query filter mapping
  let primaryQuery = { category };
  if (difficulty) primaryQuery.difficulty = difficulty.toLowerCase();
  if (category === 'quantitative' && topic) primaryQuery.topic = topic;

  try {
    // Attempt to search using strict filters
    let questions = await AptitudeQuestion.find(primaryQuery).sort({ questionNumber: 1 });
    
    // FALLBACK SAFETY NET: If strict sub-topic/difficulty has no data yet,
    // drop the strict locks and return all questions under the master category so the UI never stands empty!
    if (questions.length === 0) {
      console.log(`[Query Fallback] No strict matches for ${category}. Loosening filter parameters...`);
      questions = await AptitudeQuestion.find({ category }).sort({ questionNumber: 1 });
    }

    // Format output options safely
    const structuredMcqs = questions.map((q, index) => {
      let optionsArray = q.options || [];
      if (optionsArray.length === 0) {
        optionsArray = [
          q.correctAnswer,
          "Alternative Option B",
          "Alternative Option C",
          "Alternative Option D"
        ];
        // Scramble the option layout presentation cleanly
        optionsArray.sort(() => Math.random() - 0.5);
      }

      return {
        _id: q._id,
        category: q.category,
        topic: q.topic || "General",
        difficulty: q.difficulty || "easy",
        // Enforce fallback index count integers if questionNumber is unassigned during seeding
        questionNumber: q.questionNumber || (index + 1),
        questionText: q.questionText,
        options: optionsArray,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      };
    });

    return res.status(200).json(structuredMcqs);
  } catch (err) {
    console.error("Critical Failure inside Aptitude Route handling:", err.message);
    return res.status(500).json({ success: false, error: "Internal Database Connection Timeout." });
  }
});

export default router;