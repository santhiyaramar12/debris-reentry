import sys
import os
import requests  # type: ignore
import math
import jwt  # type: ignore
import json
from typing import Any
from flask import Flask, jsonify, request, Response  # type: ignore
from flask_cors import CORS  # type: ignore
from pymongo import MongoClient  # type: ignore
from datetime import datetime, timedelta
from flask_apscheduler import APScheduler  # type: ignore
from sgp4.api import Satrec, jday  # type: ignore
from bson import ObjectId  # type: ignore
from dotenv import load_dotenv  # type: ignore
from werkzeug.security import generate_password_hash, check_password_hash  # type: ignore
from flask_mail import Mail, Message  # type: ignore

# --- AUTH HANDLER IMPORTS ---
from auth_handler import generate_tokens, token_required, supervisor_only, admin_only, SECRET_KEY  # type: ignore

# --- 1. PATH & ENV SETUP ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path: sys.path.append(BASE_DIR)
if os.path.join(BASE_DIR, "engine") not in sys.path: sys.path.append(os.path.join(BASE_DIR, "engine"))

load_dotenv()

# --- 2. LOGIC ENGINES (WITH FAIL-SAFE) ---
class DummyPredictor:
    def __init__(self, *args, **kwargs): pass
    def predict_reentry(self, current_alt=350):
        return {"risk_level": "LOW", "days_left": 365, "status": "DUMMY_MODE"}

class DummyCalculator:
    def __init__(self, *args, **kwargs): pass
    def generate_ground_track(self, *args, **kwargs): return []
    def calculate_corridor(self, *args, **kwargs): return {"status": "NO_ENGINE_LOADED"}

ReentryPredictor, ImpactCalculator = DummyPredictor, DummyCalculator

try:
    from engine.reentry_predictor import ReentryPredictor as RealPredictor  # type: ignore
    from engine.impact_calculator import ImpactCalculator as RealCalculator  # type: ignore
    ReentryPredictor, ImpactCalculator = RealPredictor, RealCalculator
    print("✅ Real-time Physics Engines Loaded Successfully!")
except ImportError as e:
    print(f"⚠️ Engines Error: {e}. Running in Safe Mode.")
except Exception as e:
    print(f"⚠️ Engines Error: {e}. Running in Safe Mode.")


# --- JSON SAFETY: Handle NaN/Infinity ---
class SafeJSONEncoder(json.JSONEncoder):  # type: ignore[type-arg]
    def default(self, obj: Any) -> Any:  # type: ignore[override]
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def sanitize_value(val):
    """Recursively convert NaN/Infinity to None in nested structures."""
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
        return val
    elif isinstance(val, dict):
        return {k: sanitize_value(v) for k, v in val.items()}
    elif isinstance(val, (list, tuple)):
        return [sanitize_value(v) for v in val]
    return val


def safe_jsonify(data, status=200):
    """jsonify wrapper that sanitizes NaN/Infinity."""
    cleaned = sanitize_value(data)
    return jsonify(cleaned), status


app = Flask(__name__)

# --- MAIL CONFIG ---
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv("MAIL_USERNAME")
app.config['MAIL_PASSWORD'] = os.getenv("MAIL_PASSWORD")
mail = Mail(app)

# --- 3. CORS & SCHEDULER ---
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"]}}, supports_credentials=True)

scheduler = APScheduler()

@app.route('/api', methods=['GET', 'OPTIONS'])
def api_root():
    return jsonify({"status": "success", "message": "Mission Control API Online"}), 200

@app.after_request
def after_request(response):
    if 'Access-Control-Allow-Origin' not in response.headers:
        response.headers.add('Access-Control-Allow-Origin', '*')
    if 'Access-Control-Allow-Headers' not in response.headers:
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    if 'Access-Control-Allow-Methods' not in response.headers:
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# --- 4. DATABASE SETUP ---
try:
    mongo_uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db = client["satellite_mission_db"]
    print(f"📊 MongoDB Connected: {db.name}")
except Exception as e:
    print(f"❌ DB Connection Failed: {e}")


# --- 5. HELPER FUNCTIONS ---

