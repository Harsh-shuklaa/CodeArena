const express = require("express");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimiter");

const router = express.Router();

/**
 * @route   GET /api/notification
 * @desc    Get current user's notifications
 * @access  Private
 */
router.get("/", protect, rateLimit("relaxed"), async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    // Format for easier frontend usage
    const formatted = notifications.map((n) => ({
      id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data,
      isRead: n.isRead,
      timestamp: new Date(n.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("[GET NOTIFICATIONS ERROR]", error);
    res.status(500).json({ message: "Server error retrieving notifications" });
  }
});

/**
 * @route   PUT /api/notification/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.put("/:id/read", protect, rateLimit("relaxed"), async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error("[READ NOTIFICATION ERROR]", error);
    res.status(500).json({ message: "Server error marking notification as read" });
  }
});

/**
 * @route   DELETE /api/notification/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete("/:id", protect, rateLimit("relaxed"), async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ success: true, message: "Notification removed" });
  } catch (error) {
    console.error("[DELETE NOTIFICATION ERROR]", error);
    res.status(500).json({ message: "Server error removing notification" });
  }
});

module.exports = router;
