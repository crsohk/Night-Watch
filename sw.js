/* Night Watch — offline-first service worker */
'use strict';
const VERSION = 'nightwatch-v2.5.0';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './snubh_hi.jpg',
  './muhwanja-leaf.jpg',
  './fonts/lato-latin-400-normal.woff2',
  './fonts/lato-latin-700-normal.woff2',
  './fonts/lato-latin-900-normal.woff2',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // 외부 요청(날씨 API 등)은 손대지 않는다 — 네트워크 실패 시 앱이 캐시된 데이터로 처리
  if (url.origin !== location.origin || e.request.method !== 'GET') return;

  // 내비게이션은 캐시된 index.html로 (완전 오프라인 구동)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then((r) => r || fetch(e.request))
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
