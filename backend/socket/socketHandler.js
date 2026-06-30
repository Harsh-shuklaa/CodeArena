const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Problem = require("../models/Problem");
const Match = require("../models/Match");
const FriendRequest = require("../models/FriendRequest");
const Notification = require("../models/Notification");
const Room = require("../models/Room");
const Matchmaking = require("../models/Matchmaking");
const Submission = require("../models/Submission");
const Activity = require("../models/Activity");
const { executeCode } = require("../services/judge0");
const { socketRateLimiter } = require("../middleware/socketRateLimiter");
const mongoose = require("mongoose");

// Track active battle room details in memory: { matchId: { player1Socket, player2Socket, startTime, problem, timeouts, player1Code, player2Code } }
const activeBattles = new Map();

// Track online users mapping: userId -> Set<socketId>
const onlineUsers = new Map();

// Track matchmaking queue in memory: [{ userId, user, socketId, joinedAt }]
const matchmakingQueue = [];

/**
 * Generate a unique room code of format CA-XXXXX (5 digits)
 * Includes a maximum attempt limit to prevent any infinite loops.
 */
const generateUniqueRoomCode = async () => {
  let attempts = 0;
  while (attempts < 10) {
    attempts++;
    const num = Math.floor(10000 + Math.random() * 90000);
    const code = `CA-${num}`;
    const existing = await Room.findOne({ roomCode: code }).select("_id");
    if (!existing) {
      return code;
    }
  }
  return `CA-${Date.now().toString().slice(-5)}`;
};

/**
 * Verify JWT Token and return the user object
 */
