"""
services/email_service.py
──────────────────────────────────────────────────────────────
SpaceTug — Centralised Email Service
Uses Flask-Mail (Gmail SMTP) configured in app.py via .env

Called from:
  • /api/admin/alerts/<norad_id>  PUT  (when severity → RED)
  • /api/admin/dispatch-report    POST (official dispatch)
  • /api/send-report              POST (ReportView manual send)
──────────────────────────────────────────────────────────────
"""

import os
from datetime import datetime


def send_alert_email(alert_data: dict) -> bool:
    """
    Send a RED-severity crisis alert email.
    Called automatically when admin marks a satellite as RED.

    alert_data keys: name, norad_id, severity, altitude
    Returns True on success, False on failure.
    """
    try:
        # Import here to avoid circular imports with app.py
        from app import mail, app
        from flask_mail import Message  # type: ignore

        name     = alert_data.get("name", "Unknown Object")
        norad    = alert_data.get("norad_id", "N/A")
        severity = alert_data.get("severity", "RED")
        altitude = alert_data.get("altitude", "Unknown")
        now      = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

        recipient = os.getenv("MAIL_USERNAME")  # Send to yourself / mission control
        if not recipient:
            print("❌ EMAIL ERROR: MAIL_USERNAME not set in .env")
            return False

        subject = f"🚨 CRISIS ALERT [{severity}] — {name} (NORAD {norad})"

        html_body = f"""
        <div style="font-family: monospace; background: #020617; color: #e2e8f0;
                    padding: 32px; border-radius: 12px; max-width: 600px; margin: auto;">

          <div style="border-bottom: 2px solid #ef4444; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="color: #ef4444; font-size: 22px; margin: 0; letter-spacing: 0.05em;">
              ⚠ SPACETUG CRISIS ALERT
            </h1>
            <p style="color: #64748b; font-size: 10px; margin: 4px 0 0; letter-spacing: 0.15em;">
              AUTO-GENERATED · {now}
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">Object Name</td>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #ffffff; font-weight: bold; font-size: 13px;">{name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">NORAD ID</td>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #67e8f9; font-family: monospace;">{norad}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">Severity</td>
              <td style="padding: 10px; border: 1px solid #1e293b;">
                <span style="background: #ef444420; color: #ef4444; padding: 3px 10px;
                             border-radius: 20px; font-size: 11px; font-weight: 900;
                             border: 1px solid #ef444440;">{severity}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">Altitude</td>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #ef4444; font-weight: bold;">{altitude} km</td>
            </tr>
          </table>

          <div style="background: #0f172a; border: 1px solid #ef444430; border-radius: 8px;
                      padding: 14px; margin-bottom: 24px;">
            <p style="color: #f87171; font-size: 11px; margin: 0; font-weight: bold; letter-spacing: 0.05em;">
              ⚠ IMMINENT RE-ENTRY RISK — Immediate monitoring required.
              Object altitude is critically low. Re-entry window predicted within 24–72 hours.
            </p>
          </div>

          <p style="color: #334155; font-size: 9px; text-align: center; letter-spacing: 0.15em;">
            SPACETUG MISSION CONTROL · AUTOMATED ALERT SYSTEM · CONFIDENTIAL
          </p>
        </div>
        """

        with app.app_context():
            msg = Message(
                subject=subject,
                sender=os.getenv("MAIL_USERNAME"),
                recipients=[recipient],
                html=html_body,
            )
            mail.send(msg)

        print(f"✅ ALERT EMAIL SENT → {recipient} | {name} (NORAD {norad})")
        return True

    except Exception as e:
        print(f"❌ ALERT EMAIL FAILED: {str(e)}")
        return False


