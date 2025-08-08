import { db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  const { name, affiliation, region, authKey } = req.body;
  if (!name || !affiliation || !region || !authKey) {
    return res.status(400).json({ success: false, error: '모든 필드를 입력해주세요.' });
  }
  try {
    const schedulesCol = collection(db, 'schedules');
    const schedulesSnapshot = await getDocs(schedulesCol);
    let found = false;
    schedulesSnapshot.forEach((doc) => {
      const data = doc.data();
      // 각 문서의 모든 값(배열) 순회
      Object.values(data).forEach((item) => {
        if (Array.isArray(item)) {
          item.forEach((person) => {
            const dbName = (person.name || '').trim().toLowerCase();
            const dbAff = (person.affiliation || '').trim().toLowerCase();
            const dbRegion = (person.region || '').trim().replace(/[^0-9]/g, '');
            const inputName = name.trim().toLowerCase();
            const inputAff = affiliation.trim().toLowerCase();
            const inputRegion = region.trim().replace(/[^0-9]/g, '');
            const inputKey = authKey.trim();
            if (
              dbName === inputName &&
              dbAff === inputAff &&
              dbRegion === inputRegion &&
              inputKey === 'happy'
            ) {
              found = true;
            }
          });
        }
      });
    });
    if (found) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(200).json({ success: false });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}