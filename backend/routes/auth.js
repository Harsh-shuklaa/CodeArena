const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimiter");

const router = express.Router();

const Activity = require("../models/Activity");

// Auth rate limiter: Very Strict policy (5 reqs / min)
const authLimiter = rateLimit("veryStrict");

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "cyberpunk_coding_secret_key_99", {
    expiresIn: "30d"
  });
};

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const { username, email, password, selectedClass, avatarUrl } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Please enter all fields" });
    }

    // Check if user exists
    const userExists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }]
    });

    if (userExists) {
      return res.status(400).json({ message: "Username or email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create User
    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase(),
      passwordHash,
      selectedClass: selectedClass || "Algorithms",
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username.trim()}`,
      elo: 1200,
      coins: 250,
      xp: 0,
      level: 1,
      wins: 0,
      losses: 0
    });

    if (user) {
      // Log signup as login activity
      await Activity.create({ userId: user._id, type: "login" });

      res.status(201).json({
        token: generateToken(user._id),
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
          losses: user.losses
        }
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("[AUTH SIGNUP ERROR]", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email/username and password" });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: email } // Allows username logins as well
      ]
    });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      // Log login activity
      await Activity.create({ userId: user._id, type: "login" });

      res.json({
        token: generateToken(user._id),
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
          losses: user.losses
        }
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("[AUTH LOGIN ERROR]", error);
    res.status(500).json({ message: "Server error during login" });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/me", protect, rateLimit("relaxed"), async (req, res) => {
  try {
    res.json({
      user: {
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        selectedClass: req.user.selectedClass,
        avatarUrl: req.user.avatarUrl,
        elo: req.user.elo,
        coins: req.user.coins,
        xp: req.user.xp,
        level: req.user.level,
        wins: req.user.wins,
        losses: req.user.losses
      }
    });
  } catch (error) {
    console.error("[AUTH ME ERROR]", error);
    res.status(500).json({ message: "Server error fetching active session" });
  }
});

module.exports = router;
