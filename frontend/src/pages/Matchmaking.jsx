import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Bolt, X, Award, TrendingUp } from "lucide-react";
import { UserContext } from "../context/UserContext";
import BackgroundShader from "../components/BackgroundShader";

export default function Matchmaking() {
  const navigate = useNavigate();
  const { user, socket } = useContext(UserContext);
  const [seconds, setSeconds] = useState(0);
  const [isSearching, setIsSearching] = useState(true);

  // Timer effect
  useEffect(() => {
    if (!isSearching) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isSearching]);

  // Socket matchmaking queue integration
  useEffect(() => {
    if (!socket) {
      console.warn("[MATCHMAKING] Socket connection unavailable.");
      return;
    }

    // Join matchmaking queue
    socket.emit("joinQueue", { token: localStorage.getItem("codearena_token") });

    // Listen for match found event
    socket.on("match_found", (data) => {
      const { roomCode } = data;
      setIsSearching(false);
      setTimeout(() => {
        navigate(`/battle/${roomCode}`);
      }, 1500);
    });

    socket.on("matchFound", (data) => {
      const { matchId } = data;
      setIsSearching(false);
      setTimeout(() => {
        navigate(`/battle/${matchId}`);
      }, 1500);
    });

    return () => {
      socket.off("match_found");
      socket.off("matchFound");
      socket.emit("leaveQueue");
    };
  }, [socket, navigate]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="pt-20 min-h-screen relative flex flex-col bg-background overflow-hidden">
      <BackgroundShader />
      <div className="fixed inset-0 z-[-2] grid-bg opacity-30 pointer-events-none"></div>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 md:px-12 py-10">
        
        {/* Radar Matchmaking Core */}
        <div className="relative flex flex-col items-center justify-center mb-16 h-72 w-full max-w-lg">
          {/* Radar Circles */}
          {isSearching && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute w-[350px] h-[350px] rounded-full border border-primary/20 flex items-center justify-center">
                <div className="absolute w-full h-full rounded-full border-2 border-primary/40 animate-ping opacity-60" style={{ animationDuration: "3s" }}></div>
                <div className="absolute w-full h-full rounded-full border border-secondary/20 animate-ping opacity-40" style={{ animationDuration: "4s", animationDelay: "1s" }}></div>
                <div className="absolute w-full h-full rounded-full border border-primary/10 animate-ping opacity-25" style={{ animationDuration: "5s", animationDelay: "2s" }}></div>
              </div>
            </div>
          )}

          {/* Central Status */}
          <div className="relative z-20 text-center space-y-4">
            <div>
              <span className="text-[10px] font-bold tracking-[0.3em] text-secondary font-mono">
                {isSearching ? "SYNCING NODES..." : "CONNECTION ESTABLISHED"}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary font-display-lg drop-shadow-[0_0_12px_rgba(221,183,255,0.6)]">
              {isSearching ? "SEARCHING FOR OPPONENT..." : "MATCH FOUND!"}
            </h1>
            <div className="flex flex-col gap-2 items-center">
              <div className="text-xs text-on-surface-variant bg-surface-container-high px-4 py-1.5 rounded-full border border-white/5 font-mono">
                ESTIMATED TIME: <span className="text-secondary font-bold">00:45</span>
              </div>
              <div className="text-4xl font-extrabold text-white tracking-widest font-display-lg mt-2">
                {formatTime(seconds)}
              </div>
            </div>
          </div>
        </div>

        {/* Player Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-[1100px] mt-8">
          
          {/* Operator Card */}
          <div className="glass-panel p-6 rounded-xl relative group border-l-4 border-l-primary flex flex-col justify-between shadow-[0_0_20px_rgba(168,85,247,0.1)]">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded border border-primary/50 bg-surface overflow-hidden p-0.5 shrink-0 shadow-[0_0_10px_rgba(221,183,255,0.25)]">
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-contain" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold text-on-surface-variant font-mono mb-0.5">LOCAL OPERATOR</div>
                <div className="text-xl font-bold text-white font-display-lg truncate max-w-[160px]">{user.username}</div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-6">
              <div className="flex gap-2 items-center font-mono text-xs">
                <TrendingUp className="w-4 h-4 text-secondary" />
                <span>{user.elo} RP</span>
                <span className="text-on-surface-variant opacity-50">/ {user.selectedClass.toUpperCase()}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-primary/20 text-[10px] font-bold text-primary font-mono tracking-wider">
                {user.elo >= 2200 ? "ELITE" : user.elo >= 1800 ? "DIAMOND" : "RECRUIT"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden mt-4">
              <div className="h-full bg-secondary rounded-full" style={{ width: "75%" }}></div>
            </div>
          </div>

          {/* Mode Card 1 */}
          <div className="glass-panel p-6 rounded-xl border border-secondary/30 bg-secondary/5 flex flex-col gap-2 justify-between">
            <div className="flex justify-between items-center font-mono">
              <span className="text-[10px] font-bold text-secondary tracking-wider">ACTIVE PROTOCOL</span>
              <Bolt className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-display-lg">RANKED MATCH</h3>
              <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                Locked to similar MMR. Results affect global standings. Win-streak bonus active.
              </p>
            </div>
          </div>

          {/* Mode Card 2 */}
          <div className="glass-panel p-6 rounded-xl opacity-60 hover:opacity-100 transition-all flex flex-col gap-2 justify-between cursor-pointer">
            <div className="flex justify-between items-center font-mono">
              <span className="text-[10px] font-bold text-on-surface-variant tracking-wider">SUB-PROTOCOL</span>
              <Award className="w-4 h-4 text-on-surface-variant" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-display-lg">FRIEND DUEL</h3>
              <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                Direct invite system. No ranking impact. Custom rulesets enabled.
              </p>
            </div>
          </div>

        </div>

        {/* Cancel Button */}
        {isSearching && (
          <div className="mt-12">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-error font-mono text-xs font-bold tracking-widest hover:text-red-400 transition-all flex items-center gap-2 group"
            >
              <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              CANCEL MATCHMAKING
            </button>
          </div>
        )}

      </main>

      {/* Floating HUD Sidebars */}
      <aside className="hidden xl:flex flex-col fixed left-8 top-32 bottom-20 justify-between font-mono z-20 text-[10px] text-on-surface-variant opacity-40 select-none">
        <div className="space-y-12">
          <div className="rotate-[-90deg] origin-left whitespace-nowrap">STREAK: 05 WINS</div>
          <div className="rotate-[-90deg] origin-left whitespace-nowrap pt-8">REGION: INDIA_WEST_02</div>
        </div>
        <div className="space-y-1">
          <div className="w-8 h-[2px] bg-primary/20"></div>
          <div className="w-12 h-[2px] bg-secondary/30"></div>
          <div className="w-4 h-[2px] bg-primary/20"></div>
        </div>
      </aside>

      <aside className="hidden xl:flex flex-col fixed right-8 top-32 bottom-20 justify-between items-end font-mono z-20 text-right select-none">
        <div className="space-y-4">
          <div>
            <div className="text-[9px] text-secondary opacity-50">LATENCY</div>
            <div className="text-xs text-secondary font-bold">12 MS</div>
          </div>
          <div>
            <div className="text-[9px] text-on-surface-variant opacity-50 font-bold">PACKET LOSS</div>
            <div className="text-xs text-on-surface-variant font-bold">0.00%</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[9px] text-primary font-bold">SYSTEM_HEALTH</div>
          <div className="flex gap-1.5 justify-end">
            <div className="w-2 h-4 bg-primary"></div>
            <div className="w-2 h-4 bg-primary"></div>
            <div className="w-2 h-4 bg-primary"></div>
            <div className="w-2 h-4 bg-primary/20"></div>
          </div>
        </div>
      </aside>

      {/* Footer */}
      <footer className="w-full px-6 md:px-12 py-6 z-20 flex justify-between items-center border-t border-white/5 bg-surface/50 backdrop-blur-md font-mono text-[11px] text-on-surface-variant mt-auto">
        <div>© 2026 CODEARENA. SYSTEMS ONLINE.</div>
        <div className="flex gap-6">
          <a className="hover:text-secondary transition-colors" href="#">Privacy Protocol</a>
          <a className="hover:text-secondary transition-colors" href="#">Terms of Engagement</a>
          <a className="hover:text-secondary transition-colors" href="#">API Docs</a>
        </div>
      </footer>
    </div>
  );
}
