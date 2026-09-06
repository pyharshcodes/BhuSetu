import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright

# The backend now serves the frontend directly (see backend/app.py) —
# everything is on one port, there is no separate frontend server anymore.
BASE = "http://127.0.0.1:8000"
errors = []
console_errors = []


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("pageerror", lambda e: (errors.append(str(e)), print("PAGE ERROR ENCOUNTERED:", e, "ON URL:", page.url)))
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

        print("== Loading landing page ==")
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(500)
        title = page.text_content("h1")
        print("H1:", title)
        assert "NER Landslide" in title, "Landing H1 mismatch"
        page.screenshot(path="/tmp/shot_landing.png")

        print("== Clicking into dashboard ==")
        page.click("text=Open Command Dashboard")
        page.wait_for_timeout(1000)
        page.wait_for_selector(".dashboard-grid", timeout=5000)
        print("Dashboard grid loaded")
        page.screenshot(path="/tmp/shot_dashboard.png")

        # Check nav status dot is green (backend connected)
        status_class = page.get_attribute(".status-dot", "class")
        print("Status dot class:", status_class)
        assert "status-ok" in status_class, "Backend status dot not OK"

        print("== Clicking 'Rainfall spike' simulate button ==")
        page.click("button:has-text('Rainfall spike')")
        page.wait_for_timeout(1500)
        risk_score_text = page.text_content(".risk-score")
        print("Risk score after rainfall spike:", risk_score_text)
        page.screenshot(path="/tmp/shot_after_spike.png")

        print("== Clicking '+ SAR deformation' simulate button ==")
        page.click("button:has-text('SAR deformation')")
        page.wait_for_timeout(1500)
        risk_score_text2 = page.text_content(".risk-score")
        alert_badge_text = page.text_content(".badge")
        print("Risk score after SAR:", risk_score_text2, "| Alert badge:", alert_badge_text)
        page.screenshot(path="/tmp/shot_after_sar.png")

        print("== Navigating to Alerts ==")
        page.click("text=Alerts")
        page.wait_for_timeout(1000)
        page.wait_for_selector(".alerts-list", timeout=5000)
        alerts_html_snippet = page.text_content(".alerts-list")
        print("Alerts panel text (first 200 chars):", alerts_html_snippet[:200])
        page.screenshot(path="/tmp/shot_alerts.png")

        print("== Navigating to Field Reports ==")
        page.click("text=Field Reports")
        page.wait_for_timeout(1000)
        page.wait_for_selector(".report-form-card", timeout=5000)
        page.fill(".report-form textarea", "Large crack observed near road shoulder, debris nearby")
        page.click(".report-form button[type=submit]")
        page.wait_for_timeout(1500)
        status_text = page.text_content(".form-status")
        print("Report submit status:", status_text)
        assert "Submitted" in status_text, "Report submission did not confirm"
        page.screenshot(path="/tmp/shot_reports.png")

        print("== Navigating to Explain / Ask ==")
        page.click("text=Explain / Ask")
        page.wait_for_timeout(500)
        page.click("button:has-text('Why is the risk level what it is')")
        page.wait_for_selector(".mode-tag", timeout=12000)
        page.wait_for_timeout(500)
        bubbles = page.query_selector_all(".chat-assistant p")
        last_answer = bubbles[-1].text_content() if bubbles else ""
        print("Explain answer (first 200 chars):", last_answer[:200])
        assert len(last_answer) > 20, "Explain answer looks empty"
        page.screenshot(path="/tmp/shot_explain.png")

        print("== Testing responsive (mobile viewport) ==")
        page.set_viewport_size({"width": 390, "height": 844})
        page.goto(f"{BASE}/#/dashboard", wait_until="networkidle")
        page.wait_for_timeout(1000)
        page.screenshot(path="/tmp/shot_mobile.png")

        browser.close()

    print("\n== Page errors ==")
    for e in errors:
        print("ERR:", e)
    print("\n== Console errors ==")
    for e in console_errors:
        print("CONSOLE ERR:", e)

    if errors or console_errors:
        print("\nFAILED: JS errors detected")
        sys.exit(1)
    print("\nALL CHECKS PASSED")


if __name__ == "__main__":
    run()
