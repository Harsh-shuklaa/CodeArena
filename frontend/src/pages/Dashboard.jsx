import { useState, useContext, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, TrendingUp, Play, Award, Swords, HelpCircle, Terminal, UserPlus, Check, X, Bell, Users } from "lucide-react";
import { UserContext } from "../context/UserContext";
import BackgroundShader from "../components/BackgroundShader";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    clearNotification,
    updateProfile
  } = useContext(UserContext);

  const [latency] = useState(12);
  const [friendSearch, setFriendSearch] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeRooms, setActiveRooms] = useState(0);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  // Sync modal visibility with location search parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("showFriends") === "true") {
      setShowFriendsModal(true);
    } else {
      setShowFriendsModal(false);
    }
  }, [location.search]);

  const handleCloseFriendsModal = () => {
    setShowFriendsModal(false);
    navigate("/dashboard", { replace: true });
  };

  // Sync active lobbies count
  useEffect(() => {
    const fetchActiveRoomsCount = async () => {
      const token = localStorage.getItem("codearena_token");
      if (!token) return;
      try {
        const res = await fetch("http://localhost:5001/api/room/count/active", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setActiveRooms(data.count);
        }
      } catch (err) {
        console.error("Failed to fetch active rooms count", err);
      }
    };
    fetchActiveRoomsCount();
  }, []);

  // Live user search effect
  useEffect(() => {
    if (!friendSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      const token = localStorage.getItem("codearena_token");
      if (!token) return;
      try {
        const res = await fetch(`http://localhost:5001/api/user/search?username=${friendSearch}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Error searching users", err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [friendSearch]);

  // Sync user profile statistics and match history from backend Mongoose
  useEffect(() => {
    if (!user.isLoggedIn || user.username === "Guest_Coder") return;

    const fetchUserStats = async () => {
      try {
        const res = await fetch(`http://localhost:5001/api/user/${user.username}`);
        if (res.ok) {
          const data = await res.json();
          updateProfile({
            matches: data.user.matches,
            wins: data.user.wins,
            losses: data.user.losses,
            elo: data.user.elo,
            coins: data.user.coins,
            level: data.user.level,
            xp: data.user.xp,
            achievements: data.user.achievements
          });
        }
      } catch (err) {
        console.error("Failed to load operator stats", err);
      }
    };

    fetchUserStats();
  }, [user.isLoggedIn, user.username, updateProfile]);

  const handleSendFriendRequest = (e) => {
    e.preventDefault();
    if (!friendSearch.trim()) return;
    sendFriendRequest(friendSearch);
    setFriendSearch("");
  };

  const handleCreateRoom = async () => {
    const token = localStorage.getItem("codearena_token");
    if (!token) return;

    try {
      const res = await fetch("http://localhost:5001/api/room/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ difficulty: "Medium", language: "JAVASCRIPT (ES6)" })
      });
      const data = await res.json();
      if (res.ok && data.roomCode) {
        navigate(`/battle/${data.roomCode}`);
      } else {
        alert(data.message || "Failed to establish battle chamber.");
      }
    } catch (err) {
      console.error("Error creating room lobby", err);
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    navigate(`/battle/${joinRoomId.trim()}`);
  };

  const stats = [
    { label: "ELO_RATING", val: `${user.elo} RP`, border: "border-b-secondary" },
    { label: "WINS_LOSSES", val: `${user.wins}W / ${user.losses}L`, border: "border-b-error" },
    { label: "WIN_RATE", val: (user.wins + user.losses) > 0 ? `${Math.round((user.wins / (user.wins + user.losses)) * 100)}%` : "0%", border: "border-b-secondary-fixed-dim" },
    { label: "ACTIVE_ROOMS", val: activeRooms, border: "border-b-primary" },
  ];

  // Dynamically calculate Elo rating history for the chart
  const getEloHistory = () => {
    let current = user.elo || 1200;
    const history = [current];
    const matchesList = user.matches || [];
    for (const match of matchesList) {
      const changeStr = match.rp || "0";
      const change = parseInt(changeStr.replace(/[^\d-]/g, "")) || 0;
      current = current - change;
      history.unshift(current);
    }
    if (history.length === 1) {
      return [1200, 1200];
    }
    return history;
  };

  const eloHistory = getEloHistory();
  const historyLen = eloHistory.length;
  const minElo = Math.min(...eloHistory) - 20;
  const maxElo = Math.max(...eloHistory) + 20;
  const eloRange = maxElo - minElo || 1;

  const chartPoints = eloHistory.map((val, idx) => {
    const x = historyLen > 1 ? (idx / (historyLen - 1)) * 1000 : 500;
    const y = 85 - ((val - minElo) / eloRange) * 70;
    return { x, y, elo: val };
  });

  let chartPathD = "";
  if (chartPoints.length > 0) {
    chartPathD = `M ${chartPoints[0].x},${chartPoints[0].y}`;
    for (let i = 1; i < chartPoints.length; i++) {
      chartPathD += ` L ${chartPoints[i].x},${chartPoints[i].y}`;
    }
  }

  // Database-driven engagements mapping
  const recentEngagements = (user.matches && user.matches.length > 0)
    ? user.matches.slice(0, 3).map(m => ({
        type: m.result,
        title: m.title ? m.title.toUpperCase() : `ROOM_BATTLE_${m.id.toString().substring(0, 6).toUpperCase()}`,
        meta: `vs. ${m.opponent} | ${m.duration} | ${m.rp} RP`,
        accuracy: m.result === "WIN" ? "98.2%" : "72.4%",
        color: m.result === "WIN" ? "text-secondary" : "text-error",
        bgColor: m.result === "WIN" ? "bg-secondary/10" : "bg-error/10",
        borderColor: m.result === "WIN" ? "hover:border-secondary/30" : "hover:border-error/30",
        id: m.id
      }))
    : [];

  const latestAchievement = (user.achievements && user.achievements.length > 0)
    ? user.achievements[user.achievements.length - 1]
    : {
        title: "RECRUIT CODER",
        desc: "Complete matchmaking duels to start unlocking achievements.",
      };

  const notifications = user.notifications || [];

  return (
    <div className="pt-20 min-h-screen relative flex flex-col bg-background">
      <BackgroundShader />
      <div className="fixed inset-0 z-[-2] grid-bg opacity-30 pointer-events-none"></div>

      {/* Main Layout */}
      <div className="flex flex-1 max-w-[1440px] w-full mx-auto relative">
        
        {/* Left Sidebar Navigation (Desktop only) */}
        <aside className="hidden lg:flex flex-col w-64 bg-surface-container-lowest/80 border-r border-white/5 py-6 px-4 shrink-0 justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-white/5">
              <div className="w-10 h-10 rounded border border-primary/40 overflow-hidden flex items-center justify-center bg-surface p-0.5 shrink-0">
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-contain" />
              </div>
              <div className="overflow-hidden text-left font-mono">
                <h3 className="text-xs font-bold text-white truncate">{user.username}</h3>
                <p className="text-[10px] text-secondary">RANK: {user.elo >= 2200 ? "ELITE" : user.elo >= 1800 ? "DIAMOND" : "RECRUIT"} ({user.elo} RP)</p>
              </div>
            </div>

            <nav className="space-y-1 font-mono text-xs">
              <Link
                to="/dashboard"
                className={`flex items-center gap-3 py-3 font-bold rounded-r ${
                  location.pathname === "/dashboard" && !showFriendsModal
                    ? "bg-secondary/15 text-secondary border-l-4 border-secondary pl-3"
                    : "text-on-surface-variant hover:text-white hover:bg-white/5 pl-4 transition-all"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link
                to="/dashboard?showFriends=true"
                className={`flex items-center gap-3 py-3 font-bold rounded-r ${
                  showFriendsModal
                    ? "bg-secondary/15 text-secondary border-l-4 border-secondary pl-3"
                    : "text-on-surface-variant hover:text-white hover:bg-white/5 pl-4 transition-all"
                }`}
              >
                <Users className="w-4 h-4" /> Friends
              </Link>
              <Link to="/leaderboard" className="flex items-center gap-3 text-on-surface-variant hover:text-white pl-4 py-3 hover:bg-white/5 transition-all">
                <TrendingUp className="w-4 h-4" /> Leaderboard
              </Link>
              <Link to={`/profile/${user.username}`} className="flex items-center gap-3 text-on-surface-variant hover:text-white pl-4 py-3 hover:bg-white/5 transition-all">
                <Award className="w-4 h-4" /> Profile
              </Link>
              <Link to="/matchmaking" className="flex items-center gap-3 text-on-surface-variant hover:text-white pl-4 py-3 hover:bg-white/5 transition-all">
                <Swords className="w-4 h-4" /> Matchmaking
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <button className="w-full py-3 bg-surface-variant hover:bg-primary/20 text-primary border border-primary/30 rounded font-mono text-[10px] font-bold tracking-widest transition-all">
              UPGRADE GEAR
            </button>
            <div className="flex flex-col gap-2 font-mono text-[11px] text-on-surface-variant">
              <a href="#" className="flex items-center gap-2 hover:text-secondary"><HelpCircle className="w-3.5 h-3.5" /> Support</a>
              <a href="#" className="flex items-center gap-2 hover:text-secondary"><Terminal className="w-3.5 h-3.5" /> Terminal</a>
            </div>
          </div>
        </aside>

        {/* Center Dashboard View */}
        <main className="flex-1 px-6 md:px-12 py-8 flex flex-col overflow-y-auto">
          
          {/* Top Banner Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
            <div className="text-left">
              <h2 className="text-3xl font-extrabold text-white font-display-lg">COMMAND_CENTER</h2>
              <p className="text-xs text-on-surface-variant font-mono mt-1">
                Welcome back, <span className="text-primary font-bold">{user.username}</span>. Class: <span className="text-secondary font-bold">{user.selectedClass}</span>. Latency: {latency}ms
              </p>
            </div>
            
            {/* Quick Actions Console */}
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <button
                onClick={() => navigate("/matchmaking")}
                className="flex-1 md:flex-none px-6 py-3 bg-secondary text-on-secondary hover:bg-secondary/80 font-mono text-xs font-bold tracking-wider rounded transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(76,215,246,0.3)]"
              >
                <Swords className="w-4 h-4" /> PLAY RANKED
              </button>
              <button
                onClick={handleCreateRoom}
                className="flex-1 md:flex-none px-6 py-3 bg-primary text-on-primary hover:bg-primary/80 font-mono text-xs font-bold tracking-wider rounded transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(221,183,255,0.3)]"
              >
                <Terminal className="w-4 h-4" /> CREATE ROOM
              </button>
              
              <form onSubmit={handleJoinRoom} className="flex w-full md:w-auto gap-2">
                <input
                  type="text"
                  placeholder="CA-XXXX"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  className="w-full md:w-28 bg-surface-container border border-white/10 px-3 py-3 rounded text-white font-mono text-xs focus:border-secondary focus:outline-none placeholder:text-on-surface-variant/40"
                />
                <button type="submit" className="px-4 py-3 bg-surface-variant hover:bg-white/10 border border-white/10 text-white font-mono text-xs font-bold rounded">
                  JOIN
                </button>
              </form>
            </div>
          </div>

          {/* Holographic Notification Center */}
          {notifications.length > 0 && (
            <div className="mb-8 space-y-3 animate-fade-in text-left">
              <h4 className="text-[10px] font-bold text-secondary font-mono tracking-widest flex items-center gap-2 uppercase">
                <Bell className="w-3.5 h-3.5 text-secondary animate-bounce" /> SYSTEM_ALERT_FEEDS
              </h4>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="glass-panel p-4 rounded-xl border border-secondary/20 bg-secondary/5 flex justify-between items-center gap-4">
                    <div className="font-mono text-xs text-white leading-relaxed flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-ping shrink-0"></span>
                      <span>{n.message || n.text}</span>
                      <span className="text-[9px] text-on-surface-variant opacity-60">[{n.timestamp}]</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {n.type === "friend_request" && (
                        <>
                          <button
                            onClick={() => acceptFriendRequest(n.from)}
                            className="bg-secondary text-on-secondary px-3 py-1.5 rounded font-mono text-[10px] font-bold flex items-center gap-1 hover:brightness-110"
                          >
                            <Check className="w-3 h-3" /> ACCEPT
                          </button>
                          <button
                            onClick={() => rejectFriendRequest(n.from)}
                            className="border border-error/30 text-error hover:bg-error/10 px-3 py-1.5 rounded font-mono text-[10px] font-bold flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> DECLINE
                          </button>
                        </>
                      )}
                      {n.type === "room_invite" && (
                        <>
                          <button
                            onClick={() => {
                              clearNotification(n.id);
                              navigate(`/battle/${n.roomId}`);
                            }}
                            className="bg-primary text-on-primary px-3 py-1.5 rounded font-mono text-[10px] font-bold flex items-center gap-1 hover:brightness-110"
                          >
                            <Swords className="w-3 h-3" /> JOIN LOBBY
                          </button>
                          <button
                            onClick={() => clearNotification(n.id)}
                            className="border border-white/10 hover:bg-white/5 text-on-surface-variant px-3 py-1.5 rounded font-mono text-[10px] font-bold"
                          >
                            DISMISS
                          </button>
                        </>
                      )}
                      {n.type === "system" && (
                        <button
                          onClick={() => clearNotification(n.id)}
                          className="border border-white/10 hover:bg-white/5 text-on-surface-variant px-3 py-1 rounded font-mono text-[9px] font-bold"
                        >
                          DISMISS
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid Layout */}
          <div className="grid grid-cols-12 gap-6 text-left">
            
            {/* ELO Rating Card */}
            <div className="col-span-12 md:col-span-4 glass-panel p-6 rounded-xl border-l-4 border-l-primary flex flex-col justify-between shadow-[0_0_20px_rgba(168,85,247,0.15)]">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-primary/80 font-mono">CURRENT_RATING</span>
                <span className="text-[10px] font-bold text-primary font-mono">+124 RP THIS WEEK</span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-5xl font-extrabold text-white font-display-lg">{user.elo}</span>
                <span className="text-lg font-bold text-primary font-display-lg">{user.elo >= 2200 ? "ELITE" : user.elo >= 1800 ? "DIAMOND" : "RECRUIT"}</span>
              </div>
              <div className="mt-6">
                <div className="flex justify-between text-[10px] font-bold text-on-surface-variant font-mono mb-2">
                  <span>PROGRESS TO MASTER</span>
                  <span>80%</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: "80%" }}></div>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <div key={i} className={`glass-panel p-4 rounded-xl border-b-2 ${stat.border}`}>
                  <p className="text-[9px] font-bold text-on-surface-variant tracking-wider font-mono uppercase">{stat.label}</p>
                  <p className="text-2xl font-bold text-white font-display-lg mt-2">{stat.val}</p>
                </div>
              ))}
            </div>

            {/* Friends Bento Card */}
            <div className="col-span-12 md:col-span-4 glass-panel p-6 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5 font-mono">
                  <h4 className="text-xs font-bold text-white uppercase">FRIENDS_LIST</h4>
                  <button
                    onClick={() => navigate("/dashboard?showFriends=true")}
                    className="text-[9px] bg-secondary/20 hover:bg-secondary/35 text-secondary border border-secondary/30 px-2 py-1 rounded font-bold transition-all cursor-pointer uppercase"
                  >
                    VIEW FRIENDS
                  </button>
                </div>
                
                {/* Friends Count Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4 font-mono text-center text-[10px]">
                  <div className="bg-white/5 p-2 rounded border border-white/5">
                    <span className="text-on-surface-variant block uppercase font-semibold">Total</span>
                    <span className="text-white font-bold block mt-1 text-sm">{user.friends.length}</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded border border-white/5">
                    <span className="text-green-400 block uppercase font-semibold">Online</span>
                    <span className="text-green-400 font-bold block mt-1 text-sm">{user.friends.filter(f => f.status === "online").length}</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded border border-white/5">
                    <span className="text-neutral-400 block uppercase font-semibold">Offline</span>
                    <span className="text-neutral-400 font-bold block mt-1 text-sm">{user.friends.filter(f => f.status !== "online").length}</span>
                  </div>
                </div>
                
                {/* Search & Send Friend Request */}
                <form onSubmit={handleSendFriendRequest} className="flex gap-2 mb-4 relative">
                  <input
                    type="text"
                    placeholder="SEARCH USERNAME..."
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    className="flex-grow bg-surface-container border border-white/10 px-3 py-2 rounded text-white font-mono text-xs focus:border-primary focus:outline-none placeholder:text-on-surface-variant/40 uppercase"
                  />
                  <button type="submit" className="px-3 bg-primary text-on-primary hover:bg-primary-container font-mono text-[10px] font-bold rounded flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5" /> ADD
                  </button>

                  {/* Search Results Dropdown Overlay */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-11 left-0 right-0 bg-surface-container-high border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto z-30 font-mono text-xs divide-y divide-white/5">
                      {searchResults.map((u) => (
                        <div key={u.username} className="flex justify-between items-center p-2.5 hover:bg-white/5">
                          <Link to={`/profile/${u.username}`} className="text-white font-bold hover:text-secondary hover:underline">{u.username} ({u.elo} RP)</Link>
                          <button
                            type="button"
                            onClick={() => {
                              sendFriendRequest(u.username);
                              setFriendSearch("");
                              setSearchResults([]);
                            }}
                            className="bg-primary hover:bg-primary-container text-on-primary px-2 py-1 rounded text-[10px] font-bold"
                          >
                            + ADD
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </form>

                {/* Friend listings */}
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {user.friends.length === 0 ? (
                    <p className="text-[10px] text-on-surface-variant/50 font-mono text-center py-4 uppercase">No connections yet.</p>
                  ) : (
                    user.friends.map((f, i) => {
                      const isOnline = f.status === "online";
                      return (
                        <div key={i} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded border border-white/5 font-mono text-xs">
                          <Link to={`/profile/${f.username}`} className="flex items-center gap-2.5 hover:text-secondary transition-colors">
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-400 animate-pulse" : "bg-on-surface-variant/30"}`}></span>
                            <span className="text-white font-bold hover:underline">{f.username}</span>
                          </Link>
                          <span className={`text-[9px] font-bold ${isOnline ? "text-secondary" : "text-on-surface-variant opacity-60"}`}>
                            {isOnline ? "ONLINE" : "OFFLINE"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="col-span-12 glass-panel p-6 rounded-xl relative overflow-hidden h-72">
              <div className="flex justify-between items-center mb-6 z-10 relative">
                <h4 className="text-xs font-bold text-white font-mono uppercase">PERFORMANCE_MATRIX</h4>
                <div className="flex gap-2 font-mono text-[9px] font-bold text-on-surface-variant">
                  <button className="px-2 py-0.5 border border-secondary text-secondary rounded">WEEK</button>
                  <button className="px-2 py-0.5 hover:text-white transition-colors">MONTH</button>
                  <button className="px-2 py-0.5 hover:text-white transition-colors">ALL_TIME</button>
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6 top-16 flex items-end justify-between">
                <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
                  <div className="border-t border-white w-full"></div>
                  <div className="border-t border-white w-full"></div>
                  <div className="border-t border-white w-full"></div>
                  <div className="border-t border-white w-full"></div>
                </div>
                <svg className="w-full h-full absolute inset-0 overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 100">
                  <defs>
                    <linearGradient id="line-grad" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#4cd7f6" />
                      <stop offset="100%" stopColor="#ddb7ff" />
                    </linearGradient>
                  </defs>
                  {chartPathD && (
                    <path
                      className="drop-shadow-[0_0_8px_rgba(76,215,246,0.5)]"
                      d={chartPathD}
                      fill="none"
                      stroke="url(#line-grad)"
                      strokeWidth="3"
                    />
                  )}
                  {chartPoints.map((pt, idx) => {
                    const isLast = idx === chartPoints.length - 1;
                    return (
                      <g key={idx}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isLast ? 5 : 3.5}
                          className={isLast ? "fill-secondary animate-pulse" : "fill-primary/60"}
                          style={isLast ? { filter: "drop-shadow(0 0 6px rgba(76,215,246,0.8))" } : {}}
                        />
                        {isLast && (
                          <text
                            x={pt.x - 30}
                            y={pt.y - 12}
                            className="fill-secondary font-mono text-[9px] font-bold"
                          >
                            {pt.elo} RP
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Recent Engagements */}
            <div className="col-span-12 md:col-span-8 glass-panel p-6 rounded-xl">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xs font-bold text-white font-mono uppercase">RECENT_ENGAGEMENTS</h4>
                <Link to={`/profile/${user.username}`} className="text-[10px] text-secondary font-mono font-bold hover:underline">VIEW_FULL_ARCHIVE</Link>
              </div>
              <div className="space-y-3">
                {recentEngagements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 border border-white/5 border-dashed rounded-lg text-center font-mono space-y-3">
                    <p className="text-xs text-on-surface-variant tracking-wider">NO RECENT DUELS RECORDED</p>
                    <p className="text-[10px] text-on-surface-variant/50 leading-relaxed max-w-sm">
                      Go to Matchmaking or Create a Custom Battle Room to test your optimization speed and log real-time stats.
                    </p>
                    <button
                      onClick={() => navigate("/matchmaking")}
                      className="px-4 py-2 bg-secondary/10 border border-secondary/30 text-secondary font-bold text-[10px] rounded hover:bg-secondary/20 transition-all uppercase"
                    >
                      Search Opponent
                    </button>
                  </div>
                ) : (
                  recentEngagements.map((eng, i) => (
                    <div
                      key={i}
                      onClick={() => navigate(`/result/${eng.id}`)}
                      className={`group flex items-center gap-6 p-4 bg-white/5 border border-transparent rounded-lg ${eng.borderColor} cursor-pointer transition-all duration-200`}
                    >
                      <div className={`w-12 h-12 ${eng.bgColor} flex items-center justify-center ${eng.color} font-bold font-mono text-sm rounded`}>
                        {eng.type}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold font-mono text-white truncate">{eng.title}</p>
                        <p className="text-[10px] text-on-surface-variant font-mono mt-1">{eng.meta}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-on-surface-variant font-mono">ACCURACY</p>
                        <p className={`text-sm font-bold font-mono ${eng.color}`}>{eng.accuracy}</p>
                      </div>
                      <button className="p-2 text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Side Info Panel */}
            <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
              
              {/* Achievement Badge */}
              <div className="glass-panel p-6 rounded-xl bg-gradient-to-br from-primary/10 to-transparent relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Award className="w-16 h-16 text-white" />
                </div>
                <h4 className="text-[10px] font-bold text-primary font-mono mb-2 uppercase">LATEST_ACHIEVEMENT</h4>
                <p className="text-base font-extrabold text-white font-display-lg uppercase">{latestAchievement.title}</p>
                <p className="text-[11px] text-on-surface-variant mt-2 leading-relaxed font-body-md">
                  {latestAchievement.desc}
                </p>
              </div>

              {/* System Stats Monitor */}
              <div className="glass-panel p-6 rounded-xl">
                <h4 className="text-xs font-bold text-white font-mono mb-4 uppercase">SYSTEM_STATUS</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-mono text-on-surface-variant mb-1.5">
                      <span>CPU_USAGE</span>
                      <span className="text-secondary">14%</span>
                    </div>
                    <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-secondary" style={{ width: "14%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-mono text-on-surface-variant mb-1.5">
                      <span>RAM_ALLOC</span>
                      <span className="text-primary">2.4GB</span>
                    </div>
                    <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "45%" }}></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </main>
      </div>

      {/* Footer */}
      <footer className="flex flex-col items-center gap-4 w-full mt-auto py-10 border-t border-white/5 bg-surface-container-highest/50 z-10 text-center font-mono">
        <div className="flex flex-wrap justify-center gap-6 text-xs text-on-surface-variant opacity-80">
          <a className="hover:text-secondary transition-colors" href="#">Privacy Protocol</a>
          <a className="hover:text-secondary transition-colors" href="#">Terms of Engagement</a>
          <a className="hover:text-secondary transition-colors" href="#">API Docs</a>
          <a className="hover:text-secondary transition-colors" href="#">Hardware Specs</a>
        </div>
        <p className="text-xs text-on-surface-variant">© 2026 CODEARENA. SYSTEMS ONLINE.</p>
        <div className="text-primary text-[10px] font-bold tracking-widest mt-1">TERMINAL_ENCRYPT_ENABLED</div>
      </footer>
      {/* Friends Details Modal Overlay */}
      {showFriendsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center animate-fade-in select-none">
          <div className="glass-panel max-w-lg w-full p-6 border border-secondary/30 bg-[#0e0e13]/95 rounded-xl font-mono text-xs text-left shadow-2xl relative max-h-[85vh] flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/10">
                <h3 className="text-sm font-bold text-secondary tracking-widest uppercase">🤝 CODENAME_CONNECTIONS_DECRYPTED</h3>
                <button
                  onClick={handleCloseFriendsModal}
                  className="text-on-surface-variant hover:text-white text-base font-bold transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* 1. Pending connection requests inside Modal */}
              {notifications.filter(n => n.type === "friend_request").length > 0 && (
                <div className="mb-6 bg-secondary/5 border border-secondary/20 p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-secondary animate-bounce" /> Connection Requests Received
                  </h4>
                  <div className="space-y-2">
                    {notifications.filter(n => n.type === "friend_request").map((n) => {
                      const fromUser = n.data?.senderUsername || n.from;
                      return (
                        <div key={n.id} className="flex justify-between items-center bg-[#131318]/50 p-2.5 rounded border border-white/5 font-mono text-xs">
                          <span className="text-white font-bold">{fromUser}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => acceptFriendRequest(fromUser)}
                              className="bg-secondary text-on-secondary px-2.5 py-1.5 rounded font-mono text-[9px] font-bold flex items-center gap-1 hover:brightness-110"
                            >
                              <Check className="w-2.5 h-2.5" /> ACCEPT
                            </button>
                            <button
                              onClick={() => rejectFriendRequest(fromUser)}
                              className="border border-error/30 text-error hover:bg-error/10 px-2.5 py-1.5 rounded font-mono text-[9px] font-bold flex items-center gap-1"
                            >
                              <X className="w-2.5 h-2.5" /> DECLINE
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Add / Search Friends Form inside Modal */}
              <div className="mb-6 relative">
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Connect New Coder</h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!friendSearch.trim()) return;
                    sendFriendRequest(friendSearch);
                    setFriendSearch("");
                  }}
                  className="flex gap-2 relative"
                >
                  <input
                    type="text"
                    placeholder="ENTER CODENAME..."
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    className="flex-grow bg-surface-container border border-white/10 px-3 py-2 rounded text-white font-mono text-xs focus:border-primary focus:outline-none placeholder:text-on-surface-variant/40 uppercase"
                  />
                  <button type="submit" className="px-4 bg-primary text-on-primary hover:bg-primary-container font-mono text-[10px] font-bold rounded flex items-center gap-1 transition-colors">
                    <UserPlus className="w-3.5 h-3.5" /> SEND PROTOCOL
                  </button>

                  {/* Search Results Dropdown Overlay inside Modal */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-11 left-0 right-0 bg-[#161622] border border-white/15 rounded-lg shadow-2xl max-h-40 overflow-y-auto z-50 font-mono text-xs divide-y divide-white/5">
                      {searchResults.map((u) => (
                        <div key={u.username} className="flex justify-between items-center p-2.5 hover:bg-white/5">
                          <Link
                            to={`/profile/${u.username}`}
                            onClick={handleCloseFriendsModal}
                            className="text-white font-bold hover:text-secondary hover:underline"
                          >
                            {u.username} ({u.elo} RP)
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              sendFriendRequest(u.username);
                              setFriendSearch("");
                              setSearchResults([]);
                            }}
                            className="bg-primary hover:bg-primary-container text-on-primary px-2.5 py-1 rounded text-[10px] font-bold"
                          >
                            + ADD
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </form>
              </div>

              {/* 3. Deciphered contacts listings */}
              <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3 border-b border-white/5 pb-1">DECIPHERED_CONTACTS ({user.friends.length})</h4>
              <div className="space-y-3 overflow-y-auto max-h-[35vh] pr-1">
                {user.friends.length === 0 ? (
                  <p className="text-[10px] text-on-surface-variant/50 text-center py-8 uppercase">No connections logged yet.</p>
                ) : (
                  [...user.friends]
                    .sort((a, b) => {
                      if (a.status === "online" && b.status !== "online") return -1;
                      if (a.status !== "online" && b.status === "online") return 1;
                      return b.elo - a.elo;
                    })
                    .map((f) => {
                      const isOnline = f.status === "online";
                      return (
                        <div
                          key={f.username}
                          className="flex items-center justify-between bg-white/5 p-3 rounded border border-white/5 hover:border-white/10 transition-all animate-fade-in"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded border border-secondary/40 bg-surface overflow-hidden p-0.5 shrink-0 shadow-[0_0_8px_rgba(76,215,246,0.2)]">
                              <img src={f.avatarUrl} alt="Avatar" className="w-full h-full object-contain" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white leading-none">{f.username}</p>
                              <p className="text-[9px] text-on-surface-variant mt-1.5">Rating: {f.elo} RP | Level {f.level || 1}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className={`text-[9px] font-bold tracking-wider flex items-center gap-1.5 ${isOnline ? "text-green-400" : "text-neutral-500"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-400 animate-pulse" : "bg-neutral-500"}`}></span>
                              {isOnline ? "ONLINE" : "OFFLINE"}
                            </span>
                            <Link
                              to={`/profile/${f.username}`}
                              onClick={handleCloseFriendsModal}
                              className="px-3 py-1.5 bg-secondary hover:bg-secondary-container text-on-secondary font-bold rounded text-[10px] transition-all cursor-pointer uppercase shadow-[0_0_10px_rgba(76,215,246,0.15)]"
                            >
                              VIEW PROFILE
                            </Link>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 text-right">
              <button
                onClick={handleCloseFriendsModal}
                className="px-5 py-2 border border-white/10 hover:bg-white/5 text-on-surface-variant rounded text-[10px] font-bold transition-all cursor-pointer uppercase"
              >
                CLOSE TERMINAL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
