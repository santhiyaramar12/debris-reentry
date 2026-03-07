import React, { useState } from "react";
import {
  Home,
  AlertTriangle,
  Target,
  Satellite,
  Cloud,
  User,
  LogOut,
  Shield,
} from "lucide-react";
import spacetugLogo from "../assets/SpaceTug-logo (2).png";

const Navbar = ({ activeTab, setActiveTab, onLogout }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const role = localStorage.getItem("role") || "user";
  const displayName = localStorage.getItem("name") || "User";

  const navItems = [
    { id: "Home", icon: Home, label: "Mission Hub" },
    { id: "Alerts", icon: AlertTriangle, label: "Crisis Alerts" },
    { id: "Missions", icon: Target, label: "Decay Forecast" },
    { id: "Satellites", icon: Satellite, label: "Orbital Globe" },
    { id: "Environment", icon: Cloud, label: "Environment" },
  ];

  return (
    <>
      <nav
        className="border-b flex justify-between items-center z-50 relative px-5 py-2"
        style={{
          background: "rgba(2, 6, 23, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "rgba(255,255,255,0.07)",
          boxShadow: "0 1px 0 rgba(6,182,212,0.06), 0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* ── LEFT: Logo + Nav Tabs ── */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer group shrink-0"
            onClick={() => setActiveTab("Home")}
            style={{ transition: "opacity 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.82")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <img
              src={spacetugLogo}
              alt="SpaceTug"
              style={{
                height: "100px",
                width: "auto",
                objectFit: "contain",
                display: "block",
                userSelect: "none",
              }}
            />
          </div>

          {/* Vertical divider */}
          <div
            className="hidden md:block h-6 w-px shrink-0"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />

          {/* Nav items */}
          <div className="flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200"
                  style={{
                    color: isActive ? "#67e8f9" : "rgba(148,163,184,0.8)",
                    background: isActive
                      ? "rgba(6,182,212,0.09)"
                      : "transparent",
                    fontFamily: "'Syne', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "#e2e8f0";
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "rgba(148,163,184,0.8)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {/* Icon */}
                  <Icon
                    size={13}
                    style={{
                      color: isActive ? "#06b6d4" : "currentColor",
                      filter: isActive
                        ? "drop-shadow(0 0 5px rgba(6,182,212,0.65))"
                        : "none",
                      transition: "filter 0.2s",
                    }}
                  />

                  {/* Label */}
                  <span className="hidden lg:inline">{item.label}</span>

                  {/* Active glow underline */}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, #06b6d4, transparent)",
                        boxShadow: "0 0 8px rgba(6,182,212,0.8)",
                        animation: "nbUnderlineIn 0.25s ease-out forwards",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Live badge + user info + avatar ── */}
        <div className="flex items-center gap-3">
          {/* Live badge */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"
              style={{ boxShadow: "0 0 6px rgba(34,197,94,0.6)" }}
            />
            <span
              className="text-[8px] font-black text-green-400 uppercase tracking-widest"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Live
            </span>
          </div>

          {/* User info */}
          <div
            className="hidden md:flex items-center gap-2.5 pr-3"
            style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="text-right">
              <p
                className="text-[10px] font-black text-white uppercase tracking-tight leading-tight"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {displayName}
              </p>
            </div>
          </div>

          {/* Avatar / profile button */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 cursor-pointer"
              style={{
                background:
                  activeTab === "Profile"
                    ? "rgba(6,182,212,0.2)"
                    : "rgba(6,182,212,0.08)",
                borderColor:
                  activeTab === "Profile"
                    ? "rgba(6,182,212,0.45)"
                    : "rgba(6,182,212,0.18)",
                boxShadow:
                  activeTab === "Profile"
                    ? "0 0 16px rgba(6,182,212,0.3)"
                    : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(6,182,212,0.18)";
                e.currentTarget.style.borderColor = "rgba(6,182,212,0.4)";
                e.currentTarget.style.boxShadow =
                  "0 0 12px rgba(6,182,212,0.22)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  activeTab === "Profile"
                    ? "rgba(6,182,212,0.2)"
                    : "rgba(6,182,212,0.08)";
                e.currentTarget.style.borderColor =
                  activeTab === "Profile"
                    ? "rgba(6,182,212,0.45)"
                    : "rgba(6,182,212,0.18)";
                e.currentTarget.style.boxShadow =
                  activeTab === "Profile"
                    ? "0 0 16px rgba(6,182,212,0.3)"
                    : "none";
              }}
            >
              <User size={16} className="text-cyan-400" />
            </button>

            {/* Dropdown */}
            {showProfileMenu && (
              <div
                className="absolute top-12 right-0 w-52 rounded-xl overflow-hidden z-[200]"
                style={{
                  background: "rgba(8,15,35,0.97)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  boxShadow:
                    "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(6,182,212,0.08)",
                  animation: "nbDropIn 0.18s ease-out forwards",
                }}
              >
                {/* Profile header inside dropdown */}
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p
                    className="text-[10px] font-black text-white uppercase tracking-tight"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    {displayName}
                  </p>
                  <p
                    className="text-[8px] mt-0.5"
                    style={{
                      color: "rgba(6,182,212,0.6)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Role: {role.charAt(0).toUpperCase() + role.slice(1)}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setActiveTab("Profile");
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 transition-colors duration-150"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.05)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <User size={13} className="text-cyan-400" />
                  View Profile
                </button>

                {(role === "admin" || role === "supervisor") && (
                  <button
                    onClick={() => {
                      setActiveTab("Admin");
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2 transition-colors duration-150"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <Shield size={13} className="text-cyan-400" />
                    Admin Panel
                  </button>
                )}

                <div
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                />

                <button
                  /* onClick={() => {
                    setShowProfileMenu(false);

                    // Clear all auth data immediately
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    localStorage.removeItem("username");
                    localStorage.removeItem("role");
                    localStorage.removeItem("name");
                    localStorage.removeItem("email");

                    // Call parent logout
                    onLogout();

                    // Hard refresh to reset axios interceptor state
                    window.location.href = "/";
                  }}*/
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full px-4 py-3 text-left text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2 transition-colors duration-150"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(239,68,68,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <LogOut size={13} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Click-away backdrop for dropdown */}
      {showProfileMenu && (
        <div
          className="fixed inset-0 z-[40]"
          onClick={() => setShowProfileMenu(false)}
        />
      )}

      {/* Navbar-scoped CSS */}
      <style>{`
        @keyframes nbUnderlineIn {
          from { opacity: 0; transform: scaleX(0.4); }
          to   { opacity: 1; transform: scaleX(1); }
        }
        @keyframes nbDropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default Navbar;
