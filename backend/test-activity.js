const mongoose = require("mongoose");
const User = require("./models/User");
const Activity = require("./models/Activity");

const verifyActivityLog = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/codearena");
    console.log("Connected to MongoDB for Activity validation.");

    let user = await User.findOne({ username: "Harsh" });
    if (!user) {
      user = await User.create({
        username: "Harsh",
        email: "harsh@codearena.dev",
        passwordHash: "dummy",
        elo: 1200
      });
    }

    // Clean past testing activities
    await Activity.deleteMany({ userId: user._id });

    // Create 3 activities for today, 2 for yesterday, 1 for 3 days ago
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    await Activity.create({ userId: user._id, type: "login", createdAt: today });
    await Activity.create({ userId: user._id, type: "match", createdAt: today });
    await Activity.create({ userId: user._id, type: "submission", createdAt: today });

    await Activity.create({ userId: user._id, type: "login", createdAt: yesterday });
    await Activity.create({ userId: user._id, type: "friend_request", createdAt: yesterday });

    await Activity.create({ userId: user._id, type: "room_created", createdAt: threeDaysAgo });

    console.log("Activities created successfully in MongoDB.");

    // Run aggregation
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

    console.log("Aggregated results:");
    console.log(activities);

    const todayStr = today.toISOString().split("T")[0];
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    
    const todayMatch = activities.find(a => a._id === todayStr);
    const yesterdayMatch = activities.find(a => a._id === yesterdayStr);

    if (todayMatch && todayMatch.count === 3 && yesterdayMatch && yesterdayMatch.count === 2) {
      console.log("Verification Success: Activity count maps correctly!");
      process.exit(0);
    } else {
      console.log("Verification Failed: Expected count mapping mismatch.");
      process.exit(1);
    }
  } catch (err) {
    console.error("DIAGNOSTIC ACTIVITY ERROR:", err);
    process.exit(1);
  }
};

verifyActivityLog();
