# 대장간 재단 알고리즘 개발 가이드
**Development Guide for Guillotine Cutting Algorithm V4.5**

---

## 📌 문서 목적

이 문서는 **Claude Code IDE**에서 알고리즘을 구현할 때 사용하는 **실전 개발 가이드**입니다.

- **Algorithm_V4.5_Final.md**: 알고리즘의 이론적 명세 (WHAT)
- **DEVELOPMENT_GUIDE.md**: 구현 방법과 순서 (HOW) ← 이 문서

---

## 🎯 개발 원칙

### 1. 단계별 구현 (Phase-by-Phase)
```
한 번에 하나의 Phase만 구현
→ 테스트 통과 확인
→ 다음 Phase로 진행
```

### 2. 테스트 주도 개발 (Test-First)
```
기능 구현 전에 테스트 케이스 먼저 작성
→ 테스트 실패 확인
→ 기능 구현
→ 테스트 통과
```

### 3. 로깅 필수 (Debug Logging)
```python
# 모든 주요 결정에 로그 출력
print(f"[DEBUG] 현재 단계: {step}")
print(f"[SCORE] 가로={score_h:.2f}, 세로={score_v:.2f}")
```

### 4. 검증 가능한 진행 (Verifiable Progress)
```
각 Phase 완료 후 반드시:
1. pytest 실행 (자동 검증)
2. 로그 확인 (수동 검증)
3. 다음 Phase 시작
```

---

## 📁 프로젝트 구조

```
daejanggan-cutting/
├── src/
│   ├── __init__.py
│   ├── models.py          # Phase 1: 데이터 구조
│   ├── scoring.py         # Phase 2-4: 점수 계산
│   ├── fitting.py         # Phase 5: 배치 로직
│   ├── guillotine.py      # Phase 6: 메인 알고리즘
│   └── utils.py           # 유틸리티 함수
├── tests/
│   ├── __init__.py
│   ├── test_models.py     # Phase 1 테스트
│   ├── test_scoring.py    # Phase 2-4 테스트
│   ├── test_fitting.py    # Phase 5 테스트
│   └── test_cases.py      # Phase 7-8: 통합 테스트
├── examples/
│   └── example_usage.py   # 사용 예시
├── docs/
│   ├── Algorithm_V4.5_Final.md      # 알고리즘 명세
│   └── DEVELOPMENT_GUIDE.md         # 이 문서
├── README.md
├── requirements.txt
└── pytest.ini
```

---

## 🚀 Phase별 구현 가이드

### **Phase 0: 프로젝트 초기화**

**Claude Code 프롬프트:**
```
다음 프로젝트 구조를 생성해줘:

[위 폴더 구조 붙여넣기]

각 .py 파일에는:
- 빈 클래스/함수 스켈레톤만
- TODO 주석
- 타입 힌트 포함된 함수 시그니처

requirements.txt:
- pytest
- pytest-cov

README.md:
- 프로젝트 개요
- 설치 방법
- 빠른 시작 예제

아직 구현은 하지 말고 구조만 생성해줘.
```

**검증:**
- [ ] 모든 폴더/파일 생성 확인
- [ ] `pip install -r requirements.txt` 실행
- [ ] `pytest` 실행 (0개 테스트 수집됨)

---

### **Phase 1: 데이터 모델 (models.py)**

**구현 대상:**
1. `Part` 클래스
2. `Sheet` 클래스  
3. `Band` 클래스
4. `CuttingResult` 클래스

