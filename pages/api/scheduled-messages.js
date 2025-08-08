import { db } from '../../firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { region, status } = req.query;
      
      let q;
      
      // Firebase 인덱스 오류 방지를 위한 쿼리 최적화
      if (region && status) {
        // 복합 쿼리는 인덱스가 필요하므로 단순화
        q = query(
          collection(db, 'scheduledMessages'), 
          where('region', '==', region),
          orderBy('scheduledAt', 'asc')
        );
      } else if (region) {
        q = query(
          collection(db, 'scheduledMessages'), 
          where('region', '==', region),
          orderBy('scheduledAt', 'asc')
        );
      } else if (status) {
        q = query(
          collection(db, 'scheduledMessages'), 
          where('status', '==', status),
          orderBy('scheduledAt', 'asc')
        );
      } else {
        q = query(collection(db, 'scheduledMessages'), orderBy('scheduledAt', 'asc'));
      }
      
      const snapshot = await getDocs(q);
      let messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 클라이언트 사이드에서 추가 필터링 (인덱스 오류 방지)
      if (region && status) {
        messages = messages.filter(msg => msg.region === region && msg.status === status);
      }

      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      console.error('예약메시지 조회 오류:', error);
      
      // Firebase 인덱스 오류인 경우 더 자세한 오류 메시지 제공
      if (error.code === 'failed-precondition') {
        res.status(500).json({ 
          success: false, 
          error: 'Firebase 인덱스가 필요합니다. 관리자에게 문의하세요.',
          details: error.message 
        });
      } else {
        res.status(500).json({ success: false, error: '예약메시지 조회 중 오류가 발생했습니다.' });
      }
    }
  } else if (req.method === 'POST') {
    try {
      const { 
        region, 
        title, 
        content, 
        scheduledAt, 
        targetUsers, 
        messageType, 
        priority 
      } = req.body;
      
      if (!region || !title || !content || !scheduledAt) {
        return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' });
      }

      // 예약 시간 유효성 검사
      const scheduledTime = new Date(scheduledAt);
      const now = new Date();
      
      if (scheduledTime <= now) {
        return res.status(400).json({ success: false, error: '예약 시간은 현재 시간보다 이후여야 합니다.' });
      }

      const messageData = {
        region,
        title: title.trim(),
        content: content.trim(),
        scheduledAt: scheduledTime.toISOString(),
        targetUsers: targetUsers || 'all', // 'all', 'participants', 'guides'
        messageType: messageType || 'announcement', // 'announcement', 'reminder', 'emergency'
        priority: priority || 'normal', // 'low', 'normal', 'high', 'urgent'
        status: 'scheduled', // 'scheduled', 'sent', 'failed', 'cancelled'
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        sentAt: null,
        recipients: [],
        failedRecipients: [],
        retryCount: 0,
        maxRetries: 3
      };

      const docRef = await addDoc(collection(db, 'scheduledMessages'), messageData);
      
      res.status(200).json({ 
        success: true, 
        data: { id: docRef.id, ...messageData }
      });
    } catch (error) {
      console.error('예약메시지 생성 오류:', error);
      res.status(500).json({ success: false, error: '예약메시지 생성 중 오류가 발생했습니다.' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, error: '메시지 ID가 필요합니다.' });
      }

      // 업데이트할 데이터에 타임스탬프 추가
      const updateFields = {
        ...updateData,
        updatedAt: serverTimestamp()
      };

      // 예약 시간이 변경된 경우 유효성 검사
      if (updateData.scheduledAt) {
        const scheduledTime = new Date(updateData.scheduledAt);
        const now = new Date();
        
        if (scheduledTime <= now) {
          return res.status(400).json({ success: false, error: '예약 시간은 현재 시간보다 이후여야 합니다.' });
        }
      }

      await updateDoc(doc(db, 'scheduledMessages', id), updateFields);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('예약메시지 수정 오류:', error);
      res.status(500).json({ success: false, error: '예약메시지 수정 중 오류가 발생했습니다.' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, error: '메시지 ID가 필요합니다.' });
      }

      // 메시지 존재 여부 확인
      const messageDoc = await getDocs(query(collection(db, 'scheduledMessages'), where('__name__', '==', id)));
      
      if (messageDoc.empty) {
        return res.status(404).json({ success: false, error: '메시지를 찾을 수 없습니다.' });
      }

      await deleteDoc(doc(db, 'scheduledMessages', id));
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('예약메시지 삭제 오류:', error);
      res.status(500).json({ success: false, error: '예약메시지 삭제 중 오류가 발생했습니다.' });
    }
  } else {
    res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' });
  }
} 