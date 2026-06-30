const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["login", "match", "submission", "friend_request", "room_created"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "activities" }
);

activitySchema.index({ userId: 1, createdAt: 1 });

module.exports = mongoose.model("Activity", activitySchema);
