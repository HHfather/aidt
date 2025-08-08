# 🛠️ 개발 환경 안정화 가이드

## 🔄 반복 문제 방지 체크리스트

### 1. 브라우저 캐시 문제 해결
```bash
# 개발 서버 재시작 명령어
npm run dev -- --reset-cache
```

### 2. Next.js 캐시 정리
```bash
# .next 폴더 삭제 후 재시작
rmdir /s .next
npm run dev
```

### 3. 파일 인코딩 확인
- 모든 React 파일은 UTF-8 인코딩으로 저장
- VS Code에서 파일 → 인코딩 확인

### 4. 개발 환경 점검
```bash
# Node.js 버전 확인
node --version

# npm 캐시 정리
npm cache clean --force
```

## 🚨 문제 발생 시 순서대로 시도

### Step 1: 브라우저 새로고침
- Ctrl + Shift + R (강력 새로고침)
- 개발자 도구에서 캐시 비활성화

### Step 2: 서버 재시작
```bash
# 현재 프로세스 종료
taskkill /f /im node.exe
# 서버 재시작
npm run dev
```

### Step 3: 캐시 정리
```bash
# Next.js 캐시 삭제
rmdir /s .next
npm run dev
```

### Step 4: 의존성 재설치 (최후 수단)
```bash
rmdir /s node_modules
rmdir /s .next
npm install
npm run dev
```

## 📝 디버깅 로그 확인 방법

1. 브라우저 개발자 도구 (F12)
2. Console 탭에서 에러 메시지 확인
3. Network 탭에서 요청/응답 상태 확인
4. VS Code 터미널에서 서버 로그 확인

## ⚡ 빠른 문제 해결

**"Hello World"가 계속 보일 때:**
1. Ctrl + Shift + R로 강력 새로고침
2. 시크릿 모드에서 접속해보기
3. 다른 브라우저에서 테스트

**서버 에러가 계속될 때:**
1. 터미널에서 에러 로그 확인
2. package.json의 의존성 버전 확인
3. .env.local 파일의 환경 변수 확인
