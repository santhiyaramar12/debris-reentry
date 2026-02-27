#!/usr/bin/env python3

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from sgp4.api import Satrec, jday
import requests
import time
import os

# ============================================================================
# CONSTANTS
# ============================================================================

MU = 398600.4418  # Earth's gravitational parameter (km³/s²)
R_EARTH = 6371.0  # Earth's mean radius (km)
EARTH_ROTATION_RATE = 15.04  # degrees per hour

# Atmospheric parameters (US Standard Atmosphere 1976)
ATMOSPHERE_DATA = {
    200: {'rho0': 2.541e-10, 'H': 58.5},
    250: {'rho0': 6.073e-11, 'H': 60.8},
    300: {'rho0': 1.916e-11, 'H': 63.8},
    350: {'rho0': 7.014e-12, 'H': 71.0},
    400: {'rho0': 2.803e-12, 'H': 88.7},
    450: {'rho0': 8.152e-13, 'H': 124.6},
    500: {'rho0': 2.438e-13, 'H': 181.0}
}

REENTRY_ALTITUDE = 80.0  # km
DRAG_COEFFICIENT = 2.2
Q_FACTOR = 1.0
UNCERTAINTY_PERCENT = 0.25  # ±25%

GLOBAL_CASUALTY_THRESHOLD = 1/10000
HUMAN_CROSS_SECTION = 0.36  # m²


# ============================================================================
# FEATURE 1: TLE FILE PARSER
# ============================================================================

class TLEParser:
    """Parse TLE files in various formats"""
    
    @staticmethod
    def parse_tle_file(filepath):
        """
        Parse TLE file and extract satellite data
        
        Supports:
        - 3-line format (name + 2 TLE lines)
        - 2-line format (just TLE lines)
        - Multiple satellites in one file
        """
        satellites = []
        print(f"\n📄 Reading TLE file: {filepath}")
        
        with open(filepath, 'r') as f:
            lines = [line.strip() for line in f.readlines() if line.strip()]
        
        i = 0
        while i < len(lines):
            if lines[i].startswith('1 '):
                # 2-line format
                if i + 1 < len(lines) and lines[i+1].startswith('2 '):
                    satellites.append({
                        'name': f'Satellite_{len(satellites)+1}',
                        'line1': lines[i],
                        'line2': lines[i+1]
                    })
                    i += 2
            else:
                # 3-line format
                if i + 2 < len(lines) and lines[i+1].startswith('1 ') and lines[i+2].startswith('2 '):
                    satellites.append({
                        'name': lines[i],
                        'line1': lines[i+1],
                        'line2': lines[i+2]
                    })
                    i += 3
                else:
                    i += 1
        
        print(f"✓ Parsed {len(satellites)} satellite(s)")
        for sat in satellites:
            print(f"  • {sat['name']}")
        
        return satellites
    
    @staticmethod
    def save_tle_to_file(satellite_name, line1, line2, filepath='satellite.tle'):
        """Save TLE to file in 3-line format"""
        with open(filepath, 'w') as f:
            f.write(f"{satellite_name}\n")
            f.write(f"{line1}\n")
            f.write(f"{line2}\n")
        print(f"✓ TLE saved to: {filepath}")
    
    @staticmethod
    def create_example_file():
        """Create example TLE file for testing"""
        content = """ISS (ZARYA)
1 25544U 98067A   26038.50000000  .00002182  00000-0  41420-4 0  9990
2 25544  51.6461 208.9163 0006703 356.8499 326.8013 15.48919393 12345
"""
        with open('example.tle', 'w') as f:
            f.write(content)
        print("✓ Created example.tle")
        return 'example.tle'


# ============================================================================
# FEATURE 2: CELESTRAK API
# ============================================================================

