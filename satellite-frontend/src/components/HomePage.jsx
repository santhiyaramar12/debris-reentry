import React, { useState } from "react";
import {
  Rocket,
  Satellite,
  AlertTriangle,
  Globe,
  ShieldAlert,
  ArrowRight,
  Flame,
  Wind,
  Target,
  FileText,
  MapPin,
  Upload,
  Send,
  CheckCircle,
  X,
} from "lucide-react";
import { satelliteService } from "../services/api";

const HomePage = ({ onNavigateLogin, isLoggedIn }) => {
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportData, setReportData] = useState({
    description: "",
    location: "",
    proof_url: "",
  });
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await satelliteService.submitReport(reportData);
      setSubmitStatus("success");
      setReportData({ description: "", location: "", proof_url: "" });
      setTimeout(() => {
        setSubmitStatus(null);
        setShowReportForm(false);
      }, 3000);
    } catch (err) {
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus(null), 3000);
    }
    setIsSubmitting(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReportData((prev) => ({
          ...prev,
          proof_url: reader.result,
          proof_type: file.type.startsWith("video") ? "video" : "image",
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(0,242,255,0.2); } 50% { box-shadow: 0 0 40px rgba(0,242,255,0.4); } }
        @keyframes orbit { 0% { transform: rotate(0deg) translateX(120px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); } }
        .float-anim { animation: float 6s ease-in-out infinite; }
        .glow-anim { animation: glow 3s ease-in-out infinite; }
        .orbit-anim { animation: orbit 20s linear infinite; }
      `}</style>

      {/* HERO SECTION */}
      {!isLoggedIn && (
        <section className="relative min-h-[80vh] flex items-center justify-center px-6 overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[150px]" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[120px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-cyan-500/10 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] border border-cyan-500/5 rounded-full animate-ping" style={{ animationDuration: "4s" }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 orbit-anim">
              <Satellite size={16} className="text-cyan-500/40" />
            </div>
          </div>

          <div className="relative z-10 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-cyan-500/10 border border-cyan-500/20 rounded-full backdrop-blur-sm">
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">
                Orbital Debris Monitoring System
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter leading-none mb-6">
              Space<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Tug</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              Real-time debris re-entry prediction, impact trajectory mapping, and mission-critical alert management for space operations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => onNavigateLogin("admin")}
                className="group w-64 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:shadow-[0_0_40px_rgba(239,68,68,0.4)] hover:scale-105"
              >
                <ShieldAlert size={18} />
                Admin Login
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => onNavigateLogin("user")}
                className="group w-64 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:scale-105"
              >
                <Globe size={18} />
                User Login
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* EDUCATIONAL SECTION */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em] block mb-3">
            Mission Intelligence Briefing
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter">
            🛰️ What is Debris Re-entry?
          </h2>
          <p className="text-sm text-slate-500 mt-4 max-w-2xl mx-auto">
            Understanding the science behind orbital decay and atmospheric re-entry of space debris
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* ORBITAL DECAY */}
          <div className="group bg-slate-900/40 border border-white/10 rounded-[2rem] p-8 backdrop-blur-md hover:bg-slate-900/60 hover:border-cyan-500/30 transition-all duration-500">
            <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors glow-anim">
              <Satellite size={28} className="text-cyan-400" />
            </div>
            <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-3">
              Orbital Decay
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Even in the vacuum of space, particles of the upper atmosphere create drag on orbiting objects. Over time, this drag reduces an object's orbital energy,
              causing it to spiral closer to Earth.
            </p>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <p className="text-[10px] font-mono text-cyan-500/80 uppercase">
                Key Factor: Atmospheric density increases exponentially as altitude decreases, accelerating the decay process below 400km.
              </p>
            </div>
          </div>

          {/* ATMOSPHERIC DRAG */}
          <div className="group bg-slate-900/40 border border-white/10 rounded-[2rem] p-8 backdrop-blur-md hover:bg-slate-900/60 hover:border-orange-500/30 transition-all duration-500">
            <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-500/20 transition-colors">
              <Wind size={28} className="text-orange-400" />
            </div>
            <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-3">
              Atmospheric Drag
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              As debris enters denser atmosphere layers below 150km, aerodynamic forces heat it to extreme temperatures (2000°C+). The ballistic coefficient determines
              how quickly objects decelerate and fragment.
            </p>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <p className="text-[10px] font-mono text-orange-500/80 uppercase">
                Critical Threshold: Below 150km altitude, re-entry becomes inevitable within hours. Objects experience intense thermal stress.
              </p>
            </div>
          </div>

          {/* GROUND RISKS */}
          <div className="group bg-slate-900/40 border border-white/10 rounded-[2rem] p-8 backdrop-blur-md hover:bg-slate-900/60 hover:border-red-500/30 transition-all duration-500">
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-500/20 transition-colors">
              <Flame size={28} className="text-red-400" />
            </div>
            <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-3">
              Ground Impact Risks
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              While most debris burns up completely, 10-40% of larger objects can survive re-entry. Surviving fragments create an impact corridor spanning hundreds of
              kilometers along the ground track.
            </p>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <p className="text-[10px] font-mono text-red-500/80 uppercase">
                Safety Protocol: Impact corridors are computed using SGP4 propagation and Monte Carlo uncertainty analysis for casualty risk assessment.
              </p>
            </div>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { label: "Active Debris", value: "36,500+", color: "text-red-400" },
            { label: "Tracked Objects", value: "27,000+", color: "text-cyan-400" },
            { label: "Re-entries/Year", value: "200+", color: "text-orange-400" },
            { label: "Risk Threshold", value: "150 KM", color: "text-yellow-400" },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 text-center hover:border-white/10 transition-colors">
              <p className={`text-3xl font-black italic font-mono ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* USER CONTRIBUTION SECTION */}
      {isLoggedIn && (
        <section className="px-6 pb-16 max-w-4xl mx-auto">
          <div className="bg-slate-900/40 border border-cyan-500/20 rounded-[2rem] p-8 backdrop-blur-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                  <FileText size={20} className="text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tight">
                    Report a Re-entry Event
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                    Contribute to space safety awareness
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReportForm(!showReportForm)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  showReportForm
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-cyan-500 text-black hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                }`}
              >
                {showReportForm ? "Cancel" : "New Report"}
              </button>
            </div>

            {showReportForm && (
              <form onSubmit={handleSubmitReport} className="space-y-4 animate-in">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Description
                  </label>
                  <textarea
                    required
                    value={reportData.description}
                    onChange={(e) => setReportData((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Describe the observed re-entry event..."
                    rows={4}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      <MapPin size={10} className="inline mr-1" /> Location
                    </label>
                    <input
                      required
                      type="text"
                      value={reportData.location}
                      onChange={(e) => setReportData((p) => ({ ...p, location: e.target.value }))}
                      placeholder="e.g., Chennai, India (13.0827°N, 80.2707°E)"
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                      <Upload size={10} className="inline mr-1" /> Proof Upload (Image/Video)
                    </label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-slate-400 file:mr-3 file:bg-cyan-500/10 file:border-0 file:text-cyan-400 file:text-xs file:font-bold file:rounded-lg file:px-3 file:py-1 file:uppercase file:tracking-wider"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send size={14} />
                    {isSubmitting ? "Transmitting..." : "Submit Report"}
                  </button>
                </div>

                {submitStatus === "success" && (
                  <div className="flex items-center gap-2 text-green-400 text-xs font-bold animate-pulse">
                    <CheckCircle size={14} /> Report submitted successfully — Status: PENDING
                  </div>
                )}
                {submitStatus === "error" && (
                  <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                    <X size={14} /> Submission failed. Please try again.
                  </div>
                )}
              </form>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
