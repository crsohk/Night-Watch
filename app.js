/* Night Watch v2.1 - English UI, beige one-screen layout, 1.5x battery.
   Pure logic functions are exported at the bottom for node tests. */
'use strict';

/* ================= Constants ================= */
var SHIFT_DEFS = {
  night:   { key: 'night',   label: 'NIGHT SHIFT', startHour: 19, durH: 12 }, // workday 19:00 → +12h
  weekend: { key: 'weekend', label: '24H SHIFT',   startHour: 7,  durH: 24 }  // weekend/holiday 07:00 → +24h
};

/* Korean public holidays 2026-2030 (substitutes included; ad-hoc holidays like
   election days cannot be predicted and are treated as workdays) */
var KR_HOLIDAYS = {};
[
  // 2026
  '2026-01-01','2026-02-16','2026-02-17','2026-02-18','2026-03-01','2026-03-02',
  '2026-05-05','2026-05-24','2026-05-25','2026-06-06','2026-08-15','2026-08-17',
  '2026-09-24','2026-09-25','2026-09-26','2026-10-03','2026-10-05','2026-10-09','2026-12-25',
  // 2027
  '2027-01-01','2027-02-06','2027-02-07','2027-02-08','2027-02-09','2027-03-01',
  '2027-05-05','2027-05-13','2027-06-06','2027-08-15','2027-08-16',
  '2027-09-14','2027-09-15','2027-09-16','2027-10-03','2027-10-04','2027-10-09','2027-10-11',
  '2027-12-25','2027-12-27',
  // 2028
  '2028-01-01','2028-01-26','2028-01-27','2028-01-28','2028-03-01',
  '2028-05-02','2028-05-05','2028-06-06','2028-08-15',
  '2028-10-02','2028-10-03','2028-10-04','2028-10-05','2028-10-09','2028-12-25',
  // 2029
  '2029-01-01','2029-02-12','2029-02-13','2029-02-14','2029-03-01',
  '2029-05-05','2029-05-07','2029-05-20','2029-05-21','2029-06-06','2029-08-15',
  '2029-09-21','2029-09-22','2029-09-23','2029-09-24','2029-10-03','2029-10-09','2029-12-25',
  // 2030
  '2030-01-01','2030-02-02','2030-02-03','2030-02-04','2030-02-05','2030-03-01',
  '2030-05-05','2030-05-06','2030-05-09','2030-06-06','2030-08-15',
  '2030-09-11','2030-09-12','2030-09-13','2030-10-03','2030-10-09','2030-12-25'
].forEach(function (d) { KR_HOLIDAYS[d] = 1; });

