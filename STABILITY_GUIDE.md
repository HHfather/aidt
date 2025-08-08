# 🛡️ 어플리케이션 안정성 가이드

## 헬루시네이션 및 오류 방지 방법

### 1. 📝 테스트 데이터 준비
```
- 실제 사용할 일정 파일 (PDF/HWP) 미리 준비
- 참가자 명단 Excel 파일 템플릿 작성
- 각 기능별로 테스트 시나리오 작성
```

### 2. 🔍 단계별 검증
```
1단계: 로그인 → 대시보드 접근 확인
2단계: 파일 업로드 → 검증 결과 확인
3단계: 일정/활동 페이지 → 댓글/사진 기능 확인
4단계: 관리자 기능 → 공지사항/파일관리 확인
```

### 3. 🚨 오류 대응 방법
```javascript
// 항상 try-catch 사용
try {
  const result = await someFunction()
  // 성공 처리
} catch (error) {
  console.error('오류 발생:', error)
  toast.error('작업 중 오류가 발생했습니다.')
}
```

### 4. 💾 데이터 백업
```
- localStorage 데이터 정기적 확인
- Firebase 데이터 백업 설정
- 중요 파일은 로컬에도 보관
```

### 5. 🔧 디버깅 팁
```
- 브라우저 개발자 도구 Console 탭 확인
- Network 탭에서 API 요청/응답 확인
- 에러 메시지 캡처해서 문의
```

## 🗺️ Google Maps API 키 설정 가이드

### 1단계: Google Cloud Console 접속
1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" → "라이브러리" 이동

### 2단계: 필요한 API 활성화
```
현재 화면에서 진행:
1. "Maps JavaScript API" 검색 또는 클릭
2. "사용" 버튼 클릭하여 활성화
3. 활성화 완료 후 다음 단계로 진행
```

### 📋 상세 진행 방법:
1. **검색창**에 "Maps JavaScript API" 입력
2. 검색 결과에서 **"Maps JavaScript API"** 클릭
3. API 상세 페이지에서 **"사용" 버튼** 클릭
4. 활성화가 완료되면 자동으로 다음 화면으로 이동

### 3단계: API 키 생성
```
API 활성화 후 진행:
1. 좌측 메뉴에서 "사용자 인증 정보" 클릭
2. 상단의 "+ 사용자 인증 정보 만들기" 버튼 클릭
3. 드롭다운에서 "API 키" 선택
4. 생성된 API 키 복사 (나중에 사용)
```

### ⚠️ 중요한 주의사항:
- API 키가 생성되면 **즉시 복사해서 안전한 곳에 저장**하세요
- 이 키는 나중에 .env.local 파일에 붙여넣을 예정입니다

### 4단계: API 키 제한 설정 (보안)
```
애플리케이션 제한사항:
- HTTP 리퍼러 (웹사이트) 선택
- 허용할 도메인 추가:
  - localhost:3000/* (개발용)
  - yourdomain.com/* (운영용)

API 제한사항:
- Maps JavaScript API 선택
```

### 5단계: .env.local 파일 업데이트
```
기존: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=DEMO_KEY_FOR_DEVELOPMENT
변경: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```