def get_altitude_from_tle(l2):
    """
    FIX: Use split() instead of character slicing to correctly extract
    mean motion regardless of spacing inconsistencies from fix_tle_format().
    """
    try:
        parts = l2.strip().split()
        if len(parts) < 8:
            return 350.0

        # FIX: Reliable extraction via split index, not character position
        mean_motion = float(parts[7])

        # Physics constants
        mu = 398600.4418  # Earth's gravitational parameter (km³/s²)
        re = 6371.0       # Earth radius (km)

        # Convert rev/day → rad/s
        n = (mean_motion * 2 * math.pi) / 86400

        # Semi-major axis
        a = (mu / (n ** 2)) ** (1 / 3)
        alt = a - re

        # Guard against invalid results
        if alt < 50 or alt > 2000:
            return 350.0
        return round(alt, 2)
    except Exception:
        return 350.0


def fix_tle_format(line1: Any, line2: Any) -> tuple:
    """
    FIX: Removed the [:69] truncation on the reconstructed line2 which was
    silently corrupting mean motion values. Now builds the string correctly.
    """
    try:
        l1: str = "".join(i for i in str(line1) if i.isprintable()).strip()
        l2_raw: str = "".join(i for i in str(line2) if i.isprintable()).strip()
        p = l2_raw.split()

        if len(p) < 8:
            return str(l1), str(l2_raw)

        cat_id = p[1].rjust(5)
        inc  = f"{float(p[2]):8.4f}"
        raan = f"{float(p[3]):8.4f}"
        ecc  = str(p[4].replace('.', ''))[:7].rjust(7, '0')  # type: ignore
        argp = f"{float(p[5]):8.4f}"
        ma   = f"{float(p[6]):8.4f}"

        # FIX: Preserve full mean motion precision — do NOT truncate
        mm = p[7]

        reconstructed_l2 = f"2 {cat_id} {inc} {raan} {ecc} {argp} {ma} {mm}000010"
        return str(l1), reconstructed_l2

    except Exception:
        return str(line1), str(line2)


def classify_severity(alt: float) -> str:
    """
    Centralised severity classifier — single source of truth used by all routes.
    Thresholds aligned with JSON mean motion values:
      16.2 rev/day → ~85 km  → RED
      15.8 rev/day → ~120 km → YELLOW
      15.5 rev/day → ~145 km → PURPLE
      14.2 rev/day → ~450 km → STABLE
    """
    if alt < 100:
        return "RED"
    elif alt < 125:
        return "YELLOW"
    elif alt < 150:
        return "PURPLE"
    else:
        return "STABLE"


