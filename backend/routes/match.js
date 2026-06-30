const express = require("express");
const Match = require("../models/Match");
const mongoose = require("mongoose");
const Room = require("../models/Room");
const rateLimit = require("../middleware/rateLimiter");

const router = express.Router();

/**
 * @route   GET /api/match/:matchId
 * @desc    Get match details by matchId / ID (supports roomId fallback to avoid CastErrors)
 * @access  Public
 */
router.get("/:matchId", rateLimit("relaxed"), async (req, res) => {
  try {
    const { matchId } = req.params;
    let match;

    if (mongoose.Types.ObjectId.isValid(matchId)) {
      match = await Match.findById(matchId)
        .populate("player1Id", "username email avatarUrl elo level wins losses selectedClass")
        .populate("player2Id", "username email avatarUrl elo level wins losses selectedClass")
        .populate("problemId");
    } else {
      // Fallback: If it's a room code (e.g. CA-XXXXX), find the room first
      const room = await Room.findOne({ roomCode: matchId });
      if (room) {
        match = await Match.findOne({
          $or: [
            { player1Id: room.admin, player2Id: room.selectedOpponent },
            { player1Id: room.selectedOpponent, player2Id: room.admin }
          ]
        })
          .sort({ createdAt: -1 })
          .populate("player1Id", "username email avatarUrl elo level wins losses selectedClass")
          .populate("player2Id", "username email avatarUrl elo level wins losses selectedClass")
          .populate("problemId");
      }
    }

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    res.json(match);
  } catch (error) {
    console.error("[MATCH DETAILED ERROR]", error);
    res.status(500).json({ message: "Server error retrieving duel logs" });
  }
});

/**
 * @route   GET /api/match/history/:userId
 * @desc    Get match history for a specific user ID
 * @access  Public
 */
router.get("/history/:userId", rateLimit("relaxed"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipIdx = (page - 1) * limit;

    const matches = await Match.find({
      $or: [{ player1Id: req.params.userId }, { player2Id: req.params.userId }]
    })
      .sort({ createdAt: -1 })
      .skip(skipIdx)
      .limit(limit)
      .populate("player1Id player2Id problemId");

    res.json(matches);
  } catch (error) {
    console.error("[MATCH HISTORY ERROR]", error);
    res.status(500).json({ message: "Server error retrieving history list" });
  }
});

module.exports = router;