function ymd(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
/* Red day = Sat/Sun or Korean public holiday → 24h duty starts at 07:00 */
function isRedDay(d) {
  var day = d.getDay();
  if (day === 0 || day === 6) return true;
  return !!KR_HOLIDAYS[ymd(d)];
}
var HOSPITAL = { name: 'SNUBH GS', short: 'BUNDANG', lat: 37.352, lon: 127.125 };
var NAME_ROLES = [ // dial by saved number, or by name via Shortcuts
  { k: 'gw1', label: 'GW1' }, { k: 'gw2', label: 'GW2' },
  { k: 'icu', label: 'ICU' }, { k: 'pa',  label: 'PA'  },
  { k: 'cr',  label: 'CR'  }, { k: 'ugi', label: 'UGI' },
  { k: 'hbp', label: 'HBP' }, { k: 'vas', label: 'VAS' }
];
var FIXED_ROLES = [ // fixed lines; numbers never shown on the main screen
  { k: 'er',   label: 'ER',   def: '031-787-3001' },
  { k: 'anes', label: 'ANE',  def: '010-3079-8352' },
  { k: 'or',   label: 'OR',   def: '031-787-3355' },
  { k: 'eicu', label: 'EICU', def: '031-787-3700' }
];
var LS_STATE = 'nw:v1', LS_SET = 'nw:set:v1', LS_WX = 'nw:wx:v1', LS_NEWS = 'nw:news:v1';
var DAY = 86400000, HOUR = 3600000;

/* ================= Pure logic ================= */
function pad2(n) { return (n < 10 ? '0' : '') + n; }

function fmtHMS(ms) {
  if (ms < 0) ms = 0;
  var s = Math.floor(ms / 1000);
  return pad2(Math.floor(s / 3600)) + ':' + pad2(Math.floor((s % 3600) / 60)) + ':' + pad2(s % 60);
}
function fmtDur(ms) {
  var m = Math.round(ms / 60000);
  return Math.floor(m / 60) + 'h ' + pad2(m % 60) + 'm';
}
function fmtClock(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }

var WD_E = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
var MO_E = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function fmtDateE(d) {
  return WD_E[d.getDay()] + ' · ' + MO_E[d.getMonth()] + ' ' + d.getDate();
}
function relDay(d, now) {
  var a = new Date(d); a.setHours(0, 0, 0, 0);
  var b = new Date(now); b.setHours(0, 0, 0, 0);
  var diff = Math.round((a - b) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tmrw';
  if (diff === -1) return 'Yday';
  return (d.getMonth() + 1) + '/' + d.getDate();
}
function fmtWin(w, now) {
  return relDay(w.start, now) + ' ' + fmtClock(w.start) + ' → ' + relDay(w.end, now) + ' ' + fmtClock(w.end);
}

/* Most recent shift window containing (or preceding) now */
function shiftWindow(type, now) {
  var def = SHIFT_DEFS[type];
  var start = new Date(now); start.setHours(def.startHour, 0, 0, 0);
  if (now < start) start = new Date(start.getTime() - DAY);
  var end = new Date(start.getTime() + def.durH * HOUR);
  return { start: start, end: end };
}

/* Window used when starting: roll to the next one if over or >90% elapsed */
function windowForStart(type, now) {
  var w = shiftWindow(type, now);
  var p = (now - w.start) / (w.end - w.start);
  if (now >= w.end || p > 0.9) {
    w = { start: new Date(w.start.getTime() + DAY), end: new Date(w.end.getTime() + DAY) };
  }
  w.preStart = now < w.start;
  return w;
}

function percent(now, start, end) {
  var p = (now - start) / (end - start);
  return Math.max(0, Math.min(1, p));
}

/* Calendar-based detection: night shifts start on workdays,
   24h shifts start on weekends and Korean public holidays. */
function plausibleStart(type, d) {
  return type === 'night' ? !isRedDay(d) : isRedDay(d);
}
/* Single suggestion: the window containing now (calendar-consistent),
   otherwise the nearest upcoming plausible window. */
function suggest(now) {
  var types = ['night', 'weekend'];
  for (var i = 0; i < types.length; i++) {
    var w = shiftWindow(types[i], now);
    if (now >= w.start && now < w.end && plausibleStart(types[i], w.start)) {
      return [{ type: types[i], start: w.start, end: w.end, preStart: false }];
    }
  }
  var best = null;
  types.forEach(function (t) {
    var def = SHIFT_DEFS[t];
    var s = new Date(now); s.setHours(def.startHour, 0, 0, 0);
    if (s <= now) s = new Date(s.getTime() + DAY);
    for (var k = 0; k < 8 && !plausibleStart(t, s); k++) s = new Date(s.getTime() + DAY);
    if (!best || s < best.start) {
      best = { type: t, start: s, end: new Date(s.getTime() + def.durH * HOUR), preStart: true };
    }
  });
  return [best];
}

function busiestHour(callsMs) {
  if (!callsMs || !callsMs.length) return null;
  var cnt = {};
  callsMs.forEach(function (t) { var h = new Date(t).getHours(); cnt[h] = (cnt[h] || 0) + 1; });
  var best = null, bestN = 0;
  Object.keys(cnt).forEach(function (h) {
    if (cnt[h] > bestN) { bestN = cnt[h]; best = +h; }
  });
  return { hour: best, n: bestN };
}

/* WMO weather code → icon/label */
function wmo(code, hour) {
  var night = (hour < 6 || hour >= 19);
  var map = {
    0: [night ? '🌙' : '☀️', 'Clear'], 1: [night ? '🌙' : '🌤️', 'Mostly clear'],
    2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
    45: ['🌫️', 'Fog'], 48: ['🌫️', 'Dense fog'],
    51: ['🌦️', 'Drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌧️', 'Heavy drizzle'],
    56: ['🌧️', 'Freezing drizzle'], 57: ['🌧️', 'Freezing drizzle'],
    61: ['🌧️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'],
    66: ['🌧️', 'Freezing rain'], 67: ['🌧️', 'Freezing rain'],
    71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'], 75: ['❄️', 'Heavy snow'], 77: ['🌨️', 'Snow grains'],
    80: ['🌦️', 'Showers'], 81: ['🌧️', 'Showers'], 82: ['⛈️', 'Heavy showers'],
    85: ['🌨️', 'Snow showers'], 86: ['🌨️', 'Snow showers'],
    95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Hail storm'], 99: ['⛈️', 'Hail storm']
  };
  return map[code] || ['🌡️', '--'];
}

/* Find hourly index for a given time (Asia/Seoul ISO "YYYY-MM-DDTHH:00") */
function wxIndexFor(times, date) {
  var key = date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()) +
            'T' + pad2(date.getHours()) + ':00';
  return times.indexOf(key);
}

/* ================= Hourly lines (half Dune, half ward humor) ================= */
var MSGS = {
  19: ['The desert night begins. Check your stillsuit, and your scrubs.',
       'Handover done. Tonight\'s sand is yours.'],
  20: ['Calls are like sandworms: keep your rhythm and they pass you by.',
       '8 PM. The ward\'s question marks become periods, one by one.'],
  21: ['Ration like water: stamina, patience, coffee.',
       'The Arrakis night is long, but this battery fills honestly.'],
  22: ['Ward lights go out one by one. Moonrise over the dunes.',
       'Rule of ten: sleep banked now rescues the 3 AM you.'],
  23: ['Last dune before midnight. The call room is calling.',
       'The night is deep. May the phone sleep deeper.'],
  0:  ['Midnight. Half the night already belongs to you.',
       'The desert is quiet. May it stay that way.'],
  1:  ['Sleep is the spice of the mind. Save yourself some.',
       'A 1 AM call is half worry, half habit. Slow breath first.'],
  2:  ['The stillest hour. Even Fremen do not walk now.',
       'Steady like a drip line. Dawn is about pacing.'],
  3:  ['Fear is the mind-killer. A call is only wind passing over.',
       '3 AM. Past this ridge, it is all downhill.'],
  4:  ['The darkest hour stands closest to dawn.',
       'First light is loading behind the dunes.'],
  5:  ['Coffee stronger than spice is now permitted.',
       'The first OR team wakes soon. You have already lived a day.'],
  6:  ['The horizon brightens. Time to write the handover.',
       'Even Muad\'Dib went home at this hour. Almost there.'],
  7:  ['Morning. The desert day opens.'],
  8:  ['Even the desert is gentle in the morning.'],
  9:  ['Ride out the morning wave; the afternoon is calm.'],
  10: ['10 AM. Keep your own pace.'],
  11: ['Halfway over the midday dune.'],
  12: ['Lunch is not optional. Rice beats spice.'],
  13: ['1 PM. The battery keeps filling.'],
  14: ['Time for one good coffee.'],
  15: ['Crossing the afternoon dunes. Hold the pace.'],
  16: ['The sun tilts. The desert softens.'],
  17: ['Sunset comes. The day folds in half.'],
  18: ['Night mode loading. Check the phone.']
};
var MSG_PRESTART = ['Not started yet. Water, and one deep breath.',
  'The calm before. Inspect your gear (the coffee).'];
var DONE_QUOTES = ['Sleep is waiting, sweeter than spice.',
  'Morning is a gift for those who crossed the desert.',
  'The battery remembers tonight. Now rest.'];

/* Quotes for surgeons and long nights - shown in rotation with the hourly lines */
var QUOTES = [
  ['Wherever the art of medicine is loved, there is also a love of humanity.', 'Hippocrates'],
  ['Healing is a matter of time, but it is sometimes also a matter of opportunity.', 'Hippocrates'],
  ['The best preparation for tomorrow is to do today\'s work superbly well.', 'William Osler'],
  ['Medicine is a science of uncertainty and an art of probability.', 'William Osler'],
  ['Imperturbability and calm: equanimity is the physician\'s first virtue.', 'William Osler, Aequanimitas'],
  ['I dressed him, and God healed him.', 'Ambroise Pare'],
  ['The good surgeon knows how to operate; the better, when to; the best, when not to.', 'Surgical aphorism'],
  ['To cure sometimes, to relieve often, to comfort always.', 'Medical proverb'],
  ['In surgery, eyes first and most; fingers next and little; tongue last and least.', 'Humphry Rolleston'],
  ['If you\'re going through hell, keep going.', 'Winston Churchill'],
  ['What stands in the way becomes the way.', 'Marcus Aurelius'],
  ['You have power over your mind, not outside events. Realize this, and you will find strength.', 'Marcus Aurelius'],
  ['Courage is not the absence of fear, but the triumph over it.', 'Nelson Mandela'],
  ['It always seems impossible until it is done.', 'Nelson Mandela'],
  ['He who has a why to live can bear almost any how.', 'Friedrich Nietzsche'],
  ['Fall seven times, stand up eight.', 'Japanese proverb'],
  ['A smooth sea never made a skilled sailor.', 'Proverb'],
  ['Do what you can, with what you have, where you are.', 'Theodore Roosevelt'],
  ['Energy and persistence conquer all things.', 'Benjamin Franklin'],
  ['Per aspera ad astra. Through hardships, to the stars.', 'Latin proverb'],
  ['The night is darkest just before the dawn.', 'Proverb'],
  ['Little by little, one travels far.', 'Proverb'],
  ['Fear is the mind-killer.', 'Frank Herbert, Dune'],
  ['Without change, something sleeps inside us and seldom awakens.', 'Frank Herbert, Dune']
];

function messageFor(now, preStart) {
  if (preStart) return MSG_PRESTART[now.getDate() % MSG_PRESTART.length];
  var arr = MSGS[now.getHours()] || MSGS[0];
  return arr[(now.getDate() + now.getHours()) % arr.length];
}
/* Alternate every 10 minutes: hourly line ↔ quote */
function displayLine(now, preStart) {
  if (preStart) return { text: messageFor(now, true), who: 'NIGHT WATCH' };
  var bucket = Math.floor(now.getMinutes() / 10);
  if (bucket % 2 === 1) {
    var q = QUOTES[(now.getDate() * 7 + now.getHours() * 3 + bucket) % QUOTES.length];
    return { text: '"' + q[0] + '"', who: q[1].toUpperCase() };
  }
  return { text: messageFor(now, false), who: 'NIGHT WATCH · ' + pad2(now.getHours()) + ':00' };
}

/* ================= Browser only ================= */
if (typeof document !== 'undefined' && document.getElementById('app')) (function () {

  /* ---------- State & migration ---------- */
  var state = load(LS_STATE) || { current: null, history: [] };
  var settings = load(LS_SET) || {};
  settings.teamNames = settings.teamNames || {};
  settings.teamTels = settings.teamTels || {};
  if (!settings.fixed) settings.fixed = {};
  FIXED_ROLES.forEach(function (r) {
    if (!settings.fixed[r.k]) settings.fixed[r.k] = r.def;
  });
  delete settings.phones; delete settings.quickDial;
  settings.shortcutName = settings.shortcutName || 'DutyCall';
  if (settings.ambient === undefined) settings.ambient = true; // 잔잔한 소리 기본 켜짐
  settings.pickShortcut = settings.pickShortcut || 'PickContact';
  saveSet();

  // 잘못 잡힌 대기 상태 교정: 시작 전(preStart) 당직이 저장돼 있는데
  // 달력상 지금 진행 중인 당직이 있으면 그 창으로 바꿔준다 (v2.1 → v2.2 버그 픽스)
  (function fixMistimedStart() {
    if (!state.current) return;
    if (state.current.start > Date.now()) {
      var s = suggest(new Date())[0];
      if (!s.preStart) {
        state.current.type = s.type;
        state.current.start = s.start.getTime();
        state.current.end = s.end.getTime();
        save();
      }
    }
  })();

  var wxCache = load(LS_WX);
  var newsCache = load(LS_NEWS);
  var activeTab = 'watch';
  var lastMsgKey = '';

  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function save() { localStorage.setItem(LS_STATE, JSON.stringify(state)); }
  function saveSet() { localStorage.setItem(LS_SET, JSON.stringify(settings)); }

  /* ---------- DOM ---------- */
  function $(id) { return document.getElementById(id); }
  var els = {
    date: $('hdrDate'), clock: $('hdrClock'), btnDark: $('btnDark'),
    vStandby: $('view-standby'), vActive: $('view-active'), vDone: $('view-done'), vHistory: $('view-history'),
    greetTitle: $('greetTitle'), greetSub: $('greetSub'), sugBox: $('sugBox'), wxStandby: $('wxStandby'),
    leafMarkers: $('leafMarkers'),
    wxNowLb: $('wxNowLb'), wxNowV: $('wxNowV'), wxEndLb: $('wxEndLb'), wxEndV: $('wxEndV'),
    batFill: $('batFill'), pctNum: $('pctNum'), tElapsed: $('tElapsed'), tRemain: $('tRemain'),
    msgCard: $('msgCard'), msgText: $('msgText'), msgWho: $('msgWho'),
    lineGrid1: $('lineGrid1'), lineGrid2: $('lineGrid2'),
    btnCall: $('btnCall'), btnUndo: $('btnUndo'), btnLog: $('btnLog'), callCnt: $('callCnt'),
    doneDur: $('doneDur'), doneCalls: $('doneCalls'), doneBusy: $('doneBusy'), doneQuote: $('doneQuote'),
    btnArchive: $('btnArchive'),
    hxShifts: $('hxShifts'), hxCalls: $('hxCalls'), hxAvg: $('hxAvg'),
    chartBox: $('chartBox'), chartBars: $('chartBars'), hxList: $('hxList'), hxEmpty: $('hxEmpty'),
    btnClearHx: $('btnClearHx'),
    scrim: $('scrim'), sheet: $('sheet'), teamForm: $('teamForm'), fixedForm: $('fixedForm'),
    scName: $('scName'), scPick: $('scPick'), pasteBar: $('pasteBar'),
    sheetSave: $('sheetSave'), sheetCancel: $('sheetCancel'),
    logSheet: $('logSheet'), logList: $('logList'), logCount: $('logCount'),
    btnEndShift: $('btnEndShift'), logClose: $('logClose'),
    dlg: $('dlg'), dlgText: $('dlgText'), dlgSub: $('dlgSub'), dlgOk: $('dlgOk'), dlgNo: $('dlgNo'),
    toast: $('toast'), btnRefresh: $('btnRefresh'), btnMusic: $('btnMusic'), tkA: $('tkA'), tkB: $('tkB')
  };

  /* ---------- Views ---------- */
  function phase(now) {
    if (!state.current) return 'standby';
    if (now.getTime() >= state.current.end) return 'done';
    return 'active';
  }
  function show(view) {
    ['vStandby', 'vActive', 'vDone', 'vHistory'].forEach(function (k) { els[k].classList.remove('on'); });
    els[view].classList.add('on');
  }
  function renderAll() {
    var now = new Date();
    if (state.current && now.getTime() > state.current.end + 12 * HOUR) archive(false);
    document.body.classList.toggle('dawn', state.current ? phase(now) === 'done' : false);
    document.body.classList.toggle('phase-active', activeTab === 'watch' && phase(now) === 'active');
    if (activeTab === 'history') { show('vHistory'); renderHistory(); }
    else {
      var ph = phase(now);
      if (ph === 'standby') { show('vStandby'); renderStandby(now); }
      else if (ph === 'done') { show('vDone'); renderDone(now); }
      else { show('vActive'); renderActive(now, true); }
    }
    renderWeather();
    requestAnimationFrame(function () { fitCheck(); });
  }

  function renderHeader(now) {
    els.date.textContent = fmtDateE(now) + ' · ' + HOSPITAL.name;
    els.clock.textContent = fmtClock(now);
  }

  /* ---------- Standby ---------- */
  function greet(now) {
    var h = now.getHours();
    if (h >= 5 && h < 11) return 'Good morning.';
    if (h >= 11 && h < 17) return 'A quiet afternoon.';
    if (h >= 17 && h < 21) return 'The sun sets on the desert.';
    return 'Deep in the night.';
  }
  function renderStandby(now) {
    els.greetTitle.textContent = greet(now);
    els.greetSub.textContent = 'Workdays 19:00 → 07:00 · Weekends & KR holidays 07:00 → 07:00. Detected automatically.';
    var s = suggest(now)[0];
    var moonIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A9762F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
    var sunIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A9762F" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    var note = s.preStart
      ? 'Start now and tracking begins at ' + fmtClock(s.start) + ' sharp.'
      : 'Already ' + fmtHMS(now - s.start) + ' in. Backdated to ' + fmtClock(s.start) + '.';
    els.sugBox.innerHTML =
      '<div class="sug"><div class="sug-top"><div class="sug-ic">' +
      (s.type === 'night' ? moonIcon : sunIcon) +
      '</div><div><h2>' + SHIFT_DEFS[s.type].label + '</h2>' +
      '<div class="win">' + fmtWin(s, now) + '</div></div></div>' +
      '<div class="note">' + note + '</div>' +
      '<button class="btn-start" id="btnStart" type="button">START SHIFT</button></div>';
    $('btnStart').addEventListener('click', confirmStart);
    renderLine(els.lineGrid1);
  }

  function confirmStart() {
    var now = new Date();
    var s = suggest(now)[0];
    var sub = s.preStart
      ? 'Tracking begins at ' + fmtClock(s.start) + ' sharp.'
      : fmtHMS(now - s.start) + ' will be recorded as already elapsed.';
    confirmDlg('Start ' + SHIFT_DEFS[s.type].label + ' from ' + relDay(s.start, now) + ' ' + fmtClock(s.start) + '?', sub, false, startShift);
  }
  function startShift() {
    var now = new Date();
    var s = suggest(now)[0];
    state.current = {
      id: 'S' + now.getTime(), type: s.type,
      start: s.start.getTime(), end: s.end.getTime(),
      calls: [], startedAt: now.getTime()
    };
    save();
    lastMsgKey = '';
    renderAll();
    toast(SHIFT_DEFS[s.type].label + ' started · from ' + fmtClock(s.start));
  }

  /* ---------- Active ---------- */
  function renderActive(now, full) {
    var cur = state.current;
    var start = cur.start, end = cur.end;
    var pre = now.getTime() < start;
    var p = percent(now.getTime(), start, end);

    els.batFill.style.width = (p * 100).toFixed(2) + '%';
    els.pctNum.innerHTML = Math.floor(p * 100) + '<sup>%</sup>';

    els.tElapsed.textContent = fmtHMS(now.getTime() - start);
    els.tRemain.textContent = pre ? fmtHMS(end - start) : fmtHMS(end - now.getTime());

    var msgKey = now.getHours() + '-' + Math.floor(now.getMinutes() / 10);
    if (msgKey !== lastMsgKey || full) {
      lastMsgKey = msgKey;
      var line = displayLine(now, pre);
      els.msgCard.classList.add('fade');
      setTimeout(function () {
        els.msgText.textContent = line.text;
        els.msgWho.textContent = line.who;
        els.msgCard.classList.remove('fade');
      }, full ? 0 : 500);
    }
    if (full) { renderLine(els.lineGrid2); renderCalls(); }
  }

  /* ---------- Call line (numbers never shown on cards) ---------- */
  function cleanNum(num) { return String(num || '').replace(/[^0-9+#*]/g, ''); }
  function callByShortcut(name) {
    location.href = 'shortcuts://run-shortcut?name=' +
      encodeURIComponent(settings.shortcutName || 'DutyCall') +
      '&input=text&text=' + encodeURIComponent(name);
  }
  var TEL_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A7A61" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c1 .3 2 .5 3 .6a2 2 0 0 1 1.6 2z"/></svg>';
  function renderLine(grid) {
    var html = '';
    FIXED_ROLES.forEach(function (r) { // row 1: ER ANE OR EICU
      var num = cleanNum(settings.fixed[r.k]);
      html += '<button class="mate' + (num ? '' : ' no-num') + '" data-fixed-role="' + r.k + '" type="button">' +
        '<span class="role">' + r.label + '</span>' + TEL_ICON + '</button>';
    });
    NAME_ROLES.forEach(function (r) { // rows 2-3: GW1 GW2 ICU PA / CR UGI HBP VAS
      var nm = settings.teamNames[r.k] || '';
      var ready = nm || cleanNum(settings.teamTels[r.k]);
      html += '<button class="mate' + (ready ? '' : ' no-num') + '" data-name-role="' + r.k + '" type="button">' +
        '<span class="role">' + r.label + '</span>' +
        '<span class="nm' + (nm ? '' : ' empty') + '">' + (nm ? esc(nm) : '+ SET') + '</span></button>';
    });
    grid.innerHTML = html;
    grid.querySelectorAll('[data-name-role]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-name-role');
        var nm = settings.teamNames[k];
        var tel = cleanNum(settings.teamTels[k]);
        if (tel) { location.href = 'tel:' + tel; return; }
        if (nm) { callByShortcut(nm); return; }
        openSheet(); toast('Add a name first');
      });
    });
    grid.querySelectorAll('[data-fixed-role]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-fixed-role');
        var num = cleanNum(settings.fixed[k]);
        if (!num) { openSheet(); toast('Add the number first'); return; }
        location.href = 'tel:' + num;
      });
    });
  }

  /* ---------- Muhwanja leaf call counter ---------- */
  var LEAF_POSITIONS = [ // cropped-image percent coords, clockwise from upper-left leaf
    { x: 31.1, y: 26.7, w: 9   },
    { x: 40.6, y: 23.3, w: 9.5 },
    { x: 50.0, y: 22.2, w: 10  },
    { x: 60.0, y: 23.3, w: 9.5 },
    { x: 70.0, y: 26.7, w: 9   },
    { x: 79.0, y: 50.5, w: 10  },
    { x: 70.0, y: 56.4, w: 9   },
    { x: 60.0, y: 58.8, w: 9.5 },
    { x: 48.9, y: 61.1, w: 10  },
    { x: 38.9, y: 61.1, w: 9.5 },
    { x: 28.9, y: 58.8, w: 9   }
  ];
  function renderLeafCalls() {
    if (!els.leafMarkers) return;
    var calls = state.current ? state.current.calls : [];
    var total = calls.length;
    var visible = Math.min(total, LEAF_POSITIONS.length);
    var html = '';
    for (var i = 0; i < visible; i++) {
      var pos = LEAF_POSITIONS[i];
      var label = String(i + 1);
      if (i === LEAF_POSITIONS.length - 1 && total > LEAF_POSITIONS.length) {
        label = String(total); // 12th call onward: last leaf shows the running total
      }
      var sizeVw = pos.w * 0.44; // 잎 너비의 약 2/3에서 다시 2/3로 축소
      var markerSize = 'clamp(13px,' + sizeVw.toFixed(2) + 'vw,27px)';
      html += '<span class="leaf-marker" style="left:' + pos.x + '%;top:' + pos.y +
        '%;--marker-size:' + markerSize + ';">' + label + '</span>';
    }
    els.leafMarkers.innerHTML = html;
  }

  function renderCalls() {
    var calls = state.current ? state.current.calls : [];
    els.callCnt.textContent = String(calls.length);
    renderLeafCalls();
    els.btnUndo.disabled = !calls.length;
    els.logCount.textContent = calls.length + ' CALLS';
    if (!calls.length) {
      els.logList.innerHTML = '<div class="tl-empty">No calls yet. May it stay quiet.</div>';
      return;
    }
    var html = '';
    for (var i = calls.length - 1; i >= 0; i--) {
      var d = new Date(calls[i]);
      html += '<div class="tl-row"><span class="n">#' + (i + 1) + '</span>' +
        '<span class="t">' + fmtClock(d) + ':' + pad2(d.getSeconds()) + '</span></div>';
    }
    els.logList.innerHTML = html;
  }
  els.btnCall.addEventListener('click', function () {
    if (!state.current) return;
    state.current.calls.push(Date.now());
    save();
    renderCalls();
    els.btnCall.classList.remove('flash'); void els.btnCall.offsetWidth; els.btnCall.classList.add('flash');
    els.pctNum.classList.remove('pulse'); void els.pctNum.offsetWidth; els.pctNum.classList.add('pulse');
  });
  els.btnUndo.addEventListener('click', function () {
    if (!state.current || !state.current.calls.length) return;
    var t = state.current.calls.pop();
    save();
    renderCalls();
    toast('Call removed (' + fmtClock(new Date(t)) + ')');
  });
  els.btnLog.addEventListener('click', function () {
    renderCalls();
    overlayOpen(els.logSheet);
  });
  els.logClose.addEventListener('click', closeSheets);
  els.btnEndShift.addEventListener('click', function () {
    closeSheets();
    confirmDlg('End shift now?', 'Recorded end time: ' + fmtClock(new Date()) + '.', false, function () {
      state.current.end = Date.now();
      state.current.endedEarly = true;
      save();
      renderAll();
    });
  });

  /* ---------- Done / archive ---------- */
  function renderDone(now) {
    var cur = state.current;
    els.doneDur.textContent = fmtDur(cur.end - cur.start);
    els.doneCalls.textContent = String(cur.calls.length);
    var b = busiestHour(cur.calls);
    els.doneBusy.textContent = b ? pad2(b.hour) + ':00 · ' + b.n : '--';
    els.doneQuote.textContent = DONE_QUOTES[new Date(cur.end).getDate() % DONE_QUOTES.length];
  }
  els.btnArchive.addEventListener('click', function () { archive(true); });
  function archive(interactive) {
    if (!state.current) return;
    var cur = state.current;
    var team = {};
    NAME_ROLES.forEach(function (r) { if (settings.teamNames[r.k]) team[r.k] = settings.teamNames[r.k]; });
    state.history.unshift({
      id: cur.id, type: cur.type, start: cur.start, end: cur.end,
      calls: cur.calls, team: team, endedEarly: !!cur.endedEarly
    });
    if (state.history.length > 200) state.history.length = 200;
    state.current = null;
    save();
    if (interactive) { renderAll(); toast('Record saved'); }
  }

  /* ---------- History ---------- */
  function roleLabel(k) {
    var all = NAME_ROLES.concat(FIXED_ROLES);
    for (var i = 0; i < all.length; i++) if (all[i].k === k) return all[i].label;
    return k;
  }
  function renderHistory() {
    var cur = state.current;
    var curEl = $('hxCurrent');
    if (cur) {
      curEl.style.display = '';
      curEl.innerHTML = '<div class="hx-line"><div>' +
        '<div class="hx-date">' + fmtDateE(new Date(cur.start)) + '</div>' +
        '<div class="hx-type" style="color:var(--green-deep)">IN PROGRESS · SAVED WHEN FINISHED</div></div>' +
        '<div class="hx-calls"><span class="c">' + cur.calls.length + '</span><span class="u">CALLS</span></div></div>';
    } else curEl.style.display = 'none';
    var hx = state.history;
    var totalCalls = hx.reduce(function (s, h) { return s + h.calls.length; }, 0);
    els.hxShifts.textContent = hx.length;
    els.hxCalls.textContent = totalCalls;
    els.hxAvg.textContent = hx.length ? (totalCalls / hx.length).toFixed(1) : '0';
    els.hxEmpty.style.display = hx.length ? 'none' : '';
    els.btnClearHx.style.display = hx.length ? '' : 'none';
    els.chartBox.style.display = hx.length ? '' : 'none';

    if (hx.length) {
      var recent = hx.slice(0, 12).reverse();
      var max = Math.max.apply(null, recent.map(function (h) { return h.calls.length; }).concat([1]));
      var bars = '';
      recent.forEach(function (h) {
        var d = new Date(h.start);
        var hPct = Math.max(4, Math.round(h.calls.length / max * 100));
        bars += '<div class="cbar' + (h.type === 'weekend' ? ' wk' : '') + '">' +
          '<span class="bv">' + h.calls.length + '</span>' +
          '<div class="bar" style="height:' + hPct + '%"></div>' +
          '<span class="bl">' + (d.getMonth() + 1) + '/' + d.getDate() + '</span></div>';
      });
      els.chartBars.innerHTML = bars;
    }

    var html = '';
    hx.forEach(function (h, i) {
      var s = new Date(h.start), e = new Date(h.end);
      html += '<div class="hx-item" data-i="' + i + '"><div class="hx-line"><div>' +
        '<div class="hx-date">' + fmtDateE(s) + '</div>' +
        '<div class="hx-type">' + SHIFT_DEFS[h.type].label + (h.endedEarly ? ' · ENDED EARLY' : '') + '</div></div>' +
        '<div class="hx-calls"><span class="c">' + h.calls.length + '</span><span class="u">CALLS</span></div></div>' +
        '<div class="hx-detail">' + hxDetail(h, s, e, i) + '</div></div>';
    });
    els.hxList.innerHTML = html;
    els.hxList.querySelectorAll('.hx-item').forEach(function (item) {
      item.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-del]')) return;
        item.classList.toggle('open');
      });
    });
    els.hxList.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.getAttribute('data-del');
        confirmDlg('Delete this record?', 'This cannot be undone.', true, function () {
          state.history.splice(i, 1); save(); renderHistory();
        });
      });
    });
  }
  function hxDetail(h, s, e, idx) {
    var chips = h.calls.map(function (t) {
      return '<span class="hx-chip">' + fmtClock(new Date(t)) + '</span>';
    }).join('');
    var teamStr = Object.keys(h.team || {}).map(function (k) {
      return roleLabel(k) + ' ' + esc(h.team[k]);
    }).join(' · ');
    var b = busiestHour(h.calls);
    return (chips ? '<div class="hx-chips">' + chips + '</div>' : '') +
      '<div class="hx-meta">' + fmtClock(s) + ' → ' + fmtClock(e) + ' (' + fmtDur(h.end - h.start) + ')' +
      (b ? ' · peak ' + pad2(b.hour) + ':00' : '') +
      (teamStr ? '<br>Team: ' + teamStr : '') +
      '</div><button class="btn-ghost-danger" style="margin:8px 0 0" data-del="' + idx + '" type="button">DELETE RECORD</button>';
  }
  els.btnClearHx.addEventListener('click', function () {
    confirmDlg('Clear all records?', state.history.length + ' shift records will be deleted.', true, function () {
      state.history = []; save(); renderHistory();
    });
  });

  /* ---------- Weather ---------- */
  function endTarget(now) {
    if (state.current) return new Date(state.current.end);
    return suggest(now)[0].end;
  }
  function renderWeather() {
    var now = new Date();
    var endD = endTarget(now);
    var d = wxCache && wxCache.data;
    els.wxNowLb.textContent = 'NOW · ' + HOSPITAL.short;
    els.wxEndLb.textContent = 'END · ' + relDay(endD, now).toUpperCase() + ' ' + fmtClock(endD);
    if (d && d.current) {
      var w1 = wmo(d.current.weather_code, now.getHours());
      els.wxNowV.innerHTML = w1[0] + ' ' + Math.round(d.current.temperature_2m) + '°<small> ' + w1[1] + '</small>';
    } else els.wxNowV.textContent = navigator.onLine ? '…' : '--';
    var idx = d && d.hourly ? wxIndexFor(d.hourly.time, endD) : -1;
    if (idx >= 0) {
      var w2 = wmo(d.hourly.weather_code[idx], endD.getHours());
      var pp = d.hourly.precipitation_probability ? d.hourly.precipitation_probability[idx] : null;
      els.wxEndV.innerHTML = w2[0] + ' ' + Math.round(d.hourly.temperature_2m[idx]) + '°<small> ' + w2[1] +
        (pp != null && pp >= 20 ? ' · ' + pp + '%' : '') + '</small>';
    } else els.wxEndV.textContent = '--';
    var html;
    if (!d) {
      html = '<div class="wx-note">' + (navigator.onLine ? 'Loading hospital weather…' : 'Offline. Weather appears when connected.') + '</div>';
    } else {
      html = '';
      if (d.current) {
        var a = wmo(d.current.weather_code, now.getHours());
        html += '<div class="wx-cell"><span class="wx-ic">' + a[0] + '</span><div class="wx-t">' +
          '<div class="wx-lb">NOW · ' + HOSPITAL.short + '</div>' +
          '<div class="wx-v">' + Math.round(d.current.temperature_2m) + '°<small>' + a[1] + '</small></div></div></div>';
      }
      if (idx >= 0) {
        var bwx = wmo(d.hourly.weather_code[idx], endD.getHours());
        html += '<div class="wx-cell"><span class="wx-ic">' + bwx[0] + '</span><div class="wx-t">' +
          '<div class="wx-lb">END · ' + relDay(endD, now).toUpperCase() + ' ' + fmtClock(endD) + '</div>' +
          '<div class="wx-v">' + Math.round(d.hourly.temperature_2m[idx]) + '°<small>' + bwx[1] + '</small></div></div></div>';
      }
      var age = Math.round((Date.now() - wxCache.ts) / 60000);
      if (age > 90) html += '<div class="wx-note">Data from ' + age + ' min ago (offline)</div>';
    }
    els.wxStandby.innerHTML = html;
  }
  function fetchWeather(force) {
    if (!navigator.onLine) { renderWeather(); return; }
    if (!force && wxCache && Date.now() - wxCache.ts < 30 * 60000) { renderWeather(); return; }
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + HOSPITAL.lat +
      '&longitude=' + HOSPITAL.lon +
      '&current=temperature_2m,apparent_temperature,weather_code' +
      '&hourly=temperature_2m,weather_code,precipitation_probability' +
      '&timezone=Asia%2FSeoul&forecast_days=3';
    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      wxCache = { ts: Date.now(), data: data };
      localStorage.setItem(LS_WX, JSON.stringify(wxCache));
      renderWeather();
    }).catch(function () { renderWeather(); });
  }

  /* ---------- Edit sheet & contact picking ---------- */
  var hasPicker = ('contacts' in navigator && 'select' in navigator.contacts);
  var pendingPick = null; // role key waiting for shortcut-clipboard round trip
  function nativePick(k) {
    navigator.contacts.select(['name', 'tel'], { multiple: false }).then(function (res) {
      if (!res || !res.length) return;
      var c = res[0];
      var nEl = $('tn_' + k), tEl = $('tt_' + k);
      if (nEl && c.name && c.name.length) nEl.value = c.name[0];
      if (tEl && c.tel && c.tel.length) tEl.value = c.tel[0];
    }).catch(function () { /* user cancelled */ });
  }
  function shortcutPick(k) {
    pendingPick = k;
    location.href = 'shortcuts://run-shortcut?name=' +
      encodeURIComponent(settings.pickShortcut || 'PickContact');
  }
  function roleLabelOf(k) {
    for (var i = 0; i < NAME_ROLES.length; i++) if (NAME_ROLES[i].k === k) return NAME_ROLES[i].label;
    return k;
  }
  function updatePasteBar() {
    if (pendingPick) {
      els.pasteBar.textContent = 'PASTE ' + roleLabelOf(pendingPick) + ' FROM CONTACTS';
      els.pasteBar.classList.add('on');
    } else els.pasteBar.classList.remove('on');
  }
  function parsePicked(text) {
    var tel = '', name = '';
    String(text).split(/[\n|]/).forEach(function (line) {
      var t = line.trim();
      if (!t) return;
      if (!tel && /^[\d\s\-+().#*]{7,}$/.test(t)) tel = t;
      else if (!name && !/^[\d\s\-+().#*]+$/.test(t)) name = t;
    });
    return { name: name, tel: tel };
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') updatePasteBar();
  });
  function openSheet() {
    var tf = '';
    NAME_ROLES.forEach(function (r) {
      tf += '<div class="f-row trio"><span class="rl">' + r.label + '</span>' +
        '<button class="pick-btn" data-pick="' + r.k + '" type="button" aria-label="Pick from contacts">' +
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg></button>' +
        '<input class="f-in" id="tn_' + r.k + '" placeholder="Name" autocomplete="off" value="' + esc(settings.teamNames[r.k] || '') + '">' +
        '<input class="f-in" id="tt_' + r.k + '" placeholder="Number" inputmode="tel" autocomplete="off" value="' + esc(settings.teamTels[r.k] || '') + '">' +
        '</div>';
    });
    els.teamForm.innerHTML = tf;
    els.teamForm.querySelectorAll('[data-pick]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-pick');
        if (hasPicker) nativePick(k); else shortcutPick(k);
      });
    });
    updatePasteBar();
    var ff = '';
    FIXED_ROLES.forEach(function (r) {
      ff += '<div class="f-row"><span class="rl">' + r.label + '</span>' +
        '<input class="f-in" id="fn_' + r.k + '" placeholder="Number" inputmode="tel" autocomplete="off" value="' + esc(settings.fixed[r.k] || '') + '"></div>';
    });
    els.fixedForm.innerHTML = ff;
    els.scName.value = settings.shortcutName || 'DutyCall';
    els.scPick.value = settings.pickShortcut || 'PickContact';
    overlayOpen(els.sheet);
  }
  els.pasteBar.addEventListener('click', function () {
    var k = pendingPick;
    if (!k || !navigator.clipboard || !navigator.clipboard.readText) return;
    navigator.clipboard.readText().then(function (text) {
      var p = parsePicked(text);
      var nEl = $('tn_' + k), tEl = $('tt_' + k);
      if (nEl && p.name) nEl.value = p.name;
      if (tEl && p.tel) tEl.value = p.tel;
      pendingPick = null;
      updatePasteBar();
      if (!p.name && !p.tel) toast('Clipboard had no contact. Run PickContact first.');
    }).catch(function () { toast('Allow paste to fill from Contacts'); });
  });
  var lastFocus = null;
  function overlayOpen(el) {
    lastFocus = document.activeElement;
    el.inert = false;
    el.removeAttribute('aria-hidden');
    el.classList.add('on');
    els.scrim.classList.add('on');
    var f = el.querySelector('input,button');
    if (f) setTimeout(function () { f.focus(); }, 350);
  }
  function overlayClose(el) {
    el.classList.remove('on');
    el.inert = true;
    el.setAttribute('aria-hidden', 'true');
  }
  function closeSheets() {
    els.scrim.classList.remove('on');
    overlayClose(els.sheet);
    overlayClose(els.logSheet);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  els.sheetSave.addEventListener('click', function () {
    NAME_ROLES.forEach(function (r) {
      var n = $('tn_' + r.k), t = $('tt_' + r.k);
      if (n) settings.teamNames[r.k] = n.value.trim();
      if (t) settings.teamTels[r.k] = t.value.trim();
    });
    FIXED_ROLES.forEach(function (r) {
      var n = $('fn_' + r.k);
      if (n) settings.fixed[r.k] = n.value.trim();
    });
    settings.shortcutName = (els.scName.value.trim() || 'DutyCall');
    settings.pickShortcut = (els.scPick.value.trim() || 'PickContact');
    saveSet(); closeSheets();
    renderLine(els.lineGrid1); renderLine(els.lineGrid2);
    toast('Saved');
  });
  els.sheetCancel.addEventListener('click', closeSheets);
  els.scrim.addEventListener('click', closeSheets);
  $('lineEdit1').addEventListener('click', openSheet);
  $('lineEdit2').addEventListener('click', openSheet);

  /* ---------- Dialog / toast ---------- */
  var dlgCb = null;
  function confirmDlg(text, sub, warn, cb) {
    els.dlgText.textContent = text;
    els.dlgSub.textContent = sub || '';
    els.dlgOk.classList.toggle('warn', !!warn);
    dlgCb = cb;
    lastFocus = document.activeElement;
    els.dlg.inert = false;
    els.dlg.removeAttribute('aria-hidden');
    els.dlg.classList.add('on'); els.scrim.classList.add('on');
    setTimeout(function () { els.dlgNo.focus(); }, 250);
  }
  function dlgClose() {
    els.dlg.classList.remove('on'); els.scrim.classList.remove('on');
    els.dlg.inert = true;
    els.dlg.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  els.dlgOk.addEventListener('click', function () {
    dlgClose();
    if (dlgCb) { var f = dlgCb; dlgCb = null; f(); }
  });
  els.dlgNo.addEventListener('click', function () { dlgClose(); dlgCb = null; });
  var toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('on'); }, 2400);
  }

  /* ---------- Refresh (bottom-left) ---------- */
  els.btnRefresh.addEventListener('click', function () {
    if (state.current) {
      confirmDlg('Restart shift tracking?', 'OK clears the current shift and its calls, then re-detects from the calendar. Cancel just refreshes the display.', true, function () {
        state.current = null;
        save();
        lastMsgKey = '';
        fetchWeather(true);
        fetchNews(true);
        renderAll();
        toast('Reset. Ready to start again.');
      });
    } else {
      lastMsgKey = '';
      fetchWeather(true);
      fetchNews(true);
      renderAll();
      toast('Refreshed');
    }
  });

  /* ---------- Good-news ticker ---------- */
  var NEWS_FALLBACK = [
    'Somewhere tonight, a patient you once operated on is sleeping soundly.',
    'Global surgical outcomes keep improving year after year.',
    'Every quiet minute on call is a small victory.',
    'Coffee supplies in the call room remain stable.',
    'Sunrise is on schedule, as always.',
    'Your team is one call away. You are not alone tonight.'
  ];
  function renderTicker() {
    var titles = (newsCache && newsCache.titles && newsCache.titles.length)
      ? newsCache.titles : NEWS_FALLBACK;
    var text = 'GOOD NEWS +++ ' + titles.join('  +++  ') + '  +++  ';
    els.tkA.textContent = text;
    els.tkB.textContent = text;
  }
  function fetchNews(force) {
    if (!navigator.onLine) { renderTicker(); return; }
    if (!force && newsCache && Date.now() - newsCache.ts < 60 * 60000) { renderTicker(); return; }
    fetch('https://www.reddit.com/r/UpliftingNews/top.json?t=day&limit=12')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var titles = (d.data.children || []).map(function (c) { return c.data.title; })
          .filter(function (t) { return t && t.length < 140; }).slice(0, 10);
        if (!titles.length) throw new Error('empty');
        newsCache = { ts: Date.now(), titles: titles };
        localStorage.setItem(LS_NEWS, JSON.stringify(newsCache));
        renderTicker();
      })
      .catch(function () { renderTicker(); });
  }

  /* ---------- Lagrima (after F. Tarrega) - Karplus-Strong guitar, offline ---------- */
  var audioCtx = null, ambientOn = false, guitarMaster = null;
  var loopTimer = null, liveSources = [];
  var pluckCache = {};
  var TEMPO = 63, SPB = 60 / TEMPO; // seconds per beat, 3/4 andante

  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function pluckBuffer(midi) {
    if (pluckCache[midi]) return pluckCache[midi];
    var sr = audioCtx.sampleRate, dur = 3.2;
    var freq = midiHz(midi);
    var N = Math.max(2, Math.round(sr / freq));
    var buf = audioCtx.createBuffer(1, Math.floor(sr * dur), sr);
    var d = buf.getChannelData(0);
    var ring = new Float32Array(N), last = 0;
    for (var i = 0; i < N; i++) { // lowpassed noise burst → nylon warmth
      var r = Math.random() * 2 - 1;
      ring[i] = (r + last) * 0.5; last = r;
    }
    var idx = 0;
    for (var n = 0; n < d.length; n++) {
      var cur = ring[idx], nxt = ring[(idx + 1) % N];
      d[n] = cur;
      ring[idx] = 0.997 * 0.5 * (cur + nxt);
      idx = (idx + 1) % N;
    }
    pluckCache[midi] = buf;
    return buf;
  }
  /* Score: melody/bass/inner voices, [beat, midi, gain] */
  function lagrimaScore() {
    var ev = [];
    // bar chords: [bass, fill1, fill2]
    var CH = { E: [40, 59, 64], A: [45, 61, 64], Am: [45, 60, 64], B7: [47, 63, 66], Em: [40, 55, 64] };
    // A section (E major) then B section (E minor); mel: [beatInBar, midi, beats]
    var A = [
      ['E',  [[0, 76, 2], [2, 75, 1]]],
      ['A',  [[0, 73, 2], [2, 71, 1]]],
      ['A',  [[0, 69, 2], [2, 68, 1]]],
      ['B7', [[0, 66, 3]]],
      ['E',  [[0, 76, 2], [2, 75, 1]]],
      ['A',  [[0, 73, 2], [2, 71, 1]]],
      ['B7', [[0, 69, 1], [1, 68, 1], [2, 66, 1]]],
      ['E',  [[0, 64, 3]]]
    ];
    var B = [
      ['Em', [[0, 71, 1], [1, 76, 1], [2, 79, 1]]],
      ['B7', [[0, 78, 2], [2, 76, 1]]],
      ['B7', [[0, 75, 1], [1, 76, 1], [2, 78, 1]]],
      ['Em', [[0, 76, 3]]],
      ['Em', [[0, 71, 1], [1, 76, 1], [2, 79, 1]]],
      ['Am', [[0, 81, 2], [2, 79, 1]]],
      ['B7', [[0, 78, 1], [1, 76, 1], [2, 75, 1]]],
      ['E',  [[0, 76, 3]]]
    ];
    var form = A.concat(A, B, B, A); // A A B B A
    var beat = 0;
    form.forEach(function (bar) {
      var ch = CH[bar[0]];
      ev.push([beat, ch[0], 0.5]);          // bass on 1
      ev.push([beat + 1, ch[1], 0.22]);     // inner voice
      ev.push([beat + 2, ch[2], 0.2]);
      bar[1].forEach(function (m) { ev.push([beat + m[0], m[1], 0.85]); });
      beat += 3;
    });
    // final low E chord arpeggio
    [40, 47, 52, 56, 59, 64].forEach(function (m, i) {
      ev.push([beat + i * 0.12, m, 0.4]);
    });
    return { events: ev, beats: beat + 4 };
  }
  function scheduleLagrima() {
    var score = lagrimaScore();
    var t0 = audioCtx.currentTime + 0.25;
    score.events.forEach(function (e) {
      var src = audioCtx.createBufferSource();
      src.buffer = pluckBuffer(e[1]);
      var g = audioCtx.createGain();
      g.gain.value = e[2];
      src.connect(g); g.connect(guitarMaster);
      src.start(t0 + e[0] * SPB);
      liveSources.push(src);
    });
    if (liveSources.length > 400) liveSources.splice(0, liveSources.length - 200);
    var totalMs = (score.beats * SPB + 3) * 1000; // 3s of rest, then again
    loopTimer = setTimeout(function () {
      if (ambientOn) scheduleLagrima();
    }, totalMs);
  }
  function actuallyStart() {
    if (ambientOn) return;
    if (audioCtx.state !== 'running') return; // 제스처 전이면 대기 (다음 터치가 재시도)
    guitarMaster = audioCtx.createGain();
    guitarMaster.gain.value = 0;
    var comp = audioCtx.createDynamicsCompressor();
    guitarMaster.connect(comp); comp.connect(audioCtx.destination);
    guitarMaster.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 1.5);
    ambientOn = true;
    scheduleLagrima();
    els.btnMusic.classList.add('on');
    toast('\u266A L\u00E1grima \u00B7 after T\u00E1rrega');
  }
  function startAmbient() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var p = audioCtx.resume();
      if (p && p.then) p.then(actuallyStart).catch(function () {});
      actuallyStart();
    } catch (e) { toast('Audio unavailable'); }
  }
  function stopAmbient() {
    ambientOn = false;
    clearTimeout(loopTimer);
    if (guitarMaster && audioCtx) {
      guitarMaster.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
      var srcs = liveSources; liveSources = [];
      setTimeout(function () {
        srcs.forEach(function (s) { try { s.stop(); } catch (e) {} });
      }, 1000);
    }
    els.btnMusic.classList.remove('on');
  }
  /* ---------- Dark mode toggle ---------- */
  var SUN_ICON = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  var MOON_ICON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  function applyDark() {
    document.body.classList.toggle('dark', !!settings.dark);
    $('darkIcon').innerHTML = settings.dark ? SUN_ICON : MOON_ICON;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', settings.dark ? '#14100A' : '#F0E9DA');
  }
  els.btnDark.addEventListener('click', function () {
    settings.dark = !settings.dark;
    saveSet();
    applyDark();
  });

  /* ---------- Tabs ---------- */
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
      t.classList.add('on');
      activeTab = t.getAttribute('data-tab');
      renderAll();
    });
  });

  /* ---------- Utils ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- One-screen guarantee ---------- */
  var mainEl = document.querySelector('main');
  function fitCheck() {
    document.body.classList.remove('tight', 'tighter');
    if (activeTab === 'history') return;
    if (mainEl.scrollHeight > mainEl.clientHeight + 2) {
      document.body.classList.add('tight');
      if (mainEl.scrollHeight > mainEl.clientHeight + 2) document.body.classList.add('tighter');
    }
  }
  window.addEventListener('resize', function () { requestAnimationFrame(fitCheck); });
  window.addEventListener('orientationchange', function () { setTimeout(fitCheck, 250); });

  /* ---------- Tick ---------- */
  var lastPhase = null;
  setInterval(function () {
    var now = new Date();
    renderHeader(now);
    var ph = state.current ? phase(now) : 'standby';
    if (activeTab === 'watch') {
      if (ph !== lastPhase) { lastPhase = ph; renderAll(); }
      else if (ph === 'active') renderActive(now, false);
    }
  }, 1000);
  setInterval(function () { fetchWeather(false); }, 30 * 60000);
  setInterval(function () { fetchNews(false); }, 60 * 60000);
  window.addEventListener('online', function () { fetchWeather(true); fetchNews(true); });

  /* ---------- Boot ---------- */
  applyDark();
  renderHeader(new Date());
  lastPhase = state.current ? phase(new Date()) : 'standby';
  renderAll();
  fetchWeather(false);
  renderTicker();
  fetchNews(false);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* ignore on file:// */ });
    });
  }
})();

/* ================= Exports for node tests ================= */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SHIFT_DEFS: SHIFT_DEFS, plausibleStart: plausibleStart, isRedDay: isRedDay,
    shiftWindow: shiftWindow, windowForStart: windowForStart,
    percent: percent, suggest: suggest, fmtHMS: fmtHMS, fmtDur: fmtDur,
    busiestHour: busiestHour, wmo: wmo, wxIndexFor: wxIndexFor,
    messageFor: messageFor, relDay: relDay, fmtWin: fmtWin, fmtDateE: fmtDateE
  };
}