**Claude Code 프롬프트:**
```
src/models.py를 구현해줘.

요구사항:

1. Part 클래스
   - width: int
   - height: int
   - can_rotate: bool = True
   - id: str (자동 생성, 디버깅용)
   - area 프로퍼티: width * height
   - rotated() 메서드: 회전된 새 Part 반환
   - __repr__: "Part(id=xxx, 600x400)"

2. Sheet 클래스
   - WIDTH: int = 2440 (클래스 상수)
   - HEIGHT: int = 1220 (클래스 상수)
   - KERF: int = 4 (클래스 상수)
   - area 프로퍼티: WIDTH * HEIGHT

3. Band 클래스 (1차 조각)
   - orientation: Literal['H', 'V']
   - size: int (띠 높이 또는 폭)
   - parts: list[Part] (배치된 부품)
   - used_length: int (현재까지 사용한 길이)
   - add_part(part: Part) -> bool: 부품 추가 시도
   - available_length 프로퍼티: 남은 길이

4. CuttingResult 클래스 (결과 저장용)
   - bands: list[Band]
   - efficiency: float
   - total_cuts: int

tests/test_models.py에 다음 테스트 작성:
- test_part_creation
- test_part_rotation
- test_sheet_constants
- test_band_add_part
- test_band_available_length

구현 후 pytest 실행해서 모두 통과하는지 확인해줘.
```

**검증:**
- [ ] `pytest tests/test_models.py -v` 모두 통과
- [ ] Part 객체 생성 및 회전 확인
- [ ] Band에 부품 추가/제거 동작 확인

---

### **Phase 2: 기초 점수 계산 (scoring.py - Part 1)**

**구현 대상:**
1. `calc_base_score()` - 배치 효율
2. `calc_penalty()` - 슬리버 패널티

**Claude Code 프롬프트:**
```
Algorithm_V4.5_Final.md의 "3.1 S_Base"와 "3.5 P_Penalty" 섹션을 읽고
src/scoring.py에 다음 함수를 구현해줘:

def calc_base_score(placed_parts: list[Part], band: Band, sheet: Sheet) -> float:
    """
    배치된 부품들의 효율 점수
    
    공식: (배치 부품 면적 합) / (사용된 띠 전체 면적)
    
    Args:
        placed_parts: 띠에 배치된 부품들
        band: 1차 조각
        sheet: 원장
    
    Returns:
        0.0 ~ 1.0 사이의 점수
    
    주의:
    - band.orientation == 'H': 띠 면적 = band.size * sheet.WIDTH
    - band.orientation == 'V': 띠 면적 = band.size * sheet.HEIGHT
    - Kerf 고려: 실제 사용 가능 크기 = band.size - sheet.KERF
    """
    pass

def calc_penalty(remnant_width: int, remnant_height: int) -> float:
    """
    슬리버 패널티 계산
    
    문서 기준:
    - 30mm 미만 = 슬리버
    - 폭 또는 높이가 슬리버면 감점 50
    - 둘 다 슬리버면 감점 100
    
    Returns:
        0 이상의 패널티 값
    """
    SLIVER_THRESHOLD = 30
    penalty = 0
    
    # TODO: 구현
    
    return penalty

tests/test_scoring.py에 테스트 작성:
- test_base_score_full_utilization (100% 배치 → 1.0)
- test_base_score_half_utilization (50% 배치 → 0.5)
- test_base_score_empty (빈 배치 → 0.0)
- test_penalty_no_sliver (큰 잔여 → 0)
- test_penalty_one_sliver (한 변만 슬리버 → 50)
- test_penalty_both_sliver (양쪽 슬리버 → 100)

pytest 실행해서 통과 확인해줘.
```

**검증:**
- [ ] `pytest tests/test_scoring.py -v` 통과
- [ ] Kerf 반영 확인 (예: 600 - 4 = 596)

---

### **Phase 3: 연속성 점수 (scoring.py - Part 2)**

**구현 대상:**
1. `calc_continuity_score()` - Veto Rule 포함

