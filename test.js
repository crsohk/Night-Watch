/* Night Watch v2 핵심 로직 단위 테스트 (node test.js) */
'use strict';
const L = require('./app.js');
let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; } else { fail++; console.log('FAIL', name, '\n  got :', got, '\n  want:', want); }
}
function ok(name, cond) { cond ? pass++ : (fail++, console.log('FAIL', name)); }
const D = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi || 0, 0, 0);
const HH = (dt) => `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`;

/* 2026-07 달력: 7/10(금) 7/11(토) 7/12(일) 7/13(월) 7/14(화) */

// --- v2: 활성 유형은 밤당직 하나
eq('ACTIVE_TYPES = night only', L.ACTIVE_TYPES, ['night']);

// --- 밤당직 창: 금요일 22시 → 금 19:00 ~ 토 07:00
let w = L.shiftWindow('night', D(2026, 7, 10, 22, 0));
eq('night window Fri22', [HH(w.start), HH(w.end)], ['2026-7-10 19:00', '2026-7-11 7:00']);

// --- 자정 넘긴 새벽 3시(토) → 시작은 전날(금) 19시
w = L.shiftWindow('night', D(2026, 7, 11, 3, 0));
eq('night window Sat03 (crossed midnight)', [HH(w.start), HH(w.end)], ['2026-7-10 19:00', '2026-7-11 7:00']);

// --- 진행률
ok('percent 50%', Math.abs(L.percent(D(2026, 7, 11, 1, 0), D(2026, 7, 10, 19, 0), D(2026, 7, 11, 7, 0)) - 0.5) < 1e-9);
ok('percent clamp low', L.percent(D(2026, 7, 10, 18, 0), D(2026, 7, 10, 19, 0), D(2026, 7, 11, 7, 0)) === 0);
ok('percent clamp high', L.percent(D(2026, 7, 11, 9, 0), D(2026, 7, 10, 19, 0), D(2026, 7, 11, 7, 0)) === 1);

// --- 시작용 창
w = L.windowForStart('night', D(2026, 7, 10, 18, 30));
eq('start 18:30 → preStart today 19', [HH(w.start), w.preStart], ['2026-7-10 19:00', true]);
w = L.windowForStart('night', D(2026, 7, 10, 22, 10));
eq('start 22:10 → backdated 19:00', [HH(w.start), w.preStart], ['2026-7-10 19:00', false]);
w = L.windowForStart('night', D(2026, 7, 11, 6, 50));
eq('start 06:50 → rolls to tonight', [HH(w.start), w.preStart], ['2026-7-11 19:00', true]);

// --- 제안: 항상 밤당직 1개
let s = L.suggest(D(2026, 7, 10, 22, 0)); // 금 22시 → 진행 중 창
eq('suggest Fri22', [s.length, s[0].type, HH(s[0].start), s[0].preStart], [1, 'night', '2026-7-10 19:00', false]);
s = L.suggest(D(2026, 7, 11, 10, 0));     // 토 10시 → 오늘 19시 예정
eq('suggest Sat10 → tonight preStart', [s[0].type, HH(s[0].start), s[0].preStart], ['night', '2026-7-11 19:00', true]);
s = L.suggest(D(2026, 7, 13, 3, 0));      // 월 03시 → 일 19시 시작 창 진행 중
eq('suggest Mon03 → started Sun19', [HH(s[0].start), s[0].preStart], ['2026-7-12 19:00', false]);
s = L.suggest(D(2026, 7, 13, 11, 0));     // 월 11시 → 오늘 19시 예정
eq('suggest Mon11 → tonight preStart', [HH(s[0].start), s[0].preStart], ['2026-7-13 19:00', true]);

// --- 과거 기록용 weekend 정의는 유지 (표시용)
ok('weekend def kept for history', L.SHIFT_DEFS.weekend && L.SHIFT_DEFS.weekend.durH === 24);

// --- 포맷터
eq('fmtHMS', L.fmtHMS(3661000), '01:01:01');
eq('fmtHMS negative→0', L.fmtHMS(-5000), '00:00:00');
eq('fmtDur', L.fmtDur(12 * 3600000), '12h 00m');

// --- relDay / fmtWin
const now0 = D(2026, 7, 10, 22, 0);
eq('relDay today', L.relDay(D(2026, 7, 10, 19, 0), now0), 'Today');
eq('relDay tomorrow', L.relDay(D(2026, 7, 11, 7, 0), now0), 'Tmrw');
eq('fmtWin', L.fmtWin({ start: D(2026, 7, 10, 19, 0), end: D(2026, 7, 11, 7, 0) }, now0), 'Today 19:00 → Tmrw 07:00');

// --- 최다 시간대
const calls = [D(2026, 7, 11, 3, 10), D(2026, 7, 11, 3, 40), D(2026, 7, 11, 22, 5)].map(d => d.getTime());
eq('busiestHour', L.busiestHour(calls), { hour: 3, n: 2 });
eq('busiestHour empty', L.busiestHour([]), null);

// --- 날씨 유틸
eq('wmo clear night', L.wmo(0, 3)[0], '🌙');
eq('wmo clear day', L.wmo(0, 12)[0], '☀️');
eq('wmo rain label', L.wmo(63, 12)[1], 'Rain');
eq('fmtDateE', L.fmtDateE(D(2026, 7, 10, 22, 0)), 'FRI · JUL 10');
const times = ['2026-07-11T06:00', '2026-07-11T07:00', '2026-07-11T08:00'];
eq('wxIndexFor', L.wxIndexFor(times, D(2026, 7, 11, 7, 0)), 1);
eq('wxIndexFor miss', L.wxIndexFor(times, D(2026, 7, 12, 7, 0)), -1);

// --- 문구: 24시간 전 시간대 존재
let allMsg = true;
for (let h = 0; h < 24; h++) {
  const m = L.messageFor(new Date(2026, 6, 11, h, 0), false);
  if (!m || typeof m !== 'string') allMsg = false;
}
ok('messages exist for all 24 hours', allMsg);
ok('preStart message', L.messageFor(D(2026, 7, 10, 18, 30), true).length > 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
