import { useEffect, useRef, useContext, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Award, Trophy, Swords, LayoutDashboard, RotateCw } from "lucide-react";
import { UserContext } from "../context/UserContext";
import BackgroundShader from "../components/BackgroundShader";

export default function Result() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, refreshUserStats } = useContext(UserContext);
  const [matchDetails, setMatchDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMatch = async () => {
      if (!matchId) return;
      try {
        const res = await fetch(`http://localhost:5001/api/match/${matchId}`);
        if (res.ok) {
          const data = await res.json();
          setMatchDetails(data);
        }
      } catch (err) {
        console.error("Failed to retrieve match details", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatch();
    // Refresh user context MMR, level, and coin parameters
    refreshUserStats();
  }, [matchId, refreshUserStats]);

  // Translate database model fields to UI stats
  const isPlayer1 = matchDetails && matchDetails.player1Id && matchDetails.player1Id._id === user._id;
  const opponent = matchDetails ? (isPlayer1 ? matchDetails.player2Id : matchDetails.player1Id) : null;
  const eloChangeVal = matchDetails ? (isPlayer1 ? matchDetails.eloChangePlayer1 : matchDetails.eloChangePlayer2) : 0;
  
  let matchResult = "DRAW";
  if (matchDetails && matchDetails.winnerId) {
    matchResult = matchDetails.winnerId === user._id ? "WIN" : "LOSS";
  }

  const latestMatch = {
    id: matchId || (matchDetails ? matchDetails._id : "CA-7821"),
    opponent: opponent ? opponent.username : "Opponent_Coder",
    result: matchResult,
    rp: `${eloChangeVal >= 0 ? "+" : ""}${eloChangeVal}`,
    duration: matchDetails ? matchDetails.duration : "12m 43s",
    attempts: matchDetails ? (isPlayer1 ? 2 : 1) : 2
  };
  const canvasRef = useRef(null);

  // Confetti Particle System
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    const particles = [];
    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * width;
        this.y = -20;
        this.size = Math.random() * 4 + 2;
        this.speed = Math.random() * 4 + 2;
        this.color = Math.random() > 0.5 ? "#ddb7ff" : "#4cd7f6";
        this.angle = Math.random() * Math.PI * 2;
        this.spin = Math.random() * 0.1 - 0.05;
      }
      update() {
        this.y += this.speed;
        this.x += Math.sin(this.angle) * 0.8;
        this.angle += this.spin;
        if (this.y > height) this.reset();
      }
      draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
      }
    }

    for (let i = 0; i < 60; i++) {
      particles.push(new Particle());
    }

    let animId;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="pt-20 min-h-screen relative flex flex-col items-center justify-center bg-background text-white font-mono text-xs">
        <BackgroundShader />
        <div className="text-center space-y-4 relative z-10">
          <RotateCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="tracking-widest animate-pulse">DECRYPTING MATCH RESULTS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen relative flex flex-col bg-background overflow-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-30" />
      <BackgroundShader />
      <div className="fixed inset-0 z-[-2] grid-bg opacity-30 pointer-events-none"></div>

      {/* Layout wrapper */}
      <div className="flex flex-1 max-w-[1440px] w-full mx-auto relative">
        
        {/* Left Sidebar Navigation (Desktop only) */}
        <aside className="hidden lg:flex flex-col w-64 bg-surface-container-lowest/80 border-r border-white/5 py-6 px-4 shrink-0 justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded border border-primary/40 overflow-hidden flex items-center justify-center bg-surface-container p-0.5 shrink-0">
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-contain" />
              </div>
              <div className="overflow-hidden text-left font-mono">
                <h3 className="text-xs font-bold text-white truncate">{user.username}</h3>
                <p className="text-[10px] text-secondary">RANK: {user.elo >= 2200 ? "ELITE" : user.elo >= 1800 ? "DIAMOND" : "RECRUIT"} ({user.elo} RP)</p>
              </div>
            </div>

            <nav className="space-y-1 font-mono text-xs">
              <Link to="/dashboard" className="flex items-center gap-3 text-on-surface-variant hover:text-white pl-4 py-3 hover:bg-white/5 transition-all">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link to="/leaderboard" className="flex items-center gap-3 text-on-surface-variant hover:text-white pl-4 py-3 hover:bg-white/5 transition-all">
                <Trophy className="w-4 h-4" /> Leaderboard
              </Link>
              <Link to={`/profile/${user.username}`} className="flex items-center gap-3 text-on-surface-variant hover:text-white pl-4 py-3 hover:bg-white/5 transition-all">
                <Award className="w-4 h-4" /> Profile
              </Link>
              <Link to="/matchmaking" className="flex items-center gap-3 text-on-surface-variant hover:text-white pl-4 py-3 hover:bg-white/5 transition-all">
                <Swords className="w-4 h-4" /> Matchmaking
              </Link>
            </nav>
          </div>

          <div className="p-4 border-t border-white/5 bg-surface-container-low/90 rounded-xl">
            <button className="w-full py-3 bg-secondary/10 border border-secondary/30 text-secondary font-mono text-[10px] font-bold tracking-widest hover:bg-secondary/20 transition-all rounded">
              UPGRADE GEAR
            </button>
          </div>
        </aside>

        {/* Center Main Results Panel */}
        <main className="flex-1 px-6 md:px-12 py-8 flex flex-col relative z-20 overflow-y-auto">
          
          {/* Dynamic Match Result Header */}
          <div className="text-center mb-12">
            {latestMatch.result === "WIN" && (
              <>
                <h1 className="text-6xl md:text-8xl font-black font-display-lg text-primary tracking-wider drop-shadow-[0_0_30px_rgba(221,183,255,0.7)] animate-bounce select-none">
                  VICTORY
                </h1>
                <p className="font-mono text-xs text-secondary tracking-[0.4em] mt-4 uppercase">
                  CHALLENGE CONQUERED
                </p>
              </>
            )}
            {latestMatch.result === "LOSS" && (
              <>
                <h1 className="text-6xl md:text-8xl font-black font-display-lg text-red-500 tracking-wider drop-shadow-[0_0_30px_rgba(239,68,68,0.7)] select-none">
                  DEFEAT
                </h1>
                <p className="font-mono text-xs text-red-400 tracking-[0.4em] mt-4 uppercase">
                  DECRYPTION MODULE SHUTDOWN
                </p>
              </>
            )}
            {latestMatch.result === "DRAW" && (
              <>
                <h1 className="text-6xl md:text-8xl font-black font-display-lg text-on-surface-variant/80 tracking-wider select-none">
                  DRAW
                </h1>
                <p className="font-mono text-xs text-on-surface-variant tracking-[0.4em] mt-4 uppercase">
                  MATCH TIME EXPIRED
                </p>
              </>
            )}
          </div>

          {/* Results Bento */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* Left Col: Main Stats Comparison */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              
              {/* Performance stats summary */}
              <div className="glass-panel p-8 rounded-xl relative overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(76,215,246,0.1)]">
                <div className="absolute top-4 right-4 animate-pulse">
                  <span className="font-mono text-[10px] text-secondary border border-secondary/20 px-2 py-0.5 rounded">
                    MATCH_ID: #{matchId || latestMatch.id}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left border-b border-white/5 pb-8 mb-8 mt-4">
                  <div>
                    <span className="text-[10px] font-bold text-on-surface-variant font-mono uppercase">MATCH DURATION</span>
                    <div className="text-2xl font-bold text-white font-display-lg mt-1">{latestMatch.duration}</div>
                  </div>
                  <div className="flex flex-col items-center md:items-start justify-center">
                    <span className="text-[10px] font-bold text-on-surface-variant font-mono uppercase">RATING CHANGE</span>
                    <div className="text-2xl font-bold text-secondary font-display-lg mt-1 animate-pulse shadow-[0_0_15px_rgba(76,215,246,0.5)] px-2 rounded">
                      {latestMatch.rp} RP
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-on-surface-variant font-mono uppercase">CURRENT RANK</span>
                    <div className="text-2xl font-bold text-primary font-display-lg mt-1">
                      {user.elo >= 2200 ? "ELITE IV" : user.elo >= 1800 ? "DIAMOND II" : "RECRUIT I"}
                    </div>
                  </div>
                </div>

                {/* Comparisons */}
                <div className="space-y-6">
                  {/* Accuracy */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-2">
                      <span className="text-white font-bold">ACCURACY</span>
                      <div className="flex gap-4">
                        <span className="text-secondary font-bold">98.2% (YOU)</span>
                        <span className="text-on-surface-variant">84.5% (OPP)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-secondary to-primary" style={{ width: "98.2%" }}></div>
                    </div>
                  </div>

                  {/* Time to solve */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-2">
                      <span className="text-white font-bold">TIME TO SOLVE</span>
                      <div className="flex gap-4">
                        <span className="text-secondary font-bold">04:15 (YOU)</span>
                        <span className="text-on-surface-variant font-bold">07:50 (OPP)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-secondary to-primary" style={{ width: "45%" }}></div>
                    </div>
                  </div>

                  {/* Memory usage */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-2">
                      <span className="text-white font-bold">MEMORY USAGE</span>
                      <div className="flex gap-4">
                        <span className="text-secondary font-bold">12.4 MB (YOU)</span>
                        <span className="text-on-surface-variant">42.1 MB (OPP)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-secondary to-primary" style={{ width: "28%" }}></div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex flex-wrap gap-4 font-mono text-xs">
                  <button className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-on-primary rounded font-bold hover:shadow-[0_0_20px_rgba(221,183,255,0.4)] transition-all">
                    POST-MATCH ANALYSIS
                  </button>
                  <button onClick={() => navigate("/matchmaking")} className="px-6 py-3 border border-secondary text-secondary hover:bg-secondary/10 rounded font-bold transition-all">
                    BATTLE AGAIN
                  </button>
                </div>
              </div>

              {/* Tactical Summary */}
              <div className="glass-panel p-6 rounded-xl border border-white/5">
                <h3 className="text-[10px] font-bold text-on-surface-variant font-mono uppercase mb-3">TACTICAL SUMMARY</h3>
                <p className="text-sm leading-relaxed text-on-surface-variant font-body-md">
                  Your solution utilized an <span className="text-primary font-bold">O(N log N)</span> sorting algorithm which outperformed the opponent's linear search approach on large test cases. Memory efficiency was peak during the second challenge block, maintaining a <span className="text-secondary font-bold">75% edge</span> over the lobby average.
                </p>
              </div>

            </div>

            {/* Right Col: Side achievements & record */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              
              {/* Achievement Card */}
              <div className="glass-panel p-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30 shrink-0">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-primary font-mono">NEW ACHIEVEMENT</div>
                    <div className="text-base font-extrabold text-white font-display-lg mt-1">CODE NINJA</div>
                    <p className="text-xs text-on-surface-variant mt-2 font-mono leading-relaxed">
                      Solve a hard problem in under 5 minutes with 0 errors.
                    </p>
                  </div>
                </div>
              </div>

              {/* Battle Record comparison */}
              <div className="glass-panel p-6 rounded-xl border border-white/5 font-mono">
                <h3 className="text-xs font-bold text-on-surface-variant mb-6 text-center uppercase">BATTLE RECORD</h3>
                <div className="space-y-4">
                  {/* Player A (User) */}
                  <div className="flex items-center gap-3 bg-primary/5 p-3 rounded-lg border border-primary/20">
                    <div className="w-9 h-9 rounded border border-primary bg-surface overflow-hidden p-0.5 shrink-0">
                      <img
                        className="w-full h-full object-contain"
                        src={user.avatarUrl}
                        alt="User Profile"
                      />
                    </div>
                    <div className="text-left font-mono">
                      <div className="text-xs font-bold text-white">{user.username}</div>
                      <div className="text-[9px] text-primary">WINNER</div>
                    </div>
                    <div className="ml-auto text-lg font-bold text-secondary">{user.elo}</div>
                  </div>

                  <div className="text-center text-[10px] text-on-surface-variant opacity-40">VS</div>

                  {/* Player B (Opponent) */}
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-white/5 opacity-60">
                    <div className="w-9 h-9 rounded border border-secondary bg-surface overflow-hidden p-0.5 shrink-0">
                      <img
                        className="w-full h-full object-contain"
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${latestMatch.opponent}`}
                        alt="Opponent Profile"
                      />
                    </div>
                    <div className="text-left font-mono">
                      <div className="text-xs font-bold text-white">{latestMatch.opponent}</div>
                      <div className="text-[9px] text-on-surface-variant">OPPONENT</div>
                    </div>
                    <div className="ml-auto text-lg font-bold text-on-surface-variant">2350</div>
                  </div>
                </div>
              </div>

              {/* XP progress bar */}
              <div className="glass-panel p-6 rounded-xl border border-white/5 font-mono">
                <div className="flex justify-between items-center text-xs mb-3">
                  <span className="text-white font-bold">LEVEL 42</span>
                  <span className="text-on-surface-variant">1,250 / 2,000 XP</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: "62.5%" }}></div>
                </div>
                <div className="text-center text-[10px] text-primary mt-3 font-bold">
                  +450 XP EARNED THIS MATCH
                </div>
              </div>

            </div>

          </div>

        </main>
      </div>

      {/* Footer */}
      <footer className="w-full py-10 border-t border-white/5 bg-surface-container-highest/40 z-20 text-center font-mono text-xs text-on-surface-variant mt-auto">
        <div className="flex justify-center gap-6 opacity-80 mb-3">
          <a className="hover:text-secondary transition-colors" href="#">Privacy Protocol</a>
          <a className="hover:text-secondary transition-colors" href="#">Terms of Engagement</a>
          <a className="hover:text-secondary transition-colors" href="#">API Docs</a>
        </div>
        <p className="opacity-60">© 2026 CODEARENA. SYSTEMS ONLINE.</p>
      </footer>
    </div>
  );
}
