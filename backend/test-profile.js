const mongoose = require("mongoose");
const User = require("./models/User");
const Match = require("./models/Match");
const Submission = require("./models/Submission");

const runTest = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/codearena");
    console.log("Connected to MongoDB.");

    const username = "Harsh";
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, "i") }
    })
      .select("-passwordHash")
      .populate("friends", "username avatarUrl elo status wins losses level");

    if (!user) {
      console.log("User not found in DB.");
      process.exit(0);
    }

    console.log("User found:", user.username);

    // Fetch matches associated with this user
    const matches = await Match.find({
      $or: [{ player1Id: user._id }, { player2Id: user._id }]
    })
      .sort({ createdAt: -1 })
      .populate("player1Id", "username avatarUrl elo")
      .populate("player2Id", "username avatarUrl elo")
      .populate("problemId", "title difficulty");

    console.log(`Fetched ${matches.length} matches.`);

    // Map match records
    const formattedMatches = matches.map(m => {
      if (!m.player1Id) {
        console.log("Match has null player1Id:", m._id);
      }
      if (!m.player2Id) {
        console.log("Match has null player2Id:", m._id);
      }
      
      const isPlayer1 = m.player1Id && m.player1Id._id.toString() === user._id.toString();
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

    console.log("Formatted matches successfully:", formattedMatches.length);

    const submissions = await Submission.find({ userId: user._id });
    console.log(`Fetched ${submissions.length} submissions.`);

    const languageCounts = {};
    submissions.forEach(s => {
      if (s.language) {
        const lang = s.language.split(" ")[0].toUpperCase();
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      }
    });

    console.log("Language counts calculated:", languageCounts);

    console.log("All operations succeeded!");
    process.exit(0);
  } catch (err) {
    console.error("DIAGNOSTIC ERROR CRASHED:", err);
    process.exit(1);
  }
};

runTest();
