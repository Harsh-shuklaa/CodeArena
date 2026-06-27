const express = require("express");
const Room = require("../models/Room");
const Problem = require("../models/Problem");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Activity = require("../models/Activity");
const { protect } = require("../middleware/auth");

const router = express.Router();

/**
 * Generate a unique room code of format CA-XXXX
 */
const generateUniqueRoomCode = async () => {
  let isUnique = false;
  let code = "";
  while (!isUnique) {
    const num = Math.floor(1000 + Math.random() * 9000);
    code = `CA-${num}`;
    const existing = await Room.findOne({ roomCode: code });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

/**
 * @route   POST /api/room/create
 * @desc    Create a custom duel lobby
 * @access  Private
 */
router.post("/create", protect, async (req, res) => {
  try {
    const { difficulty, language } = req.body;

    // Pick a random problem matching difficulty
    let filter = {};
    if (difficulty && ["Easy", "Medium", "Hard"].includes(difficulty)) {
      filter.difficulty = difficulty;
    }

    const count = await Problem.countDocuments(filter);
    let problemId = null;

    if (count > 0) {
      const rand = Math.floor(Math.random() * count);
      const problem = await Problem.findOne(filter).skip(rand);
      problemId = problem._id;
    } else {
      // Fallback: pick any problem if none matches
      const anyCount = await Problem.countDocuments();
      if (anyCount > 0) {
        const rand = Math.floor(Math.random() * anyCount);
        const problem = await Problem.findOne().skip(rand);
        problemId = problem._id;
      }
    }

    if (!problemId) {
      return res.status(400).json({ message: "No challenges seeded in database yet. Please run seeding script." });
    }

    const roomCode = await generateUniqueRoomCode();

    const room = await Room.create({
      roomCode,
      admin: req.user._id,
      participants: [req.user._id],
      selectedOpponent: null,
      roomType: "custom",
      difficulty: difficulty || "Medium",
      language: language || "JAVASCRIPT (ES6)",
      problemId,
      status: "waiting",
    });

    // Log room_created activity
    await Activity.create({ userId: req.user._id, type: "room_created" });

    res.status(201).json({
      success: true,
      roomCode: room.roomCode,
      room,
    });
  } catch (error) {
    console.error("[CREATE ROOM ERROR]", error);
    res.status(500).json({ message: "Server error creating room lobby" });
  }
});

/**
 * @route   GET /api/room/count/active
 * @desc    Get total count of active/waiting lobbies
 * @access  Private
 */
router.get("/count/active", protect, async (req, res) => {
  try {
    const count = await Room.countDocuments({ status: "waiting" });
    res.json({ count });
  } catch (error) {
    console.error("[GET ACTIVE COUNT ERROR]", error);
    res.status(500).json({ message: "Server error retrieving active rooms count" });
  }
});

/**
 * @route   GET /api/room/:roomCode
 * @desc    Get room information and status
 * @access  Private
 */
router.get("/:roomCode", protect, async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode })
      .populate("admin", "username avatarUrl elo")
      .populate("participants", "username avatarUrl elo status wins losses")
      .populate("selectedOpponent", "username avatarUrl elo status wins losses")
      .populate("problemId");

    if (!room) {
      return res.status(404).json({ message: "Lobby code is invalid or expired" });
    }

    res.json(room);
  } catch (error) {
    console.error("[GET ROOM ERROR]", error);
    res.status(500).json({ message: "Server error fetching lobby configuration" });
  }
});

/**
 * @route   POST /api/room/join
 * @desc    Join an existing lobby as participant
 * @access  Private
 */
router.post("/join", protect, async (req, res) => {
  try {
    const { roomCode } = req.body;

    const room = await Room.findOne({ roomCode, status: "waiting" });
    if (!room) {
      return res.status(404).json({ message: "Lobby does not exist or has already started/ended" });
    }

    // Add user as participant if not already in it
    if (!room.participants.includes(req.user._id)) {
      room.participants.push(req.user._id);
      room.invitedUsers = (room.invitedUsers || []).filter(id => id.toString() !== req.user._id.toString());
      await room.save();
    }

    res.json({
      success: true,
      roomCode: room.roomCode,
      room,
    });
  } catch (error) {
    console.error("[JOIN ROOM ERROR]", error);
    res.status(500).json({ message: "Server error joining room lobby" });
  }
});

