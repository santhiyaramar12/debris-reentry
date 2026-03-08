import React, { useState } from 'react';
import { List, Activity, Globe, Info, Target, Calendar } from 'lucide-react';
import { DraggablePanel } from './DraggablePanel';

export const LeftTaskbar = ({ selectedSat, alerts = [], onSelectSat }) => {
  const [activePanels, setActivePanels] = useState({
    debrisList: false,
    telemetry: false,
    orbital: false,
    impact: false
  });

  const togglePanel = (panel) => {
    setActivePanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  const icons = [
    { id: 'debrisList', Icon: List, label: "Debris List" },
    { id: 'telemetry', Icon: Activity, label: "Telemetry Data" },
    { id: 'orbital', Icon: Globe, label: "Orbital Elements" },
    { id: 'impact', Icon: Target, label: "Impact Corridor" }
  ];

  return (
    <>
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-[50000] flex flex-col gap-4 bg-slate-900/60 backdrop-blur-md p-3 rounded-r-2xl border border-white/10 border-l-0 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
        {icons.map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => togglePanel(id)}
            title={label}
            className={`p-3 rounded-xl transition-all ${
              activePanels[id] 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                : 'text-white/50 hover:bg-white/10 hover:text-white border border-transparent'
            }`}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>

      {activePanels.debrisList && (
        <DraggablePanel title="Debris Watchlist" onClose={() => togglePanel('debrisList')} defaultPosition={{ x: 80, y: 100 }}>
           <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 w-64">
             {alerts.map(sat => (
               <div key={sat.norad_id} onClick={() => onSelectSat && onSelectSat(sat)} className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedSat?.norad_id === sat.norad_id ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                 <p className="font-bold text-sm text-white">{sat.name}</p>
                 <p className="text-[10px] text-cyan-400 font-mono mt-1">NORAD {sat.norad_id} | {sat.days_left} Days</p>
               </div>
             ))}
           </div>
        </DraggablePanel>
      )}

      {activePanels.telemetry && selectedSat && (
        <DraggablePanel title="Live Telemetry" onClose={() => togglePanel('telemetry')} defaultPosition={{ x: 80, y: 250 }}>
          <div className="grid grid-cols-2 gap-4 w-64">
            <div className="bg-black/40 p-3 rounded-lg border border-white/5">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Altitude</p>
              <p className="font-mono text-cyan-400 mt-1">{selectedSat.altitude?.toFixed(2)} km</p>
            </div>
            <div className="bg-black/40 p-3 rounded-lg border border-white/5">
               <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Velocity</p>
               <p className="font-mono text-white mt-1">~7.66 km/s</p>
            </div>
            <div className="bg-black/40 p-3 rounded-lg border border-white/5">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Latitude</p>
              <p className="font-mono text-white mt-1">{selectedSat.lat?.toFixed(2)}°</p>
            </div>
            <div className="bg-black/40 p-3 rounded-lg border border-white/5">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Longitude</p>
              <p className="font-mono text-white mt-1">{selectedSat.lng?.toFixed(2)}°</p>
            </div>
          </div>
        </DraggablePanel>
      )}

      {activePanels.orbital && selectedSat && selectedSat.orbital_elements && (
        <DraggablePanel title="Orbital Elements (TLE)" onClose={() => togglePanel('orbital')} defaultPosition={{ x: 400, y: 100 }}>
          <div className="space-y-3 font-mono text-xs w-72">
            <div className="flex justify-between border-b border-white/10 pb-1">
              <span className="text-slate-400">Inclination</span>
              <span className="text-white">{selectedSat.orbital_elements.inclination_deg?.toFixed(4)}°</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-1">
              <span className="text-slate-400">Mean Motion</span>
              <span className="text-white">{selectedSat.orbital_elements.mean_motion_rev_day?.toFixed(4)} rev/day</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-1">
              <span className="text-slate-400">Semi-Major Axis</span>
              <span className="text-white">{selectedSat.orbital_elements.semi_major_axis_km?.toFixed(2)} km</span>
            </div>
            <div className="bg-black/40 p-2 rounded border border-white/10 mt-4 leading-relaxed tracking-wider break-all text-[10px] text-cyan-400">
               <div>{selectedSat.tle_line1}</div>
               <div>{selectedSat.tle_line2}</div>
            </div>
          </div>
        </DraggablePanel>
      )}

      {activePanels.impact && selectedSat && (
        <DraggablePanel title="Impact Corridor Risk" onClose={() => togglePanel('impact')} defaultPosition={{ x: 400, y: 350 }}>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center w-64">
            <Target size={32} className="text-red-500 mx-auto mb-3 animate-pulse" />
            <p className="text-red-400 font-bold uppercase tracking-widest text-sm">Critical Risk Area</p>
            <p className="text-white/70 text-xs mt-2 font-mono">Re-entry Window: T-{selectedSat.days_left} Days</p>
          </div>
        </DraggablePanel>
      )}
    </>
  );
};
