import React, { useState, useEffect } from "react";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { satelliteService } from "../services/api";

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const role = localStorage.getItem("role") || "user";

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const data = await satelliteService.getUserReports();
        setReports(data.reports || []);
      } catch (err) {
        console.error("Reports fetch error:", err);
      }
      setLoading(false);
    };
    fetchReports();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case "APPROVED": return <CheckCircle size={14} className="text-green-400" />;
      case "REJECTED": return <XCircle size={14} className="text-red-400" />;
      case "PENDING": return <Clock size={14} className="text-yellow-400" />;
      default: return <AlertTriangle size={14} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "APPROVED": return "bg-green-500/10 text-green-400 border-green-500/20";
      case "REJECTED": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "PENDING": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden p-6 animate-in">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <FileText size={24} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
              Reports Log
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Your submitted re-entry event reports
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-cyan-500 bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20 uppercase tracking-widest">
          {reports.length} Reports
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4">
            <FileText size={40} className="text-slate-700" />
            <p className="text-slate-500 text-sm font-mono uppercase tracking-widest">
              No reports submitted yet
            </p>
            <p className="text-[10px] text-slate-600">
              Navigate to Home to submit a re-entry event report
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report._id}
              className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 hover:bg-slate-900/60 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">
                    Report ID: {report._id?.slice(-8)} // {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(report.status)}
                  <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                </div>
              </div>

              <p className="text-sm text-white leading-relaxed mb-3">
                {report.description}
              </p>

              <div className="flex gap-6 text-[10px] text-slate-400">
                <span>📍 {report.location || "No location specified"}</span>
                <span>🕐 {new Date(report.created_at).toLocaleString()}</span>
                {report.proof_url && <span className="text-cyan-400">📎 Proof attached</span>}
              </div>

              {report.reviewed_at && (
                <div className="mt-3 pt-3 border-t border-white/5 text-[9px] text-slate-500 font-mono">
                  Reviewed: {new Date(report.reviewed_at).toLocaleString()}
                  {report.review_notes && ` // Notes: ${report.review_notes}`}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
