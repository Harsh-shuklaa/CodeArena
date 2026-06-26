const mongoose = require("mongoose");
const User = require("./models/User");
const Room = require("./models/Room");
const Notification = require("./models/Notification");

const runInviteTest = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/codearena");
    console.log("Connected to MongoDB.");

    // Retrieve or seed dummy users for testing
    let host = await User.findOne({ username: "Harsh" });
    let friend = await User.findOne({ username: "Rahul" });

    if (!host) {
      host = await User.create({
        username: "Harsh",
        email: "harsh@codearena.dev",
        passwordHash: "dummy_hash_1",
        elo: 1300
      });
      console.log("Seeded host Harsh.");
    }
    if (!friend) {
      friend = await User.create({
        username: "Rahul",
        email: "rahul@codearena.dev",
        passwordHash: "dummy_hash_2",
        elo: 1100
      });
      console.log("Seeded friend Rahul.");
    }

    // Create a dummy room
    const roomCode = "CA-TEST";
    await Room.deleteMany({ roomCode });
    const room = await Room.create({
      roomCode,
      admin: host._id,
      participants: [host._id],
      difficulty: "Medium",
      language: "JAVASCRIPT (ES6)",
      problemId: new mongoose.Types.ObjectId(), // dummy problem id
      status: "waiting"
    });
    console.log("Created room CA-TEST.");

    // Simulate invite
    const receiver = await User.findOne({
      username: { $regex: new RegExp(`^${friend.username.trim()}$`, "i") }
    });

    if (room.participants.some(p => p.toString() === receiver._id.toString())) {
      console.log("Error: already in participants");
      process.exit(1);
    }

    const notification = await Notification.create({
      userId: receiver._id,
      type: "room_invite",
      title: "Room Invitation Received",
      message: `${host.username} invited you to join battle lobby ${roomCode}.`,
      data: {
        roomCode,
        invitedByUsername: host.username,
        invitedByAvatar: host.avatarUrl
      }
    });
    console.log("Created notification in DB successfully:", notification);
    
    process.exit(0);
  } catch (err) {
    console.error("DIAGNOSTIC INVITE ERROR:", err);
    process.exit(1);
  }
};

runInviteTest();
