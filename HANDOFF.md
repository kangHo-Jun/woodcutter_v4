# v4 인계

## 2026-09-22 — Test 승인 후 반복 배치 비교 기능 적용

- 사용자 Test 통과 승인에 따라 기본 통합 페이지 `index.html`에 비교 버튼/창/PDF를 연결.
- 추가: `js/repeatedLayout.js`, `js/repeatedLayoutUI.js`, `css/repeated-layout.css`.
- 기존 JavaScript 전부 해시 유지. 패킹/상태/요금/main-unified 로직과 기존 PDF 경로는 수정하지 않음.
- v4의 고정 전단 14mm 규칙 보존. 비교 스냅샷은 계산을 반복하지 않고 결과 bin의 실제 유효 크기를 사용.
- 비교 후보는 미리보기이며 자동 채택/저장 결과 대체/요금 변경 없음. PDF와 버튼에는 v4 표기.
- 별도 구형 페이지 `index-mobile.html`, `index-pc-old.html`은 변경하지 않음. PC/모바일 검증은 반응형 기본 `index.html` 대상.

## 검증

- 변경 전 10개 사례의 실제 브라우저 결과를 저장하고 적용 후 배치/절단/비용/부품을 정확히 비교: 모두 일치.
- CASE1~4는 최초 Test 기준 결과와도 일치.
- 10개 사례 비교 ON/OFF, 부적합 후보 없음, 입력 변경 무효화, PDF, 직접 폼 입력 통과.
- 처음부터 390×844 모바일로 접속한 입력→계산→비교→PDF 및 기존 결과 보존 통과.
- 공유 모듈 Test 자동 검증 28/28 PASS. 복사 파일은 Test와 바이트 단위 동일.
- 비교 PDF CASE1 2페이지, CASE5 1페이지 및 기존 CASE5 PDF 다운로드 확인. CASE5 비교 PDF 렌더 검토 완료.
- 결과/화면/PDF는 `../woodcutter_Test/output/playwright/rollout-v4/`에 저장.

## 복원 및 다음 작업

- 수정 전 태그 `repeated-layout-before-20260922`, 기준 커밋 c9c7341.
- 로컬 확인: http://127.0.0.1:8766/woodcutter_v4/ (프로젝트 상위 폴더 HTTP 서버 필요).
- 로컬 파일 적용만 완료. 커밋/푸시/웹 배포는 하지 않음.
- 현장 묶음 절단 조건과 자동 후보 채택/청구 방식은 미확정.
- 기존 B 엔진 three-length-300 절단선 기록 오류는 새 비교 기능과 별개로 미해결.

## 2026-09-28 — 승인된 CASE5 기본 배치 및 PDF 롤아웃

- Test에서 승인된 좁은 CASE5 서명만 실제 기본 결과에 채택. 1220×2440, 두께 18, grain ON, trim OFF, 회전 OFF, 260×450 8개 + 260×350 8개 조건에서 반복 배치 엔진의 실제 `result`, cutDetails, 요금을 함께 반영한다. 계산은 20회 절단 / 30,000원이며 이전 v4 기본 결과 16회 / 24,000원에서 이 케이스만 변경.
- v4 고유의 14mm 고정 trim 동작(계산과 렌더링) 및 `rotatable` 기반 회전/UI 동작을 유지. 그 외 조건은 기존 엔진으로 fallback.
- 대량 입력 최적화와 공용 PDF 업데이트(페이지별 A4, 기본·비교 PDF 크기 제한)를 반영. 비교 UI는 기존/후보를 보여주는 비교 용도 그대로 유지.
- 변경된 로컬 스크립트 packer, pdfExport, main-unified, repeatedLayout, repeatedLayoutUI에 동일한 `20260928-case5-rollout-v4` query version을 사용. 이미 열려 있는 탭은 새 HTML을 다시 로드해야 새 코드가 적용된다.

## 검증

- v4 변경 전 실제 브라우저 기준 10개를 `../woodcutter_Test/output/rollout-final-v4/before/baseline10.json`에 보관. 적용 후 CASE5를 제외한 나머지 9개는 result/cost/parts 전체가 기준과 동일.
- CASE5 실제 UI: 4줄(450/450/350/350), 행 시작 y=0/264.2/528.4/792.6, 한 장, 20회, 30,000원. 화면 PNG, A4 2페이지 기본 PDF 및 PDF 2쪽 렌더 확인. 결과 JSON: `../woodcutter_Test/output/rollout-final-v4/after/results.json`.
- CASE10 유효 높이 1056mm로 v4 14mm trim 유지 확인.
- v4 실제 `js/packer.js`로 직접 로드한 대량 반복치수 검증 PASS: 690개 부품(230+460), 207장, 패턴 복사 115+92, 897회 절단, 비용 1,345,500원, 미배치 0, 7.07초. geometry/cutDetails/guillotine sequence 검증 모두 유효. 상세: `../woodcutter_Test/output/rollout-final-v4/after/bulk-results.json` (재현 스크립트 `check-bulk-v4.cjs`). Test 작업본에서 실행한 별도 공통 회귀 4/4 PASS에는 10개 기준 및 grain+trim 검사도 포함됨. 독립 PDF 브라우저 회귀(기본/비교 PDF, 모바일, 스트레스 및 fallback)는 상위 작업에서 PASS 보고됨.
- 수정 전 작업 스냅샷 태그: `approved-case5-rollout-v4-before-20260928` (기존 `repeated-layout-before-20260922` 보존).

## 남은 사항

- 로컬 작업본 변경만 완료. 상위 작업자의 최종 리뷰 후 커밋/푸시 및 배포 여부를 진행한다.