class CelesTrakAPI:
    """Download TLEs from CelesTrak.org (NO LOGIN REQUIRED!)"""
    
    BASE_URL = 'https://celestrak.org/NORAD/elements/gp.php'
    
    GROUPS = {
        'stations': 'Space Stations',
        'starlink': 'Starlink Satellites',
        'weather': 'Weather Satellites',
        'active': 'Active Satellites',
        'debris': 'Space Debris',
        'geo': 'Geostationary',
        'gps-ops': 'GPS Operational'
    }
    
    def __init__(self):
        print("✓ CelesTrak API initialized (no authentication needed!)")
    
    def list_groups(self):
        """List available satellite groups"""
        print("\n📡 Available Satellite Groups:")
        print("-" * 50)
        for group_id, group_name in self.GROUPS.items():
            print(f"  • {group_id:12} → {group_name}")
        return self.GROUPS
    
    def get_tle_by_norad_id(self, norad_id):
        """
        Get TLE by NORAD catalog number
        
        Common NORAD IDs:
        - ISS: 25544
        - Hubble: 20580
        - Tiangong: 48274
        """
        print(f"\n🔍 Downloading TLE for NORAD ID: {norad_id}")
        try:
            url = f'{self.BASE_URL}?CATNR={norad_id}&FORMAT=tle'
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200 and response.text.strip():
                lines = response.text.strip().split('\n')
                
                if len(lines) >= 3:
                    tle = {
                        'name': lines[0].strip(),
                        'line1': lines[1].strip(),
                        'line2': lines[2].strip()
                    }
                    print(f"✓ Found: {tle['name']}")
                    print(f"  Line 1: {tle['line1'][:50]}...")
                    print(f"  Line 2: {tle['line2'][:50]}...")
                    return tle
            
            print("✗ Satellite not found")
            return None
            
        except Exception as e:
            print(f"✗ Error: {e}")
            return None
    
    def get_satellite_group(self, group='stations'):
        """Download TLEs for entire satellite group"""
        print(f"\n🌐 Downloading satellite group: {self.GROUPS.get(group, group)}")
        try:
            url = f'{self.BASE_URL}?GROUP={group}&FORMAT=tle'
            response = requests.get(url, timeout=15)
            
            if response.status_code == 200:
                lines = response.text.strip().split('\n')
                satellites = []
                
                for i in range(0, len(lines), 3):
                    if i + 2 < len(lines):
                        satellites.append({
                            'name': lines[i].strip(),
                            'line1': lines[i+1].strip(),
                            'line2': lines[i+2].strip()
                        })
                
                print(f"✓ Downloaded {len(satellites)} satellites")
                return satellites
            
            print(f"✗ Download failed: HTTP {response.status_code}")
            return []
            
        except Exception as e:
            print(f"✗ Error: {e}")
            return []
    
    def save_to_file(self, satellites, filepath='celestrak_tles.tle'):
        """Save downloaded TLEs to file"""
        with open(filepath, 'w') as f:
            for sat in satellites:
                f.write(f"{sat['name']}\n")
                f.write(f"{sat['line1']}\n")
                f.write(f"{sat['line2']}\n")
        print(f"✓ Saved {len(satellites)} TLEs to: {filepath}")


# ============================================================================
# FEATURE 3: REAL-TIME TRACKER
# ============================================================================