def send_dispatch_email(report_data: dict, recipient: str) -> bool:
    """
    Send an official dispatch report email.
    Called from /api/admin/dispatch-report or ReportView.

    report_data keys: target_name, norad_id, severity, altitude,
                      summary, dispatched_by_name, velocity (optional)
    """
    try:
        from app import mail, app
        from flask_mail import Message  # type: ignore

        name      = report_data.get("target_name", report_data.get("name", "Unknown"))
        norad     = report_data.get("norad_id", "N/A")
        severity  = report_data.get("severity", "CRITICAL")
        altitude  = report_data.get("altitude", "Unknown")
        summary   = report_data.get("summary", "No summary provided.")
        admin     = report_data.get("dispatched_by_name", "Mission Control")
        velocity  = report_data.get("velocity", "N/A")
        now       = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

        subject = f"📋 OFFICIAL DISPATCH: {name} (NORAD {norad}) — SpaceTug"

        html_body = f"""
        <div style="font-family: monospace; background: #020617; color: #e2e8f0;
                    padding: 32px; border-radius: 12px; max-width: 640px; margin: auto;">

          <div style="border-bottom: 2px solid #06b6d4; padding-bottom: 16px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
              <span style="font-size: 9px; color: #06b6d4; letter-spacing: 0.3em; text-transform: uppercase;">
                AUTHORIZED ACCESS ONLY // LEVEL 4 CLEARANCE
              </span>
            </div>
            <h1 style="color: #ffffff; font-size: 24px; margin: 0; letter-spacing: -0.02em; font-style: italic;">
              Technical Intelligence Report
            </h1>
            <p style="color: #64748b; font-size: 10px; margin: 6px 0 0; letter-spacing: 0.1em;">
              System generated: {now} · Dispatched by: {admin}
            </p>
          </div>

          <h3 style="color: #94a3b8; font-size: 9px; text-transform: uppercase;
                     letter-spacing: 0.2em; margin-bottom: 10px;">Target Identification</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #64748b; font-size: 10px; text-transform: uppercase;">Object Name</td>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #fff; font-weight: bold; font-size: 14px; font-style: italic;">{name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #64748b; font-size: 10px; text-transform: uppercase;">NORAD ID</td>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #67e8f9; font-size: 14px;">{norad}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #64748b; font-size: 10px; text-transform: uppercase;">Object Class</td>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #ef4444; font-weight: bold;">DEBRIS</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #64748b; font-size: 10px; text-transform: uppercase;">Severity</td>
              <td style="padding: 10px; border: 1px solid #1e293b;">
                <span style="background: #ef444420; color: #ef4444; padding: 3px 12px;
                             border-radius: 20px; font-size: 10px; font-weight: 900;
                             border: 1px solid #ef444440;">{severity}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #64748b; font-size: 10px; text-transform: uppercase;">Current Altitude</td>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #ef4444; font-weight: bold;">{altitude} km</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #64748b; font-size: 10px; text-transform: uppercase;">Velocity</td>
              <td style="padding: 10px; border: 1px solid #1e293b; color: #67e8f9;">{velocity} km/s</td>
            </tr>
          </table>

          <h3 style="color: #94a3b8; font-size: 9px; text-transform: uppercase;
                     letter-spacing: 0.2em; margin-bottom: 10px;">Mission Summary</h3>
          <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px;
                      padding: 16px; margin-bottom: 28px; color: #cbd5e1; font-size: 12px; line-height: 1.7;">
            {summary}
          </div>

          <div style="background: #0f172a; border: 1px solid #06b6d430; border-radius: 8px;
                      padding: 14px; margin-bottom: 24px;">
            <p style="color: #67e8f9; font-size: 10px; margin: 0; letter-spacing: 0.05em;">
              📡 This is an official dispatch from SpaceTug Mission Control.
              All data is derived from live TLE feeds and SGP4 propagation models.
            </p>
          </div>

          <p style="color: #334155; font-size: 9px; text-align: center; letter-spacing: 0.15em; margin-top: 24px;">
            SPACETUG MISSION CONTROL · OFFICIAL DISPATCH · CONFIDENTIAL
          </p>
        </div>
        """

        with app.app_context():
            msg = Message(
                subject=subject,
                sender=os.getenv("MAIL_USERNAME"),
                recipients=[recipient],
                html=html_body,
            )
            mail.send(msg)

        print(f"✅ DISPATCH EMAIL SENT → {recipient} | {name} (NORAD {norad})")
        return True

    except Exception as e:
        print(f"❌ DISPATCH EMAIL FAILED: {str(e)}")
        return False
