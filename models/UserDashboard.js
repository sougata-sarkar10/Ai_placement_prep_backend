import mongoose from 'mongoose';

const UserDashboardSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, default: "guest_developer_101" },
  
  // New habit engineering tracking blocks
  streakMetrics: {
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: "" }, // Format: YYYY-MM-DD
    activityLog: { type: [String], default: [] }   // Array of strings: "YYYY-MM-DD"
  },

  aptitudeMetrics: {
    totalQuizzesTaken: { type: Number, default: 0 },
    averageAccuracy: { type: Number, default: 0 },
    topicsCompleted: { type: [String], default: [] }
  },

  codingMetrics: {
    solvedCount: { type: Number, default: 0 },
    solvedSlugs: { type: [String], default: [] },
    difficultyBreakdown: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 }
    }
  },

  resumeProfile: {
    hasAnalyzed: { type: Boolean, default: false },
    lastMatchScore: { type: Number, default: 0 },
    extractedSkills: { type: [String], default: [] },
    targetSector: { type: String, default: "" }
  }
}, { timestamps: true });

export default mongoose.model('UserDashboard', UserDashboardSchema);