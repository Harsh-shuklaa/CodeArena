const express = require("express");
const User = require("../models/User");
const Match = require("../models/Match");
const FriendRequest = require("../models/FriendRequest");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");
const Submission = require("../models/Submission");
const Activity = require("../models/Activity");

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
 * @route   GET /api/user/search
 * @desc    Search registered users by username
 * @access  Private
 */
router.get("/search", protect, async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.json([]);
    }
    const users = await User.find({
      username: { $regex: username, $options: "i" },
      _id: { $ne: req.user._id }
    })
      .select("username elo avatarUrl status wins losses")
      .limit(10);
    res.json(users);
  } catch (error) {
    console.error("[USER SEARCH ERROR]", error);
    res.status(500).json({ message: "Server error searching users" });
  }
});

/**
 * @route   GET /api/user/friends/list
 * @desc    Get logged in user's friends list
 * @access  Private
 */
router.get("/friends/list", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("friends", "username avatarUrl elo status wins losses level selectedClass");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user.friends ? user.friends.filter(f => f !== null) : []);
  } catch (error) {
    console.error("[GET FRIENDS ERROR]", error);
    res.status(500).json({ message: "Server error fetching friends list" });
  }
});

/**
 * @route   POST /api/user/friend-request/send
 * @desc    Send a friend request to another user
 * @access  Private
 */
router.post("/friend-request/send", protect, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: "Please specify target username" });
    }

    const receiver = await User.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, "i") }
    });
    if (!receiver) {
      return res.status(404).json({ message: "Operator not found" });
    }

    if (receiver._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot add yourself as a friend" });
    }

    // Check if already friends
    if (req.user.friends.includes(receiver._id)) {
      return res.status(400).json({ message: "You are already connected as friends." });
    }

    // Check for existing request
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { senderId: req.user._id, receiverId: receiver._id, status: "pending" },
        { senderId: receiver._id, receiverId: req.user._id, status: "pending" }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({ message: "A pending connection request already exists." });
    }

    // Create FriendRequest
    const newRequest = await FriendRequest.create({
      senderId: req.user._id,
      receiverId: receiver._id,
      status: "pending"
    });

    // Create Notification for receiver
    const notification = await Notification.create({
      userId: receiver._id,
      type: "friend_request",
      title: "Friend Request Received",
      message: `${req.user.username} sent you a friend request.`,
      data: {
        senderId: req.user._id,
        senderUsername: req.user.username,
        senderAvatar: req.user.avatarUrl
      }
    });

    // Real-time socket emit
    const io = req.app.get("io");
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

    // Log friend_request activity
    await Activity.create({ userId: req.user._id, type: "friend_request" });

    res.json({ success: true, message: "Friend request transmitted successfully." });
  } catch (error) {
    console.error("[SEND FRIEND REQUEST ERROR]", error);
    res.status(500).json({ message: "Server error sending friend request" });
  }
});

/**
 * @route   POST /api/user/friend-request/respond
 * @desc    Accept or reject a friend request
 * @access  Private
 */
