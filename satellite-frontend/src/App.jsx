import React, { useState, useEffect } from "react";
import Preloader from "./components/Preloader";
import Login from "./components/Login";
import LandingPage from "./components/LandingPage";
// LandingNavbar-ah inga irundhu thookittu LandingPage kulla mattum maintain pannuvom
import Dashboard from "./components/Dashboard";
import Navbar from "./components/Navbar";

function App() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() =>
    localStorage.getItem("access_token"),
  );
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize based on URL
    if (window.location.pathname === "/admin") return "Admin";
    return "Home";
  });
  const [showLogin, setShowLogin] = useState(false);

 /* const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    setToken(null);
    setActiveTab("Home");
    setShowLogin(false);
  };*/
  const logout = () => {
    localStorage.clear();

    setToken(null);
    setActiveTab("Home");
    setShowLogin(false);

    // Force full React refresh
    window.location.reload();
  };

  const handleLoadingFinished = () => {
    setLoading(false);
  };

  const handleLoginSuccess = (newToken) => {
    setToken(newToken);
    setShowLogin(false);
    
    // Resume to Admin if intended, else Home
    const savedRole = localStorage.getItem("role") || "user";
    if (window.location.pathname === "/admin" && (savedRole === "admin" || savedRole === "supervisor")) {
      setActiveTab("Admin");
    } else {
      setActiveTab("Home");
      if (window.location.pathname === "/admin") {
        window.history.replaceState({}, "", "/");
      }
    }
  };

  const handleEnterMission = () => {
    if (token) {
      setActiveTab("Home");
    } else {
      setShowLogin(true);
    }
  };

  // Token persistence on refresh
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    if (savedToken) {
      setToken(savedToken);
      
      const savedRole = localStorage.getItem("role") || "user";
      if (window.location.pathname === "/admin" && !(savedRole === "admin" || savedRole === "supervisor")) {
        setActiveTab("Home");
        window.history.replaceState({}, "", "/");
      }
    } else if (window.location.pathname === "/admin") {
      // If we land on /admin but not logged in, show login immediately
      setShowLogin(true);
    }
  }, []);

  // Sync URL with activeTab
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
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-in { animation: fadeIn 0.5s ease-out forwards; }
        .slide-in-from-bottom { animation: slideInUp 0.7s ease-out forwards; }
        .slide-in-from-right { animation: slideInRight 0.5s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.5); }
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
          /* FIXED: LandingNavbar-ah LandingPage props vazhiya control pannuvom */
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
