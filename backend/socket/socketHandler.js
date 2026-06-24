const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Problem = require("../models/Problem");
const Match = require("../models/Match");
const { executeCode } = require("../services/judge0");

// In-memory queue of players searching for a game
let matchmakingQueue = [];

// Track active battle room details: { matchId: { player1Socket, player2Socket, startTime, problem } }
const activeBattles = new Map();

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
  io.on("connection", (socket) => {
    console.log(`[SOCKET] Node connected: ${socket.id}`);

    // ==========================================
    // 1. MATCHMAKING EVENTS
    // ==========================================

    socket.on("joinQueue", async (data) => {
      try {
        const { token } = data || {};
        const user = await verifyUserToken(token);

        if (!user) {
          socket.emit("error", { message: "Invalid session credentials" });
          return;
        }

        // Purge user from queue if already in it
        matchmakingQueue = matchmakingQueue.filter((q) => q.userId.toString() !== user._id.toString());

        console.log(`[MATCHMAKING] User ${user.username} entered queue.`);
        
        // Push user details to matchmaking queue
        matchmakingQueue.push({
          socketId: socket.id,
          userId: user._id,
          username: user.username,
          elo: user.elo,
          avatarUrl: user.avatarUrl,
        });

        socket.emit("queueJoined", { message: "Searching for similar operators..." });

        // Matchmaking logic: Pair two players
        if (matchmakingQueue.length >= 2) {
          const player1 = matchmakingQueue.shift();
          const player2 = matchmakingQueue.shift();

          console.log(`[MATCHMAKING] Match found between: ${player1.username} and ${player2.username}`);

          // Fetch a random coding challenge
          const count = await Problem.countDocuments();
          let problem;
          if (count > 0) {
            const randomIdx = Math.floor(Math.random() * count);
            problem = await Problem.findOne().skip(randomIdx);
          } else {
            // Seed fallback on-the-fly if needed
            problem = await Problem.create({
              title: "Default Decryption Challenge",
              difficulty: "Medium",
              statement: "Reverse a string of packet payloads.",
              testcases: [{ input: "hello", output: "olleh" }],
            });
          }

          // Create new Match entry in database
          const match = await Match.create({
            player1Id: player1.userId,
            player2Id: player2.userId,
            problemId: problem._id,
            status: "ongoing",
            startTime: Date.now(),
          });

          // Notify Player 1
          io.to(player1.socketId).emit("matchFound", {
            matchId: match._id.toString(),
            opponent: {
              username: player2.username,
              avatarUrl: player2.avatarUrl,
              elo: player2.elo,
            },
          });

          // Notify Player 2
          io.to(player2.socketId).emit("matchFound", {
            matchId: match._id.toString(),
            opponent: {
              username: player1.username,
              avatarUrl: player1.avatarUrl,
              elo: player1.elo,
            },
          });
        }
      } catch (err) {
        console.error("[SOCKET joinQueue ERROR]", err);
        socket.emit("error", { message: "Internal queue logic error" });
      }
    });

    socket.on("leaveQueue", () => {
      console.log(`[MATCHMAKING] Socket ${socket.id} left queue.`);
      matchmakingQueue = matchmakingQueue.filter((q) => q.socketId !== socket.id);
    });

    // ==========================================
    // 2. BATTLE ROOM EVENTS
    // ==========================================

    socket.on("joinRoom", async (data) => {
      const { matchId, token } = data || {};
      const user = await verifyUserToken(token);

      if (!user) {
        socket.emit("error", { message: "Verification failed on joinRoom" });
        return;
      }

      try {
        const isCustomRoom = matchId && matchId.startsWith("CA-");
        socket.join(matchId);
        console.log(`[BATTLE] Operator ${user.username} joined room ${matchId}`);

        if (isCustomRoom) {
          // Initialize custom lobby state in memory
          if (!activeBattles.has(matchId)) {
            // Fetch a random problem to prepare
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

            activeBattles.set(matchId, {
              matchId,
              dbMatchId: null,
              hostUser: user,
              guestUser: null,
              player1Socket: socket.id,
              player2Socket: null,
              startTime: null,
              problem,
              timeouts: {},
            });

            console.log(`[LOBBY] Created custom lobby ${matchId} hosted by ${user.username}`);
            // Notify host they joined successfully
            socket.emit("lobbyStatusUpdate", { status: "waiting", user });
          } else {
            // Guest is joining
            const roomState = activeBattles.get(matchId);
            
            // Reconnection check
            if (roomState.timeouts[user._id.toString()]) {
              clearTimeout(roomState.timeouts[user._id.toString()]);
              delete roomState.timeouts[user._id.toString()];
              if (roomState.hostUser._id.toString() === user._id.toString()) {
                roomState.player1Socket = socket.id;
              } else {
                roomState.player2Socket = socket.id;
              }
              socket.to(matchId).emit("opponentReconnected", { username: user.username });
              console.log(`[BATTLE] Custom lobby player ${user.username} reconnected.`);
              return;
            }

            if (!roomState.guestUser && roomState.hostUser._id.toString() !== user._id.toString()) {
              roomState.guestUser = user;
              roomState.player2Socket = socket.id;
              roomState.startTime = Date.now();

              console.log(`[LOBBY] Guest ${user.username} joined custom lobby ${matchId}`);

              // Instantiate the database Match record now that we have both players
              const match = await Match.create({
                player1Id: roomState.hostUser._id,
                player2Id: roomState.guestUser._id,
                problemId: roomState.problem._id,
                status: "ongoing",
                startTime: roomState.startTime,
              });

              roomState.dbMatchId = match._id.toString();

              // Notify both players in the lobby that opponent has connected
              io.to(matchId).emit("lobbyStatusUpdate", { 
                status: "guest_joined",
                guest: {
                  username: user.username,
                  avatarUrl: user.avatarUrl,
                  elo: user.elo
                }
              });
            }
          }
        } else {
          // Ranked matches (Mongoose match ID)
          const match = await Match.findById(matchId)
            .populate("player1Id", "username avatarUrl elo")
            .populate("player2Id", "username avatarUrl elo")
            .populate("problemId");

          if (!match) {
            socket.emit("error", { message: "Match session does not exist" });
            return;
          }

          if (!activeBattles.has(matchId)) {
            activeBattles.set(matchId, {
              matchId,
              dbMatchId: matchId,
              player1Socket: null,
              player2Socket: null,
              startTime: Date.now(),
              problem: match.problemId,
              timeouts: {},
            });
          }

          const roomState = activeBattles.get(matchId);

          // Cancel timeouts
          if (roomState.timeouts[user._id.toString()]) {
            clearTimeout(roomState.timeouts[user._id.toString()]);
            delete roomState.timeouts[user._id.toString()];
            socket.to(matchId).emit("opponentReconnected", { username: user.username });
            console.log(`[BATTLE] Operator ${user.username} reconnected.`);
          }

          if (match.player1Id._id.toString() === user._id.toString()) {
            roomState.player1Socket = socket.id;
          } else if (match.player2Id._id.toString() === user._id.toString()) {
            roomState.player2Socket = socket.id;
          }

          if (roomState.player1Socket && roomState.player2Socket) {
            io.to(matchId).emit("battleStarted", {
              matchId,
              problem: {
                title: match.problemId.title,
                difficulty: match.problemId.difficulty,
                statement: match.problemId.statement,
                constraints: match.problemId.constraints,
                sampleInput: match.problemId.sampleInput,
                sampleOutput: match.problemId.sampleOutput,
              },
              player1: match.player1Id,
              player2: match.player2Id,
            });
          }
        }
      } catch (err) {
        console.error("[SOCKET joinRoom ERROR]", err);
        socket.emit("error", { message: "Internal lobby routing error" });
      }
    });

    // Keystroke status relays
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
      const { matchId, code, language, token } = data || {};
      const user = await verifyUserToken(token);

      if (!user) {
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

        // Iterate through all hidden testcases
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
          // Player won the match!
          const player1Id = match.player1Id.toString();
          const player2Id = match.player2Id.toString();
          const isPlayer1 = player1Id === user._id.toString();

          const winnerId = user._id;
          const endTime = new Date();
          const durationMs = endTime - new Date(match.startTime);
          const durationStr = `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`;

          // Simple ELO formula updates
          const eloChangePlayer1 = isPlayer1 ? 20 : -10;
          const eloChangePlayer2 = isPlayer1 ? -10 : 20;

          // Update match database status
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

          // Apply statistics in User profiles
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

          socket.emit("submissionResult", { success: true, statusDescription: "Accepted" });

          // Broadcast results to both clients
          io.to(matchId).emit("battleEnded", {
            winnerId: winnerId.toString(),
            duration: durationStr,
            eloChangePlayer1,
            eloChangePlayer2,
          });

          activeBattles.delete(matchId);
        } else {
          // Verdict failed
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

    // ==========================================
    // 5. DISCONNECTION HANDLERS
    // ==========================================

    socket.on("disconnect", () => {
      console.log(`[SOCKET] Node disconnected: ${socket.id}`);
      
      // Purge socket from matchmaking queue
      matchmakingQueue = matchmakingQueue.filter((q) => q.socketId !== socket.id);

      // Check if player was in an active battle
      for (const [matchId, roomState] of activeBattles.entries()) {
        const isPlayer1 = roomState.player1Socket === socket.id;
        const isPlayer2 = roomState.player2Socket === socket.id;

        if (isPlayer1 || isPlayer2) {
          const userId = isPlayer1 ? "player1" : "player2";
          console.log(`[BATTLE] Socked player ${userId} disconnected from room ${matchId}. starting grace countdown...`);

          // Relay status alert to the remaining player
          socket.to(matchId).emit("opponentDisconnected", { message: "Opponent connection lost. Standby for forfeit..." });

          // Start 15s forfeit grace timeout
          roomState.timeouts[userId] = setTimeout(async () => {
            try {
              const match = await Match.findById(roomState.dbMatchId || matchId);
              if (match && match.status === "ongoing") {
                const p1Disconnected = isPlayer1;
                const winnerId = p1Disconnected ? match.player2Id : match.player1Id;
                const loserId = p1Disconnected ? match.player1Id : match.player2Id;

                const eloChangePlayer1 = p1Disconnected ? -10 : 20;
                const eloChangePlayer2 = p1Disconnected ? 20 : -10;

                match.status = "ended";
                match.winnerId = winnerId;
                match.endTime = new Date();
                match.duration = "Forfeit (Connection Loss)";
                match.eloChangePlayer1 = eloChangePlayer1;
                match.eloChangePlayer2 = eloChangePlayer2;
                match.player1Verdict = p1Disconnected ? "Forfeit" : "Accepted";
                match.player2Verdict = p1Disconnected ? "Accepted" : "Forfeit";
                await match.save();

                // Apply ratings changes
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

                io.to(matchId).emit("battleEnded", {
                  winnerId: winnerId.toString(),
                  duration: "Forfeit",
                  eloChangePlayer1,
                  eloChangePlayer2,
                });
              }
            } catch (err) {
              console.error("[DISCONNECT FORFEIT ERROR]", err);
            } finally {
              activeBattles.delete(matchId);
            }
          }, 15000);
        }
      }
    });
  });
};

module.exports = { handleSocketConnections };
