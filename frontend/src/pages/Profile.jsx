import { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { Award, Trophy, Swords, LayoutDashboard, Coins, Globe, Settings, RotateCw, Users } from "lucide-react";
import { UserContext } from "../context/UserContext";
import BackgroundShader from "../components/BackgroundShader";

export default function Profile() {
  const { username } = useParams();
  const { user, updateAvatar } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState("Overview");
  const [heatmapData, setHeatmapData] = useState([]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [pickerSeed, setPickerSeed] = useState("");
  const [profileUser, setProfileUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isOwnProfile = !username || (user && user.username && username.toLowerCase() === user.username.toLowerCase());

  const generateActivityGrid = (activityMap) => {
    const grid = [];
    const today = new Date();
    
    const startDate = new Date();
    startDate.setDate(today.getDate() - 364);
    
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek);
    
    const levels = [
      "bg-white/5",
      "bg-secondary/20",
      "bg-secondary/50",
      "bg-secondary/80",
      "bg-secondary"
    ];
    
    let current = new Date(startDate);
    for (let week = 0; week < 53; week++) {
      const col = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = current.toISOString().split("T")[0];
        const count = activityMap[dateStr] || 0;
        
        let levelIndex = 0;
        if (count > 0 && count <= 2) levelIndex = 1;
        else if (count >= 3 && count <= 4) levelIndex = 2;
        else if (count >= 5 && count <= 6) levelIndex = 3;
        else if (count >= 7) levelIndex = 4;
        
        col.push({
          date: dateStr,
          count,
          colorClass: levels[levelIndex]
        });
        
        current.setDate(current.getDate() + 1);
      }
      grid.push(col);
    }
    return grid;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const targetUsername = username || user.username;
      if (!targetUsername || targetUsername === "Guest_Coder") {
        setProfileUser({
          username: "Guest_Coder",
          avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Guest_Coder",
          elo: 1200,
          selectedClass: "Algorithms",
          coins: 250,
          level: 1,
          xp: 0,
          wins: 0,
          losses: 0,
          matches: []
        });
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`http://localhost:5001/api/user/${targetUsername}`);
        if (res.ok) {
          const data = await res.json();
          setProfileUser(data.user);
        }

        // Fetch activity logs
        const actRes = await fetch(`http://localhost:5001/api/user/${targetUsername}/activity`);
        if (actRes.ok) {
          const actData = await actRes.json();
          setHeatmapData(generateActivityGrid(actData));
        }
      } catch (err) {
        console.error("Profile API retrieval failed", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username, user]);

  useEffect(() => {
    if (user.username) {
      setPickerSeed(user.username.toLowerCase());
    }
  }, [user.username]);

  const handleSaveAvatar = () => {
    updateAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${pickerSeed}`);
    setShowAvatarPicker(false);
  };

  const preconfiguredSeeds = [
    "cyber_ninja",
    "glitch_node",
    "neon_hacker",
    "quantum_byte",
    "retrowave",
    "delta_void"
  ];

  // recentBattles removed to use dynamic context matches

  const achievements = profileUser ? (profileUser.achievements || []) : [];

  const languages = (profileUser && profileUser.languages && profileUser.languages.length > 0)
    ? profileUser.languages.map(l => {
        const colors = {
          "JAVASCRIPT": "from-yellow-400 to-yellow-600",
          "PYTHON": "from-primary to-purple-500",
          "C++": "from-tertiary to-blue-300",
          "RUST": "from-secondary to-blue-500"
        };
        return {
          name: l.name,
          percent: l.percent,
          gradient: colors[l.name] || "from-secondary to-blue-500"
        };
      })
    : [];

  if (isLoading) {
    return (
      <div className="pt-20 min-h-screen relative flex flex-col items-center justify-center bg-background text-white font-mono text-xs">
        <BackgroundShader />
        <div className="text-center space-y-4 relative z-10">
          <RotateCw className="w-8 h-8 text-secondary animate-spin mx-auto" />
          <p className="tracking-widest animate-pulse">DECRYPTING OPERATOR LOGS...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="pt-20 min-h-screen relative flex flex-col items-center justify-center bg-background text-white font-mono text-xs">
        <BackgroundShader />
        <div className="text-center space-y-6 relative z-10 p-8 glass-panel border border-error/20 bg-error/5 max-w-md rounded-xl">
          <h2 className="text-xl font-bold text-error font-display-lg uppercase tracking-wider">OPERATOR NOT FOUND</h2>
          <p className="text-on-surface-variant leading-relaxed text-[11px]">
            The database was unable to identify a user corresponding to the specified credentials. Return to the Command Center to initiate connection logs.
          </p>
          <Link
            to="/dashboard"
            className="inline-block px-6 py-3 bg-primary text-on-primary font-bold tracking-widest rounded hover:shadow-[0_0_15px_rgba(221,183,255,0.4)] transition-all uppercase"
          >
            RETURN TO COMMAND CENTER
          </Link>
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
            <div className="flex flex-col items-center p-4 border-b border-white/5 gap-3">
              <div className="relative">
                <div className="w-16 h-16 rounded border border-primary/50 bg-surface-container overflow-hidden p-0.5 shadow-[0_0_15px_rgba(221,183,255,0.2)]">
                  <img
                    className="w-full h-full object-contain"
                    src={profileUser.avatarUrl}
                    alt="Profile Avatar"
                  />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface rounded-full"></span>
              </div>
              <div className="text-center font-mono">
                <span className="text-xs font-bold text-white block">{profileUser.username}</span>
                <span className="text-[10px] text-secondary tracking-widest uppercase">
                  RANK: {profileUser.elo >= 2200 ? "ELITE" : profileUser.elo >= 1800 ? "DIAMOND" : "RECRUIT"} ({profileUser.elo} RP)
                </span>
              </div>
            </div>

            <nav className="space-y-1 font-mono text-xs">
              <Link to="/dashboard" className="flex items-center gap-3 text-on-surface-variant hover:text-white pl-4 py-3 hover:bg-white/5 transition-all">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link to="/dashboard?showFriends=true" className="flex items-center gap-3 text-on-surface-variant hover:text-white pl-4 py-3 hover:bg-white/5 transition-all">
                <Users className="w-4 h-4" /> Friends
              </Link>
              <Link to="/leaderboard" className="flex items-center gap-3 text-on-surface-variant hover:text-white pl-4 py-3 hover:bg-white/5 transition-all">
                <Trophy className="w-4 h-4" /> Leaderboard
              </Link>
              <Link to={`/profile/${profileUser.username}`} className="flex items-center gap-3 bg-secondary/15 text-secondary border-l-4 border-secondary pl-3 py-3 font-bold rounded-r">
                <Trophy className="w-4 h-4" /> Profile
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

        {/* Center Main Profile View */}
        <main className="flex-1 px-6 md:px-12 py-8 flex flex-col overflow-y-auto">
          
          {/* Cover Banner */}
          <section className="relative w-full h-72 rounded-xl overflow-hidden mb-8 glass-panel border border-white/5 flex flex-col justify-end">
            <div className="absolute inset-0 z-0">
              <div
                className="w-full h-full bg-cover bg-center opacity-20"
                style={{
                  backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDixcXTkviLvpCXssRG7i0utXQ1UHXLb11GtWEabpECjWHpz1J1ggbI_GP7hL5S6zw5COfz-uqplEbLR-2T5tm_YSkBLiq9s-MGiOfvr56r0S4kweJOur-7ZmnCfzso2WW3Pz_px2Ux9Bcyiflgc4R3IvpQqBlYeCO4hhT2RL8hG6YmtGQ7Y1iFp1XJ6xFPR3TWcogNAMZzgGatVK20gIwOvjBGT-eSwd18gnVQDBXKO9dJTQ5XXHdwAmsBzk0GLWzRXuqiELC56w')",
                }}
              />
            </div>
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-surface via-surface/40 to-transparent"></div>

            <div className="absolute bottom-0 left-0 w-full p-6 z-20 flex flex-col md:flex-row items-end justify-between gap-6">
              <div className="flex items-center gap-6">
                
                {/* Avatar with settings overlay trigger */}
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 rounded-xl p-1 bg-gradient-to-tr from-primary to-secondary shadow-[0_0_20px_rgba(221,183,255,0.3)] bg-surface overflow-hidden">
                    <img
                      className="w-full h-full rounded-lg object-contain"
                      src={profileUser.avatarUrl}
                      alt="Player Avatar"
                    />
                  </div>
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-surface rounded-full ${profileUser.status === "online" ? "bg-green-500 animate-pulse" : "bg-neutral-500"}`}></span>
                  {isOwnProfile && (
                    <button
                      onClick={() => {
                        setPickerSeed(user.username.toLowerCase());
                        setShowAvatarPicker(!showAvatarPicker);
                      }}
                      className="absolute -bottom-2 -right-2 bg-primary hover:bg-primary-container text-on-primary p-1.5 rounded-lg border border-white/10 hover:shadow-[0_0_10px_rgba(221,183,255,0.6)] transition-all cursor-pointer"
                      title="Reprogram Gear"
                    >
                      <Settings className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "8s" }} />
                    </button>
                  )}
                </div>

                <div className="mb-2 text-left">
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold font-display-lg text-white">{profileUser.username}</h1>
                    <div className="px-2.5 py-0.5 bg-primary/20 border border-primary/40 rounded text-primary text-[9px] font-mono font-bold flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> {profileUser.elo >= 2200 ? "KNIGHT" : "RECRUIT"}
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant font-mono">Specialty Class: {profileUser.selectedClass}</p>
                </div>
              </div>

              {/* Stats Panel */}
              <div className="flex gap-4 font-mono">
                <div className="glass-panel px-4 py-2 rounded-lg border border-white/5 flex flex-col items-center min-w-[100px]">
                  <span className="text-[9px] text-on-surface-variant font-bold">ARENA COINS</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Coins className="w-4 h-4 text-secondary" />
                    <span className="text-lg font-bold text-white leading-none">{profileUser.coins}</span>
                  </div>
                </div>
                <div className="glass-panel px-4 py-2 rounded-lg border border-white/5 flex flex-col items-center min-w-[100px]">
                  <span className="text-[9px] text-on-surface-variant font-bold">ELO STANDING</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="text-lg font-bold text-white leading-none">{profileUser.elo} RP</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Avatar Customizer Console (Modal/Card) */}
          {showAvatarPicker && isOwnProfile && (
            <div className="glass-panel p-6 rounded-xl border border-primary/30 mb-8 bg-primary/5 text-left font-mono relative animate-fade-in z-20">
              <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                ⚙️ AVATAR RE-ENCRYPTION TERMINAL
              </h3>
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="w-16 h-16 rounded border border-primary/50 bg-surface overflow-hidden p-0.5 shrink-0 shadow-[0_0_10px_rgba(221,183,255,0.2)]">
                  <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${pickerSeed}`} alt="New avatar" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <label className="block text-[10px] text-on-surface-variant font-bold uppercase mb-1">Custom Bot Code / Seed</label>
                    <input
                      type="text"
                      value={pickerSeed}
                      onChange={(e) => setPickerSeed(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      className="w-full px-3 py-2 bg-surface border border-white/10 rounded focus:border-primary focus:outline-none text-white text-xs font-mono"
                      placeholder="e.g. quantum_hacker"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-on-surface-variant font-bold uppercase mb-1.5">Preconfigured Presets</label>
                    <div className="flex gap-2 overflow-x-auto pb-1 max-w-[400px]">
                      {preconfiguredSeeds.map((seed) => (
                        <button
                          key={seed}
                          type="button"
                          onClick={() => setPickerSeed(seed)}
                          className={`w-7 h-7 rounded border shrink-0 overflow-hidden bg-surface p-0.5 transition-all ${
                            pickerSeed === seed ? "border-primary shadow-[0_0_8px_rgba(221,183,255,0.4)] scale-105" : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`} alt="preset" className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveAvatar}
                      className="px-4 py-2 bg-primary text-on-primary rounded font-bold text-xs hover:shadow-[0_0_15px_rgba(221,183,255,0.4)] transition-all cursor-pointer"
                    >
                      SAVE CHANGE
                    </button>
                    <button
                      onClick={() => setShowAvatarPicker(false)}
                      className="px-4 py-2 border border-white/10 hover:bg-white/5 text-on-surface-variant rounded text-xs transition-all cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid Content Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* Left Main Col */}
            <div className="xl:col-span-8 space-y-6">
              
              {/* Tab Selector */}
              <nav className="flex gap-6 border-b border-white/10 font-mono text-xs font-bold">
                {["Overview", "Achievements", "Match History"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2.5 transition-all ${
                      activeTab === tab ? "text-secondary border-b-2 border-secondary" : "text-on-surface-variant hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>

              {activeTab === "Overview" && (
                <>
                  {/* Real MongoDB Profile Stats Card */}
                  <div className="glass-panel p-6 rounded-xl border border-white/5 text-left font-mono">
                    <h3 className="text-xs font-bold text-white uppercase mb-4 tracking-widest text-secondary">OPERATOR_IDENTITY_DECRYPTED</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="bg-white/5 p-3.5 rounded border border-white/5">
                        <span className="text-[10px] text-on-surface-variant block uppercase font-bold">EMAIL_ADDRESS</span>
                        <span className="text-white font-bold block mt-1 break-all">{profileUser.email}</span>
                      </div>
                      <div className="bg-white/5 p-3.5 rounded border border-white/5">
                        <span className="text-[10px] text-on-surface-variant block uppercase font-bold">ONLINE_STATUS</span>
                        <span className={`font-bold block mt-1 ${profileUser.status === "online" ? "text-green-400 animate-pulse" : "text-neutral-500"}`}>
                          {profileUser.status === "online" ? "ONLINE" : `OFFLINE (${profileUser.lastSeen ? new Date(profileUser.lastSeen).toLocaleDateString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "N/A"})`}
                        </span>
                      </div>
                      <div className="bg-white/5 p-3.5 rounded border border-white/5">
                        <span className="text-[10px] text-on-surface-variant block uppercase font-bold">FRIENDS_COUNT</span>
                        <span className="text-white font-bold block mt-1 text-lg">{profileUser.friendsCount ?? (profileUser.friends?.length || 0)}</span>
                      </div>
                      <div className="bg-white/5 p-3.5 rounded border border-white/5">
                        <span className="text-[10px] text-on-surface-variant block uppercase font-bold">JOIN_DATE</span>
                        <span className="text-white font-bold block mt-1">
                          {new Date(profileUser.createdAt).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs">
                      <div className="bg-white/5 p-3.5 rounded border border-white/5">
                        <span className="text-[10px] text-on-surface-variant block uppercase font-bold">TOTAL_MATCHES</span>
                        <span className="text-white font-bold block mt-1 text-lg">{profileUser.totalMatches ?? ((profileUser.wins || 0) + (profileUser.losses || 0))}</span>
                      </div>
                      <div className="bg-white/5 p-3.5 rounded border border-white/5">
                        <span className="text-[10px] text-on-surface-variant block uppercase font-bold">WINS</span>
                        <span className="text-green-400 font-bold block mt-1 text-lg">{profileUser.wins || 0}</span>
                      </div>
                      <div className="bg-white/5 p-3.5 rounded border border-white/5">
                        <span className="text-[10px] text-on-surface-variant block uppercase font-bold">LOSSES</span>
                        <span className="text-error font-bold block mt-1 text-lg">{profileUser.losses || 0}</span>
                      </div>
                      <div className="bg-white/5 p-3.5 rounded border border-white/5">
                        <span className="text-[10px] text-on-surface-variant block uppercase font-bold">WIN_RATE</span>
                        <span className="text-secondary font-bold block mt-1 text-lg">
                          {profileUser.winRate ?? (
                            ((profileUser.wins || 0) + (profileUser.losses || 0)) > 0
                              ? Math.round(((profileUser.wins || 0) / ((profileUser.wins || 0) + (profileUser.losses || 0))) * 100)
                              : 0
                          )}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Heatmap Grid */}
                  <div className="glass-panel p-6 rounded-xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 font-mono text-xs">
                      <h3 className="font-bold text-white">12-MONTH ACTIVITY</h3>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-on-surface-variant">Less</span>
                        <div className="w-2.5 h-2.5 bg-white/5 rounded-sm"></div>
                        <div className="w-2.5 h-2.5 bg-secondary/20 rounded-sm"></div>
                        <div className="w-2.5 h-2.5 bg-secondary/50 rounded-sm"></div>
                        <div className="w-2.5 h-2.5 bg-secondary/80 rounded-sm"></div>
                        <div className="w-2.5 h-2.5 bg-secondary rounded-sm"></div>
                        <span className="text-[9px] text-on-surface-variant">More</span>
                      </div>
                    </div>
                    
                    {/* Render Grid cells */}
                    <div className="overflow-x-auto">
                      <div className="flex gap-1.5 pb-2">
                        {heatmapData.map((col, cIdx) => (
                          <div key={cIdx} className="flex flex-col gap-1.5">
                            {col.map((day, rIdx) => (
                              <div
                                key={rIdx}
                                className={`w-2.5 h-2.5 rounded-sm ${day.colorClass} hover:scale-125 transition-transform duration-100 cursor-pointer`}
                                title={`${day.date}: ${day.count} activities`}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between font-mono text-[9px] text-on-surface-variant mt-2 col-span-12">
                      <span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span>
                      <span>JUL</span><span>AUG</span><span>SEP</span><span>OCT</span><span>NOV</span><span>DEC</span>
                    </div>
                  </div>

                  {/* Rating Chart */}
                  <div className="glass-panel p-6 rounded-xl relative">
                    <h3 className="text-xs font-bold text-white font-mono uppercase mb-6">RATING PROGRESS</h3>
                    <div className="h-48 w-full relative">
                      <svg className="w-full h-full" viewBox="0 0 800 200">
                        <defs>
                          <linearGradient id="profile-line-grad" x1="0" x2="1" y1="0" y2="0">
                            <stop offset="0%" stopColor="#ddb7ff" />
                            <stop offset="100%" stopColor="#4cd7f6" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,180 L50,160 L100,170 L150,140 L200,150 L250,100 L300,110 L350,80 L400,90 L450,50 L500,60 L550,30 L600,45 L650,20 L700,25 L800,10"
                          fill="none"
                          stroke="url(#profile-line-grad)"
                          strokeWidth="3"
                        />
                        <line stroke="white" strokeOpacity="0.05" x1="0" x2="800" y1="50" y2="50"></line>
                        <line stroke="white" strokeOpacity="0.05" x1="0" x2="800" y1="100" y2="100"></line>
                        <line stroke="white" strokeOpacity="0.05" x1="0" x2="800" y1="150" y2="150"></line>
                      </svg>
                      <div className="absolute top-0 left-0 flex flex-col justify-between h-full font-mono text-[9px] text-on-surface-variant">
                        <span>2800</span><span>2400</span><span>2000</span><span>1600</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Match History list */}
              {(activeTab === "Overview" || activeTab === "Match History") && (
                <div className="glass-panel rounded-xl overflow-hidden border border-white/5">
                  <div className="p-4 border-b border-white/5 flex justify-between items-center font-mono">
                    <h3 className="text-xs font-bold text-white uppercase">RECENT BATTLES</h3>
                    <button className="text-[10px] text-secondary font-bold">VIEW ALL</button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {!profileUser.matches || profileUser.matches.length === 0 ? (
                      <div className="p-8 text-center text-xs text-on-surface-variant font-mono uppercase tracking-widest">
                        NO BATTLES RECORDED YET
                      </div>
                    ) : (
                      profileUser.matches.map((battle) => {
                        const isWin = battle.result === "WIN";
                        const formattedRp = battle.rp.includes("RP") ? battle.rp : `${battle.rp} RP`;
                        return (
                          <div key={battle.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer">
                            <div className="flex items-center gap-4">
                              <div className={`w-1.5 h-8 ${isWin ? "bg-green-500" : "bg-red-500"} rounded-full`}></div>
                              <div className="text-left">
                                <p className="font-bold text-white text-sm">1v1 vs {battle.opponent}</p>
                                <p className="text-[10px] text-on-surface-variant font-mono mt-0.5 uppercase">
                                  Ranked Arena • {battle.date}
                                </p>
                              </div>
                            </div>
                            <div className="text-right font-mono">
                              <p className={`text-sm font-bold ${isWin ? "text-secondary" : "text-error"}`}>
                                {formattedRp}
                              </p>
                              <p className="text-[9px] text-on-surface-variant mt-0.5">
                                {isWin ? `${battle.duration} Runtime` : "TLE / Failure"}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === "Achievements" && (
                <div className="glass-panel p-6 rounded-xl space-y-6">
                  <h3 className="text-xs font-bold text-white font-mono uppercase mb-4">UNLOCKED_ACHIEVEMENTS</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((ach, i) => (
                      <div key={i} className={`p-4 rounded-xl border ${ach.border} ${ach.bgColor} flex gap-4 items-start`}>
                        <Trophy className={`w-8 h-8 ${ach.color} shrink-0 mt-0.5`} />
                        <div className="text-left font-mono">
                          <h4 className="text-sm font-bold text-white">{ach.title}</h4>
                          <p className="text-[10px] text-on-surface-variant mt-1">{ach.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right Side Column */}
            <div className="xl:col-span-4 space-y-6">
              
              {/* Top Achievements summary */}
              {activeTab !== "Achievements" && (
                <div className="glass-panel p-6 rounded-xl">
                  <h3 className="text-xs font-bold text-white font-mono uppercase mb-6">TOP 3 ACHIEVEMENTS</h3>
                  <div className="space-y-6">
                    {achievements.map((ach, i) => (
                      <div key={i} className="flex items-center gap-4 group">
                        <div className={`w-12 h-12 rounded-full ${ach.bgColor} border ${ach.border} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                          <Award className={`w-6 h-6 ${ach.color}`} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-white">{ach.title}</p>
                          <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">{ach.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preferred languages */}
              <div className="glass-panel p-6 rounded-xl">
                <h3 className="text-xs font-bold text-white font-mono uppercase mb-6">PREFERRED LANGUAGES</h3>
                <div className="space-y-4">
                  {languages.map((lang, i) => (
                    <div key={i}>
                      <div className="flex justify-between font-mono text-[11px] mb-2">
                        <span className="text-white font-bold">{lang.name}</span>
                        <span className="text-on-surface-variant">{lang.percent}</span>
                      </div>
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${lang.gradient}`} style={{ width: lang.percent }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active rivals */}
              <div className="glass-panel p-6 rounded-xl font-mono text-xs">
                <h3 className="text-xs font-bold text-white uppercase mb-4">ACTIVE RIVALS</h3>
                <div className="flex flex-wrap gap-3">
                  {!profileUser.friends || profileUser.friends.length === 0 ? (
                    <p className="text-[10px] text-on-surface-variant/50 uppercase">No active rivals found.</p>
                  ) : (
                    profileUser.friends.map((friend) => (
                      <Link
                        key={friend.username}
                        to={`/profile/${friend.username}`}
                        className="w-10 h-10 rounded-lg border border-white/10 bg-surface-container overflow-hidden hover:border-secondary transition-all p-0.5"
                        title={`${friend.username} (${friend.elo} RP)`}
                      >
                        <img
                          className="w-full h-full object-contain"
                          src={friend.avatarUrl}
                          alt={friend.username}
                        />
                      </Link>
                    ))
                  )}
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
