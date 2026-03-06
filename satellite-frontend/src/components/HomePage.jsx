import React, { useState, useEffect } from "react";
import { MapPin, Upload, Send, CheckCircle, X, Clock } from "lucide-react";
import { satelliteService } from "../services/api";
import dashboardVideo from "../assets/bg for dash board .mp4";

const HomePage = () => {
  /* ── state ── */
  const [stats, setStats] = useState({ total_tracked: 0, active_satellites: 0, upcoming_reentries: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportData, setReportData] = useState({
    description: "",
    location: "",
    observation_time: "",
    proof_url: "",
    proof_type: "none",
  });
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── fetch stats from backend ── */
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await satelliteService.getStats();
        if (data && data.status === "success") {
          setStats({
            total_tracked: data.total_tracked || 0,
            active_satellites: data.active_satellites || 0,
            upcoming_reentries: data.upcoming_reentries || 0,
          });
        }
      } catch (err) {
        console.error("Stats fetch error:", err);
      }
      setLoadingStats(false);
    };
    fetchStats();
    // Refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  /* ── report handlers ── */
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await satelliteService.submitReport(reportData);
      setSubmitStatus("success");
      setReportData({ description: "", location: "", observation_time: "", proof_url: "", proof_type: "none" });
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

  /* ── educational paragraphs ── */
  const paragraphs = [
    {
      title: "Uncontrolled Re-Entry",
      text: "When a satellite or spacecraft reaches the end of its operational life without any remaining fuel or functioning thrusters, it can no longer be guided to a safe disposal orbit. As it descends through the atmosphere, its trajectory becomes unpredictable — this is called uncontrolled re-entry.",
    },
    {
      title: "Why Do Defunct Satellites Lose Altitude?",
      text: "Even at orbital heights, trace amounts of atmospheric particles create drag on orbiting objects. Without propulsion to counteract this drag, defunct satellites slowly spiral closer to Earth. Below 300 km, this process accelerates exponentially as atmospheric density increases, eventually pulling the object into the denser layers of the atmosphere.",
    },
    
    {
      title: "What SpaceTug Does",
      text: "Our system continuously monitors orbital objects using real-time TLE data, SGP4 propagation models, and Monte Carlo uncertainty analysis to predict re-entry windows, compute impact corridors, and issue timely alerts to decision-makers and the public.",
    },
  ];

  /* ── stat card data ── */
  const statCards = [
    { label: "Total Tracked Satellites", value: stats.total_tracked, color: "#06b6d4" },
    { label: "Active Satellites", value: stats.active_satellites, color: "#22c55e" },
    { label: "Upcoming Re-Entries", value: stats.upcoming_reentries, color: "#f59e0b" },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* ── Background Video ── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ filter: "brightness(0.92) saturate(0.95)" }}
      >
        <source src={dashboardVideo} type="video/mp4" />
      </video>

      {/* Very subtle softening overlay — NO dark overlay */}
      <div className="absolute inset-0 z-[1]" style={{ background: "rgba(2,6,23,0.15)" }} />

      {/* ── Scrollable Content ── */}
      <div className="relative z-10 h-full overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto px-6 py-12">

          {/* ═══ SECTION 1: Educational — Uncontrolled Re-Entry ═══ */}
          <section className="mb-20">
            <div
              className="mb-10"
              style={{ animation: "mhFadeUp 0.8s ease-out forwards", opacity: 0 }}
            >
              <p
                className="text-[11px] font-bold uppercase tracking-[0.35em] mb-4"
                style={{ color: "rgba(6,182,212,0.8)" }}
              >
                Mission Intelligence Briefing
              </p>
              <h2
                className="text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight"
                style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)" }}
              >
                Understanding Uncontrolled <br />Atmospheric Re-Entry
              </h2>
            </div>

            <div className="space-y-8">
              {paragraphs.map((para, i) => (
                <div
                  key={i}
                  className="max-w-3xl"
                  style={{
                    animation: `mhFadeUp 0.7s ease-out ${0.3 + i * 0.25}s forwards`,
                    opacity: 0,
                  }}
                >
                  <h3
                    className="text-base font-bold text-white/90 mb-2 tracking-tight"
                    style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)" }}
                  >
                    {para.title}
                  </h3>
                  <p className="text-sm text-slate-300/85 leading-relaxed">
                    {para.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ═══ SECTION 2: Live System Statistics ═══ */}
          <section className="mb-20">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.35em] mb-6"
              style={{
                color: "rgba(6,182,212,0.8)",
                animation: "mhFadeUp 0.7s ease-out 1.4s forwards",
                opacity: 0,
              }}
            >
              Live System Status
            </p>

            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-5"
              style={{ animation: "mhFadeUp 0.7s ease-out 1.6s forwards", opacity: 0 }}
            >
              {statCards.map((card, i) => (
                <div
                  key={i}
                  className="group relative rounded-2xl border transition-all duration-500 cursor-default overflow-hidden"
                  style={{
                    background: "rgba(15,23,42,0.55)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    borderColor: `${card.color}25`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = `0 8px 30px ${card.color}20`;
                    e.currentTarget.style.borderColor = `${card.color}50`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = `${card.color}25`;
                  }}
                >
                  <div className="p-7">
                    <p
                      className="text-4xl font-black font-mono mb-2"
                      style={{ color: card.color }}
                    >
                      {loadingStats ? "—" : card.value.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                      {card.label}
                    </p>
                  </div>
                  {/* subtle bottom accent */}
                  <div
                    className="h-[2px] w-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `linear-gradient(90deg, transparent, ${card.color}, transparent)` }}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ═══ SECTION 3: User Report Submission ═══ */}
          <section
            className="mb-16"
            style={{ animation: "mhFadeUp 0.7s ease-out 1.9s forwards", opacity: 0 }}
          >
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                background: "rgba(15,23,42,0.5)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderColor: "rgba(6,182,212,0.15)",
              }}
            >
              <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3
                      className="text-lg font-bold text-white tracking-tight"
                      style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)" }}
                    >
                      Report a Re-Entry Event
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-1">
                      Contribute to global space safety awareness
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReportForm(!showReportForm)}
                    className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-300"
                    style={{
                      backgroundColor: showReportForm ? "rgba(239,68,68,0.1)" : "#06b6d4",
                      color: showReportForm ? "#ef4444" : "#000",
                      border: showReportForm ? "1px solid rgba(239,68,68,0.2)" : "none",
                    }}
                  >
                    {showReportForm ? "Cancel" : "New Report"}
                  </button>
                </div>

                {/* Form */}
                {showReportForm && (
                  <form onSubmit={handleSubmitReport} className="space-y-5" style={{ animation: "mhFadeUp 0.4s ease-out forwards" }}>
                    {/* Description */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] block mb-2">
                        Observation Description
                      </label>
                      <textarea
                        required
                        value={reportData.description}
                        onChange={(e) => setReportData((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Describe the observed re-entry event..."
                        rows={4}
                        className="w-full rounded-xl p-4 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-colors resize-none"
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(6,182,212,0.4)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Location */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] block mb-2">
                          <MapPin size={10} className="inline mr-1" /> Location (Optional)
                        </label>
                        <input
                          type="text"
                          value={reportData.location}
                          onChange={(e) => setReportData((p) => ({ ...p, location: e.target.value }))}
                          placeholder="e.g., Chennai, India (13.08°N, 80.27°E)"
                          className="w-full rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-colors"
                          style={{
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(6,182,212,0.4)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                        />
                      </div>

                      {/* Date & Time */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] block mb-2">
                          <Clock size={10} className="inline mr-1" /> Date & Time of Observation
                        </label>
                        <input
                          type="datetime-local"
                          value={reportData.observation_time}
                          onChange={(e) => setReportData((p) => ({ ...p, observation_time: e.target.value }))}
                          className="w-full rounded-xl p-3 text-sm text-white focus:outline-none transition-colors"
                          style={{
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            colorScheme: "dark",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(6,182,212,0.4)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
                        />
                      </div>
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] block mb-2">
                        <Upload size={10} className="inline mr-1" /> Attach Evidence (Image / Video — Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="w-full rounded-xl p-3 text-sm text-slate-400 file:mr-3 file:border-0 file:text-[10px] file:font-bold file:rounded-lg file:px-3 file:py-1 file:uppercase file:tracking-wider"
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          "--file-btn-bg": "rgba(6,182,212,0.1)",
                          "--file-btn-color": "#06b6d4",
                        }}
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{
                        background: "#06b6d4",
                        color: "#000",
                      }}
                    >
                      <Send size={14} />
                      {isSubmitting ? "Transmitting..." : "Submit Report"}
                    </button>

                    {/* Feedback */}
                    {submitStatus === "success" && (
                      <div className="flex items-center gap-2 text-green-400 text-xs font-bold" style={{ animation: "mhFadeUp 0.3s ease-out forwards" }}>
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
            </div>
          </section>
        </div>
      </div>

      {/* ── Animations ── */}
      <style>{`
        @keyframes mhFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
