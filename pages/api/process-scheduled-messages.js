import { db } from '../../firebaseConfig';
import { collection, getDocs, updateDoc, doc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const now = new Date();
      
      // 예약된 메시지 중 발송 시간이 된 것들을 조회
      const q = query(
        collection(db, 'scheduledMessages'),
        where('status', '==', 'scheduled'),
        where('scheduledAt', '<=', now.toISOString()),
        orderBy('scheduledAt', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const messagesToProcess = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const results = [];

      for (const message of messagesToProcess) {
        try {
          // 메시지 상태를 발송 중으로 변경
          await updateDoc(doc(db, 'scheduledMessages', message.id), {
            status: 'sending',
            updatedAt: serverTimestamp()
          });

          // 실제 메시지 발송 로직 (여기서는 시뮬레이션)
          const sendResult = await simulateMessageSending(message);
          
          // 발송 결과에 따라 상태 업데이트
          await updateDoc(doc(db, 'scheduledMessages', message.id), {
            status: sendResult.success ? 'sent' : 'failed',
            sentAt: serverTimestamp(),
            recipients: sendResult.recipients || [],
            failedRecipients: sendResult.failedRecipients || [],
            updatedAt: serverTimestamp()
          });

          results.push({
            id: message.id,
            success: sendResult.success,
            message: sendResult.message
          });

        } catch (error) {
          console.error(`메시지 ${message.id} 처리 오류:`, error);
          
          // 실패한 경우 상태 업데이트
          await updateDoc(doc(db, 'scheduledMessages', message.id), {
            status: 'failed',
            updatedAt: serverTimestamp()
          });

          results.push({
            id: message.id,
            success: false,
            message: error.message
          });
        }
      }

      res.status(200).json({ 
        success: true, 
        data: {
          processed: results.length,
          results: results
        }
      });

    } catch (error) {
      console.error('예약메시지 처리 오류:', error);
      res.status(500).json({ success: false, error: '예약메시지 처리 중 오류가 발생했습니다.' });
    }
  } else {
    res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' });
  }
}

// 메시지 발송 시뮬레이션 함수
async function simulateMessageSending(message) {
  try {
    // 예약메시지를 실제 공지사항으로 변환
    const { addDoc, collection } = await import('firebase/firestore');
    
    // 현재 시간을 기준으로 하되, 일정의 위치에 따른 시간대 고려
    const now = new Date();
    
    // 기본적으로 체코 프라하 시간대 사용 (UTC+2, 여름시간)
    const pragueTime = new Date();
    const pragueOffset = 2; // 여름시간 기준
    pragueTime.setHours(pragueTime.getHours() + pragueOffset);
    
    const announcementData = {
      title: message.title,
      content: message.content,
      date: pragueTime.toISOString().split('T')[0], // 현지 날짜
      time: pragueTime.toTimeString().slice(0, 5), // 현지 시간
      region: message.region,
      createdBy: '예약 시스템',
      createdAt: pragueTime.toISOString(),
      scheduledMessageId: message.id // 원본 예약메시지 ID 저장
    };
    
    // announcements 컬렉션에 공지사항으로 저장
    await addDoc(collection(db, 'announcements'), announcementData);
    
    return {
      success: true,
      message: '예약메시지가 공지사항으로 성공적으로 발송되었습니다.',
      recipients: ['all_users'], // 모든 사용자
      failedRecipients: []
    };
    
  } catch (error) {
    console.error('예약메시지 공지사항 변환 오류:', error);
    return {
      success: false,
      message: '예약메시지 발송에 실패했습니다.',
      recipients: [],
      failedRecipients: ['all_users']
    };
  }
} 