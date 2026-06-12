import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CodingChallenge from './models/CodingChallenge.js';

dotenv.config();

const __dirname = path.resolve();
const PROBLEMS_DIR = path.join(__dirname, 'data', 'problems');

const seedRealLeetcodeData = async () => {
  try {
    // 1. Establish database connection link
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for LeetCode Synchronization... 🔌");

    // Clear old data metrics
    await CodingChallenge.deleteMany({});
    console.log("Flushed existing coding records from collection index.");

    // 2. Read all files inside our newly added directory
    if (!fs.existsSync(PROBLEMS_DIR)) {
      console.error(`Error: The data directory path '${PROBLEMS_DIR}' does not exist.`);
      process.exit(1);
    }

    const files = fs.readdirSync(PROBLEMS_DIR).filter(file => file.endsWith('.json'));
    console.log(`Found ${files.length} problem JSON profiles to parse...`);

    const processedChallenges = [];

    // 3. Loop through every single file to parse and map it
    for (const file of files) {
      const filePath = path.join(PROBLEMS_DIR, file);
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(rawData);

      // Extract only the 4 core languages your front-end supports
      const starterCodeArray = [];
      if (data.code_snippets) {
        if (data.code_snippets.javascript) {
          starterCodeArray.push({ language: 'javascript', code: data.code_snippets.javascript });
        }
        if (data.code_snippets.python3 || data.code_snippets.python) {
          starterCodeArray.push({ language: 'python', code: data.code_snippets.python3 || data.code_snippets.python });
        }
        if (data.code_snippets.cpp) {
          starterCodeArray.push({ language: 'cpp', code: data.code_snippets.cpp });
        }
        if (data.code_snippets.java) {
          starterCodeArray.push({ language: 'java', code: data.code_snippets.java });
        }
      }

      // Format custom examples structure out of text variations
      const examplesArray = data.examples?.map(ex => ({
        input: ex.example_text?.split('\n')?.[0]?.replace('Input: ', '') || "See text bounds",
        output: ex.example_text?.split('\n')?.[1]?.replace('Output: ', '') || "Standard output mapping",
        explanation: ex.example_text?.split('\n')?.[2]?.replace('Explanation: ', '') || ""
      })) || [];

      // Combine topics to form a unique topic name
      const primaryTopic = data.topics && data.topics.length > 0 ? data.topics[0] : 'Algorithms';

      // Assemble object mapping matching your structural schema guidelines
      processedChallenges.push({
        title: data.title,
        slug: data.problem_slug,
        difficulty: data.difficulty || 'Easy',
        category: 'Algorithms',
        topic: primaryTopic + 's', // Normalize "Array" to "Arrays" for filtering
        description: data.description || "Refer to sample examples for specification constraints.",
        examples: examplesArray,
        constraints: data.constraints || [],
        hints: data.hints || [],
        starterCode: starterCodeArray,
        // Default safe baseline configurations for test runners
        visibleTestCases: [{ input: "1", expectedOutput: "1" }],
        hiddenTestCases: [{ input: "1", expectedOutput: "1" }],
        tags: data.topics || [],
        acceptanceRate: 50.0
      });
    }

    // 4. Batch push to cloud cluster instances
    if (processedChallenges.length > 0) {
      await CodingChallenge.insertMany(processedChallenges);
      console.log(`\nSuccess! Extracted and injected ${processedChallenges.length} real LeetCode problems into MongoDB! 🚀`);
    } else {
      console.log("No valid records generated.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Critical seeding routine crash:", error);
    process.exit(1);
  }
};

seedRealLeetcodeData();