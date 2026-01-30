# 대장간 V3 - PC 버전

PC 중심의 2D 재단 최적화 도구

## 🚀 빠른 시작

```bash
# 서버 실행
python3 -m http.server 8000

# 브라우저에서 접속
# PC 버전 (기본): http://localhost:8000/
# 모바일 버전: http://localhost:8000/index-mobile.html
```

## ✨ 주요 기능

- 📐 **판재 정보 입력**: 폭, 높이, 두께
- 🔧 **부품 관리**: 테이블 인라인 편집
- ⚙️ **고급 설정**: 톱날, 트리밍, 절단 방향/방식
- 💰 **자동 원가 계산**: 두께 기반 절단 단가
- 📊 **재단 도면**: Canvas 시각화 + 중복 제거
- 📄 **PDF 출력**: 한글 완벽 지원

## 📱 버전 정보

### PC 버전 (기본)
- 파일: `index.html`
- 2열 레이아웃, 테이블 편집, 고급 기능

### 모바일 버전
- 파일: `index-mobile.html`
- 3단계 워크플로우, 커스텀 키패드

## 📁 프로젝트 구조

```
woodcutter_v3/
├── index.html             # PC 버전 (기본)
├── index-mobile.html      # 모바일 버전
├── css/
│   └── pc-style.css       # Design System
├── js/
│   ├── state.js           # 상태 관리
│   ├── validator.js       # 검증
│   ├── costCalculator.js  # 원가 계산
│   ├── labelingEngine.js  # 라벨링
│   ├── settingsManager.js # 설정 관리
│   ├── inputHandler.js    # 입력 처리
│   ├── pdfGenerator.js    # PDF 생성
│   ├── main-pc.js         # 메인 로직
│   ├── packer.js          # 패킹 알고리즘
│   └── renderer.js        # 렌더링
└── docs/
    ├── DEVELOPMENT.md     # 개발 문서
    └── GIT_SETUP.md       # Git 설정
```

## 🎯 사용 방법

1. **판재 정보 입력**
   - 폭, 높이, 두께 입력
   - 나무결 방향 고려 여부 선택

2. **부품 추가**
   - 폭, 높이, 수량 입력
   - 테이블에서 직접 수정 가능

3. **최적화 계산**
   - "최적화 계산" 버튼 클릭
   - 결과 확인 (도면, 원가, 사용률)

4. **PDF 출력**
   - "PDF 다운로드" 버튼 클릭
   - 한글 완벽 지원

## 🔧 기술 스택

- HTML5
- CSS3 (Design System)
- Vanilla JavaScript (ES6+)
- jsPDF 2.5.1
- Canvas API

## 📝 개발 및 사용자 문서

- [프로그램 사용자 가이드 (Notion 스타일)](docs/USER_MANUAL.md) 🆕
- [개발 완료 보고서](docs/DEVELOPMENT.md)
- [Git 설정 가이드](docs/GIT_SETUP.md)

## 🎨 주요 개선 사항

### 사용성
- ✅ 테이블 인라인 편집
- ✅ 자동 단가 계산
- ✅ 폭/높이 자동 정렬
- ✅ 직관적인 나무결 설정

### 출력 품질
- ✅ PDF 한글 완벽 지원
- ✅ 중복 도면 제거
- ✅ 깔끔한 원가 정보

### 코드 품질
- ✅ 모듈화된 구조
- ✅ 실시간 검증
- ✅ 명확한 책임 분리

## 📄 라이선스

프로젝트 라이선스에 따름