**Claude Code 프롬프트:**
```
Algorithm_V4.5_Final.md의 "3.2 S_Continuity" 섹션을 읽고
src/scoring.py에 추가:

def calc_continuity_score(
    remnant_width: int,
    remnant_height: int,
    remaining_parts: list[Part]
) -> float:
    """
    연속성 보존 점수 (Veto Rule)
    
    Veto Rule (거부권):
    - 남은 부품 중 최대 길이 계산: L_max = max(모든 부품의 max(width, height))
    - 잔여 공간 확인: 
      if remnant_width < L_max AND remnant_height < L_max:
          return -inf (즉시 탈락)
    
    가산점 (추후 구현):
    - 잔여 영역이 넓고 뭉쳐있으면 가산점
    - 일단은 Veto만 구현하고 0.0 반환
    
    Args:
        remnant_width: 잔여 판재 폭
        remnant_height: 잔여 판재 높이
        remaining_parts: 아직 배치 안 된 부품들
    
    Returns:
        -inf (Veto) 또는 0.0 (통과)
    """
    if not remaining_parts:
        return 0.0
    
    # TODO: Veto Rule 구현
    
    return 0.0

테스트 추가:
- test_continuity_veto_triggered (공간 부족 → -inf)
- test_continuity_veto_pass (충분한 공간 → 0.0)
- test_continuity_no_parts (부품 없음 → 0.0)

pytest 실행.
```

**검증:**
- [ ] Veto Rule 정확히 동작
- [ ] `float('-inf')` 올바르게 처리

---

### **Phase 4: 미래 예측 점수 (scoring.py - Part 3)**

**구현 대상:**
1. `calc_lookahead_score()` - 간단한 Greedy 버전

**Claude Code 프롬프트:**
```
Algorithm_V4.5_Final.md의 "3.3 S_Lookahead" 섹션을 읽고
src/scoring.py에 추가:

def calc_lookahead_score(
    remnant_width: int,
    remnant_height: int,
    remaining_parts: list[Part]
) -> float:
    """
    1-Depth Greedy Lookahead
    
    단순화된 로직:
    1. 남은 부품을 면적 큰 순으로 정렬
    2. 가상으로 First-Fit 배치 시뮬레이션
    3. (배치 가능 면적) / (잔여 면적)
    
    주의:
    - 복잡한 재귀 없이 단순 Greedy만
    - 회전은 고려하지 않음 (속도 우선)
    - Kerf는 무시 (근사치로 충분)
    
    Returns:
        0.0 ~ 1.0 사이의 예상 수율
    """
    if not remaining_parts:
        return 0.0
    
    remnant_area = remnant_width * remnant_height
    if remnant_area <= 0:
        return 0.0
    
    # TODO: Greedy 시뮬레이션
    # 힌트: sorted(remaining_parts, key=lambda p: p.area, reverse=True)
    
    return 0.0

테스트:
- test_lookahead_all_fit (모두 들어감 → 1.0)
- test_lookahead_none_fit (아무것도 안 들어감 → 0.0)
- test_lookahead_partial (일부만 들어감 → 0.0~1.0)

pytest 실행.
```

**검증:**
- [ ] 간단한 케이스 동작 확인
- [ ] 성능 문제 없음 (빠르게 실행)

---

### **Phase 5: 배치 로직 (fitting.py)**

**구현 대상:**
1. `fits_in_band()` - 부품이 띠에 들어가는지 체크
2. `try_fit_with_rotation()` - 회전 포함 배치 시도
3. `calc_rotation_bonus()` - 회전 보너스 계산

