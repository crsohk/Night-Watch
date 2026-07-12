# Lessons

## 2026-07-12 · 버전 표기 누락
- 실수: sw.js 버전만 올리고 index.html 하드코딩된 버전 표기(v3.3.3)를 놓침.
- 원인: 버전 문자열이 index.html / app.js / sw.js 세 곳에 중복.
- 수정: NW_VERSION(app.js) 단일 소스화, 푸터는 JS가 자동 렌더. 이제 릴리스 시 app.js와 sw.js 두 곳만 변경.
- 규칙: 버전·상수·문구를 바꿀 때는 먼저 `grep -rn`으로 전체 파일에서 모든 출현 위치를 확인한 뒤 일괄 수정한다.
