import json
from pymongo import MongoClient  # type: ignore

filepath = r"c:\TSSDAR\backend\mission_satellite_fixed.json"

with open(filepath, "r") as f:
    data = json.load(f)

new_data = []
red_count = 5
yellow_count = 9
purple_count = 12

for i, sat in enumerate(data):
    if i < red_count:
        mm = "16.200000"
        sev = "RED"
    elif i < red_count + yellow_count:
        mm = "15.800000"
        sev = "YELLOW"
    elif i < red_count + yellow_count + purple_count:
        mm = "15.500000"
        sev = "PURPLE"
    else:
        mm = "14.200000"
        sev = "STABLE"

    l2 = sat.get("tle_line2", "")
    new_l2 = l2[:53] + mm

    new_obj = {
        "norad_id": sat.get("norad_id"),
        "name": sat.get("name"),
        "tle_line1": sat.get("tle_line1"),
        "tle_line2": new_l2,
        "severity": sev
    }
    new_data.append(new_obj)

with open(filepath, "w") as f:
    json.dump(new_data, f, indent=2)

print("Saved JSON.")

client = MongoClient("mongodb://127.0.0.1:27017/")
db = client["satellite_mission_db"]
db.mission_control.delete_many({})
if new_data:
    db.mission_control.insert_many(new_data)
print("Updated MongoDB mission_control collection with", len(new_data), "documents")
