import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import ReactDOM from "react-dom";
import Globe from "react-globe.gl";
import {
  Search,
  X,
  ArrowLeft,
  Info,
  Activity,
  AlertTriangle,
  Clock,
  MapPin,
  Play,
} from "lucide-react";
import {
  MapContainer,
  Marker as LeafletMarker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { satelliteService } from "../services/api";
import local2DMap from "../assets/2dmap.jpg";

/* ─────────────────────────────────────────────
   SEVERITY CONFIG
───────────────────────────────────────────── */
const SEVERITY = {
  RED: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.3)",
    label: "≤ 5 Days",
  },
  YELLOW: {
    color: "#eab308",
    bg: "rgba(234,179,8,0.1)",
    border: "rgba(234,179,8,0.3)",
    label: "≤ 10 Days",
  },
  PURPLE: {
    color: "#a855f7",
    bg: "rgba(168,85,247,0.1)",
    border: "rgba(168,85,247,0.3)",
    label: "≤ 15 Days",
  },
  STABLE: {
    color: "#64748b",
    bg: "rgba(100,116,139,0.1)",
    border: "rgba(100,116,139,0.3)",
    label: "> 15 Days",
  },
};

/* ─────────────────────────────────────────────
   GROUND TRACK — 1 point per orbital minute
───────────────────────────────────────────── */
const generateGroundTrack = (sat, hoursAhead = 6) => {
  const norad = Number(sat.norad_id || 0);
  const inc =
    Number(sat.orbital_elements?.inclination_deg) || 20 + (norad % 70);
  const mm =
    Number(sat.orbital_elements?.mean_motion_rev_day) || 14 + (norad % 4) * 0.5;
  const ma0 =
    Number(sat.orbital_elements?.mean_anomaly_deg) || (norad * 137.508) % 360;
  const raan0 = Number(sat.orbital_elements?.raan_deg) || (norad * 97.3) % 360;
  const period = 1440 / mm;
  const totalPts = Math.floor(hoursAhead * 60) + 1;
  return Array.from({ length: totalPts }, (_, t) => {
    const angle = ((ma0 + (360 / period) * t) % 360) * (Math.PI / 180);
    const earthRot = (t / 1440) * 360;
    const lat =
      Math.asin(Math.sin(inc * (Math.PI / 180)) * Math.sin(angle)) *
      (180 / Math.PI);
    const lng =
      ((raan0 +
        Math.atan2(
          Math.cos(inc * (Math.PI / 180)) * Math.sin(angle),
          Math.cos(angle),
        ) *
          (180 / Math.PI) -
        earthRot +
        540) %
        360) -
      180;
    return [lng, lat];
  });
};

/* ─────────────────────────────────────────────
   REVERSE GEOCODE
───────────────────────────────────────────── */
const REGIONS = [
  { name: "North Atlantic", minLat: 20, maxLat: 60, minLng: -60, maxLng: 0 },
  { name: "South Atlantic", minLat: -60, maxLat: 0, minLng: -40, maxLng: 10 },
  { name: "North Pacific", minLat: 20, maxLat: 60, minLng: 140, maxLng: 220 },
  { name: "South Pacific", minLat: -60, maxLat: 0, minLng: 140, maxLng: 220 },
  { name: "Indian Ocean", minLat: -40, maxLat: 20, minLng: 40, maxLng: 100 },
  { name: "Mediterranean Sea", minLat: 30, maxLat: 46, minLng: -5, maxLng: 40 },
  { name: "Arabian Sea", minLat: 5, maxLat: 25, minLng: 50, maxLng: 78 },
  { name: "Bay of Bengal", minLat: 5, maxLat: 22, minLng: 78, maxLng: 95 },
  { name: "South China Sea", minLat: 0, maxLat: 25, minLng: 100, maxLng: 120 },
  { name: "Arctic Ocean", minLat: 65, maxLat: 90, minLng: -180, maxLng: 180 },
  {
    name: "Southern Ocean",
    minLat: -90,
    maxLat: -60,
    minLng: -180,
    maxLng: 180,
  },
  { name: "Central Africa", minLat: -15, maxLat: 15, minLng: 10, maxLng: 40 },
  { name: "East Asia", minLat: 20, maxLat: 50, minLng: 100, maxLng: 140 },
  { name: "South America", minLat: -55, maxLat: 10, minLng: -80, maxLng: -35 },
  { name: "North America", minLat: 25, maxLat: 60, minLng: -130, maxLng: -60 },
  { name: "Europe", minLat: 35, maxLat: 70, minLng: -10, maxLng: 40 },
  { name: "Australia", minLat: -45, maxLat: -10, minLng: 110, maxLng: 155 },
  { name: "Central Asia", minLat: 30, maxLat: 55, minLng: 50, maxLng: 100 },
  { name: "Southeast Asia", minLat: -10, maxLat: 25, minLng: 95, maxLng: 140 },
  { name: "Middle East", minLat: 15, maxLat: 40, minLng: 35, maxLng: 60 },
  { name: "West Africa", minLat: -5, maxLat: 20, minLng: -20, maxLng: 15 },
  { name: "East Africa", minLat: -15, maxLat: 15, minLng: 30, maxLng: 50 },
  { name: "Southern Africa", minLat: -35, maxLat: -15, minLng: 15, maxLng: 40 },
  { name: "Caribbean Sea", minLat: 10, maxLat: 25, minLng: -85, maxLng: -60 },
  { name: "Gulf of Mexico", minLat: 18, maxLat: 30, minLng: -98, maxLng: -80 },
  { name: "Japan / Korea", minLat: 30, maxLat: 45, minLng: 125, maxLng: 145 },
];

