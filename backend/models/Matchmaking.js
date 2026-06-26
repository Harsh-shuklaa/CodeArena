const mongoose = require("mongoose");

const matchmakingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["waiting", "matched"],
      default: "waiting",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "matchmaking" }
);

module.exports = mongoose.model("Matchmaking", matchmakingSchema);
