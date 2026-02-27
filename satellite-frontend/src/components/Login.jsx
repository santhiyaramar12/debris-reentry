import React, { useState } from "react";
import axios from "axios";
import {
  User,
  Rocket,
  RotateCcw,
  Globe,
  Cpu,
  Lock,
  Mail,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";

const Login = ({ setToken, role = "user", onBack }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const isAdmin = role === "admin";

  const handleAuthorize = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isRegistering
        ? "http://localhost:5000/api/auth/register"
        : "http://localhost:5000/api/auth/login";

      const payload = isRegistering
        ? { name, username: email, password, role: role }
        : { username: email, password };

      const response = await axios.post(endpoint, payload);

      if (isRegistering) {
        alert("ACCESS GRANTED: PERSONNEL ENROLLED! 🛰️");
        setIsRegistering(false);
      } else {
        if (response.data.access_token) {
          // Store all auth data
          localStorage.setItem("access_token", response.data.access_token);
          localStorage.setItem("refresh_token", response.data.refresh_token || "");
          localStorage.setItem("username", response.data.username || "COMMANDER");
          localStorage.setItem("role", response.data.role || "user");
          localStorage.setItem("name", response.data.name || "Commander");

          setToken(response.data.access_token);
        }
      }
    } catch (error) {
      console.error("UPLINK_ERROR:", error);
      const errorMsg =
        error.response?.data?.message ||
        "MISSION DENIED: SECURITY PROTOCOLS FAILED!";
      alert(`${errorMsg} ❌`);
    }
  };

  const handleReset = () => {
    setEmail("");
    setPassword("");
    setName("");
  };

  const accentColor = isAdmin ? "red" : "cyan";
  const accentHex = isAdmin ? "#ef4444" : "#06b6d4";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden font-mono">
      <div className="absolute opacity-10 animate-[spin_100s_linear_infinite]">
        <Globe
          className="w-[900px] h-[900px]"
          style={{ color: accentHex }}
          strokeWidth={0.5}
        />
      </div>

      <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[150px] ${isAdmin ? "bg-red-600/10" : "bg-blue-600/10"}`} />
      <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[150px] ${isAdmin ? "bg-orange-600/10" : "bg-cyan-600/10"}`} />

      <div className={`relative z-10 w-full max-w-md p-10 rounded-[2.5rem] border bg-slate-900/40 backdrop-blur-2xl ${
        isAdmin
          ? "border-red-500/20 shadow-[0_0_80px_rgba(239,68,68,0.15)]"
          : "border-cyan-500/20 shadow-[0_0_80px_rgba(6,182,212,0.15)]"
      }`}>
        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-6 left-6 flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}

        <div className="flex flex-col items-center mb-10">
          <div className="relative">
            <div className={`absolute -inset-4 border-t-2 border-b-2 border-dashed rounded-full animate-[spin_8s_linear_infinite] ${
              isAdmin ? "border-red-400/40" : "border-cyan-400/40"
            }`} />
            <div className={`relative p-5 rounded-full border ${
              isAdmin
                ? "bg-gradient-to-b from-red-500/20 to-transparent border-red-400/30"
                : "bg-gradient-to-b from-cyan-500/20 to-transparent border-cyan-400/30"
            }`}>
              {isAdmin ? (
                <ShieldAlert className="w-12 h-12 text-red-400 animate-pulse" />
              ) : (
                <Cpu className="w-12 h-12 text-cyan-400 animate-pulse" />
              )}
            </div>
          </div>
          <h1 className="mt-8 text-3xl font-black text-white tracking-[0.4em] text-center">
            {isRegistering ? "ENROLLMENT" : "SPACETUG"}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`h-[1px] w-8 ${isAdmin ? "bg-red-500/30" : "bg-cyan-500/30"}`} />
            <p className={`text-[9px] tracking-[0.3em] uppercase font-bold ${
              isAdmin ? "text-red-500/60" : "text-cyan-500/60"
            }`}>
              {isRegistering
                ? `New ${isAdmin ? "Admin" : "User"} Registration`
                : isAdmin
                  ? "Admin Authorization"
                  : "Mission Control Access"}
            </p>
            <span className={`h-[1px] w-8 ${isAdmin ? "bg-red-500/30" : "bg-cyan-500/30"}`} />
          </div>
        </div>

        <form onSubmit={handleAuthorize} className="space-y-6" autoComplete="off">
          <input type="text" name="email" style={{ display: "none" }} tabIndex="-1" />
          <input type="password" name="password" style={{ display: "none" }} tabIndex="-1" />

          {isRegistering && (
            <div className="space-y-2">
              <label className={`text-[10px] font-bold tracking-widest uppercase ml-1 ${
                isAdmin ? "text-red-400" : "text-cyan-400"
              }`}>
                Personnel Name
              </label>
              <div className="relative flex items-center">
                <User className={`absolute left-4 w-5 h-5 ${isAdmin ? "text-red-400/50" : "text-cyan-400/50"}`} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="FULL NAME..."
                  className={`w-full bg-black/50 border rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none transition-all text-sm ${
                    isAdmin ? "border-red-500/20 focus:border-red-400" : "border-cyan-500/20 focus:border-cyan-400"
                  }`}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className={`text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 ${
                isAdmin ? "text-red-400" : "text-cyan-400"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-ping ${isAdmin ? "bg-red-500" : "bg-cyan-500"}`} />
                Personnel Identity
              </label>
            </div>
            <div className="relative flex items-center">
              <Mail className={`absolute left-4 w-5 h-5 ${isAdmin ? "text-red-400/50" : "text-cyan-400/50"}`} />
              <input
                type="text"
                required
                autoComplete="new-off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ID CODE / EMAIL..."
                className={`w-full bg-black/50 border rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none transition-all text-sm ${
                  isAdmin ? "border-red-500/20 focus:border-red-400" : "border-cyan-500/20 focus:border-cyan-400"
                }`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-bold tracking-widest uppercase ml-1 ${
              isAdmin ? "text-red-400" : "text-cyan-400"
            }`}>
              Orbital Clearance
            </label>
            <div className="relative flex items-center">
              <Lock className={`absolute left-4 w-5 h-5 ${isAdmin ? "text-red-400/50" : "text-cyan-400/50"}`} />
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ENTER ACCESS KEY..."
                className={`w-full bg-black/50 border rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none transition-all text-sm ${
                  isAdmin ? "border-red-500/20 focus:border-red-400" : "border-cyan-500/20 focus:border-cyan-400"
                }`}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className={`flex-1 h-14 border font-black rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 group ${
                isAdmin
                  ? "bg-red-500/10 hover:bg-red-500/20 border-red-400 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                  : "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
              }`}
            >
              <Rocket className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <span className="tracking-[0.1em]">
                {isRegistering ? "ENROLL" : "AUTHORIZE"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="w-14 h-14 flex items-center justify-center bg-slate-800/30 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/50 text-slate-500 hover:text-red-500 rounded-xl transition-all"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className={`text-[10px] hover:text-white transition-colors uppercase tracking-widest font-bold underline underline-offset-4 ${
              isAdmin ? "text-red-500/60 decoration-red-500/20" : "text-cyan-500/60 decoration-cyan-500/20"
            }`}
          >
            {isRegistering ? "Already Enrolled? Login Here" : "Enroll for Mission"}
          </button>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800/50 flex justify-between items-center text-[7px] text-slate-500 font-mono tracking-tighter">
          <div className="flex gap-3">
            <span>SYS_ST: V2.0.4</span>
            <span className="text-cyan-800">|</span>
            <span>ENC: AES-256</span>
          </div>
          <span className={`animate-pulse uppercase ${isAdmin ? "text-red-500" : "text-cyan-500"}`}>
            {isAdmin ? "● ADMIN LINK" : "● LINK STATUS: CONNECTED"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