const getLocationName = (lng, lat) => {
  for (const r of REGIONS) {
    if (
      lat >= r.minLat &&
      lat <= r.maxLat &&
      lng >= r.minLng &&
      lng <= r.maxLng
    )
      return r.name;
  }
  return (
    Math.abs(lat).toFixed(1) +
    "°" +
    (lat >= 0 ? "N" : "S") +
    ", " +
    Math.abs(lng).toFixed(1) +
    "°" +
    (lng >= 0 ? "E" : "W")
  );
};

/* ─────────────────────────────────────────────
   3 IMPACT CANDIDATE SITES
───────────────────────────────────────────── */
const getImpactSites = (groundTrack) => {
  if (groundTrack.length < 10) return [];
  const n = groundTrack.length;
  const indices = [Math.max(0, n - 61), Math.max(0, n - 31), n - 1];
  const colors = ["#3b82f6", "#eab308", "#ef4444"];
  const labels = ["POSSIBLE", "PROBABLE", "PRIMARY"];
  return indices.map((idx, rank) => {
    const pt = groundTrack[idx];
    return {
      lng: pt[0],
      lat: pt[1],
      region: getLocationName(pt[0], pt[1]),
      rank,
      color: colors[rank],
      label: labels[rank],
    };
  });
};

/* ─────────────────────────────────────────────
   MARKER HTML BUILDERS
───────────────────────────────────────────── */
const buildSatMarkerHtml = (color) =>
  '<div style="position:relative;width:20px;height:20px;cursor:pointer;">' +
  '<div style="position:absolute;inset:0;background:' +
  color +
  ';border-radius:50%;opacity:0.35;animation:caPing 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>' +
  '<div style="position:absolute;inset:0;background:' +
  color +
  ';border-radius:50%;opacity:0.15;animation:caPing 1.8s cubic-bezier(0,0,0.2,1) infinite 0.4s;"></div>' +
  '<div style="position:absolute;top:6px;left:6px;width:8px;height:8px;background:' +
  color +
  ";border:1.5px solid #fff;border-radius:50%;box-shadow:0 0 6px " +
  color +
  ';"></div></div>';

const buildImpactMarkerHtml = (color, label) =>
  '<div style="position:relative;width:26px;height:26px;">' +
  '<div style="position:absolute;inset:0;background:' +
  color +
  ';border-radius:50%;opacity:0.2;animation:caPing 2.4s cubic-bezier(0,0,0.2,1) infinite;"></div>' +
  '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:10px;height:10px;background:' +
  color +
  ";border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px " +
  color +
  ';"></div>' +
  '<div style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);color:' +
  color +
  ";font-size:6px;font-weight:900;font-family:monospace;letter-spacing:0.08em;white-space:nowrap;text-shadow:0 0 5px " +
  color +
  ';">&#9888; ' +
  label +
  "</div></div>";

/* ─────────────────────────────────────────────
   RESIZE OBSERVER HOOK
───────────────────────────────────────────── */
const useElementSize = (ref) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const set = (w, h) =>
      setSize({ width: Math.floor(w), height: Math.floor(h) });
    const ro = new ResizeObserver(([e]) =>
      set(e.contentRect.width, e.contentRect.height),
    );
    ro.observe(ref.current);
    const r = ref.current.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) set(r.width, r.height);
    return () => ro.disconnect();
  }, [ref]);
  return size;
};

/* ─────────────────────────────────────────────
   MapSync — keeps Leaflet's coordinate space
   locked to the full world so markers and
   polylines map correctly onto the background.
───────────────────────────────────────────── */
const MapSync = ({ mapRef: extRef }) => {
  const map = useMap();
  useEffect(() => {
    if (extRef) extRef.current = map;
    map.invalidateSize({ animate: false });
    // Use CRS.Simple-compatible bounds: lock view to world, no wrapping
    const zoom = map.getBoundsZoom(
      [
        [-90, -180],
        [90, 180],
      ],
      false,
    );
    map.setView([0, 0], zoom, { animate: false });
    map.setMinZoom(zoom);
    map.setMaxBounds([
      [-90, -180],
      [90, 180],
    ]);
  }, [map, extRef]);
  return null;
};

