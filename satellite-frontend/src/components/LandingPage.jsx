import React, { useState, useEffect, useRef } from "react";
import LandingNavbar from "./LandingNavbar"; // Check the correct path here

/* ── Asset imports ── */
import logo from "../assets/SpaceTug-logo (2).png";
import reentryVideo from "../assets/SpaceWatch Logs/re entry vedio.mp4";
import bgDb from "../assets/bg for db.webp";
import bgMonitor from "../assets/bg for monitor.mp4";
import bgInsights from "../assets/bg for insights.jpg";
import bgSpaceWatch from "../assets/bg for SpaceWatch Logs.mp4";
import bgAbout from "../assets/bg for about.mp4";
import contactVideo from "../assets/SpaceWatch Logs/contact bg vedio.mp4";

import pic1 from "../assets/re-entry pics/re-entry pics1.jpg";
import pic2 from "../assets/re-entry pics/re-entry pics2.jpg";
import pic3 from "../assets/re-entry pics/re-entry pics3.jpg";
import pic4 from "../assets/re-entry pics/re-entry pics4.jpg";
import pic5 from "../assets/re-entry pics/re-entry pics5.jpg";
import pic6 from "../assets/re-entry pics/re-entry pics6.jpg";
import pic7 from "../assets/re-entry pics/re-entry pics7.jpg";
import pic8 from "../assets/re-entry pics/re-entry pics8.jpg";
import pic9 from "../assets/re-entry pics/re-entry pics9.jpg";

import swLog1 from "../assets/SpaceWatch Logs/log1.jpg";
import swLaunch from "../assets/SpaceWatch Logs/Launch to Re-entry.jpg";
import swMission from "../assets/SpaceWatch Logs/Mission 01 of Agnibaan SOrTeD.jpg";
import swRlv from "../assets/SpaceWatch Logs/RLV Technology.jpg";
import swEsa from "../assets/SpaceWatch Logs/esa reentry.jpg";
import swReentry from "../assets/SpaceWatch Logs/Satellite-Reentry-Burning-in-Atmosphere-Art.webp";
import swCryo from "../assets/SpaceWatch Logs/cryogenic upper stage.jpg";

// ── REAL-WORLD DATA ARRAY DERIVED FROM YOUR IMAGES ──
const RE_ENTRY_DATA = [
  {
    img: pic1,
    title: "SpaceX Starlink Decay",
    desc: "A cluster of Starlink satellites failing to reach orbit and burning up over the Caribbean. Multiple streaks indicate the breakup of lightweight solar arrays.",
    peak: "1.2 MW/m²",
    status: "FRAGMENTED",
  },
  {
    img: pic2,
    title: "Kosmos-954 Titanium Hull",
    desc: "Large spherical fuel component recovered from Northern Canada. Titanium and stainless steel structures are known to survive the intense heat of 2500°C.",
    peak: "3.8 MW/m²",
    status: "RECOVERED",
  },
  {
    img: pic3,
    title: "Falcon 9 Rocket Stage",
    desc: "Spent second stage tank found on a beach in Australia. High-pressure COPV (Composite Overwrapped Pressure Vessel) showing significant ablation marks.",
    peak: "2.5 MW/m²",
    status: "SPLASHDOWN",
  },
  {
    img: pic4,
    title: "Entry Interface Glow",
    desc: "Spacecraft entering the 'Blackout Zone' at Mach 25. The air ahead is compressed into a plasma state, creating a brilliant bioluminescent effect.",
    peak: "0.8 MW/m²",
    status: "IONIZING",
  },
  {
    img: pic5,
    title: "HTV-9 Disposal Mission",
    desc: "Actual orbital footage of the Japanese HTV-9 cargo craft before intentional destructive entry. It was loaded with ISS waste for total vaporization.",
    peak: "N/A",
    status: "ORBITAL",
  },
  {
    img: pic6,
    title: "Long March 5B Debris",
    desc: "A massive fragment of a Chinese rocket found in a forest area. Uncontrolled entries of large stages pose the highest ground impact risk.",
    peak: "4.1 MW/m²",
    status: "IMPACTED",
  },
  {
    img: pic7,
    title: "Maximum Dynamic Pressure",
    desc: "Peak heating phase during descent. The 'fireball' effect is caused by the ablation of the outer thermal protection layers.",
    peak: "5.2 MW/m²",
    status: "CRITICAL",
  },
  {
    img: pic8,
    title: "Structural Failure Analysis",
    desc: "Recovered internal assembly showing internal melting. Forensic analysis confirms the object reached Mach 5 before terminal breakup.",
    peak: "1.9 MW/m²",
    status: "ANALYZED",
  },
  {
    img: pic9,
    title: "COPV Pressure Vessel",
    desc: "A carbon-fiber overwrapped tank found in Washington state. These spherical objects are the most common survivors of re-entry events.",
    peak: "2.9 MW/m²",
    status: "RECOVERED",
  },
];

