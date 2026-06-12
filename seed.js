import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Question from './models/Test.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    // 1. Establish database connection link
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connection Secure for Seeding... 🔌");

    // 2. Read the converted JSON dataset
    const rawData = fs.readFileSync('./data/aptitudeDump.json', 'utf-8');
    const questions = JSON.parse(rawData);

    // 3. Prevent duplicate entry piling by wiping old mock data entries
    await Question.deleteMany({ category: "Quantitative Aptitude" });
    
    // 4. Batch inject our structured dataset arrays
    await Question.insertMany(questions);
    console.log(`Successfully injected ${questions.length} Aptitude Questions! 🚀`);

    // 5. Terminate the active thread smoothly
    process.exit(0);
  } catch (error) {
    console.error("Critical Seeding Failure:", error);
    process.exit(1);
  }
};

seedDatabase();