/**
 * @route   POST /api/room/invite
 * @desc    Invite a friend to join a room lobby (toggles to cancel if already invited)
 * @access  Private
 */
router.post("/invite", protect, async (req, res) => {
  try {
    const { roomCode, friendUsername } = req.body;

    if (!roomCode || !friendUsername) {
      return res.status(400).json({ message: "Room code and friend username are required" });
    }

    const room = await Room.findOne({ roomCode });
    if (!room) {
      return res.status(404).json({ message: "Lobby not found" });
    }

    const receiver = await User.findOne({
      username: { $regex: new RegExp(`^${friendUsername.trim()}$`, "i") }
    });
    if (!receiver) {
      return res.status(404).json({ message: "Operator not found" });
    }

    // Check if already in participants
    if (room.participants.some(p => p.toString() === receiver._id.toString())) {
      return res.status(400).json({ message: "Operator is already in this lobby" });
    }

    // Check if invitation already exists
    const existingInvite = await Notification.findOne({
      userId: receiver._id,
      type: "room_invite",
      "data.roomCode": roomCode
    });

    const io = req.app.get("io");

    if (existingInvite) {
      // 1. Cancel the invitation
      await Notification.deleteOne({ _id: existingInvite._id });

      room.invitedUsers = (room.invitedUsers || []).filter(id => id.toString() !== receiver._id.toString());
      await room.save();

      if (io) {
        io.to(receiver._id.toString()).emit("removeNotification", { id: existingInvite._id.toString() });
      }

      // Populate & Broadcast updated room status to all lobby participants (since invitedUsers list changed)
      const populated = await Room.findOne({ roomCode })
        .populate("admin", "username avatarUrl elo status wins losses")
        .populate("participants", "username avatarUrl elo status wins losses")
        .populate("selectedOpponent", "username avatarUrl elo status wins losses")
        .populate("readyUsers", "username avatarUrl elo status wins losses")
        .populate("invitedUsers", "username avatarUrl elo status wins losses")
        .populate("problemId");

      if (io && populated) {
        io.to(roomCode).emit("roomStatusUpdate", populated);
      }

      return res.json({ success: true, action: "cancelled", message: "Invitation retracted successfully." });
    } else {
      // 2. Create/Send the invitation
      const notification = await Notification.create({
        userId: receiver._id,
        type: "room_invite",
        title: "Room Invitation Received",
        message: `${req.user.username} invited you to join battle lobby ${roomCode}.`,
        data: {
          roomCode,
          invitedByUsername: req.user.username,
          invitedByAvatar: req.user.avatarUrl
        }
      });

      if (!room.invitedUsers.includes(receiver._id)) {
        room.invitedUsers.push(receiver._id);
        await room.save();
      }

      if (io) {
        const formattedNotif = {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          isRead: false,
          timestamp: new Date(notification.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        io.to(receiver._id.toString()).emit("newNotification", formattedNotif);
      }

      // Populate & Broadcast updated room status to all lobby participants
      const populated = await Room.findOne({ roomCode })
        .populate("admin", "username avatarUrl elo status wins losses")
        .populate("participants", "username avatarUrl elo status wins losses")
        .populate("selectedOpponent", "username avatarUrl elo status wins losses")
        .populate("readyUsers", "username avatarUrl elo status wins losses")
        .populate("invitedUsers", "username avatarUrl elo status wins losses")
        .populate("problemId");

      if (io && populated) {
        io.to(roomCode).emit("roomStatusUpdate", populated);
      }

      return res.json({ success: true, action: "sent", message: "Invitation transmitted successfully." });
    }
  } catch (error) {
    console.error("[ROOM INVITE ERROR]", error);
    res.status(500).json({ message: "Server error sending invite" });
  }
});

module.exports = router;
