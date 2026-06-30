const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    selectedOpponent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    roomType: {
      type: String,
      enum: ["matchmaking", "custom"],
      default: "custom",
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    language: {
      type: String,
      default: "JAVASCRIPT (ES6)",
    },
    status: {
      type: String,
      enum: ["waiting", "active", "ended"],
      default: "waiting",
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      default: null,
    },
    readyUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    invitedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    spectatorsAllowed: {
      type: Boolean,
      default: true,
    },
    // For backward compatibility with older database documents
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

roomSchema.pre("validate", function (next) {
  if (!this.admin && this.hostId) {
    this.admin = this.hostId;
  }
  next();
});

roomSchema.index({ participants: 1, status: 1 });

module.exports = mongoose.model("Room", roomSchema);