router.post("/friend-request/respond", protect, async (req, res) => {
  try {
    const { requestId, senderUsername, action } = req.body; // action: 'accept' or 'reject'
    if (!action || (!requestId && !senderUsername)) {
      return res.status(400).json({ message: "Action and either Request ID or Sender Username are required" });
    }

    let request;
    if (requestId) {
      request = await FriendRequest.findById(requestId);
    } else if (senderUsername) {
      const sender = await User.findOne({ username: senderUsername.trim() });
      if (sender) {
        request = await FriendRequest.findOne({
          senderId: sender._id,
          receiverId: req.user._id,
          status: "pending"
        });
      }
    }

    if (!request || request.status !== "pending") {
      return res.status(404).json({ message: "Connection request not found or expired" });
    }

    if (request.receiverId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Unauthorized response" });
    }

    const io = req.app.get("io");

    if (action === "accept") {
      request.status = "accepted";
      await request.save();

      // Add to friends lists
      await User.findByIdAndUpdate(request.senderId, { $addToSet: { friends: request.receiverId } });
      await User.findByIdAndUpdate(request.receiverId, { $addToSet: { friends: request.senderId } });

      // Create notification for sender
      const notification = await Notification.create({
        userId: request.senderId,
        type: "system",
        title: "Connection Accepted",
        message: `You and ${req.user.username} are now connected.`,
        data: {
          senderId: req.user._id,
          senderUsername: req.user.username,
          senderAvatar: req.user.avatarUrl
        }
      });

      // Delete the corresponding friend_request notification for receiver
      await Notification.deleteMany({
        userId: req.user._id,
        type: "friend_request",
        "data.senderId": request.senderId
      });

      // Socket notifies
      if (io) {
        // Send alert to sender
        const formattedNotif = {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          isRead: false,
          timestamp: new Date(notification.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        io.to(request.senderId.toString()).emit("newNotification", formattedNotif);

        // Emit friendAdded event to both users to trigger dynamic client refreshes
        io.to(request.senderId.toString()).emit("friendAdded");
        io.to(request.receiverId.toString()).emit("friendAdded");
      }

      res.json({ success: true, message: "Connection request accepted." });
    } else {
      // Reject request
      request.status = "rejected";
      await request.save();

      // Delete the request and notification
      await FriendRequest.findByIdAndDelete(request._id);
      await Notification.deleteMany({
        userId: req.user._id,
        type: "friend_request",
        "data.senderId": request.senderId
      });

      res.json({ success: true, message: "Connection request declined." });
    }
  } catch (error) {
    console.error("[RESPOND FRIEND REQUEST ERROR]", error);
    res.status(500).json({ message: "Server error responding to request" });
  }
});

/**
 * @route   PUT /api/user/profile/update
 * @desc    Update user profile configurations (avatarUrl, selectedClass)
 * @access  Private
 */
router.put("/profile/update", protect, async (req, res) => {
  try {
    const { avatarUrl, selectedClass } = req.body;
    const updates = {};
    if (avatarUrl) updates.avatarUrl = avatarUrl;
    if (selectedClass) updates.selectedClass = selectedClass;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-passwordHash");
    res.json(user);
  } catch (error) {
    console.error("[UPDATE PROFILE ERROR]", error);
    res.status(500).json({ message: "Server error updating profile settings" });
  }
});

/**
 * @route   GET /api/user/:username
 * @desc    Get user profile details & match history
 * @access  Public
 */
router.get("/:username", async (req, res) => {
  try {
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${req.params.username.trim()}$`, "i") }
    })
      .select("-passwordHash")
      .populate("friends", "username avatarUrl elo status wins losses level");

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

    // Fetch submissions to calculate language preference
    const submissions = await Submission.find({ userId: user._id });
    const languageCounts = {};
    submissions.forEach(s => {
      if (s.language) {
        const lang = s.language.split(" ")[0].toUpperCase();
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      }
    });

    const totalSubmissions = submissions.length;
    const languages = Object.keys(languageCounts).map(name => {
      const count = languageCounts[name];
      const percent = totalSubmissions > 0 ? `${Math.round((count / totalSubmissions) * 100)}%` : "0%";
      return { name, percent };
    }).sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent));

    // Dynamic Achievements Calculation
    const achievements = [];
    if (user.wins >= 1) {
      achievements.push({
        title: "Recruit Initiate",
        desc: "Won first combat match in the CodeArena.",
        color: "text-tertiary",
        bgColor: "bg-tertiary/10",
        border: "border-tertiary/30"
      });
    }
    if (user.wins >= 10) {
      achievements.push({
        title: "Code Surgeon",
        desc: "Exhibited outstanding compiler speed in 10 victories.",
        color: "text-primary",
        bgColor: "bg-primary/10",
        border: "border-primary/30"
      });
    }
    if (user.wins >= 50) {
      achievements.push({
        title: "Grandmaster Sage",
        desc: "Conquered 50 battles in the Elite arena.",
        color: "text-secondary",
        bgColor: "bg-secondary/10",
        border: "border-secondary/30"
      });
    }
    if (user.elo >= 1800) {
      achievements.push({
        title: "Diamond Operator",
        desc: "Crossed 1800 MMR rating standing.",
        color: "text-secondary",
        bgColor: "bg-secondary/10",
        border: "border-secondary/30"
      });
    }
    if (user.elo >= 2200) {
      achievements.push({
        title: "Elite Overlord",
        desc: "Crossed 2200 MMR rating standing.",
        color: "text-primary",
        bgColor: "bg-primary/10",
        border: "border-primary/30"
      });
    }
    
    // Add default fallback if no achievements unlocked
    if (achievements.length === 0) {
      achievements.push({
        title: "Recruit Coder",
        desc: "Join matchmaking to start unlocking system achievements.",
        color: "text-on-surface-variant/40",
        bgColor: "bg-white/5",
        border: "border-white/10"
      });
    }

    const totalMatches = user.wins + user.losses;
    const winRate = totalMatches > 0 ? Math.round((user.wins / totalMatches) * 100) : 0;
    const friendsCount = user.friends ? user.friends.length : 0;

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
        totalMatches,
        winRate,
        friendsCount,
        status: user.status,
        friends: user.friends ? user.friends.filter(f => f !== null) : [],
        languages,
        achievements,
        createdAt: user.createdAt,
        matches: formattedMatches
      }
    });
  } catch (error) {
    console.error("[USER PROFILE ERROR]", error);
    res.status(500).json({ message: "Server error retrieving operator details" });
  }
});

/**
 * @route   GET /api/user/:username/activity
 * @desc    Get user activity counts for past 365 days grouped by date
 * @access  Public
 */
router.get("/:username/activity", async (req, res) => {
  try {
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${req.params.username.trim()}$`, "i") }
    });
    if (!user) {
      return res.status(404).json({ message: "Operator not found" });
    }

    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const activities = await Activity.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: oneYearAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const formatted = {};
    activities.forEach(act => {
      formatted[act._id] = act.count;
    });

    res.json(formatted);
  } catch (error) {
    console.error("[USER ACTIVITY ERROR]", error);
    res.status(500).json({ message: "Server error fetching activities" });
  }
});



module.exports = router;
