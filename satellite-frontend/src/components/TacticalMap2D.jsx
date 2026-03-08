import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import local2DMap from "../assets/2dmap_new.jpg";
import {
  getSubsolarPoint,
  getTerminatorPoints,
} from "../services/SolarCalculator";

const toXY = (lat, lng, W, H) => ({
  x: ((lng + 180) / 360) * W,
  y: ((90 - lat) / 180) * H,
});

// Build SVG polyline segments, splitting at antimeridian wrap
// Returns array of segments; each segment is continuous [x,y] pairs
const buildSegments = (track, W, H) => {
  if (!track?.length) return [];
  const segs = [];
  let cur = [];
  let prevX = null;
  for (let i = 0; i < track.length; i++) {
    const pt = track[i];
    const { x, y } = toXY(pt[1], pt[0], W, H);
    if (prevX !== null && Math.abs(x - prevX) > W * 0.35) {
      // Antimeridian wrap: close current segment and start new
      if (cur.length > 1) segs.push(cur);
      cur = [];
    }
    cur.push([x, y]);
    prevX = x;
  }
  if (cur.length > 1) segs.push(cur);
  return segs;
};

const ptsStr = (pts) =>
  pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

// Interpolate position along track at ratio [0,1]
const interpolateOnTrack = (track, ratio) => {
  if (!track?.length) return null;
  const r = Math.max(0, Math.min(1, ratio));
  const idx = r * (track.length - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(i0 + 1, track.length - 1);
  const t = idx - i0;
  return {
    lat: track[i0][1] + (track[i1][1] - track[i0][1]) * t,
    lng: track[i0][0] + (track[i1][0] - track[i0][0]) * t,
  };
};

// Day/Night overlay
const DayNightSVG = ({ W, H }) => {
  const [nightPath, setNightPath] = useState("");
  const [sunPos, setSunPos] = useState({ x: W / 2, y: H / 2 });

  useEffect(() => {
    const update = () => {
      const pt = getSubsolarPoint(new Date());
      const { x, y } = toXY(pt.lat, pt.lng, W, H);
      setSunPos({ x, y });
      const pts = getTerminatorPoints(pt.lat, pt.lng);
      if (!pts || pts.length < 2) return;
      let d = `M ${(((pts[0][0] + 180) / 360) * W).toFixed(1)},${(((90 - pts[0][1]) / 180) * H).toFixed(1)} `;
      for (let i = 1; i < pts.length; i++) {
        d += `L ${(((pts[i][0] + 180) / 360) * W).toFixed(1)},${(((90 - pts[i][1]) / 180) * H).toFixed(1)} `;
      }
      d += pt.lat > 0 ? `L ${W},${H} L 0,${H} Z` : `L ${W},0 L 0,0 Z`;
      setNightPath(d);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [W, H]);

  return (
    <>
      {nightPath && <path d={nightPath} fill="rgba(0,4,20,0.55)" />}
      <circle
        cx={sunPos.x}
        cy={sunPos.y}
        r={Math.min(W, H) * 0.07}
        fill="url(#sunGlow)"
        opacity="0.9"
      />
    </>
  );
};

const ImpactMarker = ({ x, y, color, label, radiusPx }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 100), 40);
    return () => clearInterval(id);
  }, []);
  const pulse = 1 + Math.sin((tick / 100) * Math.PI * 2) * 0.2;
  const labelW = label.length * 6.8 + 16;
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={radiusPx * pulse}
        fill={color + "0a"}
        stroke={color}
        strokeWidth="1"
        strokeDasharray="6 4"
        opacity="0.4"
      />
      <circle
        cx={x}
        cy={y}
        r={radiusPx * 0.45}
        fill={color + "20"}
        stroke={color}
        strokeWidth="1.2"
        opacity="0.6"
      />
      <circle
        cx={x}
        cy={y}
        r={5.5}
        fill={color}
        style={{ filter: `drop-shadow(0 0 7px ${color})` }}
      />
      <circle
        cx={x}
        cy={y}
        r={9}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.9"
      />
      <line
        x1={x - 16}
        y1={y}
        x2={x - 11}
        y2={y}
        stroke={color}
        strokeWidth="1.5"
      />
      <line
        x1={x + 11}
        y1={y}
        x2={x + 16}
        y2={y}
        stroke={color}
        strokeWidth="1.5"
      />
      <line
        x1={x}
        y1={y - 16}
        x2={x}
        y2={y - 11}
        stroke={color}
        strokeWidth="1.5"
      />
      <line
        x1={x}
        y1={y + 11}
        x2={x}
        y2={y + 16}
        stroke={color}
        strokeWidth="1.5"
      />
      <rect
        x={x + 18}
        y={y - 9}
        width={labelW}
        height={17}
        fill="rgba(2,6,23,0.92)"
        rx="3"
        stroke={color}
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />
      <text
        x={x + 23}
        y={y + 3}
        fill={color}
        fontSize="9"
        fontFamily="'Orbitron',sans-serif"
        fontWeight="900"
        letterSpacing="0.08em"
      >
        &#9888; {label}
      </text>
    </g>
  );
};

