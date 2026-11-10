# RealtorOne 90-Day Pod Tracker

Daily accountability check-in for realtors in a Pod Manager's 90-day challenge (AED 50,000 commission programme goal, not a guarantee).

- **Realtor check-in (mobile, about 1 minute):** `https://anatomyofacloser-cyber.github.io/realtorone-pod-tracker/?r=<id>` (e.g. `?r=chizua`)
- **Pod Manager dashboard (private, password):** `https://anatomyofacloser-cyber.github.io/realtorone-pod-tracker/admin.html`
- **Demo with made-up sample data:** `admin.html?demo=1` and `?r=demo`
- **Backend:** the existing RealtorOne Live Lab Apps Script + Google Sheet (tabs `Tracker` and `Tracker Realtors`). See [SETUP.md](SETUP.md).

The repo holds no check-in data. Everything is stored in the Google Sheet, and the dashboard loads it only after the admin login is checked on the server.

Files: `index.html` (check-in) · `admin.html` (dashboard) · `core.js` (streaks, weekly totals, feedback message; shared by the pages and the Apps Script) · `apps-script/Tracker.gs` (built by `build-gs.py`) · `apps-script/Code.gs` (Live Lab backend + 2 small hooks) · `config.json` (endpoint, time zone).
