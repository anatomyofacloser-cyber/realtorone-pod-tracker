/* RealtorOne Pod Tracker: shared logic (used by the pages AND pasted into Apps Script as part of Tracker.gs). */
var TrackerCore = (function () {
  var DAILY = { learn_min: 15, calls: 20, followups: 10 };
  var WEEKLY = { calls: 120, followups: 60, posts: 6, learn_min: 90, crm_days: 6 };
  var ITEMS = [
    { k: 'learn', label: 'Training', short: 'Training' },
    { k: 'calls', label: 'Calls', short: 'Calls' },
    { k: 'followups', label: 'Follow-ups', short: 'Follow-ups' },
    { k: 'post', label: 'Reel / post', short: 'Reel' },
    { k: 'crm', label: 'CRM updated', short: 'CRM' }
  ];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ── dates are plain 'YYYY-MM-DD' strings; arithmetic in UTC so time zones never shift them ── */
  function toD(s) { var p = String(s).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function fromD(d) { return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2); }
  function addDays(s, n) { var d = toD(s); d.setUTCDate(d.getUTCDate() + n); return fromD(d); }
  function dow(s) { return toD(s).getUTCDay(); }
  function isWorkday(s) { return dow(s) !== 0; }               // Mon–Sat
  function diffDays(a, b) { return Math.round((toD(b) - toD(a)) / 864e5); }
  function prevWorkday(s) { var x = addDays(s, -1); while (!isWorkday(x)) x = addDays(x, -1); return x; }
  function lastWorkdayOnOrBefore(s) { var x = s; while (!isWorkday(x)) x = addDays(x, -1); return x; }
  function weekStart(s) { var d = dow(s); return addDays(s, d === 0 ? -6 : 1 - d); }   // Monday
  function isDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && fromD(toD(s)) === String(s); }
  function nice(s) { var d = toD(s); return DOW[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
  function dayName(s) { return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow(s)]; }
  function workdaysBetween(a, b) { var n = 0, x = a; while (x <= b) { if (isWorkday(x)) n++; x = addDays(x, 1); } return n; }

  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }
  function done(e) {
    if (!e) return null;
    return {
      learn: !!e.learn && num(e.learn_min) >= DAILY.learn_min,
      calls: num(e.calls) >= DAILY.calls,
      followups: num(e.followups) >= DAILY.followups,
      post: !!e.post,
      crm: !!e.crm
    };
  }
  function score(e) { var d = done(e); if (!d) return 0; var n = 0; for (var k in d) if (d[k]) n++; return n; }
  function fmt(n) { return Math.round(num(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function sumRange(by, a, b) {
    var t = { calls: 0, followups: 0, posts: 0, learn_min: 0, crm_days: 0, leads: 0, ig_leads: 0, meetings: 0, visits: 0, eois: 0, deals: 0, commission: 0, days: 0, full_days: 0 };
    var x = a;
    while (x <= b) {
      var e = by[x];
      if (e) {
        t.days++; t.calls += num(e.calls); t.followups += num(e.followups); t.posts += e.post ? 1 : 0;
        t.learn_min += e.learn ? num(e.learn_min) : 0; t.crm_days += e.crm ? 1 : 0;
        t.leads += num(e.leads); t.ig_leads += num(e.ig_leads); t.meetings += num(e.meetings); t.visits += num(e.visits);
        t.eois += num(e.eois); t.deals += num(e.deals); t.commission += num(e.commission);
        if (score(e) === 5) t.full_days++;
      }
      x = addDays(x, 1);
    }
    return t;
  }

  /** entries: [{date, learn, learn_min, calls, ...}], opts: {today, start, days, goal} */
  function stats(entries, opts) {
    var today = opts.today, start = opts.start || today, days = opts.days || 90, goal = opts.goal || 50000;
    var end = addDays(start, days - 1);
    var by = {};
    (entries || []).forEach(function (e) { if (isDate(e.date) && e.date >= start && e.date <= end) { if (!by[e.date] || String(e.submitted_at || '') >= String(by[e.date].submitted_at || '')) by[e.date] = e; } });
    var ref = today > end ? end : today;
    var started = ref >= start;
    var dayNum = started ? Math.min(days, diffDays(start, ref) + 1) : 0;
    var todayWork = isWorkday(today);
    var yesterday = prevWorkday(today);
    // streaks count back from today (if submitted) or from the previous workday
    function streak(test) {
      var x = lastWorkdayOnOrBefore(ref), n = 0;
      if (!test(by[x])) x = prevWorkday(x);
      while (x >= start && test(by[x])) { n++; x = prevWorkday(x); }
      return n;
    }
    var has = function (e) { return !!e; }, full = function (e) { return !!e && score(e) === 5; };
    var best = 0, run = 0, x = start;
    while (x <= ref) { if (isWorkday(x)) { if (full(by[x])) { run++; if (run > best) best = run; } else run = 0; } x = addDays(x, 1); }
    var ws = weekStart(ref), lws = addDays(ws, -7);
    var week = sumRange(by, ws, ref), lastWeek = sumRange(by, lws, addDays(ws, -2));
    var all = started ? sumRange(by, start, ref) : sumRange(by, start, start);
    var elapsedWork = started ? workdaysBetween(start, todayWork ? ref : lastWorkdayOnOrBefore(ref)) : 0;
    var history = Object.keys(by).sort().reverse().map(function (d) { return by[d]; });
    var notes = history.filter(function (e) { return e.challenge || e.support || e.week_challenge || e.week_support || e.win; }).slice(0, 12);
    var weekDays = []; x = ws; while (x <= addDays(ws, 5)) { weekDays.push({ date: x, entry: by[x] || null, future: x > ref }); x = addDays(x, 1); }
    return {
      today: today, start: start, end: end, days: days, goal: goal, dayNum: dayNum, started: started,
      isWorkday: todayWork, yesterday: yesterday,
      todayEntry: by[today] || null, yesterdayEntry: by[yesterday] || null,
      submittedToday: !!by[today],
      checkinStreak: streak(has), fullStreak: streak(full), bestFullStreak: best,
      week: week, weekStart: ws, weekDays: weekDays, lastWeek: lastWeek, all: all,
      commission: all.commission, commissionPct: Math.min(100, all.commission / goal * 100),
      timePct: Math.min(100, dayNum / days * 100), paceTarget: Math.round(goal * dayNum / days),
      workdaysElapsed: elapsedWork, daysSubmitted: all.days,
      consistency: elapsedWork ? Math.round(Math.min(all.days, elapsedWork) / elapsedWork * 100) : 0,
      history: history, notes: notes
    };
  }

  function first(name) { return String(name || '').trim().split(/\s+/)[0] || 'there'; }

  /** Short WhatsApp feedback for the last workday before today. */
  function feedback(name, st, link, refDate) {
    var f = first(name), d = refDate || st.yesterday, L = [];
    var e = null; st.history.forEach(function (x) { if (x.date === d) e = x; });
    var label = d === st.today ? 'Today' : dayName(d);
    var w = st.week, wk = st.weekStart <= d ? w : st.lastWeek;
    if (d < st.start) {
      L.push('Good morning ' + f + ' ☀️');
      L.push('');
      L.push('*Day 1 of your 90-day challenge starts ' + (st.start === st.today ? 'today' : 'on ' + nice(st.start)) + '!* 🚀');
      L.push('Your daily 5: 15 mins training · 20 calls · 10 follow-ups · 1 Reel/post · CRM updated.');
      L.push('');
      L.push('👉 Today\'s one step: make your first 20 calls before 1 PM, then log your day here (1 minute)' + (link ? ': ' + link : '.'));
      L.push('');
      L.push('Reply "COMMITTED" and let\'s go 💪');
      return L.join('\n');
    }
    if (!e) {
      L.push('Good morning ' + f + ' ☀️');
      L.push('');
      L.push('I didn\'t get your check-in for ' + (label === 'Today' ? 'today' : label) + ' (' + nice(d) + '). No tracking = no progress, and one missed day quietly becomes a missed week.');
      L.push('');
      L.push('👉 Today\'s one step: finish your 20 calls before 1 PM, then send your check-in tonight' + (link ? ': ' + link : '.'));
      L.push('');
      L.push('Reply "ON IT" so I know you\'re in 💪');
      return L.join('\n');
    }
    var dn = done(e), sc = score(e);
    var marks = [
      (dn.learn ? '✅' : '❌') + ' Training ' + (e.learn ? num(e.learn_min) + 'm' : '0m'),
      (dn.calls ? '✅' : '❌') + ' Calls ' + num(e.calls) + '/20',
      (dn.followups ? '✅' : '❌') + ' Follow-ups ' + num(e.followups) + '/10',
      (dn.post ? '✅' : '❌') + ' Reel',
      (dn.crm ? '✅' : '❌') + ' CRM'
    ];
    L.push((d === st.today ? 'Hi ' : 'Good morning ') + f + (d === st.today ? ' 👋' : ' ☀️'));
    L.push('');
    L.push('*' + label + ': ' + sc + '/5* ' + (sc === 5 ? '🔥' : sc >= 3 ? '👍' : '⚠️'));
    L.push(marks.join(' · '));
    var win = '';
    if (num(e.deals)) win = '🎉 Deal closed' + (num(e.commission) ? ', AED ' + fmt(e.commission) + ' commission' : '') + '. Huge!';
    else if (num(e.eois)) win = '👏 ' + num(e.eois) + ' EOI/booking. That\'s money in motion.';
    else if (num(e.visits)) win = '👏 ' + num(e.visits) + ' site visit' + (num(e.visits) > 1 ? 's' : '') + ' done. Great work.';
    else if (num(e.meetings)) win = '👏 ' + num(e.meetings) + ' meeting' + (num(e.meetings) > 1 ? 's' : '') + ' booked. Well done.';
    else if (e.win) win = '👏 Win: "' + String(e.win).slice(0, 90) + '"';
    if (win) L.push(win);
    var step;
    if (sc === 5) {
      L.push('Full routine done' + (st.fullStreak > 1 ? ', ' + st.fullStreak + ' days in a row' : '') + '. This is how AED 50K gets built.');
      step = num(e.meetings) || num(e.visits) ? 'confirm every booked meeting and push one to a site/sales-centre visit.' : 'turn one warm conversation into a booked meeting or site visit.';
    } else if (!dn.calls) { L.push('Gap: calls were ' + num(e.calls) + '/20. The pipeline is built on the phone.'); step = 'block 10 AM–12 PM for calls and don\'t open Instagram until all 20 are done.'; }
    else if (!dn.followups) { L.push('Gap: follow-ups were ' + num(e.followups) + '/10. Warm leads go cold fast.'); step = 'clear 10 follow-ups before lunch, starting with Instagram DMs and anyone who asked about Azizi or Maritime City.'; }
    else if (!dn.post) { L.push('Gap: no Reel/post. Your 8.5K audience needs to see you daily.'); step = 'post one 30-sec face-to-camera Reel on one Azizi or Dubai Maritime City fact, with a DM CTA.'; }
    else if (!dn.learn) { L.push('Gap: training was ' + (e.learn ? num(e.learn_min) : 0) + '/15 mins.'); step = 'do your 15 mins of RealtorOne training before the first call.'; }
    else { L.push('Gap: CRM not updated. A lead without a next action is a lost lead.'); step = 'take 5 mins at day-end so every lead has a next action and date.'; }
    L.push('');
    L.push((wk === w ? 'Week so far: ' : 'Last week: ') + wk.calls + '/120 calls · ' + wk.followups + '/60 follow-ups · ' + wk.posts + '/6 posts');
    L.push('90-day goal: AED ' + fmt(st.commission) + ' / 50,000 · Day ' + st.dayNum + '/' + st.days);
    if (e.support || e.week_support) L.push('You asked for help with "' + String(e.week_support || e.support).slice(0, 80) + '". Let\'s sort it on a 10-min call today.');
    L.push('');
    var nx = d === st.today ? 'Tomorrow' : 'Today';
    L.push('👉 ' + nx + '\'s one step: ' + step);
    L.push('');
    L.push('Reply "DONE" when ' + nx.toLowerCase() + '\'s check-in is in 💪');
    return L.join('\n');
  }

  return { DAILY: DAILY, WEEKLY: WEEKLY, ITEMS: ITEMS, addDays: addDays, dow: dow, isWorkday: isWorkday, prevWorkday: prevWorkday,
    lastWorkdayOnOrBefore: lastWorkdayOnOrBefore, weekStart: weekStart, isDate: isDate, nice: nice, dayName: dayName, diffDays: diffDays,
    done: done, score: score, stats: stats, feedback: feedback, fmt: fmt, num: num, first: first };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TrackerCore;
