# 국외 연수 올인원 플랫폼

국외 연수 프로그램의 전 과정을 지원하는 디지털 동반자 플랫폼입니다.

## 🎯 주요 기능

### 👨‍💼 관리자 기능
- PDF 연수 계획서 업로드 및 자동 일정 생성
- 프로젝트 생성 및 관리
- 사용자 등록 및 권한 관리
- 최종 보고서 자동 생성

### 👥 참여자 기능
- 실시간 일정 및 공지사항 확인
- 활동별 사진 업로드 및 갤러리
- 댓글 및 이모티콘 반응
- AI 댓글 도우미

### 🗺️ 가이드 기능
- 실시간 공지사항 발송
- 현장 상황 업데이트

## 🛠️ 기술 스택

- **프론트엔드**: Next.js, React, Tailwind CSS
- **백엔드**: MCP (Model Context Protocol) Server
- **데이터베이스**: Firebase Firestore
- **인증**: Firebase Authentication
- **스토리지**: Firebase Cloud Storage
- **AI**: Google Gemini API

## 🚀 시작하기

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일을 생성하고 Firebase 및 Gemini API 키를 설정하세요.

### 3. Firebase 설정
1. Firebase 콘솔에서 새 프로젝트 생성
2. Firestore Database 활성화
3. Authentication 설정 (이메일/비밀번호)
4. Cloud Storage 활성화
5. 서비스 계정 키 생성 후 `mcp-server/service-account-key.json`에 저장

### 4. 개발 서버 실행
```bash
npm run dev
```

### 5. MCP 서버 실행
```bash
npm run mcp-server
```

## 📁 프로젝트 구조

```
├── components/          # React 컴포넌트
├── contexts/           # React Context (인증 등)
├── pages/              # Next.js 페이지
│   ├── api/           # API 라우트
│   ├── admin/         # 관리자 페이지
│   ├── guide/         # 가이드 페이지
│   └── dashboard/     # 참여자 대시보드
├── mcp-server/         # MCP 서버
├── styles/            # CSS 스타일
├── firebaseConfig.js   # Firebase 설정
└── README.md
```

## 🔧 주요 설정

### Firestore 컬렉션 구조
- `projects`: 연수 프로젝트 정보
- `users`: 사용자 정보
- `photos`: 사진 메타데이터
- `comments`: 댓글
- `reactions`: 이모티콘 반응

### MCP 서버 도구
- `parse_pdf_schedule`: PDF에서 일정 추출
- `generate_ai_summary`: AI 텍스트 처리
- `create_project`: 프로젝트 생성
- `generate_final_report`: 최종 보고서 생성

## 🔒 보안 고려사항

- Firebase 보안 규칙 설정
- 환경 변수로 API 키 관리
- 역할 기반 접근 제어 (RBAC)
- 서비스 계정 키 보안 관리

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.
