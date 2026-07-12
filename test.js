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

// --- 달력 기반 판별: 밤당직은 월-금 시작, 주말 24h는 토·일 시작
ok('plausible night Mon', L.plausibleStart('night', D(2026, 7, 13, 19, 0)));
ok('implausible night Sat', !L.plausibleStart('night', D(2026, 7, 11, 19, 0)));
ok('plausible weekend Sat', L.plausibleStart('weekend', D(2026, 7, 11, 7, 0)));
ok('implausible weekend Mon', !L.plausibleStart('weekend', D(2026, 7, 13, 7, 0)));

// --- 밤당직 창: 금요일 22시 → 금 19:00 ~ 토 07:00
let w = L.shiftWindow('night', D(2026, 7, 10, 22, 0));
eq('night window Fri22', [HH(w.start), HH(w.end)], ['2026-7-10 19:00', '2026-7-11 7:00']);
w = L.shiftWindow('night', D(2026, 7, 11, 3, 0));
eq('night window Sat03 (crossed midnight)', [HH(w.start), HH(w.end)], ['2026-7-10 19:00', '2026-7-11 7:00']);

// --- 진행률
ok('percent 50%', Math.abs(L.percent(D(2026, 7, 11, 1, 0), D(2026, 7, 10, 19, 0), D(2026, 7, 11, 7, 0)) - 0.5) < 1e-9);
ok('percent clamp low', L.percent(D(2026, 7, 10, 18, 0), D(2026, 7, 10, 19, 0), D(2026, 7, 11, 7, 0)) === 0);
ok('percent clamp high', L.percent(D(2026, 7, 11, 9, 0), D(2026, 7, 10, 19, 0), D(2026, 7, 11, 7, 0)) === 1);
// 토 16시, 주말 당직(토 07 시작) = 9/24 = 37.5%
ok('percent Sat16 weekend 37.5%', Math.abs(L.percent(D(2026, 7, 11, 16, 0), D(2026, 7, 11, 7, 0), D(2026, 7, 12, 7, 0)) - 0.375) < 1e-9);

// --- 자동 판별 (교수님 사례 포함)
let s = L.suggest(D(2026, 7, 11, 16, 0)); // 토 16시 → 주말 24h, 토 07시부터 진행 중!
eq('suggest Sat16 → weekend running since 07', [s.length, s[0].type, HH(s[0].start), s[0].preStart], [1, 'weekend', '2026-7-11 7:00', false]);
s = L.suggest(D(2026, 7, 10, 22, 0));      // 금 22시 → 밤당직 진행 중
eq('suggest Fri22 → night running', [s[0].type, HH(s[0].start), s[0].preStart], ['night', '2026-7-10 19:00', false]);
s = L.suggest(D(2026, 7, 11, 10, 0));      // 토 10시 → 주말 진행 중
eq('suggest Sat10 → weekend running', [s[0].type, HH(s[0].start), s[0].preStart], ['weekend', '2026-7-11 7:00', false]);
s = L.suggest(D(2026, 7, 11, 6, 30));      // 토 06:30 → 금요 밤당직 막바지
eq('suggest Sat0630 → Fri night tail', [s[0].type, HH(s[0].start), s[0].preStart], ['night', '2026-7-10 19:00', false]);
s = L.suggest(D(2026, 7, 12, 3, 0));       // 일 03시 → 토 07시 주말 당직
eq('suggest Sun03 → weekend from Sat07', [s[0].type, HH(s[0].start)], ['weekend', '2026-7-11 7:00']);
s = L.suggest(D(2026, 7, 13, 3, 0));       // 월 03시 → 일 07시 주말 당직 꼬리
eq('suggest Mon03 → weekend from Sun07', [s[0].type, HH(s[0].start)], ['weekend', '2026-7-12 7:00']);
s = L.suggest(D(2026, 7, 14, 3, 0));       // 화 03시 → 월 19시 밤당직
eq('suggest Tue03 → night from Mon19', [s[0].type, HH(s[0].start)], ['night', '2026-7-13 19:00']);
s = L.suggest(D(2026, 7, 13, 11, 0));      // 월 11시 → 오늘 19시 예정(대기)
eq('suggest Mon11 → tonight preStart', [s[0].type, HH(s[0].start), s[0].preStart], ['night', '2026-7-13 19:00', true]);

// --- 공휴일: 평일 공휴일은 24h 당직으로 판별
ok('holiday Mon 2026-10-05 is red', L.isRedDay(D(2026, 10, 5, 12, 0)));       // 개천절 대체(월)
ok('workday Tue 2026-10-06 not red', !L.isRedDay(D(2026, 10, 6, 12, 0)));
s = L.suggest(D(2026, 10, 5, 14, 0)); // 개천절 대체휴일(월) 오후 → 24h 당직 07시부터
eq('suggest holiday Mon → 24h from 07', [s[0].type, HH(s[0].start), s[0].preStart], ['weekend', '2026-10-5 7:00', false]);
s = L.suggest(D(2028, 10, 3, 22, 0)); // 2028 추석(화) 밤 → 24h 당직 진행 중
eq('suggest Chuseok 2028 → 24h', [s[0].type, HH(s[0].start)], ['weekend', '2028-10-3 7:00']);
s = L.suggest(D(2026, 12, 25, 3, 0)); // 성탄절(금) 새벽 → 목요일 밤당직 꼬리
eq('suggest Xmas dawn → Thu night tail', [s[0].type, HH(s[0].start)], ['night', '2026-12-24 19:00']);
s = L.suggest(D(2030, 2, 4, 15, 0));  // 2030 설연휴 월요일 → 24h
eq('suggest Seollal 2030 Mon → 24h', [s[0].type, HH(s[0].start)], ['weekend', '2030-2-4 7:00']);

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

// --- 팀 로스터 만료: 저장 후 첫 07:00에 만료 (07:00 직전 2h 내 저장은 익일로)
eq('teamExpiry Fri19 → Sat07', HH(new Date(L.teamExpiry(D(2026, 7, 10, 19, 0).getTime()))), '2026-7-11 7:00');
eq('teamExpiry Sat02 (mid-duty) → Sat07', HH(new Date(L.teamExpiry(D(2026, 7, 11, 2, 0).getTime()))), '2026-7-11 7:00');
eq('teamExpiry Sat0630 (weekend prep) → Sun07', HH(new Date(L.teamExpiry(D(2026, 7, 11, 6, 30).getTime()))), '2026-7-12 7:00');
eq('teamExpiry Sat08 (24h duty) → Sun07', HH(new Date(L.teamExpiry(D(2026, 7, 11, 8, 0).getTime()))), '2026-7-12 7:00');
ok('teamExpiry legacy stamp 0 already expired', L.teamExpiry(0) < Date.now());

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
