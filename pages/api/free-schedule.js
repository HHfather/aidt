import { db } from '../../firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { region } = req.query;
      
      if (!region) {
        return res.status(400).json({ success: false, error: 'region이 필요합니다.' });
      }

      const q = query(
        collection(db, 'freeSchedules'),
        where('region', '==', region),
        orderBy('date', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const schedules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.status(200).json({ success: true, data: schedules });
    } catch (error) {
      console.error('자유시간 일정 조회 오류:', error);
      res.status(500).json({ success: false, error: '자유시간 일정 조회 중 오류가 발생했습니다.' });
    }
  } else if (req.method === 'POST') {
    try {
      const { region, date, time, activity, location, description, maxParticipants, guideId } = req.body;
      
      if (!region || !date || !time || !activity) {
        return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' });
      }

      const scheduleData = {
        region,
        date,
        time,
        activity,
        location: location || '',
        description: description || '',
        maxParticipants: maxParticipants || 0,
        guideId: guideId || '',
        createdAt: serverTimestamp(),
        participants: [],
        status: 'active'
      };

      const docRef = await addDoc(collection(db, 'freeSchedules'), scheduleData);
      
      res.status(200).json({ 
        success: true, 
        data: { id: docRef.id, ...scheduleData }
      });
    } catch (error) {
      console.error('자유시간 일정 생성 오류:', error);
      res.status(500).json({ success: false, error: '자유시간 일정 생성 중 오류가 발생했습니다.' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, error: '일정 ID가 필요합니다.' });
      }

      await updateDoc(doc(db, 'freeSchedules', id), {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('자유시간 일정 수정 오류:', error);
      res.status(500).json({ success: false, error: '자유시간 일정 수정 중 오류가 발생했습니다.' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, error: '일정 ID가 필요합니다.' });
      }

      await deleteDoc(doc(db, 'freeSchedules', id));
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('자유시간 일정 삭제 오류:', error);
      res.status(500).json({ success: false, error: '자유시간 일정 삭제 중 오류가 발생했습니다.' });
    }
  } else {
    res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' });
  }
} 