# ============================================================
# 6. AUTHENTICATION ROUTES
# ============================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if db.users.find_one({"username": data['username']}):
            return jsonify({"message": "User already exists"}), 400

        hashed_pw = generate_password_hash(data['password'], method='pbkdf2:sha256')
        db.users.insert_one({
            "name": data.get('name', 'Commander'),
            "username": data['username'],
            "password": hashed_pw,
            "role": data.get('role', 'user'),
            "created_at": datetime.now()
        })
        return jsonify({"status": "success", "message": "Registered successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = db.users.find_one({"username": data['username']})

        if user and check_password_hash(user['password'], data['password']):
            access_t, refresh_t = generate_tokens(user['_id'], user['role'])
            db.refresh_tokens.insert_one({
                "user_id": str(user['_id']),
                "token": refresh_t,
                "created_at": datetime.now()
            })
            return jsonify({
                "status": "success",
                "access_token": access_t,
                "refresh_token": refresh_t,
                "username": user['username'],
                "role": user['role'],
                "name": user.get('name', 'Commander')
            })
        return jsonify({"message": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/auth/refresh', methods=['POST'])
def refresh():
    try:
        data = request.get_json()
        r_token = data.get('refresh_token')
        stored = db.refresh_tokens.find_one({"token": r_token})
        if not stored:
            return jsonify({"message": "Invalid session"}), 401

        decoded = jwt.decode(r_token, SECRET_KEY, algorithms=['HS256'])
        user = db.users.find_one({"_id": ObjectId(decoded['sub'])})
        if not user:
            return jsonify({"message": "User not found"}), 404

        new_access_t, _ = generate_tokens(user['_id'], user['role'])
        return jsonify({"access_token": new_access_t})
    except Exception:
        return jsonify({"message": "Expired"}), 401


# ============================================================
# 7. CORE MISSION ROUTES
# ============================================================

@app.route('/api/alerts', methods=['GET'])
@token_required
def get_global_alerts(current_user):
    try:
        satellites = list(db.mission_control.find({}))
        all_alerts = []

        for sat in satellites:
            l1, l2 = fix_tle_format(sat.get('tle_line1'), sat.get('tle_line2'))
            current_alt = get_altitude_from_tle(l2)

            predictor = ReentryPredictor(sat)
            analysis = predictor.predict_reentry(current_alt=int(current_alt))

            days_left  = float(analysis.get('days_to_reentry', analysis.get('days_left', 99)))
            hours_left = float(days_left * 24)

            # FIX: Use centralised classifier (consistent across all routes)
            severity = classify_severity(current_alt)

            # Re-entry time window
            now = datetime.utcnow()
            reentry_start = now + timedelta(hours=max(0.0, hours_left - 12))
            reentry_end   = now + timedelta(hours=hours_left + 12.0)

            # Orbital elements
            orbital_elements = {}
            try:
                parts = l2.split()
                if len(parts) >= 8:
                    mm = float(parts[7])
                    mu = 398600.4418
                    n_rad = (mm * 2 * math.pi) / 86400
                    a_km = round((mu / (n_rad ** 2)) ** (1 / 3), 2)
                    orbital_elements = {
                        "semi_major_axis_km": a_km,
                        "inclination_deg": float(parts[2]),
                        "mean_motion_rev_day": mm,
                        "epoch": l1[18:32].strip()
                    }
            except Exception:
                pass

            # FIX: alert_data is built INSIDE the loop for every satellite
            alert_data = {
                "name":         sat.get('name', 'Unknown'),
                "norad_id":     sat.get('norad_id'),
                "severity":     severity,
                "altitude":     round(float(current_alt), 2),  # type: ignore
                "lat":          sat.get('lat', 0),
                "lng":          sat.get('lng', 0),
                "days_left":    round(float(days_left), 2),  # type: ignore
                "hours_left":   round(float(hours_left), 1),  # type: ignore
                "tle_line1":    l1,
                "tle_line2":    l2,
                "is_critical":  current_alt < 150,
                "orbital_elements": orbital_elements
            }

            # FIX: Append is also INSIDE the loop — only crisis satellites go to alerts
            if current_alt < 150:
                all_alerts.append(alert_data)

            # Auto-report: only for crisis satellites, avoid duplicates
            if current_alt < 150:
                existing_auto = db.auto_reports.find_one({
                    "norad_id": sat.get('norad_id'),
                    "status": "DRAFT"
                })
                if not existing_auto:
                    db.auto_reports.insert_one({
                        "norad_id":     sat.get('norad_id'),
                        "name":         sat.get('name', 'Unknown'),
                        "altitude":     round(float(current_alt), 2),  # type: ignore
                        "severity":     severity,
                        "generated_at": datetime.utcnow(),
                        "status":       "DRAFT"
                    })

        # Sort most urgent first
        all_alerts.sort(key=lambda x: x.get('days_left', 999))

        return jsonify({
            "status": "success",
            "count":  len(all_alerts),
            "alerts": all_alerts
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/analyze/<norad_id>', methods=['GET'])
@token_required
def analyze(current_user, norad_id):
    try:
        data = db.mission_control.find_one({"norad_id": str(norad_id)}) or \
               db.mission_control.find_one({"norad_id": int(norad_id)})

        now = datetime.utcnow()
        jd, fr = jday(now.year, now.month, now.day, now.hour, now.minute, now.second)

        if not data:
            url = f"https://celestrak.org/NORAD/elements/gp.php?CATNR={norad_id}&FORMAT=TLE"
            res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
            if res.status_code == 200 and res.text.strip():
                lines = res.text.strip().split('\n')
                if len(lines) >= 3:
                    data = {
                        'name':        lines[0].strip(),
                        'tle_line1':   lines[1].strip(),
                        'tle_line2':   lines[2].strip(),
                        'tle_history': [],
                        'mass':        500
                    }
                else:
                    return jsonify({"status": "error", "message": "Invalid TLE"}), 404
            else:
                return jsonify({"status": "error", "message": "NORAD ID Not Found"}), 404

        l1, l2 = fix_tle_format(data.get('tle_line1'), data.get('tle_line2'))
        current_alt = float(get_altitude_from_tle(l2))

        predictor = ReentryPredictor(data)
        analysis_report = predictor.predict_reentry(current_alt=int(current_alt))

        calc = ImpactCalculator(mass=data.get('mass', 500), diameter=2.0, length=5.0)
        ground_track = calc.generate_ground_track(l1, l2)
        corridor = calc.calculate_corridor(ground_track)

        sat_rec = Satrec.twoline2rv(l1, l2)
        e, pos, vel = sat_rec.sgp4(jd, fr)

        days_left  = float(analysis_report.get('days_left', 99))
        hours_left = float(days_left * 24)
        reentry_start = now + timedelta(hours=max(0.0, hours_left - 12))
        reentry_end   = now + timedelta(hours=hours_left + 12.0)

        print(f"✅ Analysis Success: {data.get('name')} | Points: {len(ground_track)} | Risk: {analysis_report.get('risk_level')}")

        response_data = {
            "status": "success",
            "metadata": {
                "name":             data.get('name'),
                "norad_id":         norad_id,
                "altitude":         round(float(current_alt), 2),  # type: ignore
                "threshold_status": analysis_report.get('risk_level')
            },
            "analysis":    analysis_report,
            "impact_data": corridor,
            "map_data": {
                "ground_track": ground_track,
                "path_count":   len(ground_track)
            },
            "state_vectors": {
                "position_km": {
                    "x": round(float(pos[0]), 2),  # type: ignore
                    "y": round(float(pos[1]), 2),  # type: ignore
                    "z": round(float(pos[2]), 2)  # type: ignore
                },
                "velocity_kms": {
                    "vx": round(float(vel[0]), 4),  # type: ignore
                    "vy": round(float(vel[1]), 4),  # type: ignore
                    "vz": round(float(vel[2]), 4)  # type: ignore
                }
            },
            "reentry_window": {
                "start":      reentry_start.isoformat(),
                "end":        reentry_end.isoformat(),
                "hours_left": round(float(hours_left), 1)  # type: ignore
            }
        }
        return safe_jsonify(response_data)
    except Exception as e:
        print(f"❌ Analyze Error: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ============================================================
# 8. USER REPORTS ROUTES
# ============================================================

@app.route('/api/user-reports', methods=['POST'])
@token_required
def submit_user_report(current_user):
    """Users submit re-entry event reports."""
    try:
        data = request.get_json()
        report = {
            "submitted_by":      str(current_user['_id']),
            "submitted_by_name": current_user.get('name', 'Unknown'),
            "description":       data.get('description', ''),
            "location":          data.get('location', ''),
            "proof_url":         data.get('proof_url', ''),
            "proof_type":        data.get('proof_type', 'none'),
            "status":            "PENDING",
            "created_at":        datetime.utcnow(),
            "reviewed_by":       None,
            "reviewed_at":       None
        }
        db.user_reports.insert_one(report)
        return jsonify({"status": "success", "message": "Report submitted"}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/user-reports', methods=['GET'])
@token_required
def get_user_reports(current_user):
    """Get current user's own reports."""
    try:
        reports = list(
            db.user_reports.find({"submitted_by": str(current_user['_id'])}).sort("created_at", -1)
        )
        for r in reports:
            r['_id'] = str(r['_id'])
        return jsonify({"status": "success", "reports": reports})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ============================================================
# 9. ADMIN ROUTES
# ============================================================

@app.route('/api/admin/reports', methods=['GET'])
@token_required
@admin_only
def get_all_reports(current_user):
    """Admin: Get all user submissions + auto-generated reports."""
    try:
        user_reports = list(db.user_reports.find({}).sort("created_at", -1))
        auto_reports = list(db.auto_reports.find({}).sort("generated_at", -1))

        for r in user_reports:
            r['_id'] = str(r['_id'])
        for r in auto_reports:
            r['_id'] = str(r['_id'])

        return jsonify({
            "status":       "success",
            "user_reports": user_reports,
            "auto_reports": auto_reports,
            "total":        len(user_reports) + len(auto_reports)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/admin/reports/<report_id>/review', methods=['PUT'])
@token_required
@admin_only
def review_report(current_user, report_id):
    """Admin: Approve or reject a user submission."""
    try:
        data = request.get_json()
        action = data.get('action', '').upper()

        if action not in ['APPROVE', 'REJECT']:
            return jsonify({"message": "Invalid action. Use APPROVE or REJECT"}), 400

        result = db.user_reports.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {
                "status":       "APPROVED" if action == "APPROVE" else "REJECTED",
                "reviewed_by":  str(current_user['_id']),
                "reviewed_at":  datetime.utcnow(),
                "review_notes": data.get('notes', '')
            }}
        )

        if result.modified_count == 0:
            return jsonify({"message": "Report not found"}), 404

        return jsonify({
            "status":  "success",
            "message": f"Report {action.lower()}d successfully"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/admin/dispatch-report', methods=['POST'])
@token_required
@admin_only
def dispatch_official_report(current_user):
    """Admin: Dispatch an official report for critical items."""
    try:
        data = request.get_json()
        report = {
            "dispatched_by":      str(current_user['_id']),
            "dispatched_by_name": current_user.get('name', 'Admin'),
            "norad_id":           data.get('norad_id'),
            "target_name":        data.get('target_name', 'Unknown'),
            "severity":           data.get('severity', 'CRITICAL'),
            "summary":            data.get('summary', ''),
            "altitude":           data.get('altitude'),
            "dispatched_at":      datetime.utcnow(),
            "type":               "OFFICIAL_DISPATCH",
            "status":             "DISPATCHED"
        }
        result = db.dispatched_reports.insert_one(report)
        return jsonify({
            "status":    "success",
            "message":   "Official report dispatched",
            "report_id": str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/admin/logs', methods=['GET'])
@token_required
@admin_only
def get_admin_logs(current_user):
    """Admin: Get all system activity logs."""
    try:
        user_reports  = list(db.user_reports.find({}).sort("created_at", -1).limit(50))
        auto_reports  = list(db.auto_reports.find({}).sort("generated_at", -1).limit(50))
        dispatched    = list(db.dispatched_reports.find({}).sort("dispatched_at", -1).limit(50))

        for r in user_reports + auto_reports + dispatched:
            r['_id'] = str(r['_id'])

        return jsonify({
            "status":             "success",
            "user_reports":       user_reports,
            "auto_reports":       auto_reports,
            "dispatched_reports": dispatched
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ============================================================
# 10. CELESTRAK LIVE DATA
# ============================================================

@app.route('/api/celestrak-live', methods=['GET'])
@token_required
def get_celestrak_live(current_user):
    """Fetch debris/satellite objects from CelesTrak with live positions."""
    satellites = []

    try:
        url = "https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-1408-debris&FORMAT=tle"
        res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}, timeout=10)

        if res.status_code == 200 and res.text.strip():
            lines = res.text.strip().split('\n')
            now = datetime.utcnow()
            jd_now, fr_now = jday(now.year, now.month, now.day, now.hour, now.minute, now.second)

            count = 0
            for i in range(0, len(lines) - 2, 3):
                if count >= 500:
                    break
                try:
                    name = lines[i].strip()
                    l1   = lines[i + 1].strip()
                    l2   = lines[i + 2].strip()

                    if not l1.startswith('1') or not l2.startswith('2'):
                        continue

                    sat = Satrec.twoline2rv(l1, l2)
                    e, pos, vel = sat.sgp4(jd_now, fr_now)
                    if e != 0:
                        continue

                    r_mag = math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2)
                    alt   = r_mag - 6371.0
                    lat   = math.degrees(math.asin(pos[2] / r_mag))

                    t    = (jd_now + fr_now - 2451545.0) / 36525.0
                    gmst = 280.46061837 + 360.98564736629 * (jd_now + fr_now - 2451545.0) + \
                           0.000387933 * t ** 2 - t ** 3 / 58310000.0
                    gmst = gmst % 360
                    lng  = math.degrees(math.atan2(pos[1], pos[0])) - gmst
                    lng  = ((lng + 180) % 360) - 180

                    norad_id = l1[2:7].strip()

                    satellites.append({
                        "name":      name,
                        "norad_id":  norad_id,
                        "lat":       round(float(lat), 4),  # type: ignore
                        "lng":       round(float(lng), 4),  # type: ignore
                        "alt":       round(float(alt), 2),  # type: ignore
                        "tle_line1": l1,
                        "tle_line2": l2,
                        "is_critical": alt < 150
                    })
                    count = count + 1  # type: ignore
                except Exception:
                    continue

        # Supplement with active satellites if needed
        if len(satellites) < 200:
            try:
                url2 = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
                res2 = requests.get(url2, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}, timeout=10)
                if res2.status_code == 200:
                    lines2 = res2.text.strip().split('\n')
                    now = datetime.utcnow()
                    jd_now, fr_now = jday(now.year, now.month, now.day, now.hour, now.minute, now.second)

                    for i in range(0, min(len(lines2) - 2, 1500), 3):
                        if len(satellites) >= 500:
                            break
                        try:
                            name = lines2[i].strip()
                            l1   = lines2[i + 1].strip()
                            l2   = lines2[i + 2].strip()

                            if not l1.startswith('1') or not l2.startswith('2'):
                                continue

                            sat = Satrec.twoline2rv(l1, l2)
                            e, pos, vel = sat.sgp4(jd_now, fr_now)
                            if e != 0:
                                continue

                            r_mag = math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2)
                            alt   = r_mag - 6371.0
                            lat   = math.degrees(math.asin(pos[2] / r_mag))

                            t    = (jd_now + fr_now - 2451545.0) / 36525.0
                            gmst = 280.46061837 + 360.98564736629 * (jd_now + fr_now - 2451545.0) + \
                                   0.000387933 * t ** 2 - t ** 3 / 58310000.0
                            gmst = gmst % 360
                            lng  = math.degrees(math.atan2(pos[1], pos[0])) - gmst
                            lng  = ((lng + 180) % 360) - 180

                            norad_id = l1[2:7].strip()
                            satellites.append({
                                "name":        name,
                                "norad_id":    norad_id,
                                "lat":         round(float(lat), 4),  # type: ignore
                                "lng":         round(float(lng), 4),  # type: ignore
                                "alt":         round(float(alt), 2),  # type: ignore
                                "tle_line1":   l1,
                                "tle_line2":   l2,
                                "is_critical": alt < 150
                            })
                        except Exception:
                            continue
            except Exception:
                pass

        if len(satellites) >= 30:
            print(f"🛰️ CelesTrak: Fetched {len(satellites)} objects")
            return jsonify({
                "status":     "success",
                "count":      len(satellites),
                "satellites": satellites
            })

    except Exception as e:
        print(f"❌ CelesTrak Error (will use local fallback): {str(e)}")

    # Fallback to local mock data
    try:
        with open('mock_satellites.json', 'r') as f:
            mock_data = json.load(f)

        now = datetime.utcnow()
        jd_now, fr_now = jday(now.year, now.month, now.day, now.hour, now.minute, now.second)

        for sat in mock_data.get('satellites', []):
            try:
                satrec = Satrec.twoline2rv(sat['tle_line1'], sat['tle_line2'])
                e, pos, vel = satrec.sgp4(jd_now, fr_now)
                if e == 0:
                    r_mag = math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2)
                    sat['alt'] = round(float(r_mag - 6371.0), 2)  # type: ignore
                    lat = math.degrees(math.asin(pos[2] / r_mag))
                    t   = (jd_now + fr_now - 2451545.0) / 36525.0
                    gmst = 280.46061837 + 360.98564736629 * (jd_now + fr_now - 2451545.0) + \
                           0.000387933 * t ** 2 - t ** 3 / 58310000.0
                    gmst = gmst % 360
                    lng  = math.degrees(math.atan2(pos[1], pos[0])) - gmst
                    lng  = ((lng + 180) % 360) - 180
                    sat['lat'] = round(float(lat), 4)  # type: ignore
                    sat['lng'] = round(float(lng), 4)  # type: ignore
            except Exception:
                pass

        print(f"🛰️ Local Fallback: Served {len(mock_data['satellites'])} objects")
        return jsonify({
            "status":     "success",
            "count":      len(mock_data['satellites']),
            "satellites": mock_data['satellites']
        })
    except Exception as fallback_err:
        print(f"❌ Fallback Error: {str(fallback_err)}")
        return jsonify({"status": "error", "message": "Failed to load satellite data"}), 500


# ============================================================
# 11. UTILITY ROUTES
# ============================================================

@app.route('/api/send-report', methods=['POST', 'OPTIONS'])
def send_authorized_report():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200
    try:
        data      = request.get_json()
        to_emails = data.get('to', '').split(", ")
        content   = data.get('content', {})

        msg = Message(
            subject=data.get('subject', '🚨 MISSION ALERT'),
            sender=app.config['MAIL_USERNAME'],
            recipients=to_emails,
            html=f"<h2>Mission Intelligence</h2><p>Object: {content.get('target')}</p>"
        )
        mail.send(msg)
        print(f"✅ MAIL SENT SUCCESSFULLY TO: {to_emails}")
        return jsonify({"status": "success", "message": "Email Dispatched"}), 200
    except Exception as e:
        print(f"❌ MAIL ERROR: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/satellites', methods=['GET'])
def get_all_satellites():
    try:
        satellites = list(db.mission_control.find({}))
        result = []

        for sat in satellites:
            l1, l2 = fix_tle_format(sat.get("tle_line1"), sat.get("tle_line2"))
            alt = get_altitude_from_tle(l2)

            predictor = ReentryPredictor(sat)
            analysis  = predictor.predict_reentry(current_alt=int(alt))
            days_left = float(analysis.get("days_left", 99))

            result.append({
                "name":      sat.get("name"),
                "norad_id":  sat.get("norad_id"),
                "altitude":  alt,
                "days_left": round(days_left, 2),  # type: ignore
                "tle_line1": l1,
                "tle_line2": l2
            })

        return jsonify({
            "status":     "success",
            "count":      len(result),
            "satellites": result
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/live-debris', methods=['GET'])
@token_required
def get_live_debris(current_user):
    mock_debris = []
    for i in range(1, 101):
        norad_id = 50000 + i
        mock_debris.append({
            "OBJECT_NAME":  f"DEBRIS-X-{i:03d}",
            "NORAD_CAT_ID": norad_id,
            "TLE_LINE1":    f"1 {norad_id}U 21001A    24048.54166667  .00000123  00000-0  10000-3 0  9990",
            "TLE_LINE2":    f"2 {norad_id}  98.0000 120.0000 0001234  45.1234  55.1234 14.50000000 12345"
        })
    return jsonify(mock_debris)


@app.route('/api/admin/clear_history', methods=['DELETE'])
@token_required
@admin_only
def clear_history(current_user):
    db.refresh_tokens.delete_many({})
    return jsonify({"message": "All session tokens cleared"})


# ============================================================
# 12. STATS & PROFILE ROUTES
# ============================================================

@app.route('/api/stats', methods=['GET'])
@token_required
def get_system_stats(current_user):
    """Return live system statistics from the database."""
    try:
        total_tracked = db.mission_control.count_documents({})

        active_count      = 0
        upcoming_reentry  = 0   # FIX: now counts only true crisis satellites (< 150 km)

        all_sats = list(db.mission_control.find({}))
        for sat in all_sats:
            try:
                l2  = sat.get('tle_line2', '')
                alt = get_altitude_from_tle(l2)
                if alt > 150:
                    active_count += 1
                # FIX: use the same 150 km threshold as Crisis Alerts
                if alt < 150:
                    upcoming_reentry += 1
            except Exception:
                active_count += 1

        return jsonify({
            "status":             "success",
            "total_tracked":      total_tracked,
            "active_satellites":  active_count,
            "upcoming_reentries": upcoming_reentry
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """Get current user profile data."""
    try:
        user = db.users.find_one({"_id": current_user['_id']})
        if not user:
            return jsonify({"message": "User not found"}), 404
        return jsonify({
            "status": "success",
            "profile": {
                "name":     user.get('name', 'Commander'),
                "username": user.get('username', ''),
                "email":    user.get('email', ''),
                "phone":    user.get('phone', ''),
                "role":     user.get('role', 'user')
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    """Update user profile (name, email, phone)."""
    try:
        data          = request.get_json()
        update_fields = {}
        if 'name'  in data: update_fields['name']  = data['name']
        if 'email' in data: update_fields['email'] = data['email']
        if 'phone' in data: update_fields['phone'] = data['phone']

        if not update_fields:
            return jsonify({"message": "No fields to update"}), 400

        db.users.update_one(
            {"_id": current_user['_id']},
            {"$set": update_fields}
        )
        return jsonify({"status": "success", "message": "Profile updated successfully"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ============================================================
# 13. ENVIRONMENT / SPACE WEATHER ROUTES
# ============================================================

@app.route('/api/space-weather', methods=['GET'])
def get_space_weather():
    """Fetch solar flux (F10.7) and sunspot data from NOAA SWPC."""
    try:
        url = "https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json"
        res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=8)
        if res.status_code == 200:
            data = res.json()
            if data and len(data) > 0:
                latest = data[-1]
                flux   = float(latest.get('f10.7', 0))
                ssn    = int(float(latest.get('ssn', 0)))

                if flux >= 200:
                    status = "High Solar Activity"
                elif flux >= 120:
                    status = "Moderate Solar Activity"
                else:
                    status = "Low Solar Activity"

                return jsonify({
                    "solar_flux": round(flux, 1),  # type: ignore
                    "sunspots":   ssn,
                    "status":     status,
                    "date":       latest.get("time-tag", ""),
                    "source":     "NOAA/SWPC"
                })
    except Exception as e:
        print(f"⚠️ Space Weather API Error: {e}")

    return jsonify({
        "solar_flux": 145.2,
        "sunspots":   118,
        "status":     "Moderate Solar Activity",
        "date":       datetime.utcnow().strftime("%Y-%m"),
        "source":     "FALLBACK"
    })


@app.route('/api/kp-index', methods=['GET'])
def get_kp_index():
    """Fetch latest planetary Kp index from NOAA SWPC."""
    try:
        url = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"
        res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=8)
        if res.status_code == 200:
            data = res.json()
            if data and len(data) > 0:
                latest = data[-1]
                kp     = float(latest.get('kp_index', 0))

                if kp >= 7:
                    storm_level = "Severe Geomagnetic Storm"
                elif kp >= 5:
                    storm_level = "Minor Geomagnetic Storm"
                elif kp >= 4:
                    storm_level = "Unsettled"
                else:
                    storm_level = "Quiet"

                return jsonify({
                    "kp_index":    round(kp, 1),  # type: ignore
                    "storm_level": storm_level,
                    "time_tag":    latest.get("time_tag", ""),
                    "source":      "NOAA/SWPC"
                })
    except Exception as e:
        print(f"⚠️ Kp Index API Error: {e}")

    return jsonify({
        "kp_index":    3,
        "storm_level": "Quiet",
        "time_tag":    datetime.utcnow().isoformat(),
        "source":      "FALLBACK"
    })


@app.route('/api/eop', methods=['GET'])
def get_eop():
    """Fetch Earth Orientation Parameters."""
    try:
        url = "https://celestrak.org/SpaceData/EOP-Last5Years.csv"
        res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=8)
        if res.status_code == 200:
            lines = res.text.strip().split('\n')
            if len(lines) > 2:
                last_line = lines[-1].split(',')
                if len(last_line) >= 8:
                    return jsonify({
                        "xp":      round(float(last_line[1]), 4) if last_line[1] else 0.12,  # type: ignore
                        "yp":      round(float(last_line[2]), 4) if last_line[2] else 0.34,  # type: ignore
                        "ut1_utc": round(float(last_line[3]), 4) if last_line[3] else -0.17,  # type: ignore
                        "lod":     round(float(last_line[4]), 4) if last_line[4] else 0.6,  # type: ignore
                        "source":  "CelesTrak"
                    })
    except Exception as e:
        print(f"⚠️ EOP API Error: {e}")

    return jsonify({
        "xp":      0.1234,
        "yp":      0.3456,
        "ut1_utc": -0.1723,
        "lod":     0.5812,
        "source":  "FALLBACK"
    })


@app.route('/api/environment-weather', methods=['GET'])
def get_environment_weather():
    """Fetch ground weather conditions for impact zone assessment."""
    try:
        lat     = request.args.get('lat', '0')
        lon     = request.args.get('lon', '0')
        api_key = os.getenv("OPENWEATHER_API_KEY", "")
        if api_key:
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
            res = requests.get(url, timeout=8)
            if res.status_code == 200:
                data = res.json()
                return jsonify({
                    "wind_speed":  round(float(data.get("wind", {}).get("speed", 0)), 1),  # type: ignore
                    "temperature": round(float(data.get("main", {}).get("temp", 0)), 1),  # type: ignore
                    "cloud_cover": int(data.get("clouds", {}).get("all", 0)),
                    "humidity":    int(data.get("main", {}).get("humidity", 0)),
                    "description": data.get("weather", [{}])[0].get("description", ""),
                    "source":      "OpenWeatherMap"
                })
    except Exception as e:
        print(f"⚠️ Weather API Error: {e}")

    return jsonify({
        "wind_speed":  12.4,
        "temperature": 21.3,
        "cloud_cover": 45,
        "humidity":    68,
        "description": "scattered clouds",
        "source":      "FALLBACK"
    })


if __name__ == "__main__":
    scheduler.init_app(app)
    scheduler.start()
    app.run(debug=True, port=5000, use_reloader=False)