/* ─────────────────────────────────────────────
   StableLeafletMap
   KEY DESIGN: the world map image is a plain
   <img> CSS-stretched to 100%×100% BEHIND the
   Leaflet canvas. Leaflet itself has a transparent
   background so it only draws markers+polylines.
   This guarantees the image always fills the
   container with zero gaps, regardless of zoom.
───────────────────────────────────────────── */
const StableLeafletMap = memo(
  ({ mapRef, groundTrack, satPosition, impactSites, sevColor, onSatClick }) => {
    const satIcon = useMemo(
      () =>
        L.divIcon({
          className: "",
          html: buildSatMarkerHtml(sevColor),
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      [sevColor],
    );

    const impactIcons = useMemo(
      () =>
        impactSites.map((site) =>
          L.divIcon({
            className: "",
            html: buildImpactMarkerHtml(site.color, site.label),
            iconSize: [26, 26],
            iconAnchor: [13, 20],
          }),
        ),
      [impactSites],
    );

    return (
      /* Wrapper: map image fills 100%×100% as a real CSS background.
       Leaflet sits on top with pointer-events so user can pan/zoom. */
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {/* ── BACKGROUND MAP IMAGE — always fills container exactly ── */}
        <img
          src={local2DMap}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover", // fills without distortion
            objectPosition: "center",
            opacity: 0.88,
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
          }}
        />

        {/* ── LEAFLET overlay — transparent bg, markers + polylines only ── */}
        <MapContainer
          center={[0, 0]}
          zoom={2}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            background: "transparent",
            zIndex: 1,
          }}
          zoomControl={false}
          scrollWheelZoom={false}
          touchZoom={false}
          doubleClickZoom={false}
          boxZoom={false}
          keyboard={false}
          dragging={false}
          minZoom={1}
          maxZoom={6}
          attributionControl={false}
          maxBoundsViscosity={1.0}
          whenReady={(e) => {
            if (mapRef) mapRef.current = e.target;
          }}
        >
          <MapSync mapRef={mapRef} />

          {/* Ground track */}
          {groundTrack.length > 1 && (
            <Polyline
              positions={groundTrack.map((pt) => [pt[1], pt[0]])}
              pathOptions={{ color: sevColor, weight: 0.8, opacity: 0.7 }}
            />
          )}

          {/* Live satellite marker */}
          {satPosition && (
            <LeafletMarker
              position={[satPosition[1], satPosition[0]]}
              eventHandlers={{ click: onSatClick }}
              icon={satIcon}
            />
          )}

          {/* 3 impact markers */}
          {impactSites.map((site, i) => (
            <LeafletMarker
              key={i}
              position={[site.lat, site.lng]}
              icon={impactIcons[i]}
            />
          ))}
        </MapContainer>
      </div>
    );
  },
);

