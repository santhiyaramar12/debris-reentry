import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Target,
  Satellite,
  Cloud,
  User,
  LogOut,
} from "lucide-react";

// Dummy SVG Logo used for Mobile View
const DummyLogo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" stroke="#06B6D4" strokeWidth="2" strokeDasharray="5 5" className="animate-[spin_8s_linear_infinite]" />
    <circle cx="16" cy="16" r="6" fill="#06B6D4" className="animate-pulse" />
  </svg>
);

const Navbar = ({ activeTab, setActiveTab, onLogout }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Smart Navbar Hiding Logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Reappear if mouse within top 100px. Otherwise hide.
      if (e.clientY <= 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const navItems = [
    { id: "Alerts", icon: AlertTriangle, label: "Crisis Alerts" },
    { id: "Missions", icon: Target, label: "Decay Forecast" },
    { id: "Satellites", icon: Satellite, label: "Orbital Globe" },
    { id: "Environment", icon: Cloud, label: "Environment Report" },
    { id: "Profile", icon: User, label: "Profile" },
  ];

  return (
    <nav
      className="flex justify-between items-center z-[9999] px-6 py-3 w-full"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        background: "rgba(2, 6, 23, 0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        transform: isVisible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.3s ease",
      }}
    >
      {/* ── LEFT: Logo + Nav Tabs ── */}
      <div className="flex items-center gap-6">
        {/* Logo Container */}
        <div className="flex items-center gap-3 cursor-pointer select-none">
          <div className="block md:hidden">
            <DummyLogo />
          </div>
        </div>

        {/* Vertical divider */}
        <div className="hidden md:block h-6 w-px shrink-0 bg-white/10" />

        {/* Nav items */}
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all duration-300"
                style={{
                  color: isActive ? "#06B6D4" : "rgba(148,163,184,0.7)",
                  background: isActive ? "rgba(6, 182, 212, 0.1)" : "transparent",
                  fontFamily: "'Syne', sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "#e2e8f0";
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "rgba(148,163,184,0.7)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <Icon size={14} style={{ color: isActive ? "#06B6D4" : "currentColor" }} />
                <span className="hidden lg:inline">{item.label}</span>
                {isActive && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                    style={{
                      background: "linear-gradient(90deg, transparent, #06B6D4, transparent)",
                      boxShadow: "0 0 10px rgba(6,182,212,0.8)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Live badge + Logout ── */}
      <div className="flex items-center gap-5">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/10">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#22c55e]" />
          <span className="text-[10px] font-black text-green-400 uppercase tracking-widest" style={{ fontFamily: "'Syne', sans-serif" }}>
            Live
          </span>
        </div>

        <button
          onClick={() => {
            try {
              const token = localStorage.getItem("access_token");
              const refreshToken = localStorage.getItem("refresh_token");
              if (token) {
                fetch("http://localhost:5000/api/auth/logout", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ refresh_token: refreshToken }),
                }).catch(() => {});
              }
            } catch (_) {}
            localStorage.clear();
            onLogout();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[#EF4444] hover:bg-red-500/10 transition-colors"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          <LogOut size={14} />
          <span className="hidden md:inline">End Session</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
