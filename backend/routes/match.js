const express = require("express");
const Match = require("../models/Match");

const router = express.Router();

/**
 * @route   GET /api/match/:matchId
 * @desc    Get match details by matchId / ID
 * @access  Public
 */
router.get("/:matchId", async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate("player1Id", "username email avatarUrl elo level wins losses selectedClass")
      .populate("player2Id", "username email avatarUrl elo level wins losses selectedClass")
      .populate("problemId");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    res.json(match);
  } catch (error) {
    console.error("[MATCH DETAILED ERROR]", error);
    // If invalid Mongoose ObjectId format, search by custom fallback
    res.status(500).json({ message: "Server error retrieving duel logs" });
  }
});

/**
 * @route   GET /api/match/history/:userId
 * @desc    Get match history for a specific user ID
 * @access  Public
 */
router.get("/history/:userId", async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [{ player1Id: req.params.userId }, { player2Id: req.params.userId }]
    })
      .sort({ createdAt: -1 })
      .populate("player1Id player2Id problemId");

    res.json(matches);
  } catch (error) {
    console.error("[MATCH HISTORY ERROR]", error);
    res.status(500).json({ message: "Server error retrieving history list" });
  }
});

module.exports = router;
