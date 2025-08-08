// Firestore 전체 백업 스크립트 (수동 실행용)
// schedules, participants, assignments 컬렉션을 모두 백업
import { db } from '../firebaseConfig';
import { getDocs, collection } from 'firebase/firestore';

export async function backupFirestore() {
  const collections = ['schedules', 'participants', 'assignments'];
  const backup = {};
  for (const col of collections) {
    const snapshot = await getDocs(collection(db, col));
    backup[col] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  // 결과를 JSON으로 반환
  return backup;
}

// 사용 예시:
// backupFirestore().then(data => console.log(JSON.stringify(data, null, 2)))
