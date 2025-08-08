// Firebase Storage 규칙 예시
// Firebase Console > Storage > Rules에서 설정

// 기본 규칙 (모든 사용자에게 읽기/쓰기 허용)
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}

// 인증된 사용자만 허용하는 규칙
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}

// 갤러리 폴더에 대한 규칙
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /gallery/{scheduleId}/{fileName} {
      allow read, write: if true;
    }
    match /test/{fileName} {
      allow read, write: if true;
    }
  }
} 