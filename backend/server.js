import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

import { connectDB } from "./config/db.js";
import { handleSocketConnections } from "./socket/socketHandler.js";

// Routes imports
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import problemRoutes from "./routes/problem.js";
import matchRoutes from "./routes/match.js";

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
