import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import AptitudeQuestion from '../models/AptitudeQuestion.js';

dotenv.config();

const BASE_BACKEND_DIR = path.join('C:', 'Users', 'sarka', 'CODING', 'FULL-STACK PROJECT', 'ai-placement-platform', 'backend');
const QUANT_JSON_SOURCE = path.join(BASE_BACKEND_DIR, 'data', 'aptitudeDump.json');

const seedQuantData = async () => {
  try {
    console.log(` Reading source metrics from: ${QUANT_JSON_SOURCE}`);

    // 1. Verify existence of the JSON file
    if (!fs.existsSync(QUANT_JSON_SOURCE)) {
      throw new Error(`Data target missing. Ensure your quant data file is named 'aptitudeDump.json' inside backend/data/`);
    }

    const fileContent = fs.readFileSync(QUANT_JSON_SOURCE, 'utf-8');
    const rawDataArray = JSON.parse(fileContent);

    console.log(`Found ${rawDataArray.length} raw records inside aptitudeDump.json. Starting mapping normalization...`);

    // 2. Establish Mongo cloud connectivity
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL);
    console.log("Connected to MongoDB cluster securely for conversion phase. 🔌");

    const formattedRecords = rawDataArray.map((item, index) => {
      // Extract target properties safely, using fallback structural constraints if fields differ
      const parsedQuestionText = item.questionText || item.question || "";
      const parsedCorrectAnswer = item.correctAnswer || item.answer || "";
      const parsedExplanation = item.explanation || item.solution || "Refer to core math evaluation rules for breakdown steps.";
      
      // Map difficulties safely to match the strict schema string parameters
      let rawDiff = (item.difficulty || "easy").toLowerCase();
      if (rawDiff === 'basic') rawDiff = 'easy';
      if (rawDiff === 'intermediate') rawDiff = 'medium';
      if (rawDiff === 'advanced' || rawDiff === 'advance') rawDiff = 'advanced';

      // Capture options or dynamically build standard multi-choice fields if the source line lacks them
      let optionsArray = item.options || [];
      if (!Array.isArray(optionsArray) || optionsArray.length !== 4) {
        optionsArray = [
          parsedCorrectAnswer,
          "Alternative Option B Placeholder",
          "Alternative Option C Placeholder",
          "Alternative Option D Placeholder"
        ];
      }

      return {
        category: "quantitative", // Force match the string literal used by the frontend view
        topic: item.topic || "General", 
        difficulty: rawDiff,
        questionNumber: parseInt(item.questionNumber || item.id || (index + 1), 10),
        questionText: parsedQuestionText.trim(),
        options: optionsArray,
        correctAnswer: parsedCorrectAnswer.trim(),
        explanation: parsedExplanation.trim()
      };
    });

    console.log("Normalization phase complete. Synchronizing records into MongoDB instances...");

    // 3. Sync records using an upsert loop to protect against duplicate number key crashes
    let syncCount = 0;
    for (let doc of formattedRecords) {
      if (!doc.questionText || !doc.correctAnswer) {
        console.warn(`[Skipping Row #${doc.questionNumber}] Missing required text parameters.`);
        continue;
      }

      await AptitudeQuestion.findOneAndUpdate(
        { 
          category: doc.category, 
          topic: doc.topic, 
          difficulty: doc.difficulty, 
          questionNumber: doc.questionNumber 
        },
        doc,
        { upsert: true, new: true }
      );
      syncCount++;
    }

    console.log(`\n🎉 Data Sync Complete! Successfully loaded ${syncCount} Quantitative Aptitude rows straight to your database cluster.`);
    process.exit(0);
  } catch (err) {
    console.error("Critical Failure running Quant Seeder Utility:", err.message);
    process.exit(1);
  }
};

seedQuantData();