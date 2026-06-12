import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CodingChallenge from './models/CodingChallenge.js';

dotenv.config();

const sampleProblems = [
  {
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    category: "Data Structures",
    topic: "Arrays",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      }
    ],
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
    hints: ["A brute force approach would look at all pairs, resulting in O(n²) time.", "Can we trade space complexity for speed? Try using a Hash Map."],
    starterCode: [
      {
        language: "javascript",
        code: "function twoSum(nums, target) {\n    // Write your code here\n};"
      },
      {
        language: "python",
        code: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass"
      }
    ],
    visibleTestCases: [
      { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]" }
    ],
    hiddenTestCases: [
      { input: "[3,2,4]\n6", expectedOutput: "[1,2]" },
      { input: "[3,3]\n6", expectedOutput: "[0,1]" }
    ],
    tags: ["Arrays", "Hash Table"],
    companies: ["Google", "Amazon", "Meta"]
  }
];

const seedCodingDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for Coding Seed...");
    
    await CodingChallenge.deleteMany({});
    await CodingChallenge.insertMany(sampleProblems);
    
    console.log("Coding challenges seeded successfully! 🚀");
    process.exit(0);
  } catch (error) {
    console.error("Seeding crashed:", error);
    process.exit(1);
  }
};

seedCodingDB();