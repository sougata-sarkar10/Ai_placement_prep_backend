import mongoose from 'mongoose';

const TestCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true }
});

const CodingChallengeSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  category: { type: String, required: true }, // e.g., "Data Structures"
  topic: { type: String, required: true },    // e.g., "Arrays", "Dynamic Programming"
  description: { type: String, required: true },
  examples: [{
    input: String,
    output: String,
    explanation: String
  }],
  constraints: [{ type: String }],
  hints: [{ type: String }],
  starterCode: [{
    language: { type: String, required: true }, // "cpp", "java", "python", "javascript"
    code: { type: String, required: true }
  }],
  visibleTestCases: [TestCaseSchema],
  hiddenTestCases: [TestCaseSchema],
  companies: [{ type: String }],
  tags: [{ type: String }],
  acceptanceRate: { type: Number, default: 50.0 }
});

export default mongoose.model('CodingChallenge', CodingChallengeSchema);