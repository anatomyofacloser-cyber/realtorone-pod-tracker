# Pod Tracker: one-time setup (about 5 minutes)

The tracker reuses the **Live Lab feedback** Apps Script and Google Sheet, and the **same admin username and password** as the Live Lab admin page. The Live Lab form keeps working exactly as before.

## 1. Add the tracker to the existing Apps Script
1. Open the **RealtorOne Live Lab Feedback** Google Sheet, then **Extensions → Apps Script**.
2. In the left file list, click **＋ → Script**, name it **Tracker**, delete what's in it, paste the full contents of [`apps-script/Tracker.gs`](apps-script/Tracker.gs), and click **Save** 💾.
3. Open **Code.gs** and add two small blocks (don't change anything else; your SALES_EMAIL line stays as it is):
   - In `function doGet(e) {`, right after the line `const p = (e && e.parameter) || {};`, paste:
     ```js
     if (/^t_/.test(String(p.action || ''))) { try { return json_(trackerGet_(p)); } catch (err) { return json_({ ok: false, error: String(err) }); } }
     ```
   - Right after the line `function doPost(e) {`, paste:
     ```js
     let td = null; try { td = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { td = null; }
     if (td && td.type === 'tracker') { try { return json_(trackerPost_(td)); } catch (err) { return json_({ ok: false, error: String(err) }); } }
     ```
   Click **Save**. (A full copy of Code.gs with these lines already added is in [`apps-script/Code.gs`](apps-script/Code.gs); if you paste that instead, put your SALES_EMAIL back.)
4. *(Optional)* In the function dropdown, pick **trackerSetup** and click **▶ Run**. This creates the `Tracker` and `Tracker Realtors` tabs now. Otherwise they're created on the first check-in.
5. **Deploy → Manage deployments →** select the Web app → ✏ **Edit → Version: New version → Deploy**. The URL stays the same, so nothing changes for the Live Lab form.
6. Check it: open `…/exec?action=t_profile&r=chizua` (your existing web-app URL plus that ending). You should see `"first":"Chizua"`.

## 2. Daily use
- **Chizua's link:** https://anatomyofacloser-cyber.github.io/realtorone-pod-tracker/?r=chizua (the dashboard's **🔗 Copy her link** button copies it too).
- **Dashboard:** https://anatomyofacloser-cyber.github.io/realtorone-pod-tracker/admin.html. Sign in with your Live Lab admin username and password.
- Every morning, open the dashboard, check the red/green checklist, then use **📋 Copy feedback** (or **Open in WhatsApp**) and send it. Edit the text first if you want.
- A check-in for the same day can be re-sent. The newest one replaces the old one (one row per realtor per day).
- Realtors can log any of the last 6 workdays (Mon–Sat). "Today" is Dubai time.

## 3. Add another realtor
Dashboard → **＋ Add realtor**: name, link name (e.g. `sarah`), Instagram, focus and start date. You get her link, `…/realtorone-pod-tracker/?r=sarah`. You can also add a row to the `Tracker Realtors` tab (ID, Name, Instagram, Focus, Start date as YYYY-MM-DD, Programme days, Commission goal AED, Active = yes). To change a start date or pause someone, edit that tab (Active = no hides them).

## 4. Test entries
Open the realtor link with `&test=1` (e.g. `?r=chizua&test=1`). Those rows are marked *Test entry = yes* and are hidden from the dashboard. Open `admin.html?test=1` to see them, then click **🧹 Delete all test entries**.

## Privacy
Anyone who has a realtor's link can submit a check-in for that realtor. They cannot read any data. Only the dashboard (after the server-side password check) can read data, and the session lasts 6 hours in that browser tab.
