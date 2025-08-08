import { db } from '../../firebaseConfig';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { category, content, contact, region, projectId, senderId, priority } = req.body || {};

      if (!category || !content) {
        return res.status(400).json({ success: false, error: '분류와 내용을 입력하세요.' });
      }

      const payload = {
        category, // '기능개선' | '버그신고' | '문의' | '칭찬/응원'
        content,
        contact: contact || '', // 이름/연락처(선택)
        region: (region || '').toString(),
        projectId: projectId || '',
        senderId: senderId || 'anonymous',
        priority: priority || '보통', // '보통' | '높음' | '긴급'
        status: 'open', // 'open' | 'resolved'
        archived: false,
        createdAt: new Date().toISOString(),
        createdAtTs: serverTimestamp(),
        resolvedAt: null,
      };

      const ref = await addDoc(collection(db, 'feedback'), payload);
      return res.status(200).json({ success: true, id: ref.id });
    }

    if (req.method === 'GET') {
      // 간단하게 전체 조회 후 메모리 필터 (복합 인덱스 회피)
      const { category, status, region, includeArchived } = req.query || {};
      const snap = await getDocs(collection(db, 'feedback'));
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      let filtered = items;
      if (includeArchived !== 'true') {
        filtered = filtered.filter(i => !i.archived);
      }
      if (category && category !== 'all') {
        filtered = filtered.filter(i => i.category === category);
      }
      if (status && status !== 'all') {
        filtered = filtered.filter(i => (i.status || 'open') === status);
      }
      if (region && region !== 'all') {
        filtered = filtered.filter(i => (i.region || '') === region);
      }

      filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return res.status(200).json({ success: true, data: filtered });
    }

    if (req.method === 'PATCH') {
      const { id, status, archived } = req.body || {};
      if (!id) return res.status(400).json({ success: false, error: 'id가 필요합니다.' });

      const updates = {};
      if (typeof archived === 'boolean') updates.archived = archived;
      if (status) {
        updates.status = status;
        if (status === 'resolved') {
          updates.resolvedAt = new Date().toISOString();
        }
      }

      await updateDoc(doc(db, 'feedback', id), updates);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Feedback API error:', error);
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
}


