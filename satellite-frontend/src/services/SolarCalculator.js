export const getSubsolarPoint = (date) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const dayOfYear = Math.floor(diff / msPerDay);

  const declination =
    23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));

  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  let lng = 180 - utcHours * 15;
  if (lng < -180) lng += 360;
  if (lng > 180) lng -= 360;

  return { lat: declination, lng };
};

export const getTerminatorPoints = (subsolarLat, subsolarLng) => {
  const points = [];
  const latR = (subsolarLat * Math.PI) / 180;
  const lngR = (subsolarLng * Math.PI) / 180;

  for (let lon = -180; lon <= 180; lon += 5) {
    const lonR = (lon * Math.PI) / 180;
    const tanLat = -Math.cos(lonR - lngR) / Math.tan(latR || 0.0001);
    const termLat = (Math.atan(tanLat) * 180) / Math.PI;
    // Map bounds are slightly adjusted, we store standard coordinates
    // When used in SVG path, height mapping requires reversing the Y axis
    points.push([lon, -termLat]);
  }
  return points;
};
