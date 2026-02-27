import React, { useState, useEffect } from "react";
import Preloader from "./components/Preloader";
import Login from "./components/Login";
import HomePage from "./components/HomePage";
import Dashboard from "./components/Dashboard";
import Navbar from "./components/Navbar";

function App() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("access_token"));
  const [activeTab, setActiveTab] = useState("Home");
  const [loginRole, setLoginRole] = useState(null); // 'admin' or 'user'

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    setToken(null);
    setActiveTab("Home");
    setLoginRole(null);
  };

  const handleLoadingFinished = () => {
    setLoading(false);
  };

  const handleNavigateLogin = (role) => {
    setLoginRole(role);
  };

  const handleLoginSuccess = (newToken) => {
    setToken(newToken);
    setLoginRole(null);
    setActiveTab("Home");
  };

  // Token persistence on refresh
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

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
        loginRole ? (
          /* Show Login form for specific role */
          <Login
            role={loginRole}
            setToken={handleLoginSuccess}
            onBack={() => setLoginRole(null)}
          />
        ) : (
          /* Show Home page with Admin/User login buttons */
          <div className="flex-1 overflow-hidden">
            <HomePage
              onNavigateLogin={handleNavigateLogin}
              isLoggedIn={false}
            />
          </div>
        )
      ) : (
        /* Authenticated: Show Navbar + Dashboard */
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
