import { twoline2satrec, propagate, gstime, eciToGeodetic, degreesLong, degreesLat } from 'satellite.js';

// SGP4/Satellite.js engine to predict trajectories
export const TrajectoryEngine = {

  // Generates ground track points, returning [lng, lat] arrays
  generateGroundTrack(tleLine1, tleLine2, hoursAhead = 360, stepMinutes = 10) {
    if (!tleLine1 || !tleLine2) return [];
    
    try {
      const satrec = twoline2satrec(tleLine1, tleLine2);
      const points = [];
      const now = new Date();
      
      const ptsCount = Math.floor((hoursAhead * 60) / stepMinutes) + 1;
      
      for (let i = 0; i < ptsCount; i++) {
        const targetTime = new Date(now.getTime() + i * stepMinutes * 60000);
        const positionAndVelocity = propagate(satrec, targetTime);
        const positionEci = positionAndVelocity.position;
        
        if (!positionEci || isNaN(positionEci.x)) continue;

        const gmstVal = gstime(targetTime);
        const geodetic = eciToGeodetic(positionEci, gmstVal);
        const lat = degreesLat(geodetic.latitude);
        const lng = degreesLong(geodetic.longitude);
        
        points.push([lng, lat]);
      }
      return points;
    } catch (e) {
      console.error("Trajectory Engine Error:", e);
      return [];
    }
  },

  // Generate multiple separate orbit passes for 2D CRT-style display
  // Returns array of track segments (each is an array of [lng, lat])
  generateMultiPassTrack(tleLine1, tleLine2, hoursAhead = 360, stepMinutes = 5) {
    if (!tleLine1 || !tleLine2) return [];
    try {
      const satrec = twoline2satrec(tleLine1, tleLine2);
      const passes = [];
      let currentPass = [];
      const now = new Date();
      const ptsCount = Math.floor((hoursAhead * 60) / stepMinutes) + 1;
      let prevLng = null;

      for (let i = 0; i < ptsCount; i++) {
        const targetTime = new Date(now.getTime() + i * stepMinutes * 60000);
        const pv = propagate(satrec, targetTime);
        const posEci = pv.position;
        if (!posEci || isNaN(posEci.x)) continue;

        const gmstVal = gstime(targetTime);
        const geo = eciToGeodetic(posEci, gmstVal);
        const lat = degreesLat(geo.latitude);
        const lng = degreesLong(geo.longitude);

        // Split passes at longitude wrapping
        if (prevLng !== null && Math.abs(lng - prevLng) > 180) {
          if (currentPass.length > 1) passes.push(currentPass);
          currentPass = [];
        }
        currentPass.push([lng, lat]);
        prevLng = lng;
      }
      if (currentPass.length > 1) passes.push(currentPass);
      return passes;
    } catch (e) {
      console.error("Multi-pass track error:", e);
      return [];
    }
  },

  // Real-time SGP4 propagation — returns current {lat, lng, alt, velocity}
  propagateRealtime(tleLine1, tleLine2) {
    if (!tleLine1 || !tleLine2) return null;
    try {
      const satrec = twoline2satrec(tleLine1, tleLine2);
      const now = new Date();
      const pv = propagate(satrec, now);
      const posEci = pv.position;
      const velEci = pv.velocity;

      if (!posEci || isNaN(posEci.x)) return null;

      const gmstVal = gstime(now);
      const geodetic = eciToGeodetic(posEci, gmstVal);
      const lat = degreesLat(geodetic.latitude);
      const lng = degreesLong(geodetic.longitude);
      const alt = geodetic.height; // km above ellipsoid

      const velocity = velEci
        ? Math.sqrt(velEci.x ** 2 + velEci.y ** 2 + velEci.z ** 2)
        : 7.66;

      return { lat, lng, alt, velocity };
    } catch (e) {
      return null;
    }
  },

  // Check if current satellite position is within an impact corridor
  isInImpactCorridor(currentPos, impactSites, thresholdDeg = 5) {
    if (!currentPos || !impactSites || impactSites.length === 0) return null;
    for (const site of impactSites) {
      const dLat = Math.abs(currentPos.lat - site.lat);
      const dLng = Math.abs(currentPos.lng - site.lng);
      if (dLat < thresholdDeg && dLng < thresholdDeg) {
        return site;
      }
    }
    return null;
  },

  // Get estimated re-entry time from mean motion decay
  getReentryEstimate(daysLeft) {
    if (!daysLeft || daysLeft <= 0) return null;
    const now = new Date();
    const reentryTime = new Date(now.getTime() + daysLeft * 86400000);
    return {
      estimatedTime: reentryTime,
      windowStart: new Date(reentryTime.getTime() - 12 * 3600000),
      windowEnd: new Date(reentryTime.getTime() + 12 * 3600000),
      countdown: {
        days: Math.floor(daysLeft),
        hours: Math.floor((daysLeft % 1) * 24),
        minutes: Math.floor(((daysLeft % 1) * 24 % 1) * 60),
        seconds: Math.floor((((daysLeft % 1) * 24 % 1) * 60 % 1) * 60)
      }
    };
  },

  // Identifies 3 possible impact zones intelligently spaced near the end of the trajectory
  getImpactSites(track) {
    if (!track || track.length < 10) return [];
    const n = track.length;
    
    const getRegion = (lng, lat) => {
      const absLat = Math.abs(lat).toFixed(1);
      const absLng = Math.abs(lng).toFixed(1);
      return `${absLat}°${lat >= 0 ? 'N' : 'S'}, ${absLng}°${lng >= 0 ? 'E' : 'W'}`;
    };

    return [
      { idx: Math.max(0, n - 60), color: "#3b82f6", label: "POSSIBLE", radius: 400000 },
      { idx: Math.max(0, n - 30), color: "#eab308", label: "SECONDARY", radius: 260000 },
      { idx: n - 1, color: "#ef4444", label: "PRIMARY", radius: 150000 },
    ].map(s => {
      const pt = track[s.idx];
      return {
        lng: pt[0],
        lat: pt[1],
        region: getRegion(pt[0], pt[1]),
        color: s.color,
        label: s.label,
        radius: s.radius,
      };
    });
  },

  // Trajectory color by days
  getTrajectoryColor(days) {
    if (days <= 3) return "#ef4444";
    if (days <= 6) return "#eab308";
    if (days <= 15) return "#00ff88";
    return "#ffffff";
  }
};
