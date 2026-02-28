import React, { useState, useEffect } from "react";
import logo from "../assets/SpaceTug-logo (2).png";

const NAV_ITEMS = [
  { label: "Home", href: "#hero" }, // Landing page top start
  { label: "Re-Entry", href: "#reentry" },
  { label: "Monitor", href: "#stats" },
  { label: "Insights", href: "#insights" },
  { label: "SpaceWatch Logs", href: "#spacewatch" },
  { label: "Submit Intel", href: "#report" }, // Sighting report section
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const LandingNavbar = ({ onLoginClick, onMonitorClick }) => {
  // 1. Added onMonitorClick prop
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const container = document.getElementById("landing-scroll-container");
    if (!container) return;
    const handleScroll = () => setScrolled(container.scrollTop > 60);
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e, item) => {
    // 2. Changed param to item object
    e.preventDefault();
    const target = document.querySelector(item.href);

    // 3. Logic to trigger refresh only for Monitor
    if (item.label === "Monitor" && onMonitorClick) {
      onMonitorClick();
    }

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] px-5 py-3 flex items-center justify-between transition-all duration-500 ${
        scrolled
          ? "bg-[#060b13]/95 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      {/* Logo */}
      <a
        href="#hero"
        onClick={(e) => handleNavClick(e, { label: "Home", href: "#hero" })}
        className="flex items-center gap-2 group"
      >
        <img
          src={logo}
          alt="SpaceTug"
          className={`transition-all duration-500 ${
            scrolled ? "h-24" : "h-24"
          } group-hover:drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]`}
        />
      </a>

      {/* Nav Items */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            onClick={(e) => handleNavClick(e, item)}
            className="relative px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] hover:text-cyan-400 transition-colors duration-300 group"
          >
            {item.label}
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:w-3/4 transition-all duration-300 rounded-full" />
            <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-cyan-500/5" />
          </a>
        ))}

        {/* Login Button */}
        <button
          onClick={onLoginClick}
          className="ml-3 px-5 py-2 text-[11px] font-black text-cyan-400 uppercase tracking-[0.15em] border border-cyan-500/30 rounded-xl hover:bg-cyan-500/10 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300 backdrop-blur-sm"
        >
          Login
        </button>
      </div>

      {/* Mobile menu button */}
      <button
        onClick={onLoginClick}
        className="md:hidden px-4 py-2 text-[10px] font-black text-cyan-400 uppercase tracking-widest border border-cyan-500/30 rounded-lg"
      >
        Login
      </button>
    </nav>
  );
};

export default LandingNavbar;
