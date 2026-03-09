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
  globeCommandRef, // ref passed from CrisisAlerts for zoom commands
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
  // Uses interpolated position on groundTrack (not live SGP4) so it
  // stays exactly on the visible path as user drags the slider.
  const prevTrackPos = useRef(null);
  useEffect(() => {
    if (!selectedSat || !groundTrack?.length || !globeRef.current) return;
    const max = predictionMode === "6h" ? 0.25 : 5;
    const ratio = max > 0 ? Math.min(sliderDays / max, 1) : 1;
    const pos = interpolateOnTrack(groundTrack, ratio);
    if (!pos) return;
    const prev = prevTrackPos.current;
    if (
      !prev ||
      Math.abs(pos.lat - prev.lat) > 3 ||
      Math.abs(pos.lng - prev.lng) > 3
    ) {
      globeRef.current.pointOfView(
        { lat: pos.lat, lng: pos.lng, altitude: 1.4 },
        800,
      );
      prevTrackPos.current = pos;
    }
  }, [sliderDays, selectedSat?.norad_id, groundTrack]);

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
    const max = predictionMode === "6h" ? 0.25 : 5;
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
      const max = predictionMode === "6h" ? 0.25 : 5;
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

  // ── Helper: split [lng,lat] track at antimeridian → {lat,lng,alt} segments ──
  // When a crossing is detected (|Δlng| > 180°) we interpolate the exact
  // boundary point and append it to the closing segment AND prepend it to
  // the opening segment — this eliminates the visible gap react-globe.gl
  // would otherwise show between two adjacent path objects.
  const buildGlobeSegments = (track, alt = 0.012) => {
    if (!track?.length) return [];
    const segs = [];
    let cur = [];
    for (let i = 0; i < track.length; i++) {
      const lng = track[i][0];
      const lat = track[i][1];
      if (cur.length > 0) {
        const prev = cur[cur.length - 1];
        const dLng = lng - prev.lng;
        if (Math.abs(dLng) > 180) {
          // Interpolate the crossing point on the antimeridian (±180)
          const sign = dLng > 0 ? -1 : 1; // which side prev is on
          const boundary = sign * 180;
          const t = (boundary - prev.lng) / dLng;
          const crossLat = prev.lat + (lat - prev.lat) * t;
          // Close current segment with the boundary point
          cur.push({ lat: crossLat, lng: boundary, alt });
          if (cur.length >= 2) segs.push(cur);
          // Open next segment from the mirrored boundary point
          cur = [{ lat: crossLat, lng: -boundary, alt }];
        }
      }
      cur.push({ lat, lng, alt });
    }
    if (cur.length >= 2) segs.push(cur);
    return segs;
  };

  // ── TRAJECTORY paths ──────────────────────────────────────────────────────
  // 6H: main track + up to 2 background pass lines (dim, same color)
  // 5D: main track ONLY — single continuous line, color encodes time range
  // Both modes: antimeridian-split for continuous rendering
  const pathData = useMemo(() => {
    if (!selectedSat || !groundTrack?.length) return [];

    const max = predictionMode === "6h" ? 0.25 : 5;
    const ratio = max > 0 ? Math.min(sliderDays / max, 1) : 1;
    const nPts = Math.max(2, Math.floor(groundTrack.length * ratio));
    const sliced = groundTrack.slice(0, nPts);
    const pColor = trajectoryColor || "#06b6d4";

    // ── Main trajectory (both modes) ──
    const paths = buildGlobeSegments(sliced, 0.012).map((seg) => ({
      coords: seg,
      color: [pColor, pColor],
    }));

    // ── Pass lines — 6H mode only ──
    if (predictionMode === "6h" && multiPassTracks?.length) {
      multiPassTracks.slice(0, 2).forEach((pass) => {
        if (!pass?.length) return;
        buildGlobeSegments(pass, 0.01).forEach((seg) => {
          paths.push({
            coords: seg,
            color: [pColor + "55", pColor + "28"],
          });
        });
      });
    }

    // ── Impact arcs from track end → each site ──
    if (impactSites?.length) {
      const last = groundTrack[groundTrack.length - 1];
      impactSites.forEach((site) => {
        const arcRaw = Array.from({ length: 40 }, (_, i) => {
          const tt = i / 39;
          return [
            last[0] + (site.lng - last[0]) * tt,
            last[1] + (site.lat - last[1]) * tt,
          ];
        });
        buildGlobeSegments(arcRaw, 0.012).forEach((seg) => {
          seg.forEach((pt, idx) => {
            const tt = idx / Math.max(seg.length - 1, 1);
            pt.alt = 0.014 + Math.sin(tt * Math.PI) * 0.1;
          });
          paths.push({
            coords: seg,
            color: [site.color + "bb", site.color + "30"],
          });
        });
      });
    }

    return paths;
  }, [
    selectedSat,
    groundTrack,
    multiPassTracks,
    sliderDays,
    impactSites,
    predictionMode,
    trajectoryColor,
  ]);

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
        pathStroke={1.2}
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
