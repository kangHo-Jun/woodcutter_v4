## 2026-11-24 — V4 자동 선택 및 절단 우선 배포 준비 완료

- 사용자 명시 승인으로 Test 검증된 자동 모음/패턴 통일 기능을 V4 이식. 기존 로컬 세로 우선/입력 길이 결 규칙도 함께 배포 범위. V4 기존 모바일 UI, 전단 fixed14, 전단 이벤트, trimMargin 기본5/검증방식, 기존 원가와 CSS 보존. V10 통째 복사 안 함.
- 실제 작업 파일 백업 ../woodcutter_Test/output/v4-auto-rollout/before 및 태그 before-auto-rollout-20261124. 실제 앱 자동 통일/UI 존재 검사 RED 후 이식 GREEN. V4 하네스178/178 PASS(기존11자동 고정 baseline, 방향/결/전단/수량/물리절단/비용/저장스냅샷, UI·원가·엔진 해시보존 포함).
- 최근10부품:937×6054/985×5451/730×5452/420×7502/485×7501,1220×2440×18,kerf4.2,결OFF/전단OFF/회전ON. 실제390px 모바일 세로 계산2장/16회24000원,가로overflow없음,도면/결과탭 정상,PDF mobile.pdf 저장.
- 원격 origin/main 4c2c65d의 CNAME만 추가된 이력을 --ff-only 통합. cut.daesan.ai/HTTPS설정 그대로 보존. 다음: main 배포 후 공개 사이트 리소스·실제 계산 확인.
- 기존 특정 결ON 입력의 절단기록 오류는 자동 후보 기능과 별개로 미수정. 원본 보존 및 새 후보 검증 정책 유지.

# v4 인계

## 2026-10-21 09:18 KST — cut.daesan.ai HTTPS 완료

- GitHub인증서approved(만료2027-01-19),실제HTTPS검증200확인후https_enforced=true활성화완료.
- https://cut.daesan.ai/ 200,HTTP301→HTTPS,기존GitHub주소최종HTTPS200,상대JS/CSS15개HTTPS200검증완료. 운영코드그대로·로컬미커밋기능미배포.
- 원격CNAME최종커밋4c2c65d는로컬통합아직안함. 다음개발푸시전fetch/정상fast-forward검토하여CNAME유지. 도메인HTTPS관련남은작업없음. 예약된후속점검은작업완료로해제처리.

## 2026-10-21 — 승인된 도메인 재등록 완료

- 사용자의명시승인후GitHub Pages도메인제거→cut.daesan.ai즉시재등록모두성공. 최종원격main4c2c65dc9cc29a45ae816301b39ba08089bddbf3,Pages built/error null. 운영21ca83b와최종차이는CNAME1줄뿐. 로컬미커밋기능미배포/원격커밋로컬통합미실행.
- HTTP200·외부DNS정상. GitHub certificate=null/https_enforced=false및HTTPS호스트불일치유지. 인증서발급은아직완료되지않음. 다음: 발급확인→HTTPS강제→최종리디렉션검증. 자동모니터미등록. 상위HANDOFF참조.

## 2026-10-21 — cut.daesan.ai DNS 연결 완료, HTTPS 발급 대기

- Aside에서 cut CNAME=kangho-jun.github.io 추가 성공. 권한NS4곳/Google/Cloudflare 반영 확인. HTTP200, 기존GitHub301→새주소 확인.
- 공개 index와JS/CSS15개가 운영21ca83b와바이트동일. 실제브라우저500×400 1개 계산1장/2회/3000원 및v4표시 확인. 기존미커밋기능 보존/미배포.
- certificate=null, HTTPS인증서호스트불일치. https_enforced 활성화 시도는 자동승인검토가 인증서미준비로 거부하여 미실행. 인증서검증성공 후 강제설정·최종검증 필요. 상위HANDOFF에 상세.
- 공식인증서복구인도메인제거·재등록도자동승인검토가일시접속중단가능성과구체적사용자승인부재로거부하여미실행. 현재cut연결유지. 사용자에게발급대기/재등록승인선택질문중.

## 2026-10-21 — cut.daesan.ai 연결 진행 중

