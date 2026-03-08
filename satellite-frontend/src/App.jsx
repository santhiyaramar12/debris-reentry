import React, { useState, useEffect } from "react";
import Preloader from "./components/Preloader";
import Login from "./components/Login";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import Navbar from "./components/Navbar";

function App() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() =>
    localStorage.getItem("access_token"),
  );
  const [activeTab, setActiveTab] = useState(() => {
    if (window.location.pathname === "/admin") return "Admin";
    return "Alerts";
  });
  const [showLogin, setShowLogin] = useState(false);

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setActiveTab("Alerts");
    setShowLogin(false);
    window.location.reload();
  };

  const handleLoadingFinished = () => {
    setLoading(false);
  };

  const handleLoginSuccess = (newToken) => {
    setToken(newToken);
    setShowLogin(false);
    const savedRole = localStorage.getItem("role") || "user";
    if (
      window.location.pathname === "/admin" &&
      (savedRole === "admin" || savedRole === "supervisor")
    ) {
      setActiveTab("Admin");
    } else {
      setActiveTab("Alerts");
      if (window.location.pathname === "/admin") {
        window.history.replaceState({}, "", "/");
      }
    }
  };

  const handleEnterMission = () => {
    if (token) {
      setActiveTab("Alerts");
    } else {
      setShowLogin(true);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    if (savedToken) {
      setToken(savedToken);
      const savedRole = localStorage.getItem("role") || "user";
      if (
        window.location.pathname === "/admin" &&
        !(savedRole === "admin" || savedRole === "supervisor")
      ) {
        setActiveTab("Alerts");
        window.history.replaceState({}, "", "/");
      }
    } else if (window.location.pathname === "/admin") {
      setShowLogin(true);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "Admin" && window.location.pathname !== "/admin") {
      window.history.pushState({}, "", "/admin");
    } else if (activeTab !== "Admin" && window.location.pathname === "/admin") {
      window.history.pushState({}, "", "/");
    }
  }, [activeTab]);

  return (
    <div className="w-full h-screen bg-[#020617] text-slate-200 font-sans selection:bg-sky-500/30 flex flex-col overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700;800&family=Share+Tech+Mono&display=swap');

        :root {
          --font-display: 'Orbitron', 'Syne', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
          --font-tle: 'Share Tech Mono', monospace;
          --color-cyan: #06B6D4;
          --color-alert: #EF4444;
          --color-solar: #FFD700;
          --color-orbit: #00FF88;
        }

        .glass-card {
          background: rgba(2, 6, 23, 0.55);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(6, 182, 212, 0.12);
          border-radius: 1rem;
        }
        .glass-card:hover {
          border-color: rgba(6, 182, 212, 0.22);
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes caPing { 0% { transform: scale(1); opacity: .8; } 75%, 100% { transform: scale(2.4); opacity: 0; } }

        .animate-in { animation: fadeIn 0.5s ease-out forwards; }
        .slide-in-from-bottom { animation: slideInUp 0.7s ease-out forwards; }
        .slide-in-from-right { animation: slideInRight 0.5s ease-out forwards; }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.5); }

        .font-telemetry { font-family: 'JetBrains Mono', monospace; }
        .font-tle { font-family: 'Share Tech Mono', monospace; }
        .font-orbitron { font-family: 'Orbitron', sans-serif; }
      `}</style>

      {loading ? (
        <Preloader onFinished={handleLoadingFinished} />
      ) : !token ? (
        showLogin ? (
          <Login
            role="user"
            setToken={handleLoginSuccess}
            onBack={() => setShowLogin(false)}
          />
        ) : (
          <div className="flex-1 overflow-hidden relative">
            <LandingPage
              onEnterMission={handleEnterMission}
              onLoginClick={() => setShowLogin(true)}
            />
          </div>
        )
      ) : (
        <>
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={logout}
          />
          <div className="flex-1 overflow-hidden">
            <Dashboard
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              setToken={setToken}
              logout={logout}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
