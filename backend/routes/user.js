const express = require("express");
const User = require("../models/User");
const Match = require("../models/Match");

const router = express.Router();

/**
 * @route   GET /api/user/leaderboard
 * @desc    Get top users sorted by ELO rating
 * @access  Public
 */
router.get("/leaderboard", async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ elo: -1 })
      .limit(30)
      .select("username elo avatarUrl selectedClass wins losses level");
    res.json(users);
  } catch (error) {
    console.error("[USER LEADERBOARD ERROR]", error);
    res.status(500).json({ message: "Server error fetching leaderboard" });
  }
});

/**
 * @route   GET /api/user/:username
 * @desc    Get user profile details & match history
 * @access  Public
 */
router.get("/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "Operator not found" });
    }

    // Fetch matches associated with this user
    const matches = await Match.find({
      $or: [{ player1Id: user._id }, { player2Id: user._id }]
    })
      .sort({ createdAt: -1 })
      .populate("player1Id", "username avatarUrl elo")
      .populate("player2Id", "username avatarUrl elo")
      .populate("problemId", "title difficulty");

    // Map match records to standard dynamic representation
    const formattedMatches = matches.map(m => {
      const isPlayer1 = m.player1Id._id.toString() === user._id.toString();
      const opponent = isPlayer1 ? m.player2Id : m.player1Id;
      const verdict = isPlayer1 ? m.player1Verdict : m.player2Verdict;

      let result = "DRAW";
      if (m.winnerId) {
        result = m.winnerId.toString() === user._id.toString() ? "WIN" : "LOSS";
      }

      return {
        id: m._id,
        opponent: opponent ? opponent.username : "Offline_Coder",
        result,
        date: new Date(m.startTime).toLocaleDateString([], { day: "numeric", month: "short" }),
        rp: isPlayer1 ? `${m.eloChangePlayer1 >= 0 ? "+" : ""}${m.eloChangePlayer1}` : `${m.eloChangePlayer2 >= 0 ? "+" : ""}${m.eloChangePlayer2}`,
        duration: m.duration || "15m 00s",
        verdict,
        title: m.problemId ? m.problemId.title : "DSA Decryption Knots"
      };
    });

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        selectedClass: user.selectedClass,
        avatarUrl: user.avatarUrl,
        elo: user.elo,
        coins: user.coins,
        xp: user.xp,
        level: user.level,
        wins: user.wins,
        losses: user.losses,
        createdAt: user.createdAt,
        matches: formattedMatches
      }
    });
  } catch (error) {
    console.error("[USER PROFILE ERROR]", error);
    res.status(500).json({ message: "Server error retrieving operator details" });
  }
});



module.exports = router;