class RealTimeTracker:
    """Real-time satellite position tracking and visualization"""
    
    def __init__(self, tle_line1, tle_line2, satellite_name='Satellite'):
        """Initialize tracker with TLE data"""
        self.sat = Satrec.twoline2rv(tle_line1, tle_line2)
        self.name = satellite_name
        self.MU = 398600.4418
        self.R_EARTH = 6371.0
        print(f"✓ Real-time tracker initialized for: {satellite_name}")
    
    def get_position_now(self):
        """Get current satellite position"""
        dt = datetime.utcnow()
        jd, fr = jday(dt.year, dt.month, dt.day, 
                     dt.hour, dt.minute, dt.second)
        
        error, r, v = self.sat.sgp4(jd, fr)
        
        if error != 0:
            return {'error': error, 'time': dt}
        
        r_mag = np.linalg.norm(r)
        v_mag = np.linalg.norm(v)
        altitude = r_mag - self.R_EARTH
        
        x, y, z = r
        lat = np.degrees(np.arctan2(z, np.sqrt(x**2 + y**2)))
        lon = np.degrees(np.arctan2(y, x))
        
        semi_major_axis = 1 / ((2 / r_mag) - (v_mag**2 / self.MU))
        
        return {
            'time': dt,
            'altitude_km': float(altitude),
            'latitude': float(lat),
            'longitude': float(lon),
            'speed_km_s': float(v_mag),
            'position_km': np.array(r),
            'velocity_km_s': np.array(v),
            'semi_major_axis_km': float(semi_major_axis)
        }
    
    def display_current_status(self):
        """Display detailed current status"""
        pos = self.get_position_now()
        
        if 'error' in pos:
            print(f"✗ SGP4 error: {pos['error']}")
            return
        
        print(f"\n{'='*70}")
        print(f"🛰️  CURRENT STATUS: {self.name}")
        print(f"{'='*70}")
        print(f"⏰ Time: {pos['time'].strftime('%Y-%m-%d %H:%M:%S')} UTC")
        print(f"\n📍 Position:")
        print(f"  • Altitude:  {pos['altitude_km']:.2f} km")
        print(f"  • Latitude:  {pos['latitude']:.4f}°")
        print(f"  • Longitude: {pos['longitude']:.4f}°")
        print(f"\n🚀 Velocity:")
        print(f"  • Speed: {pos['speed_km_s']:.4f} km/s ({pos['speed_km_s']*3600:.1f} km/h)")
        print(f"\n🌍 Orbital:")
        print(f"  • Semi-major axis: {pos['semi_major_axis_km']:.2f} km")
        print(f"{'='*70}\n")
    
    def track_live(self, duration_minutes=5, update_interval_seconds=10):
        """Track satellite live with real-time updates"""
        print(f"\n{'='*70}")
        print(f"🛰️  LIVE TRACKING: {self.name}")
        print(f"{'='*70}")
        print(f"Duration: {duration_minutes} min | Update every: {update_interval_seconds}s")
        print("Press Ctrl+C to stop\n")
        
        start_time = datetime.utcnow()
        end_time = start_time + timedelta(minutes=duration_minutes)
        positions = []
        
        try:
            while datetime.utcnow() < end_time:
                pos = self.get_position_now()
                
                if 'error' not in pos:
                    positions.append(pos)
                    remaining = (end_time - datetime.utcnow()).total_seconds()
                    
                    print(f"⏱️  {pos['time'].strftime('%H:%M:%S')} UTC | "
                          f"Alt: {pos['altitude_km']:7.2f} km | "
                          f"Lat: {pos['latitude']:7.2f}° | "
                          f"Lon: {pos['longitude']:8.2f}° | "
                          f"Speed: {pos['speed_km_s']:.3f} km/s | "
                          f"Left: {int(remaining)}s    ",
                          end='\r', flush=True)
                
                time.sleep(update_interval_seconds)
            
            print(f"\n\n✓ Tracking complete! Collected {len(positions)} position updates")
            return positions
            
        except KeyboardInterrupt:
            print(f"\n\n⚠️  Tracking stopped by user ({len(positions)} updates collected)")
            return positions


# ============================================================================
# ORBITAL MECHANICS FUNCTIONS
# ============================================================================

def calculate_apogee_perigee(a, e):
    """Calculate apogee and perigee heights"""
    h_apogee = a * (1 + e) - R_EARTH
    h_perigee = a * (1 - e) - R_EARTH
    return float(h_apogee), float(h_perigee)


def calculate_orbital_period(a):
    """Calculate orbital period"""
    T_seconds = 2 * np.pi * np.sqrt((a * 1000) ** 3 / (MU * 1e9))
    T_minutes = T_seconds / 60
    return float(T_minutes)


def get_atmospheric_density(altitude_km):
    """Calculate atmospheric density using exponential model"""
    altitudes = sorted(ATMOSPHERE_DATA.keys())
    
    h0 = altitudes[0]
    for alt in altitudes:
        if alt <= altitude_km:
            h0 = alt
        else:
            break
    
    rho0 = ATMOSPHERE_DATA[h0]['rho0']
    H = ATMOSPHERE_DATA[h0]['H']
    
    rho = rho0 * np.exp(-(altitude_km - h0) / H)
    return float(rho)


def calculate_cross_sectional_area(diameter, length, shape='cylinder'):
    """Calculate effective cross-sectional area for tumbling satellite"""
    if shape == 'cylinder':
        A_circular = np.pi * (diameter / 2) ** 2
        A_rectangular = diameter * length
        A_avg = (A_circular + A_rectangular) / 2
        return float(A_avg)
    else:
        raise ValueError(f"Shape '{shape}' not implemented")


def calculate_ballistic_coefficient(C_D, A, m, Q=1.0):
    """Calculate ballistic coefficient"""
    B = Q * C_D * (A / m)
    return float(B)


