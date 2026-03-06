const fs = require('fs');

const generateMockSatellites = () => {
  const sats = [];
  const startEpoch = 24000;
  
  // Mix of active and debris prefixes
  const prefixes = ['STARLINK', 'ONEWEB', 'COSMOS', 'IRIDIUM', 'DEBRIS'];
  
  for (let i = 0; i < 300; i++) {
    const type = prefixes[Math.floor(Math.random() * prefixes.length)];
    const id = 10000 + i;
    const name = `${type}-${id}`;
    const isDebris = type === 'DEBRIS' || type === 'COSMOS';
    
    // Generate realistic TLE
    // Line 1: 1 AAAAAU 00000AAA BBDDD.DDDDDDDD +.CCCCCCCC +00000-0 +00000-0 0  EEEF
    // Line 2: 2 AAAAA GGG.GGGG HHH.HHHH IIIIIII JJJ.JJJJ KKK.KKKK LL.LLLLLLLLMMMMMF
    
    const year = new Date().getFullYear().toString().substr(-2);
    const dayOfYear = Math.floor(Math.random() * 365) + 1;
    const fraction = Math.random().toFixed(8).substring(2);
    const epoch = `${year}${dayOfYear.toString().padStart(3, '0')}.${fraction}`;
    
    // Inclination: 0-180
    const inc = (Math.random() * 180).toFixed(4).padStart(8, ' ');
    // RAAN: 0-360
    const raan = (Math.random() * 360).toFixed(4).padStart(8, ' ');
    // Eccentricity: 0.0000000 - 0.9999999 (without decimal)
    const ecc = Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
    // Arg Perigee: 0-360
    const argp = (Math.random() * 360).toFixed(4).padStart(8, ' ');
    // Mean Anomaly: 0-360
    const ma = (Math.random() * 360).toFixed(4).padStart(8, ' ');
    // Mean Motion: typical LEO is 12-16 revs/day
    const mmRev = (12 + Math.random() * 4);
    const mm = mmRev.toFixed(8).padStart(11, ' ');
    
    const revNum = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    
    // Calculate simulated altitude based on mean motion (~a)
    // a = (mu / n^2)^(1/3)
    const mu = 398600.4418; // km^3/s^2
    const nRad = (mmRev * 2 * Math.PI) / 86400; // rad/s
    const a = Math.pow(mu / (nRad * nRad), 1/3); // km
    const alt = a - 6371; // altitude above earth
    
    const lat = Math.random() * 180 - 90;
    const lng = Math.random() * 360 - 180;
    
    const l1 = `1 ${id}U 20001A   ${epoch}  .00000000  00000-0  12345-4 0  9999`;
    const l2 = `2 ${id} ${inc} ${raan} ${ecc} ${argp} ${ma} ${mm}${revNum}0`;
    
    sats.push({
      name,
      norad_id: id.toString(),
      tle_line1: l1,
      tle_line2: l2,
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
      alt: Number(alt.toFixed(2)),
      is_critical: isDebris && alt < 300
    });
  }
  return sats;
};

fs.writeFileSync('backend/mock_satellites.json', JSON.stringify({ satellites: generateMockSatellites() }, null, 2));
console.log('Done writing mock_satellites.json');
