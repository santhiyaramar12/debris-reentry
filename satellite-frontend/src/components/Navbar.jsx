import React from "react";
import {
  Rocket,
  Home,
  Target,
  AlertTriangle,
  FileText,
  Satellite,
  ShieldCheck,
  Zap,
  Activity,
  User,
} from "lucide-react";

const Navbar = ({ activeTab, setActiveTab, onLogout }) => {
  const role = localStorage.getItem("role") || "user";
  const username = localStorage.getItem("username") || "COMMANDER";
  const isAdmin = role === "admin" || role === "supervisor";

  const navItems = [
    { id: "Home", icon: Home, label: "Home", roles: ["user", "admin", "supervisor"] },
    { id: "Missions", icon: Target, label: "Missions", roles: ["user", "admin", "supervisor"] },
    { id: "Alerts", icon: AlertTriangle, label: "Alerts", roles: ["user", "admin", "supervisor"] },
    { id: "Reports", icon: FileText, label: "Reports", roles: ["user", "admin", "supervisor"] },
    { id: "Satellites", icon: Satellite, label: "Satellites", roles: ["user", "admin", "supervisor"] },
    { id: "Admin", icon: ShieldCheck, label: "Admin Panel", roles: ["admin", "supervisor"] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <nav className="border-b border-white/10 bg-black/60 backdrop-blur-2xl px-4 py-3 flex justify-between items-center z-50 shadow-2xl">
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-2 group cursor-pointer"
          onClick={() => setActiveTab("Home")}
        >
          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-1.5 rounded-lg shadow-lg shadow-orange-600/20 group-hover:scale-110 transition-transform">
            <Rocket className="text-white fill-white" size={16} />
          </div>
          <h1 className="text-white font-black tracking-[0.2em] text-base uppercase italic">
            SPACETUG
          </h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isAdminTab = item.id === "Admin";

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-2 rounded-lg transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                  isActive
                    ? isAdminTab
                      ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                      : "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                    : isAdminTab
                      ? "text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={12} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right side - User info & Logout */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-3 pr-4 border-r border-white/10">
          <div className="text-right">
            <p className="text-[10px] font-black text-white uppercase tracking-tight">
              {username}
            </p>
            <p className="text-[8px] text-cyan-500 font-bold uppercase tracking-widest opacity-80 flex items-center justify-end gap-1">
              <Activity size={8} />
              {isAdmin ? "Mission Supervisor" : "Mission Control"}
            </p>
          </div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center border ${
              isAdmin
                ? "bg-red-500/10 border-red-500/20"
                : "bg-cyan-500/10 border-cyan-500/20"
            }`}
          >
            <User size={16} className={isAdmin ? "text-red-400" : "text-cyan-500"} />
          </div>
        </div>

        {isAdmin && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <ShieldCheck size={12} className="text-red-400" />
            <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">
              Admin
            </span>
          </div>
        )}

        <button
          onClick={onLogout}
          className="group bg-red-500/10 hover:bg-red-500 p-2.5 rounded-xl transition-all border border-red-500/20"
          title="Logout"
        >
          <Zap
            size={16}
            className="text-red-500 group-hover:text-white transition-colors"
          />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