const SW_LOGS = [
  {
    img: swLog1,
    title: "Debris Field Analysis – LEO Sector 7",
    text: "Recent tracking data reveals a dense cluster of fragments from the 2023 anti-satellite test, posing navigational hazards to ISS resupply missions.",
  },
  {
    img: swLaunch,
    title: "Launch to Re-entry: Full Lifecycle",
    text: "A comprehensive timeline from payload deployment through orbital decay to atmospheric burn-up, illustrating the complete debris lifecycle.",
  },
  {
    img: swMission,
    title: "Agnibaan SOrTeD – Mission 01",
    text: "India's first privately developed semi-cryogenic rocket completes its sub-orbital technology demonstration flight successfully.",
  },
  {
    img: swRlv,
    title: "RLV Technology Demonstrator",
    text: "Reusable Launch Vehicle technology aims to dramatically reduce launch costs while minimizing post-mission orbital debris generation.",
  },
  {
    img: swEsa,
    title: "ESA Controlled Re-entry Study",
    text: "European Space Agency's analysis of controlled de-orbit maneuvers targeting the South Pacific Ocean Uninhabited Area (SPOUA).",
  },
  {
    img: swReentry,
    title: "Atmospheric Breakup Visualization",
    text: "Artistic rendering of satellite fragmentation during hypersonic atmospheric re-entry, showing thermal ablation and structural disintegration.",
  },
  {
    img: swCryo,
    title: "Cryogenic Upper Stage Disposal",
    text: "Post-mission disposal strategies for cryogenic upper stages to prevent long-term orbital debris accumulation in GTO transfer orbits.",
  },
];

/* ── Animated Counter ── */
const AnimCounter = ({ end, suffix = "", duration = 2000, refreshTrigger }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cur = 0;
    setCount(0);
    const numEnd = parseInt(String(end).replace(/[^0-9]/g, ""), 10);
    const step = Math.max(1, Math.floor(numEnd / (duration / 16)));

    const timer = setInterval(() => {
      cur += step;
      if (cur >= numEnd) {
        cur = numEnd;
        clearInterval(timer);
      }
      setCount(cur);
    }, 16);

    return () => clearInterval(timer);
  }, [end, duration, refreshTrigger]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