const SatMarker = ({ x, y, color }) => (
  <g>
    <circle cx={x} cy={y} r={11} fill={color + "15"} />
    <circle
      cx={x}
      cy={y}
      r={7}
      fill="none"
      stroke={color}
      strokeWidth="1"
      opacity="0.7"
    />
    <circle
      cx={x}
      cy={y}
      r={3.5}
      fill={color}
      style={{ filter: `drop-shadow(0 0 5px ${color})` }}
    />
    {/* solar panels */}
    <rect
      x={x - 18}
      y={y - 2}
      width={7}
      height={4}
      fill={color}
      opacity="0.50"
      rx="1"
    />
    <rect
      x={x + 11}
      y={y - 2}
      width={7}
      height={4}
      fill={color}
      opacity="0.50"
      rx="1"
    />
    <line
      x1={x}
      y1={y - 8}
      x2={x}
      y2={y - 14}
      stroke={color}
      strokeWidth="1.2"
    />
    <circle cx={x} cy={y - 16} r={2} fill={color} opacity="0.7" />
  </g>
);

export const TacticalMap2D = memo(
  ({
    selectedSat,
    impactSites = [],
    groundTrack = [],
    multiPassTracks = [],
    sliderDays = 0,
    livePosition,
    predictionMode = "15d",
    trajectoryColor,
  }) => {
    const containerRef = useRef(null);
    const [size, setSize] = useState({ W: 1400, H: 700 });

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(([e]) => {
        const { width, height } = e.contentRect;
        if (width > 10 && height > 10) setSize({ W: width, H: height });
      });
      ro.observe(el);
      setSize({ W: el.offsetWidth || 1400, H: el.offsetHeight || 700 });
      return () => ro.disconnect();
    }, []);

    const { W, H } = size;
    const trajColor = trajectoryColor || "#00ff88";

    // Trajectory drawn up to slider position only
    const trajSliced = useMemo(() => {
      if (!groundTrack?.length) return [];
      const max = predictionMode === "6h" ? 0.25 : 15;
      const ratio = Math.min(sliderDays / Math.max(max, 0.001), 1);
      const n = Math.max(2, Math.floor(groundTrack.length * ratio));
      return groundTrack.slice(0, n);
    }, [groundTrack, sliderDays, predictionMode]);

    const trajSegs = useMemo(
      () => buildSegments(trajSliced, W, H),
      [trajSliced, W, H],
    );

    // ── MAX 2 background orbit pass lines — clean sinusoidal curves ──
    const passSegs = useMemo(
      () =>
        multiPassTracks.slice(0, 2).map((pass) => buildSegments(pass, W, H)),
      [multiPassTracks, W, H],
    );

    // Impact arcs from full track end → each site
    const impactArcs = useMemo(() => {
      if (!impactSites?.length || !groundTrack?.length) return [];
      const last = groundTrack[groundTrack.length - 1];
      return impactSites.map((site) => {
        const pts = Array.from({ length: 30 }, (_, i) => {
          const t = i / 29;
          const { x, y } = toXY(
            last[1] + (site.lat - last[1]) * t,
            last[0] + (site.lng - last[0]) * t,
            W,
            H,
          );
          return [x, y];
        });
        return { color: site.color, pts };
      });
    }, [groundTrack, impactSites, W, H]);

    const impactMarkers = useMemo(
      () =>
        impactSites.map((site) => {
          const { x, y } = toXY(site.lat, site.lng, W, H);
          const radiusPx = Math.max(
            22,
            Math.min((site.radius / 1000 / 111) * (H / 180), 70),
          );
          return { ...site, x, y, radiusPx };
        }),
      [impactSites, W, H],
    );

    // ── Satellite position interpolated on track (follows slider) ───────────
    const satPx = useMemo(() => {
      if (!selectedSat || !groundTrack?.length) return null;
      const max = predictionMode === "6h" ? 0.25 : 15;
      const ratio = Math.min(sliderDays / Math.max(max, 0.001), 1);
      const pos = interpolateOnTrack(groundTrack, ratio);
      if (!pos) return null;
      return toXY(pos.lat, pos.lng, W, H);
    }, [selectedSat, groundTrack, sliderDays, predictionMode, W, H]);

    const satColor =
      Number(selectedSat?.altitude) < 150 ? "#ef4444" : "#00ff88";
    const passColors = ["#06b6d4", "#8b5cf6"];

    return (
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          background: "#020617",
          overflow: "hidden",
        }}
      >
        <img
          src={local2DMap}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "fill",
            display: "block",
            opacity: 0.82,
          }}
        />

        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
        >
          <defs>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,220,100,0.30)" />
              <stop offset="100%" stopColor="rgba(255,220,100,0)" />
            </radialGradient>
            <filter id="trajGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern
              id="crtScan"
              x="0"
              y="0"
              width={W}
              height="3"
              patternUnits="userSpaceOnUse"
            >
              <rect x="0" y="0" width={W} height="1" fill="rgba(0,0,0,0.07)" />
            </pattern>
            <radialGradient id="vig" cx="50%" cy="50%" r="70%">
              <stop offset="55%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.60)" />
            </radialGradient>
          </defs>

          <DayNightSVG W={W} H={H} />

          {/* Graticule */}
          {[-60, -30, 30, 60].map((lat) => (
            <line
              key={`lat${lat}`}
              x1={0}
              y1={((90 - lat) / 180) * H}
              x2={W}
              y2={((90 - lat) / 180) * H}
              stroke="rgba(6,182,212,0.07)"
              strokeWidth="0.8"
            />
          ))}
          <line
            x1={0}
            y1={H / 2}
            x2={W}
            y2={H / 2}
            stroke="rgba(6,182,212,0.18)"
            strokeWidth="1.2"
          />
          <line
            x1={W / 2}
            y1={0}
            x2={W / 2}
            y2={H}
            stroke="rgba(6,182,212,0.18)"
            strokeWidth="1.2"
          />
          {[-150, -120, -90, -60, -30, 30, 60, 90, 120, 150].map((lng) => (
            <line
              key={`lng${lng}`}
              x1={((lng + 180) / 360) * W}
              y1={0}
              x2={((lng + 180) / 360) * W}
              y2={H}
              stroke="rgba(6,182,212,0.07)"
              strokeWidth="0.8"
            />
          ))}

          {/* ── Max 2 background orbit lines — clean, dim, seamless ── */}
          {passSegs.map((segs, pi) =>
            segs.map((seg, si) => (
              <polyline
                key={`p${pi}-${si}`}
                points={ptsStr(seg)}
                fill="none"
                stroke={passColors[pi % passColors.length]}
                strokeWidth="1.2"
                opacity="0.20"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )),
          )}

          {/* ── Main trajectory drawn to slider position — seamless continuous line ── */}
          {trajSegs.map((seg, i) => (
            <g key={`tr${i}`}>
              <polyline
                points={ptsStr(seg)}
                fill="none"
                stroke={trajColor}
                strokeWidth="5"
                opacity="0.07"
                filter="url(#trajGlow)"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <polyline
                points={ptsStr(seg)}
                fill="none"
                stroke={trajColor}
                strokeWidth="2"
                opacity="0.95"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* ── Impact arc dashed lines ── */}
          {impactArcs.map((arc, i) => (
            <polyline
              key={`arc${i}`}
              points={ptsStr(arc.pts)}
              fill="none"
              stroke={arc.color}
              strokeWidth="1.8"
              opacity="0.75"
              strokeDasharray="9 5"
            />
          ))}

          {/* ── Impact markers ── */}
          {impactMarkers.map((m, i) => (
            <ImpactMarker
              key={`im${i}`}
              x={m.x}
              y={m.y}
              color={m.color}
              label={m.label}
              radiusPx={m.radiusPx}
            />
          ))}

          {/* ── Satellite — moves along track as slider moves, smooth CSS transition ── */}
          {selectedSat && satPx && (
            <g
              style={{
                transform: `translate(${satPx.x}px, ${satPx.y}px)`,
                transition: "transform 0.35s linear",
              }}
            >
              {/* glow ring */}
              <circle r={11} fill={satColor + "15"} />
              <circle
                r={7}
                fill="none"
                stroke={satColor}
                strokeWidth="1"
                opacity="0.7"
              />
              <circle
                r={3.5}
                fill={satColor}
                style={{ filter: `drop-shadow(0 0 5px ${satColor})` }}
              />
              {/* solar panels */}
              <rect
                x={-18}
                y={-2}
                width={7}
                height={4}
                fill={satColor}
                opacity="0.50"
                rx="1"
              />
              <rect
                x={11}
                y={-2}
                width={7}
                height={4}
                fill={satColor}
                opacity="0.50"
                rx="1"
              />
              <line
                x1={0}
                y1={-8}
                x2={0}
                y2={-14}
                stroke={satColor}
                strokeWidth="1.2"
              />
              <circle cy={-16} r={2} fill={satColor} opacity="0.7" />
            </g>
          )}

          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            fill="url(#crtScan)"
            pointerEvents="none"
          />
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            fill="url(#vig)"
            pointerEvents="none"
          />
        </svg>

        {/* Live coords readout */}
        {selectedSat && satPx && (
          <div
            style={{
              position: "absolute",
              bottom: 10,
              right: 14,
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 9,
              color: "rgba(6,182,212,0.55)",
              letterSpacing: ".06em",
              pointerEvents: "none",
            }}
          >
            {(() => {
              const max = predictionMode === "6h" ? 0.25 : 15;
              const pos = interpolateOnTrack(
                groundTrack,
                Math.min(sliderDays / Math.max(max, 0.001), 1),
              );
              if (!pos) return null;
              return `${pos.lat.toFixed(3)}° ${pos.lat >= 0 ? "N" : "S"} | ${pos.lng.toFixed(3)}° ${pos.lng >= 0 ? "E" : "W"}`;
            })()}
          </div>
        )}
      </div>
    );
  },
);
