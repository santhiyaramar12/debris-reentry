import React, { useState, useEffect } from "react";
import {
  FileText,
  Activity,
  Database,
  Download,
  ShieldCheck,
  Zap,
  Mail,
  Loader2,
} from "lucide-react";

const ReportView = ({ asset }) => {
  const [telemetry, setTelemetry] = useState({
    velocity: 7.62,
    altitude: asset?.altitude || 240,
    period: 92.5,
    inclination: 82.52,
  });

  // EMAIL STATES
  const [emailAddress, setEmailAddress] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        velocity: (7.62 + (Math.random() * 0.02 - 0.01)).toFixed(3),
        altitude: (
          Number(asset?.altitude || 240) +
          Math.random() * 0.1
        ).toFixed(2),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [asset, showPath]);

  // EMAIL HANDLER FUNCTION
  const handleDispatchEmail = async () => {
    if (!emailAddress) return alert("Please enter an email address");

    setIsSending(true);
    setStatusMsg("Preparing secure transmission...");

    const reportData = {
      to: emailAddress,
      subject: `OFFICIAL REPORT: ${asset.name} (NORAD:${asset.norad_id})`,
      content: {
        target: asset.name,
        id: asset.norad_id,
        velocity: telemetry.velocity,
        altitude: telemetry.altitude,
        timestamp: new Date().toISOString(),
      },
    };

    try {
      // Ungal Backend API-ku connect panna:
      const response = await fetch("http://localhost:5000/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        setStatusMsg("Report Dispatched Successfully!");
        setTimeout(() => setStatusMsg(""), 3000);
      } else {
        throw new Error("Failed to send");
      }
    } catch (err) {
      console.error(err);
      setStatusMsg("Error: Server Connection Failed");
    } finally {
      setIsSending(false);
    }
  };

  if (!asset)
    return (
      <div className="h-full flex items-center justify-center text-slate-500 font-mono uppercase tracking-widest">
        Select an object to generate technical report
      </div>
    );

  return (
    <div className="p-6 bg-[#020617] min-h-screen text-slate-300 font-sans animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-white/10 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={16} className="text-cyan-400" />
            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em]">
              Authorized Access Only // Level 4 Clearance
            </span>
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
            Technical Intelligence Report
          </h1>
          <p className="text-xs font-mono text-slate-500 uppercase mt-1">
            System generated: {new Date().toUTCString()}
          </p>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all rounded-sm">
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMN 1: OBJECT IDENTITY & EMAIL DISPATCH */}
        <div className="lg:col-span-1 space-y-6">
          {/* EMAIL BOX - NEWLY ADDED */}
          <div className="bg-cyan-950/20 border border-cyan-500/30 p-6 rounded-2xl backdrop-blur-md">
            <h3 className="flex items-center gap-2 text-[10px] font-black text-cyan-400 uppercase mb-4">
              <Mail size={12} /> Secure Email Dispatch
            </h3>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="commander@spacecom.gov"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleDispatchEmail}
                disabled={isSending}
                className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Mail size={14} />
                )}
                {isSending ? "Transmitting..." : "Send Authorized Report"}
              </button>
              {statusMsg && (
                <p className="text-[9px] text-center font-mono text-cyan-400 uppercase animate-pulse">
                  {statusMsg}
                </p>
              )}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
            <h3 className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase mb-4">
              <Database size={12} /> Target Identification
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[8px] uppercase text-slate-500">
                  Common Name
                </p>
                <p className="text-xl font-bold text-white tracking-tight">
                  {asset.name || "COSMOS 1408 DEB"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] uppercase text-slate-500">
                    NORAD ID
                  </p>
                  <p className="text-lg font-mono text-cyan-400">
                    {asset.norad_id || "30024"}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] uppercase text-slate-500">
                    Object Class
                  </p>
                  <p className="text-lg font-bold text-red-500 uppercase italic">
                    Debris
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-black border-l-2 border-cyan-500 p-6 font-mono relative overflow-hidden text-[10px]">
            <h3 className="text-cyan-500 font-black uppercase mb-3 text-[10px]">
              Raw TLE Data Block
            </h3>
            <div className="text-slate-400 leading-relaxed break-all">
              1 {asset.norad_id}U 06057A 26055.58913161 .00012921 00000-0
              11342-3 0 9991
              <br />2 {asset.norad_id} {telemetry.inclination} 294.0248 0001432
              94.1234 266.0231 15.34029481
            </div>
          </div>
        </div>

        {/* COLUMN 2: ORBITAL PHYSICS METRICS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              icon={<Zap size={10} className="text-yellow-500" />}
              label="Velocity (V)"
              value={telemetry.velocity}
              unit="km/s"
            />
            <MetricCard
              icon={<Activity size={10} className="text-cyan-500" />}
              label="Mean Motion"
              value="15.42"
              unit="rev/day"
            />
            <MetricCard
              icon={<Activity size={10} className="text-red-500" />}
              label="Decay Rate"
              value="1.432"
              unit="km/d"
            />
          </div>

          <div className="bg-slate-900/20 border border-white/10 rounded-3xl p-8">
            <h3 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-6 border-b border-white/5 pb-4">
              Orbital State Vectors (ECI Frame)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <VectorGroup
                label="Position (km)"
                values={{ X: "-4231.2", Y: "1245.8", Z: "5321.0" }}
              />
              <VectorGroup
                label="Velocity (km/s)"
                values={{ VX: "-1.243", VY: "6.532", VZ: "3.112" }}
                color="text-cyan-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// HELPER COMPONENTS
const MetricCard = ({ icon, label, value, unit }) => (
  <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl">
    <p className="text-[9px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2">
      {icon} {label}
    </p>
    <p className="text-3xl font-black text-white italic">
      {value} <span className="text-xs font-normal opacity-40">{unit}</span>
    </p>
  </div>
);

const VectorGroup = ({ label, values, color }) => (
  <div className="space-y-4">
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
      {label}
    </p>
    <div className="grid grid-cols-3 gap-2">
      {Object.entries(values).map(([k, v]) => (
        <div
          key={k}
          className="bg-black/40 p-3 rounded-lg border border-white/5"
        >
          <p className="text-[8px] text-slate-600 font-bold mb-1">{k}</p>
          <p className={`text-xs font-mono font-bold ${color || "text-white"}`}>
            {v}
          </p>
        </div>
      ))}
    </div>
  </div>
);

export default ReportView;
