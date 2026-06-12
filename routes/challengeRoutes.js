import express from 'express';
import CodingChallenge from '../models/CodingChallenge.js';

const router = express.Router();

/**
 * FETCH ALL SEEDED CODING CHALLENGES
 * Route: GET /api/challenges
 */
router.get('/', async (req, res) => {
  try {
    // Fetch all problems from the MongoDB cluster
    const challenges = await CodingChallenge.find({});
    
    // GUARANTEE: Always send back an array, even if empty, so the frontend's .map() never crashes!
    return res.status(200).json(Array.isArray(challenges) ? challenges : []);
  } catch (error) {
    console.error("Critical Failure fetching from CodingChallenge Collection:", error.message);
    
    // Fallback: Send a clean 500 error payload with an explicit empty array to protect React
    return res.status(500).json({
      success: false,
      error: "Failed to fetch challenges from database storage layers.",
      problems: [] // Safety blanket fallback parameter
    });
  }
});

/**
 * FETCH SINGLE CHALLENGE BY SLUG IDENTIFIER
 * Route: GET /api/challenges/:slug
 */
router.get('/:slug', async (req, res) => {
  try {
    const challenge = await CodingChallenge.findOne({ slug: req.params.slug });
    
    if (!challenge) {
      return res.status(404).json({ success: false, error: "Challenge matching slug target not found." });
    }
    
    return res.status(200).json(challenge);
  } catch (error) {
    console.error(`Failure fetching problem slug [${req.params.slug}]:`, error.message);
    return res.status(500).json({ success: false, error: "Internal registry connection interruption." });
  }
});

export default router;