**Claude Code 프롬프트:**
```
Algorithm_V4.5_Final.md의 "3.4 S_Rotation" 섹션을 읽고
src/fitting.py를 구현해줘:

def fits_in_band(
    part: Part,
    band: Band,
    sheet: Sheet
) -> bool:
    """
    부품이 띠에 들어가는지 확인
    
    로직:
    - H 방향: 부품 높이 <= (band.size - KERF) AND 
             (band.used_length + 부품 폭) <= sheet.WIDTH
    - V 방향: 부품 폭 <= (band.size - KERF) AND
             (band.used_length + 부품 높이) <= sheet.HEIGHT
    """
    pass

def calc_rotation_bonus(part: Part, band_size: int) -> float:
    """
    회전 정합 보너스
    
    문서 기준:
    - 부품의 width 또는 height가 band.size와 정확히 일치하면 +10점
    - 일치 없으면 0점
    """
    if part.width == band_size or part.height == band_size:
        return 10.0
    return 0.0

def try_fit_with_rotation(
    part: Part,
    band: Band,
    sheet: Sheet
) -> dict | None:
    """
    원본 + 회전 모두 시도
    
    Returns:
        성공 시: {
            'part': Part (원본 또는 회전된 것),
            'rotated': bool,
            'bonus': float
        }
        실패 시: None
    """
    results = []
    
    # 원본 시도
    if fits_in_band(part, band, sheet):
        results.append({
            'part': part,
            'rotated': False,
            'bonus': calc_rotation_bonus(part, band.size)
        })
    
    # 회전 시도
    if part.can_rotate:
        rotated_part = part.rotated()
        if fits_in_band(rotated_part, band, sheet):
            results.append({
                'part': rotated_part,
                'rotated': True,
                'bonus': calc_rotation_bonus(rotated_part, band.size)
            })
    
    # 보너스 높은 쪽 선택
    return max(results, key=lambda r: r['bonus']) if results else None

tests/test_fitting.py에 테스트:
- test_fits_in_band_horizontal
- test_fits_in_band_vertical
- test_rotation_bonus
- test_try_fit_original_only
- test_try_fit_rotation_better

pytest 실행.
```

**검증:**
- [ ] 회전 로직 정확히 동작
- [ ] Kerf 반영 확인

---

### **Phase 6: 메인 알고리즘 (guillotine.py)**

**구현 대상:**
1. `select_candidates()` - 후보 높이 선정
2. `score_scenario()` - 한 방향 점수 계산
3. `guillotine_cut()` - 메인 재귀 함수

**Claude Code 프롬프트:**
```
Algorithm_V4.5_Final.md의 "4. 프로세스 흐름"을 읽고
src/guillotine.py의 핵심 3개 함수를 구현해줘:

1. select_candidates() 함수:

def select_candidates(parts: list[Part], top_k: int = 5) -> list[int]:
    """
    1차 조각 후보 높이 선정
    
    문서 기준:
    - 후보 1: 가장 큰 부품의 치수
    - 후보 2: 가장 빈번한 치수 (Mode)
    - 후보 3: 회전 고려 치수
    
    Args:
        parts: 배치할 부품 리스트
        top_k: 최대 후보 개수 (기본 5개)
    
    Returns:
        후보 높이 리스트 (내림차순 정렬)
    """
    candidates = set()
    
    # 모든 부품의 높이/폭 수집
    for p in parts:
        candidates.add(p.height)
        candidates.add(p.width)
    
    # 최빈값 추가
    from collections import Counter
    heights = [p.height for p in parts]
    if heights:
        most_common = Counter(heights).most_common(1)[0][0]
        candidates.add(most_common)
    
    return sorted(candidates, reverse=True)[:top_k]


2. score_scenario() 함수:

def score_scenario(
    orientation: Literal['H', 'V'],
    candidate_size: int,
    parts: list[Part],
    sheet: Sheet,
    debug: bool = False
) -> dict:
    """
    한 방향 시나리오의 점수 계산
    
    프로세스:
    1. Band 생성
    2. 부품들을 회전 포함해서 배치 시도
    3. 각 점수 계산 (Base, Continuity, Lookahead, Rotation, Penalty)
    4. 가중치 적용한 총점 계산
    
    Returns:
        {
            'orientation': str,
            'band_size': int,
            'placed_parts': list[Part],
            'scores': {
                'base': float,
                'continuity': float,
                'lookahead': float,
                'rotation': float,
                'penalty': float
            },
            'total_score': float
        }
    """
    # TODO: 구현
    # 힌트: fitting.try_fit_with_rotation() 사용
    # 힌트: scoring의 모든 함수 호출
    # 힌트: 가중치 적용 (Algorithm_V4.5_Final.md 참조)
    pass


3. guillotine_cut() 메인 함수:

def guillotine_cut(
    sheet: Sheet,
    parts: list[Part],
    depth: int = 0,
    max_depth: int = 10
) -> CuttingResult:
    """
    메인 재귀 함수
    
    프로세스:
    1. 종료 조건 체크
    2. 후보 높이 선정
    3. 가로/세로 양방향 시뮬레이션
    4. 높은 점수 방향 선택
    5. 배치 실행
    6. 남은 부품으로 재귀
    
    Args:
        sheet: 원장
        parts: 배치할 부품들
        depth: 현재 재귀 깊이
        max_depth: 최대 재귀 깊이
    
    Returns:
        CuttingResult 객체
    """
    print(f"{'  ' * depth}[Depth {depth}] 남은 부품: {len(parts)}개")
    
    # 종료 조건
    if not parts or depth >= max_depth:
        return CuttingResult(bands=[], efficiency=0.0, total_cuts=0)
    
    # TODO: 구현
    pass

일단 재귀는 1단계만 실행하도록 (재귀 호출 주석 처리).
단순 케이스로 동작 확인 후 점진적으로 완성.
```

