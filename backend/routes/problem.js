const express = require("express");
const Problem = require("../models/Problem");

const router = express.Router();

/**
 * @route   GET /api/problem/random
 * @desc    Get a random problem, optionally filtered by difficulty
 * @access  Public
 */
router.get("/random", async (req, res) => {
  try {
    const { difficulty } = req.query;
    
    let filter = {};
    if (difficulty && ["Easy", "Medium", "Hard"].includes(difficulty)) {
      filter.difficulty = difficulty;
    }

    const count = await Problem.countDocuments(filter);
    if (count === 0) {
      return res.status(404).json({ message: "No challenges found matching query" });
    }

    const randomIdx = Math.floor(Math.random() * count);
    const problem = await Problem.findOne(filter).skip(randomIdx);
    
    res.json(problem);
  } catch (error) {
    console.error("[PROBLEM RANDOM ERROR]", error);
    res.status(500).json({ message: "Server error fetching coding challenge" });
  }
});

/**
 * @route   POST /api/problem/add
 * @desc    Add a new challenge
 * @access  Public
 */
router.post("/add", async (req, res) => {
  try {
    const { title, difficulty, statement, constraints, sampleInput, sampleOutput, testcases } = req.body;

    if (!title || !difficulty || !statement || !testcases || testcases.length === 0) {
      return res.status(400).json({ message: "Please provide title, difficulty, statement, and test cases." });
    }

    const problem = await Problem.create({
      title,
      difficulty,
      statement,
      constraints: constraints || "",
      sampleInput: sampleInput || "",
      sampleOutput: sampleOutput || "",
      testcases
    });

    res.status(201).json(problem);
  } catch (error) {
    console.error("[PROBLEM ADD ERROR]", error);
    res.status(500).json({ message: "Server error creating challenge" });
  }
});

module.exports = router;
