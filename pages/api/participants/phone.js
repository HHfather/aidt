import { db } from '../../../firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

async function getScheduleDocRef(region) {
    const regionFormats = [
        String(region),
        Number(region),
        `${region}권역`,
        `region_${region}`
    ];
    
    for (const format of regionFormats) {
        const q = query(collection(db, 'schedules'), where('region', '==', format));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return snapshot.docs[0].ref;
        }
    }
    return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { userId, phoneNumber, region } = req.body;

    console.log('API 요청 받음:', { userId, phoneNumber, region });

    if (!userId || !phoneNumber || !region) {
      console.error('필수 값 누락:', { userId, phoneNumber, region });
      return res.status(400).json({ success: false, error: 'User ID, phone number, and region are required' });
    }

    const scheduleDocRef = await getScheduleDocRef(region);
    if (!scheduleDocRef) {
      console.error('스케줄 문서를 찾을 수 없음:', region);
      return res.status(404).json({ success: false, error: 'Schedule for the region not found' });
    }

    // getDoc을 사용하여 문서 데이터 가져오기
    const scheduleDoc = await getDoc(scheduleDocRef);
    if (!scheduleDoc.exists()) {
      console.error('스케줄 문서가 존재하지 않음');
      return res.status(404).json({ success: false, error: 'Schedule document does not exist' });
    }

    const scheduleData = scheduleDoc.data();
    console.log('스케줄 문서 데이터:', scheduleData);

    // participants 배열이 있는지 확인
    let participants = scheduleData.participants || [];
    console.log('기존 참여자 수:', participants.length);

    // 기존 참여자 정보 찾기
    const oldParticipant = participants.find(p => p.id === userId);
    
    if (oldParticipant) {
      console.log('기존 참여자 찾음:', oldParticipant.name);
      // 기존 정보가 있으면 먼저 제거
      await updateDoc(scheduleDocRef, {
        participants: arrayRemove(oldParticipant)
      });
    } else {
      console.log('기존 참여자를 찾을 수 없음, 새로 생성합니다:', userId);
      
      // 기존 참여자가 없으면 기본 정보로 새로 생성
      const newParticipant = {
        id: userId,
        name: `참가자${userId}`,
        affiliation: '소속 정보 없음',
        region: region,
        phone: phoneNumber
      };
      
      console.log('새 참가자 생성:', newParticipant);
      
      await updateDoc(scheduleDocRef, {
        participants: arrayUnion(newParticipant)
      });
      
      console.log('새 참가자 전화번호 저장 완료');
      return res.status(200).json({ success: true, message: 'New participant created with phone number' });
    }

    // 기존 참가자가 있는 경우 전화번호만 업데이트
    const newParticipant = {
      ...oldParticipant,
      phone: phoneNumber
    };
    
    console.log('기존 참가자 전화번호 업데이트:', newParticipant);
    
    await updateDoc(scheduleDocRef, {
      participants: arrayUnion(newParticipant)
    });

    console.log('전화번호 저장 완료');
    res.status(200).json({ success: true, message: 'Phone number saved successfully' });
  } catch (error) {
    console.error('Phone number save error:', error);
    res.status(500).json({ success: false, error: 'Failed to save phone number' });
  }
} 