- 사용자가 V4 연결을 최종 지정. GitHub Pages custom domain=cut.daesan.ai 등록, 원격 main에 CNAME 단독 추가 커밋3817198fa5af877d3fa8bedba5870453428ab1ff 자동 생성됨. 로컬 미배포 기능/작업트리 보존, 원격 커밋 로컬 통합은 미실행.
- 카페24 Aside 로그인 확인. DNS 추가 팝업에서 다른 작업(cadalog→Vercel) 입력이 나타나 충돌 방지를 위해 DNS 조작 중단 및 사용자 확인 대기. cut은 아직 기존 와일드카드로 daesan.ai를 가리킴.
- 다음: cut CNAME=kangho-jun.github.io 추가 → DNS 반영·인증서 발급 확인 → HTTPS 강제 → V4 공개 리소스/화면 검증. 현재 https_certificate=null/https_enforced=false로 연결 완료 아님. 상세는 상위 HANDOFF 참조.

## 2026-10-19 — V4·V10 절단 우선/입력 길이 결 규칙 이식 완료

- 사용자 이식 지시 및 각 버전 UI 차이 보존 요구에 따라 로컬 V4/V10에 이식. 수정전 태그 before-priority-grain-20261019(V4 21ca83b, V10 d2ea03d). Test의 미커밋 변경은 보존했다.
- 추가: partOrientation.js, verticalStripPacker.js, cut-priority.css. main/state/settings/packer/labeling/repeatedLayout/UI 연동 이식. 가로 기본 auto/승인 CASE5 보존, 세로 선택 재계산, 폭·길이 입력/결 안내, 원본 라벨, 설정 시점 PDF, 저장 grainRule/과거자료호환/초기화 및 회전의도 보존 적용.
- UI 보존: index에 승인된 fieldset/status/hint·폭길이 명칭·스크립트만 삽입. 해당 변경을 제거하면 수정전 index와 동일한지 자동 검사 PASS. 기존 responsive-style.css/costCalculator.js는 각각 바이트 동일. V4 고정전단14mm·전단이벤트guard 유지; V10 전단/원가필드 유지. 별도 구형 index-mobile/index-pc-old 미수정.
- TDD: 수정전 각버전11개 PASS, 고객 새방향 계약 및 신규UI 존재 RED 후 이식 GREEN. 각버전 신규·회귀51/51 PASS. Test 공통152/152 및 regression8/8 PASS. 기존 fixture/baseline 수정 없음.
- 실제 ego-browser에서 각버전11개 전체 배치·절단·잔재·요금 baseline 일치, 각사례 세로계산(물리/순차절단검증)→가로복귀 일치. 각각11PDF 다운로드 정상, 총24PDF(고객사례포함) 10MB미만. CASE10 유효폭 V4=1056, V10=1043.6 보존.
- 고객CASE12 직접폼 입력: 결ON세로1장15개, A850×546/B850×260/C400×396/D364×396,20회30000원. PC/390×844모바일 입력·도면/계산후탭 전환 PASS. 결토글복귀/새프로젝트/저장JSON/PDF미계산설정혼합방지 PASS. 고객PDF2쪽·전단사례PDF 렌더 육안 확인. 브라우저error/unhandledrejection 없음.
- 파일 복원은 실제 FileReader로 확인: 버전없는700폭×500길이5개는legacy700×500 1장, v2파일은500×700 2장. 기존UI에불러오기버튼이없어 임시 브라우저검증버튼으로기존handler호출(생산HTML추가없음); 직접evaluate파일선택은사용자활성화없어timeout,실제클릭경로는PASS. 검증용브라우저작업공간정리완료.
- V10 쭉절단 비용은 원래 Test/V4와 다름. 수정전태그 실제실행으로120폭8개12/18/24T=8000/12000/16000원,80폭12개18T=18000원확인. 이기준을보존했으며원가공식을Test로덮어쓰지않음.
- 독립리뷰: 두버전51/51 재실행 및코드검토차단사항없음. V4혼합입력120개중1개기존B절단선기록오류는수정전과bins동일확인(새회귀아님). 전역최적성보장/기존별도엔진기록오류수정은이번범위아님.
- 증거·재현: woodcutter_Test/output/rollout-priority-grain/ (browser-*.mjs, 각버전eleven-results.json/customer*.png·pdf/load-check.json, Node로그). 공용harness/grain-direction는 WOOD_TARGET=v4/v10으로실행. 계획 docs/superpowers/plans/2026-10-19-v4-v10-priority-grain.md.
- 이식은 로컬작업본에완료. 이번커밋/푸시/공개배포없음. 다음: 사용자로컬확인 후 요청에따라버전별커밋·푸시·Pages검증. 로컬URL http://127.0.0.1:8894/woodcutter_v4/ 및 /woodcutter_v10/ .