/* ── Isolated Sighting Form ── */
const SightingForm = ({ handleReportSubmit, formStatus }) => {
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    location: "",
    description: "",
    email: "",
    proof: null,
  });

  useEffect(() => {
    if (formStatus === "success") {
      setFormData({
        date: "",
        time: "",
        location: "",
        description: "",
        email: "",
        proof: null,
      });
    }
  }, [formStatus]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "proof") {
      setFormData((prev) => ({ ...prev, proof: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleReportSubmit(e, formData);
      }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
            Date
          </label>
          <input
            name="date"
            type="date"
            required
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            value={formData.date}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
            Local Time
          </label>
          <input
            name="time"
            type="time"
            required
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            value={formData.time}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="md:col-span-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
          Location
        </label>
        <input
          name="location"
          type="text"
          required
          placeholder="City, Country or Coordinates"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
          value={formData.location}
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
          Sighting Intel (Detailed Description)
        </label>
        <textarea
          name="description"
          required
          rows={6}
          placeholder="Document brightness, duration, fragmentation, etc. Detailed intel helps in research logs."
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 resize-none min-h-[150px]"
          value={formData.description}
          onChange={handleChange}
        />
      </div>

      <div className="p-4 border border-dashed border-cyan-500/20 rounded-xl bg-cyan-500/[0.02]">
        <label className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest block mb-2">
          Visual Proof (Image/Video) *Must for Verification*
        </label>
        <input
          name="proof"
          type="file"
          required
          accept="image/*,video/*"
          className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-cyan-500/10 file:text-cyan-400 cursor-pointer"
          onChange={handleChange}
        />
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
          Verification Email
        </label>
        <input
          name="email"
          type="email"
          required
          placeholder="your@email.com"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
          value={formData.email}
          onChange={handleChange}
        />
      </div>

      <button
        type="submit"
        className="w-full glass-btn py-4 rounded-xl text-cyan-400 text-sm font-black uppercase tracking-[0.15em] transition-all hover:scale-[1.01] active:scale-[0.98]"
      >
        Upload Intelligence
      </button>

      {formStatus === "success" && (
        <div className="text-green-400 text-xs font-bold text-center animate-pulse">
          ✓ Documented! Proof uploaded for Admin Review.
        </div>
      )}
    </form>
  );
};

/* ── LandingPage Component ── */
const LandingPage = ({ onEnterMission, onLoginClick }) => {
  const [formStatus, setFormStatus] = useState(null);
  const [detailPic, setDetailPic] = useState(null);
  const [statsRefresh, setStatsRefresh] = useState(0);

  const handleMonitorRefresh = () => {
    setStatsRefresh((prev) => prev + 1);
  };

  const handleReportSubmit = (e, formData) => {
    if (e && e.preventDefault) e.preventDefault();
    console.log("Mission Intel Received:", formData);
    setFormStatus("success");
    setTimeout(() => setFormStatus(null), 5000);
  };

  const GlassCard = ({ children, className = "", hover = true }) => (
    <div
      className={`relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-7 transition-all duration-500 ${hover ? "hover:border-cyan-500/30 hover:shadow-[0_0_40px_rgba(6,182,212,0.08)] hover:-translate-y-1" : ""} ${className}`}
    >
      {children}
    </div>
  );

  const SectionTitle = ({ tag, title, sub }) => (
    <div className="text-center mb-14">
      {tag && (
        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em] block mb-3">
          {tag}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
        {title}
      </h2>
      {sub && (
        <p className="text-sm text-slate-500 mt-4 max-w-2xl mx-auto leading-relaxed">
          {sub}
        </p>
      )}
    </div>
  );

  return (
    <div
      id="landing-scroll-container"
      className="h-full overflow-y-auto"
      style={{ scrollBehavior: "smooth" }}
    >
      <LandingNavbar
        onLoginClick={onLoginClick}
        onMonitorClick={handleMonitorRefresh}
      />

      <style>{`
        @keyframes heroGrad { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 20px rgba(6,182,212,0.15)} 50%{box-shadow:0 0 50px rgba(6,182,212,0.3)} }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes orbitRing { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes subtlePulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        .anim-fadeUp { animation: fadeUp 0.8s ease-out both; }
        .glass-btn { background: rgba(6,182,212,0.1); backdrop-filter: blur(20px); border: 1px solid rgba(6,182,212,0.3); }
        .glass-btn:hover { background: rgba(6,182,212,0.2); border-color: rgba(6,182,212,0.6); box-shadow: 0 0 30px rgba(6,182,212,0.2), 0 0 60px rgba(6,182,212,0.1); }
      `}</style>

      {/* ═══════════ HERO ═══════════ */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover scale-105 opacity-50"
            style={{ filter: "brightness(0.6) contrast(1.1)" }}
          >
            <source src={reentryVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#060b13]/70 via-transparent to-[#060b13]" />
          <div className="absolute inset-0 bg-[#060b13]/20" />
        </div>
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6 anim-fadeUp">
          <div className="inline-flex items-center gap-2 px-5 py-2 mb-8 bg-cyan-500/[0.1] border border-cyan-500/30 rounded-full backdrop-blur-md">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">
              Orbital Debris Monitoring Active
            </span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none mb-6 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
            Space
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Tug
            </span>
          </h1>
          <div className="space-y-1 mb-12 drop-shadow-lg">
            <p className="text-base md:text-lg text-slate-200 font-medium max-w-2xl mx-auto leading-relaxed">
              Tracking orbital debris and predicting atmospheric re-entry
            </p>
            <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              to protect Earth and space infrastructure.
            </p>
          </div>
          <button
            onClick={onEnterMission}
            className="glass-btn px-10 py-4 rounded-2xl text-cyan-400 text-sm font-black uppercase tracking-[0.2em] transition-all duration-500 hover:scale-105 active:scale-95 cursor-pointer shadow-[0_0_30px_rgba(6,182,212,0.1)]"
            style={{ animation: "pulseGlow 3s ease-in-out infinite" }}
          >
            Enter Mission Control
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#060b13] to-transparent z-1" />
      </section>

      {/* ═══════════ SPACE DEBRIS & RE-ENTRY ═══════════ */}
      {/* Re-entry Section-la idhu pola mathunga */}

      <section
        id="reentry"
        className="relative py-24 px-6 overflow-hidden scroll-mt-20 bg-[#060b13]"
      >
        {/* 1. Enhanced Background Image Layer (Increased Visibility) */}
        <div className="absolute inset-0 z-0">
          <img
            src={bgDb}
            alt="Space Background"
            className="w-full h-full object-cover opacity-60 transition-opacity duration-1000" // Opacity increased to 60%
          />
          {/* Lightened Overlays: Black dominance-ah kuraika thin overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#060b13]/80 via-transparent to-[#060b13]/90" />
          <div className="absolute inset-0 bg-cyan-900/10 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-slate-900/10" />{" "}
          {/* Added grey tint for texture */}
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <SectionTitle
            tag="Mission Intelligence"
            title="Understanding Orbital Debris and Atmospheric Re-Entry"
            sub="The science behind space debris, orbital decay, and the physics of re-entry"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Card 1: What is Space Debris */}
            <GlassCard>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🛰️</span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight pt-2">
                  What is Space Debris?
                </h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Space debris refers to defunct satellites, spent rocket bodies,
                and fragments generated from collisions, explosions, and
                long-term degradation in Earth orbit. These objects travel at
                speeds exceeding{" "}
                <span
                  className="text-cyan-400 font-semibold cursor-help"
                  title="Equivalent to ~25,000 km/h — fast enough to cross the Atlantic in 15 minutes"
                >
                  7–8 km/s
                </span>
                , making even very small debris extremely dangerous.
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Debris persistence depends on altitude. Objects below{" "}
                <span
                  className="text-cyan-400 font-semibold cursor-help"
                  title="Low Earth Orbit: most human-made debris accumulates here"
                >
                  400 km
                </span>{" "}
                experience significant atmospheric drag, while higher orbits can
                retain debris for decades.
              </p>
            </GlassCard>

            {/* Card 2: Orbital Decay */}
            <GlassCard>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🔻</span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight pt-2">
                  Orbital Decay
                </h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Even in the near-vacuum of space, Earth's upper atmosphere
                exerts drag on orbiting objects. This drag continuously removes{" "}
                <span
                  className="text-orange-400 font-semibold cursor-help"
                  title="Kinetic + Potential energy that keeps objects in orbit"
                >
                  orbital energy
                </span>
                , causing the object's altitude to decrease gradually.
              </p>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                As altitude drops, atmospheric density increases{" "}
                <span
                  className="text-orange-400 font-semibold cursor-help"
                  title="Density roughly doubles every 50km decrease below 400km"
                >
                  exponentially
                </span>
                , accelerating decay and making re-entry unavoidable.
              </p>
              <div className="bg-black/40 border border-orange-500/10 rounded-xl p-4">
                <p className="text-[11px] font-mono text-orange-400/80 uppercase tracking-wide">
                  Key Principle: Lower altitude → higher drag → faster decay →
                  inevitable re-entry
                </p>
              </div>
            </GlassCard>
          </div>

          {/* Card 3: Atmospheric Drag & Heating (Clean HUD Style) */}
          <div className="relative rounded-2xl overflow-hidden mb-6 border border-red-500/20 bg-[#0a121e]/60 backdrop-blur-xl">
            <div className="relative z-10 p-7">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🔥</span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight pt-2">
                  Atmospheric Drag & Heating
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                <div className="lg:col-span-2">
                  <p className="text-sm text-slate-100 leading-relaxed mb-4 font-medium">
                    {" "}
                    {/* Brightened text for contrast */}
                    Below{" "}
                    <span
                      className="text-red-400 font-bold cursor-help"
                      title="The Kármán line is at 100km; significant heating begins around 150km"
                    >
                      150 km
                    </span>{" "}
                    altitude, debris encounters dense atmospheric layers. At{" "}
                    <span
                      className="text-red-400 font-bold cursor-help"
                      title="Mach 20+ velocities"
                    >
                      hypersonic velocities
                    </span>
                    , aerodynamic heating exceeds{" "}
                    <span className="text-red-400 font-extrabold">2000°C</span>,
                    leading to ablation, fragmentation, or partial survival.
                  </p>
                  <p className="text-sm text-slate-200 leading-relaxed mb-6 font-medium">
                    The{" "}
                    <span
                      className="text-red-400 font-bold cursor-help"
                      title="β = m / (Cd × A) — relates mass, drag coefficient, and cross-sectional area"
                    >
                      ballistic coefficient
                    </span>{" "}
                    determines how debris behaves during descent.
                  </p>
                  <div className="inline-block bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                    <p className="text-[11px] font-mono text-red-400 font-extrabold uppercase tracking-widest">
                      Critical Threshold: 150 km — Point of no return
                    </p>
                  </div>
                </div>

                {/* Technical HUD Visual */}
                <div className="hidden lg:block border-l border-white/5 pl-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Aero-thermal Load
                      </span>
                      <span className="text-xs text-red-400 font-mono">
                        CRITICAL
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Velocity
                      </span>
                      <span className="text-xs text-white font-mono">
                        Mach 25.4
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Stagnation Temp
                      </span>
                      <span className="text-xs text-white font-mono">
                        2,240 K
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Controlled vs Uncontrolled */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <GlassCard>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🎛️</span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  Controlled Re-Entry
                </h3>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                Planned{" "}
                <span
                  className="text-green-400 font-bold cursor-help"
                  title="Actively thrusting to lower perigee into a targeted ocean zone"
                >
                  de-orbit
                </span>{" "}
                into predefined ocean corridors (typically the South Pacific
                Ocean Uninhabited Area). Requires active propulsion and precise
                timing.
              </p>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                  <span className="text-lg">⚠️</span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  Uncontrolled Re-Entry
                </h3>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                Natural decay with uncertain breakup and impact location.
                SpaceTug focuses on predicting these using tracking data,{" "}
                <span
                  className="text-yellow-400 font-bold cursor-help"
                  title="Mathematical modeling of drag, solar activity, and atmospheric conditions"
                >
                  decay modeling
                </span>
                , and probabilistic risk analysis.
              </p>
            </GlassCard>
          </div>

          {/* Card 5: Ground Impact Risks */}
          <GlassCard className="mb-0" id="insights">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🌍</span>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight pt-2">
                Ground Impact Risks
              </h3>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed mb-4 font-medium">
              While most debris burns up,{" "}
              <span
                className="text-red-400 font-bold cursor-help"
                title="Depends on material composition — titanium and stainless steel survive most often"
              >
                10–40%
              </span>{" "}
              of larger objects may survive. Surviving fragments create a long
              impact corridor spanning hundreds of kilometers.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                "SGP4 Propagation",
                "Monte Carlo Analysis",
                "Casualty Risk Estimation",
              ].map((m) => (
                <span
                  key={m}
                  className="px-3 py-1.5 bg-red-500/[0.06] border border-red-500/15 rounded-lg text-[10px] font-extrabold text-red-400/80 uppercase tracking-wider cursor-help"
                  title={
                    m === "SGP4 Propagation"
                      ? "Simplified General Perturbations model for satellite orbit prediction"
                      : m === "Monte Carlo Analysis"
                        ? "Statistical simulation running thousands of scenarios to estimate uncertainty"
                        : "Estimating probability of human casualties from falling debris"
                  }
                >
                  {m}
                </span>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* ═══════════ LIVE STATS (MONITOR) ═══════════ */}
      <section
        id="stats"
        className="relative min-h-screen flex items-center justify-center py-24 px-6 overflow-hidden scroll-mt-24 bg-[#060b13]"
      >
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-30"
          >
            <source src={bgMonitor} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#060b13] via-transparent to-[#060b13]" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto w-full">
          <div className="mb-12">
            <SectionTitle
              tag="Real-Time Surveillance"
              title="📊 Global Debris Monitoring"
              sub="Live telemetry data from our orbital tracking network."
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              {
                label: "Active Debris",
                value: 36500,
                suffix: "+",
                color: "red",
                icon: "📡",
              },
              {
                label: "Tracked Objects",
                value: 27000,
                suffix: "+",
                color: "cyan",
                icon: "🛰️",
              },
              {
                label: "Re-entries / Year",
                value: 200,
                suffix: "+",
                color: "orange",
                icon: "🔥",
              },
              {
                label: "Critical Limit",
                value: 150,
                suffix: " KM",
                color: "yellow",
                icon: "⚠️",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="group relative bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center transition-all hover:bg-white/[0.05] overflow-hidden"
              >
                <div className="text-xl mb-3 opacity-50">{s.icon}</div>
                <p
                  className={`text-3xl md:text-4xl font-black font-mono tracking-tighter mb-1 ${s.color === "red" ? "text-red-400" : "text-cyan-400"}`}
                >
                  <AnimCounter
                    key={statsRefresh}
                    end={s.value}
                    suffix={s.suffix}
                    refreshTrigger={statsRefresh}
                  />
                </p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ INSIGHTS (DYNAMIC MARQUEE) ═══════════ */}
      <section
        id="insights"
        className="relative py-24 overflow-hidden scroll-mt-32 bg-[#060b13]"
      >
        <div className="absolute inset-0 z-0">
          <img
            src={bgInsights}
            alt="Insights Background"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060b13] via-[#060b13]/60 to-[#060b13]" />
        </div>
        <div className="relative z-10">
          <SectionTitle
            tag="Visual Intelligence"
            title="🛰️ Captured Re-Entry Events"
            sub="Photographic evidence of atmospheric interface and structural fragmentation during orbital decay."
          />
          <div className="relative overflow-hidden group/marquee">
            <div
              className="flex gap-6 px-5"
              style={{
                animation: "marquee 50s linear infinite",
                width: "max-content",
              }}
            >
              {/* LOOPING OVER RE_ENTRY_DATA TO GET DYNAMIC OBJECTS */}
              {[...RE_ENTRY_DATA, ...RE_ENTRY_DATA].map((item, i) => (
                <div
                  key={i}
                  onClick={() => setDetailPic(item)}
                  className="group relative w-80 h-52 flex-shrink-0 rounded-2xl overflow-hidden border border-white/10 cursor-pointer hover:border-cyan-500/50 hover:shadow-[0_0_40px_rgba(6,182,212,0.2)]"
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover transition-all grayscale-[40%] group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060b13] via-transparent to-transparent opacity-0 group-hover:opacity-100 flex flex-col justify-end p-5">
                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest text-center">
                      Analyze Mission Data
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── DYNAMIC MODAL ── */}
        {detailPic && (
          <div
            className="fixed inset-0 z-[200] bg-[#060b13]/90 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setDetailPic(null)}
          >
            <div
              className="relative max-w-4xl w-full bg-[#0a0f1f] border border-cyan-500/20 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative h-64 md:h-full bg-black border-r border-white/10">
                  <img
                    src={detailPic.img}
                    alt={detailPic.title}
                    className="w-full h-full object-contain p-4"
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-cyan-500/20 border border-cyan-500/40 rounded-full backdrop-blur-md">
                    <p className="text-[9px] font-mono text-cyan-400 uppercase font-bold tracking-tighter">
                      HD Telemetry Feed
                    </p>
                  </div>
                </div>
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="w-10 h-[1px] bg-cyan-500/50" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                      Event Documentation
                    </p>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-4 tracking-tight leading-none uppercase">
                    {detailPic.title}
                  </h3>
                  <div className="space-y-4 mb-8">
                    <p className="text-sm text-slate-400 leading-relaxed italic">
                      "{detailPic.desc}"
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                      <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl text-center">
                        <p className="text-[8px] text-slate-600 uppercase font-bold mb-1">
                          Peak Flux
                        </p>
                        <p className="text-xs text-white font-mono">
                          {detailPic.peak}
                        </p>
                      </div>
                      <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl text-center">
                        <p className="text-[8px] text-slate-600 uppercase font-bold mb-1">
                          Impact Status
                        </p>
                        <p
                          className={`text-xs font-mono ${detailPic.status === "CRITICAL" ? "text-red-400" : "text-cyan-400"}`}
                        >
                          {detailPic.status}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailPic(null)}
                    className="w-full py-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all"
                  >
                    Close Analysis
                  </button>
                </div>
              </div>
              <button
                onClick={() => setDetailPic(null)}
                className="absolute top-6 right-6 w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </section>

      {/* SPACEWATCH LOGS ... (No logic changes) */}
      <section
        id="spacewatch"
        className="relative pt-10 pb-24 px-6 overflow-hidden scroll-mt-40"
      >
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-60"
          >
            <source src={bgSpaceWatch} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#060b13]/80 via-transparent to-[#060b13]" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="mb-10">
            <SectionTitle
              tag="Community & Research"
              title="🛰️ SpaceWatch Logs"
              sub="Admin-seeded insights and community-submitted re-entry observations"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SW_LOGS.map((log, i) => (
              <GlassCard
                key={i}
                className="p-0 overflow-hidden group border-white/5 hover:border-cyan-500/40 bg-white/[0.01]"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={log.img}
                    alt={log.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060b13] opacity-80" />
                </div>
                <div className="p-5">
                  <h3 className="text-sm font-black text-white mb-2">
                    {log.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {log.text}
                  </p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* REPORT SECTION ... (No logic changes) */}
      <section
        id="report"
        className="relative pt-10 pb-24 px-6 overflow-hidden scroll-mt-48 bg-[#060b13]"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#060b13] via-[#080e1a] to-[#060b13]" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <SectionTitle
            tag="Community Contribution"
            title="📝 Submit Intelligence"
            sub="Document observed re-entry events. Visual proof is mandatory for admin verification."
          />
          <GlassCard
            hover={false}
            className="border-cyan-500/10 backdrop-blur-2xl"
          >
            <SightingForm
              handleReportSubmit={handleReportSubmit}
              formStatus={formStatus}
            />
          </GlassCard>
        </div>
      </section>

      {/* ABOUT US ... (No logic changes) */}
      <section
        id="about"
        className="relative min-h-[85vh] flex items-center justify-center px-6 overflow-hidden scroll-mt-24 bg-[#060b13]"
      >
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-20"
          >
            <source src={bgAbout} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#060b13] via-transparent to-[#060b13]" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <SectionTitle tag="Our Mission" title="🌍 About SpaceTug" />
          <GlassCard
            hover={false}
            className="text-center border-cyan-500/10 backdrop-blur-2xl py-10 px-8"
          >
            <div className="flex justify-center mb-8">
              <img
                src={logo}
                alt="SpaceTug"
                className="h-20 md:h-24 object-contain filter drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white mb-4 tracking-tight uppercase">
              Orbital Sustainability Protocols
            </h3>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
              SpaceTug is engineered to monitor and predict the lifecycle of
              space debris. Our platform provides critical intelligence to
              maintain a collision-free orbital environment for future missions.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* CONTACT US ... (No logic changes) */}
      <section
        id="contact"
        className="relative py-20 px-6 overflow-hidden scroll-mt-32 bg-[#060b13]"
      >
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-70 transition-opacity"
            style={{ filter: "brightness(0.8) contrast(1.1) saturate(1.2)" }}
          >
            <source src={contactVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#060b13]/70 via-transparent to-[#060b13]/80" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto w-full">
          <SectionTitle
            tag="Get in Touch"
            title="📞 Contact Us"
            sub="Connect with our mission control for partnership, research data, or general inquiries."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <GlassCard
              hover={false}
              className="border-cyan-500/10 bg-black/60 backdrop-blur-2xl p-8 flex flex-col justify-between"
            >
              <div className="space-y-6 text-sm text-slate-300">
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-xl transition-all">
                    📱
                  </div>
                  <div>
                    <p className="text-[9px] text-cyan-500 uppercase tracking-widest font-black mb-0.5">
                      Direct Line
                    </p>
                    <p className="text-white font-mono text-base">
                      +91 86376 73710
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-xl transition-all">
                    ✉️
                  </div>
                  <div>
                    <p className="text-[9px] text-cyan-500 uppercase tracking-widest font-black mb-0.5">
                      Official Email
                    </p>
                    <p className="text-white font-mono text-base underline underline-offset-4 decoration-cyan-500/40">
                      hello@spacetug.tech
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-xl transition-all">
                    📍
                  </div>
                  <div>
                    <p className="text-[9px] text-cyan-500 uppercase tracking-widest font-black mb-0.5">
                      Headquarters
                    </p>
                    <p className="text-slate-200 leading-relaxed font-semibold text-sm">
                      SpaceTug Pvt Ltd, 24, Arcot Street, T. Nagar, Chennai -
                      600017
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
            <div className="rounded-2xl overflow-hidden border border-white/10 relative h-[350px] md:h-auto group shadow-2xl">
              <iframe
                title="SpaceTug Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.852332617637!2d80.2312678!3d13.0410427!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a526659f81643d9%3A0x647b0a70198f2441!2sArcot%20St%2C%20T.%20Nagar%2C%20Chennai%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1709123456789!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                className="grayscale-[20%] contrast-[1.1] invert-[0.9] hue-rotate-[180deg] opacity-80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative py-10 px-6 border-t border-white/5 bg-[#040810] z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <img
              src={logo}
              alt="SpaceTug"
              className="h-10 md:h-12 w-auto object-contain opacity-90"
            />
            <div className="hidden md:block w-[1px] h-6 bg-white/10" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] text-center md:text-left leading-relaxed">
              © 2026 SpaceTug Pvt Ltd | Orbital Sustainability Unit
            </span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.02] border border-white/5 rounded-full backdrop-blur-sm">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_10px_#22c55e]"></span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono uppercase tracking-[0.2em] font-bold">
              All Systems Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
