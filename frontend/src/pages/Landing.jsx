import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swords, Play, Zap, Trophy, Shield, Cpu, Terminal, Users, ArrowRight, Activity, Calendar } from "lucide-react";
import BackgroundShader from "../components/BackgroundShader";

export default function Landing() {
  const navigate = useNavigate();

  // Timer state for Live Match preview
  const [timer, setTimer] = useState({ h: 3, m: 45, s: 12 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) {
          s = 59;
          m--;
        }
        if (m < 0) {
          m = 59;
          h--;
        }
        if (h < 0) {
          // Reset timer
          h = 3;
          m = 45;
          s = 12;
        }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeVal = (val) => String(val).padStart(2, "0");

  return (
    <div className="pt-20 min-h-screen relative overflow-hidden bg-[#131318] text-[#e4e1e9]">
      <BackgroundShader />
      <div className="fixed inset-0 z-[-2] grid-bg opacity-30 pointer-events-none"></div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden py-12">
        <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
              <Zap className="text-primary w-4 h-4 animate-pulse" />
              <span className="font-label-caps text-xs text-primary font-mono tracking-wider">Season 4 Now Live</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight font-display-lg text-white leading-tight">
              Where Coders <br />{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary drop-shadow-[0_0_20px_rgba(221,183,255,0.3)]">
                Battle For Glory
              </span>
            </h1>

            <p className="text-base md:text-lg text-on-surface-variant font-body-md max-w-lg leading-relaxed">
              Challenge developers in real-time coding duels. Solve problems faster, climb the leaderboard, and prove you're the ultimate programmer.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate("/matchmaking")}
                className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-on-primary font-bold tracking-wider rounded-lg shadow-[0_0_25px_rgba(221,183,255,0.35)] hover:shadow-[0_0_35px_rgba(221,183,255,0.6)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span>Start Battle</span>
                <Swords className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/battle/demo-match")}
                className="px-8 py-4 border border-secondary/40 text-secondary font-semibold rounded-lg bg-secondary/5 hover:bg-secondary/15 hover:border-secondary transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span>Watch Live Matches</span>
                <Play className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="glass-panel p-2 rounded-xl border border-white/10 shadow-2xl relative z-20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 pointer-events-none"></div>
              <img
                className="w-full rounded-lg shadow-inner object-cover"
                alt="A futuristic 3D mockup of a coding battlefield arena on a holographic display."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDesgmGM0mp4buXeGeQAQ2wyBMC3YapRg_0c2EVUv8T58we0OFMkbBnLgbkxTLP1R03UWTKY8cJCrpPmu4nmEZvQJXco5OaEsfH0yJOwBcudxshSA8DhwPWiqojb-n6y_BmnL5ggzBy0yVhOctZk4jJbsnZB_fl_D5Jk0W15CdGttIUaEoJ2DCVH17HoSmzGa95lrPGBLAfAbviRDmYcWpeQuO4oPz0ga98DcNMirVLXGakwLUfNYwrgTHAz2SrR2nRdPl0T3jbg"
              />
              
              {/* Floating HUD Element */}
              <div className="absolute -top-4 -right-4 glass-panel p-4 rounded-lg border border-primary/30 shadow-[0_0_20px_rgba(221,183,255,0.15)] animate-bounce" style={{ animationDuration: "3s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border border-primary">
                    <Trophy className="text-primary w-5 h-5" />
                  </div>
                  <div className="text-left font-mono">
                    <p className="text-[10px] text-on-surface-variant font-bold">Global Rank</p>
                    <p className="text-lg font-black text-white">#124</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Glow behind image */}
            <div className="absolute inset-0 bg-primary/20 blur-[120px] -z-10"></div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-outline-variant/20 bg-surface-container-lowest/80">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center group">
              <p className="text-4xl md:text-5xl font-black text-primary group-hover:scale-110 transition-transform font-display-lg">50k+</p>
              <p className="text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-2 font-mono">Battles Played</p>
            </div>
            <div className="text-center group">
              <p className="text-4xl md:text-5xl font-black text-secondary group-hover:scale-110 transition-transform font-display-lg">20k+</p>
              <p className="text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-2 font-mono">Elite Coders</p>
            </div>
            <div className="text-center group">
              <p className="text-4xl md:text-5xl font-black text-primary group-hover:scale-110 transition-transform font-display-lg">100+</p>
              <p className="text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-2 font-mono">Daily Matches</p>
            </div>
            <div className="text-center group">
              <p className="text-4xl md:text-5xl font-black text-secondary group-hover:scale-110 transition-transform font-display-lg">99.9%</p>
              <p className="text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-2 font-mono">Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white font-display-lg">The Developer's Combat Deck</h2>
            <p className="text-on-surface-variant max-w-xl mx-auto text-sm md:text-base">
              Engineered for speed, precision, and the ultimate competitive experience.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {/* Feature 1 */}
            <div className="glass-panel p-8 rounded-xl border-l-4 border-l-primary hover:-translate-y-2 transition-all duration-300 relative group overflow-hidden">
              <div className="scanner-effect absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Swords className="text-primary w-10 h-10 mb-6" />
              <h3 className="text-lg font-bold text-white mb-3 font-headline-md">Real-Time Battles</h3>
              <p className="text-on-surface-variant text-xs md:text-sm leading-relaxed">
                Head-to-head coding challenges with instant synchronization and peer monitoring.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="glass-panel p-8 rounded-xl border-l-4 border-l-secondary hover:-translate-y-2 transition-all duration-300 group overflow-hidden">
              <Activity className="text-secondary w-10 h-10 mb-6" />
              <h3 className="text-lg font-bold text-white mb-3 font-headline-md">AI Matchmaking</h3>
              <p className="text-on-surface-variant text-xs md:text-sm leading-relaxed">
                Advanced algorithms ensure you're always fighting opponents at your exact skill level.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="glass-panel p-8 rounded-xl border-l-4 border-l-primary hover:-translate-y-2 transition-all duration-300 group overflow-hidden">
              <Cpu className="text-primary w-10 h-10 mb-6" />
              <h3 className="text-lg font-bold text-white mb-3 font-headline-md">Live Execution</h3>
              <p className="text-on-surface-variant text-xs md:text-sm leading-relaxed">
                Blazing fast compilers execute your code across 20+ languages in milliseconds.
              </p>
            </div>
            {/* Feature 4 */}
            <div className="glass-panel p-8 rounded-xl border-l-4 border-l-secondary hover:-translate-y-2 transition-all duration-300 group overflow-hidden">
              <Trophy className="text-secondary w-10 h-10 mb-6" />
              <h3 className="text-lg font-bold text-white mb-3 font-headline-md">Global Rank</h3>
              <p className="text-on-surface-variant text-xs md:text-sm leading-relaxed">
                Climb from Bronze to Legend status and earn unique badges for your profile.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Match HUD Preview */}
      <section className="py-24 bg-surface-container/60 relative">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 text-left">
            <div>
              <div className="flex items-center gap-2 text-error mb-2 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                <span className="font-label-caps text-xs tracking-wider font-mono font-bold">LIVE NOW</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white font-display-lg">Match #8,294: Global Semifinals</h2>
            </div>
            
            <div className="glass-panel px-6 py-2.5 rounded-full border border-primary/30 font-code-sm text-primary flex items-center gap-3 font-mono text-sm">
              <Calendar className="w-4 h-4" />
              <span>{formatTimeVal(timer.h)}:{formatTimeVal(timer.m)}:{formatTimeVal(timer.s)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 bg-[#1b1b20]/30 rounded-2xl overflow-hidden border border-white/5 shadow-xl text-left">
            {/* Player A */}
            <div className="bg-[#131318]/90 p-8 relative border-b lg:border-b-0 lg:border-r border-white/5">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded bg-primary/20 flex items-center justify-center font-bold text-primary border border-primary/50 text-lg font-mono">A</div>
                  <div>
                    <p className="text-lg font-extrabold text-white font-display-lg">Player_Alpha</p>
                    <p className="font-code-sm text-secondary text-xs font-mono">Level 82 Wizard</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-primary font-display-lg">78%</p>
              </div>
              
              <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full bg-primary" style={{ width: "78%" }}></div>
              </div>
              
              <div className="mt-8 p-4 rounded-lg bg-surface-container-lowest/80 border border-white/5 font-mono text-xs text-on-surface-variant overflow-x-auto">
                <pre><code>{`function solve(n) {
  return Array.from({length: n}, 
    (_, i) => i).reduce((a, b) => ...`}</code></pre>
              </div>
            </div>

            {/* Player B */}
            <div className="bg-[#131318]/90 p-8 relative">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded bg-secondary/20 flex items-center justify-center font-bold text-secondary border border-secondary/50 text-lg font-mono">B</div>
                  <div>
                    <p className="text-lg font-extrabold text-white font-display-lg">Binary_Beast</p>
                    <p className="font-code-sm text-primary text-xs font-mono">Level 79 Ninja</p>
                  </div>
                </div>
                <p className="text-3xl font-bold text-secondary font-display-lg">64%</p>
              </div>

              <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full bg-secondary" style={{ width: "64%" }}></div>
              </div>

              <div className="mt-8 p-4 rounded-lg bg-surface-container-lowest/80 border border-white/5 font-mono text-xs text-on-surface-variant overflow-x-auto">
                <pre><code>{`const compute = (data) => {
  const result = data.map(item => {
    return calculate(item)...`}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-20 font-display-lg">The Path To Victory</h2>
          
          <div className="relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-primary via-secondary to-transparent hidden md:block -translate-x-1/2"></div>
            
            <div className="space-y-16">
              {/* Step 1 */}
              <div className="relative flex flex-col md:flex-row items-center gap-12 text-left md:text-right group">
                <div className="md:w-1/2 md:pr-6">
                  <h3 className="text-xl font-bold text-primary font-headline-md mb-2">01. Match Found</h3>
                  <p className="text-on-surface-variant text-sm md:text-base">
                    Our matchmaking engine pairs you with a worthy adversary in under 5 seconds.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#131318] border-4 border-primary flex items-center justify-center z-10 font-bold font-mono group-hover:scale-110 transition-transform">1</div>
                <div className="md:w-1/2"></div>
              </div>

              {/* Step 2 */}
              <div className="relative flex flex-col md:flex-row-reverse items-center gap-12 text-left group">
                <div className="md:w-1/2 md:pl-6">
                  <h3 className="text-xl font-bold text-secondary font-headline-md mb-2">02. Solve Challenge</h3>
                  <p className="text-on-surface-variant text-sm md:text-base">
                    Race against the clock to implement the most efficient solution to a complex algorithmic problem.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#131318] border-4 border-secondary flex items-center justify-center z-10 font-bold font-mono group-hover:scale-110 transition-transform">2</div>
                <div className="md:w-1/2"></div>
              </div>

              {/* Step 3 */}
              <div className="relative flex flex-col md:flex-row items-center gap-12 text-left md:text-right group">
                <div className="md:w-1/2 md:pr-6">
                  <h3 className="text-xl font-bold text-primary font-headline-md mb-2">03. Winner Declared</h3>
                  <p className="text-on-surface-variant text-sm md:text-base">
                    Validation happens instantly. Gain XP, climb the ranks, and earn your rewards.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#131318] border-4 border-primary flex items-center justify-center z-10 font-bold font-mono group-hover:scale-110 transition-transform">3</div>
                <div className="md:w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard Standings Preview */}
      <section className="py-24 bg-surface-container-low/70">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 text-left">
            <div className="lg:col-span-1 flex flex-col justify-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight font-display-lg">Arena Legends</h2>
              <p className="text-on-surface-variant text-sm md:text-base">
                The top 1% who have mastered the arena. Do you have what it takes to join them?
              </p>
              <button
                onClick={() => navigate("/leaderboard")}
                className="font-bold font-mono text-sm text-secondary hover:text-cyan-400 flex items-center gap-2 group tracking-widest"
              >
                <span>VIEW FULL LEADERBOARD</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
              {/* Rank 1 */}
              <div className="glass-panel p-6 rounded-xl flex items-center justify-between border border-primary/30 shadow-[0_0_20px_rgba(221,183,255,0.1)]">
                <div className="flex items-center gap-6">
                  <span className="text-3xl font-extrabold text-primary font-mono opacity-65">01</span>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-primary text-xl border border-primary/30">
                      <Shield className="w-5 h-5 fill-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white font-display-lg">null_pointer_ex</p>
                      <p className="text-xs text-secondary font-mono">Level 99 • 15.4k Wins</p>
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <p className="text-[10px] text-primary font-bold">MMR</p>
                  <p className="text-lg font-extrabold text-white">4,892</p>
                </div>
              </div>

              {/* Rank 2 */}
              <div className="glass-panel p-6 rounded-xl flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-6">
                  <span className="text-3xl font-extrabold text-secondary font-mono opacity-65">02</span>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-secondary text-xl border border-secondary/30">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white font-display-lg">stack_king</p>
                      <p className="text-xs text-primary font-mono">Level 95 • 12.1k Wins</p>
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <p className="text-[10px] text-secondary font-bold">MMR</p>
                  <p className="text-lg font-extrabold text-white">4,521</p>
                </div>
              </div>

              {/* Rank 3 */}
              <div className="glass-panel p-6 rounded-xl flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-6">
                  <span className="text-3xl font-extrabold text-on-surface-variant font-mono opacity-30">03</span>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-on-surface-variant text-xl border border-white/10">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white font-display-lg">code_bender</p>
                      <p className="text-xs text-secondary font-mono">Level 92 • 10.8k Wins</p>
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <p className="text-[10px] text-on-surface-variant font-bold">MMR</p>
                  <p className="text-lg font-extrabold text-white">4,210</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tournament CTA */}
      <section className="py-24 px-6">
        <div className="max-w-[1440px] mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 p-12 md:p-24 text-center">
            <div className="absolute inset-0 bg-[#0d0d12]/40 backdrop-blur-sm -z-10"></div>
            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl md:text-6xl font-extrabold text-white font-display-lg leading-tight">
                Ready To Become The <br />Coding Champion?
              </h2>
              <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
                The winter tournament begins in 48 hours. $10,000 prize pool. Elite glory awaits.
              </p>
              <button
                onClick={() => navigate("/signup")}
                className="px-12 py-5 bg-white text-black font-bold font-mono text-xs tracking-widest rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:bg-primary hover:text-white hover:shadow-[0_0_35px_rgba(221,183,255,0.6)] hover:scale-105 active:scale-95 transition-all duration-300"
              >
                JOIN TOURNAMENT
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-lowest/80 border-t border-outline-variant/30 w-full py-12 text-left font-mono">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="text-xl font-bold text-white font-display-lg">CodeArena</div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Elite Performance Engineering for the next generation of software masters.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded bg-[#1f1f24] border border-white/5 flex items-center justify-center hover:text-secondary hover:border-secondary transition-colors">
                <Activity className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded bg-[#1f1f24] border border-white/5 flex items-center justify-center hover:text-secondary hover:border-secondary transition-colors">
                <Terminal className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded bg-[#1f1f24] border border-white/5 flex items-center justify-center hover:text-secondary hover:border-secondary transition-colors">
                <Users className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-6">Platform</h4>
            <ul className="space-y-4 text-xs text-on-surface-variant font-medium">
              <li><Link to="/matchmaking" className="hover:text-secondary transition-colors">Battles</Link></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Tournaments</a></li>
              <li><Link to="/leaderboard" className="hover:text-secondary transition-colors">Leaderboard</Link></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Challenges</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-6">Company</h4>
            <ul className="space-y-4 text-xs text-on-surface-variant font-medium">
              <li><a href="#" className="hover:text-secondary transition-colors">About</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">API</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Blog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-6">Legal</h4>
            <ul className="space-y-4 text-xs text-on-surface-variant font-medium">
              <li><a href="#" className="hover:text-secondary transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-secondary transition-colors">Security</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 md:px-12 mt-12 pt-8 border-t border-outline-variant/10 text-center text-xs text-on-surface-variant">
          <p>© 2026 CodeArena. Elite Performance Engineering.</p>
        </div>
      </footer>
    </div>
  );
}
