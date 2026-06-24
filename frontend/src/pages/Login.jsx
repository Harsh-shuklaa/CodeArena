import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Terminal, Lock, Mail, Github, Chrome } from "lucide-react";
import { UserContext } from "../context/UserContext";
import BackgroundShader from "../components/BackgroundShader";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(UserContext);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.message || "Failed to establish access.");
    }
  };

  return (
    <div className="pt-20 min-h-screen w-full flex relative overflow-hidden bg-background">
      <BackgroundShader />
      <div className="fixed inset-0 z-[-2] grid-bg opacity-30 pointer-events-none"></div>

      {/* Left Side: Cinematic Branding (Hidden on mobile) */}
      <section className="hidden lg:flex lg:w-1/2 relative bg-surface-container-lowest items-center justify-center overflow-hidden border-r border-white/5 p-12">
        <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
          <div className="mb-8">
            <h1 className="text-5xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(221,183,255,0.4)] tracking-tighter font-display-lg flex items-center gap-3 justify-center">
              <Terminal className="w-12 h-12 text-primary" /> CODEARENA
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-primary to-secondary mx-auto mt-4 rounded-full"></div>
          </div>
          <p className="text-on-surface-variant font-body-md mb-12">
            Enter the high-stakes ecosystem where elite developers compete in low-latency environments. Systems online. Ready for deployment.
          </p>

          <div className="w-full aspect-video rounded-xl overflow-hidden glass-panel relative group border border-white/5">
            <img
              className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfrOTk_kPw_O-ozv0MTbPf4K1baNyvv6VxQ5ih32osleO3vMK30eNb1-K4sL7neRorHGJSgsqmawint1sldIpNas4qIAukXl58sQ9DfISCe8k5ipI1aNpXIuf0_bsdRRGCVKL1SAhUxrD1-_NNv6uZG4PpDX3BshimZWdDKbbdmEyAdWCRfSMwlk9lhpn8cP1RA55RNMaXtV089Tus1yeoPJxclKQVys6ftkZtpJlE-tahrHzJeLXcGSMxpw6dISQpJK42XDQRRQ"
              alt="Futuristic Dev Station"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            <div className="scanner-effect absolute inset-0"></div>
          </div>

          <div className="mt-12 flex gap-8 items-center font-mono">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-secondary tracking-widest uppercase mb-1">ACTIVE USERS</span>
              <span className="text-sm font-semibold text-white">14,204</span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-secondary tracking-widest uppercase mb-1">SYSTEM STATUS</span>
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_#4cd7f6] animate-pulse"></span>
                OPERATIONAL
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Side: Auth Card */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-md glass-panel p-8 md:p-10 rounded-xl relative overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(168,85,247,0.1)]">
          
          <header className="mb-8 text-center lg:text-left">
            <h1 className="lg:hidden text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4 font-display-lg">
              CODEARENA
            </h1>
            <h2 className="text-2xl font-bold font-display-lg text-white mb-2">ACCESS TERMINAL</h2>
            <p className="text-sm text-on-surface-variant font-body-md">Identify yourself to enter the arena.</p>
          </header>

          {/* Social Auth */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button className="flex items-center justify-center gap-2 py-3 border border-white/10 rounded-lg text-xs font-bold tracking-wider font-mono text-on-surface hover:bg-white/5 hover:border-secondary/50 transition-all">
              <Github className="w-4 h-4 text-white" /> GITHUB
            </button>
            <button className="flex items-center justify-center gap-2 py-3 border border-white/10 rounded-lg text-xs font-bold tracking-wider font-mono text-on-surface hover:bg-white/5 hover:border-secondary/50 transition-all">
              <Chrome className="w-4 h-4 text-white" /> GOOGLE
            </button>
          </div>

          <div className="relative flex items-center justify-center mb-8">
            <div className="w-full h-px bg-white/10"></div>
            <span className="absolute bg-[#17171f] px-3 text-[10px] text-on-surface-variant tracking-[0.2em] font-mono">
              OR LOGIN WITH EMAIL
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-xs font-mono text-red-400 text-center animate-pulse">
              ⚠️ {error.toUpperCase()}
            </div>
          )}

          {/* Main Login Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-wider font-mono text-on-surface-variant">EMAIL ADDRESS</label>
              <div className="relative border border-white/10 bg-surface-container-lowest rounded-lg focus-within:border-primary focus-within:shadow-[0_0_15px_rgba(221,183,255,0.25)] transition-all">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"><Mail className="w-4 h-4" /></span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-none py-3 pl-10 pr-4 text-white font-sans text-sm focus:outline-none focus:ring-0"
                  placeholder="cyber_coder@arena.io"
                  type="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold tracking-wider font-mono text-on-surface-variant">PASSWORD</label>
                <a className="text-[10px] tracking-wider font-mono text-secondary hover:text-primary transition-colors" href="#">FORGOT KEY?</a>
              </div>
              <div className="relative border border-white/10 bg-surface-container-lowest rounded-lg focus-within:border-primary focus-within:shadow-[0_0_15px_rgba(221,183,255,0.25)] transition-all">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"><Lock className="w-4 h-4" /></span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-none py-3 pl-10 pr-4 text-white font-sans text-sm focus:outline-none focus:ring-0"
                  placeholder="••••••••••••"
                  type="password"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input className="w-4 h-4 rounded-sm bg-surface-container-lowest border-white/10 text-primary focus:ring-primary focus:ring-offset-background" id="remember" type="checkbox"/>
              <label className="text-[13px] text-on-surface-variant select-none cursor-pointer" htmlFor="remember">KEEP CONNECTION ACTIVE</label>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-lg text-xs font-bold tracking-widest font-mono hover:shadow-[0_0_30px_rgba(132,43,210,0.6)] transition-all active:scale-[0.98] duration-200 disabled:opacity-50">
              {isSubmitting ? "ESTABLISHING CORE..." : "BATTLE NOW"}
            </button>
          </form>

          <footer className="mt-8 text-center">
            <p className="text-on-surface-variant text-sm">
              NO ACCESS GRANTED?
              <Link className="font-bold text-primary hover:underline ml-1" to="/signup">INITIALIZE ACCOUNT</Link>
            </p>
          </footer>

          {/* Decorative accents */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-secondary/20 rounded-tr-lg"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/20 rounded-bl-lg"></div>
        </div>
        
        <div className="absolute bottom-6 text-xs text-on-surface-variant font-mono opacity-40">
          © 2026 CODEARENA. SYSTEMS ONLINE.
        </div>
      </section>
    </div>
  );
}
