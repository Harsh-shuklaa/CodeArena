const mongoose = require("mongoose");
const Room = require("./models/Room");
const User = require("./models/User");

const inspectDB = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/codearena");
    console.log("Connected to MongoDB.");

    const rooms = await Room.find({});
    console.log("ROOMS IN DB:", JSON.stringify(rooms, null, 2));

    const users = await User.find({});
    console.log("USERS IN DB:", users.map(u => ({ id: u._id, username: u.username })));

    process.exit(0);
  } catch (err) {
    console.error("Error inspecting database:", err);
    process.exit(1);
  }
};

inspectDB();
