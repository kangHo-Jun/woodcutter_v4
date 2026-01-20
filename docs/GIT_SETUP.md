# Git Auto-Commit 설정

이 파일은 Git 자동 커밋 설정을 위한 가이드입니다.

## 현재 상태
✅ Git 저장소 초기화 완료
✅ 초기 커밋 완료 (14 files, 3,186 insertions)

## 커밋 내역
```
feat: PC 버전 리뉴얼 완료

- 8개 핵심 모듈 생성
- Design System CSS 구현
- PC 중심 HTML 레이아웃
- 11개 UI/로직 개선 사항 모두 완료
```

## 자동 커밋 설정 방법

### 옵션 1: Git Hooks 사용
```bash
# .git/hooks/post-commit 파일 생성
cat > .git/hooks/post-commit << 'EOF'
#!/bin/sh
echo "Auto-commit enabled"
EOF

chmod +x .git/hooks/post-commit
```

### 옵션 2: VSCode 확장 사용
1. VSCode에서 "Git Auto Commit" 확장 설치
2. 설정에서 자동 커밋 활성화

### 옵션 3: 수동 커밋 스크립트
```bash
# commit.sh 파일 생성
#!/bin/bash
git add .
git commit -m "auto: $(date '+%Y-%m-%d %H:%M:%S') 변경사항 자동 커밋"
```

## 권장 사항
- 중요한 변경사항은 수동으로 의미있는 커밋 메시지 작성
- 자동 커밋은 개발 중 백업 용도로 사용
- 정기적으로 원격 저장소에 push

## Git 명령어 참고
```bash
# 상태 확인
git status

# 변경사항 확인
git diff

# 커밋 히스토리
git log --oneline

# 원격 저장소 추가 (필요시)
git remote add origin <repository-url>

# Push
git push -u origin main
```
