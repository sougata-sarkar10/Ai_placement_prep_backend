import express from 'express';
import UserDashboard from '../models/UserDashboard.js';

const router = express.Router();

// Fetch metrics profile: GET /api/dashboard/metrics
router.get('/metrics', async (req, res) => {
  const mockUserId = "guest_developer_101"; // Fallback identifier until auth is wired up
  
  try {
    let profile = await UserDashboard.findOne({ userId: mockUserId });
    
    // Safety check: If a user has never completed a task, initialize an empty tracker cleanly
    if (!profile) {
      profile = await UserDashboard.create({ userId: mockUserId });
    }

    return res.status(200).json({ success: true, metrics: profile });
  } catch (error) {
    console.error("Dashboard router trace crash:", error.message);
    return res.status(500).json({ success: false, error: "Unable to aggregate analytics profiles." });
  }
});

export default router;