**검증:**
- [ ] 부품 1개 케이스 실행
- [ ] 로그 출력 확인
- [ ] 점수 계산 정확성 확인

---

### **Phase 7: V5 케이스 테스트**

**Claude Code 프롬프트:**
```
Algorithm_V4.5_Final.md의 "5. 엣지 케이스 - V5 (회전의 마법)"을 
tests/test_cases.py에 구현해줘:

def test_v5_rotation_case():
    """
    부품:
    - Part(1200, 640)
    - Part(600, 600)
    
    기대:
    - 600×600을 회전시켜 640 높이 띠에 함께 배치
    - 효율 95% 이상
    """
    sheet = Sheet()
    parts = [
        Part(1200, 640),
        Part(600, 600)
    ]
    
    result = guillotine_cut(sheet, parts)
    
    # 검증
    assert len(result.bands) > 0
    assert result.efficiency >= 0.95
    
    # 디버깅 출력
    print(f"\n=== V5 테스트 결과 ===")
    print(f"배치된 띠: {len(result.bands)}개")
    print(f"효율: {result.efficiency:.2%}")
    for i, band in enumerate(result.bands):
        print(f"Band {i}: {band.orientation} {band.size}mm, "
              f"부품 {len(band.parts)}개")

pytest -v tests/test_cases.py::test_v5_rotation_case -s

실패하면:
1. 어느 점수가 문제인지 분석
2. debug=True로 점수 출력
3. 수정 제안
```

**검증:**
- [ ] V5 케이스 통과
- [ ] 회전 로직 제대로 동작
- [ ] 점수 계산 합리적

---

### **Phase 8: V10 케이스 테스트**

**Claude Code 프롬프트:**
```
tests/test_cases.py에 V10 케이스 추가:

def test_v10_tetris_case():
    """
    부품:
    - Part(2440, 1220) × 2
    - Part(2440, 800) × 3
    
    기대:
    - 세로 3단 절단으로 100% 효율
    - Lookahead가 이를 감지해야 함
    """
    sheet = Sheet()
    parts = [
        Part(2440, 1220),
        Part(2440, 1220),
        Part(2440, 800),
        Part(2440, 800),
        Part(2440, 800),
    ]
    
    result = guillotine_cut(sheet, parts)
    
    # 검증
    total_area = sum(p.area for p in parts)
    expected_efficiency = total_area / sheet.area
    
    print(f"\n=== V10 테스트 결과 ===")
    print(f"기대 효율: {expected_efficiency:.2%}")
    print(f"실제 효율: {result.efficiency:.2%}")
    
    assert result.efficiency >= 0.99  # 오차 1% 허용

pytest -v tests/test_cases.py::test_v10_tetris_case -s
```

