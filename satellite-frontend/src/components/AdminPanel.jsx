import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  Loader2,
  Zap,
  Activity,
  Eye,
  Mail, // Added Mail icon
} from "lucide-react";
import { satelliteService } from "../services/api";

const AdminPanel = () => {
  const [activeSection, setActiveSection] = useState("user_reports");
  const [userReports, setUserReports] = useState([]);
  const [autoReports, setAutoReports] = useState([]);
  const [dispatchedReports, setDispatchedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [dispatchForm, setDispatchForm] = useState(null);
  const [dispatchSummary, setDispatchSummary] = useState("");

  // EMAIL DISPATCH STATE
  const [isDispatching, setIsDispatching] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await satelliteService.getAdminLogs();
      setUserReports(data.user_reports || []);
      setAutoReports(data.auto_reports || []);
      setDispatchedReports(data.dispatched_reports || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleReview = async (reportId, action) => {
    setActionLoading(reportId);
    try {
      await satelliteService.reviewReport(reportId, action);
      fetchReports();
    } catch (err) {
      console.error("Review error:", err);
    }
    setActionLoading(null);
  };

  // UPDATED DISPATCH LOGIC (MAIL INTEGRATION)
  const handleDispatch = async (report) => {
    setActionLoading(report._id);
    setIsDispatching(true);

    const authorizedEmails = [
      "santhiyaramar1984@gmail.com",  
      
    ];

    const reportData = {
      to: authorizedEmails.join(", "),
      subject: `🚨 OFFICIAL DISPATCH: ${report.name} (NORAD:${report.norad_id})`,
      content: {
        target: report.name,
        id: report.norad_id,
        velocity: "7.621",
        altitude: report.altitude,
        timestamp: new Date().toISOString(),
        summary:
          dispatchSummary || `Critical re-entry alert for ${report.name}`,
      },
    };

    try {
      // 1. Dispatch to Database
      await satelliteService.dispatchReport({
        norad_id: report.norad_id,
        target_name: report.name,
        severity: report.risk_level || "CRITICAL",
        altitude: report.altitude,
        summary: reportData.content.summary,
      });

      // 2. Dispatch Secure Email via Backend
      await fetch("http://localhost:5000/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData),
      });

      alert("✅ OFFICIAL REPORT DISPATCHED & EMAILED TO AUTHORIZED MEMBERS");
      setDispatchForm(null);
      setDispatchSummary("");
      fetchReports();
    } catch (err) {
      console.error("Dispatch error:", err);
      alert("⚠️ DATA DISPATCHED BUT MAIL UPLINK FAILED");
    } finally {
      setActionLoading(null);
      setIsDispatching(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      APPROVED: "bg-green-500/10 text-green-400 border-green-500/20",
      REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
      DRAFT: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      DISPATCHED: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    };
    return (
      <span
        className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${styles[status] || ""}`}
      >
        {status}
      </span>
    );
  };

  const sections = [
    {
      id: "user_reports",
      label: "User Reports",
      icon: FileText,
      count: userReports.length,
    },
    {
      id: "auto_reports",
      label: "Auto Reports",
      icon: AlertTriangle,
      count: autoReports.length,
    },
    {
      id: "dispatched",
      label: "Dispatched",
      icon: Send,
      count: dispatchedReports.length,
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden p-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
            <ShieldCheck size={24} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
              Admin Panel
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Mission Control // Authorization Level: Maximum
            </p>
          </div>
        </div>
        <button
          onClick={fetchReports}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
        >
          Refresh Data
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6 shrink-0">
        {sections.map((sec) => {
          const Icon = sec.icon;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSection === sec.id
                  ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
              }`}
            >
              <Icon size={14} />
              {sec.label}
              <span className="ml-1 px-1.5 py-0.5 bg-black/30 rounded-md text-[8px]">
                {sec.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : activeSection === "user_reports" ? (
          userReports.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-mono uppercase">
              No user reports submitted yet
            </div>
          ) : (
            userReports.map((report) => (
              <div
                key={report._id}
                className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 hover:bg-slate-900/60 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-white font-black text-sm uppercase tracking-tight">
                      {report.submitted_by_name || "Unknown User"}
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono mt-1">
                      {new Date(report.created_at).toLocaleString()} // ID:{" "}
                      {report._id?.slice(-8)}
                    </p>
                  </div>
                  {getStatusBadge(report.status)}
                </div>
                <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                  {report.description}
                </p>
                <div className="flex items-center gap-4 mb-4 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    📍 {report.location || "No location"}
                  </span>
                  {report.proof_url && (
                    <span className="flex items-center gap-1 text-cyan-400">
                      <Eye size={10} /> Proof attached
                    </span>
                  )}
                </div>
                {report.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(report._id, "APPROVE")}
                      disabled={actionLoading === report._id}
                      className="flex-1 py-2.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button
                      onClick={() => handleReview(report._id, "REJECT")}
                      disabled={actionLoading === report._id}
                      className="flex-1 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )
        ) : activeSection === "auto_reports" ? (
          autoReports.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-mono uppercase">
              No auto-generated reports — All satellites nominal
            </div>
          ) : (
            autoReports.map((report) => (
              <div
                key={report._id}
                className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 hover:bg-red-500/10 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-white font-black text-lg uppercase italic tracking-tight">
                      {report.name}
                    </p>
                    <p className="text-[9px] text-red-500/60 font-mono mt-1">
                      NORAD: {report.norad_id} // AUTO-GENERATED // ALT:{" "}
                      {report.altitude}km
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(report.status)}
                    <span className="bg-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full animate-pulse">
                      {report.risk_level || "CRITICAL"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <p className="text-[8px] text-slate-500 font-black uppercase">
                      Altitude
                    </p>
                    <p className="text-lg font-mono font-black text-red-400">
                      {report.altitude} km
                    </p>
                  </div>
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <p className="text-[8px] text-slate-500 font-black uppercase">
                      Window Start
                    </p>
                    <p className="text-xs font-mono text-white">
                      {report.reentry_window_start?.slice(0, 16) || "—"}
                    </p>
                  </div>
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <p className="text-[8px] text-slate-500 font-black uppercase">
                      Window End
                    </p>
                    <p className="text-xs font-mono text-white">
                      {report.reentry_window_end?.slice(0, 16) || "—"}
                    </p>
                  </div>
                </div>
                {dispatchForm === report._id ? (
                  <div className="space-y-3">
                    <textarea
                      value={dispatchSummary}
                      onChange={(e) => setDispatchSummary(e.target.value)}
                      placeholder="Enter secure dispatch briefing..."
                      rows={2}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 font-mono"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDispatch(report)}
                        disabled={isDispatching}
                        className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                      >
                        {isDispatching ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Mail size={12} />
                        )}
                        {isDispatching
                          ? "Transmitting..."
                          : "Dispatch Official Report"}
                      </button>
                      <button
                        onClick={() => {
                          setDispatchForm(null);
                          setDispatchSummary("");
                        }}
                        className="px-4 py-2.5 bg-white/5 text-slate-400 rounded-xl text-[10px] font-black uppercase hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDispatchForm(report._id)}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                  >
                    <Zap size={14} /> Dispatch Official Report
                  </button>
                )}
              </div>
            ))
          )
        ) : dispatchedReports.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-mono uppercase">
            No reports dispatched yet
          </div>
        ) : (
          dispatchedReports.map((report) => (
            <div
              key={report._id}
              className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-6 hover:bg-cyan-500/10 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-white font-black uppercase italic tracking-tight">
                    {report.target_name}
                  </p>
                  <p className="text-[9px] text-cyan-500/60 font-mono mt-1">
                    NORAD: {report.norad_id} // Dispatched by:{" "}
                    {report.dispatched_by_name}
                  </p>
                </div>
                {getStatusBadge("DISPATCHED")}
              </div>
              <p className="text-sm text-slate-400 mb-2">{report.summary}</p>
              <p className="text-[9px] text-slate-500 font-mono">
                {new Date(report.dispatched_at).toLocaleString()} // Severity:{" "}
                {report.severity}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
