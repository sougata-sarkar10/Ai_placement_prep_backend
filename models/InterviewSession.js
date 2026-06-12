import mongoose from 'mongoose';

const InterviewSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, default: "guest_developer_101" },
  track: { type: String, required: true, enum: ["Technical", "Behavioral", "Mixed"] },
  status: { type: String, required: true, enum: ["active", "completed"], default: "active" },
  currentRound: { type: Number, default: 1 },
  totalRounds: { type: Number, default: 5 },
  
  // Customization fields
  targetRole: { type: String, default: "Software Engineer" },
  resumeTextContext: { type: String, default: "" },
  jobDescriptionContext: { type: String, default: "" },
  
  conversationLog: [
    {
      question: { type: String, required: true },
      userAnswer: { type: String, default: "" }
    }
  ],
  
  finalScorecard: {
    overallScore: { type: Number, default: 0 },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    summaryVerdict: { type: String, default: "" }
  }
}, { timestamps: true });

export default mongoose.model('InterviewSession', InterviewSessionSchema);