def eccentricity_correction_factor(e):
    """Calculate eccentricity correction factor F(e)"""
    F_e = 1 + (3 * e**2) / 4
    return float(F_e)


def calculate_decay_per_revolution(a, rho_p, B, e):
    """Calculate orbital decay per revolution (King-Hele model)"""
    a_meters = a * 1000
    F_e = eccentricity_correction_factor(e)
    delta_a = -2 * np.pi * (a_meters ** 2) * rho_p * B * F_e
    delta_a_km = delta_a / 1000
    return float(delta_a_km)


def refine_ballistic_coefficient_from_observations(delta_a_observed, a, rho_p, e, N_rev):
    """Back-calculate ballistic coefficient from observed decay (Kalman filter)"""
    a_meters = a * 1000
    F_e = eccentricity_correction_factor(e)
    denominator = 2 * np.pi * (a_meters ** 2) * rho_p * F_e * N_rev
    B_refined = abs(delta_a_observed * 1000) / denominator
    return float(B_refined)


def predict_reentry_time(current_a, current_e, B, rho_p, orbital_period_minutes):
    """Predict time to reentry"""
    h_p_current = current_a * (1 - current_e) - R_EARTH
    a_reentry = R_EARTH + REENTRY_ALTITUDE
    delta_a_total = current_a - a_reentry
    decay_per_rev = calculate_decay_per_revolution(current_a, rho_p, B, current_e)
    N_revolutions = delta_a_total / abs(decay_per_rev)
    
    time_minutes = N_revolutions * orbital_period_minutes
    time_hours = time_minutes / 60
    time_days = time_hours / 24
    uncertainty_days = time_days * UNCERTAINTY_PERCENT
    
    return {
        'nominal_days': float(time_days),
        'nominal_hours': float(time_hours),
        'nominal_minutes': float(time_minutes),
        'revolutions': float(N_revolutions),
        'decay_per_rev_km': float(decay_per_rev),
        'lower_bound_days': float(time_days - uncertainty_days),
        'upper_bound_days': float(time_days + uncertainty_days),
        'uncertainty_window_days': float(2 * uncertainty_days),
        'uncertainty_percent': float(UNCERTAINTY_PERCENT * 100)
    }


def monte_carlo_reentry(current, B_nominal, n_runs=500):
    """Monte Carlo simulation for reentry time uncertainty"""
    reentry_days = []
    
    for _ in range(n_runs):
        B_rand = np.random.normal(B_nominal, 0.3 * B_nominal)
        rho_rand = np.random.normal(
            current['density_at_perigee_kg_m3'],
            0.5 * current['density_at_perigee_kg_m3']
        )
        
        if B_rand <= 0 or rho_rand <= 0:
            continue
        
        result = predict_reentry_time(
            current['semi_major_axis_km'],
            current['eccentricity'],
            float(B_rand),
            float(rho_rand),
            current['orbital_period_min']
        )
        
        reentry_days.append(result['nominal_days'])
    
    return np.array(reentry_days)


def calculate_regional_passes(total_orbits, region_lat_range, region_lon_range, satellite_inclination):
    """Calculate approximate number of passes over a region"""
    lat_min, lat_max = region_lat_range
    lon_min, lon_max = region_lon_range
    lon_coverage = (lon_max - lon_min) / 360
    passes = int(total_orbits * lon_coverage)
    return passes


def get_cross_track_swath(days_before_reentry):
    """Get cross-track swath width based on days before reentry"""
    if days_before_reentry > 3:
        return 200
    elif days_before_reentry > 1:
        return 120
    else:
        return 90


def estimate_surviving_debris(total_mass_kg, satellite_type='small'):
    """Estimate debris that survives reentry"""
    survival_fractions = {
        'small': 0.15,
        'medium': 0.25,
        'large': 0.30
    }
    
    survival_fraction = survival_fractions.get(satellite_type, 0.20)
    surviving_mass = total_mass_kg * survival_fraction
    
    if total_mass_kg < 500:
        n_fragments = 8
    elif total_mass_kg < 2000:
        n_fragments = 15
    else:
        n_fragments = 25
    
    avg_fragment_mass = surviving_mass / n_fragments
    
    return {
        'surviving_mass_kg': float(surviving_mass),
        'survival_fraction': float(survival_fraction),
        'n_fragments': n_fragments,
        'avg_fragment_mass_kg': float(avg_fragment_mass),
        'largest_fragment_kg': float(avg_fragment_mass * 2.5),
        'smallest_hazardous_kg': 0.5
    }


