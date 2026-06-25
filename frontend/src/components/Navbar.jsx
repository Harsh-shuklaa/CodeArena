import { useState, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { Terminal, Menu, X, Swords, LogOut } from "lucide-react";
import { UserContext } from "../context/UserContext";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useContext(UserContext);

  const links = user.isLoggedIn
    ? [
        { name: "Dashboard", path: "/dashboard" },
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
          {links.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => handleLinkClick(link.isAnchor)}
              className={`hover:text-primary transition-colors duration-200 ${
                location.pathname === link.path ? "text-primary font-semibold" : "text-on-surface-variant"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs / Profile widget */}
        <div className="hidden md:flex items-center gap-4">
          {user.isLoggedIn ? (
            <div className="flex items-center gap-4">
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
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-on-surface-variant hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="md:hidden absolute top-[64px] left-0 w-full bg-surface/95 border-b border-white/10 flex flex-col p-6 gap-4 z-40 backdrop-blur-xl animate-fade-in">
          {links.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => handleLinkClick(link.isAnchor)}
              className={`text-base py-2 border-b border-white/5 ${
                location.pathname === link.path ? "text-primary font-semibold" : "text-on-surface-variant"
              }`}
            >
              {link.name}
            </Link>
          ))}
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
