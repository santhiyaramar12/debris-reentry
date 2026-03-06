import React, { useEffect } from "react";
import mapImg from "../assets/2dmap.jpg"; // Local image fallback
import {
  MapContainer,
  ImageOverlay,
  Polyline,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// 📡 Custom Pulse Icon logic
const pulseIcon = L.divIcon({
  className: "relative",
  html: `
    <div class="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
    <div class="relative w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-lg"></div>
  `,
  iconSize: [16, 16],
});

// Auto-recenter helper
const RecenterMap = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position && position[0] !== 0) {
      map.panTo(position, { animate: true });
    }
  }, [position, map]);
  return null;
};

// 💡 ADDED 'customMapUrl' prop to receive the NASA link from SatelliteAnalysis
const LeafletMap = ({ asset, showPath, liveCoords, customMapUrl }) => {
  // ✅ মাস্টার লজিক (Master Logic):
  // Prop-la URL vandha adhai use pannum, illana local assets image-ah use pannum.
  const mapImageUrl = customMapUrl || mapImg;

  const bounds = [
    [-90, -180],
    [90, 180],
  ];

  // Logic: Leaflet uses [lat, lng].
  const currentPos = [Number(liveCoords.lat || 0), Number(liveCoords.lng || 0)];

  // Track formatting: Ensure we handle both cases of backend data
  const rawTrack = asset?.map_data?.ground_track || asset?.ground_track || [];
  const formattedTrack = rawTrack.map((p) => [Number(p[0]), Number(p[1])]);

  return (
    <div className="h-full w-full bg-[#020617] rounded-[1.5rem] overflow-hidden">
      <MapContainer
        bounds={bounds}
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
        zoom={2}
        center={[0, 0]}
        style={{ height: "100%", width: "100%" }}
        attributionControl={false}
      >
        {/* ✅ FIXED: Correct image URL is now passed to the overlay */}
        <ImageOverlay url={mapImageUrl} bounds={bounds} opacity={0.5} />

        {showPath && formattedTrack.length > 0 && (
          <Polyline
            positions={formattedTrack}
            pathOptions={{
              color: "#ef4444",
              weight: 2,
              dashArray: "5, 10",
              opacity: 0.6,
            }}
          />
        )}

        <Marker position={currentPos} icon={pulseIcon} />
        <RecenterMap position={currentPos} />
      </MapContainer>
    </div>
  );
};

export default LeafletMap;