def calculate_casualty_area(debris_info):
    """Calculate total debris casualty area"""
    n_fragments = debris_info['n_fragments']
    avg_fragment_area = 0.2
    A_C = n_fragments * (HUMAN_CROSS_SECTION + avg_fragment_area)
    return float(A_C)


def calculate_casualty_expectancy(A_C, population_density=60):
    """Calculate casualty expectancy"""
    A_C_km2 = A_C * 1e-6
    E_C = A_C_km2 * population_density
    
    if E_C > 0:
        ratio = int(1 / E_C)
    else:
        ratio = float('inf')
    
    return {
        'expectancy': float(E_C),
        'ratio': ratio,
        'exceeds_safety_threshold': E_C > GLOBAL_CASUALTY_THRESHOLD,
        'safety_threshold': float(GLOBAL_CASUALTY_THRESHOLD),
        'safety_threshold_ratio': int(1 / GLOBAL_CASUALTY_THRESHOLD)
    }


# ============================================================================
# VISUALIZATION FUNCTIONS
# ============================================================================

def plot_orbital_decay(tle_df):
    """Plot orbital decay over time"""
    plt.figure(figsize=(10, 6))
    plt.plot(tle_df['day'], tle_df['semi_major_axis_km'], marker='o', linewidth=2)
    plt.xlabel("Time (Days)", fontweight='bold')
    plt.ylabel("Semi-Major Axis (km)", fontweight='bold')
    plt.title("Orbital Decay Due to Atmospheric Drag", fontweight='bold', fontsize=14)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()


def plot_perigee_decay(tle_df):
    """Plot perigee height decay"""
    plt.figure(figsize=(10, 6))
    plt.plot(tle_df['day'], tle_df['perigee_height_km'], marker='s', linewidth=2, color='#F46036')
    plt.xlabel("Time (Days)", fontweight='bold')
    plt.ylabel("Perigee Height (km)", fontweight='bold')
    plt.title("Perigee Altitude Decay", fontweight='bold', fontsize=14)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()


# ============================================================================
# MAIN REENTRY PREDICTOR CLASS
# ============================================================================

