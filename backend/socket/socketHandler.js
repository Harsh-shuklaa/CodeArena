const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Problem = require("../models/Problem");
const Match = require("../models/Match");
const FriendRequest = require("../models/FriendRequest");
const Notification = require("../models/Notification");
const Room = require("../models/Room");
const Matchmaking = require("../models/Matchmaking");
const Submission = require("../models/Submission");
const { executeCode } = require("../services/judge0");

// Track active battle room details in memory: { matchId: { player1Socket, player2Socket, startTime, problem } }
const activeBattles = new Map();

// Track online users mapping userId -> socketId
const onlineUsers = new Map();

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

    // Authenticate connection immediately
    const token = socket.handshake.auth?.token;
    let user = await verifyUserToken(token);

    if (user) {
      socket.user = user;
      console.log(`[SOCKET] Authenticated user ${user.username} for socket ${socket.id}`);
      
      // Update status to online in database
      await User.findByIdAndUpdate(user._id, { status: "online", lastSeen: new Date() });
      
      // Join personal room for real-time target notifications
      socket.join(user._id.toString());

      // Store in onlineUsers map
      onlineUsers.set(user._id.toString(), socket.id);

      // Broadcast presence change to friends
      const userWithFriends = await User.findById(user._id).select("friends");
      if (userWithFriends && userWithFriends.friends) {
        userWithFriends.friends.forEach((friendId) => {
          io.to(friendId.toString()).emit("friendPresenceChange", {
            userId: user._id.toString(),
            status: "online",
          });
        });
      }
    } else {
      // Unauthenticated client connection - keep open for guest or reject
      console.log(`[SOCKET] Unauthenticated node connection: ${socket.id}`);
    }

    socket.on("register-user", async (userId) => {
      if (userId) {
        onlineUsers.set(userId.toString(), socket.id);
        await User.findByIdAndUpdate(userId, { status: "online", lastSeen: new Date() });
        console.log(`[SOCKET] Registered online user ${userId} to socket ${socket.id}`);
        
        // Broadcast presence change to friends
        const userWithFriends = await User.findById(userId).select("friends");
        if (userWithFriends && userWithFriends.friends) {
          userWithFriends.friends.forEach((friendId) => {
            io.to(friendId.toString()).emit("friendPresenceChange", {
              userId: userId.toString(),
              status: "online",
            });
          });
        }
      }
    });

    // ==========================================
    // 1. MATCHMAKING EVENTS (MongoDB-backed FCFS)
    // ==========================================

    socket.on("joinQueue", async (data) => {
      try {
        const u = socket.user || (data?.token ? await verifyUserToken(data.token) : null);
        if (!u) {
          socket.emit("error", { message: "Invalid session credentials" });
          return;
        }
        socket.user = u; // ensure set

        // Prevent duplicate entries
        await Matchmaking.deleteOne({ userId: u._id });

        // User cannot join queue if already in an active room
        const activeRoom = await Room.findOne({
          participants: u._id,
          status: { $in: ["waiting", "active"] }
        });
        if (activeRoom) {
          socket.emit("error", { message: "User cannot join queue if already in a room." });
          return;
        }

        console.log(`[MATCHMAKING] User ${u.username} entering MongoDB queue.`);

        // Insert into matchmaking collection
        await Matchmaking.create({
          userId: u._id,
          status: "waiting",
          joinedAt: new Date()
        });

        socket.emit("queueJoined", { message: "Searching for similar operators..." });

        // Trigger First-Come-First-Serve Matchmaking Check
        const waitingList = await Matchmaking.find({ status: "waiting" })
          .sort({ joinedAt: 1 })
          .populate("userId");

        if (waitingList.length >= 2) {
          const player1 = waitingList[0];
          const player2 = waitingList[1];

          console.log(`[MATCHMAKING] Pairing ${player1.userId.username} vs ${player2.userId.username}`);

          // Remove queue entries
          await Matchmaking.deleteMany({
            userId: { $in: [player1.userId._id, player2.userId._id] }
          });

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
            admin: player1.userId._id,
            participants: [player1.userId._id, player2.userId._id],
            selectedOpponent: player2.userId._id,
            roomType: "matchmaking",
            status: "active",
            problemId: problem._id,
          });

          // Create Match
          const match = await Match.create({
            player1Id: player1.userId._id,
            player2Id: player2.userId._id,
            problemId: problem._id,
            status: "ongoing",
            startTime: Date.now(),
          });

          // Log match activities
          await Activity.create({ userId: player1.userId._id, type: "match" });
          await Activity.create({ userId: player2.userId._id, type: "match" });

          const p1Socket = onlineUsers.get(player1.userId._id.toString());
          const p2Socket = onlineUsers.get(player2.userId._id.toString());

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

          if (p1Socket) {
            io.to(p1Socket).emit("match_found", {
              ...matchData,
              opponent: {
                username: player2.userId.username,
                avatarUrl: player2.userId.avatarUrl,
                elo: player2.userId.elo,
                wins: player2.userId.wins,
                winRate: (player2.userId.wins + player2.userId.losses) > 0 
                  ? Math.round((player2.userId.wins / (player2.userId.wins + player2.userId.losses)) * 100) 
                  : 0,
                status: "online",
              }
            });
          }

          if (p2Socket) {
            io.to(p2Socket).emit("match_found", {
              ...matchData,
              opponent: {
                username: player1.userId.username,
                avatarUrl: player1.userId.avatarUrl,
                elo: player1.userId.elo,
                wins: player1.userId.wins,
                winRate: (player1.userId.wins + player1.userId.losses) > 0 
                  ? Math.round((player1.userId.wins / (player1.userId.wins + player1.userId.losses)) * 100) 
                  : 0,
                status: "online",
              }
            });
          }
        }
      } catch (err) {
        console.error("[SOCKET joinQueue ERROR]", err);
        socket.emit("error", { message: "Internal queue logic error" });
      }
    });

    socket.on("leaveQueue", async () => {
      if (socket.user) {
        console.log(`[MATCHMAKING] User ${socket.user.username} left queue.`);
        await Matchmaking.deleteOne({ userId: socket.user._id });
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

        // Sync with Room in MongoDB
        let dbRoom = await Room.findOne({ roomCode: matchId });
        if (dbRoom) {
          const hasJoined = dbRoom.participants.some(p => p.toString() === u._id.toString());
          if (!hasJoined) {
            dbRoom.participants.push(u._id);
            await dbRoom.save();
            io.to(matchId).emit("player_joined_lobby", { userId: u._id.toString(), username: u.username });
          }

          // Populate room details
          const populatedRoom = await Room.findOne({ roomCode: matchId })
            .populate("admin", "username avatarUrl elo status wins losses")
            .populate("participants", "username avatarUrl elo status wins losses")
            .populate("selectedOpponent", "username avatarUrl elo status wins losses")
            .populate("problemId");

          // Sync in-memory room mapping if active
          if (!activeBattles.has(matchId)) {
            activeBattles.set(matchId, {
              matchId,
              dbMatchId: null,
              admin: populatedRoom.admin,
              player1Socket: populatedRoom.admin._id.toString() === u._id.toString() ? socket.id : null,
              player2Socket: populatedRoom.selectedOpponent && populatedRoom.selectedOpponent._id.toString() === u._id.toString() ? socket.id : null,
              startTime: null,
              problem: populatedRoom.problemId,
              timeouts: {},
            });
          } else {
            const roomState = activeBattles.get(matchId);
            if (populatedRoom.admin._id.toString() === u._id.toString()) {
              roomState.player1Socket = socket.id;
            } else if (populatedRoom.selectedOpponent && populatedRoom.selectedOpponent._id.toString() === u._id.toString()) {
              roomState.player2Socket = socket.id;
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

          const populated = await Room.findOne({ roomCode })
            .populate("admin", "username avatarUrl elo status wins losses")
            .populate("participants", "username avatarUrl elo status wins losses")
            .populate("selectedOpponent", "username avatarUrl elo status wins losses")
            .populate("problemId");

          // Update activeBattle state
          if (activeBattles.has(roomCode)) {
            const state = activeBattles.get(roomCode);
            state.player2Socket = opponentId ? onlineUsers.get(opponentId.toString()) : null;
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
          if (room.selectedOpponent && room.selectedOpponent.toString() === userIdToRemove) {
            room.selectedOpponent = null;
          }
          await room.save();

          // Emit kicked notification directly to user
          const kickedSocketId = onlineUsers.get(userIdToRemove);
          if (kickedSocketId) {
            io.to(kickedSocketId).emit("player_removed", { roomCode });
          }

          const populated = await Room.findOne({ roomCode })
            .populate("admin", "username avatarUrl elo status wins losses")
            .populate("participants", "username avatarUrl elo status wins losses")
            .populate("selectedOpponent", "username avatarUrl elo status wins losses")
            .populate("problemId");

          io.to(roomCode).emit("roomStatusUpdate", populated);
        }
      } catch (err) {
        console.error("[REMOVE USER ERROR]", err);
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

          // In-memory state tracking
          const state = activeBattles.get(roomCode) || { timeouts: {} };
          state.dbMatchId = match._id.toString();
          state.startTime = Date.now();
          activeBattles.set(roomCode, state);

          // Wait 3 seconds countdown, then redirect to fight
          setTimeout(async () => {
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
        const dbId = roomState ? (roomState.dbMatchId || matchId) : matchId;
        const match = await Match.findById(dbId).populate("problemId");
        if (!match || match.status === "ended") {
          socket.emit("submissionResult", { success: false, statusDescription: "Match already ended" });
          return;
        }

        const problem = match.problemId;
        let allPassed = true;
        let failResult = null;

        for (let i = 0; i < problem.testcases.length; i++) {
          const tc = problem.testcases[i];
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
            match.player1Verdict = "Accepted";
            match.player2Verdict = "Failed";
            match.eloChangePlayer1 = eloChangePlayer1;
            match.eloChangePlayer2 = eloChangePlayer2;
          } else {
            match.player2Code = code;
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

    // Autosave listener
    socket.on("autosaveCode", async (data) => {
      const { matchId, code } = data || {};
      const u = socket.user;
      if (!u || !matchId) return;

      try {
        const roomState = activeBattles.get(matchId);
        const dbId = roomState ? (roomState.dbMatchId || matchId) : matchId;
        const match = await Match.findById(dbId);
        if (match && match.status === "ongoing") {
          if (match.player1Id.toString() === u._id.toString()) {
            match.player1Code = code;
          } else if (match.player2Id.toString() === u._id.toString()) {
            match.player2Code = code;
          }
          await match.save();
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

      // Clean up maps
      onlineUsers.delete(u._id.toString());

      // Update MongoDB status
      await User.findByIdAndUpdate(u._id, { status: "offline", lastSeen: new Date() });

      // Broadcast offline status to friends
      const userWithFriends = await User.findById(u._id).select("friends");
      if (userWithFriends && userWithFriends.friends) {
        userWithFriends.friends.forEach((friendId) => {
          io.to(friendId.toString()).emit("friendPresenceChange", {
            userId: u._id.toString(),
            status: "offline",
          });
        });
      }

      // Remove from matchmaking queue
      await Matchmaking.deleteOne({ userId: u._id });

      // Check if lobby user disconnected (waiting status room)
      const waitingRooms = await Room.find({ participants: u._id, status: "waiting" });
      for (const r of waitingRooms) {
        r.participants = r.participants.filter(p => p.toString() !== u._id.toString());
        
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

        const populated = await Room.findOne({ roomCode: r.roomCode })
          .populate("admin", "username avatarUrl elo status wins losses")
          .populate("participants", "username avatarUrl elo status wins losses")
          .populate("selectedOpponent", "username avatarUrl elo status wins losses")
          .populate("problemId");

        if (populated) {
          io.to(r.roomCode).emit("roomStatusUpdate", populated);
        }
      }

      // Check if active battle player disconnected
      for (const [matchId, roomState] of activeBattles.entries()) {
        const isPlayer1 = roomState.player1Socket === socket.id;
        const isPlayer2 = roomState.player2Socket === socket.id;
        if (isPlayer1 || isPlayer2) {
          const userIdStr = u._id.toString();
          console.log(`[BATTLE] Player ${u.username} disconnected from active room ${matchId}. Starting forfeit timer...`);

          socket.to(matchId).emit("opponentDisconnected", { message: `${u.username} connection lost. Standby for forfeit...` });

          roomState.timeouts[userIdStr] = setTimeout(async () => {
            try {
              const match = await Match.findById(roomState.dbMatchId || matchId);
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
