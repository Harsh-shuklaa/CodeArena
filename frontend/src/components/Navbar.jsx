import { useState, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { Terminal, Menu, X, Swords, LogOut, Bell, Check } from "lucide-react";
import { UserContext } from "../context/UserContext";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();
  const { user, logout, acceptFriendRequest, rejectFriendRequest, clearNotification } = useContext(UserContext);

  const links = user.isLoggedIn
    ? [
        { name: "Dashboard", path: "/dashboard" },
        { name: "Friends", path: "/dashboard?showFriends=true" },
        { name: "Battles", path: "/matchmaking" },
        { name: "Leaderboard", path: "/leaderboard" },
      ]
    : [
        { name: "Battles", path: "/matchmaking" },
        { name: "Leaderboard", path: "/leaderboard" },
      ];

  const handleLinkClick = (isAnchor) => {
    setMobileOpen(false);
    if (isAnchor && location.pathname !== "/") {
      window.location.href = "/";
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl border-b border-white/10 shadow-[0_0_20px_rgba(221,183,255,0.1)]">
      <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-wider font-display-lg text-white">
            <span className="text-primary flex items-center justify-center p-1 bg-primary/10 rounded">
              <Terminal className="w-5 h-5" />
            </span>
            CODE<span className="text-secondary">ARENA</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-on-surface-variant">
          {links.map((link) => {
            const isActive = (location.pathname + location.search) === link.path || 
              (link.path === "/dashboard" && location.pathname === "/dashboard" && !location.search.includes("showFriends"));
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => handleLinkClick(link.isAnchor)}
                className={`hover:text-primary transition-colors duration-200 ${
                  isActive ? "text-primary font-semibold" : "text-on-surface-variant"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTAs / Profile widget */}
        <div className="hidden md:flex items-center gap-4">
          {user.isLoggedIn ? (
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 border border-white/5 hover:border-primary/20 text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-all rounded cursor-pointer flex items-center justify-center"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {user.notifications && user.notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-on-primary animate-pulse">
                      {user.notifications.length}
                    </span>
                  )}
                </button>
                
                {/* Floating Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-h-96 bg-[#0e0e13]/98 border border-primary/20 rounded-xl shadow-2xl backdrop-blur-md overflow-y-auto z-50 text-left font-mono text-[11px] divide-y divide-white/5 animate-fade-in">
                    <div className="p-3 bg-primary/5 flex justify-between items-center text-primary font-bold">
                      <span className="text-[10px] tracking-wider uppercase">SYSTEM_ALERT_FEEDS</span>
                      <button onClick={() => setNotificationsOpen(false)} className="text-on-surface-variant hover:text-white">✕</button>
                    </div>
                    <div className="p-2 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {user.notifications.length === 0 ? (
                        <div className="text-center py-6 text-on-surface-variant/45 text-[9px] uppercase">No active feeds</div>
                      ) : (
                        user.notifications.map((n) => (
                          <div key={n.id} className="p-3 bg-white/5 rounded border border-white/5 space-y-2.5 text-[11px]">
                            <p className="text-white leading-normal font-medium">{n.message || n.text}</p>
                            <div className="flex gap-2 justify-end">
                              {n.type === "friend_request" && (
                                <>
                                  <button
                                    onClick={() => {
                                      acceptFriendRequest(n.from);
                                      setNotificationsOpen(false);
                                    }}
                                    className="bg-secondary text-on-secondary px-2.5 py-1 rounded text-[9px] font-bold flex items-center gap-1 hover:brightness-110 cursor-pointer"
                                  >
                                    <Check className="w-2.5 h-2.5" /> ACCEPT
                                  </button>
                                  <button
                                    onClick={() => {
                                      rejectFriendRequest(n.from);
                                      setNotificationsOpen(false);
                                    }}
                                    className="border border-error/30 text-error hover:bg-error/10 px-2.5 py-1 rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" /> DECLINE
                                  </button>
                                </>
                              )}
                              {n.type === "room_invite" && (
                                <>
                                  <Link
                                    to={`/battle/${n.data?.roomCode || n.roomId}`}
                                    onClick={() => {
                                      clearNotification(n.id);
                                      setNotificationsOpen(false);
                                    }}
                                    className="bg-primary text-on-primary px-2.5 py-1 rounded text-[9px] font-bold flex items-center gap-1 hover:brightness-110 cursor-pointer text-center text-decoration-none"
                                  >
                                    <Swords className="w-2.5 h-2.5" /> JOIN LOBBY
                                  </Link>
                                  <button
                                    onClick={() => clearNotification(n.id)}
                                    className="border border-white/10 hover:bg-white/5 text-on-surface-variant px-2 py-1 rounded text-[9px] font-bold cursor-pointer"
                                  >
                                    DISMISS
                                  </button>
                                </>
                              )}
                              {n.type === "system" && (
                                <button
                                  onClick={() => clearNotification(n.id)}
                                  className="border border-white/10 hover:bg-white/5 text-on-surface-variant px-2 py-1 rounded text-[8px] font-bold cursor-pointer"
                                >
                                  DISMISS
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Link to={`/profile/${user.username}`} className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded border border-primary/50 bg-surface-container overflow-hidden p-0.5 group-hover:scale-105 group-hover:border-primary transition-all duration-300 shadow-[0_0_10px_rgba(221,183,255,0.2)]">
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-contain" />
                </div>
                <div className="text-left font-mono leading-none">
                  <p className="text-[11px] font-bold text-white group-hover:text-primary transition-colors">{user.username}</p>
                  <p className="text-[9px] text-secondary font-semibold mt-0.5">{user.elo} RP</p>
                </div>
              </Link>
              <button
                onClick={logout}
                className="p-2 border border-white/5 hover:border-error/20 text-on-surface-variant hover:text-error hover:bg-error/5 transition-all rounded cursor-pointer"
                title="Disconnect Node"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-white transition-colors duration-200">
                Sign In
              </Link>
              <Link to="/signup" className="px-5 py-2 text-sm font-medium bg-primary text-on-primary rounded font-bold hover:shadow-[0_0_20px_rgba(221,183,255,0.4)] transition-all duration-300 flex items-center gap-2">
                <Swords className="w-4 h-4" /> Join Arena
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex items-center gap-2 md:hidden">
          {user.isLoggedIn && (
            <div className="relative">
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 border border-white/5 text-on-surface-variant hover:text-primary transition-all rounded flex items-center justify-center"
              >
                <Bell className="w-5 h-5" />
                {user.notifications && user.notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-on-primary animate-pulse">
                    {user.notifications.length}
                  </span>
                )}
              </button>
              
              {/* Floating Notifications Dropdown Mobile */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-72 max-h-80 bg-[#0e0e13]/98 border border-primary/20 rounded-xl shadow-2xl backdrop-blur-md overflow-y-auto z-50 text-left font-mono text-[10px] divide-y divide-white/5 animate-fade-in">
                  <div className="p-2.5 bg-primary/5 flex justify-between items-center text-primary font-bold">
                    <span className="text-[9px] tracking-wider uppercase">SYSTEM_ALERT_FEEDS</span>
                    <button onClick={() => setNotificationsOpen(false)} className="text-on-surface-variant">✕</button>
                  </div>
                  <div className="p-2 space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar">
                    {user.notifications.length === 0 ? (
                      <div className="text-center py-6 text-on-surface-variant/45 text-[9px] uppercase">No active feeds</div>
                    ) : (
                      user.notifications.map((n) => (
                        <div key={n.id} className="p-2.5 bg-white/5 rounded border border-white/5 space-y-2">
                          <p className="text-white leading-normal">{n.message || n.text}</p>
                          <div className="flex gap-1.5 justify-end">
                            {n.type === "friend_request" && (
                              <>
                                <button
                                  onClick={() => {
                                    acceptFriendRequest(n.from);
                                    setNotificationsOpen(false);
                                  }}
                                  className="bg-secondary text-on-secondary px-2.5 py-1 rounded text-[8px] font-bold cursor-pointer"
                                >
                                  ACCEPT
                                </button>
                                <button
                                  onClick={() => {
                                    rejectFriendRequest(n.from);
                                    setNotificationsOpen(false);
                                  }}
                                  className="border border-error/30 text-error px-2.5 py-1 rounded text-[8px] font-bold cursor-pointer"
                                >
                                  DECLINE
                                </button>
                              </>
                            )}
                            {n.type === "room_invite" && (
                              <>
                                <Link
                                  to={`/battle/${n.data?.roomCode || n.roomId}`}
                                  onClick={() => {
                                    clearNotification(n.id);
                                    setNotificationsOpen(false);
                                  }}
                                  className="bg-primary text-on-primary px-2.5 py-1 rounded text-[8px] font-bold cursor-pointer text-center text-decoration-none"
                                >
                                  JOIN
                                </Link>
                                <button
                                  onClick={() => clearNotification(n.id)}
                                  className="border border-white/10 text-on-surface-variant px-2.5 py-1 rounded text-[8px] cursor-pointer"
                                >
                                  DISMISS
                                </button>
                              </>
                            )}
                            {n.type === "system" && (
                              <button
                                onClick={() => clearNotification(n.id)}
                                className="border border-white/10 text-on-surface-variant px-2.5 py-1 rounded text-[8px] cursor-pointer"
                              >
                                DISMISS
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-on-surface-variant hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="md:hidden absolute top-[64px] left-0 w-full bg-surface/95 border-b border-white/10 flex flex-col p-6 gap-4 z-40 backdrop-blur-xl animate-fade-in">
          {links.map((link) => {
            const isActive = (location.pathname + location.search) === link.path || 
              (link.path === "/dashboard" && location.pathname === "/dashboard" && !location.search.includes("showFriends"));
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => handleLinkClick(link.isAnchor)}
                className={`text-base py-2 border-b border-white/5 ${
                  isActive ? "text-primary font-semibold" : "text-on-surface-variant"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          <div className="flex flex-col gap-3 mt-2">
            {user.isLoggedIn ? (
              <div className="flex flex-col gap-3">
                <Link
                  to={`/profile/${user.username}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 p-3 bg-surface-container rounded-lg border border-white/5"
                >
                  <div className="w-10 h-10 rounded border border-primary/50 bg-surface overflow-hidden p-0.5">
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-contain" />
                  </div>
                  <div className="text-left font-mono">
                    <p className="text-sm font-bold text-white">{user.username}</p>
                    <p className="text-xs text-secondary">{user.elo} RP</p>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                  }}
                  className="w-full py-3 text-center rounded border border-error/20 bg-error/5 text-error font-mono text-sm font-bold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> DISCONNECT NODE
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3 text-center rounded border border-white/10 text-on-surface-variant hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3 text-center bg-primary text-on-primary rounded font-bold hover:shadow-[0_0_20px_rgba(221,183,255,0.4)]"
                >
                  Join Arena
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
