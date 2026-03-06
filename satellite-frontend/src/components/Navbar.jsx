import React, { useState } from "react";
import {
  Rocket,
  Home,
  AlertTriangle,
  Target,
  Satellite,
  Cloud,
  Activity,
  User,
  LogOut,
} from "lucide-react";

const Navbar = ({ activeTab, setActiveTab, onLogout }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const role = localStorage.getItem("role") || "user";
  const displayName = localStorage.getItem("name") || "Commander";
  const isAdmin = role === "admin" || role === "supervisor";

  // Exactly 5 tabs — no admin tab in nav
  const navItems = [
    { id: "Home", icon: Home, label: "Mission Hub" },
    { id: "Alerts", icon: AlertTriangle, label: "Crisis Alerts" },
    { id: "Missions", icon: Target, label: "Decay Forecast" },
    { id: "Satellites", icon: Satellite, label: "Orbital Globe" },
    { id: "Environment", icon: Cloud, label: "Environment" },
  ];

  return (
    <nav className="border-b border-white/10 bg-black/70 backdrop-blur-2xl px-5 py-2.5 flex justify-between items-center z-50 shadow-2xl relative">
      {/* LEFT: Logo + Nav Tabs */}
      <div className="flex items-center gap-5">
        <div
          className="flex items-center gap-2.5 px-2 group cursor-pointer"
          onClick={() => setActiveTab("Home")}
        >
          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-1.5 rounded-lg shadow-lg shadow-orange-600/20 group-hover:scale-110 transition-transform">
            <Rocket className="text-white fill-white" size={16} />
          </div>
          <h1 className="text-white font-black tracking-[0.15em] text-sm uppercase" style={{ fontFamily: 'var(--font-display)' }}>
            SPACETUG
          </h1>
        </div>

        <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-xl border border-white/10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative px-3.5 py-2 rounded-lg transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-400 nav-active-glow"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={13} />
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: User Info + Profile */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
          <span className="text-[8px] font-black text-green-400 uppercase tracking-widest">Live</span>
        </div>

        <div className="hidden md:flex items-center gap-2.5 pr-3 border-r border-white/10">
          <div className="text-right">
            <p className="text-[10px] font-black text-white uppercase tracking-tight leading-tight">
              {displayName}
            </p>
            <p className="text-[8px] text-cyan-500/70 font-bold uppercase tracking-widest flex items-center justify-end gap-1">
              <Activity size={7} />
              {isAdmin ? "Mission Supervisor" : "Mission Control"}
            </p>
          </div>
        </div>

        {/* Profile Button */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
              activeTab === "Profile"
                ? "bg-cyan-500/20 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                : "bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20"
            }`}
          >
            <User size={16} className="text-cyan-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute top-12 right-0 w-48 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in">
              <button
                onClick={() => {
                  setActiveTab("Profile");
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-[10px] font-bold text-slate-300 uppercase tracking-widest hover:bg-white/5 flex items-center gap-2 transition-colors"
              >
                <User size={13} className="text-cyan-400" />
                View Profile
              </button>
              <div className="border-t border-white/5" />
              <button
                onClick={() => {
                  onLogout();
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-[10px] font-bold text-red-400 uppercase tracking-widest hover:bg-red-500/10 flex items-center gap-2 transition-colors"
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {showProfileMenu && (
        <div
          className="fixed inset-0 z-[90]"
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;
