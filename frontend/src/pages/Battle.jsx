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

  // MVP States
  const [battleStarted, setBattleStarted] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownVal, setCountdownVal] = useState(3);
  const [lobbyStatus, setLobbyStatus] = useState("waiting"); // "waiting", "guest_joined"
  const [guestUser, setGuestUser] = useState(null);
  const [oppStatus, setOppStatus] = useState("Awaiting Start...");

  const isCustomRoom = matchId && matchId.startsWith("CA-");

  // Sync lobby/room states on mount
  useEffect(() => {
    if (!socket || !matchId) return;

    // Join battle room
    socket.emit("joinRoom", { matchId, token: localStorage.getItem("codearena_token") });

    // Handle lobby status (for custom invite codes)
    socket.on("lobbyStatusUpdate", (data) => {
      const { status, guest } = data;
      setLobbyStatus(status);
      if (status === "guest_joined" && guest) {
        setGuestUser(guest);
      }
    });

    // Handle battle initiation
    socket.on("battleStarted", (data) => {
      const { problem: serverProblem, player1, player2 } = data;
      setProblem(serverProblem);
      
      const opponent = player1._id === user._id ? player2 : player1;
      setGuestUser(opponent);
      setLobbyStatus("guest_joined");
      
      // Start Countdown
      setShowCountdown(true);
      setCountdownVal(3);
      setTimeout(() => setCountdownVal(2), 700);
      setTimeout(() => setCountdownVal(1), 1400);
      setTimeout(() => setCountdownVal("FIGHT!"), 2100);
      setTimeout(() => {
        setShowCountdown(false);
        setBattleStarted(true);
        setTimeLeft(600); // Reset timer
      }, 2800);
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
      socket.off("lobbyStatusUpdate");
      socket.off("battleStarted");
      socket.off("opponentStatus");
      socket.off("runResult");
      socket.off("submissionResult");
      socket.off("opponentDisconnected");
      socket.off("opponentReconnected");
      socket.off("battleEnded");
    };
  }, [socket, matchId, user._id, navigate]);

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

  // Keystrokes typing status emission helper
  const handleEditorChange = (val) => {
    setCode(val || "");
    if (socket && matchId) {
      socket.emit("opponentStatus", { matchId, status: "Typing..." });
    }
  };

  const handleStartBattle = () => {
    // If hosts clicks explicitly start on custom invite code
    if (socket && matchId) {
      socket.emit("opponentStatus", { matchId, status: "Typing..." });
    }
    setShowCountdown(true);
    setCountdownVal(3);
    
    setTimeout(() => setCountdownVal(2), 700);
    setTimeout(() => setCountdownVal(1), 1400);
    setTimeout(() => setCountdownVal("FIGHT!"), 2100);
    setTimeout(() => {
      setShowCountdown(false);
      setBattleStarted(true);
      setTimeLeft(600);
    }, 2800);
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

  const initialCode = `// Problem solver template
const decryptStream = (stream, k) => {
    // Write your high-performance code below:
    
    return 0;
};
`;

  const [code, setCode] = useState(initialCode);

  return (
    <div className="pt-20 min-h-screen relative flex flex-col bg-[#0e0e13] overflow-hidden">
      <BackgroundShader />
      <div className="fixed inset-0 z-[-2] grid-bg opacity-30 pointer-events-none"></div>

      {/* 1. Countdown Overlay */}
      {showCountdown && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center animate-fade-in font-display-lg select-none">
          <div className="text-center space-y-4">
            <span className="text-xs text-secondary font-mono tracking-[0.4em] uppercase block mb-2">ENGAGING TACTICAL CORE</span>
            <div className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary drop-shadow-[0_0_50px_rgba(221,183,255,0.8)] scale-110 transition-all duration-300">
              {countdownVal}
            </div>
          </div>
        </div>
      )}

      {/* 2. Room Lobby View */}
      {isCustomRoom && !battleStarted && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto px-6 py-10 relative z-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white font-display-lg uppercase tracking-wider mb-2 text-center">
            ROOM LOBBY: <span className="text-primary">{matchId}</span>
          </h1>
          <p className="text-xs text-on-surface-variant font-mono mb-10 tracking-widest uppercase text-center">CA-ROOM Invitation Lobby Protocol</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* Connected players list */}
            <div className="glass-panel p-6 rounded-xl flex flex-col justify-between border border-white/10 min-h-[320px] text-left">
              <div>
                <h3 className="text-xs font-bold text-secondary font-mono tracking-wider border-b border-white/5 pb-2 mb-6 uppercase">CONNECTED_OPERATORS</h3>
                <div className="space-y-4">
                  {/* Host */}
                  <div className="flex items-center gap-4 bg-primary/5 p-4 rounded border border-primary/20">
                    <div className="w-12 h-12 rounded border border-primary/50 bg-surface overflow-hidden p-0.5 shadow-[0_0_10px_rgba(221,183,255,0.3)] shrink-0">
                      <img src={user.avatarUrl} alt="Host Avatar" className="w-full h-full object-contain" />
                    </div>
                    <div className="text-left font-mono">
                      <p className="text-[10px] text-primary font-bold uppercase">HOST (YOU)</p>
                      <p className="text-sm font-bold text-white leading-none mt-1">{user.username}</p>
                      <p className="text-[9px] text-on-surface-variant mt-1.5 font-bold">MMR: {user.elo} RP</p>
                    </div>
                    <span className="ml-auto text-green-400 font-bold font-mono text-[10px] bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded tracking-wide">
                      READY ✓
                    </span>
                  </div>
                  
                  {/* Guest slot */}
                  {lobbyStatus === "waiting" ? (
                    <div className="flex items-center justify-center p-8 border border-white/5 border-dashed rounded min-h-[82px] animate-pulse">
                      <div className="text-center font-mono space-y-1">
                        <span className="text-[10px] text-on-surface-variant tracking-wider">AWAITING OPPONENT...</span>
                        <span className="block text-[8px] text-secondary">SIMULATING INVITATION TO ARYAN_99</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 bg-secondary/5 p-4 rounded border border-secondary/20 animate-fade-in">
                      <div className="w-12 h-12 rounded border border-secondary/50 bg-surface overflow-hidden p-0.5 shadow-[0_0_10px_rgba(76,215,246,0.3)] shrink-0">
                        <img src={guestUser.avatarUrl} alt="Guest Avatar" className="w-full h-full object-contain" />
                      </div>
                      <div className="text-left font-mono">
                        <p className="text-[10px] text-secondary font-bold uppercase">GUEST</p>
                        <p className="text-sm font-bold text-white leading-none mt-1">{guestUser.username}</p>
                        <p className="text-[9px] text-on-surface-variant mt-1.5 font-bold">MMR: {guestUser.elo} RP</p>
                      </div>
                      <span className="ml-auto text-green-400 font-bold font-mono text-[10px] bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded tracking-wide">
                        READY ✓
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] font-mono text-on-surface-variant/40 mt-6 leading-relaxed">
                Invite Link: <span className="text-secondary select-all font-bold">codearena.dev/room/{matchId}</span>
              </div>
            </div>
            
            {/* Settings Card */}
            <div className="glass-panel p-6 rounded-xl flex flex-col justify-between border border-white/10 text-left">
              <div className="space-y-5">
                <h3 className="text-xs font-bold text-primary font-mono tracking-wider border-b border-white/5 pb-2 uppercase">LOBBY_CONFIGS</h3>
                
                {/* Difficulty selection */}
                <div className="font-mono">
                  <label className="text-[9px] text-on-surface-variant font-bold block uppercase mb-1.5">DIFFICULTY PROTOCOL</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full bg-surface-container border border-white/10 px-3 py-2 rounded text-white text-xs focus:outline-none focus:border-primary font-semibold cursor-pointer"
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>

                {/* Language selection */}
                <div className="font-mono">
                  <label className="text-[9px] text-on-surface-variant font-bold block uppercase mb-1.5">LANGUAGE COMPILES</label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full bg-surface-container border border-white/10 px-3 py-2 rounded text-white text-xs focus:outline-none focus:border-primary font-semibold cursor-pointer"
                  >
                    <option>JAVASCRIPT (ES6)</option>
                    <option>PYTHON 3.11</option>
                    <option>RUST 1.70</option>
                    <option>C++ 20</option>
                  </select>
                </div>
                
                {/* Invite list */}
                <div className="font-mono">
                  <label className="text-[9px] text-on-surface-variant font-bold block uppercase mb-1.5">INVITE ACTIVE FRIENDS</label>
                  <div className="max-h-24 overflow-y-auto border border-white/10 bg-[#0e0e13] rounded p-2 space-y-1.5">
                    {user.friends.map(f => (
                      <div key={f.username} className="flex justify-between items-center text-[10px] py-0.5 border-b border-white/5 last:border-0">
                        <span className="font-bold text-white">{f.username}</span>
                        <button
                          onClick={() => alert(`Invite request sent to ${f.username}!`)}
                          className="px-2.5 py-0.5 bg-secondary hover:bg-secondary/80 text-on-secondary font-extrabold rounded text-[9px] transition-colors"
                        >
                          INVITE
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartBattle}
                disabled={lobbyStatus === "waiting"}
                className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-secondary text-on-primary font-mono text-xs font-bold tracking-widest hover:shadow-[0_0_20px_rgba(221,183,255,0.4)] disabled:opacity-50 transition-all rounded uppercase"
              >
                START BATTLE
              </button>
            </div>
          </div>
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
                      <option className="bg-surface">C++ 20</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 font-mono text-[11px] font-bold">
                  <button
                    onClick={handleRunTests}
                    disabled={isRunningTests}
                    className="px-5 py-2 border border-secondary text-secondary hover:bg-secondary/10 disabled:opacity-50 transition-all rounded"
                  >
                    {isRunningTests ? "RUNNING..." : "RUN TESTS"}
                  </button>
                  <button
                    onClick={handleSubmitCode}
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary hover:brightness-110 shadow-[0_0_15px_rgba(221,183,255,0.4)] disabled:opacity-50 transition-all rounded flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" /> COMPILING...
                      </>
                    ) : (
                      "SUBMIT_CODE"
                    )}
                  </button>
                </div>
              </div>

              {/* Monaco Container */}
              <div className="flex-grow w-full relative">
                <div className="scanner-effect absolute inset-x-0 top-0 h-1 z-20 pointer-events-none"></div>
                <Editor
                  height="100%"
                  language={selectedLanguage.includes("PYTHON") ? "python" : selectedLanguage.includes("RUST") ? "rust" : selectedLanguage.includes("C++") ? "cpp" : "javascript"}
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

                {/* Floating Terminal Output */}
                <div className="absolute bottom-6 right-6 w-64 glass-panel p-4 border border-primary/20 rounded-xl z-20 font-mono text-[11px]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-on-surface-variant font-bold">TERMINAL_OUTPUT</span>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  </div>
                  <div className="space-y-2 font-bold">
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