class ReentryPredictor:
    """Complete reentry prediction system"""
    
    def __init__(self, satellite_params, tle_history):
        """Initialize predictor"""
        self.sat = satellite_params
        self.tle_history = tle_history
        
        # SGP4 satellite object
        self.sgp4_sat = Satrec.twoline2rv(
            self.sat['tle_line1'],
            self.sat['tle_line2']
        )
        
        # Cross-sectional area
        self.area = calculate_cross_sectional_area(
            self.sat['diameter'],
            self.sat['length'],
            self.sat['shape']
        )
        
        # Initial ballistic coefficient
        self.B_initial = calculate_ballistic_coefficient(
            DRAG_COEFFICIENT,
            self.area,
            self.sat['mass']
        )
        
        print(f"\n{'='*70}")
        print(f"Satellite: {self.sat.get('name', 'Unknown')}")
        print(f"Mass: {self.sat['mass']} kg")
        print(f"Cross-sectional area: {self.area:.4f} m²")
        print(f"Initial ballistic coefficient: {self.B_initial:.6f} m²/kg")
        print(f"{'='*70}\n")
    
    def process_tle_history(self):
        """Process TLE history using SGP4 propagation"""
        results = []
        
        print("Processing TLE history with SGP4...")
        
        for tle in self.tle_history:
            # SGP4 propagation
            jd0, fr = jday(2026, 1, 1, 0, 0, 0)
            jd = jd0 + tle['day']
            
            error, r, v = self.sgp4_sat.sgp4(jd, fr)
            
            if error != 0:
                print(f"  ⚠️  SGP4 error at day {tle['day']}: code {error}")
                continue
            
            r_mag = np.linalg.norm(r)
            v_mag = np.linalg.norm(v)
            
            # Semi-major axis from vis-viva equation
            a = 1 / ((2 / r_mag) - (v_mag**2 / MU))
            
            # Calculate apogee and perigee
            h_a, h_p = calculate_apogee_perigee(float(a), tle['eccentricity'])
            
            # Calculate orbital period
            T = calculate_orbital_period(float(a))
            
            # Get atmospheric density at perigee
            rho_p = get_atmospheric_density(float(h_p))
            
            results.append({
                'day': tle['day'],
                'eccentricity': tle['eccentricity'],
                'semi_major_axis_km': float(a),
                'apogee_height_km': float(h_a),
                'perigee_height_km': float(h_p),
                'orbital_period_min': float(T),
                'density_at_perigee_kg_m3': float(rho_p)
            })
        
        self.processed_tles = pd.DataFrame(results)
        print(f"✓ Processed {len(self.processed_tles)} TLE points\n")
        return self.processed_tles
    
    def refine_ballistic_coefficient(self):
        """Refine ballistic coefficient from observed decay (Kalman filter)"""
        if len(self.processed_tles) < 2:
            print("⚠️  Need at least 2 TLEs to refine B")
            self.B_refined = self.B_initial
            return self.B_refined
        
        tle_earlier = self.processed_tles.iloc[-2]
        tle_current = self.processed_tles.iloc[-1]
        
        delta_a_observed = float(tle_current['semi_major_axis_km'] - tle_earlier['semi_major_axis_km'])
        delta_days = float(tle_current['day'] - tle_earlier['day'])
        
        N_rev = (delta_days * 24 * 60) / float(tle_current['orbital_period_min'])
        
        self.B_refined = refine_ballistic_coefficient_from_observations(
            delta_a_observed,
            float(tle_current['semi_major_axis_km']),
            float(tle_current['density_at_perigee_kg_m3']),
            float(tle_current['eccentricity']),
            float(N_rev)
        )
        
        print(f"{'='*70}")
        print("BALLISTIC COEFFICIENT REFINEMENT (Kalman Filter)")
        print(f"{'='*70}")
        print(f"Initial B:  {self.B_initial:.6f} m²/kg")
        print(f"Refined B:  {self.B_refined:.6f} m²/kg")
        print(f"Observed decay: {delta_a_observed:.3f} km over {delta_days:.1f} days")
        print(f"Revolutions: {N_rev:.1f}")
        print(f"{'='*70}\n")
        
        return self.B_refined
    
    def predict_reentry(self):
        """Predict reentry time and uncertainty window"""
        current = self.processed_tles.iloc[-1]
        B = getattr(self, 'B_refined', self.B_initial)
        
        self.prediction = predict_reentry_time(
            float(current['semi_major_axis_km']),
            float(current['eccentricity']),
            float(B),
            float(current['density_at_perigee_kg_m3']),
            float(current['orbital_period_min'])
        )
        
        self.prediction['current_day'] = float(current['day'])
        self.prediction['reentry_day_nominal'] = float(current['day'] + self.prediction['nominal_days'])
        self.prediction['reentry_day_lower'] = float(current['day'] + self.prediction['lower_bound_days'])
        self.prediction['reentry_day_upper'] = float(current['day'] + self.prediction['upper_bound_days'])
        
        # Ground track parameters
        orbital_period_hours = float(current['orbital_period_min']) / 60
        self.prediction['ground_track_shift_deg'] = float(EARTH_ROTATION_RATE * orbital_period_hours)
        
        window_minutes = self.prediction['uncertainty_window_days'] * 24 * 60
        self.prediction['total_orbits_in_window'] = int(window_minutes / float(current['orbital_period_min']))
        
        print(f"{'='*70}")
        print("REENTRY PREDICTION RESULTS")
        print(f"{'='*70}")
        print(f"\n📍 Current Status (Day {current['day']:.1f}):")
        print(f"  • Semi-major axis: {current['semi_major_axis_km']:.2f} km")
        print(f"  • Perigee height: {current['perigee_height_km']:.2f} km")
        print(f"  • Apogee height: {current['apogee_height_km']:.2f} km")
        print(f"  • Orbital period: {current['orbital_period_min']:.2f} minutes")
        
        print(f"\n⚙️  Decay Parameters:")
        print(f"  • Decay rate: {self.prediction['decay_per_rev_km']:.3f} km/revolution")
        print(f"  • Revolutions to reentry: {self.prediction['revolutions']:.0f}")
        
        print(f"\n🎯 Reentry Prediction:")
        print(f"  • Nominal: Day {self.prediction['reentry_day_nominal']:.1f} ({self.prediction['nominal_days']:.1f} days from now)")
        print(f"  • Uncertainty: ±{self.prediction['uncertainty_percent']:.0f}%")
        print(f"  • Lower bound: Day {self.prediction['reentry_day_lower']:.1f}")
        print(f"  • Upper bound: Day {self.prediction['reentry_day_upper']:.1f}")
        print(f"  • Window width: {self.prediction['uncertainty_window_days']:.1f} days")
        
        print(f"\n🌍 Ground Track:")
        print(f"  • Westward shift per orbit: {self.prediction['ground_track_shift_deg']:.2f}°")
        print(f"  • Total orbits in window: {self.prediction['total_orbits_in_window']}")
        print(f"{'='*70}\n")
        
        return self.prediction
    
    def run_monte_carlo(self, n_runs=500):
        """Run Monte Carlo simulation"""
        current = self.processed_tles.iloc[-1]
        B_nominal = getattr(self, 'B_refined', self.B_initial)
        
        print(f"{'='*70}")
        print("MONTE CARLO UNCERTAINTY ANALYSIS")
        print(f"{'='*70}")
        print(f"Running {n_runs} simulations...")
        
        samples = monte_carlo_reentry(current, float(B_nominal), n_runs)
        
        if len(samples) == 0:
            print("✗ Monte Carlo failed")
            return None
        
        mean_day = float(np.mean(samples))
        lower = float(np.percentile(samples, 5))
        upper = float(np.percentile(samples, 95))
        
        print(f"\n✓ Simulations complete:")
        print(f"  • Valid samples: {len(samples)}")
        print(f"  • Mean reentry time: {mean_day:.1f} days")
        print(f"  • 90% confidence window: {lower:.1f} – {upper:.1f} days")
        print(f"  • Window width: {upper - lower:.1f} days")
        print(f"{'='*70}\n")
        
        # Plot distribution
        plt.figure(figsize=(10, 6))
        plt.hist(samples, bins=30, color='#2CA58D', edgecolor='black', alpha=0.7)
        plt.axvline(mean_day, color='red', linestyle='--', linewidth=2, label=f'Mean: {mean_day:.1f} days')
        plt.axvline(lower, color='orange', linestyle='--', linewidth=2, label=f'5th percentile: {lower:.1f} days')
        plt.axvline(upper, color='orange', linestyle='--', linewidth=2, label=f'95th percentile: {upper:.1f} days')
        plt.xlabel("Reentry Time (days)", fontweight='bold')
        plt.ylabel("Frequency", fontweight='bold')
        plt.title("Monte Carlo Reentry Time Distribution", fontweight='bold', fontsize=14)
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.show()
        
        return {
            'mean_days': mean_day,
            'lower_90': lower,
            'upper_90': upper
        }
    
    def assess_regional_risk(self, region_name, lat_range, lon_range, inclination=46):
        """Assess risk for specific region"""
        total_orbits = self.prediction['total_orbits_in_window']
        
        n_passes = calculate_regional_passes(
            total_orbits,
            lat_range,
            lon_range,
            inclination
        )
        
        days_before = self.prediction['nominal_days']
        swath_km = get_cross_track_swath(days_before)
        
        print(f"{'='*70}")
        print(f"REGIONAL RISK ASSESSMENT: {region_name}")
        print(f"{'='*70}")
        print(f"📍 Geographic bounds:")
        print(f"  • Latitude: {lat_range[0]}°N to {lat_range[1]}°N")
        print(f"  • Longitude: {lon_range[0]}°E to {lon_range[1]}°E")
        print(f"\n⚠️  Passes over {region_name}:")
        print(f"  • Approximate passes: ~{n_passes}")
        print(f"  • Risk window per pass: 40 minutes (±20 min)")
        print(f"  • Airspace altitude: 0-15 km")
        print(f"  • Cross-track swath: ±{swath_km} km")
        print(f"\n📅 Timeline:")
        print(f"  • First potential pass: Day {self.prediction['reentry_day_lower']:.1f}")
        print(f"  • Last potential pass: Day {self.prediction['reentry_day_upper']:.1f}")
        print(f"{'='*70}\n")
        
        return {
            'region': region_name,
            'n_passes': n_passes,
            'risk_window_minutes': 40,
            'swath_km': swath_km
        }
    
    def assess_casualty_risk(self, satellite_type='small', population_density=60):
        """Assess casualty risk from debris"""
        debris = estimate_surviving_debris(self.sat['mass'], satellite_type)
        A_C = calculate_casualty_area(debris)
        casualty = calculate_casualty_expectancy(A_C, population_density)
        
        print(f"{'='*70}")
        print("CASUALTY RISK ASSESSMENT")
        print(f"{'='*70}")
        print(f"\n☢️  Debris Survivability:")
        print(f"  • Total mass: {self.sat['mass']} kg")
        print(f"  • Surviving mass: ~{debris['surviving_mass_kg']:.1f} kg ({debris['survival_fraction']*100:.0f}%)")
        print(f"  • Number of fragments: ~{debris['n_fragments']}")
        print(f"  • Average fragment mass: {debris['avg_fragment_mass_kg']:.1f} kg")
        print(f"  • Largest fragment: ~{debris['largest_fragment_kg']:.1f} kg")
        
        print(f"\n⚠️  Casualty Risk:")
        print(f"  • Total casualty area (Aᴄ): {A_C:.2f} m²")
        print(f"  • Population density: {population_density} people/km²")
        print(f"  • Casualty expectancy (Eᴄ): {casualty['expectancy']:.2e}")
        print(f"  • Risk ratio: 1:{casualty['ratio']:,}")
        print(f"  • Safety threshold: 1:{casualty['safety_threshold_ratio']:,}")
        
        if casualty['exceeds_safety_threshold']:
            print(f"\n  ⚠️  Status: EXCEEDS SAFETY THRESHOLD")
            print(f"  📢 Action: Civil protection notification REQUIRED")
        else:
            print(f"\n  ✓ Status: Within acceptable limits")
        
        print(f"{'='*70}\n")
        
        return {
            'debris': debris,
            'casualty_area_m2': A_C,
            'casualty_expectancy': casualty
        }


