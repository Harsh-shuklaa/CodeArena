import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { HelpCircle, CheckCircle2, RotateCw } from "lucide-react";
import { UserContext } from "../context/UserContext";
import BackgroundShader from "../components/BackgroundShader";

export default function Battle() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, socket } = useContext(UserContext);
  
  const initialCode = `// Problem solver template
const decryptStream = (stream, k) => {
    // Write your high-performance code below:
    
    return 0;
};
`;

  const [code, setCode] = useState(initialCode);
  const [problem, setProblem] = useState(null);

  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes default
  const [selectedLanguage, setSelectedLanguage] = useState("JAVASCRIPT (ES6)");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");
  
  const [userProgress, setUserProgress] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [terminalOutput, setTerminalOutput] = useState([
    { name: "COMPILE LOG", status: "AWAITING SYNC", color: "text-on-surface-variant/40" }
  ]);
  
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lobby & Battle States
  const [battleStarted, setBattleStarted] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownVal, setCountdownVal] = useState(3);
  const [guestUser, setGuestUser] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [oppStatus, setOppStatus] = useState("Awaiting Start...");
  const [participants, setParticipants] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [roomError, setRoomError] = useState(null);
  const [prevParticipants, setPrevParticipants] = useState([]);
  const [readyUsers, setReadyUsers] = useState([]);
  const [spectatorsAllowed, setSpectatorsAllowed] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [lobbyToast, setLobbyToast] = useState(null);
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [roomType, setRoomType] = useState("custom");

  const isCustomRoom = matchId && matchId.startsWith("CA-");

  // Sync lobby/room states on mount
  useEffect(() => {
    if (!socket || !matchId) return;

    // Join battle room
    socket.emit("joinRoom", { matchId, token: localStorage.getItem("codearena_token") });

    socket.on("roomStatusUpdate", (data) => {
      const { 
        participants: updatedParticipants, 
        admin, 
        selectedOpponent: updatedOpponent, 
        difficulty, 
        language, 
        status: dbStatus, 
        readyUsers: updatedReadyUsers, 
        spectatorsAllowed: updatedSpectatorsAllowed, 
        invitedUsers: updatedInvitedUsers,
        roomType: dbRoomType
      } = data;
      
      setParticipants(updatedParticipants || []);
      setRoomType(dbRoomType || "custom");
      const admId = admin?._id || admin;
      setHostId(admId);
      setSelectedDifficulty(difficulty || "Medium");
      setSelectedLanguage(language || "JAVASCRIPT (ES6)");
      setSelectedOpponent(updatedOpponent);
      setReadyUsers(updatedReadyUsers || []);
      setSpectatorsAllowed(updatedSpectatorsAllowed !== false);
      setInvitedUsers(updatedInvitedUsers || []);
      
      const hostIdStr = admId ? admId.toString() : "";
      const opponent = updatedParticipants.find(p => p._id.toString() !== hostIdStr);
      
      if (opponent) {
        setGuestUser(opponent);
      } else {
        setGuestUser(null);
      }

      if (dbRoomType === "matchmaking") {
        if (dbStatus === "active") {
          const hasRunCountdown = sessionStorage.getItem(`countdown_run_${matchId}`);
          if (hasRunCountdown === "true") {
            setBattleStarted(true);
          } else {
            sessionStorage.setItem(`countdown_run_${matchId}`, "true");
            setShowCountdown(true);
            setCountdownVal(5);

            let count = 5;
            const interval = setInterval(() => {
              count -= 1;
              if (count === 0) {
                setCountdownVal("FIGHT!");
                clearInterval(interval);
                setTimeout(() => {
                  setShowCountdown(false);
                  setBattleStarted(true);
                }, 1000);
              } else {
                setCountdownVal(count);
              }
            }, 1000);
          }
        }
      } else {
        if (dbStatus === "active") {
          setBattleStarted(true);
        }
      }
    });

    socket.on("chatMessage", (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    // Real-time notification updates
    socket.on("player_joined_lobby", (data) => {
      const { username } = data;
      setTerminalOutput(prev => [
        ...prev,
        { name: "SYSTEM NOTIFY", status: `operator ${username.toUpperCase()} joined the lobby.`, color: "text-green-400" }
      ]);
    });

    socket.on("player_left_lobby", (data) => {
      const { username } = data;
      setTerminalOutput(prev => [
        ...prev,
        { name: "SYSTEM NOTIFY", status: `operator ${username.toUpperCase()} left the lobby.`, color: "text-red-400" }
      ]);
    });

    // Removed from lobby
    socket.on("player_removed", () => {
      setTerminalOutput(prev => [
        ...prev,
        { name: "SYSTEM WARNING", status: "YOU WERE REMOVED BY THE ADMIN.", color: "text-red-400" }
      ]);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    });

    // Opponent Selected
    socket.on("opponent_selected", (data) => {
      setSelectedOpponent(data.selectedOpponent);
      const oppUsername = data.selectedOpponent ? data.selectedOpponent.username.toUpperCase() : "NONE";
      setTerminalOutput(prev => [
        ...prev,
        { name: "LOBBY STATUS", status: `OPPONENT SET TO ${oppUsername}`, color: "text-secondary" }
      ]);
    });

    // Match count down start
    socket.on("match_starting", () => {
      setShowCountdown(true);
      setCountdownVal(3);

      let count = 3;
      const interval = setInterval(() => {
        count -= 1;
        if (count === 0) {
          setCountdownVal("FIGHT!");
          clearInterval(interval);
        } else {
          setCountdownVal(count);
        }
      }, 1000);
    });

    // Match countdown cancelled
    socket.on("match_cancelled", () => {
      setShowCountdown(false);
      setTerminalOutput(prev => [
        ...prev,
        { name: "SYSTEM ALERT", status: "ADMIN CANCELLED THE MATCH START.", color: "text-yellow-400" }
      ]);
    });

    // Match starts
    socket.on("match_started", (data) => {
      const { problem: serverProblem, player1, player2 } = data;
      
      const isP1 = player1._id.toString() === user._id.toString();
      const isP2 = player2 && player2._id.toString() === user._id.toString();
      
      if (isP1 || isP2) {
        setProblem(serverProblem);
        setGuestUser(isP1 ? player2 : player1);
        setShowCountdown(false);
        setBattleStarted(true);
        setTimeLeft(600);
      } else {
        setShowCountdown(false);
        setTerminalOutput(prev => [
          ...prev,
          { name: "SYSTEM NOTIFY", status: "MATCH ACTIVE. YOU ARE SPECTATING.", color: "text-blue-400" }
        ]);
      }
    });

    // Handle battle initiation
    socket.on("battleStarted", (data) => {
      const { problem: serverProblem, player1, player2 } = data;
      setProblem(serverProblem);
      
      const opponent = player1._id.toString() === user._id.toString() ? player2 : player1;
      setGuestUser(opponent);
      setBattleStarted(true);
      setTimeLeft(600);
    });

    // Handle opponent editor typing triggers
    socket.on("opponentStatus", (data) => {
      const { status } = data;
      setOppStatus(status);
      if (status === "Typing...") {
        setOpponentProgress((prev) => Math.min(prev + 1, 98));
      }
    });

    // Listen for code run (test cases) feedback
    socket.on("runResult", (result) => {
      setIsRunningTests(false);
      if (result.status === "Compiling...") {
        setIsRunningTests(true);
        setTerminalOutput([{ name: "BUILDING SOURCE", status: "PENDING...", color: "text-on-surface-variant animate-pulse" }]);
      } else if (result.success) {
        setTerminalOutput([
          { name: "COMPILE STATUS", status: "SUCCESS", color: "text-green-400" },
          { name: "OUTPUT LOG", status: result.stdout || "Success (No Output Log)", color: "text-white" },
          { name: "DIAGNOSTICS", status: `Time: ${result.time} | Memory: ${result.memory}`, color: "text-secondary" }
        ]);
        setUserProgress((prev) => Math.max(prev, 65));
      } else {
        setTerminalOutput([
          { name: "COMPILE STATUS", status: result.statusDescription || "FAILED", color: "text-red-400" },
          { name: "ERROR LOG", status: result.stderr || "Runtime Failure", color: "text-error" }
        ]);
      }
    });

    // Listen for submission feedback
    socket.on("submissionResult", (result) => {
      setIsSubmitting(false);
      if (result.status) {
        setIsSubmitting(true);
        setTerminalOutput([{ name: "SUBMISSION VERIFY", status: result.status, color: "text-secondary animate-pulse" }]);
      } else if (result.success) {
        setTerminalOutput([
          { name: "VERDICT CODE", status: "ACCEPTED", color: "text-green-400" },
          { name: "ATTEMPTS", status: "CONQUERED ALL TESTCASES", color: "text-secondary" }
        ]);
        setUserProgress(100);
      } else {
        setTerminalOutput([
          { name: "VERDICT CODE", status: result.statusDescription || "WRONG ANSWER", color: "text-red-400" },
          { name: "DIAGNOSTIC LOG", status: result.stderr || result.stdout || "Execution failed", color: "text-error" }
        ]);
      }
    });

    // Connection drop notifications
    socket.on("opponentDisconnected", (data) => {
      setOppStatus("Offline...");
      setTerminalOutput((prev) => [
        ...prev,
        { name: "SYSTEM WARNING", status: data.message, color: "text-error animate-pulse" }
      ]);
    });

    socket.on("opponentReconnected", (data) => {
      setOppStatus("Online");
      setTerminalOutput((prev) => [
        ...prev,
        { name: "SYSTEM NOTIFY", status: `${data.username} reconnected.`, color: "text-green-400" }
      ]);
    });

    // Battle ended
    socket.on("battleEnded", (data) => {
      const { winnerId } = data;
      setBattleStarted(false);
      setTerminalOutput((prev) => [
        ...prev,
        { name: "SYSTEM STATUS", status: `RESOLVED: Winner is ${winnerId === user._id ? "YOU" : "OPPONENT"}`, color: "text-secondary" }
      ]);

      setTimeout(() => {
        navigate(`/result/${matchId}`);
      }, 2000);
    });

    return () => {
      socket.off("roomStatusUpdate");
      socket.off("player_joined_lobby");
      socket.off("player_left_lobby");
      socket.off("player_removed");
      socket.off("opponent_selected");
      socket.off("match_starting");
      socket.off("match_cancelled");
      socket.off("match_started");
      socket.off("battleStarted");
      socket.off("opponentStatus");
      socket.off("runResult");
      socket.off("submissionResult");
      socket.off("opponentDisconnected");
      socket.off("opponentReconnected");
      socket.off("battleEnded");
      socket.off("chatMessage");
    };
  }, [socket, matchId, user._id, navigate]);

  // Recovery: Sync room details from MongoDB on mount/refresh
  useEffect(() => {
    if (!matchId) return;

    const fetchRoomDetails = async () => {
      const token = localStorage.getItem("codearena_token");
      if (!token) return;

      try {
        const res = await fetch(`http://localhost:5001/api/room/${matchId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setParticipants(data.participants || []);
          const admId = data.admin?._id || data.admin;
          setHostId(admId);
          setSelectedDifficulty(data.difficulty || "Medium");
          setSelectedLanguage(data.language || "JAVASCRIPT (ES6)");
          setSelectedOpponent(data.selectedOpponent);
          setReadyUsers(data.readyUsers || []);
          setSpectatorsAllowed(data.spectatorsAllowed !== false);
          
          if (data.status === "active") {
            setBattleStarted(true);
            setProblem(data.problemId);
          }
          
          const hostIdStr = admId ? admId.toString() : "";
          const opponent = data.participants.find(p => p._id.toString() !== hostIdStr);
          if (opponent) {
            setGuestUser(opponent);
          } else {
            setGuestUser(null);
          }
        } else if (res.status === 404) {
          setRoomError("Lobby code is invalid or expired.");
        }
      } catch (err) {
        console.error("Failed to restore room details from database", err);
      }
    };

    fetchRoomDetails();
  }, [matchId]);

  // Terminal logs: Monitor participants presence change in real-time
  useEffect(() => {
    if (participants.length > 0 && prevParticipants.length > 0) {
      const joined = participants.find(p => !prevParticipants.some(prev => prev._id === p._id));
      if (joined) {
        setTerminalOutput(prev => [
          ...prev,
          { name: "SYSTEM STATUS", status: `operator ${joined.username.toUpperCase()} connected.`, color: "text-green-400" }
        ]);
      }
      const left = prevParticipants.find(prev => !participants.some(p => p._id === prev._id));
      if (left) {
        setTerminalOutput(prev => [
          ...prev,
          { name: "SYSTEM STATUS", status: `operator ${left.username.toUpperCase()} left.`, color: "text-error" }
        ]);
      }
    }
    setPrevParticipants(participants);
  }, [participants, prevParticipants]);

  // Match Timer Effect
  useEffect(() => {
    if (!battleStarted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [battleStarted]);

  // Autosave effect hook
  useEffect(() => {
    if (!battleStarted || !socket || !matchId) return;

    const delayDebounce = setTimeout(() => {
      socket.emit("autosaveCode", { matchId, code });
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [code, battleStarted, socket, matchId]);

  const handleEditorChange = (val) => {
    setCode(val || "");
    if (socket && matchId) {
      socket.emit("opponentStatus", { matchId, status: "Typing..." });
    }
  };

  const handleRunTests = () => {
    if (isRunningTests || !socket) return;
    setIsRunningTests(true);
    socket.emit("runCode", {
      code,
      language: selectedLanguage,
      stdin: problem ? problem.sampleInput : "",
      expectedOutput: problem ? problem.sampleOutput : ""
    });
  };

  const handleSubmitCode = () => {
    if (isSubmitting || !socket) return;
    setIsSubmitting(true);
    socket.emit("submitCode", {
      matchId,
      code,
      language: selectedLanguage,
      token: localStorage.getItem("codearena_token")
    });
  };

  const handleInviteFriend = async (friendUsername) => {
    const token = localStorage.getItem("codearena_token");
    if (!token) return;

    try {
      const res = await fetch("http://localhost:5001/api/room/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ roomCode: matchId, friendUsername })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.action === "cancelled") {
          setTerminalOutput(prev => [
            ...prev,
            { name: "SYSTEM STATUS", status: `INVITATION CANCELLED FOR ${friendUsername.toUpperCase()}`, color: "text-yellow-400" }
          ]);
          showLobbyToast(`Invitation to ${friendUsername} cancelled.`, "success");
        } else {
          setTerminalOutput(prev => [
            ...prev,
            { name: "SYSTEM STATUS", status: `INVITATION TRANSMITTED TO ${friendUsername.toUpperCase()}`, color: "text-secondary" }
          ]);
          showLobbyToast(`Invitation sent to ${friendUsername}!`, "success");
        }
      } else {
        showLobbyToast(data.message || "Failed to handle invitation.", "error");
      }
    } catch (err) {
      console.error("Failed to invite friend", err);
      showLobbyToast("Failed to transmit invite protocol.", "error");
    }
  };

  const showLobbyToast = (message, type = "success") => {
    setLobbyToast({ message, type });
    setTimeout(() => {
      setLobbyToast(null);
    }, 4000);
  };

  const handleToggleReady = () => {
    if (!socket || !matchId) return;
    socket.emit("toggleReady", { roomCode: matchId });
  };

  const handleSettingChange = (difficulty, language, spectators) => {
    if (!socket || !matchId) return;
    socket.emit("updateLobbySettings", {
      roomCode: matchId,
      difficulty: difficulty !== undefined ? difficulty : selectedDifficulty,
      language: language !== undefined ? language : selectedLanguage,
      spectatorsAllowed: spectators !== undefined ? spectators : spectatorsAllowed
    });
  };

  const handleSendChatMessage = (e) => {
    if (e) e.preventDefault();
    if (!socket || !matchId || !chatInput.trim()) return;
    socket.emit("chatMessage", { roomCode: matchId, text: chatInput });
    setChatInput("");
  };

  const handleLeaveRoom = () => {
    console.log("[LOBBY DEBUG] handleLeaveRoom called. Socket connected:", socket?.connected, "Socket ID:", socket?.id, "Room Code:", matchId);
    if (socket && matchId) {
      socket.emit("leaveRoom", { roomCode: matchId });
      console.log("[LOBBY DEBUG] Emitted leaveRoom event for room:", matchId);
    }
    navigate("/dashboard");
  };

  if (roomError) {
    return (
      <div className="pt-20 min-h-screen relative flex flex-col items-center justify-center bg-background text-white font-mono text-xs">
        <BackgroundShader />
        <div className="text-center space-y-6 relative z-10 p-8 glass-panel border border-error/20 bg-error/5 max-w-md rounded-xl">
          <h2 className="text-xl font-bold text-error font-display-lg uppercase tracking-wider">LOBBY NOT FOUND</h2>
          <p className="text-on-surface-variant leading-relaxed text-[11px]">
            {roomError} Please verify the code or request a new invitation from the host.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-block px-6 py-3 bg-primary text-on-primary font-bold tracking-widest rounded hover:shadow-[0_0_15px_rgba(221,183,255,0.4)] transition-all uppercase cursor-pointer"
          >
            RETURN TO COMMAND CENTER
          </button>
        </div>
      </div>
    );
  }

  const hostIdStr = hostId ? (hostId._id ? hostId._id.toString() : hostId.toString()) : "";
  const isMeAdmin = hostIdStr === user._id?.toString();

  return (
    <div className="pt-20 min-h-screen relative flex flex-col bg-[#0e0e13] overflow-hidden">
      <BackgroundShader />
      <div className="fixed inset-0 z-[-2] grid-bg opacity-30 pointer-events-none"></div>

      {/* Premium Cyberpunk Toast Notification */}
      {lobbyToast && (
        <div className="fixed top-24 right-6 z-50 animate-fade-in pointer-events-none">
          <div className={`glass-panel p-4 rounded-xl border-l-4 font-mono text-xs text-left shadow-2xl flex items-center gap-3 backdrop-blur-md min-w-[280px] ${
            lobbyToast.type === "success" 
              ? "border-l-secondary bg-secondary/5 border-secondary/20 text-white" 
              : "border-l-error bg-error/5 border-error/20 text-white"
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              lobbyToast.type === "success" ? "bg-secondary/20 text-secondary" : "bg-error/20 text-error"
            }`}>
              <span className="material-symbols-outlined text-sm font-bold">
                {lobbyToast.type === "success" ? "check" : "priority_high"}
              </span>
            </div>
            <div className="flex-grow">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">
                {lobbyToast.type === "success" ? "TRANSMISSION SUCCESS" : "TRANSMISSION ERROR"}
              </span>
              <p className="mt-0.5 text-white font-semibold">{lobbyToast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* 1. Countdown Overlay */}
      {showCountdown && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in font-mono select-none">
          <div className="w-full max-w-4xl px-6 flex flex-col items-center space-y-8">
            <div className="text-center">
              <span className="text-xs text-secondary tracking-[0.4em] uppercase block mb-2 animate-pulse">MATCH CONNECTED - ENGAGING ARENA</span>
              <h2 className="text-xl font-bold text-white tracking-widest uppercase">TACTICAL ENCOUNTER</h2>
            </div>

            {/* Players VS Layout */}
            <div className="w-full flex items-center justify-between gap-8 py-8 border-y border-white/5">
              {/* Player 1 */}
              <div className="flex-grow flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 rounded-full border-2 border-primary p-1 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  <img
                    className="w-full h-full rounded-full object-cover bg-surface"
                    src={participants[0]?.avatarUrl || user.avatarUrl}
                    alt="Player 1"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display-lg">{participants[0]?.username || "WAITING..."}</h3>
                  <span className="text-xs text-primary">{participants[0]?.elo || user.elo} RP</span>
                </div>
              </div>

              {/* VS Indicator & Countdown */}
              <div className="flex flex-col items-center justify-center space-y-2">
                <span className="font-display-lg text-4xl font-black italic text-primary animate-pulse drop-shadow-[0_0_10px_#a4e6ff]">VS</span>
                <div className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary drop-shadow-[0_0_30px_rgba(221,183,255,0.8)] scale-110 transition-all duration-300">
                  {countdownVal}
                </div>
              </div>

              {/* Player 2 */}
              <div className="flex-grow flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 rounded-full border-2 border-secondary p-1 shadow-[0_0_20px_rgba(76,215,246,0.4)]">
                  <img
                    className="w-full h-full rounded-full object-cover bg-surface"
                    src={participants[1]?.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=Aryan_99"}
                    alt="Player 2"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display-lg">{participants[1]?.username || "FINDING..."}</h3>
                  <span className="text-xs text-secondary">{participants[1]?.elo || 1200} RP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1.5 Matchmaking connecting state */}
      {roomType === "matchmaking" && !battleStarted && !showCountdown && (
        <div className="fixed inset-0 bg-background flex flex-col items-center justify-center font-mono z-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">LOADING ARENA CONTROLLER...</p>
        </div>
      )}

      {/* 2. Room Esports Lobby View */}
      {isCustomRoom && roomType !== "matchmaking" && !battleStarted && (
        <div className="flex-1 flex flex-col w-full px-4 md:px-12 py-6 relative z-10 max-h-[85vh] overflow-hidden select-none">
          {/* Responsive Layout Grid */}
          <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden h-full">
            
            {/* ========================================== */}
            {/* DESKTOP VIEW: Left Lobby List (3 Columns) */}
            {/* ========================================== */}
            <section className="hidden md:flex col-span-3 flex-col gap-4 overflow-hidden h-full text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="font-headline-md text-base text-primary flex items-center gap-2 tracking-wide font-semibold">
                  <span className="material-symbols-outlined text-lg">groups</span>
                  LOBBY OPERATORS
                </h3>
                <span className="font-code-sm text-xs text-on-surface-variant font-semibold">
                  {participants.length} / 8
                </span>
              </div>
              
              <div className="flex-grow flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
                {participants.map((p) => {
                  const isHost = p._id.toString() === hostIdStr;
                  const isSelected = selectedOpponent && (selectedOpponent._id ? selectedOpponent._id.toString() : selectedOpponent.toString()) === p._id.toString();
                  const isReady = readyUsers.some(id => (id._id ? id._id.toString() : id.toString()) === p._id.toString());
                  const isOnline = p.status === "online";
                  
                  return (
                    <div 
                      key={p._id}
                      className={`glass-panel p-3.5 rounded-xl border-l-4 transition-all hover:border-l-primary/70 ${
                        isHost ? "border-l-primary bg-primary/5" : isSelected ? "border-l-secondary bg-secondary/5 shadow-[0_0_12px_rgba(76,215,246,0.08)]" : "border-l-outline-variant bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img className="w-10 h-10 rounded-lg object-cover bg-surface border border-white/10" src={p.avatarUrl} alt="Avatar" />
                          {isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-surface-container-lowest animate-pulse"></div>
                          )}
                        </div>
                        <div className="flex-grow min-w-0 font-mono text-left">
                          <div className="flex justify-between items-center gap-1">
                            <p className="font-bold text-sm text-white truncate">{p.username}</p>
                            {isHost ? (
                              <span className="bg-primary/25 text-primary text-[8px] font-bold px-1.5 py-0.5 rounded border border-primary/20">HOST</span>
                            ) : isSelected ? (
                              <span className="bg-secondary/25 text-secondary text-[8px] font-bold px-1.5 py-0.5 rounded border border-secondary/20">DUELIST</span>
                            ) : null}
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[9px] text-on-surface-variant uppercase font-semibold">ELO: {p.elo} RP</span>
                            <span className={`text-[9px] font-extrabold uppercase ${isHost || isReady ? "text-tertiary" : "text-outline"}`}>
                              {isHost ? "READY" : isReady ? "READY" : "WAITING"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Admin Host controls */}
                      {isMeAdmin && !isHost && (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-white/5 font-mono">
                          <button
                            onClick={() => {
                              socket.emit("selectOpponent", {
                                roomCode: matchId,
                                opponentId: isSelected ? null : p._id
                              });
                            }}
                            className={`flex-1 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${
                              isSelected 
                                ? "bg-secondary text-on-secondary hover:brightness-110" 
                                : "border border-secondary/50 text-secondary hover:bg-secondary/15"
                            }`}
                          >
                            {isSelected ? "DUELIST ✓" : "SELECT DUELIST"}
                          </button>
                          <button
                            onClick={() => {
                              socket.emit("removeUser", {
                                roomCode: matchId,
                                userIdToRemove: p._id
                              });
                            }}
                            className="px-3 py-1 border border-error/50 text-error hover:bg-error/15 rounded text-[9px] font-bold transition-all cursor-pointer"
                          >
                            KICK
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick Invite List */}
              <div className="glass-panel p-4 rounded-xl border border-white/10 shrink-0 font-mono text-xs">
                <h4 className="text-[9px] font-bold text-primary uppercase border-b border-white/5 pb-1.5 mb-2.5">QUICK INVITE</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                  {user.friends.length === 0 ? (
                    <div className="text-[9px] text-on-surface-variant/40 text-center py-4">NO CONNECTED FRIENDS</div>
                  ) : (
                    [...user.friends]
                      .sort((a, b) => {
                        if (a.status === "online" && b.status !== "online") return -1;
                        if (a.status !== "online" && b.status === "online") return 1;
                        return b.elo - a.elo;
                      })
                      .map(f => {
                        const isOnline = f.status === "online";
                        const isAlreadyInRoom = participants.some(p => p.username === f.username);
                        return (
                          <div key={f.username} className="flex justify-between items-center text-[10px] py-1 border-b border-white/5 last:border-0">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-400 animate-pulse" : "bg-neutral-500"}`}></span>
                              {f.username}
                            </span>
                            {isAlreadyInRoom ? (
                              <span className="text-[8px] text-on-surface-variant/45 font-bold uppercase tracking-wider">LOBBY ✓</span>
                            ) : invitedUsers.some(u => (u._id ? u._id.toString() : u.toString()) === f._id.toString()) ? (
                              <button
                                onClick={() => handleInviteFriend(f.username)}
                                className="px-2 py-0.5 border border-error/50 hover:bg-error/15 text-error font-bold rounded text-[8px] transition-colors cursor-pointer"
                              >
                                CANCEL
                              </button>
                            ) : (
                              <button
                                onClick={() => handleInviteFriend(f.username)}
                                className="px-2 py-0.5 bg-secondary hover:bg-secondary/80 text-on-secondary font-bold rounded text-[8px] transition-colors cursor-pointer"
                              >
                                INVITE
                              </button>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </section>

            {/* ========================================== */}
            {/* DESKTOP VIEW: Center Cinematic VS (6 Columns) */}
            {/* ========================================== */}
            <section className="hidden md:flex col-span-6 flex-col gap-5 overflow-hidden h-full text-left">
              {/* VS Cinematic Arena Display */}
              <div className="relative flex-grow glass-panel rounded-2xl overflow-hidden flex flex-col justify-between border border-white/10 shadow-[0_0_20px_rgba(164,230,255,0.05)] min-h-[350px]">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
                <div className="scanline"></div>
                
                {/* Lobby Room Code Header */}
                <div className="w-full text-center py-4 border-b border-white/5 bg-black/10 z-10">
                  <span className="text-[10px] text-primary tracking-[0.4em] uppercase block font-semibold">TACTICAL COMBAT INTERRUPT</span>
                  <h2 className="text-xl font-bold text-white font-display-lg uppercase tracking-wider mt-1">LOBBY PROTOCOL: <span className="text-primary select-all">{matchId}</span></h2>
                </div>

                <div className="relative z-10 w-full flex items-center justify-around px-8 my-auto">
                  {/* Left Challenger (Host) */}
                  <div className="flex flex-col items-center text-center transform -translate-x-4">
                    <div className="w-32 h-32 rounded-2xl border-4 border-primary shadow-[0_0_20px_rgba(164,230,255,0.3)] overflow-hidden mb-3 relative bg-surface p-0.5">
                      <img className="w-full h-full rounded-xl object-contain" src={participants.find(p => p._id.toString() === hostIdStr)?.avatarUrl || user.avatarUrl} alt="Host Avatar" />
                    </div>
                    <h2 className="font-display-lg text-lg text-primary uppercase font-bold truncate max-w-[150px]">
                      {participants.find(p => p._id.toString() === hostIdStr)?.username || user.username}
                    </h2>
                    <div className="mt-1">
                      <p className="font-code-sm text-[11px] text-tertiary">HOST ✓</p>
                      <p className="font-code-sm text-[11px] text-on-surface-variant">ELO: {participants.find(p => p._id.toString() === hostIdStr)?.elo || user.elo} RP</p>
                    </div>
                  </div>

                  {/* VS Emblem */}
                  <div className="relative flex flex-col items-center">
                    <div className="text-8xl font-display-lg font-black italic text-primary/10 select-none drop-shadow-[0_0_10px_rgba(164,230,255,0.05)]">VS</div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-[0_0_20px_#a4e6ff] animate-pulse">
                        <span className="material-symbols-outlined text-xl font-bold">bolt</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Challenger (Selected Opponent or Searching) */}
                  <div className="flex flex-col items-center text-center transform translate-x-4">
                    <div className={`w-32 h-32 rounded-2xl border-4 overflow-hidden mb-3 relative bg-surface p-0.5 ${
                      selectedOpponent ? "border-secondary shadow-[0_0_20px_rgba(235,178,255,0.3)]" : "border-outline-variant border-dashed animate-pulse"
                    }`}>
                      {selectedOpponent ? (
                        <img className="w-full h-full rounded-xl object-contain" src={selectedOpponent.avatarUrl} alt="Opponent Avatar" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-on-surface/30 font-display-lg text-3xl">?</span>
                        </div>
                      )}
                    </div>
                    <h2 className={`font-display-lg text-lg uppercase font-bold truncate max-w-[150px] ${selectedOpponent ? "text-secondary" : "text-outline-variant"}`}>
                      {selectedOpponent ? selectedOpponent.username : "SELECT DUELIST"}
                    </h2>
                    <div className="mt-1 font-mono">
                      {selectedOpponent ? (
                        <>
                          <p className={`text-[11px] font-extrabold ${readyUsers.some(id => (id._id ? id._id.toString() : id.toString()) === (selectedOpponent._id || selectedOpponent).toString()) ? "text-tertiary" : "text-error"}`}>
                            {readyUsers.some(id => (id._id ? id._id.toString() : id.toString()) === (selectedOpponent._id || selectedOpponent).toString()) ? "READY ✓" : "NOT READY ⏳"}
                          </p>
                          <p className="text-[11px] text-on-surface-variant">ELO: {selectedOpponent.elo} RP</p>
                        </>
                      ) : (
                        <p className="text-[11px] text-outline-variant">AWAITING SELECTION</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arena Stats Bar */}
                <div className="w-full bg-primary/10 border-t border-primary/20 flex divide-x divide-primary/20 z-10 text-center font-mono">
                  <div className="flex-1 py-2.5">
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">Prize Pool</p>
                    <p className="text-sm font-semibold text-tertiary">5,000 CR</p>
                  </div>
                  <div className="flex-1 py-2.5">
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">Match Type</p>
                    <p className="text-sm font-semibold text-primary">1V1 CUSTOM</p>
                  </div>
                  <div className="flex-1 py-2.5">
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">Spectators</p>
                    <p className="text-sm font-semibold text-white">{spectatorsAllowed ? "ALLOWED" : "MUTED"}</p>
                  </div>
                </div>
              </div>

              {/* Lobby Configuration Controls */}
              <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 border border-white/10 shrink-0">
                <div className="grid grid-cols-2 gap-4">
                  {/* Difficulty Settings */}
                  <div>
                    <label className="text-[9px] text-on-surface-variant font-bold block uppercase mb-1.5 tracking-wider font-mono">DIFFICULTY PROTOCOL</label>
                    <div className="flex gap-1 bg-surface-container-lowest p-1 rounded-lg border border-white/5">
                      {["Easy", "Medium", "Hard"].map((diff) => (
                        <button
                          key={diff}
                          onClick={() => handleSettingChange(diff, undefined, undefined)}
                          disabled={!isMeAdmin}
                          className={`flex-1 py-2 font-mono text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            selectedDifficulty === diff 
                              ? "bg-primary text-on-primary shadow-[0_0_10px_rgba(164,230,255,0.25)]" 
                              : "text-on-surface-variant hover:text-white"
                          }`}
                        >
                          {diff.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language Settings */}
                  <div className="font-mono">
                    <label className="text-[9px] text-on-surface-variant font-bold block uppercase mb-1.5 tracking-wider">LANGUAGE COMPILES</label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => handleSettingChange(undefined, e.target.value, undefined)}
                      disabled={!isMeAdmin}
                      className="w-full bg-surface-container-lowest border border-white/5 px-3 py-2 rounded-lg text-white text-xs focus:outline-none focus:border-primary font-bold cursor-pointer disabled:opacity-75"
                    >
                      <option>JAVASCRIPT (ES6)</option>
                      <option>PYTHON 3.11</option>
                      <option>RUST 1.70</option>
                      <option>C++ 20</option>
                    </select>
                  </div>
                </div>

                {/* Spectators and Admin options */}
                {isMeAdmin && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 font-mono text-xs text-on-surface-variant">
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      ALLOW SPECTATORS TO WATCH
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSettingChange(undefined, undefined, true)}
                        className={`px-3 py-1 rounded font-bold text-[10px] ${
                          spectatorsAllowed 
                            ? "bg-primary/20 border border-primary/40 text-primary" 
                            : "border border-white/10 text-on-surface-variant hover:border-white/20"
                        }`}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleSettingChange(undefined, undefined, false)}
                        className={`px-3 py-1 rounded font-bold text-[10px] ${
                          !spectatorsAllowed 
                            ? "bg-error/20 border border-error/40 text-error" 
                            : "border border-white/10 text-on-surface-variant hover:border-white/20"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ========================================== */}
            {/* DESKTOP VIEW: Right Comms Chat (3 Columns) */}
            {/* ========================================== */}
            <section className="hidden md:flex col-span-3 flex-col gap-4 overflow-hidden h-full text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="font-headline-md text-base text-primary flex items-center gap-2 tracking-wide font-semibold">
                  <span className="material-symbols-outlined text-lg">forum</span>
                  COMMS CHANNEL
                </h3>
              </div>

              {/* Chat Panel Box */}
              <div className="flex-grow glass-panel rounded-2xl flex flex-col overflow-hidden border border-white/10 bg-black/10">
                {/* Chat Feed */}
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4 font-mono text-xs">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-on-surface-variant/40">
                      <span className="material-symbols-outlined text-3xl animate-pulse">forum</span>
                      <p className="mt-2 text-[10px] uppercase tracking-wider">NO TRANSMISSIONS LOGGED</p>
                      <p className="text-[9px] mt-1">Lobby chat is active. Coordinate with your opponent.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => {
                      const isMe = msg.username === user.username;
                      return (
                        <div key={idx} className={`flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                          <span className={`text-[9px] font-bold uppercase ${isMe ? "text-secondary" : "text-primary"}`}>
                            {msg.username}
                          </span>
                          <p className={`text-[11px] p-2 rounded-lg inline-block text-left max-w-[90%] leading-relaxed ${
                            isMe ? "bg-primary/10 text-white rounded-tr-none border border-primary/20" : "bg-white/5 text-on-surface rounded-tl-none border border-white/10"
                          }`}>
                            {msg.text}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input form */}
                <form onSubmit={handleSendChatMessage} className="p-3 bg-surface-container-low/40 border-t border-white/10 flex gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Send a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-transparent border-none text-xs focus:ring-0 placeholder:text-on-surface-variant/30 text-white font-mono"
                  />
                  <button type="submit" className="w-8 h-8 bg-primary text-on-primary rounded-lg flex items-center justify-center hover:bg-primary-container transition-all cursor-pointer shrink-0">
                    <span className="material-symbols-outlined text-base font-bold">send</span>
                  </button>
                </form>
              </div>
            </section>

            {/* ========================================== */}
            {/* MOBILE RESPONSIVE VIEW (Conditional Render) */}
            {/* ========================================== */}
            <section className="flex md:hidden col-span-12 flex-col gap-5 overflow-y-auto custom-scrollbar h-full w-full pb-4 shrink-0 text-left">
              {/* VS Card */}
              <div className="glass-card neon-border rounded-xl p-4 flex flex-col items-center justify-between relative overflow-hidden min-h-[180px]">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
                <div className="flex w-full justify-between items-center z-10">
                  {/* Host User */}
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-primary p-0.5 bracket relative">
                        <img className="w-full h-full rounded-full object-cover bg-surface" src={participants.find(p => p._id.toString() === hostIdStr)?.avatarUrl || user.avatarUrl} alt="Host" />
                      </div>
                    </div>
                    <div className="text-center font-mono">
                      <p className="text-xs font-bold text-white truncate max-w-[80px]">{participants.find(p => p._id.toString() === hostIdStr)?.username || user.username}</p>
                      <p className="text-[9px] text-primary">HOST</p>
                    </div>
                  </div>

                  {/* VS Indicator */}
                  <div className="flex flex-col items-center justify-center px-2">
                    <span className="font-display-lg text-lg font-black italic text-primary drop-shadow-[0_0_10px_#a4e6ff]">VS</span>
                  </div>

                  {/* Opponent User */}
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full border-2 p-0.5 bracket relative ${selectedOpponent ? "border-secondary" : "border-outline border-dashed animate-pulse"}`}>
                        {selectedOpponent ? (
                          <img className="w-full h-full rounded-full object-cover bg-surface" src={selectedOpponent.avatarUrl} alt="Opponent" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-on-surface/40">?</div>
                        )}
                      </div>
                    </div>
                    <div className="text-center font-mono">
                      <p className={`text-xs font-bold truncate max-w-[80px] ${selectedOpponent ? "text-white" : "text-outline-variant"}`}>
                        {selectedOpponent ? selectedOpponent.username : "SELECTING..."}
                      </p>
                      {selectedOpponent ? (
                        <p className={`text-[9px] font-extrabold ${readyUsers.some(id => (id._id ? id._id.toString() : id.toString()) === (selectedOpponent._id || selectedOpponent).toString()) ? "text-tertiary" : "text-error"}`}>
                          {readyUsers.some(id => (id._id ? id._id.toString() : id.toString()) === (selectedOpponent._id || selectedOpponent).toString()) ? "READY" : "NOT READY"}
                        </p>
                      ) : (
                        <p className="text-[9px] text-outline-variant">DUELIST</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-full mt-3 border-t border-white/5 pt-3 z-10 flex justify-around text-center font-mono text-[9px] text-on-surface-variant">
                  <div>
                    <span className="block uppercase font-bold">DIFF</span>
                    <span className="text-primary font-bold">{selectedDifficulty.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="block uppercase font-bold">LANG</span>
                    <span className="text-secondary font-bold">{selectedLanguage.split(" ")[0]}</span>
                  </div>
                  <div>
                    <span className="block uppercase font-bold">ROOM CODE</span>
                    <span className="text-tertiary select-all font-bold">{matchId}</span>
                  </div>
                </div>
              </div>

              {/* Connected operators horizontal scroll */}
              <div className="flex flex-col gap-2 font-mono">
                <div className="flex justify-between items-center px-1 text-[10px] text-on-surface-variant">
                  <span className="font-bold uppercase tracking-wider text-primary">OPERATORS IN LOBBY ({participants.length})</span>
                  <span>SPECTATORS MUTE: {!spectatorsAllowed ? "YES" : "NO"}</span>
                </div>
                
                <div className="flex gap-3 overflow-x-auto pb-1.5 custom-scrollbar">
                  {participants.map((p) => {
                    const isHost = p._id.toString() === hostIdStr;
                    const isSelected = selectedOpponent && (selectedOpponent._id ? selectedOpponent._id.toString() : selectedOpponent.toString()) === p._id.toString();
                    const isReady = readyUsers.some(id => (id._id ? id._id.toString() : id.toString()) === p._id.toString());
                    
                    return (
                      <div key={p._id} className="flex flex-col items-center gap-1 shrink-0 bg-white/5 border border-white/5 p-2 rounded-xl min-w-[75px] relative">
                        <img className="w-9 h-9 rounded-lg object-cover bg-surface border border-white/10" src={p.avatarUrl} alt="Player" />
                        <span className="text-[9px] text-white font-bold truncate max-w-[65px]">{p.username}</span>
                        <span className={`text-[8px] font-extrabold uppercase ${isHost || isReady ? "text-tertiary" : "text-outline"}`}>
                          {isHost ? "READY" : isReady ? "READY" : "WAITING"}
                        </span>

                        {/* Mobile quick actions for admin */}
                        {isMeAdmin && !isHost && (
                          <div className="flex gap-1 mt-1">
                            <button
                              onClick={() => {
                                socket.emit("selectOpponent", {
                                  roomCode: matchId,
                                  opponentId: isSelected ? null : p._id
                                });
                              }}
                              className={`px-1 py-0.5 rounded text-[7px] font-bold transition-all cursor-pointer ${
                                isSelected ? "bg-secondary text-on-secondary" : "border border-secondary/50 text-secondary"
                              }`}
                            >
                              {isSelected ? "YES" : "DUEL"}
                            </button>
                            <button
                              onClick={() => {
                                socket.emit("removeUser", {
                                  roomCode: matchId,
                                  userIdToRemove: p._id
                                });
                              }}
                              className="px-1 py-0.5 border border-error/50 text-error rounded text-[7px] font-bold transition-all cursor-pointer"
                            >
                              KICK
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile settings editor for host */}
              {isMeAdmin && (
                <div className="glass-panel p-4 rounded-xl flex flex-col gap-3 font-mono text-xs border border-white/5">
                  <h4 className="text-[9px] font-bold text-primary uppercase border-b border-white/5 pb-1">ADMIN SETTINGS</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[8px] text-on-surface-variant block mb-1">DIFFICULTY</span>
                      <select
                        value={selectedDifficulty}
                        onChange={(e) => handleSettingChange(e.target.value, undefined, undefined)}
                        className="w-full bg-surface-container border border-white/10 px-2 py-1 rounded text-white text-[10px] focus:outline-none"
                      >
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[8px] text-on-surface-variant block mb-1">SPECTATORS</span>
                      <select
                        value={spectatorsAllowed ? "true" : "false"}
                        onChange={(e) => handleSettingChange(undefined, undefined, e.target.value === "true")}
                        className="w-full bg-surface-container border border-white/10 px-2 py-1 rounded text-white text-[10px] focus:outline-none"
                      >
                        <option value="true">Allowed</option>
                        <option value="false">Kick/Mute</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat COMMS Panel Mobile */}
              <div className="glass-panel rounded-xl flex flex-col h-40 overflow-hidden border border-white/5">
                <div className="flex-grow p-3 overflow-y-auto custom-scrollbar space-y-2 font-mono text-[10px]">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-on-surface-variant/40">
                      <p className="text-[9px] uppercase tracking-wider">NO MESSAGES LOGGED</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => {
                      const isMe = msg.username === user.username;
                      return (
                        <div key={idx} className={`flex gap-1.5 ${isMe ? "justify-end text-right" : "justify-start text-left"}`}>
                          <div className="max-w-[85%] text-left">
                            <span className={`text-[8px] font-bold block ${isMe ? "text-secondary" : "text-primary"}`}>{msg.username}</span>
                            <span className={`inline-block p-1.5 rounded-lg mt-0.5 text-[10px] ${
                              isMe ? "bg-primary/15 text-white rounded-tr-none" : "bg-white/5 text-on-surface rounded-tl-none"
                            }`}>{msg.text}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <form onSubmit={handleSendChatMessage} className="p-2 bg-surface-container border-t border-white/5 flex gap-1 shrink-0">
                  <input
                    type="text"
                    placeholder="Comms..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-grow bg-transparent border-none text-[10px] focus:ring-0 placeholder:text-on-surface-variant/40 text-white font-mono p-1"
                  />
                  <button type="submit" className="w-7 h-7 bg-primary text-on-primary rounded flex items-center justify-center hover:bg-primary-container transition-all cursor-pointer">
                    <span className="material-symbols-outlined text-xs font-bold">send</span>
                  </button>
                </form>
              </div>

              {/* Quick info logs */}
              <div className="glass-panel p-3 rounded-xl border border-white/5 shrink-0 bg-surface-container-lowest font-mono text-[9px] text-on-surface-variant/40 text-left select-all leading-normal">
                INVITE LINK: codearena.dev/room/{matchId}
              </div>
            </section>
          </div>

          {/* ========================================== */}
          {/* BOTTOM GLOBAL ACTION BAR (FOOTER CONTROLS) */}
          {/* ========================================== */}
          <footer className="w-full bg-surface-container-lowest/80 border border-white/10 py-3.5 px-4 md:px-8 mt-4 rounded-xl flex items-center justify-between shrink-0 font-mono shadow-[0_-4px_2px_rgba(0,0,0,0.15)] z-20">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleLeaveRoom}
                className="flex items-center gap-1.5 text-on-surface-variant hover:text-error transition-colors font-bold text-[10px] tracking-wider cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm font-semibold">logout</span>
                LEAVE ROOM
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Ready/Start Buttons */}
              {!isMeAdmin ? (
                // Guest ready toggle
                <button
                  onClick={handleToggleReady}
                  className={`px-8 py-3.5 rounded-lg font-bold text-xs tracking-widest cursor-pointer transition-all active:scale-95 ${
                    readyUsers.some(id => (id._id ? id._id.toString() : id.toString()) === user._id.toString())
                      ? "bg-tertiary text-on-tertiary shadow-[0_0_15px_rgba(0,248,203,0.35)]"
                      : "border border-primary text-primary hover:bg-primary/10 shadow-[0_0_10px_rgba(164,230,255,0.1)]"
                  }`}
                >
                  {readyUsers.some(id => (id._id ? id._id.toString() : id.toString()) === user._id.toString()) ? "READY ✓" : "READY LOBBY"}
                </button>
              ) : (
                // Host Start Battle
                <button
                  onClick={() => socket.emit("startMatch", { roomCode: matchId })}
                  disabled={
                    !selectedOpponent || 
                    !readyUsers.some(id => (id._id ? id._id.toString() : id.toString()) === (selectedOpponent._id || selectedOpponent).toString())
                  }
                  className="px-10 py-3.5 bg-gradient-to-r from-primary to-secondary text-on-primary font-bold text-xs tracking-[0.2em] rounded-lg shadow-[0_0_20px_rgba(164,230,255,0.25)] hover:shadow-[0_0_30px_rgba(164,230,255,0.4)] disabled:opacity-40 disabled:shadow-none hover:scale-102 active:scale-98 transition-all uppercase cursor-pointer"
                >
                  START MATCH
                </button>
              )}
            </div>
          </footer>
        </div>
      )}

      {/* 3. Active Battle Arena */}
      {battleStarted && (
        <div className="flex flex-1 flex-col max-w-[1440px] w-full mx-auto relative z-10 overflow-hidden">
          
          {/* Battle HUD */}
          <div className="w-full glass-panel p-4 flex items-center justify-between gap-6 shrink-0 border-x-0 border-t-0 text-left">
            
            {/* Player A (User) */}
            <div className="flex-1 flex items-center gap-4">
              <div className="relative w-12 h-12 rounded border border-primary/50 overflow-hidden bg-surface-container shrink-0 shadow-[0_0_15px_rgba(221,183,255,0.4)] p-0.5">
                <img
                  className="w-full h-full object-contain"
                  src={user.avatarUrl}
                  alt="Player A Avatar"
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-end text-[10px] font-mono">
                  <span className="text-primary font-bold">{user.username.toUpperCase()} (YOU)</span>
                  <span className="text-primary">{userProgress}% COMPLETE</span>
                </div>
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-primary" style={{ width: `${userProgress}%` }}></div>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-green-400"><CheckCircle2 className="w-3.5 h-3.5 fill-current text-[#0e0e13]" /></span>
                  <span className="text-green-400"><CheckCircle2 className="w-3.5 h-3.5 fill-current text-[#0e0e13]" /></span>
                  <span className="text-on-surface-variant/40"><CheckCircle2 className="w-3.5 h-3.5 text-on-surface-variant/40" /></span>
                  <span className="text-on-surface-variant/40"><CheckCircle2 className="w-3.5 h-3.5 text-on-surface-variant/40" /></span>
                </div>
              </div>
            </div>

            {/* Timer Card */}
            <div className="flex flex-col items-center justify-center bg-surface-container-high px-8 py-2 rounded-xl border border-white/10 shrink-0 font-mono shadow-inner text-center">
              <span className="text-[8px] text-on-surface-variant tracking-[0.2em] font-bold">REMAINING</span>
              <span className="text-3xl text-white leading-none font-extrabold mt-1">
                {timeLeft > 0 ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}` : "00:00"}
              </span>
            </div>

            {/* Player B (Opponent) */}
            <div className="flex-1 flex flex-row-reverse items-center gap-4 text-right">
              <div className="relative w-12 h-12 rounded border border-secondary/50 overflow-hidden bg-surface-container shrink-0 shadow-[0_0_15px_rgba(76,215,246,0.4)] p-0.5">
                <img
                  className="w-full h-full object-contain"
                  src={guestUser ? guestUser.avatarUrl : "https://api.dicebear.com/7.x/bottts/svg?seed=Aryan_99"}
                  alt="Player B Avatar"
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex flex-row-reverse justify-between items-end text-[10px] font-mono">
                  <span className="text-secondary font-bold">{guestUser ? guestUser.username.toUpperCase() : "ARYAN_99"}</span>
                  <span className="text-secondary font-bold uppercase">{oppStatus}</span>
                </div>
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-secondary" style={{ width: `${opponentProgress}%` }}></div>
                </div>
                <div className="flex flex-row-reverse gap-1.5">
                  <span className="text-green-400"><CheckCircle2 className="w-3.5 h-3.5 fill-current text-[#0e0e13]" /></span>
                  <span className="text-on-surface-variant/40"><CheckCircle2 className="w-3.5 h-3.5 text-on-surface-variant/40" /></span>
                  <span className="text-on-surface-variant/40"><CheckCircle2 className="w-3.5 h-3.5 text-on-surface-variant/40" /></span>
                  <span className="text-on-surface-variant/40"><CheckCircle2 className="w-3.5 h-3.5 text-on-surface-variant/40" /></span>
                </div>
              </div>
            </div>

          </div>

          {/* Split Editor Arena */}
          <div className="flex-grow flex overflow-hidden min-h-[500px]">
            
            {/* Left panel: Problem Description */}
            <div className="w-1/3 glass-panel h-full flex flex-col border-y-0 border-l-0 shrink-0 text-left">
              <div className="p-4 bg-surface-container-low flex items-center justify-between border-b border-white/5">
                <h2 className="text-sm font-bold font-mono text-white">{problem ? problem.title : "CHALLENGE_042: THE OBSIDIAN KNOT"}</h2>
                <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded-sm font-mono text-[9px] border border-red-500/20 font-bold">
                  {(problem ? problem.difficulty : selectedDifficulty).toUpperCase()}
                </span>
              </div>
              <div className="flex-grow overflow-y-auto p-5 space-y-5 text-sm text-on-surface-variant leading-relaxed">
                <div className="space-y-2">
                  <h3 className="text-white font-bold font-display-lg">Mission Objective</h3>
                  <p className="whitespace-pre-line">
                    {problem ? problem.statement : "Write an algorithm to decrypt the high-frequency packet stream from the Obsidian Terminal. You are given a sequence of encoded integers representing encrypted nodes. The core task is to find the longest palindromic subsequence that can be formed by rearranging the bits of any contiguous subsegment of length K."}
                  </p>
                </div>
                
                <div className="bg-surface-container-lowest p-4 rounded border border-white/5 font-mono text-xs">
                  <p className="font-bold text-white mb-2">Example Case 1:</p>
                  <div className="bg-black/30 p-3 rounded border border-white/5 space-y-1">
                    <p className="text-secondary">Input: {problem ? problem.sampleInput : "[12, 15, 2, 8, 3], K=3"}</p>
                    <p className="text-primary">Output: {problem ? problem.sampleOutput : "7"}</p>
                  </div>
                </div>

                {problem && problem.constraints && (
                  <div className="space-y-2 font-mono text-xs">
                    <p className="text-white font-bold">Constraints:</p>
                    <p className="whitespace-pre-line text-on-surface-variant">{problem.constraints}</p>
                  </div>
                )}

                <div className="p-4 border border-primary/20 bg-primary/5 rounded-lg flex gap-3 text-xs italic">
                  <HelpCircle className="w-5 h-5 text-primary shrink-0" />
                  <p>
                    PRO TIP: Use bit manipulation to track parity. Each set bit in a potential palindrome (except possibly one) must appear an even number of times.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-surface-container-high border-t border-white/5 flex gap-2 font-mono text-[10px] font-bold">
                <button className="flex-grow py-2 border border-white/10 hover:bg-white/5 rounded">HINTS (2)</button>
                <button className="flex-grow py-2 border border-white/10 hover:bg-white/5 rounded">DISCUSSION</button>
              </div>
            </div>

            {/* Right panel: Monaco Editor */}
            <div className="flex-1 h-full flex flex-col relative overflow-hidden bg-[#0d0d12]/50 text-left">
              <div className="p-4 bg-surface-container-low flex items-center justify-between border-b border-white/5 shrink-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded border border-white/10 font-mono text-xs">
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="bg-transparent border-none p-0 text-[11px] font-bold focus:ring-0 focus:outline-none cursor-pointer"
                    >
                      <option className="bg-surface">JAVASCRIPT (ES6)</option>
                      <option className="bg-surface">PYTHON 3.11</option>
                      <option className="bg-surface">RUST 1.70</option>
                      <option className="bg-surface">C++</option>
                      <option className="bg-surface">Java </option>
                      <option className="bg-surface">C </option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 font-mono text-[11px] font-bold">
                  <button
                    onClick={handleRunTests}
                    disabled={isRunningTests}
                    className="px-5 py-2 border border-secondary text-secondary hover:bg-secondary/10 disabled:opacity-50 transition-all rounded cursor-pointer"
                  >
                    {isRunningTests ? "RUNNING..." : "RUN TESTS"}
                  </button>
                  <button
                    onClick={handleSubmitCode}
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary hover:brightness-110 shadow-[0_0_15px_rgba(221,183,255,0.4)] disabled:opacity-50 transition-all rounded flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RotateCw className="w-3.5  h-3.5 animate-spin" /> COMPILING...
                      </>
                    ) : (
                     <span className="text-on-primary">SUBMIT_CODE</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Monaco Container*/}
              <div className="flex-grow w-full relative">
              <div className="scanner-effect absolute inset-x-0 top-0 h-1 z-20 pointer-events-none"></div>
                <Editor
                  height="100%"
                  language={selectedLanguage.includes("PYTHON") ? "python" : selectedLanguage.includes("RUST") ? "rust" : selectedLanguage.includes("C++") ? "cpp" : selectedLanguage.includes("Java") ? "java" : selectedLanguage.includes("C") ? "c": selectedLanguage.includes("C++") ? "c"   : "javascript"}
                  theme="vs-dark"
                  value={code}
                  onChange={handleEditorChange}
                  options={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
                    padding: { top: 16, bottom: 16 },
                  }}
                />
                 {/* Floating Terminal Output*/ }
                <div className="absolute bottom-6 right-6 w-64 glass-panel p-4 border border-primary/20 rounded-xl z-20 font-mono text-[11px]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-on-surface-variant font-bold">TERMINAL_OUTPUT</span>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  </div>
                  <div className="space-y-2 font-bold text-left">
                    {terminalOutput.map((tc, idx) => (
                      <p key={idx} className={`flex justify-between ${tc.color}`}>
                        <span>{tc.name}</span>
                        <span>{tc.status}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Editor Bottom Bar */}
              <div className="h-8 bg-surface-container-highest flex items-center px-4 justify-between border-t border-white/5 font-mono text-[9px] text-on-surface-variant shrink-0">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> SERVER_STABLE
                  </span>
                  <span>LINE 14, COL 28</span>
                  <span>UTF-8</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-secondary font-bold">LATENCY: 14MS</span>
                  <span>FPS: 144</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Footer */}
      <footer className="flex flex-col items-center gap-4 w-full py-8 bg-surface-container-highest/40 border-t border-white/5 z-20 text-center font-mono text-[11px] text-on-surface-variant mt-auto">
        <div className="flex gap-6 opacity-80 justify-center">
          <a className="hover:text-secondary transition-colors" href="#">Privacy Protocol</a>
          <a className="hover:text-secondary transition-colors" href="#">Terms of Engagement</a>
          <a className="hover:text-secondary transition-colors" href="#">API Docs</a>
        </div>
        <p className="opacity-60">© 2026 CODEARENA. SYSTEMS ONLINE.</p>
      </footer>
    </div>
  );
}
