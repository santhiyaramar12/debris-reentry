import React, { useState, useEffect } from "react";
import { CloudRain, Sun, Activity, ArrowDownRight, Wind } from "lucide-react";

// Mock data generator for graphs
const generateGraphData = (pts, min, max) => 
  Array.from({ length: pts }, (_, i) => ({
    time: i,
    value: min + Math.random() * (max - min)
  }));

const SparklineSVG = ({ data, color, height = 60 }) => {
  const maxVal = Math.max(...data.map(d => d.value));
  const minVal = Math.min(...data.map(d => d.value));
  const range = maxVal - minVal || 1;
  const w = 200, h = height;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.value - minVal) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 -10 ${w} ${h + 20}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polyline points={`${0},${h} ${points} ${w},${h}`} fill={`url(#grad-${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Animated Scanline */}
      <line x1="0" y1="0" x2="0" y2={h} stroke="#fff" strokeWidth="1" opacity="0.5" className="animate-[scan_3s_linear_infinite]" />
    </svg>
  );
};

const StatCard = ({ title, value, unit, icon: Icon, color, data, trend }) => (
  <div className="bg-slate-900/60 border rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group transition-all" style={{ borderColor: `${color}30` }}>
    {/* Background Glow */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity" style={{ background: `radial-gradient(circle at center, ${color}, transparent 70%)` }} />
    
    <div className="flex justify-between items-start mb-6 relative z-10">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ background: `${color}15`, color }}>
          <Icon size={20} />
        </div>
        <h3 className="font-display font-bold text-sm uppercase tracking-widest text-slate-300">{title}</h3>
      </div>
      <div className="text-right">
        <div className="font-mono text-3xl font-black text-white glow-text" style={{ textShadow: `0 0 15px ${color}80` }}>
          {value}
        </div>
        <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">{unit} 
          <span className="ml-2" style={{ color: trend > 0 ? '#ef4444' : '#22c55e' }}>
            {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        </div>
      </div>
    </div>

    <div className="mt-4 relative z-10">
      <SparklineSVG data={data} color={color} />
      <div className="flex justify-between mt-2 font-mono text-[8px] text-slate-500 uppercase tracking-widest border-t border-slate-700/50 pt-2">
        <span>T - 24H</span>
        <span>CURRENT</span>
      </div>
    </div>
  </div>
);

const EnvironmentPage = () => {
  const [data, setData] = useState({
    drag: generateGraphData(24, 1.2e-12, 3.5e-12),
    solar: generateGraphData(24, 120, 180),
    density: generateGraphData(24, 0.4, 0.9),
    decay: generateGraphData(24, 1.5, 5.0)
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setData(prev => ({
        drag: [...prev.drag.slice(1), { time: 24, value: 1.2e-12 + Math.random() * 2e-12 }],
        solar: [...prev.solar.slice(1), { time: 24, value: 120 + Math.random() * 60 }],
        density: [...prev.density.slice(1), { time: 24, value: 0.4 + Math.random() * 0.5 }],
        decay: [...prev.decay.slice(1), { time: 24, value: 1.5 + Math.random() * 3.5 }]
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full bg-[#020617] p-8 overflow-y-auto custom-scrollbar relative">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-10 flex justify-between items-end border-b border-cyan-500/20 pb-6">
          <div>
            <h1 className="text-4xl font-display font-black text-white uppercase tracking-widest mb-2 flex items-center gap-4">
              <CloudRain className="text-cyan-400" size={32} />
              Space Environment Report
            </h1>
            <p className="font-mono text-cyan-400/60 text-xs uppercase tracking-[0.2em]">Global Atmospheric Conditions & Orbital Perturbations</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_#22c55e]" />
              <span className="font-mono text-[10px] font-bold text-green-400 uppercase tracking-widest">Live Telemetry Active</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard 
            title="Atmospheric Drag" 
            value={(data.drag[data.drag.length-1].value * 1e12).toFixed(2)} 
            unit="kg/m² × 10⁻¹²" 
            icon={Wind} 
            color="#06b6d4" 
            data={data.drag}
            trend={12.4}
          />
          <StatCard 
            title="Solar Activity (F10.7)" 
            value={data.solar[data.solar.length-1].value.toFixed(1)} 
            unit="sfu" 
            icon={Sun} 
            color="#f59e0b" 
            data={data.solar}
            trend={-4.2}
          />
          <StatCard 
            title="Thermospheric Density" 
            value={data.density[data.density.length-1].value.toFixed(2)} 
            unit="g/cm³" 
            icon={Activity} 
            color="#8b5cf6" 
            data={data.density}
            trend={8.1}
          />
          <StatCard 
            title="Mean Decay Rate" 
            value={data.decay[data.decay.length-1].value.toFixed(2)} 
            unit="km/day" 
            icon={ArrowDownRight} 
            color="#ef4444" 
            data={data.decay}
            trend={15.7}
          />
        </div>

        <div className="mt-8 bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-md">
           <h3 className="font-display font-bold text-sm uppercase tracking-widest text-slate-300 mb-6 border-b border-slate-700/50 pb-4">NRLMSISE-00 Model Consensus</h3>
           <div className="font-mono text-green-400 text-xs leading-relaxed max-w-4xl opacity-80 uppercase tracking-wider">
             &gt; Establishing connection to NOAA Space Weather Prediction Center... [OK]
             <br/>&gt; Parsing latest Kp-index and Ap-index values... [OK]
             <br/>&gt; Solar wind speed elevated at 520 km/s. Geomagnetic storm warning (G1-Minor) in effect.
             <br/>&gt; Increased thermospheric heating detected. LEO assets facing +15% nominal drag coefficient.
             <br/>&gt; Recalculating decay windows for all tracked debris objects... [SYNCHRONIZED]
           </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentPage;
