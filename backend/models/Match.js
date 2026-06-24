const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    player1Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    player2Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    status: {
      type: String,
      enum: ["ongoing", "ended"],
      default: "ongoing",
    },
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null represents draw or unfinished
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: String, // e.g. "12m 43s"
      default: "",
    },
    player1Code: {
      type: String,
      default: "",
    },
    player2Code: {
      type: String,
      default: "",
    },
    player1Verdict: {
      type: String,
      default: "Pending",
    },
    player2Verdict: {
      type: String,
      default: "Pending",
    },
    eloChangePlayer1: {
      type: Number,
      default: 0,
    },
    eloChangePlayer2: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", matchSchema);
