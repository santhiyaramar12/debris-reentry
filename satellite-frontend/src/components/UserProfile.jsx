import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Shield,
  FileText,
  Camera,
  Save,
  CheckCircle,
  AlertTriangle,
  Activity,
  Calendar,
  Edit3,
  Rocket,
  X,
  ArrowLeft,
  Clock,
  XCircle,
} from "lucide-react";
import { satelliteService } from "../services/api";

const UserProfile = ({ setActiveTab }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const storedName = localStorage.getItem("name") || "Commander";
  const storedUsername = localStorage.getItem("username") || "user@spacetug.io";
  const storedRole = localStorage.getItem("role") || "user";
  const storedEmail = localStorage.getItem("email") || "";

  const [profileData, setProfileData] = useState({
    name: storedName,
    username: storedUsername,
    email: storedEmail,
    phone: "",
    role: storedRole,
    avatar: null,
  });

  const [editData, setEditData] = useState({ ...profileData });

  /* ── Fetch profile from backend ── */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await satelliteService.getProfile();
        if (data && data.status === "success" && data.profile) {
          const p = data.profile;
          setProfileData((prev) => ({
            ...prev,
            name: p.name || prev.name,
            email: p.email || "",
            phone: p.phone || "",
          }));
          setEditData((prev) => ({
            ...prev,
            name: p.name || prev.name,
            email: p.email || "",
            phone: p.phone || "",
          }));
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };
    fetchProfile();
    fetchUserReports();
  }, []);

  const fetchUserReports = async () => {
    try {
      const data = await satelliteService.getUserReports();
      setReports(data.reports || []);
    } catch (err) {
      console.error("Reports fetch error:", err);
    }
    setLoadingReports(false);
  };

  const handleSave = async () => {
    try {
      await satelliteService.updateProfile({
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
      });
      localStorage.setItem("name", editData.name);
      setProfileData({ ...editData });
      setSaveStatus("success");
      setIsEditing(false);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData((prev) => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const isAdmin = storedRole === "admin" || storedRole === "supervisor";
  const approvedCount = reports.filter((r) => r.status === "APPROVED").length;
  const pendingCount = reports.filter((r) => r.status === "PENDING").length;
  const rejectedCount = reports.filter((r) => r.status === "REJECTED").length;

  /* ── Report status icon helper ── */
  const getStatusIcon = (status) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle size={13} className="text-green-400" />;
      case "REJECTED":
        return <XCircle size={13} className="text-red-400" />;
      default:
        return <Clock size={13} className="text-yellow-400" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "APPROVED":
        return "✅ Approved";
      case "REJECTED":
        return "❌ Rejected";
      default:
        return "🕒 Pending";
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in">
      {/* Header */}
      <div className="flex justify-between items-center px-6 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab && setActiveTab("Home")}
            className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
            title="Back to Mission Hub"
          >
            <ArrowLeft size={16} className="text-slate-300" />
          </button>
          <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <User size={22} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">
              Mission Personnel
            </h2>
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">
              Profile & Activity Summary
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2">
        <div className="max-w-4xl mx-auto">
          {/* Profile Card */}
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl backdrop-blur-md p-8 mb-5">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Avatar */}
              <div className="relative group">
                <div
                  className={`w-28 h-28 rounded-2xl flex items-center justify-center border-2 overflow-hidden ${isAdmin ? "border-red-500/30 bg-red-500/10" : "border-cyan-500/30 bg-cyan-500/10"}`}
                >
                  {profileData.avatar || editData.avatar ? (
                    <img
                      src={editData.avatar || profileData.avatar}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User
                      size={48}
                      className={
                        isAdmin ? "text-red-400/50" : "text-cyan-400/50"
                      }
                    />
                  )}
                </div>
                {isEditing && (
                  <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-cyan-400 transition-colors shadow-lg">
                    <Camera size={14} className="text-black" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                )}
              </div>

              {/* Editable Fields */}
              <div className="flex-1 w-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    {/* Name */}
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, name: e.target.value }))
                        }
                        className="text-2xl font-black text-white bg-transparent border-b-2 border-cyan-500/50 focus:outline-none focus:border-cyan-400 pb-1 w-full uppercase italic tracking-tighter"
                      />
                    ) : (
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                        {profileData.name}
                      </h3>
                    )}

                    {/* Email */}
                    <div className="flex items-center gap-2 mt-2">
                      <Mail size={11} className="text-slate-500" />
                      {isEditing ? (
                        <input
                          type="email"
                          value={editData.email}
                          onChange={(e) =>
                            setEditData((p) => ({
                              ...p,
                              email: e.target.value,
                            }))
                          }
                          placeholder="Enter email address"
                          className="text-[10px] text-slate-300 font-mono bg-transparent border-b border-white/20 focus:outline-none focus:border-cyan-400 pb-0.5 w-full"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {profileData.email ||
                            profileData.username ||
                            "No email set"}
                        </span>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Phone size={11} className="text-slate-500" />
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editData.phone}
                          onChange={(e) =>
                            setEditData((p) => ({
                              ...p,
                              phone: e.target.value,
                            }))
                          }
                          placeholder="Enter phone number"
                          className="text-[10px] text-slate-300 font-mono bg-transparent border-b border-white/20 focus:outline-none focus:border-cyan-400 pb-0.5 w-full"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {profileData.phone || "No phone set"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit / Save / Cancel Buttons */}
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <button
                        onClick={() => {
                          setEditData({ ...profileData });
                          setIsEditing(true);
                        }}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-300 uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-cyan-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center gap-2"
                        >
                          <Save size={12} />
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center gap-2"
                        >
                          <X size={12} />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Role Badge */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isAdmin ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"}`}
                  >
                    <Shield size={11} />
                    {isAdmin ? "Mission Supervisor" : "Mission Operator"}
                  </div>
                  <div className="px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest bg-green-500/10 border border-green-500/20 text-green-400 flex items-center gap-1.5">
                    <Activity size={11} />
                    Active
                  </div>
                </div>

                {saveStatus === "success" && (
                  <div className="flex items-center gap-2 text-green-400 text-xs font-bold animate-pulse">
                    <CheckCircle size={14} /> Profile updated successfully
                  </div>
                )}
                {saveStatus === "error" && (
                  <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                    <AlertTriangle size={14} /> Failed to update profile. Try
                    again.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Report Status Summary Cards with Icons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl backdrop-blur-md p-5 text-center">
              <FileText
                size={20}
                className="text-cyan-400 mx-auto mb-2 opacity-50"
              />
              <p className="text-2xl font-mono font-black text-white">
                {reports.length}
              </p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">
                Total Reports
              </p>
            </div>
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl backdrop-blur-md p-5 text-center">
              <CheckCircle
                size={20}
                className="text-green-400 mx-auto mb-2 opacity-50"
              />
              <p className="text-2xl font-mono font-black text-green-400">
                {approvedCount}
              </p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">
                ✅ Approved
              </p>
            </div>
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl backdrop-blur-md p-5 text-center">
              <Clock
                size={20}
                className="text-yellow-400 mx-auto mb-2 opacity-50"
              />
              <p className="text-2xl font-mono font-black text-yellow-400">
                {pendingCount}
              </p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">
                🕒 Pending
              </p>
            </div>
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl backdrop-blur-md p-5 text-center">
              <XCircle
                size={20}
                className="text-red-400 mx-auto mb-2 opacity-50"
              />
              <p className="text-2xl font-mono font-black text-red-400">
                {rejectedCount}
              </p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">
                ❌ Rejected
              </p>
            </div>
          </div>

          {/* Recent Reports with status icons */}
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl backdrop-blur-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-cyan-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-tight">
                  Recent Submissions
                </h3>
              </div>
              <span className="text-[9px] font-mono text-slate-500">
                {reports.length} total
              </span>
            </div>

            {loadingReports ? (
              <div className="text-center py-8">
                <Activity className="w-6 h-6 text-cyan-500 mx-auto animate-pulse" />
                <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">
                  Loading activity...
                </p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
                <Rocket size={24} className="text-slate-600 mx-auto mb-3" />
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                  No reports submitted yet
                </p>
                <p className="text-[9px] text-slate-600 mt-1">
                  Submit re-entry sightings from the Mission Hub
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                {reports.slice(0, 10).map((report, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(report.status)}
                      <div>
                        <p className="text-[10px] text-white font-bold truncate max-w-[200px]">
                          {report.description?.slice(0, 50) ||
                            "Re-entry Report"}
                          ...
                        </p>
                        <p className="text-[8px] text-slate-500 font-mono flex items-center gap-1">
                          <Calendar size={8} />
                          {report.created_at
                            ? new Date(report.created_at).toLocaleDateString()
                            : "---"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${report.status === "APPROVED" ? "text-green-400 bg-green-500/10" : report.status === "REJECTED" ? "text-red-400 bg-red-500/10" : "text-yellow-400 bg-yellow-500/10"}`}
                    >
                      {getStatusLabel(report.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Back to Mission Hub */}
          <div className="mt-6 mb-8 text-center">
            <button
              onClick={() => setActiveTab && setActiveTab("Home")}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-300 uppercase tracking-widest hover:bg-cyan-500/10 hover:border-cyan-500/20 hover:text-cyan-400 transition-all inline-flex items-center gap-2"
            >
              <ArrowLeft size={12} />
              Back to Mission Hub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
