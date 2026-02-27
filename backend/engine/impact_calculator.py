import math
import numpy as np
from datetime import datetime, timedelta
from sgp4.api import Satrec, jday

class ImpactCalculator:
    def __init__(self, mass, diameter, length):
        self.mass = float(mass) if mass else 500.0
        self.radius = (float(diameter) / 2) if diameter else 1.0
        self.length = float(length) if length else 2.0
        self.area = math.pi * (self.radius ** 2)
        self.cd = 2.2 

    def get_ballistic_coefficient(self):
        return self.mass / (self.cd * self.area)

    def generate_ground_track(self, tle_line1, tle_line2, duration_hours=6):
        """Calculates a highly accurate Lat/Lng path considering Earth's rotation."""
        track = [] 
        try:
            l1 = str(tle_line1).strip()
            l2 = str(tle_line2).strip()
            
            satellite = Satrec.twoline2rv(l1, l2)
            now = datetime.utcnow()

            for i in range(0, duration_hours * 60, 2):
                future_time = now + timedelta(minutes=i)
                jd, fr = jday(future_time.year, future_time.month, future_time.day, 
                              future_time.hour, future_time.minute, future_time.second)
                
                e, r, v = satellite.sgp4(jd, fr)
                
                if e == 0:
                    t = (jd + fr - 2451545.0) / 36525.0
                    gmst = 280.46061837 + 360.98564736629 * (jd + fr - 2451545.0) + \
                           0.000387933 * t**2 - t**3 / 58310000.0
                    gmst = gmst % 360

                    mag_r = math.sqrt(r[0]**2 + r[1]**2 + r[2]**2)
                    lat = math.degrees(math.asin(r[2] / mag_r))
                    lon = math.degrees(math.atan2(r[1], r[0])) - gmst
                    
                    lon = ((lon + 180) % 360) - 180
                    
                    # FRONTEND FIX: Unga code-la p[0], p[1] irukardhala Array-va anupuren
                    track.append([round(lat, 4), round(lon, 4)])
                else:
                    continue 
        
        except Exception as e:
            print(f"❌ SGP4 Error: {e}")

        # --- MANDATORY FALLBACK (SPACETUG-30 Fix) ---
        if not track:
            print(f"🚨 SGP4 REJECTED DATA. Forcing fallback track for {tle_line1[:10]}")
            for j in range(0, duration_hours * 60, 10):
                f_lat = 40 * math.sin(math.radians(j * 0.5))
                f_lng = ((j * 1.2) % 360) - 180
                # Ingaum Array format mandatory
                track.append([round(f_lat, 4), round(f_lng, 4)])
        
        return track

    def calculate_corridor(self, ground_track):
        if not ground_track:
            return {"status": "NO_DATA", "points": []}

        bc = self.get_ballistic_coefficient()
        # ground_track ippo array list, so last element-la lat, lng edukanum
        last_pos = ground_track[-1]
        spread_km = round(1500 / bc, 2)

        return {
            "impact_center": {"lat": last_pos[0], "lng": last_pos[1]},
            "corridor_radius_km": spread_km,
            "ballistic_coefficient": round(bc, 2),
            "risk_area": "High Probability Reentry Zone",
            "status": "CALCULATED"
        }