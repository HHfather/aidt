# 📋 Google Maps API 키 설정 체크리스트

## ✅ 단계별 진행 상황

### 1단계: Google Cloud Console 설정
- [x] Google Cloud Console 프로젝트 생성
- [x] Maps JavaScript API 활성화
- [x] API 키 생성
- [ ] 보안 제한 설정 (HTTP 리퍼러)

### 2단계: 로컬 환경 설정
```bash
# .env.local 파일에서 다음 줄을 수정:
# 기존
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=DEMO_KEY_FOR_DEVELOPMENT

# 변경 완료! ✅
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDbzEhR2rzqQq3vGJorUjAvvPR7cbQhyr8
```

### 3단계: 테스트
- [ ] 서버 재시작: `npm run dev`
- [ ] 대시보드 지도 기능 확인
- [ ] 오후/저녁 활동 페이지 지도 확인
- [ ] 브라우저 콘솔에서 지도 로딩 오류 확인

## 🚨 주의사항
```
1. API 키는 절대 GitHub에 커밋하지 마세요!
2. .env.local 파일은 .gitignore에 포함되어 있는지 확인
3. 운영 환경에서는 별도의 환경변수 설정 필요
4. API 사용량 모니터링 (무료 한도 초과 방지)
```

## 🔧 문제 해결
```
지도가 로딩되지 않는 경우:
1. 브라우저 개발자 도구 → Console 탭 확인
2. "Google Maps API error" 메시지 확인
3. API 키 유효성 및 제한사항 재확인
4. 네트워크 연결 상태 확인
```
