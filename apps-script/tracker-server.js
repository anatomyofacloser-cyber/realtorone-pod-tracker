/* ══════════ Pod Tracker server part (Apps Script). Uses login_/validToken_/json_/esc_ from Code.gs (same admin password). ══════════ */
const T_TZ = 'Asia/Dubai';
const T_SHEET = 'Tracker';
const T_ROSTER = 'Tracker Realtors';
const T_HEADERS = ['Received at','Realtor ID','Realtor name','Date','Training done','Training mins','Calls','Follow-ups',
  'Reel/post published','Post link','CRM updated','New leads','Instagram leads','Meetings booked','Site/sales-centre visits',
  'EOIs/bookings','Deals closed','Commission AED','Today\'s win','Today\'s challenge','Support needed',
  'Weekly: biggest challenge','Weekly: support needed','Score (0-5)','Test entry','Submission ID','User agent'];
const R_HEADERS = ['Realtor ID','Name','Instagram','Focus','Start date','Programme days','Commission goal AED','Active','Added at'];
// First realtor, created automatically the first time the tracker runs. Add more from the admin page.
const T_SEED = [['chizua','Chizua Nwabugwu','@realtor_chizua','Azizi off-plan · Dubai Maritime City','2026-11-10',90,50000,'yes']];

function tToday_() { return Utilities.formatDate(new Date(), T_TZ, 'yyyy-MM-dd'); }
function tSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#F5C242');
    sh.setFrozenRows(1);
  }
  return sh;
}
function tIsDate_(v) { return Object.prototype.toString.call(v) === '[object Date]'; }
function tDateStr_(v) { return tIsDate_(v) ? Utilities.formatDate(v, T_TZ, 'yyyy-MM-dd') : String(v || '').trim(); }
function tRoster_() {
  const sh = tSheet_(T_ROSTER, R_HEADERS);
  if (sh.getLastRow() < 2) {
    sh.getRange(2, 5, 200, 1).setNumberFormat('@');
    T_SEED.forEach(r => sh.appendRow(r.concat([new Date()])));
  }
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, R_HEADERS.length).getValues();
  return rows.filter(r => r[0]).map(r => ({ id: String(r[0]).trim().toLowerCase(), name: String(r[1]), instagram: String(r[2] || ''),
    focus: String(r[3] || ''), start: tDateStr_(r[4]) || tToday_(), days: Number(r[5]) || 90, goal: Number(r[6]) || 50000,
    active: String(r[7] || 'yes').toLowerCase() !== 'no' }));
}
function tFind_(id) { id = String(id || '').trim().toLowerCase(); return tRoster_().filter(r => r.id === id && r.active)[0] || null; }
function tBool_(v) { return v === true || v === 'true' || v === 'yes' || v === 'Yes' || v === 1 || v === '1'; }
function tNum_(v, max) { v = Number(v); return isFinite(v) && v > 0 ? Math.min(Math.round(v * 100) / 100, max) : 0; }
function tTxt_(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n || 300); }
function tLink_(v) { v = tTxt_(v, 300); return /^https?:\/\/[^\s"'<>]+$/.test(v) ? v : ''; }
function tCell_(v) { v = String(v); return /^[=+\-@]/.test(v) ? "'" + v : v; }   // no formula injection into the Sheet

function tRows_() {
  const sh = tSheet_(T_SHEET, T_HEADERS);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, T_HEADERS.length).getValues().map((r, i) => ({
    row: i + 2, received: tIsDate_(r[0]) ? r[0].toISOString() : String(r[0]), realtor: String(r[1]).toLowerCase(), name: String(r[2]),
    date: tDateStr_(r[3]), learn: tBool_(r[4]), learn_min: Number(r[5]) || 0, calls: Number(r[6]) || 0, followups: Number(r[7]) || 0,
    post: tBool_(r[8]), post_link: String(r[9] || ''), crm: tBool_(r[10]), leads: Number(r[11]) || 0, ig_leads: Number(r[12]) || 0,
    meetings: Number(r[13]) || 0, visits: Number(r[14]) || 0, eois: Number(r[15]) || 0, deals: Number(r[16]) || 0,
    commission: Number(r[17]) || 0, win: String(r[18] || ''), challenge: String(r[19] || ''), support: String(r[20] || ''),
    week_challenge: String(r[21] || ''), week_support: String(r[22] || ''), test: tBool_(r[24]),
    submitted_at: tIsDate_(r[0]) ? r[0].toISOString() : String(r[0])
  })).filter(x => x.realtor && x.date);
}

function trackerGet_(p) {
  const a = p.action;
  if (a === 't_profile') {
    const r = tFind_(p.r);
    if (!r) return { ok: false, error: 'unknown_realtor' };
    return { ok: true, today: tToday_(), realtor: { id: r.id, first: TrackerCore.first(r.name), start: r.start, days: r.days, goal: r.goal } };
  }
  if (!validToken_(p.token)) return { ok: false, error: 'auth' };
  if (a === 't_data') {
    const withTest = p.test === '1';
    return { ok: true, today: tToday_(), generated: new Date().toISOString(), realtors: tRoster_(),
             entries: tRows_().filter(x => withTest || !x.test) };
  }
  if (a === 't_add') {
    const id = String(p.id || '').trim().toLowerCase();
    if (!/^[a-z0-9-]{2,30}$/.test(id)) return { ok: false, error: 'Link name must be 2–30 letters/numbers/dashes, e.g. sarah' };
    if (tRoster_().some(r => r.id === id)) return { ok: false, error: 'That link name is already used' };
    const name = tTxt_(p.name, 80); if (!name) return { ok: false, error: 'Name is required' };
    const start = TrackerCore.isDate(p.start) ? p.start : tToday_();
    const sh = tSheet_(T_ROSTER, R_HEADERS);
    sh.appendRow([id, tCell_(name), tCell_(tTxt_(p.instagram, 60)), tCell_(tTxt_(p.focus, 120)), "'" + start, Number(p.days) || 90, Number(p.goal) || 50000, 'yes', new Date()]);
    return { ok: true, id: id };
  }
  if (a === 't_purge_test') {
    const sh = tSheet_(T_SHEET, T_HEADERS);
    const rows = tRows_().filter(x => x.test).map(x => x.row).sort((x, y) => y - x);
    rows.forEach(r => sh.deleteRow(r));
    return { ok: true, deleted: rows.length };
  }
  return { ok: false, error: 'unknown_action' };
}

function trackerPost_(d) {
  const r = tFind_(d.r);
  if (!r) return { ok: false, error: 'unknown_realtor' };
  const today = tToday_();
  const date = String(d.date || '');
  if (!TrackerCore.isDate(date)) return { ok: false, error: 'bad_date' };
  if (date > TrackerCore.addDays(today, 1) || date < TrackerCore.addDays(today, -14)) return { ok: false, error: 'date_out_of_range' };
  const test = tBool_(d.test);
  const e = {
    date: date, learn: tBool_(d.learn), learn_min: tNum_(d.learn_min, 600), calls: tNum_(d.calls, 500), followups: tNum_(d.followups, 500),
    post: tBool_(d.post), post_link: tLink_(d.post_link), crm: tBool_(d.crm), leads: tNum_(d.leads, 500), ig_leads: tNum_(d.ig_leads, 500),
    meetings: tNum_(d.meetings, 200), visits: tNum_(d.visits, 200), eois: tNum_(d.eois, 100), deals: tNum_(d.deals, 50),
    commission: tNum_(d.commission, 10000000), win: tTxt_(d.win), challenge: tTxt_(d.challenge), support: tTxt_(d.support),
    week_challenge: tTxt_(d.week_challenge), week_support: tTxt_(d.week_support)
  };
  if (!e.learn) e.learn_min = 0;
  const row = [new Date(), r.id, tCell_(r.name), "'" + date, e.learn ? 'yes' : 'no', e.learn_min, e.calls, e.followups,
    e.post ? 'yes' : 'no', tCell_(e.post_link), e.crm ? 'yes' : 'no', e.leads, e.ig_leads, e.meetings, e.visits, e.eois, e.deals, e.commission,
    tCell_(e.win), tCell_(e.challenge), tCell_(e.support), tCell_(e.week_challenge), tCell_(e.week_support), TrackerCore.score(e),
    test ? 'yes' : '', tTxt_(d.submission_id, 60), tTxt_(d.user_agent, 200)];
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let updated = false;
  try {
    const sh = tSheet_(T_SHEET, T_HEADERS);
    // one row per realtor per day: a re-submit for the same day replaces it
    const ex = tRows_().filter(x => x.realtor === r.id && x.date === date && x.test === test)[0];
    if (ex) { sh.getRange(ex.row, 1, 1, T_HEADERS.length).setValues([row]); updated = true; }
    else sh.appendRow(row);
  } finally { lock.releaseLock(); }
  const st = TrackerCore.stats(tRows_().filter(x => x.realtor === r.id && x.test === test), { today: today, start: r.start, days: r.days, goal: r.goal });
  return { ok: true, updated: updated, summary: { score: TrackerCore.score(e), checkinStreak: st.checkinStreak, fullStreak: st.fullStreak,
    dayNum: st.dayNum, days: st.days, week: st.week, commission: st.commission, goal: st.goal, start: st.start } };
}

/** Optional: run once from the editor (select trackerSetup ▶ Run) to create the Tracker + Tracker Realtors tabs right away. */
function trackerSetup() { tSheet_(T_SHEET, T_HEADERS).getRange('D:D').setNumberFormat('@'); tRoster_(); }