/* ═════════════════════════════════════════════
   FULLSCREEN MAP — rendered via React Portal
   to escape Dashboard's stacking context.
═════════════════════════════════════════════ */
const FullscreenMap = ({
  selectedSat,
  onBack,
  sevColor,
  groundTrack,
  satPosition,
  impactSites,
  predictionText,
  showDetailPanel,
  setShowDetailPanel,
  sliderHours,
  setSliderHours,
  isSliderActive,
  setIsSliderActive,
  resumeLiveTracking,
  mapRef,
}) => {
  const orb = selectedSat.orbital_elements || {};
  const orbitalItems = [
    {
      label: "Semi-Major Axis",
      value: (orb.semi_major_axis_km || "—") + " km",
      icon: "🌐",
    },
    { label: "Eccentricity", value: orb.eccentricity ?? "—", icon: "◎" },
    {
      label: "Inclination",
      value: (orb.inclination_deg || "—") + "°",
      icon: "📐",
    },
    { label: "RAAN", value: (orb.raan_deg || "—") + "°", icon: "🧭" },
    {
      label: "Arg. of Perigee",
      value: (orb.arg_perigee_deg || "—") + "°",
      icon: "🔄",
    },
    {
      label: "Mean Anomaly",
      value: (orb.mean_anomaly_deg || "—") + "°",
      icon: "📍",
    },
    {
      label: "Mean Motion",
      value: (orb.mean_motion_rev_day || "—") + " rev/day",
      icon: "⚡",
    },
    { label: "Epoch", value: orb.epoch || "—", icon: "📅" },
  ];

  const css =
    "@keyframes caSlideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}" +
    "@keyframes caPing{0%{transform:scale(1);opacity:.8}75%,100%{transform:scale(2.4);opacity:0}}" +
    ".ca-range::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid " +
    sevColor +
    ";cursor:pointer;box-shadow:0 0 8px " +
    sevColor +
    "80}" +
    ".ca-range::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid " +
    sevColor +
    ";cursor:pointer}" +
    /* Leaflet container must have transparent bg so our img shows through */
    ".leaflet-container{background:transparent!important}";

  // Callback refs — stable, won't cause map remount
  const handleSatClick = useCallback(
    () => setShowDetailPanel(true),
    [setShowDetailPanel],
  );

  const content = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#020617",
        overflow: "hidden",
        fontFamily: "inherit",
      }}
    >
      <style>{css}</style>

      {/* ── TOP BAR ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          background: "rgba(2,6,23,0.95)",
          borderBottom: "1px solid " + sevColor + "30",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          zIndex: 10000, // above Leaflet
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              padding: "6px 8px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.06)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowLeft size={16} color="#cbd5e1" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: sevColor,
                boxShadow: "0 0 8px " + sevColor,
              }}
            />
            <span
              style={{
                color: "#fff",
                fontWeight: 900,
                fontSize: 13,
                textTransform: "uppercase",
                fontStyle: "italic",
                letterSpacing: "-0.02em",
              }}
            >
              {selectedSat.name}
            </span>
            <span
              style={{
                color: "#475569",
                fontSize: 9,
                fontFamily: "monospace",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginLeft: 8,
              }}
            >
              NORAD: {selectedSat.norad_id}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowDetailPanel(!showDetailPanel)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 10,
            background: showDetailPanel
              ? sevColor + "22"
              : "rgba(255,255,255,0.06)",
            border:
              "1px solid " +
              (showDetailPanel ? sevColor + "55" : "rgba(255,255,255,0.12)"),
            color: showDetailPanel ? sevColor : "#94a3b8",
            cursor: "pointer",
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          <Info size={12} />
          {showDetailPanel ? "Hide Details" : "Details"}
        </button>
      </div>

      {/* ── MAP AREA ── */}
      <div
        style={{
          position: "absolute",
          top: 48,
          bottom: 72,
          left: 0,
          // Shrink map width when detail panel is open
          right: showDetailPanel ? 320 : 0,
          transition: "right 0.32s ease",
          zIndex: 1,
        }}
        ref={(el) => {
          // After CSS transition completes (~320ms), tell Leaflet the container
          // has new dimensions so it recenters tiles correctly.
          if (!el) return;
          const tid = setTimeout(
            () => mapRef.current?.invalidateSize({ animate: false }),
            340,
          );
          return () => clearTimeout(tid);
        }}
      >
        {/* Current region overlay */}
        {predictionText && (
          <div
            style={{
              position: "absolute",
              top: 14,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              padding: "8px 18px",
              borderRadius: 10,
              background: "rgba(2,6,23,0.9)",
              backdropFilter: "blur(12px)",
              border: "1px solid " + sevColor + "35",
              display: "flex",
              alignItems: "center",
              gap: 14,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={11} color={sevColor} />
              <span
                style={{
                  fontSize: 9,
                  color: "#94a3b8",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Current Region:
              </span>
              <span style={{ fontSize: 11, color: "#fff", fontWeight: 900 }}>
                {predictionText.location}
              </span>
            </div>
            <div
              style={{
                width: 1,
                height: 14,
                background: "rgba(255,255,255,0.1)",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={11} color="#475569" />
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color: sevColor,
                }}
              >
                {predictionText.timeOffset}
              </span>
            </div>
          </div>
        )}

        {/* Leaflet map — memoized, will NOT remount on slider change */}
        <div style={{ position: "absolute", inset: 0 }}>
          <StableLeafletMap
            mapRef={mapRef}
            groundTrack={groundTrack}
            satPosition={satPosition}
            impactSites={impactSites}
            sevColor={sevColor}
            onSatClick={handleSatClick}
          />
        </div>

        {/* Zoom controls removed — zooming misaligns the polyline from the
            static background image, so the map is locked to world view */}

        {/* Telemetry readout */}
        {satPosition && (
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              zIndex: 1000,
              display: "flex",
              gap: 8,
            }}
          >
            {[
              ["LAT", satPosition[1].toFixed(4) + "°", false],
              ["LNG", satPosition[0].toFixed(4) + "°", false],
              ["ALT", selectedSat.altitude + " km", true],
            ].map(([lbl, val, accent]) => (
              <div
                key={lbl}
                style={{
                  padding: "5px 10px",
                  borderRadius: 8,
                  background: "rgba(2,6,23,0.92)",
                  border: "1px solid " + sevColor + "35",
                }}
              >
                <div
                  style={{
                    fontSize: 7,
                    color: "#475569",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    fontFamily: "monospace",
                  }}
                >
                  {lbl}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: accent ? sevColor : "#fff",
                  }}
                >
                  {val}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Impact zones legend — bottom center */}
        {impactSites.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              padding: "7px 16px",
              borderRadius: 10,
              background: "rgba(2,6,23,0.9)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 18,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontSize: 7,
                color: "#475569",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                whiteSpace: "nowrap",
              }}
            >
              Impact Zones:
            </span>
            {impactSites.map((site) => (
              <div
                key={site.rank}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: site.color,
                    boxShadow: "0 0 5px " + site.color,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 7,
                      fontWeight: 900,
                      color: site.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      lineHeight: 1.1,
                    }}
                  >
                    {site.label}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      fontFamily: "monospace",
                      color: "#94a3b8",
                      lineHeight: 1.1,
                    }}
                  >
                    {site.region}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FIX B: DETAIL PANEL — rendered OUTSIDE map area div,
          at the portal root level with very high z-index ── */}
      {showDetailPanel && (
        <div
          style={{
            position: "absolute",
            top: 48,
            bottom: 72,
            right: 0,
            width: 320,
            /* Must be above .leaflet-container (z:1) and all its children.
             We use 5000 — safely above Leaflet, below topbar (10000). */
            zIndex: 5000,
            overflowY: "auto",
            background: "rgba(2,6,23,0.97)",
            backdropFilter: "blur(20px)",
            borderLeft: "1px solid " + sevColor + "30",
            animation: "caSlideIn 0.28s ease-out forwards",
          }}
        >
          <div style={{ padding: "16px 16px 80px 16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: "#fff",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Satellite Details
              </span>
              <button
                onClick={() => setShowDetailPanel(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: 4,
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Name card */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: sevColor + "14",
                border: "1px solid " + sevColor + "28",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: "#fff",
                  textTransform: "uppercase",
                  fontStyle: "italic",
                  letterSpacing: "-0.01em",
                }}
              >
                {selectedSat.name}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "#64748b",
                  fontFamily: "monospace",
                  marginTop: 3,
                }}
              >
                NORAD ID: {selectedSat.norad_id}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <div
                  style={{
                    fontSize: 8,
                    fontFamily: "monospace",
                    color: sevColor,
                    background: sevColor + "18",
                    padding: "2px 8px",
                    borderRadius: 20,
                    fontWeight: 700,
                  }}
                >
                  {selectedSat.severity}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    fontFamily: "monospace",
                    color: "#94a3b8",
                    background: "rgba(255,255,255,0.05)",
                    padding: "2px 8px",
                    borderRadius: 20,
                  }}
                >
                  {selectedSat.altitude} km
                </div>
              </div>
            </div>

            {/* TLE */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 900,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginBottom: 6,
                }}
              >
                TLE Data
              </div>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  fontFamily: "monospace",
                  fontSize: 8,
                  color: "#94a3b8",
                  wordBreak: "break-all",
                  lineHeight: 1.7,
                }}
              >
                <div
                  style={{ color: "rgba(103,232,249,0.5)", marginBottom: 2 }}
                >
                  LINE 1:
                </div>
                <div style={{ color: "#cbd5e1" }}>
                  {selectedSat.tle_line1 || "—"}
                </div>
                <div
                  style={{
                    color: "rgba(103,232,249,0.5)",
                    marginTop: 6,
                    marginBottom: 2,
                  }}
                >
                  LINE 2:
                </div>
                <div style={{ color: "#cbd5e1" }}>
                  {selectedSat.tle_line2 || "—"}
                </div>
              </div>
            </div>

            {/* Orbital elements */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 900,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginBottom: 6,
                }}
              >
                Orbital Elements
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {orbitalItems.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "7px 10px",
                      borderRadius: 8,
                      background: "rgba(0,0,0,0.35)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 7 }}
                    >
                      <span style={{ fontSize: 10 }}>{item.icon}</span>
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          color: "#475569",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "monospace",
                        fontWeight: 700,
                        color: "#e2e8f0",
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Impact zones */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.18)",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 900,
                  color: "#f87171",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginBottom: 10,
                }}
              >
                Impact Candidate Zones
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {impactSites.map((site) => (
                  <div
                    key={site.rank}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: site.color,
                          boxShadow: "0 0 4px " + site.color,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 900,
                          color: site.color,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {site.label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 8,
                        fontFamily: "monospace",
                        color: "#94a3b8",
                      }}
                    >
                      {site.region}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Re-entry window */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.18)",
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 900,
                  color: "#f87171",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginBottom: 8,
                }}
              >
                Re-Entry Window
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 9,
                  display: "flex",
                  flexDirection: "column",
                  gap: 5,
                }}
              >
                <div style={{ color: "#fbbf24" }}>
                  START:{" "}
                  {(() => {
                    const d = new Date();
                    d.setHours(
                      d.getHours() +
                        Math.max(0, (selectedSat.hours_left || 0) - 12),
                    );
                    return (
                      d.toISOString().slice(0, 16).replace("T", " ") + " UTC"
                    );
                  })()}
                </div>
                <div style={{ color: "#f87171" }}>
                  END:{" "}
                  {(() => {
                    const d = new Date();
                    d.setHours(
                      d.getHours() + (selectedSat.hours_left || 0) + 12,
                    );
                    return (
                      d.toISOString().slice(0, 16).replace("T", " ") + " UTC"
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FIX C: TRAJECTORY SLIDER ──
          onMouseUp/onTouchEnd no longer resets position.
          Position holds. A "Resume Live" button appears
          when manual mode is active.
      ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 72,
          padding: "0 20px",
          zIndex: 10000,
          background: "rgba(2,6,23,0.97)",
          borderTop: "1px solid " + sevColor + "25",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        {/* Mode indicator + resume button */}
        <div style={{ flexShrink: 0, minWidth: 90 }}>
          <div
            style={{
              fontSize: 8,
              fontWeight: 900,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 3,
            }}
          >
            Trajectory
          </div>
          {isSliderActive ? (
            <button
              onClick={resumeLiveTracking}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 7,
                fontFamily: "monospace",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#22c55e",
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 6,
                padding: "3px 8px",
                cursor: "pointer",
              }}
            >
              <Play size={8} /> Resume Live
            </button>
          ) : (
            <div
              style={{
                fontSize: 7,
                fontFamily: "monospace",
                color: "#22c55e",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              ● LIVE TRACKING
            </div>
          )}
        </div>

        {/* Slider */}
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="range"
            min="0"
            max="6"
            step="0.05"
            value={sliderHours}
            onMouseDown={() => setIsSliderActive(true)}
            onTouchStart={() => setIsSliderActive(true)}
            // FIX C: do NOT reset on release — hold the position
            onMouseUp={() => {
              /* intentionally empty — position holds */
            }}
            onTouchEnd={() => {
              /* intentionally empty — position holds */
            }}
            onChange={(e) => setSliderHours(parseFloat(e.target.value))}
            className="ca-range"
            style={{
              width: "100%",
              height: 4,
              appearance: "none",
              borderRadius: 4,
              cursor: "pointer",
              outline: "none",
              background:
                "linear-gradient(to right," +
                sevColor +
                " 0%," +
                sevColor +
                " " +
                (sliderHours / 6) * 100 +
                "%," +
                "rgba(255,255,255,0.1) " +
                (sliderHours / 6) * 100 +
                "%," +
                "rgba(255,255,255,0.1) 100%)",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 5,
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 7,
                  fontFamily: "monospace",
                  color: "#334155",
                  fontWeight: 700,
                }}
              >
                {h}h
              </span>
            ))}
          </div>
        </div>

        <span
          style={{
            fontSize: 14,
            fontFamily: "monospace",
            fontWeight: 900,
            color: sevColor,
            minWidth: 44,
            textAlign: "right",
          }}
        >
          +{sliderHours.toFixed(1)}h
        </span>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

/* ═════════════════════════════════════════════
   MAIN COMPONENT
═════════════════════════════════════════════ */
const CrisisAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [selectedSat, setSelectedSat] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [sliderHours, setSliderHours] = useState(0);
  const [timeOffset, setTimeOffset] = useState(0);
  const [isSliderActive, setIsSliderActive] = useState(false);
  // Elapsed orbital minutes — index into groundTrack directly
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  const globeEl = useRef();
  const mapRef = useRef();
  const globeContainerRef = useRef();
  const globeSize = useElementSize(globeContainerRef);

  /* ── Fetch ── */
  const fetchAlerts = useCallback(async () => {
    try {
      const data = await satelliteService.fetchData("Alerts");
      const list = Array.isArray(data) ? data : [];
      const reEntryList = list
        .filter((sat) => {
          const alt = Number(sat.altitude || sat.metadata?.altitude || 0);
          return alt > 0 && alt < 150;
        })
        .map((sat) => {
          let severity = (sat.severity || "").toUpperCase();
          if (!SEVERITY[severity]) {
            const alt = Number(sat.altitude || 0);
            if (alt <= 100) severity = "RED";
            else if (alt <= 125) severity = "YELLOW";
            else if (alt <= 150) severity = "PURPLE";
            else severity = "STABLE";
          }
          return { ...sat, severity };
        });
      setAlerts(reEntryList);
    } catch (err) {
      console.error("Alerts fetch error:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const t = setInterval(fetchAlerts, 60000);
    return () => clearInterval(t);
  }, [fetchAlerts]);

  /* ── Globe rotation + orbital position animation ──
     orbitTick advances in "orbital minutes" at a reasonable visual speed.
     Each rAF (~60fps) we advance 0.02 orbital minutes ≈ 1.2 min/sec (visual).
     This keeps dots moving visibly without racing across the globe.
  ── */
  useEffect(() => {
    let af;
    const loop = () => {
      setTimeOffset((p) => p + 0.02);
      af = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(af);
  }, []);

  /* ── Live position timer ──
     elapsedMinutesRef keeps the true running count even while isSliderActive
     pauses the state update, so Resume always continues from the right spot.
  ── */
  const elapsedMinutesRef = useRef(0);
  useEffect(() => {
    elapsedMinutesRef.current = elapsedMinutes;
  }, [elapsedMinutes]);

  useEffect(() => {
    if (!selectedSat || isSliderActive) return;
    // On each tick advance by 1 orbital minute
    const t = setInterval(() => {
      setElapsedMinutes((p) => p + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [selectedSat, isSliderActive]);

  /* ── Leaflet ping keyframe ── */
  useEffect(() => {
    const id = "ca-ping-kf";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent =
        "@keyframes caPing{0%{transform:scale(1);opacity:.8}75%,100%{transform:scale(2.4);opacity:0}}";
      document.head.appendChild(s);
    }
    return () => document.getElementById("ca-ping-kf")?.remove();
  }, []);

  /* ── Globe controls ── */
  useEffect(() => {
    const t = setTimeout(() => {
      if (globeEl.current) {
        globeEl.current.controls().autoRotate = true;
        globeEl.current.controls().autoRotateSpeed = 0.4;
        globeEl.current.pointOfView({ altitude: 2.5 });
      }
    }, 300);
    return () => clearTimeout(t);
  }, []);

  /* ── Derived ── */
  const filteredAlerts = useMemo(() => {
    let list =
      activeFilter !== "ALL"
        ? alerts.filter((a) => a.severity === activeFilter)
        : [...alerts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          (a.name || "").toLowerCase().includes(q) ||
          String(a.norad_id || "").includes(q),
      );
    }
    return list;
  }, [alerts, activeFilter, searchQuery]);

  const globeData = useMemo(
    () =>
      alerts.map((sat) => {
        const altVal = Number(sat.altitude || 0);
        const sev =
          SEVERITY[sat.severity] ||
          (altVal <= 100
            ? SEVERITY.RED
            : altVal <= 125
              ? SEVERITY.YELLOW
              : altVal <= 150
                ? SEVERITY.PURPLE
                : SEVERITY.STABLE);
        const rawLat = Number(sat.lat ?? NaN),
          rawLng = Number(sat.lng ?? NaN);
        const hasCoords =
          !isNaN(rawLat) && !isNaN(rawLng) && (rawLat !== 0 || rawLng !== 0);
        let lat, lng;
        if (hasCoords) {
          lat = rawLat;
          lng = rawLng;
        } else {
          const norad = Number(sat.norad_id || 0);
          const inc =
            Number(sat.orbital_elements?.inclination_deg) || 20 + (norad % 70);
          const mm =
            Number(sat.orbital_elements?.mean_motion_rev_day) ||
            14 + (norad % 4) * 0.5;
          const ma =
            Number(sat.orbital_elements?.mean_anomaly_deg) ||
            (norad * 137.508) % 360;
          const raan =
            Number(sat.orbital_elements?.raan_deg) || (norad * 97.3) % 360;
          const period = 1440 / mm;
          const angleRad =
            ((ma + (360 / period) * timeOffset) % 360) * (Math.PI / 180);
          const incRad = inc * (Math.PI / 180);
          const earthRot = (timeOffset / 1440) * 360;
          lat =
            Math.asin(Math.sin(incRad) * Math.sin(angleRad)) * (180 / Math.PI);
          lng =
            ((raan +
              Math.atan2(
                Math.cos(incRad) * Math.sin(angleRad),
                Math.cos(angleRad),
              ) *
                (180 / Math.PI) -
              earthRot +
              540) %
              360) -
            180;
        }
        return {
          lat,
          lng,
          alt: 0.02,
          size: sat.severity === "RED" || altVal <= 100 ? 0.8 : 0.5,
          color: sev.color,
          name: sat.name || "Unknown Object",
          norad_id: sat.norad_id,
          severity: sat.severity || "YELLOW",
          altitude: altVal,
        };
      }),
    [alerts, timeOffset],
  );

  const groundTrack = useMemo(
    () => (selectedSat ? generateGroundTrack(selectedSat, 6) : []),
    [selectedSat],
  );

  const satPosition = useMemo(() => {
    if (!groundTrack.length) return null;
    const idx = isSliderActive
      ? Math.min(Math.round(sliderHours * 60), groundTrack.length - 1)
      : Math.round(elapsedMinutes) % groundTrack.length;
    return groundTrack[idx];
  }, [groundTrack, sliderHours, elapsedMinutes, isSliderActive]);

  const impactSites = useMemo(() => getImpactSites(groundTrack), [groundTrack]);

  const predictionText = useMemo(() => {
    if (!satPosition) return null;
    const mins = isSliderActive
      ? Math.min(Math.round(sliderHours * 60), groundTrack.length - 1)
      : Math.round(elapsedMinutes) % groundTrack.length;
    const h = Math.floor(mins / 60),
      m = mins % 60;
    return {
      location: getLocationName(satPosition[0], satPosition[1]),
      timeOffset:
        "T+" +
        String(h).padStart(2, "0") +
        ":" +
        String(m).padStart(2, "0") +
        ":00",
    };
  }, [
    satPosition,
    sliderHours,
    elapsedMinutes,
    isSliderActive,
    groundTrack.length,
  ]);

  const counts = useMemo(
    () => ({
      RED: alerts.filter((a) => a.severity === "RED").length,
      YELLOW: alerts.filter((a) => a.severity === "YELLOW").length,
      PURPLE: alerts.filter((a) => a.severity === "PURPLE").length,
      ALL: alerts.length,
    }),
    [alerts],
  );

  /* ── Handlers ── */
  const handleSelectSatellite = (sat) => {
    setSelectedSat(sat);
    setSliderHours(0);
    setElapsedMinutes(0);
    setIsSliderActive(false);
    setShowDetailPanel(false);
  };
  const handleBack = () => {
    setSelectedSat(null);
    setShowDetailPanel(false);
    setSliderHours(0);
    setElapsedMinutes(0);
    setIsSliderActive(false);
  };

  // Resume live tracking: continue from where slider was left
  const resumeLiveTracking = useCallback(() => {
    const resumeAt = Math.round(sliderHours * 60);
    setElapsedMinutes(resumeAt);
    elapsedMinutesRef.current = resumeAt;
    setIsSliderActive(false);
  }, [sliderHours]);

  const sevColor = selectedSat
    ? (SEVERITY[selectedSat.severity] || SEVERITY.STABLE).color
    : "#06b6d4";

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <>
      {/* Portal fullscreen map */}
      {selectedSat && (
        <FullscreenMap
          selectedSat={selectedSat}
          onBack={handleBack}
          sevColor={sevColor}
          groundTrack={groundTrack}
          satPosition={satPosition}
          impactSites={impactSites}
          predictionText={predictionText}
          showDetailPanel={showDetailPanel}
          setShowDetailPanel={setShowDetailPanel}
          sliderHours={sliderHours}
          setSliderHours={setSliderHours}
          isSliderActive={isSliderActive}
          setIsSliderActive={setIsSliderActive}
          resumeLiveTracking={resumeLiveTracking}
          mapRef={mapRef}
        />
      )}

      {/* Two-panel view (always in DOM) */}
      <div
        className="h-full flex overflow-hidden"
        style={{ background: "#020617" }}
      >
        {/* LEFT panel */}
        <div
          className="w-[30%] min-w-[320px] shrink-0 flex flex-col border-r overflow-hidden"
          style={{
            background: "rgba(2,6,23,0.95)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <div className="px-5 pt-4 pb-3 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">
                  Crisis Alerts
                </h2>
                <p className="text-[8px] text-slate-500 font-mono uppercase tracking-widest">
                  {alerts.length} Satellites Tracked
                </p>
              </div>
            </div>

            <div className="relative mb-3">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or NORAD ID..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[10px] text-white placeholder:text-slate-600 focus:outline-none transition-colors font-mono"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(6,182,212,0.4)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(255,255,255,0.08)")
                }
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex gap-1.5">
              {[
                { key: "ALL", label: "All", color: "#06b6d4" },
                {
                  key: "RED",
                  label: "🔴 " + counts.RED,
                  color: SEVERITY.RED.color,
                },
                {
                  key: "YELLOW",
                  label: "🟡 " + counts.YELLOW,
                  color: SEVERITY.YELLOW.color,
                },
                {
                  key: "PURPLE",
                  label: "🟣 " + counts.PURPLE,
                  color: SEVERITY.PURPLE.color,
                },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className="flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all"
                  style={{
                    background:
                      activeFilter === f.key
                        ? f.color + "20"
                        : "rgba(0,0,0,0.3)",
                    border:
                      "1px solid " +
                      (activeFilter === f.key
                        ? f.color + "50"
                        : "rgba(255,255,255,0.06)"),
                    color: activeFilter === f.key ? f.color : "#64748b",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Activity className="w-6 h-6 text-cyan-500 animate-pulse" />
                <p className="text-[9px] text-slate-500 mt-3 uppercase tracking-widest">
                  Acquiring telemetry...
                </p>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-16 text-slate-600 text-[10px] uppercase tracking-widest font-bold">
                No satellites match filters
              </div>
            ) : (
              filteredAlerts.map((sat, idx) => {
                const sev = SEVERITY[sat.severity] || SEVERITY.STABLE;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectSatellite(sat)}
                    className="w-full text-left p-4 rounded-xl border transition-all duration-300 hover:scale-[1.01]"
                    style={{ background: sev.bg, borderColor: sev.border }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 4px 20px " + sev.color + "15";
                      e.currentTarget.style.borderColor = sev.color + "60";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = sev.border;
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full animate-pulse"
                          style={{ background: sev.color }}
                        />
                        <span className="text-white font-black text-[11px] uppercase italic tracking-tight">
                          {sat.name || "Unknown"}
                        </span>
                      </div>
                      <span
                        className="text-[7px] font-black px-2 py-0.5 rounded-full"
                        style={{
                          background: sev.color + "20",
                          color: sev.color,
                        }}
                      >
                        {sat.severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[8px] font-mono text-slate-400">
                      <span>NORAD: {sat.norad_id}</span>
                      <span>{sat.altitude} km</span>
                      <span style={{ color: sev.color }}>
                        {sat.days_left}d left
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT — globe */}
        <div
          ref={globeContainerRef}
          className="flex-1 relative overflow-hidden"
        >
          {globeSize.width > 0 && globeSize.height > 0 && (
            <Globe
              ref={globeEl}
              width={globeSize.width}
              height={globeSize.height}
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              showAtmosphere
              atmosphereColor="#1e3a8a"
              atmosphereAltitude={0.18}
              pointsData={globeData}
              pointLat="lat"
              pointLng="lng"
              pointAltitude="alt"
              pointRadius="size"
              pointColor="color"
              pointLabel={(d) =>
                '<div style="background:#111827;padding:6px 10px;border-radius:4px;border:1px solid #374151;font-family:monospace;font-size:10px;line-height:1.4;">' +
                '<span style="color:#f8fafc;font-weight:bold;">' +
                d.name +
                "</span><br/>" +
                '<span style="color:#94a3b8;">NORAD: ' +
                d.norad_id +
                "</span></div>"
              }
            />
          )}

          {/* Legend */}
          <div
            className="absolute bottom-4 right-4 z-20 px-4 py-3 rounded-xl"
            style={{
              background: "rgba(2,6,23,0.85)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Severity
            </p>
            <div className="space-y-1.5">
              {[
                { sev: "RED", label: "≤ 5 Days — Immediate Danger" },
                { sev: "YELLOW", label: "≤ 10 Days — High Risk" },
                { sev: "PURPLE", label: "≤ 15 Days — Early Warning" },
              ].map((item) => (
                <div key={item.sev} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: SEVERITY[item.sev].color }}
                  />
                  <span className="text-[8px] font-bold text-slate-400 uppercase">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="absolute bottom-4 left-4 z-20 px-4 py-3 rounded-xl flex items-center gap-3"
            style={{
              background: "rgba(2,6,23,0.85)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-mono font-bold text-slate-300 uppercase tracking-wider">
              {alerts.length} Objects Live
            </span>
          </div>

          <div className="absolute top-4 right-4 z-20 flex gap-2">
            {counts.RED > 0 && (
              <div
                className="px-3 py-2 rounded-xl flex items-center gap-1.5 animate-pulse"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
                <span className="text-[8px]">🔴</span>
                <span className="text-[10px] font-black text-red-400">
                  {counts.RED}
                </span>
              </div>
            )}
            {counts.YELLOW > 0 && (
              <div
                className="px-3 py-2 rounded-xl flex items-center gap-1.5"
                style={{
                  background: "rgba(234,179,8,0.1)",
                  border: "1px solid rgba(234,179,8,0.3)",
                }}
              >
                <span className="text-[8px]">🟡</span>
                <span className="text-[10px] font-black text-yellow-400">
                  {counts.YELLOW}
                </span>
              </div>
            )}
            {counts.PURPLE > 0 && (
              <div
                className="px-3 py-2 rounded-xl flex items-center gap-1.5"
                style={{
                  background: "rgba(168,85,247,0.1)",
                  border: "1px solid rgba(168,85,247,0.3)",
                }}
              >
                <span className="text-[8px]">🟣</span>
                <span className="text-[10px] font-black text-purple-400">
                  {counts.PURPLE}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CrisisAlerts;
