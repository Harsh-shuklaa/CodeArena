const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");

const { connectDB } = require("./config/db.js");
const { handleSocketConnections } = require("./socket/socketHandler.js");

// Routes imports
const authRoutes = require("./routes/auth.js");
const userRoutes = require("./routes/user.js");
const problemRoutes = require("./routes/problem.js");
const matchRoutes = require("./routes/match.js");

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: ["http://localhost:5174", "http://127.0.0.1:5173"],
  credentials: true
}));
app.use(express.json());

// Mounting API Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/problem", problemRoutes);
app.use("/api/match", matchRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "CODEARENA CORES ONLINE", time: new Date() });
});

// Configure Socket.io Server
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Bind socket connection hooks
handleSocketConnections(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[CORE] CodeArena server executing on port ${PORT}...`);
});
