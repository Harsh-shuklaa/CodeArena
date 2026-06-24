import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Swords, Play, Zap, ShieldAlert, Cpu, History, Trophy, Users, Check, ChevronDown, Send } from "lucide-react";
import BackgroundShader from "../components/BackgroundShader";

export default function Landing() {
  const [onlineUsers, setOnlineUsers] = useState(24582);
  const [alias, setAlias] = useState("cyber_samurai");
  const [selectedClass, setSelectedClass] = useState("Algorithms");
  const [activeFaq, setActiveFaq] = useState(null);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Stats ticking effect
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers((prev) => prev + Math.floor(Math.random() * 9) - 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-secondary" />,
      title: "Matchmaking in Seconds",
      desc: "Our intelligent Elo-based matchmaking engine pairs you with coders of similar skill level instantly. No long lobbies, no waiting.",
    },
    {
      icon: <ShieldAlert className="w-6 h-6 text-primary" />,
      title: "Anti-Cheat System",
      desc: "Next-gen anti-cheat using advanced code AST analysis, tab-out monitoring, and secondary device detection. Keep coding fair.",
    },
    {
      icon: <Cpu className="w-6 h-6 text-secondary" />,
      title: "Sandboxed Execution",
      desc: "All submissions run instantly on isolated, secure environments across 20+ programming languages, providing sub-millisecond execution times.",
    },
    {
      icon: <History className="w-6 h-6 text-primary" />,
      title: "Visual Code Playback",
      desc: "Analyze every single keystroke. Watch frame-by-frame playbacks of your opponent's matches to learn their strategies and shortcuts.",
    },
    {
      icon: <Trophy className="w-6 h-6 text-secondary" />,
      title: "Weekly Cups & Prizes",
      desc: "Participate in sponsored tournaments with cash prizes and global sponsorships. Prove your value to tech recruiters worldwide.",
    },
    {
      icon: <Users className="w-6 h-6 text-primary" />,
      title: "Guilds & Clan Wars",
      desc: "Assemble a team of developers, challenge rival guilds, and conquer seasonal leaderboards in team battles.",
    },
  ];

  const classOptions = [
    {
      name: "Algorithms",
      rating: "1820",
      stat1Label: "Speed",
      stat1Val: "95%",
      stat2Label: "Logic",
      stat2Val: "98%",
      badge: "Grandmaster Class",
      desc: "Algorithmic Master",
    },
    {
      name: "Systems",
      rating: "1750",
      stat1Label: "Memory",
      stat1Val: "99%",
      stat2Label: "Safety",
      stat2Val: "94%",
      badge: "Systems Engineer",
      desc: "Systems Guru",
    },
    {
      name: "Frontend",
      rating: "1650",
      stat1Label: "Layout",
      stat1Val: "98%",
      stat2Label: "CSS Art",
      stat2Val: "92%",
      badge: "Pixel Wizard",
      desc: "CSS Ninja",
    },
  ];

  const currentClassData = classOptions.find((c) => c.name === selectedClass) || classOptions[0];

  const faqs = [
    {
      q: "How is code correctness verified in real-time?",
      a: "Every time you press submit (or when autosave runs), your code is sent to our sandboxed cloud executors. We execute your code against custom visible and hidden test cases, checking runtime performance, memory usage, and structural constraints in real-time.",
    },
    {
      q: "What languages are supported on CodeArena?",
      a: "We support all major languages including Python 3, JavaScript (Node.js), C++, Java, Rust, Go, TypeScript, C#, Kotlin, Swift, Ruby, and many more. Our IDE comes equipped with autocomplete and linting for all major options.",
    },
    {
      q: "How does the ELO rating system work?",
      a: "Our system uses an adapted Chess Elo rating system. When you win a duel, you gain rating points depending on your opponent's rating. If you defeat a higher-rated player, you gain more points. Matchmaking matches you with users within 100 Elo points to ensure fair play.",
    },
    {
      q: "Can recruiters really see my profile?",
      a: "Yes! We partner with top tech companies looking for fast, efficient, and logical engineers. With a Grandmaster tier or verified profile, you can choose to make your stats and past match replays visible to vetted recruiters seeking programming talent.",
    },
  ];

  return (
    <div className="pt-20 min-h-screen relative overflow-hidden">
      <BackgroundShader />
      <div className="fixed inset-0 z-[-2] grid-bg opacity-30 pointer-events-none"></div>

      {/* Hero Section */}
      <section className="relative px-6 md:px-12 py-16 md:py-28 max-w-[1440px] mx-auto text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary tracking-wider mb-6 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
          SEASON 4 IS NOW LIVE
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight font-display-lg text-white max-w-4xl mx-auto leading-tight">
          The Ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary drop-shadow-[0_0_30px_rgba(221,183,255,0.3)]">1v1 Coding</span> Battleground
        </h1>

        <p className="text-base md:text-lg text-on-surface-variant font-body-md max-w-2xl mx-auto mt-6 leading-relaxed">
          Duel players worldwide in real-time coding matches. Solve algorithmic challenges, test speed, optimization, and edge cases, and climb the ranks from Bronze to Grandmaster.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-10">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-8 py-4 bg-primary text-on-primary rounded font-bold hover:shadow-[0_0_35px_rgba(221,183,255,0.6)] hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 text-base"
          >
            <Swords className="w-5 h-5" /> Enter Arena Free
          </Link>
          <Link
            to="/battle/demo-match"
            className="w-full sm:w-auto px-8 py-4 bg-surface/50 text-white rounded font-bold border border-white/10 hover:bg-surface/85 hover:border-white/20 transition-all duration-300 flex items-center justify-center gap-2 text-base backdrop-blur"
          >
            <Play className="w-5 h-5" /> Watch Live Battle
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-20 p-8 glass-panel rounded-2xl relative">
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl md:text-4xl font-extrabold text-white font-display-lg">
              {onlineUsers.toLocaleString()}
            </span>
            <span className="text-xs text-on-surface-variant tracking-wider uppercase mt-2">Coders Online</span>
          </div>
          <div className="hidden md:block w-[1px] h-12 bg-white/10 self-center justify-self-center"></div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl md:text-4xl font-extrabold text-white font-display-lg">1.8M+</span>
            <span className="text-xs text-on-surface-variant tracking-wider uppercase mt-2">Matches Completed</span>
          </div>
          <div className="hidden md:block w-[1px] h-12 bg-white/10 self-center justify-self-center"></div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl md:text-4xl font-extrabold text-white font-display-lg">150+</span>
            <span className="text-xs text-on-surface-variant tracking-wider uppercase mt-2">Supported Languages</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-6 md:px-12 py-16 md:py-24 max-w-[1440px] mx-auto z-10 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold font-display-lg text-white">Engineered For Competitors</h2>
          <p className="text-sm md:text-base text-on-surface-variant font-body-md max-w-xl mx-auto mt-3">
            Experience a cutting-edge platform designed to offer lag-free matchmaking, secure code execution, and high-fidelity stats tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feat, i) => (
            <div
              key={i}
              className="p-8 glass-panel rounded-xl hover:border-primary/50 hover:shadow-[0_0_30px_rgba(221,183,255,0.1)] transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center border border-white/10 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">
                {feat.icon}
              </div>
              <h3 className="text-xl font-bold text-white mt-6 font-headline-md">{feat.title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mt-3">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Alias Generator Section */}
      <section className="relative px-6 md:px-12 py-16 md:py-24 max-w-[1440px] mx-auto z-10 border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Input Form */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold font-display-lg text-white">Claim Your Coding Persona</h2>
            <p className="text-sm md:text-base text-on-surface-variant max-w-lg leading-relaxed">
              Enter your username and select your core class to generate your personalized CodeArena player card.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                  Enter Coding Alias
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-mono font-bold">&gt;_</span>
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 15))}
                    placeholder="e.g. cyber_samurai"
                    className="w-full pl-10 pr-4 py-3 bg-surface-container rounded border border-white/10 focus:border-primary focus:outline-none text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                  Select Your Class
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {classOptions.map((opt) => (
                    <button
                      key={opt.name}
                      onClick={() => setSelectedClass(opt.name)}
                      className={`py-3 rounded border font-semibold text-xs transition-all flex flex-col items-center gap-1 ${
                        selectedClass === opt.name
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-surface-container/50 border-white/5 text-on-surface-variant hover:border-white/20"
                      }`}
                    >
                      {opt.name === "Algorithms" && <Zap className="w-4 h-4" />}
                      {opt.name === "Systems" && <Cpu className="w-4 h-4" />}
                      {opt.name === "Frontend" && <Users className="w-4 h-4" />}
                      {opt.desc}
                    </button>
                  ))}
                </div>
              </div>

              <Link
                to={`/signup?alias=${alias}&class=${selectedClass}`}
                className="w-full block py-4 text-center bg-primary text-on-primary rounded font-bold hover:shadow-[0_0_25px_rgba(221,183,255,0.4)] transition-all mt-4"
              >
                Register Arena Account
              </Link>
            </div>
          </div>

          {/* Right: Card Preview */}
          <div className="flex justify-center">
            <div className="relative w-80 h-[420px] rounded-2xl glass-panel p-6 overflow-hidden border border-white/10 flex flex-col justify-between shadow-[0_0_50px_rgba(168,85,247,0.15)] group hover:border-primary/50 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

              <div className="flex justify-between items-center z-10">
                <span className="px-2 py-0.5 rounded bg-primary/20 text-[10px] font-bold text-primary font-mono tracking-wider">
                  {currentClassData.badge}
                </span>
                <span className="font-mono text-sm text-secondary font-bold">{currentClassData.rating} ELO</span>
              </div>

              <div className="flex flex-col items-center z-10 mt-4">
                <div className="w-24 h-24 rounded-full border-2 border-primary/40 bg-surface-container overflow-hidden flex items-center justify-center p-2 mb-4 group-hover:scale-105 transition-transform duration-300">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${alias || "codearena"}`}
                    alt="User Avatar"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h4 className="text-xl font-bold font-display-lg text-white tracking-wide">
                  {alias || "cyber_samurai"}
                </h4>
              </div>

              <div className="space-y-3 z-10 mt-6 bg-[#0d0d12]/60 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant font-medium">Specialty</span>
                  <span className="text-white font-semibold font-mono">{currentClassData.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant font-medium">{currentClassData.stat1Label}</span>
                  <span className="text-secondary font-semibold font-mono">{currentClassData.stat1Val}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant font-medium">{currentClassData.stat2Label}</span>
                  <span className="text-primary font-semibold font-mono">{currentClassData.stat2Val}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-mono mt-4 z-10 border-t border-white/5 pt-3">
                <span>SYSTEM INITIALIZED</span>
                <span className="text-green-400 animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> ONLINE
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative px-6 md:px-12 py-16 md:py-24 max-w-[1440px] mx-auto z-10 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold font-display-lg text-white">Upgrade Your Gear</h2>
          <p className="text-sm md:text-base text-on-surface-variant font-body-md max-w-xl mx-auto mt-3">
            Start for free and unlock advanced analytics, customizable arenas, and priority matchmaking as you level up.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-8 glass-panel rounded-xl flex flex-col justify-between hover:border-white/20 transition-all duration-300">
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">RECRUIT</span>
              <h3 className="text-2xl font-bold text-white mt-2">Initiate</h3>
              <div className="text-4xl font-extrabold text-white mt-4">$0 <span className="text-xs text-on-surface-variant font-normal">/forever</span></div>
              <p className="text-xs text-on-surface-variant mt-4">Perfect for casual practice and introductory duels.</p>
              <ul className="space-y-3 mt-6 text-sm text-on-surface-variant">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary shrink-0" /> 5 Ranked Duels per day</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary shrink-0" /> Access to 10 Languages</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary shrink-0" /> Global Public Chat</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary shrink-0" /> Standard Matchmaking</li>
              </ul>
            </div>
            <Link to="/signup" className="w-full mt-8 py-3 text-center bg-surface/50 text-white rounded font-bold border border-white/10 hover:bg-surface/80 transition-all text-sm">
              Get Started
            </Link>
          </div>

          {/* Card 2 */}
          <div className="p-8 glass-panel rounded-xl flex flex-col justify-between border-primary/40 relative hover:border-primary transition-all duration-300 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
            <span className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 rounded-full bg-primary text-[10px] font-bold text-on-primary uppercase tracking-wider">
              MOST POPULAR
            </span>
            <div>
              <span className="text-[10px] font-bold text-primary tracking-wider uppercase">WARRIOR</span>
              <h3 className="text-2xl font-bold text-white mt-2">Pro Duelist</h3>
              <div className="text-4xl font-extrabold text-white mt-4">$9 <span className="text-xs text-on-surface-variant font-normal">/month</span></div>
              <p className="text-xs text-on-surface-variant mt-4">For serious competitors who want to climb the ladder fast.</p>
              <ul className="space-y-3 mt-6 text-sm text-on-surface-variant">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Unlimited Ranked Duels</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Access to all 20+ Languages</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Advanced IDE Auto-complete</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Detailed Code Analytics</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Priority Matchmaking</li>
              </ul>
            </div>
            <Link to="/signup" className="w-full mt-8 py-3 text-center bg-primary text-on-primary rounded font-bold hover:shadow-[0_0_20px_rgba(221,183,255,0.4)] transition-all text-sm">
              Unlock Pro
            </Link>
          </div>

          {/* Card 3 */}
          <div className="p-8 glass-panel rounded-xl flex flex-col justify-between hover:border-white/20 transition-all duration-300">
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">ELITE</span>
              <h3 className="text-2xl font-bold text-white mt-2">Grandmaster</h3>
              <div className="text-4xl font-extrabold text-white mt-4">$29 <span className="text-xs text-on-surface-variant font-normal">/month</span></div>
              <p className="text-xs text-on-surface-variant mt-4">Designed for guilds, professional teams, and job seekers.</p>
              <ul className="space-y-3 mt-6 text-sm text-on-surface-variant">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary shrink-0" /> Everything in Pro</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary shrink-0" /> Private Custom Lobbies</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary shrink-0" /> Verified Recruiter Profile Badge</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary shrink-0" /> Direct Application to Sponsors</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-secondary shrink-0" /> Custom Avatar & Custom Styles</li>
              </ul>
            </div>
            <Link to="/signup" className="w-full mt-8 py-3 text-center bg-surface/50 text-white rounded font-bold border border-white/10 hover:bg-surface/80 transition-all text-sm">
              Join Elite Tier
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative px-6 md:px-12 py-16 md:py-24 max-w-[1440px] mx-auto z-10 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold font-display-lg text-white">Frequently Answered Queries</h2>
          <p className="text-sm md:text-base text-on-surface-variant font-body-md max-w-xl mx-auto mt-3">
            Everything you need to know about matchmaking, execution, and tournament structures.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} className="glass-panel rounded-xl overflow-hidden border border-white/5 transition-all">
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex justify-between items-center font-semibold text-white hover:text-primary transition-colors focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-on-surface-variant transform transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-on-surface-variant leading-relaxed border-t border-white/5 pt-4 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Newsletter / Contact Section */}
      <section className="relative px-6 md:px-12 py-16 md:py-24 max-w-[1440px] mx-auto z-10 border-t border-white/5">
        <div className="glass-panel p-8 md:p-12 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold font-display-lg text-white">Stay Up to Date</h3>
            <p className="text-sm text-on-surface-variant mt-3 max-w-md leading-relaxed font-body-md">
              Subscribe to our newsletter for patch updates, custom tournament alerts, and new challenge notifications.
            </p>
            <div className="mt-8 space-y-3 font-mono text-xs text-on-surface-variant">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[18px]">mail</span>
                <span>support@codearena.dev</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[18px]">map-pin</span>
                <span>Cyberspace, Node #8892</span>
              </div>
            </div>
          </div>

          <div>
            {formSubmitted ? (
              <div className="p-6 bg-primary/10 border border-primary/20 rounded-xl text-center">
                <span className="material-symbols-outlined text-primary text-[36px] mb-2 animate-bounce">check_circle</span>
                <h4 className="text-lg font-bold text-white font-display-lg">Message Sent Successfully!</h4>
                <p className="text-xs text-on-surface-variant mt-1">Welcome to the Arena. Check your email for validation.</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setFormSubmitted(true);
                }}
                className="space-y-4"
              >
                <div>
                  <input
                    type="text"
                    placeholder="Name"
                    required
                    className="w-full px-4 py-3 bg-surface-container rounded border border-white/5 focus:border-primary focus:outline-none text-white text-sm"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    className="w-full px-4 py-3 bg-surface-container rounded border border-white/5 focus:border-primary focus:outline-none text-white text-sm"
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Message / Feedback (Optional)"
                    rows={3}
                    className="w-full px-4 py-3 bg-surface-container rounded border border-white/5 focus:border-primary focus:outline-none text-white text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-primary text-on-primary rounded font-bold hover:shadow-[0_0_20px_rgba(221,183,255,0.4)] transition-all flex items-center justify-center gap-2 text-sm"
                >
                  Submit Inquiry <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
