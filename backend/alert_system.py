def check_hazard_status(days_left, altitude):
    # Logic: Status trigger
    if days_left < 7 or altitude < 120:
        return "CRITICAL"
    elif days_left < 30 or altitude < 250:
        return "WARNING"
    else:
        return "STABLE"

def generate_alert_message(debris_name, status):
    if status == "CRITICAL":
        return f"🚨 ALERT: {debris_name} is entering critical decay phase. Re-entry imminent!"
    return f"System Nominal for {debris_name}."