**검증:**
- [ ] V10 케이스 통과
- [ ] Lookahead가 최적 경로 찾음

---

## 🐛 디버깅 가이드

### 점수가 이상할 때
```python
# guillotine.py의 score_scenario()에서
if debug:
    print(f"\n=== {orientation} 시나리오 (크기={candidate_size}) ===")
    print(f"배치 부품: {len(placed_parts)}개")
    for key, val in scores.items():
        print(f"  {key:12s}: {val:8.3f}")
    print(f"  {'TOTAL':12s}: {total_score:8.3f}")
```

### 회전이 안 될 때
```python
# fitting.py의 try_fit_with_rotation()에서
print(f"[FIT] 부품 {part.id}: 원본={fits_original}, 회전={fits_rotated}")
print(f"      원본 보너스={bonus_original}, 회전 보너스={bonus_rotated}")
```

### Veto가 예상과 다를 때
```python
# scoring.py의 calc_continuity_score()에서
print(f"[VETO] 잔여={remnant_width}×{remnant_height}, "
      f"최대필요={max_length}, Veto={is_vetoed}")
```

---

## ✅ 최종 체크리스트

### Phase 완료 확인
- [ ] Phase 1: 데이터 모델 (pytest 5개 이상 통과)
- [ ] Phase 2: Base + Penalty (pytest 6개 이상 통과)
- [ ] Phase 3: Continuity (pytest 3개 이상 통과)
- [ ] Phase 4: Lookahead (pytest 3개 이상 통과)
- [ ] Phase 5: Fitting (pytest 5개 이상 통과)
- [ ] Phase 6: 메인 알고리즘 (단순 케이스 동작)
- [ ] Phase 7: V5 케이스 통과
- [ ] Phase 8: V10 케이스 통과

### 문서 확인
- [ ] README.md 업데이트 (사용법)
- [ ] requirements.txt 최신화
- [ ] 예제 코드 작성 (examples/example_usage.py)

### 코드 품질
- [ ] 타입 힌트 모두 추가
- [ ] Docstring 모두 작성
- [ ] pytest 커버리지 80% 이상
- [ ] 로그 출력 적절함

---

## 📞 문제 해결 프롬프트 템플릿

### 테스트 실패 시
```
tests/test_xxx.py의 test_yyy가 실패했어.

에러 메시지:
[에러 복사]

다음을 분석해줘:
1. 왜 실패했는지
2. 어느 함수가 문제인지
3. 어떻게 고쳐야 하는지

디버깅 로그를 추가해서 문제를 정확히 찾아줘.
```

### 알고리즘이 이상할 때
```
V5 케이스에서 회전을 안 쓰고 비효율적으로 배치해.

debug=True로 점수를 출력했더니:
[점수 복사]

다음을 확인해줘:
1. 회전 보너스가 제대로 계산됐나?
2. 가중치가 적절한가?
3. Lookahead가 영향을 줬나?

수정 방안을 제시해줘.
```

---

## 🎓 마지막 조언

1. **서두르지 말기**
   - 한 Phase 완벽히 끝내고 다음으로
   - 테스트 통과가 최우선

2. **로그 많이 보기**
   - 알고리즘이 "왜" 그 선택을 했는지 추적
   - 점수 출력으로 직관 확인

3. **문서 자주 참조**
   - Algorithm_V4.5_Final.md가 정답
   - 헷갈리면 문서로 돌아가기

4. **Claude Code 믿기**
   - 막히면 분석 요청
   - Claude가 스스로 디버깅

**좋은 코딩 되세요!** 🚀

---

## 📎 관련 문서

- `Algorithm_V4.5_Final.md` - 알고리즘 이론적 명세
- `README.md` - 프로젝트 개요 및 빠른 시작
- `examples/example_usage.py` - 사용 예제

---

*Last Updated: 2025-02-05*
*For: Claude Code IDE Development*
