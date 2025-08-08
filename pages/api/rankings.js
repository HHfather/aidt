import { db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
  try {
    const rankingsCol = collection(db, 'rankings');
    const snapshot = await getDocs(rankingsCol);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // rank 필드가 없으면 점수순으로 정렬 후 rank 부여
    data.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    data.forEach((u, i) => { u.rank = i + 1; });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}