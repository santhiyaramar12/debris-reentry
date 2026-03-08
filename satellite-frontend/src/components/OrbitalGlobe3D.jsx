import React, { useRef, useEffect, useState, useMemo } from "react";
import Globe from "react-globe.gl";
import { getSubsolarPoint } from "../services/SolarCalculator";

const satHTML = (color, isSelected, size = 28) => `
  <div style="position:relative;width:${size}px;height:${size}px;cursor:pointer;">
    ${isSelected ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:1px solid ${color}40;pointer-events:none;animation:gRing 2.2s ease-out infinite;"></div>` : ""}
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" style="position:absolute;inset:0;filter:drop-shadow(0 0 ${isSelected ? 6 : 3}px ${color});">
      <rect x="9" y="9" width="6" height="6" rx="1.2" fill="${color}" opacity="0.95"/>
      <rect x="1" y="10.5" width="7" height="3" rx="0.7" fill="${color}" opacity="0.55"/>
      <line x1="3" y1="10.5" x2="3" y2="13.5" stroke="${color}" stroke-width="0.5" opacity="0.7"/>
      <line x1="5.5" y1="10.5" x2="5.5" y2="13.5" stroke="${color}" stroke-width="0.5" opacity="0.7"/>
      <rect x="16" y="10.5" width="7" height="3" rx="0.7" fill="${color}" opacity="0.55"/>
      <line x1="18.5" y1="10.5" x2="18.5" y2="13.5" stroke="${color}" stroke-width="0.5" opacity="0.7"/>
      <line x1="21" y1="10.5" x2="21" y2="13.5" stroke="${color}" stroke-width="0.5" opacity="0.7"/>
      <line x1="12" y1="9" x2="12" y2="5.5" stroke="${color}" stroke-width="1.3"/>
      <circle cx="12" cy="4.5" r="1.5" fill="${color}" opacity="0.85"/>
      <line x1="12" y1="15" x2="12" y2="18.5" stroke="${color}" stroke-width="1.3"/>
      <polygon points="10.2,18.5 13.8,18.5 12,21.5" fill="${color}" opacity="0.5"/>
    </svg>
  </div>`;

const altColor = (a) =>
  Number(a) < 100 ? "#ef4444" : Number(a) < 125 ? "#eab308" : "#06b6d4";

// ── Interpolate sat position along groundTrack at given ratio ────────────────
const interpolateOnTrack = (track, ratio) => {
  if (!track?.length) return null;
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const idx = clampedRatio * (track.length - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(i0 + 1, track.length - 1);
  const t = idx - i0;
  const p0 = track[i0]; // [lng, lat]
  const p1 = track[i1];
  return {
    lat: p0[1] + (p1[1] - p0[1]) * t,
    lng: p0[0] + (p1[0] - p0[0]) * t,
  };
};

export const OrbitalGlobe3D = ({
  alerts,
  selectedSat,
  onSelectSat,
  impactSites,
  groundTrack,
  multiPassTracks = [],
  sliderDays,
  livePosition,
  predictionMode,
  trajectoryColor,
  globeCommandRef,
}) => {
  const globeRef = useRef();
  const containerRef = useRef();
  const lastCmdTs = useRef(0);
  const [dims, setDims] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [showShock, setShock] = useState(false);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e)
        setDims({
          width: e.contentRect.width || window.innerWidth,
          height: e.contentRect.height || window.innerHeight,
        });
    });
    ro.observe(el);
    setDims({
      width: el.offsetWidth || window.innerWidth,
      height: el.offsetHeight || window.innerHeight,
    });
    return () => ro.disconnect();
  }, []);

  // Sun lighting
  useEffect(() => {
    if (!globeRef.current) return;
    import("three")
      .then((THREE) => {
        const scene = globeRef.current.scene?.();
        if (!scene) return;
        const update = () => {
          const s = getSubsolarPoint(new Date());
          const lr = (s.lat * Math.PI) / 180,
            lgr = (s.lng * Math.PI) / 180;
          let dl = scene.children.find((c) => c.type === "DirectionalLight");
          if (!dl) {
            dl = new THREE.DirectionalLight(0xfff5e6, 1.8);
            scene.add(dl);
            scene.children.forEach((c) => {
              if (c.type === "AmbientLight") c.intensity = 0.12;
            });
          }
          dl.position.set(
            Math.cos(lr) * Math.cos(lgr) * 200,
            Math.sin(lr) * 200,
            Math.cos(lr) * Math.sin(lgr) * 200,
          );
        };
        update();
        const t = setInterval(update, 60000);
        return () => clearInterval(t);
      })
      .catch(() => {});
  }, []);

  // Camera: auto-rotate when idle, focus on sat when selected
  useEffect(() => {
    if (!globeRef.current) return;
    const ctrl = globeRef.current.controls?.();
    if (ctrl) {
      ctrl.autoRotate = !selectedSat;
      ctrl.autoRotateSpeed = 0.3;
      ctrl.enableDamping = true;
      ctrl.dampingFactor = 0.05;
    }
    if (selectedSat && groundTrack?.length) {
      // Start camera at satellite's initial position on the track
      const start = groundTrack[0];
      globeRef.current.pointOfView(
        { lat: start[1], lng: start[0], altitude: 1.6 },
        1500,
      );
    } else {
      globeRef.current.pointOfView({ altitude: 2.5 }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSat?.norad_id]);

  // ── Follow satellite position along track as slider moves ───────────────
  // Camera gently follows satellite. Only updates when satellite moves 8°+
  // so camera doesn't thrash when animation is running. Transition=1500ms.
  const prevTrackPos = useRef(null);
  const lastCameraUpdate = useRef(0);
  useEffect(() => {
    if (!selectedSat || !groundTrack?.length || !globeRef.current) return;
    const now = Date.now();
    // Throttle camera moves to max once every 1.5s
    if (now - lastCameraUpdate.current < 1500) return;
    const max = predictionMode === "6h" ? 0.25 : 15;
    const ratio = max > 0 ? Math.min(sliderDays / max, 1) : 1;
    const pos = interpolateOnTrack(groundTrack, ratio);
    if (!pos) return;
    const prev = prevTrackPos.current;
    // Only move camera if satellite moved 8°+ from last camera position
    if (
      !prev ||
      Math.abs(pos.lat - prev.lat) > 8 ||
      Math.abs(pos.lng - prev.lng) > 8
    ) {
      globeRef.current.pointOfView(
        { lat: pos.lat, lng: pos.lng, altitude: 1.5 },
        1500, // smooth 1.5s transition
      );
      prevTrackPos.current = pos;
      lastCameraUpdate.current = now;
    }
  }, [sliderDays, selectedSat?.norad_id, groundTrack, predictionMode]);

  // ── Listen for zoom commands from CrisisAlerts (impact site zoom) ───────
  useEffect(() => {
    if (!globeCommandRef) return;
    const check = setInterval(() => {
      const cmd = globeCommandRef.current;
      if (!cmd || cmd.ts <= lastCmdTs.current || !globeRef.current) return;
      lastCmdTs.current = cmd.ts;
      if (cmd.type === "zoomSite" && cmd.site) {
        const { lat, lng } = cmd.site;
        // Zoom in to impact site
        globeRef.current.pointOfView({ lat, lng, altitude: 0.4 }, 1000);
        // Zoom back out after 2.5s
        setTimeout(
          () => globeRef.current?.pointOfView({ altitude: 1.5 }, 1800),
          2500,
        );
      }
    }, 200);
    return () => clearInterval(check);
  }, [globeCommandRef]);

  // Shockwave at PRIMARY on slider end
  const prevSlider = useRef(0);
  useEffect(() => {
    const max = predictionMode === "6h" ? 0.25 : 15;
    if (
      selectedSat &&
      sliderDays >= max * 0.99 &&
      prevSlider.current < max * 0.95
    ) {
      setShock(true);
      const pri =
        impactSites?.find((s) => s.label === "PRIMARY") || impactSites?.[0];
      if (pri && globeRef.current) {
        globeRef.current.pointOfView(
          { lat: pri.lat, lng: pri.lng, altitude: 0.3 },
          900,
        );
        setTimeout(
          () => globeRef.current?.pointOfView({ altitude: 1.8 }, 2200),
          2800,
        );
      }
      setTimeout(() => setShock(false), 3000);
    }
    prevSlider.current = sliderDays;
  }, [sliderDays, selectedSat, impactSites, predictionMode]);

  // HTML satellite icons — position interpolated on track (not live GPS)
  const htmlData = useMemo(() => {
    const items = [];
    if (!selectedSat) {
      alerts.forEach((sat) => {
        if (!sat.lat && !sat.lng) return;
        items.push({
          lat: sat.lat || 0,
          lng: sat.lng || 0,
          alt: 0.005,
          html: satHTML(altColor(sat.altitude), false, 24),
          _sat: sat,
        });
      });
    }
    if (selectedSat) {
      const max = predictionMode === "6h" ? 0.25 : 15;
      const ratio = max > 0 ? Math.min(sliderDays / max, 1) : 1;
      const trackPos = groundTrack?.length
        ? interpolateOnTrack(groundTrack, ratio)
        : null;
      // Use track interpolation for position so sat is always ON the drawn path
      const lat = trackPos?.lat ?? livePosition?.lat ?? selectedSat.lat ?? 0;
      const lng = trackPos?.lng ?? livePosition?.lng ?? selectedSat.lng ?? 0;
      items.push({
        lat,
        lng,
        alt: 0.022,
        html: satHTML("#00ff88", true, 32),
        _sat: selectedSat,
      });
    }
    return items;
  }, [
    alerts,
    selectedSat,
    livePosition?.lat,
    livePosition?.lng,
    sliderDays,
    groundTrack,
    predictionMode,
  ]);

  // Impact rings
  const ringsData = useMemo(() => {
    if (!selectedSat || !impactSites?.length) return [];
    const rings = impactSites.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      maxR: s.radius / 28000,
      propagationSpeed: s.label === "PRIMARY" ? 2.5 : 1.5,
      repeatPeriod: s.label === "PRIMARY" ? 700 : 1400,
      color: s.color,
    }));
    if (showShock) {
      const p = impactSites.find((s) => s.label === "PRIMARY");
      if (p) {
        rings.push({
          lat: p.lat,
          lng: p.lng,
          maxR: 1.8,
          propagationSpeed: 7,
          repeatPeriod: 350,
          color: "#ef4444",
        });
        rings.push({
          lat: p.lat,
          lng: p.lng,
          maxR: 1.0,
          propagationSpeed: 9,
          repeatPeriod: 250,
          color: "#ff6b35",
        });
      }
    }
    return rings;
  }, [selectedSat, impactSites, showShock]);

  // ── STABLE paths — impact arcs + pass orbit lines ────────────────────────
  // These never change when slider moves → memoized separately to prevent
  // Three.js path rebuild flickering/cuts during animation.
  const stablePaths = useMemo(() => {
    if (!selectedSat || !groundTrack?.length) return [];
    const paths = [];

    // 3 arced lines → each impact site, always from full track end
    if (impactSites?.length) {
      const last = groundTrack[groundTrack.length - 1];
      impactSites.forEach((site) => {
        const coords = Array.from({ length: 32 }, (_, i) => {
          const t = i / 31;
          return {
            lat: last[1] + (site.lat - last[1]) * t,
            lng: last[0] + (site.lng - last[0]) * t,
            alt: 0.02 + Math.sin(t * Math.PI) * 0.2,
          };
        });
        paths.push({ coords, color: [site.color + "cc", site.color + "22"] });
      });
    }

    // Faint pass orbit lines — shows full orbit coverage
    const passColors = ["#06b6d4", "#8b5cf6", "#f97316"];
    if (multiPassTracks?.length) {
      multiPassTracks.slice(0, 3).forEach((pass, pi) => {
        if (!pass?.length) return;
        // Split at antimeridian (lng jump > 180°)
        let seg = [];
        for (let i = 0; i < pass.length; i++) {
          const pt = pass[i];
          if (seg.length > 0 && Math.abs(pt[0] - pass[i - 1][0]) > 180) {
            if (seg.length > 1)
              paths.push({
                coords: seg,
                color: [passColors[pi % 3] + "33", passColors[pi % 3] + "11"],
              });
            seg = [];
          }
          seg.push({ lat: pt[1], lng: pt[0], alt: 0.004 });
        }
        if (seg.length > 1)
          paths.push({
            coords: seg,
            color: [passColors[pi % 3] + "33", passColors[pi % 3] + "11"],
          });
      });
    }
    return paths;
  }, [selectedSat, groundTrack, impactSites, multiPassTracks]);

  // ── ANIMATED trajectory — only sliced portion, changes with slider ────────
  const animatedPath = useMemo(() => {
    if (!selectedSat || !groundTrack?.length) return [];
    const max = predictionMode === "6h" ? 0.25 : 15;
    const ratio = max > 0 ? Math.min(sliderDays / max, 1) : 1;
    const nPts = Math.max(2, Math.floor(groundTrack.length * ratio));
    const pColor = trajectoryColor || "#00ff88";

    // Split at antimeridian so no straight lines across the globe
    const paths = [];
    let seg = [];
    const sliced = groundTrack.slice(0, nPts);
    for (let i = 0; i < sliced.length; i++) {
      const pt = sliced[i];
      if (seg.length > 0 && Math.abs(pt[0] - sliced[i - 1][0]) > 180) {
        if (seg.length > 1)
          paths.push({ coords: seg, color: [pColor, pColor] });
        seg = [];
      }
      seg.push({ lat: pt[1], lng: pt[0], alt: 0.015 });
    }
    if (seg.length > 1) paths.push({ coords: seg, color: [pColor, pColor] });
    return paths;
  }, [selectedSat, groundTrack, sliderDays, predictionMode, trajectoryColor]);

  // Combined for Globe pathsData
  const pathData = useMemo(
    () => [...animatedPath, ...stablePaths],
    [animatedPath, stablePaths],
  );

  // Impact labels
  const labelsData = useMemo(() => {
    if (!selectedSat || !impactSites?.length) return [];
    return impactSites.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      text: `⚠ ${s.label}`,
      color: s.color,
      size: s.label === "PRIMARY" ? 1.2 : 0.8,
      dotRadius: 0.25,
    }));
  }, [selectedSat, impactSites]);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, background: "#020617" }}
    >
      <style>{`
        @keyframes gRing { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.8);opacity:0} }
      `}</style>
      <Globe
        ref={globeRef}
        width={dims.width}
        height={dims.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="#63b3ed"
        atmosphereAltitude={0.2}
        showAtmosphere={true}
        htmlElementsData={htmlData}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude="alt"
        htmlElement={(d) => {
          const wrap = document.createElement("div");
          wrap.innerHTML = d.html;
          wrap.style.cursor = "pointer";
          wrap.addEventListener("click", () => {
            if (d._sat) onSelectSat(d._sat);
          });
          return wrap;
        }}
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringColor={(d) => d.color}
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringResolution={64}
        pathsData={pathData}
        pathPoints="coords"
        pathPointLat="lat"
        pathPointLng="lng"
        pathPointAlt="alt"
        pathColor={(d) => d.color}
        pathStroke={2.2}
        pathDashLength={1}
        pathDashGap={0}
        pathDashAnimateTime={0}
        pathResolution={64}
        pathTransitionDuration={0}
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="text"
        labelColor={(d) => d.color}
        labelSize="size"
        labelDotRadius="dotRadius"
        labelResolution={2}
        labelAltitude={0.01}
      />
    </div>
  );
};
