import { useState, useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Trophy, Swords, LayoutDashboard, RotateCw } from "lucide-react";
import { UserContext } from "../context/UserContext";
import BackgroundShader from "../components/BackgroundShader";

export default function Leaderboard() {
  const { user } = useContext(UserContext);
  const [filterQuery, setFilterQuery] = useState("");
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [seasonOnly, setSeasonOnly] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/user/leaderboard");
        if (res.ok) {
          const data = await res.json();
          setLeaderboardData(data);
        }
      } catch (err) {
        console.error("Failed to load leaderboard standings", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // Format podium stats (top 3) - Stand order is Rank 2 (Left), Rank 1 (Center), Rank 3 (Right)
  const p1 = leaderboardData[0];
  const p2 = leaderboardData[1];
  const p3 = leaderboardData[2];

  const podium = [
    {
      rank: 2,
      name: p2 ? p2.username : "SYNTAX_REAPER",
      elo: `${p2 ? p2.elo : 2840} RP`,
      wins: p2 ? p2.wins : "1,204",
      rate: p2 ? `${Math.round((p2.wins / Math.max(1, p2.wins + p2.losses)) * 100)}%` : "68.4%",
      avatar: p2 ? p2.avatarUrl : "https://api.dicebear.com/7.x/bottts/svg?seed=SyntaxReaper",
      borderColor: "border-secondary",
      glowColor: "shadow-[0_0_20px_rgba(76,215,246,0.3)]",
      height: "h-[360px]",
    },
    {
      rank: 1,
      name: p1 ? p1.username : "NULL_POINTER",
      elo: `${p1 ? p1.elo : 3120} RP`,
      wins: p1 ? p1.wins : "1,842",
      rate: p1 ? `${Math.round((p1.wins / Math.max(1, p1.wins + p1.losses)) * 100)}%` : "74.2%",
      avatar: p1 ? p1.avatarUrl : "https://api.dicebear.com/7.x/bottts/svg?seed=NullPointer",
      borderColor: "border-primary",
      glowColor: "shadow-[0_0_35px_rgba(221,183,255,0.4)]",
      height: "h-[420px]",
    },
    {
      rank: 3,
      name: p3 ? p3.username : "BINARY_BLAST",
      elo: `${p3 ? p3.elo : 2650} RP`,
      wins: p3 ? p3.wins : "945",
      rate: p3 ? `${Math.round((p3.wins / Math.max(1, p3.wins + p3.losses)) * 100)}%` : "62.1%",
      avatar: p3 ? p3.avatarUrl : "https://api.dicebear.com/7.x/bottts/svg?seed=BinaryBlast",
      borderColor: "border-tertiary",
      glowColor: "shadow-[0_0_20px_rgba(173,198,255,0.3)]",
      height: "h-[320px]",
    },
  ];

  // Rest of the users (rank 4+)
  const tableData = leaderboardData.slice(3).map((u, idx) => {
    const total = u.wins + u.losses;
    const rate = total > 0 ? `${Math.round((u.wins / total) * 100)}%` : "0%";
    const isCurrentUser = user && u.username === user.username;
    return {
      rank: (idx + 4).toString().padStart(2, "0"),
      name: u.username,
      elo: u.elo.toLocaleString(),
      wins: u.wins,
      rate,
      avatar: u.avatarUrl,
      isUser: isCurrentUser
    };
  });

  const filteredData = tableData.filter((row) =>
    row.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="pt-20 min-h-screen relative flex flex-col items-center justify-center bg-background text-white font-mono text-xs">
        <BackgroundShader />
        <div className="text-center space-y-4 relative z-10">
          <RotateCw className="w-8 h-8 text-secondary animate-spin mx-auto" />
          <p className="tracking-widest animate-pulse">DECRYPTING SEASON STANDINGS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen relative flex flex-col bg-background">
      <BackgroundShader />
      <div className="fixed inset-0 z-[-2] grid-bg opacity-30 pointer-events-none"></div>

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
                <p className="text-[10px] text-secondary font-mono">RANK: {user.elo >= 2200 ? "ELITE" : user.elo >= 1800 ? "DIAMOND" : "RECRUIT"} ({user.elo} RP)</p>
              </div>
            </div>

            <nav className="space-y-1 font-mono text-xs">
              <Link to="/dashboard" className="flex items-center gap-3 text-on-surface-variant hover:text-white pl-4 py-3 hover:bg-white/5 transition-all">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link to="/leaderboard" className="flex items-center gap-3 bg-secondary/15 text-secondary border-l-4 border-secondary pl-3 py-3 font-bold rounded-r">
                <Trophy className="w-4 h-4" /> Leaderboard
              </Link>
              <Link to={`/profile/${user.username}`} className="flex items-center gap-3 text-on-surface-variant hover:text-white pl-4 py-3 hover:bg-white/5 transition-all">
                <Trophy className="w-4 h-4" /> Profile
              </Link>
              <Link to="/matchmaking" className="flex items-center gap-3 text-on-surface-variant hover:text-white pl-4 py-3 hover:bg-white/5 transition-all">
                <Swords className="w-4 h-4" /> Matchmaking
              </Link>
            </nav>
          </div>

          <div className="p-4 border-t border-white/5 bg-surface-container-low/90 rounded-xl">
            <button className="w-full py-3 bg-secondary/10 border border-secondary/40 text-secondary font-mono text-[10px] font-bold tracking-widest hover:bg-secondary/20 transition-all rounded">
              UPGRADE GEAR
            </button>
          </div>
        </aside>

        {/* Center Main Leaderboard View */}
        <main className="flex-grow px-6 md:px-12 py-8 flex flex-col relative z-20">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-white font-display-lg uppercase">ELITE LEADERBOARD</h1>
            <p className="text-xs font-mono text-on-surface-variant tracking-widest mt-2">
              Global Top Rankings · Season 12: Cyber Nexus
            </p>
          </div>

          {/* Top 3 Podium Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mx-auto mb-16 items-end">
            
            {/* Rank 2 */}
            <div className="order-2 md:order-1 glass-panel p-6 rounded-xl text-center relative overflow-hidden h-[360px] flex flex-col justify-end border border-white/5 hover:translate-y-[-4px] hover:border-secondary/30 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-secondary opacity-50"></div>
              <div className="mb-6 relative mx-auto">
                <div className="w-20 h-20 rounded-full border-2 border-secondary/50 p-1 bg-surface-container">
                  <img className="w-full h-full rounded-full object-contain" src={podium[0].avatar} alt={podium[0].name} />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-secondary text-on-secondary w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono">2</div>
              </div>
              <h3 className="text-base font-bold text-white font-display-lg truncate">{podium[0].name}</h3>
              <p className="text-xs font-bold text-secondary font-mono mt-1">{podium[0].elo}</p>
              <div className="flex justify-center gap-6 border-t border-white/5 pt-4 mt-4 font-mono text-[10px]">
                <div>
                  <p className="text-on-surface-variant">WINS</p>
                  <p className="text-white font-bold mt-0.5">{podium[0].wins}</p>
                </div>
                <div>
                  <p className="text-on-surface-variant">RATE</p>
                  <p className="text-white font-bold mt-0.5">{podium[0].rate}</p>
                </div>
              </div>
            </div>

            {/* Rank 1 */}
            <div className="order-1 md:order-2 glass-panel p-6 rounded-xl text-center relative overflow-hidden h-[420px] flex flex-col justify-end border border-primary/20 hover:translate-y-[-6px] hover:border-primary/50 transition-all duration-300 shadow-[0_0_35px_rgba(221,183,255,0.15)]">
              <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
              <div className="mb-8 relative mx-auto">
                <div className="w-24 h-24 rounded-full border-4 border-primary p-1 bg-surface-container shadow-[0_0_20px_rgba(221,183,255,0.4)] animate-pulse">
                  <img className="w-full h-full rounded-full object-contain" src={podium[1].avatar} alt={podium[1].name} />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary text-on-primary w-10 h-10 rounded-full flex items-center justify-center font-bold font-mono text-lg shadow-lg">1</div>
              </div>
              <h2 className="text-lg font-black text-white font-display-lg truncate">{podium[1].name}</h2>
              <p className="text-sm font-bold text-primary font-mono mt-1">{podium[1].elo}</p>
              <div className="flex justify-center gap-8 border-t border-white/10 pt-4 mt-6 font-mono text-[10px]">
                <div>
                  <p className="text-on-surface-variant">WINS</p>
                  <p className="text-white font-bold mt-0.5">{podium[1].wins}</p>
                </div>
                <div>
                  <p className="text-on-surface-variant">RATE</p>
                  <p className="text-white font-bold mt-0.5">{podium[1].rate}</p>
                </div>
              </div>
            </div>

            {/* Rank 3 */}
            <div className="order-3 glass-panel p-6 rounded-xl text-center relative overflow-hidden h-[330px] flex flex-col justify-end border border-white/5 hover:translate-y-[-4px] hover:border-tertiary/30 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-tertiary opacity-50"></div>
              <div className="mb-6 relative mx-auto">
                <div className="w-16 h-16 rounded-full border-2 border-tertiary/50 p-1 bg-surface-container">
                  <img className="w-full h-full rounded-full object-contain" src={podium[2].avatar} alt={podium[2].name} />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-tertiary text-on-tertiary w-7 h-7 rounded-full flex items-center justify-center font-bold font-mono text-xs">3</div>
              </div>
              <h3 className="text-base font-bold text-white font-display-lg truncate">{podium[2].name}</h3>
              <p className="text-xs font-bold text-tertiary font-mono mt-1">{podium[2].elo}</p>
              <div className="flex justify-center gap-6 border-t border-white/5 pt-4 mt-4 font-mono text-[10px]">
                <div>
                  <p className="text-on-surface-variant">WINS</p>
                  <p className="text-white font-bold mt-0.5">{podium[2].wins}</p>
                </div>
                <div>
                  <p className="text-on-surface-variant">RATE</p>
                  <p className="text-white font-bold mt-0.5">{podium[2].rate}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Search controls */}
          <div className="max-w-4xl w-full mx-auto mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 bg-surface-container-high/50 border border-white/5 px-4 py-2.5 rounded-lg flex-grow w-full font-mono text-xs">
              <Search className="w-4 h-4 text-on-surface-variant" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="FILTER BY USERNAME..."
                className="bg-transparent border-none focus:ring-0 focus:outline-none text-white w-full uppercase placeholder:text-on-surface-variant/40"
              />
            </div>
            <div className="flex gap-2 shrink-0 font-mono text-xs font-bold">
              <button
                onClick={() => setSeasonOnly(false)}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  !seasonOnly ? "bg-secondary/15 border-secondary text-secondary" : "bg-surface-container border-white/5 text-on-surface-variant"
                }`}
              >
                ALL TIME
              </button>
              <button
                onClick={() => setSeasonOnly(true)}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  seasonOnly ? "bg-secondary/15 border-secondary text-secondary" : "bg-surface-container border-white/5 text-on-surface-variant"
                }`}
              >
                CURRENT SEASON
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="max-w-4xl w-full mx-auto glass-panel rounded-xl overflow-hidden mb-16">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-xs text-left">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-on-surface-variant font-bold">
                    <th className="px-6 py-4">RANK</th>
                    <th className="px-6 py-4">USERNAME</th>
                    <th className="px-6 py-4 text-center">RATING (RP)</th>
                    <th className="px-6 py-4 text-center">WINS</th>
                    <th className="px-6 py-4 text-center">WIN RATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-on-surface-variant">
                  {filteredData.map((row) => (
                    <tr
                      key={row.rank}
                      className={`hover:bg-white/5 transition-all ${row.isUser ? "bg-primary/5 border-l-4 border-l-primary" : ""}`}
                    >
                      <td className="px-6 py-5 font-bold text-sm">{row.rank}</td>
                      <td className="px-6 py-5 font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center border border-white/10 text-primary">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <span>
                          {row.name}
                          {row.isUser && (
                            <span className="ml-2 bg-primary/20 text-primary text-[8px] font-bold px-1.5 py-0.5 rounded">
                              YOU
                            </span>
                          )}
                        </span>
                      </td>
                      <td className={`px-6 py-5 text-center font-bold ${row.isUser ? "text-primary" : "text-secondary"}`}>
                        {row.elo}
                      </td>
                      <td className="px-6 py-5 text-center text-white">{row.wins}</td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-white font-bold">{row.rate}</span>
                          <div className="w-16 h-1 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-secondary" style={{ width: row.rate }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Floating Personal Rank Bar */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-4xl z-30">
            <div className="glass-panel rounded-full px-6 py-3.5 flex items-center justify-between border-primary/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-primary text-xl font-bold">#6</span>
                  <div className="h-6 w-px bg-white/10"></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded border border-primary bg-surface-container overflow-hidden p-0.5">
                    <img className="w-full h-full object-contain" src={user.avatarUrl} alt="My avatar" />
                  </div>
                  <div className="font-mono text-left">
                    <p className="text-[10px] font-bold text-white leading-none mb-0.5">YOUR RANK</p>
                    <p className="text-[9px] text-primary uppercase">{user.elo >= 2200 ? "Elite" : user.elo >= 1800 ? "Diamond" : "Recruit"} · {user.elo} RP</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 font-mono text-[10px]">
                <div className="hidden md:flex flex-col items-end">
                  <p className="text-on-surface-variant font-bold">SEASON WIN RATE</p>
                  <p className="text-white font-bold mt-0.5">55.4%</p>
                </div>
                <button
                  onClick={() => navigate("/matchmaking")}
                  className="bg-primary px-5 py-2.5 rounded-full text-on-primary font-bold hover:shadow-[0_0_15px_rgba(221,183,255,0.4)] transition-all flex items-center gap-1.5"
                >
                  CLIMB RANK <Swords className="w-3.5 h-3.5" />
                </button>
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
