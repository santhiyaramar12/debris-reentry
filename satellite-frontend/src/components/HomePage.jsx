import React, { useState, useEffect } from "react";
import {
  MapPin,
  Upload,
  Send,
  CheckCircle,
  X,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { satelliteService } from "../services/api";
import bgVideo from "../assets/bg for about.mp4";

/* ─── Google Fonts ─── */
if (typeof document !== "undefined") {
  const id = "spacetug-fonts";
  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap";
    document.head.appendChild(link);
  }
}

const HomePage = ({ setActiveTab }) => {
  const [stats, setStats] = useState({
    total_tracked: 0,
    active_satellites: 0,
    upcoming_reentries: 0,
  });
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
  const [btnHovered, setBtnHovered] = useState(false);

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
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await satelliteService.submitReport(reportData);
      setSubmitStatus("success");
      setReportData({
        description: "",
        location: "",
        observation_time: "",
        proof_url: "",
        proof_type: "none",
      });
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
      reader.onloadend = () =>
        setReportData((prev) => ({
          ...prev,
          proof_url: reader.result,
          proof_type: file.type.startsWith("video") ? "video" : "image",
        }));
      reader.readAsDataURL(file);
    }
  };

  const statCards = [
    {
      label: "Total Tracked Satellites",
      value: stats.total_tracked,
      color: "#06b6d4",
    },
    {
      label: "Active Satellites",
      value: stats.active_satellites,
      color: "#22c55e",
    },
    {
      label: "Upcoming Re-Entries",
      value: stats.upcoming_reentries,
      color: "#f59e0b",
    },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ filter: "brightness(0.75) saturate(0.9)" }}
      >
        <source src={bgVideo} type="video/mp4" />
      </video>
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(160deg, rgba(2,6,23,0.72) 0%, rgba(2,8,32,0.65) 50%, rgba(2,6,23,0.78) 100%)",
          backdropFilter: "blur(1px)",
        }}
      />

      <div className="relative z-10 h-full overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto px-6 py-14">
          {/* HERO */}
          <section className="mb-24 text-center">
            <div
              className="inline-flex items-center gap-2 mb-7"
              style={{
                animation: "mhFadeUp 0.6s ease-out forwards",
                opacity: 0,
              }}
            >
              <div
                className="h-px w-10"
                style={{
                  background:
                    "linear-gradient(to right, transparent, rgba(6,182,212,0.7))",
                }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.42em]"
                style={{
                  color: "rgba(6,182,212,0.85)",
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                Orbital Decay Intelligence
              </span>
              <div
                className="h-px w-10"
                style={{
                  background:
                    "linear-gradient(to left, transparent, rgba(6,182,212,0.7))",
                }}
              />
            </div>

            <h1
              className="mb-7 leading-[1.08] tracking-[-0.02em]"
              style={{
                fontFamily: "'Orbitron', 'Syne', sans-serif",
                fontWeight: 900,
                fontSize: "clamp(2.4rem, 5.5vw, 4.2rem)",
                background:
                  "linear-gradient(130deg, #e2e8f0 0%, #67e8f9 38%, #f8fafc 62%, #fbbf24 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "mhFadeUp 0.75s ease-out 0.15s forwards",
                opacity: 0,
              }}
            >
              Uncontrolled
              <br />
              Atmospheric Re-Entry
            </h1>

            <p
              className="max-w-2xl mx-auto text-[15px] leading-[1.8] text-slate-300/90"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 300,
                animation: "mhFadeUp 0.75s ease-out 0.35s forwards",
                opacity: 0,
              }}
            >
              Defunct satellites and orbital debris gradually lose altitude due
              to atmospheric drag. Without propulsion to control their descent,
              they re-enter Earth's atmosphere unpredictably, making tracking
              and prediction critical for global safety.
            </p>

            {/* ── CTA BUTTON ── */}
            <div
              className="mt-10 flex justify-center"
              style={{
                animation: "mhFadeUp 0.7s ease-out 0.52s forwards",
                opacity: 0,
              }}
            >
              <button
                onClick={() => setActiveTab && setActiveTab("Alerts")}
                onMouseEnter={() => setBtnHovered(true)}
                onMouseLeave={() => setBtnHovered(false)}
                className="relative flex items-center gap-3 px-8 py-3.5 rounded-xl overflow-hidden"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "11px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: btnHovered ? "#000" : "#67e8f9",
                  background: btnHovered
                    ? "linear-gradient(135deg, #06b6d4, #0ea5e9)"
                    : "rgba(6,182,212,0.08)",
                  border: `1px solid ${btnHovered ? "transparent" : "rgba(6,182,212,0.4)"}`,
                  boxShadow: btnHovered
                    ? "0 0 32px rgba(6,182,212,0.55), 0 0 64px rgba(6,182,212,0.2)"
                    : "0 0 12px rgba(6,182,212,0.15)",
                  transform: btnHovered ? "translateY(-2px)" : "translateY(0)",
                  transition: "all 0.25s ease",
                }}
              >
                {btnHovered && (
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                      animation: "btnScan 0.55s ease-out forwards",
                    }}
                  />
                )}
                <AlertTriangle
                  size={14}
                  style={{
                    filter: btnHovered
                      ? "none"
                      : "drop-shadow(0 0 4px rgba(6,182,212,0.7))",
                  }}
                />
                View Crisis Alerts
                <ArrowRight
                  size={14}
                  style={{
                    transition: "transform 0.25s ease",
                    transform: btnHovered ? "translateX(3px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>

            <div
              className="mt-10 mx-auto h-px w-48"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgba(6,182,212,0.45), transparent)",
                animation: "mhFadeUp 0.6s ease-out 0.62s forwards",
                opacity: 0,
              }}
            />
          </section>

          {/* STATISTICS */}
          <section className="mb-20">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.35em] mb-6"
              style={{
                color: "rgba(6,182,212,0.8)",
                fontFamily: "'Syne', sans-serif",
                animation: "mhFadeUp 0.7s ease-out 0.65s forwards",
                opacity: 0,
              }}
            >
              Live System Status
            </p>
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-5"
              style={{
                animation: "mhFadeUp 0.7s ease-out 0.8s forwards",
                opacity: 0,
              }}
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
                    <p
                      className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      {card.label}
                    </p>
                  </div>
                  <div
                    className="h-[2px] w-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${card.color}, transparent)`,
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* REPORT SUBMISSION */}
          <section
            className="mb-16"
            style={{
              animation: "mhFadeUp 0.7s ease-out 1.05s forwards",
              opacity: 0,
            }}
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
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3
                      className="text-lg font-bold text-white tracking-tight"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      Report a Re-Entry Event
                    </h3>
                    <p
                      className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-1"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Contribute to global space safety awareness
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReportForm(!showReportForm)}
                    className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-300"
                    style={{
                      backgroundColor: showReportForm
                        ? "rgba(239,68,68,0.1)"
                        : "#06b6d4",
                      color: showReportForm ? "#ef4444" : "#000",
                      border: showReportForm
                        ? "1px solid rgba(239,68,68,0.2)"
                        : "none",
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    {showReportForm ? "Cancel" : "New Report"}
                  </button>
                </div>

                {showReportForm && (
                  <form
                    onSubmit={handleSubmitReport}
                    className="space-y-5"
                    style={{ animation: "mhFadeUp 0.4s ease-out forwards" }}
                  >
                    <div>
                      <label
                        className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] block mb-2"
                        style={{ fontFamily: "'Syne', sans-serif" }}
                      >
                        Observation Description
                      </label>
                      <textarea
                        required
                        value={reportData.description}
                        onChange={(e) =>
                          setReportData((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Describe the observed re-entry event..."
                        rows={4}
                        className="w-full rounded-xl p-4 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-colors resize-none"
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "rgba(6,182,212,0.4)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor =
                            "rgba(255,255,255,0.08)")
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label
                          className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] block mb-2"
                          style={{ fontFamily: "'Syne', sans-serif" }}
                        >
                          <MapPin size={10} className="inline mr-1" />
                          Location (Optional)
                        </label>
                        <input
                          type="text"
                          value={reportData.location}
                          onChange={(e) =>
                            setReportData((p) => ({
                              ...p,
                              location: e.target.value,
                            }))
                          }
                          placeholder="e.g., Chennai, India (13.08°N, 80.27°E)"
                          className="w-full rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-colors"
                          style={{
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                          onFocus={(e) =>
                            (e.target.style.borderColor = "rgba(6,182,212,0.4)")
                          }
                          onBlur={(e) =>
                            (e.target.style.borderColor =
                              "rgba(255,255,255,0.08)")
                          }
                        />
                      </div>
                      <div>
                        <label
                          className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] block mb-2"
                          style={{ fontFamily: "'Syne', sans-serif" }}
                        >
                          <Clock size={10} className="inline mr-1" />
                          Date & Time of Observation
                        </label>
                        <input
                          type="datetime-local"
                          value={reportData.observation_time}
                          onChange={(e) =>
                            setReportData((p) => ({
                              ...p,
                              observation_time: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl p-3 text-sm text-white focus:outline-none transition-colors"
                          style={{
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            colorScheme: "dark",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                          onFocus={(e) =>
                            (e.target.style.borderColor = "rgba(6,182,212,0.4)")
                          }
                          onBlur={(e) =>
                            (e.target.style.borderColor =
                              "rgba(255,255,255,0.08)")
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] block mb-2"
                        style={{ fontFamily: "'Syne', sans-serif" }}
                      >
                        <Upload size={10} className="inline mr-1" />
                        Attach Evidence (Image / Video — Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="w-full rounded-xl p-3 text-sm text-slate-400 file:mr-3 file:border-0 file:text-[10px] file:font-bold file:rounded-lg file:px-3 file:py-1 file:uppercase file:tracking-wider"
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{
                        background: "#06b6d4",
                        color: "#000",
                        fontFamily: "'Syne', sans-serif",
                      }}
                    >
                      <Send size={14} />
                      {isSubmitting ? "Transmitting..." : "Submit Report"}
                    </button>
                    {submitStatus === "success" && (
                      <div
                        className="flex items-center gap-2 text-green-400 text-xs font-bold"
                        style={{ animation: "mhFadeUp 0.3s ease-out forwards" }}
                      >
                        <CheckCircle size={14} /> Report submitted successfully
                        — Status: PENDING
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

      <style>{`
        @keyframes mhFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes btnScan  { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
      `}</style>
    </div>
  );
};

export default HomePage;