const verifyUserToken = async (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "cyberpunk_coding_secret_key_99");
    const user = await User.findById(decoded.id).select("-passwordHash");
    return user;
  } catch (error) {
    console.error("[SOCKET AUTH ERROR] Token validation failed", error.message);
    return null;
  }
};
const handleSocketConnections = (io) => {
  io.on("connection", async (socket) => {
    console.log(`[SOCKET] Node connected: ${socket.id}`);

    // Register rate limiting interceptor on incoming packets/events
    socketRateLimiter(socket, () => {});

    // Authenticate connection immediately
    const token = socket.handshake.auth?.token;
    let user = await verifyUserToken(token);

    if (user) {
      socket.user = user;
      console.log(`[SOCKET] Authenticated user ${user.username} for socket ${socket.id}`);
      
      const userIdStr = user._id.toString();
      const wasOffline = !onlineUsers.has(userIdStr);

      if (!onlineUsers.has(userIdStr)) {
        onlineUsers.set(userIdStr, new Set());
      }
      onlineUsers.get(userIdStr).add(socket.id);
      
      // Join personal room for real-time target notifications
      socket.join(userIdStr);

      if (wasOffline) {
        // Update status to online in database only if first tab/connection
        await User.findByIdAndUpdate(user._id, { status: "online", lastSeen: new Date() });
        
        // Broadcast presence change to friends
        const userWithFriends = await User.findById(user._id).select("friends");
        if (userWithFriends && userWithFriends.friends) {
          userWithFriends.friends.forEach((friendId) => {
            io.to(friendId.toString()).emit("friendPresenceChange", {
              userId: userIdStr,
              status: "online",
            });
          });
        }
      }
    } else {
      // Unauthenticated client connection - keep open for guest or reject
      console.log(`[SOCKET] Unauthenticated node connection: ${socket.id}`);
    }

    socket.on("register-user", async (userId) => {
      if (userId) {
        const userIdStr = userId.toString();
        const wasOffline = !onlineUsers.has(userIdStr);

        if (!onlineUsers.has(userIdStr)) {
          onlineUsers.set(userIdStr, new Set());
        }
        onlineUsers.get(userIdStr).add(socket.id);

        if (wasOffline) {
          await User.findByIdAndUpdate(userId, { status: "online", lastSeen: new Date() });
          console.log(`[SOCKET] Registered online user ${userId} to socket ${socket.id}`);
          
          // Broadcast presence change to friends
          const userWithFriends = await User.findById(userId).select("friends");
          if (userWithFriends && userWithFriends.friends) {
            userWithFriends.friends.forEach((friendId) => {
              io.to(friendId.toString()).emit("friendPresenceChange", {
                userId: userIdStr,
                status: "online",
              });
            });
          }
        }
      }
    });

    socket.on("joinQueue", async (data) => {
      console.log(`[MATCHMAKING DEBUG] joinQueue event received from user: ${socket.user?.username || "unknown"} (socket ID: ${socket.id})`);
      try {
        const u = socket.user || (data?.token ? await verifyUserToken(data.token) : null);
        if (!u) {
          console.log("[MATCHMAKING DEBUG] Rejected joinQueue: u is undefined");
          socket.emit("error", { message: "Invalid session credentials" });
          return;
        }
        socket.user = u; // ensure set

        // Prevent duplicate entries in memory queue
        const existingIdx = matchmakingQueue.findIndex(item => item.userId === u._id.toString());
        if (existingIdx !== -1) {
          matchmakingQueue.splice(existingIdx, 1);
        }

        // Scrub user from any waiting lobbies before entering queue
        const waitingRooms = await Room.find({ participants: u._id, status: "waiting" });
        console.log(`[MATCHMAKING DEBUG] Found ${waitingRooms.length} waiting rooms to scrub for user ${u.username}`);
        for (const r of waitingRooms) {
          try {
            r.participants = r.participants.filter(p => p.toString() !== u._id.toString());
            r.readyUsers = (r.readyUsers || []).filter(p => p.toString() !== u._id.toString());
            if (r.selectedOpponent && r.selectedOpponent.toString() === u._id.toString()) {
              r.selectedOpponent = null;
            }
            if (r.participants.length === 0) {
              r.status = "ended";
            } else if (r.admin && r.admin.toString() === u._id.toString()) {
              r.admin = r.participants[0];
            }
            await r.save();

            io.to(r.roomCode).emit("player_left_lobby", { userId: u._id.toString(), username: u.username });

            // Call populate directly on the saved room instance to save one findOne DB query round-trip
            const populated = await r.populate([
              { path: "admin", select: "username avatarUrl elo status wins losses" },
              { path: "participants", select: "username avatarUrl elo status wins losses" },
              { path: "selectedOpponent", select: "username avatarUrl elo status wins losses" },
              { path: "readyUsers", select: "username avatarUrl elo status wins losses" },
              { path: "invitedUsers", select: "username avatarUrl elo status wins losses" },
              { path: "problemId" }
            ]);

            if (populated) {
              io.to(r.roomCode).emit("roomStatusUpdate", populated);
            }
          } catch (err) {
            console.error(`[MATCHMAKING PRE-CLEANUP ERROR] Failed to clean room ${r.roomCode}:`, err.message);
          }
        }

        // Only block queueing if they are in a live ongoing database Match
        const activeMatch = await Match.findOne({
          $or: [
            { player1Id: u._id },
            { player2Id: u._id }
          ],
          status: "ongoing"
        });
        if (activeMatch) {
          console.log(`[MATCHMAKING DEBUG] Rejected joinQueue: User ${u.username} is already in active match ${activeMatch._id}`);
          socket.emit("error", { message: "User cannot join queue if already in an active match." });
          return;
        }

        console.log(`[MATCHMAKING] User ${u.username} entering memory queue.`);

        // Insert into memory queue
        matchmakingQueue.push({
          userId: u._id.toString(),
          user: u,
          socketId: socket.id,
          joinedAt: new Date()
        });

        socket.emit("queueJoined", { message: "Searching for similar operators..." });

        // Trigger First-Come-First-Serve Matchmaking Check in memory
        if (matchmakingQueue.length >= 2) {
          const player1 = matchmakingQueue.shift();
          const player2 = matchmakingQueue.shift();

          console.log(`[MATCHMAKING] Pairing ${player1.user.username} vs ${player2.user.username}`);

          // Fetch coding challenge
          const count = await Problem.countDocuments();
          let problem;
          if (count > 0) {
            const randomIdx = Math.floor(Math.random() * count);
            problem = await Problem.findOne().skip(randomIdx);
          } else {
            problem = await Problem.create({
              title: "Default Decryption Challenge",
              difficulty: "Medium",
              statement: "Reverse a string of packet payloads.",
              testcases: [{ input: "hello", output: "olleh" }],
            });
          }

          const roomCode = await generateUniqueRoomCode();

          // Create active Room
          const room = await Room.create({
            roomCode,
            admin: player1.user._id,
            participants: [player1.user._id, player2.user._id],
            selectedOpponent: player2.user._id,
            roomType: "matchmaking",
            status: "active",
            problemId: problem._id,
          });

          // Create Match
          const match = await Match.create({
            player1Id: player1.user._id,
            player2Id: player2.user._id,
            problemId: problem._id,
            status: "ongoing",
            startTime: Date.now(),
          });

          // Log match activities
          await Activity.create({ userId: player1.user._id, type: "match" });
          await Activity.create({ userId: player2.user._id, type: "match" });

          // In-memory active battle tracking
          activeBattles.set(roomCode, {
            matchId: roomCode,
            dbMatchId: match._id.toString(),
            admin: player1.user,
            player1Socket: player1.socketId,
            player2Socket: player2.socketId,
            startTime: Date.now(),
            problem: problem,
            timeouts: {},
            player1Code: "",
            player2Code: "",
          });

          // Emit match_found to both users
          const matchData = {
            roomCode,
            matchId: match._id.toString(),
            problem: {
              title: problem.title,
              difficulty: problem.difficulty,
              statement: problem.statement,
              constraints: problem.constraints,
              sampleInput: problem.sampleInput,
              sampleOutput: problem.sampleOutput,
            }
          };

          io.to(player1.userId).emit("match_found", {
            ...matchData,
            opponent: {
              username: player2.user.username,
              avatarUrl: player2.user.avatarUrl,
              elo: player2.user.elo,
              wins: player2.user.wins,
              winRate: (player2.user.wins + player2.user.losses) > 0 
                ? Math.round((player2.user.wins / (player2.user.wins + player2.user.losses)) * 100) 
                : 0,
              status: "online",
            }
          });

          io.to(player2.userId).emit("match_found", {
            ...matchData,
            opponent: {
              username: player1.user.username,
              avatarUrl: player1.user.avatarUrl,
              elo: player1.user.elo,
              wins: player1.user.wins,
              winRate: (player1.user.wins + player1.user.losses) > 0 
                ? Math.round((player1.user.wins / (player1.user.wins + player1.user.losses)) * 100) 
                : 0,
              status: "online",
            }
          });
        }
      } catch (err) {
        console.error("[SOCKET joinQueue ERROR]", err);
        socket.emit("error", { message: "Internal queue logic error" });
      }
    });

    socket.on("leaveQueue", async () => {
      if (socket.user) {
        console.log(`[MATCHMAKING] User ${socket.user.username} left queue.`);
        const idx = matchmakingQueue.findIndex(item => item.userId === socket.user._id.toString());
        if (idx !== -1) {
          matchmakingQueue.splice(idx, 1);
        }
      }
    });

    // ==========================================
    // 2. ROOM / LOBBY EVENTS
    // ==========================================

    socket.on("joinRoom", async (data) => {
      const { matchId } = data || {};
      const u = socket.user || (data?.token ? await verifyUserToken(data.token) : null);

      if (!u) {
        socket.emit("error", { message: "Verification failed on joinRoom" });
        return;
      }
      socket.user = u;

      try {
        socket.join(matchId);
        console.log(`[BATTLE] User ${u.username} joined socket room ${matchId}`);

        // Clear forfeit timeout if it's currently running for this user
        const roomState = activeBattles.get(matchId);
        if (roomState) {
          const userIdStr = u._id.toString();
          if (roomState.timeouts && roomState.timeouts[userIdStr]) {
            console.log(`[BATTLE] User ${u.username} reconnected. Clearing forfeit timer.`);
            clearTimeout(roomState.timeouts[userIdStr]);
            delete roomState.timeouts[userIdStr];
            
            // Broadcast reconnect to opponent in the room
            socket.to(matchId).emit("opponentReconnected", { userId: userIdStr, username: u.username });
          }
        }

        // Sync with Room in MongoDB
        let dbRoom = await Room.findOne({ roomCode: matchId });
        if (dbRoom) {
          // De-duplicate participants to prevent double rendering under any circumstance
          dbRoom.participants = Array.from(new Set(dbRoom.participants.map(p => p.toString())));

          const hasJoined = dbRoom.participants.some(p => p.toString() === u._id.toString());
          
          // Reset ready status when re-entering/rejoining
          dbRoom.readyUsers = (dbRoom.readyUsers || []).filter(id => id.toString() !== u._id.toString());

          if (!hasJoined) {
            dbRoom.participants.push(u._id);
            dbRoom.invitedUsers = (dbRoom.invitedUsers || []).filter(id => id.toString() !== u._id.toString());
            io.to(matchId).emit("player_joined_lobby", { userId: u._id.toString(), username: u.username });
          }
          await dbRoom.save();

          // Populate the saved document directly, saving one findOne query
          const populatedRoom = await dbRoom.populate([
            { path: "admin", select: "username avatarUrl elo status wins losses" },
            { path: "participants", select: "username avatarUrl elo status wins losses" },
            { path: "selectedOpponent", select: "username avatarUrl elo status wins losses" },
            { path: "readyUsers", select: "username avatarUrl elo status wins losses" },
            { path: "invitedUsers", select: "username avatarUrl elo status wins losses" },
            { path: "problemId" }
          ]);

          // Sync in-memory room mapping if active
          if (!activeBattles.has(matchId)) {
            // Find if there's an ongoing database Match for these participants
            const activeMatch = await Match.findOne({
              $or: [
                { player1Id: u._id },
                { player2Id: u._id }
              ],
              status: "ongoing"
            });

            const p1SocketSet = onlineUsers.get(populatedRoom.admin._id.toString());
            const p2SocketSet = populatedRoom.selectedOpponent ? onlineUsers.get(populatedRoom.selectedOpponent._id.toString()) : null;

            activeBattles.set(matchId, {
              matchId,
              dbMatchId: activeMatch ? activeMatch._id.toString() : null,
              admin: populatedRoom.admin,
              player1Socket: p1SocketSet && p1SocketSet.size > 0 ? Array.from(p1SocketSet)[0] : null,
              player2Socket: p2SocketSet && p2SocketSet.size > 0 ? Array.from(p2SocketSet)[0] : null,
              startTime: activeMatch ? activeMatch.startTime : null,
              problem: populatedRoom.problemId,
              timeouts: {},
              player1Code: "",
              player2Code: "",
            });
          } else {
            const state = activeBattles.get(matchId);
            if (populatedRoom.admin._id.toString() === u._id.toString()) {
              state.player1Socket = socket.id;
            } else if (populatedRoom.selectedOpponent && populatedRoom.selectedOpponent._id.toString() === u._id.toString()) {
              state.player2Socket = socket.id;
            }
          }

          // Emit room status update to everyone
          io.to(matchId).emit("roomStatusUpdate", populatedRoom);
        }
      } catch (err) {
        console.error("[SOCKET joinRoom ERROR]", err);
        socket.emit("error", { message: "Internal lobby room error" });
      }
    });

    // Admin opponent selection
    socket.on("selectOpponent", async (data) => {
      const { roomCode, opponentId } = data;
      const u = socket.user;
      if (!u) return;

      try {
        const room = await Room.findOne({ roomCode });
        if (room && room.admin.toString() === u._id.toString()) {
          room.selectedOpponent = opponentId || null;
          await room.save();

          const populated = await room.populate([
            { path: "admin", select: "username avatarUrl elo status wins losses" },
            { path: "participants", select: "username avatarUrl elo status wins losses" },
            { path: "selectedOpponent", select: "username avatarUrl elo status wins losses" },
            { path: "readyUsers", select: "username avatarUrl elo status wins losses" },
            { path: "problemId" }
          ]);

          // Update activeBattle state
          if (activeBattles.has(roomCode)) {
            const state = activeBattles.get(roomCode);
            if (opponentId) {
              const sockets = onlineUsers.get(opponentId.toString());
              state.player2Socket = sockets && sockets.size > 0 ? Array.from(sockets)[0] : null;
            } else {
              state.player2Socket = null;
            }
          }

          io.to(roomCode).emit("opponent_selected", { selectedOpponent: populated.selectedOpponent });
          io.to(roomCode).emit("roomStatusUpdate", populated);
        }
      } catch (err) {
        console.error("[SELECT OPPONENT ERROR]", err);
      }
    });

    // Admin kicks participant
    socket.on("removeUser", async (data) => {
      const { roomCode, userIdToRemove } = data;
      const u = socket.user;
      if (!u) return;

      try {
        const room = await Room.findOne({ roomCode });
        if (room && room.admin.toString() === u._id.toString()) {
          room.participants = room.participants.filter(p => p.toString() !== userIdToRemove);
          room.readyUsers = (room.readyUsers || []).filter(p => p.toString() !== userIdToRemove);
          if (room.selectedOpponent && room.selectedOpponent.toString() === userIdToRemove) {
            room.selectedOpponent = null;
          }
          await room.save();

          // Emit kicked notification directly to all tabs of user
          io.to(userIdToRemove).emit("player_removed", { roomCode });

          const populated = await room.populate([
            { path: "admin", select: "username avatarUrl elo status wins losses" },
            { path: "participants", select: "username avatarUrl elo status wins losses" },
            { path: "selectedOpponent", select: "username avatarUrl elo status wins losses" },
            { path: "readyUsers", select: "username avatarUrl elo status wins losses" },
            { path: "invitedUsers", select: "username avatarUrl elo status wins losses" },
            { path: "problemId" }
          ]);

          io.to(roomCode).emit("roomStatusUpdate", populated);
        }
      } catch (err) {
        console.error("[REMOVE USER ERROR]", err);
      }
    });

    // Participant leaves room cleanly
    socket.on("leaveRoom", async (data) => {
      const { roomCode } = data || {};
      const u = socket.user;
      if (!u || !roomCode) return;

      try {
        console.log(`[LOBBY] User ${u.username} leaving room ${roomCode}`);
        socket.leave(roomCode);

        const room = await Room.findOne({ roomCode });
        if (room) {
          room.participants = room.participants.filter(p => p.toString() !== u._id.toString());
          room.readyUsers = (room.readyUsers || []).filter(p => p.toString() !== u._id.toString());

          if (room.selectedOpponent && room.selectedOpponent.toString() === u._id.toString()) {
            room.selectedOpponent = null;
          }

          if (room.participants.length === 0) {
            room.status = "ended";
          } else if (room.admin && room.admin.toString() === u._id.toString()) {
            room.admin = room.participants[0];
          }

          await room.save();

          // Notify other participants in the room
          io.to(roomCode).emit("player_left_lobby", { userId: u._id.toString(), username: u.username });

          const populated = await room.populate([
            { path: "admin", select: "username avatarUrl elo status wins losses" },
            { path: "participants", select: "username avatarUrl elo status wins losses" },
            { path: "selectedOpponent", select: "username avatarUrl elo status wins losses" },
            { path: "readyUsers", select: "username avatarUrl elo status wins losses" },
            { path: "invitedUsers", select: "username avatarUrl elo status wins losses" },
            { path: "problemId" }
          ]);

          if (populated) {
            io.to(roomCode).emit("roomStatusUpdate", populated);
          }
        }
      } catch (err) {
        console.error("[LEAVE ROOM EVENT ERROR]", err);
      }
    });

    // Toggle player ready status
    socket.on("toggleReady", async (data) => {
      const { roomCode } = data || {};
      const u = socket.user;
      if (!u || !roomCode) return;

      try {
        const room = await Room.findOne({ roomCode });
        if (room && room.participants.some(p => p.toString() === u._id.toString())) {
          const isReady = room.readyUsers.some(id => id.toString() === u._id.toString());
          if (isReady) {
            // Set to Not Ready
            room.readyUsers = room.readyUsers.filter(id => id.toString() !== u._id.toString());
          } else {
            // Set to Ready
            room.readyUsers.push(u._id);
          }
          await room.save();

          const populated = await room.populate([
            { path: "admin", select: "username avatarUrl elo status wins losses" },
            { path: "participants", select: "username avatarUrl elo status wins losses" },
            { path: "selectedOpponent", select: "username avatarUrl elo status wins losses" },
            { path: "readyUsers", select: "username avatarUrl elo status wins losses" },
            { path: "invitedUsers", select: "username avatarUrl elo status wins losses" },
            { path: "problemId" }
          ]);

          io.to(roomCode).emit("roomStatusUpdate", populated);
        }
      } catch (err) {
        console.error("[TOGGLE READY ERROR]", err);
      }
    });

    // Update custom lobby settings (admin only)
    socket.on("updateLobbySettings", async (data) => {
      const { roomCode, difficulty, language, spectatorsAllowed } = data || {};
      const u = socket.user;
      if (!u || !roomCode) return;

      try {
        const room = await Room.findOne({ roomCode });
        if (room && room.admin.toString() === u._id.toString()) {
          if (difficulty) room.difficulty = difficulty;
          if (language) room.language = language;
          if (typeof spectatorsAllowed === "boolean") room.spectatorsAllowed = spectatorsAllowed;
          
          await room.save();

          const populated = await room.populate([
            { path: "admin", select: "username avatarUrl elo status wins losses" },
            { path: "participants", select: "username avatarUrl elo status wins losses" },
            { path: "selectedOpponent", select: "username avatarUrl elo status wins losses" },
            { path: "readyUsers", select: "username avatarUrl elo status wins losses" },
            { path: "invitedUsers", select: "username avatarUrl elo status wins losses" },
            { path: "problemId" }
          ]);

          io.to(roomCode).emit("roomStatusUpdate", populated);
        }
      } catch (err) {
        console.error("[UPDATE LOBBY SETTINGS ERROR]", err);
      }
    });

    // Lobby Comms (Chat messages)
    socket.on("chatMessage", async (data) => {
      const { roomCode, text } = data || {};
      const u = socket.user;
      if (!u || !roomCode || !text) return;

      try {
        const room = await Room.findOne({ roomCode });
        if (room && room.participants.some(p => p.toString() === u._id.toString())) {
          // Broadcast chatMessage to everyone in the room
          io.to(roomCode).emit("chatMessage", {
            username: u.username,
            avatarUrl: u.avatarUrl,
            text: text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          });
        }
      } catch (err) {
        console.error("[CHAT MESSAGE ERROR]", err);
      }
    });

    // Admin initiates start countdown
    socket.on("startMatch", async (data) => {
      const { roomCode } = data;
      const u = socket.user;
      if (!u) return;

      try {
        const room = await Room.findOne({ roomCode })
          .populate("admin")
          .populate("selectedOpponent");

        if (room && room.admin._id.toString() === u._id.toString()) {
          if (!room.selectedOpponent) return;

          // Check if selected opponent is ready
          const opponentIdStr = room.selectedOpponent._id.toString();
          const isOpponentReady = room.readyUsers.some(id => id.toString() === opponentIdStr);
          if (!isOpponentReady) {
            socket.emit("error", { message: "Selected opponent must be READY to start the match." });
            return;
          }

          // Handle spectators allowed setting
          if (room.spectatorsAllowed === false) {
            const allowedIds = [room.admin._id.toString(), room.selectedOpponent._id.toString()];
            const spectators = room.participants.filter(p => !allowedIds.includes(p.toString()));
            
            // Update database arrays
            room.participants = room.participants.filter(p => allowedIds.includes(p.toString()));
            room.readyUsers = room.readyUsers.filter(p => allowedIds.includes(p.toString()));

            // Notify spectators they are removed (using room user ID to redirect all spectator tabs)
            spectators.forEach(specId => {
              io.to(specId.toString()).emit("player_removed", { roomCode });
            });
          }

          // Lock players and trigger countdown
          io.to(roomCode).emit("match_starting");

          room.status = "active";
          await room.save();

          // Create backend Match
          const match = await Match.create({
            player1Id: room.admin._id,
            player2Id: room.selectedOpponent._id,
            problemId: room.problemId,
            status: "ongoing",
            startTime: Date.now(),
          });

          // Log match activities
          await Activity.create({ userId: room.admin._id, type: "match" });
          await Activity.create({ userId: room.selectedOpponent._id, type: "match" });

          const p1SocketSet = onlineUsers.get(room.admin._id.toString());
          const p2SocketSet = onlineUsers.get(room.selectedOpponent._id.toString());

          // In-memory state tracking
          const state = activeBattles.get(roomCode) || { timeouts: {} };
          state.dbMatchId = match._id.toString();
          state.startTime = Date.now();
          state.admin = room.admin;
          state.player1Socket = p1SocketSet && p1SocketSet.size > 0 ? Array.from(p1SocketSet)[0] : null;
          state.player2Socket = p2SocketSet && p2SocketSet.size > 0 ? Array.from(p2SocketSet)[0] : null;
          state.problem = room.problemId;
          state.player1Code = "";
          state.player2Code = "";
          activeBattles.set(roomCode, state);

          // Wait 3 seconds countdown, then redirect to fight
          state.startTimeout = setTimeout(async () => {
            const prob = await Problem.findById(room.problemId);
            io.to(roomCode).emit("match_started", {
              matchId: roomCode,
              dbMatchId: match._id.toString(),
              problem: {
                title: prob.title,
                difficulty: prob.difficulty,
                statement: prob.statement,
                constraints: prob.constraints,
                sampleInput: prob.sampleInput,
                sampleOutput: prob.sampleOutput,
              },
              player1: room.admin,
              player2: room.selectedOpponent,
            });
            io.to(roomCode).emit("battleStarted", {
              matchId: roomCode,
              problem: prob,
              player1: room.admin,
              player2: room.selectedOpponent,
            });
            delete state.startTimeout;
          }, 3000);
        }
      } catch (err) {
        console.error("[START MATCH ERROR]", err);
      }
    });

    // Admin cancels match countdown
    socket.on("cancelMatch", async (data) => {
      const { roomCode } = data;
      const u = socket.user;
      if (!u) return;

      try {
        const room = await Room.findOne({ roomCode });
        if (room && room.admin.toString() === u._id.toString()) {
          room.status = "waiting";
          await room.save();
          io.to(roomCode).emit("match_cancelled");

          // Clear startTimeout countdown and clean up pre-created DB records
          const state = activeBattles.get(roomCode);
          if (state) {
            if (state.startTimeout) {
              clearTimeout(state.startTimeout);
              delete state.startTimeout;
            }
            if (state.dbMatchId) {
              await Match.findByIdAndDelete(state.dbMatchId);
              // Clean up the match log activity entries
              await Activity.deleteMany({
                userId: { $in: [room.admin, room.selectedOpponent] },
                type: "match"
              });
            }
            activeBattles.delete(roomCode);
          }
        }
      } catch (err) {
        console.error("[CANCEL MATCH ERROR]", err);
      }
    });

    // Keystroke typing status relay
    socket.on("opponentStatus", (data) => {
      const { matchId, status } = data || {};
      if (matchId) {
        socket.to(matchId).emit("opponentStatus", { status });
      }
    });

    // ==========================================
    // 3. RUN CODE ACTIONS (SAMPLE TEST RUN)
    // ==========================================
    socket.on("runCode", async (data) => {
      const { code, language, stdin, expectedOutput } = data || {};
      socket.emit("runResult", { status: "Compiling..." });

      try {
        const result = await executeCode(code, language, stdin, expectedOutput);
        socket.emit("runResult", result);
      } catch (err) {
        socket.emit("runResult", {
          success: false,
          statusDescription: "Error",
          stderr: "Compilation node failure: " + err.message,
        });
      }
    });

    // ==========================================
    // 4. SUBMIT CODE ACTIONS (VERIFY HIDDEN TESTCASES)
    // ==========================================
    socket.on("submitCode", async (data) => {
      const { matchId, code, language } = data || {};
      const u = socket.user;

      if (!u) {
        socket.emit("submissionResult", { success: false, statusDescription: "Auth Failed" });
        return;
      }

      socket.emit("submissionResult", { status: "Evaluating hidden nodes..." });

      try {
        const roomState = activeBattles.get(matchId);
        const dbId = roomState ? roomState.dbMatchId : null;
        if (!dbId || !mongoose.Types.ObjectId.isValid(dbId)) {
          socket.emit("submissionResult", { success: false, statusDescription: "Match not found" });
          return;
        }
        const match = await Match.findById(dbId).populate("problemId");
        if (!match || match.status === "ended") {
          socket.emit("submissionResult", { success: false, statusDescription: "Match already ended" });
          return;
        }

        const problem = match.problemId;
        
        // Execute testcases sequentially with early break to reduce server load and prevent Judge0 API fatigue
        let allPassed = true;
        let failResult = null;

        for (const tc of problem.testcases) {
          const execRes = await executeCode(code, language, tc.input, tc.output);
          if (!execRes.success) {
            allPassed = false;
            failResult = execRes;
            break;
          }
        }

        if (allPassed) {
          await Submission.create({
            userId: u._id,
            matchId: dbId,
            problemId: problem._id,
            code,
            language,
            verdict: "Accepted",
            runtime: "0.12s",
            memory: "14 MB"
          });

          // Log submission activity
          await Activity.create({ userId: u._id, type: "submission" });

          const player1Id = match.player1Id.toString();
          const isPlayer1 = player1Id === u._id.toString();

          const winnerId = u._id;
          const endTime = new Date();
          const durationMs = endTime - new Date(match.startTime);
          const durationStr = `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`;

          const eloChangePlayer1 = isPlayer1 ? 20 : -10;
          const eloChangePlayer2 = isPlayer1 ? -10 : 20;

          match.status = "ended";
          match.winnerId = winnerId;
          match.endTime = endTime;
          match.duration = durationStr;
          
          if (isPlayer1) {
            match.player1Code = code;
            match.player2Code = roomState ? (roomState.player2Code || match.player2Code) : match.player2Code;
            match.player1Verdict = "Accepted";
            match.player2Verdict = "Failed";
            match.eloChangePlayer1 = eloChangePlayer1;
            match.eloChangePlayer2 = eloChangePlayer2;
          } else {
            match.player2Code = code;
            match.player1Code = roomState ? (roomState.player1Code || match.player1Code) : match.player1Code;
            match.player2Verdict = "Accepted";
            match.player1Verdict = "Failed";
            match.eloChangePlayer1 = eloChangePlayer1;
            match.eloChangePlayer2 = eloChangePlayer2;
          }
          await match.save();

          // Update profiles
          const winnerUser = await User.findById(winnerId);
          const loserId = isPlayer1 ? match.player2Id : match.player1Id;
          const loserUser = await User.findById(loserId);

          if (winnerUser) {
            winnerUser.elo = Math.max(100, winnerUser.elo + 20);
            winnerUser.wins += 1;
            winnerUser.coins += 100;
            winnerUser.xp += 450;
            winnerUser.level = Math.floor(winnerUser.xp / 1000) + 1;
            await winnerUser.save();
          }

          if (loserUser) {
            loserUser.elo = Math.max(100, loserUser.elo - 10);
            loserUser.losses += 1;
            loserUser.coins += 25;
            loserUser.xp += 150;
            loserUser.level = Math.floor(loserUser.xp / 1000) + 1;
            await loserUser.save();
          }

          // Mark Room as ended
          await Room.findOneAndUpdate({ roomCode: matchId }, { status: "ended" });

          socket.emit("submissionResult", { success: true, statusDescription: "Accepted" });

          io.to(matchId).emit("battleEnded", {
            winnerId: winnerId.toString(),
            duration: durationStr,
            eloChangePlayer1,
            eloChangePlayer2,
            dbMatchId: match._id.toString(),
          });

          activeBattles.delete(matchId);
        } else {
          await Submission.create({
            userId: u._id,
            matchId: dbId,
            problemId: problem._id,
            code,
            language,
            verdict: failResult.statusDescription || "Wrong Answer",
            runtime: failResult.time || "0s",
            memory: failResult.memory || "0 KB"
          });

          // Log submission activity
          await Activity.create({ userId: u._id, type: "submission" });

          socket.emit("submissionResult", {
            success: false,
            statusDescription: failResult.statusDescription || "Wrong Answer",
            stderr: failResult.stderr,
            stdout: failResult.stdout,
          });
        }
      } catch (err) {
        console.error("[SOCKET submitCode ERROR]", err);
        socket.emit("submissionResult", { success: false, statusDescription: "Server Error", stderr: err.message });
      }
    });

    // Autosave listener - cache drafts in activeBattles map in memory to avoid write storms
    socket.on("autosaveCode", (data) => {
      const { matchId, code } = data || {};
      const u = socket.user;
      if (!u || !matchId) return;

      try {
        const roomState = activeBattles.get(matchId);
        if (roomState) {
          if (roomState.admin._id.toString() === u._id.toString()) {
            roomState.player1Code = code;
          } else {
            roomState.player2Code = code;
          }
        }
      } catch (err) {
        console.error("[SOCKET autosaveCode ERROR]", err.message);
      }
    });

    // ==========================================
    // 5. DISCONNECTION HANDLER
    // ==========================================

    socket.on("disconnect", async () => {
      console.log(`[SOCKET] Node disconnected: ${socket.id}`);

      const u = socket.user;
      if (!u) return;

      const userIdStr = u._id.toString();

      // Clean up maps with multi-tab support
      if (onlineUsers.has(userIdStr)) {
        const socketSet = onlineUsers.get(userIdStr);
        socketSet.delete(socket.id);
        if (socketSet.size === 0) {
          onlineUsers.delete(userIdStr);

          // Update MongoDB status to offline only when last connection is closed
          await User.findByIdAndUpdate(u._id, { status: "offline", lastSeen: new Date() });

          // Broadcast offline status to friends
          const userWithFriends = await User.findById(u._id).select("friends");
          if (userWithFriends && userWithFriends.friends) {
            userWithFriends.friends.forEach((friendId) => {
              io.to(friendId.toString()).emit("friendPresenceChange", {
                userId: userIdStr,
                status: "offline",
              });
            });
          }
        }
      }

      // Remove from matchmaking memory queue
      const queueIdx = matchmakingQueue.findIndex(item => item.userId === userIdStr);
      if (queueIdx !== -1) {
        matchmakingQueue.splice(queueIdx, 1);
      }

      // Check if lobby user disconnected (waiting status room)
      const waitingRooms = await Room.find({ participants: u._id, status: "waiting" });
      for (const r of waitingRooms) {
        try {
          r.participants = r.participants.filter(p => p.toString() !== u._id.toString());
          r.readyUsers = (r.readyUsers || []).filter(p => p.toString() !== u._id.toString());
          
          if (r.participants.length === 0) {
            r.status = "ended";
          } else if (r.admin.toString() === u._id.toString()) {
            r.admin = r.participants[0];
          }
          
          if (r.selectedOpponent && r.selectedOpponent.toString() === u._id.toString()) {
            r.selectedOpponent = null;
          }
          
          await r.save();

          io.to(r.roomCode).emit("player_left_lobby", { userId: u._id.toString(), username: u.username });

          // Call populate directly on the saved document to save query overhead
          const populated = await r.populate([
            { path: "admin", select: "username avatarUrl elo status wins losses" },
            { path: "participants", select: "username avatarUrl elo status wins losses" },
            { path: "selectedOpponent", select: "username avatarUrl elo status wins losses" },
            { path: "readyUsers", select: "username avatarUrl elo status wins losses" },
            { path: "invitedUsers", select: "username avatarUrl elo status wins losses" },
            { path: "problemId" }
          ]);

          if (populated) {
            io.to(r.roomCode).emit("roomStatusUpdate", populated);
          }
        } catch (err) {
          console.error(`[SOCKET DISCONNECT CLEANUP ERROR] Room ${r.roomCode} update failed:`, err.message);
        }
      }

      // Check if active battle player disconnected
      for (const [matchId, roomState] of activeBattles.entries()) {
        const isPlayer1 = roomState.player1Socket === socket.id;
        const isPlayer2 = roomState.player2Socket === socket.id;
        if (isPlayer1 || isPlayer2) {
          // Safeguard: Bypasses waiting lobby rooms that haven't transitioned into active database Match records
          if (!roomState.dbMatchId || !mongoose.Types.ObjectId.isValid(roomState.dbMatchId)) {
            continue;
          }

          const userIdStr = u._id.toString();
          console.log(`[BATTLE] Player ${u.username} disconnected from active room ${matchId}. Starting forfeit timer...`);

          socket.to(matchId).emit("opponentDisconnected", { message: `${u.username} connection lost. Standby for forfeit...` });

          roomState.timeouts[userIdStr] = setTimeout(async () => {
            try {
              const match = await Match.findById(roomState.dbMatchId);
              if (match && match.status === "ongoing") {
                const winnerId = isPlayer1 ? match.player2Id : match.player1Id;
                const loserId = isPlayer1 ? match.player1Id : match.player2Id;

                const eloChangePlayer1 = isPlayer1 ? -10 : 20;
                const eloChangePlayer2 = isPlayer1 ? 20 : -10;

                match.status = "ended";
                match.winnerId = winnerId;
                match.endTime = new Date();
                match.duration = "Forfeit (Connection Loss)";
                match.eloChangePlayer1 = eloChangePlayer1;
                match.eloChangePlayer2 = eloChangePlayer2;
                match.player1Verdict = isPlayer1 ? "Forfeit" : "Accepted";
                match.player2Verdict = isPlayer1 ? "Accepted" : "Forfeit";
                match.player1Code = roomState.player1Code || match.player1Code;
                match.player2Code = roomState.player2Code || match.player2Code;
                await match.save();

                const winUser = await User.findById(winnerId);
                if (winUser) {
                  winUser.elo = Math.max(100, winUser.elo + 20);
                  winUser.wins += 1;
                  await winUser.save();
                }

                const loseUser = await User.findById(loserId);
                if (loseUser) {
                  loseUser.elo = Math.max(100, loseUser.elo - 10);
                  loseUser.losses += 1;
                  await loseUser.save();
                }

                await Room.findOneAndUpdate({ roomCode: matchId }, { status: "ended" });

                io.to(matchId).emit("battleEnded", {
                  winnerId: winnerId.toString(),
                  duration: "Forfeit",
                  eloChangePlayer1,
                  eloChangePlayer2,
                  dbMatchId: match._id.toString(),
                });
              }
            } catch (err) {
              console.error("[FORFEIT GRACE ERROR]", err);
            } finally {
              activeBattles.delete(matchId);
            }
          }, 15000);
        }
      }
    });
  });
};

module.exports = { handleSocketConnections, onlineUsers };
