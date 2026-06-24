import { useState, useEffect, useContext } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Terminal, Lock, Mail, Github, Chrome, User, Cpu, Zap, Swords } from "lucide-react";
import { UserContext } from "../context/UserContext";
import BackgroundShader from "../components/BackgroundShader";

export default function Signup() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [alias, setAlias] = useState("");
  const [selectedClass, setSelectedClass] = useState("Algorithms");
  const [password, setPassword] = useState("");
  const [avatarSeed, setAvatarSeed] = useState("cyber_samurai");
  
  const navigate = useNavigate();
  const { signup } = useContext(UserContext);

  // Sync parameters from landing page CTA
  useEffect(() => {
    const aliasParam = searchParams.get("alias");
    const classParam = searchParams.get("class");
    if (aliasParam) {
      setAlias(aliasParam);
      setAvatarSeed(aliasParam.toLowerCase());
    }
    if (classParam) setSelectedClass(classParam);
  }, [searchParams]);

  // Keep avatar seed in sync with alias as the user types (unless they randomize/select a preset)
  const handleAliasChange = (e) => {
    const newAlias = e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 15);
    setAlias(newAlias);
    setAvatarSeed(newAlias.toLowerCase() || "cyber_samurai");
  };

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`;

  const preconfiguredSeeds = [
    "cyber_ninja",
    "glitch_node",
    "neon_hacker",
    "quantum_byte",
    "retrowave",
    "delta_void"
  ];

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    const result = await signup(email, alias || "cyber_coder_01", selectedClass, avatarUrl, password);
    setIsSubmitting(false);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.message || "Failed to register profile.");
    }
  };

  const classOptions = [
    { name: "Algorithms", desc: "Algorithmic" },
    { name: "Systems", desc: "Systems Guru" },
    { name: "Frontend", desc: "CSS Ninja" },
  ];

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
            Create an account to join the ranks of Grandmasters, engage in low-latency 1v1 duels, and claim your coding rating.
          </p>

          <div className="w-full max-w-lg aspect-video rounded-xl overflow-hidden glass-panel relative group border border-white/5">
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
          
          <header className="mb-6 text-center lg:text-left">
            <h1 className="lg:hidden text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4 font-display-lg">
              CODEARENA
            </h1>
            <h2 className="text-2xl font-bold font-display-lg text-white mb-2">INITIALIZE ACCOUNT</h2>
            <p className="text-sm text-on-surface-variant font-body-md">Create your profile and start competing.</p>
          </header>

          {/* Social Auth */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button type="button" className="flex items-center justify-center gap-2 py-3 border border-white/10 rounded-lg text-xs font-bold tracking-wider font-mono text-on-surface hover:bg-white/5 hover:border-secondary/50 transition-all">
              <Github className="w-4 h-4" /> GITHUB
            </button>
            <button type="button" className="flex items-center justify-center gap-2 py-3 border border-white/10 rounded-lg text-xs font-bold tracking-wider font-mono text-on-surface hover:bg-white/5 hover:border-secondary/50 transition-all">
              <Chrome className="w-4 h-4" /> GOOGLE
            </button>
          </div>

          <div className="relative flex items-center justify-center mb-6">
            <div className="w-full h-px bg-white/10"></div>
            <span className="absolute bg-[#17171f] px-3 text-[10px] text-on-surface-variant tracking-[0.2em] font-mono">
              OR REGISTER WITH EMAIL
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-xs font-mono text-red-400 text-center animate-pulse">
              ⚠️ {error.toUpperCase()}
            </div>
          )}

          {/* Main Signup Form */}
          <form className="space-y-4" onSubmit={handleSignup}>
            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-wider font-mono text-on-surface-variant">EMAIL ADDRESS</label>
              <div className="relative border border-white/10 bg-surface-container-lowest rounded-lg focus-within:border-primary focus-within:shadow-[0_0_15px_rgba(221,183,255,0.25)] transition-all">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"><Mail className="w-4 h-4" /></span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-none py-2.5 pl-10 pr-4 text-white font-sans text-sm focus:outline-none focus:ring-0"
                  placeholder="cyber_coder@arena.io"
                  type="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-wider font-mono text-on-surface-variant">CODING ALIAS</label>
              <div className="relative border border-white/10 bg-surface-container-lowest rounded-lg focus-within:border-primary focus-within:shadow-[0_0_15px_rgba(221,183,255,0.25)] transition-all">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"><User className="w-4 h-4" /></span>
                <input
                  value={alias}
                  onChange={handleAliasChange}
                  className="w-full bg-transparent border-none py-2.5 pl-10 pr-4 text-white font-mono text-sm focus:outline-none focus:ring-0"
                  placeholder="e.g. cyber_samurai"
                  type="text"
                  required
                />
              </div>
            </div>

            {/* CHOOSE AVATAR WIDGET */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-wider font-mono text-on-surface-variant">AVATAR ENCRYPTOR</label>
              <div className="flex items-center gap-4 bg-surface-container-lowest p-3 rounded-lg border border-white/10">
                <div className="w-12 h-12 rounded bg-surface border border-primary/40 flex items-center justify-center p-0.5 shrink-0 shadow-[0_0_10px_rgba(221,183,255,0.2)]">
                  <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-contain" />
                </div>
                <div className="flex-grow space-y-2 overflow-hidden">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-[240px]">
                    {preconfiguredSeeds.map((seed) => (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => setAvatarSeed(seed)}
                        className={`w-6 h-6 rounded border shrink-0 overflow-hidden bg-surface p-0.5 transition-all ${
                          avatarSeed === seed ? "border-primary shadow-[0_0_8px_rgba(221,183,255,0.4)] scale-105" : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`} alt="preset" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                    className="text-[9px] text-secondary font-mono font-bold tracking-wider hover:underline flex items-center gap-1 uppercase"
                  >
                    🎲 RANDOMIZE CODE
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-wider font-mono text-on-surface-variant">SELECT CLASS</label>
              <div className="grid grid-cols-3 gap-2">
                {classOptions.map((opt) => (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setSelectedClass(opt.name)}
                    className={`py-2 rounded border font-semibold text-[10px] transition-all flex flex-col items-center gap-1 ${
                      selectedClass === opt.name
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-surface-container/50 border-white/5 text-on-surface-variant hover:border-white/20"
                    }`}
                  >
                    {opt.name === "Algorithms" && <Zap className="w-3.5 h-3.5" />}
                    {opt.name === "Systems" && <Cpu className="w-3.5 h-3.5" />}
                    {opt.name === "Frontend" && <User className="w-3.5 h-3.5" />}
                    {opt.desc}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold tracking-wider font-mono text-on-surface-variant">PASSWORD</label>
              <div className="relative border border-white/10 bg-surface-container-lowest rounded-lg focus-within:border-primary focus-within:shadow-[0_0_15px_rgba(221,183,255,0.25)] transition-all">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"><Lock className="w-4 h-4" /></span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-none py-2.5 pl-10 pr-4 text-white font-sans text-sm focus:outline-none focus:ring-0"
                  placeholder="••••••••••••"
                  type="password"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-lg text-xs font-bold tracking-widest font-mono hover:shadow-[0_0_30px_rgba(132,43,210,0.6)] transition-all active:scale-[0.98] duration-200 mt-2 flex items-center justify-center gap-2 disabled:opacity-50">
              <Swords className="w-4 h-4" /> {isSubmitting ? "ENCRYPTING CORES..." : "INITIALIZE PROFILE"}
            </button>
          </form>

          <footer className="mt-6 text-center">
            <p className="text-on-surface-variant text-sm">
              ALREADY REGISTERED?
              <Link className="font-bold text-primary hover:underline ml-1" to="/login">ACCESS TERMINAL</Link>
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
