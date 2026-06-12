import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  category: { type: String, required: true },     // e.g., "Quantitative Aptitude"
  topic: { type: String, required: true },        // Now explicitly mapped (e.g., "Percentages")
  difficulty: { type: String, required: true },   // "Basic", "Intermediate", "Advance"
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],    // ["75", "100", "125", "150"]
  correctAnswer: { type: String, required: true }, // "100"
  explanation: { type: String, default: "" }
});

export default mongoose.model('Question', QuestionSchema);