const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    matchId: {
      type: String,
      required: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    verdict: {
      type: String,
      required: true,
    },
    runtime: {
      type: String,
      default: "0s",
    },
    memory: {
      type: String,
      default: "0 KB",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);
