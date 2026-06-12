import mongoose from 'mongoose';

const AptitudeQuestionSchema = new mongoose.Schema({
  category: { 
    type: String, 
    required: true, 
    enum: ["quantitative", "logical-reasoning", "verbal", "data-interpretation", "abstract", "technical"] 
  },
  // Added to support sub-topics like Percentages, Profit and Loss, etc.
  topic: { 
    type: String, 
    required: true,
    default: "General"
  },
  difficulty: { 
    type: String, 
    required: true, 
    enum: ["easy", "medium", "advanced"],
    default: "easy"
  },
  questionNumber: { type: Number, required: true },
  questionText: { type: String, required: true },
  options: {
    type: [String],
    required: true,
    validate: [arrayMinSize, 'MCQ questions must provide exactly 4 structured options.']
  },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, required: true }
}, { timestamps: true });

function arrayMinSize(val) {
  return val.length === 4;
}

// Adjust compound tracking indexes to prevent collisions across topics
AptitudeQuestionSchema.index({ category: 1, topic: 1, difficulty: 1, questionNumber: 1 }, { unique: true });

export default mongoose.model('AptitudeQuestion', AptitudeQuestionSchema);