## 2026-10-13 — 계산 멈춤 방어 이식 및 푸시 승인

- 사용자 `v10, v4, test에 반영 후 푸시` 지시로 이번 v4 이식을 승인했다. 이전 v4 읽기전용 범위보다 최신 명시 요청을 우선 적용한다.
- 수정전1c532f8에 로컬복원태그freeze-before-20261013 생성. 기존packer는Test수정전태그와SHA-256동일 확인. 이미검증·배포된Test/v10의packer만복사하고 index의packerURL을20261013-partition-budget-1로변경했다. 고유main/settings/cost/UI는미수정.
- v4실제엔진신규23/23PASS. Chromium기존11사례배치/잔재/절단/요금완전동일, 전단CASE10유효폭1056mm보존. 원본24개PC/모바일뷰직접입력까지총13사례PASS,PDF13개다운로드·10MB이하·상태보존,JS예외0.
- 사진입력1장24개미배치0. PC계산4.5ms/모바일뷰4.3ms(물리휴대폰측정아님). Test/v4/v10의packer바이트동일. 노드·메모리·시간예산초과시정상baseline복귀,31개이상비트마스크방어.
- 증거 ../woodcutter_Test/output/partition-budget/v4/ 및 browser-v4.txt. 공용재현 harness/partition-budget/browser-check.cjs가v4고유규칙과공개URL검증을지원하도록보강됨.
- 이커밋을origin/main에푸시하고복원태그를원격보관한다. 최종Pages/공개사이트검증결과와세저장소커밋은상위HANDOFF.md에기록한다.

## 2026-10-08 — 잔재 치수 표시 수정 및 Test → V4/V10 이식 완료

- 사용자 지시: GitHub 수정전 백업 → Test TDD/11사례 검증 → V4/V10 이식. 세 저장소에 `2026-10-08_잔재표시_수정전` annotated tag 원격 보관 완료(Test2eaeb9a, v4 34c989f, v10 210e07a).
- 표시 전용 js/residualLabels.js 추가. 실제 톱날 차감 잔재, 소수점 이하 버림, 잔재당 가로×세로 한 문구, 동일 규격은 수량으로 묶음. 실제 분리 조각의 물리적 병합 없음. 기존 면적 표시 기준 유지.
- main-unified 연결은 계산 시점 치수를 WeakMap에 보관하고 잔재 표기만 교체. packer/cost/state/settings/repeatedLayout/repeatedLayoutUI/pdfExport 해시 수정 전과 동일. 각 버전 고유 전단·회전 유지. index에 새 모듈과 자산버전20261008-residual-1 반영.
- Test Node70/70, 기존 회귀8/8 PASS. 실제 브라우저 Test/v4/v10 각각11/11 PASS: 수정 전 전체 배치·잔재·절단·요금 동일, 실제PDF11개씩 다운로드/10MB 이하/상태 보존, 모바일CASE11 및 계산 후 설정변경에도 기존잔재표시 유지. JS 예외0. CASE4/5/11 화면과 CASE11 PDF 렌더 육안 확인. 독립 리뷰 확인된 회귀 없음.
- CASE11 기존2장/8+2회 유지, 표시649×185/1820×65/51×650. CASE4 오른쪽191×600/169×397. CASE5 4줄·20회·30,000원 유지,823×260·4개/2440×163.
- 재현: ../woodcutter_Test/harness/residual-labels/README.md, 고정 브라우저 기준3개 포함. 결과는 ../woodcutter_Test/output/residual-labels/. 과거1장 기대 CASE11은 범위변경 사유 명시 후 보관skip; 현행11사례에는skip 없음.
- 미해결: 기존 B 엔진 three-length-300 절단선 기록 이슈는 이번 표시 변경과 별개로 유지. 기본 반응형 페이지 대상이며 구형 별도 페이지는 미수정.
- 다음: 새로고침 후 재계산해 변경된 스크립트를 로드한다. 추가 재단 알고리즘 변경은 이번 범위에 포함되지 않는다.


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
