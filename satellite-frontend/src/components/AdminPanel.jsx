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
  Target,
  Database,
  RefreshCw,
  Settings,
  Edit3,
  Save,
  Bell,
  Users,
  Terminal,
  Trash2,
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

  // DASHBOARD OVERVIEW STATE
  const [metrics, setMetrics] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // ALERTS & SETTINGS STATE
  const [adminAlerts, setAdminAlerts] = useState([]);
  const [alertSettings, setAlertSettings] = useState({
    red_threshold: 100,
    yellow_threshold: 125,
    purple_threshold: 150,
  });
  const [editingAlert, setEditingAlert] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // USERS & LOGS STATE
  const [users, setUsers] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);

  // EMAIL DISPATCH STATE
  const [isDispatching, setIsDispatching] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [
        logsData,
        metricsData,
        syncData,
        alertsData,
        settingsData,
        usersData,
        sysLogsData,
      ] = await Promise.all([
        satelliteService.getAdminLogs(),
        satelliteService.getAdminMetrics(),
        satelliteService.getSyncStatus(),
        satelliteService.getAlerts(),
        satelliteService.getAlertSettings(),
        satelliteService.getUsers(),
        satelliteService.getSystemLogs(),
      ]);

      setUserReports(logsData.user_reports || []);
      setAutoReports(logsData.auto_reports || []);
      setDispatchedReports(logsData.dispatched_reports || []);

      if (metricsData?.status === "success") setMetrics(metricsData.metrics);
      if (syncData?.status === "success") setSyncStatus(syncData.data);
      if (alertsData?.status === "success")
        setAdminAlerts(alertsData.alerts || []);
      if (settingsData?.status === "success")
        setAlertSettings(settingsData.settings);
      if (usersData?.status === "success") setUsers(usersData.users || []);
      if (sysLogsData?.status === "success")
        setSystemLogs(sysLogsData.logs || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await satelliteService.triggerSync();
      setSyncStatus((prev) => ({ ...prev, status: "Syncing..." }));
      setTimeout(fetchReports, 3000); // Give it a moment to complete
    } catch (err) {
      console.error("Sync error:", err);
    }
    setIsSyncing(false);
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

  const handleUserRole = async (userId, newRole) => {
    setActionLoading(`role_${userId}`);
    try {
      await satelliteService.updateUserRole(userId, newRole);
      fetchReports();
    } catch (e) {
      console.error(e);
      alert("Failed to update user role");
    }
    setActionLoading(null);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    setActionLoading(`delete_${userId}`);
    try {
      await satelliteService.deleteUser(userId);
      fetchReports();
    } catch (e) {
      console.error(e);
      alert(
        "Failed to delete user. Cannot delete yourself or an error occurred.",
      );
    }
    setActionLoading(null);
  };

  // UPDATED DISPATCH LOGIC (MAIL INTEGRATION)
  const handleDispatch = async (report) => {
    setActionLoading(report._id);
    setIsDispatching(true);

    const authorizedEmails = ["santhiyaramar1984@gmail.com"];

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
      VERIFIED: "bg-green-500/10 text-green-400 border-green-500/20",
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
      id: "overview",
      label: "Dashboard",
      icon: Activity,
      count: null,
    },
    {
      id: "alerts_management",
      label: "Alerts Control",
      icon: Bell,
      count: adminAlerts.length,
    },
    {
      id: "threshold_settings",
      label: "Thresholds",
      icon: Settings,
      count: null,
    },
    {
      id: "users_management",
      label: "Personnel",
      icon: Users,
      count: users.length,
    },
    {
      id: "system_logs",
      label: "System Logs",
      icon: Terminal,
      count: systemLogs.length,
    },
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
              {sec.count !== null && (
                <span className="ml-1 px-1.5 py-0.5 bg-black/30 rounded-md text-[8px]">
                  {sec.count}
                </span>
              )}
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
        ) : activeSection === "overview" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {metrics ? (
                [
                  {
                    label: "Total Satellites",
                    value: metrics.total_tracked,
                    color: "#06b6d4",
                    icon: Target,
                  },
                  {
                    label: "Active Alerts",
                    value: metrics.active_alerts,
                    color: "#ef4444",
                    icon: AlertTriangle,
                  },
                  {
                    label: "Pending Reports",
                    value: metrics.pending_reports,
                    color: "#eab308",
                    icon: FileText,
                  },
                  {
                    label: "Verified Events",
                    value: metrics.verified_events,
                    color: "#22c55e",
                    icon: CheckCircle,
                  },
                ].map((card, idx) => {
                  const CardIcon = card.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-slate-900/40 border p-6 rounded-2xl flex flex-col justify-between"
                      style={{
                        borderColor: `${card.color}40`,
                        boxShadow: `0 4px 20px ${card.color}10`,
                      }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: `${card.color}20`,
                            color: card.color,
                          }}
                        >
                          <CardIcon size={20} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                          {card.label}
                        </p>
                      </div>
                      <p
                        className="text-4xl font-black font-mono tracking-tighter"
                        style={{ color: card.color }}
                      >
                        {card.value.toLocaleString()}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-4 text-center text-slate-500 font-mono text-sm py-10">
                  Loading metrics...
                </div>
              )}
            </div>

            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                    <Database size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                      Data Sync Status
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono uppercase">
                      Database Synchronization Engine
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  <RefreshCw
                    size={14}
                    className={isSyncing ? "animate-spin" : ""}
                  />
                  {isSyncing ? "Syncing..." : "Sync Satellite Data"}
                </button>
              </div>

              {syncStatus ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                      Last Sync
                    </p>
                    <p className="text-sm font-mono text-cyan-400">
                      {syncStatus.last_sync}
                    </p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                      Next Scheduled Sync
                    </p>
                    <p className="text-sm font-mono text-slate-300">
                      {syncStatus.next_sync}
                    </p>
                  </div>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col justify-center relative overflow-hidden group">
                    {syncStatus.status === "Syncing..." && (
                      <div className="absolute inset-0 bg-cyan-500/10 animate-pulse pointer-events-none" />
                    )}
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">
                      Sync Status
                    </p>
                    <p className="text-sm font-mono text-white flex items-center gap-2">
                      {syncStatus.status}
                      {syncStatus.status === "OK" && (
                        <CheckCircle size={14} className="text-green-400" />
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-sm font-mono text-center py-4">
                  No sync data available.
                </p>
              )}
            </div>
          </div>
        ) : activeSection === "alerts_management" ? (
          adminAlerts.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 font-mono uppercase text-sm">
              No active alerts to manage.
            </div>
          ) : (
            <div className="space-y-4">
              {adminAlerts.map((alert) => (
                <div
                  key={alert.norad_id}
                  className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-white font-black uppercase tracking-tight text-lg">
                        {alert.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        NORAD: {alert.norad_id} // ALTITUDE: {alert.altitude} km
                      </p>
                    </div>
                    {editingAlert !== alert.norad_id ? (
                      <button
                        onClick={() => {
                          setEditingAlert(alert.norad_id);
                          setEditFormData({
                            severity: alert.severity || "STABLE",
                            predicted_reentry_window:
                              alert.predicted_reentry_window || "",
                            impact_probability: alert.impact_probability || "",
                            notes: alert.notes || "",
                          });
                        }}
                        className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          const originalId = editingAlert;
                          setActionLoading(originalId);
                          try {
                            await satelliteService.updateAlert(
                              originalId,
                              editFormData,
                            );
                            setEditingAlert(null);
                            fetchReports();
                          } catch (err) {
                            console.error("Save error", err);
                          }
                          setActionLoading(null);
                        }}
                        disabled={actionLoading === alert.norad_id}
                        className="px-4 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:bg-green-400"
                      >
                        {actionLoading === alert.norad_id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        Save Alert
                      </button>
                    )}
                  </div>

                  {editingAlert === alert.norad_id ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-slate-500 font-black uppercase mb-1 block">
                          Severity Override
                        </label>
                        <select
                          value={editFormData.severity}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              severity: e.target.value,
                            })
                          }
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white uppercase focus:border-cyan-500 outline-none"
                        >
                          <option value="RED">RED (Critical)</option>
                          <option value="YELLOW">YELLOW (Warning)</option>
                          <option value="PURPLE">PURPLE (Elevated)</option>
                          <option value="STABLE">STABLE</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 font-black uppercase mb-1 block">
                          Impact Probability (%)
                        </label>
                        <input
                          type="number"
                          value={editFormData.impact_probability}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              impact_probability: e.target.value,
                            })
                          }
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-cyan-500 outline-none"
                          placeholder="e.g. 75"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[9px] text-slate-500 font-black uppercase mb-1 block">
                          Predicted Window (ISO/Custom)
                        </label>
                        <input
                          type="text"
                          value={editFormData.predicted_reentry_window}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              predicted_reentry_window: e.target.value,
                            })
                          }
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-cyan-500 outline-none"
                          placeholder="Optional window override"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[9px] text-slate-500 font-black uppercase mb-1 block">
                          Analyst Notes
                        </label>
                        <textarea
                          value={editFormData.notes}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              notes: e.target.value,
                            })
                          }
                          rows={2}
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-cyan-500 outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                      <div>
                        <p className="text-[9px] text-slate-500 font-black uppercase mb-1">
                          Severity
                        </p>
                        <p
                          className={`text-sm font-black uppercase ${alert.severity === "RED" ? "text-red-500" : alert.severity === "YELLOW" ? "text-yellow-500" : alert.severity === "PURPLE" ? "text-purple-500" : "text-green-500"}`}
                        >
                          {alert.severity || "STABLE"}
                        </p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-[9px] text-slate-500 font-black uppercase mb-1">
                          Notes
                        </p>
                        <p className="text-xs text-slate-300 font-mono line-clamp-2">
                          {alert.notes || "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : activeSection === "threshold_settings" ? (
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                <Settings size={20} className="text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Alert Thresholds
                </h3>
                <p className="text-[10px] text-slate-500 font-mono uppercase">
                  Configure global altitude boundaries (km)
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-black/30 border border-red-500/20 rounded-xl">
                  <label className="text-[10px] text-red-400 font-black uppercase mb-2 block">
                    Red Severity (CRITICAL)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs font-mono">
                      &lt;
                    </span>
                    <input
                      type="number"
                      value={alertSettings.red_threshold}
                      onChange={(e) =>
                        setAlertSettings({
                          ...alertSettings,
                          red_threshold: e.target.value,
                        })
                      }
                      className="w-full bg-black border border-white/10 rounded-lg p-2 text-white font-mono outline-none focus:border-red-500"
                    />
                    <span className="text-slate-500 text-xs font-mono">km</span>
                  </div>
                </div>

                <div className="p-4 bg-black/30 border border-yellow-500/20 rounded-xl">
                  <label className="text-[10px] text-yellow-400 font-black uppercase mb-2 block">
                    Yellow Severity (WARNING)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs font-mono">
                      &lt;
                    </span>
                    <input
                      type="number"
                      value={alertSettings.yellow_threshold}
                      onChange={(e) =>
                        setAlertSettings({
                          ...alertSettings,
                          yellow_threshold: e.target.value,
                        })
                      }
                      className="w-full bg-black border border-white/10 rounded-lg p-2 text-white font-mono outline-none focus:border-yellow-500"
                    />
                    <span className="text-slate-500 text-xs font-mono">km</span>
                  </div>
                </div>

                <div className="p-4 bg-black/30 border border-purple-500/20 rounded-xl">
                  <label className="text-[10px] text-purple-400 font-black uppercase mb-2 block">
                    Purple Severity (ELEVATED)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs font-mono">
                      &lt;
                    </span>
                    <input
                      type="number"
                      value={alertSettings.purple_threshold}
                      onChange={(e) =>
                        setAlertSettings({
                          ...alertSettings,
                          purple_threshold: e.target.value,
                        })
                      }
                      className="w-full bg-black border border-white/10 rounded-lg p-2 text-white font-mono outline-none focus:border-purple-500"
                    />
                    <span className="text-slate-500 text-xs font-mono">km</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/5">
                <button
                  onClick={async () => {
                    setIsSavingSettings(true);
                    try {
                      await satelliteService.updateAlertSettings(alertSettings);
                      fetchReports();
                    } catch (e) {
                      console.error(e);
                    }
                    setIsSavingSettings(false);
                  }}
                  disabled={isSavingSettings}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)] flex items-center gap-2"
                >
                  {isSavingSettings ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Save Thresholds
                </button>
              </div>
            </div>
          </div>
        ) : activeSection === "users_management" ? (
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user._id}
                className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 flex justify-between items-center group"
              >
                <div>
                  <p className="text-white font-black uppercase text-lg tracking-tight">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    {user.username} // {user.email || "NO EMAIL"} // ROLE:{" "}
                    {user.role}
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={user.role}
                    onChange={(e) => handleUserRole(user._id, e.target.value)}
                    disabled={actionLoading === `role_${user._id}`}
                    className="bg-black border border-white/10 rounded-xl p-2 text-[10px] font-black tracking-widest text-white uppercase focus:border-cyan-500 outline-none"
                  >
                    <option value="user">USER</option>
                    <option value="response_team">RESPONSE TEAM</option>
                    <option value="supervisor">SUPERVISOR</option>
                    <option value="admin">ADMIN</option>
                  </select>
                  <button
                    onClick={() => handleDeleteUser(user._id)}
                    disabled={
                      actionLoading === `delete_${user._id}` ||
                      user.role === "admin"
                    }
                    className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all border border-red-500/20 disabled:opacity-50"
                  >
                    {actionLoading === `delete_${user._id}` ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : activeSection === "system_logs" ? (
          <div className="space-y-4">
            {systemLogs.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-mono uppercase">
                No system logs found
              </div>
            ) : (
              systemLogs.map((log) => (
                <div
                  key={log._id}
                  className="flex gap-4 items-start bg-slate-900/40 p-4 rounded-xl border border-white/5"
                >
                  <div className="text-cyan-500 mt-1">
                    <Terminal size={14} />
                  </div>
                  <div>
                    <p className="text-sm text-white font-mono">{log.action}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      {new Date(log.timestamp).toLocaleString()} // BY:{" "}
                      {log.admin || "SYSTEM"}
                    </p>
                  </div>
                </div>
              ))
            )}
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
                      onClick={() => handleReview(report._id, "VERIFY")}
                      disabled={actionLoading === report._id}
                      className="flex-1 py-2.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={12} /> Verify
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
          autoReports.filter((r) => Number(r.altitude) < 150).length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-mono uppercase">
              No auto-generated reports — All satellites nominal
            </div>
          ) : (
            autoReports
              .filter((r) => Number(r.altitude) < 150)
              .map((report) => (
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
