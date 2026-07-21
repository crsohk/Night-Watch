/* Night Watch — offline-first service worker */
'use strict';
const VERSION = 'nightwatch-v3.5.1';

/* 핵심 자산: 이것들이 캐시되어야 오프라인 구동이 보장된다 */
const CORE = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './muhwanja-leaf.jpg',
  './fonts/lato-latin-400-normal.woff2',
  './fonts/lato-latin-700-normal.woff2',
  './fonts/lato-latin-900-normal.woff2'
];
/* 선택 자산: 실패해도 설치를 막지 않는다.
   (이전 버전은 자산 하나만 실패해도 설치 전체가 무효 → 오프라인 불능이었다) */
const OPTIONAL = [
  './snubh-logo.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(CORE)
        .then(() => Promise.allSettled(OPTIONAL.map((u) => c.add(u)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 네트워크 우선이되 무한정 기다리지 않는다: 타임아웃이 지나면 캐시로 폴백 */
function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(
      (res) => { clearTimeout(t); resolve(res); },
      (err) => { clearTimeout(t); reject(err); }
    );
  });
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // 외부 요청(날씨 API 등)은 손대지 않는다 — 네트워크 실패 시 앱이 캐시된 데이터로 처리
  if (url.origin !== location.origin || e.request.method !== 'GET') return;

  // 내비게이션: 네트워크 우선(3.5초 제한), 실패·오프라인 시 즉시 캐시
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetchWithTimeout(e.request, 3500)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // app.js도 네트워크 우선(배포 즉시 반영), 실패·타임아웃 시 캐시
  if (url.pathname.endsWith('/app.js')) {
    e.respondWith(
      fetchWithTimeout(e.request, 3500)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // 정적 자원: cache-first, 미스 시 네트워크 후 캐시에 저장
  e.respondWith(
    caches.match(e.request).then((r) => {
      if (r) return r;
      return fetch(e.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
