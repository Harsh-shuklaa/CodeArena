const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Problem = require("./models/Problem");
const User = require("./models/User");
const Match = require("./models/Match");

dotenv.config();

const problems = [
  {
    title: "Two Sum Protocol",
    difficulty: "Easy",
    statement: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
    sampleInput: "nums = [2,7,11,15], target = 9",
    sampleOutput: "[0,1]",
    testcases: [
      { input: "2 7 11 15\n9", output: "0 1" },
      { input: "3 2 4\n6", output: "1 2" },
      { input: "3 3\n6", output: "0 1" }
    ]
  },
  {
    title: "Binary Packet Decryptor",
    difficulty: "Medium",
    statement: "Given a binary string s containing packet configurations, find the length of the longest contiguous subpacket block containing an equal number of 0s and 1s.",
    constraints: "1 <= s.length <= 5 * 10^4\ns[i] is either '0' or '1'",
    sampleInput: "s = \"010\"",
    sampleOutput: "2",
    testcases: [
      { input: "010", output: "2" },
      { input: "00110", output: "4" },
      { input: "111", output: "0" }
    ]
  },
  {
    title: "Obsidian Knot Decrypter",
    difficulty: "Hard",
    statement: "You are given a sequence of encoded integers representing encrypted nodes. Write an algorithm to find the longest palindromic subsequence that can be formed by rearranging the bits of any contiguous subsegment of length K.",
    constraints: "1 <= stream.length <= 10^5\n1 <= K <= stream.length",
    sampleInput: "stream = [12, 15, 2, 8, 3], K=3",
    sampleOutput: "7",
    testcases: [
      { input: "12 15 2 8 3\n3", output: "7" },
      { input: "1 2 3\n2", output: "3" },
      { input: "42\n1", output: "1" }
    ]
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/codearena");
    console.log("[SEEDING] MongoDB Connected successfully");

    // Clear existing data
    await Problem.deleteMany({});
    console.log("[SEEDING] Cleared existing problems.");

    // Optional: Clear active test users / matches to start clean
    await Match.deleteMany({});
    console.log("[SEEDING] Cleared matches history.");

    // Insert new starter problems
    const createdProblems = await Problem.insertMany(problems);
    console.log(`[SEEDING] Successfully inserted ${createdProblems.length} starter challenges.`);

    await mongoose.disconnect();
    console.log("[SEEDING] Database seeded, mongoose disconnected.");
    process.exit(0);
  } catch (error) {
    console.error("[SEEDING ERROR] Failed to seed database:", error.message);
    process.exit(1);
  }
};

seedDB();