# ============================================================================
# USER INPUT FUNCTIONS
# ============================================================================

def get_satellite_input_manual():
    """Get satellite parameters from user (manual input)"""
    print("\n--- MANUAL SATELLITE INPUT ---")
    return {
        'name': input("Satellite name: "),
        'mass': float(input("Mass (kg): ")),
        'diameter': float(input("Diameter (m): ")),
        'length': float(input("Length (m): ")),
        'shape': 'cylinder',
        'tle_line1': input("TLE Line 1: "),
        'tle_line2': input("TLE Line 2: ")
    }


def get_tle_input_manual():
    """Get TLE history from user (manual input)"""
    print("\n--- TLE HISTORY INPUT ---")
    n = int(input("Number of TLE points: "))
    tles = []
    
    for i in range(n):
        print(f"\nTLE Point {i+1}:")
        tles.append({
            'day': float(input("  Day (from epoch): ")),
            'eccentricity': float(input("  Eccentricity: "))
        })
    
    return tles


def demo_mode():
    """Run demonstration with ISS"""
    print("\n" + "="*70)
    print("DEMONSTRATION MODE")
    print("="*70)
    print("\nDownloading ISS data from CelesTrak...")
    
    # Get ISS from CelesTrak
    api = CelesTrakAPI()
    iss = api.get_tle_by_norad_id(25544)
    
    if not iss:
        print("✗ Could not download ISS data")
        return None, None
    
    # Save to file
    parser = TLEParser()
    parser.save_tle_to_file(iss['name'], iss['line1'], iss['line2'], 'iss_demo.tle')
    
    # Satellite parameters (estimates for ISS)
    satellite_params = {
        'name': iss['name'],
        'mass': 420000,  # kg
        'diameter': 73,  # m
        'length': 109,  # m
        'shape': 'cylinder',
        'tle_line1': iss['line1'],
        'tle_line2': iss['line2']
    }
    
    # TLE history (example - normally you'd collect this over time)
    tle_history = [
        {'day': 0, 'eccentricity': 0.0006703},
        {'day': 5, 'eccentricity': 0.0006650},
        {'day': 10, 'eccentricity': 0.0006600}
    ]
    
    return satellite_params, tle_history