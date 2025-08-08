import { db } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ 
          success: false, 
          error: '일정 ID가 필요합니다.' 
        });
      }

      // 일정 정보 조회
      const scheduleRef = doc(db, 'schedules', id);
      const scheduleDoc = await getDoc(scheduleRef);

      if (scheduleDoc.exists()) {
        const scheduleData = scheduleDoc.data();
        return res.status(200).json({
          success: true,
          schedule: {
            id: scheduleDoc.id,
            ...scheduleData
          }
        });
      } else {
        // schedules 컬렉션에서 찾지 못한 경우 activities 컬렉션에서도 찾아보기
        const activityRef = doc(db, 'activities', id);
        const activityDoc = await getDoc(activityRef);

        if (activityDoc.exists()) {
          const activityData = activityDoc.data();
          return res.status(200).json({
            success: true,
            schedule: {
              id: activityDoc.id,
              ...activityData
            }
          });
        }

        return res.status(404).json({
          success: false,
          error: '해당 일정을 찾을 수 없습니다.'
        });
      }

    } catch (error) {
      console.error('일정 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '일정을 불러오는 중 오류가 발생했습니다.'
      });
    }
  } else {
    res.status(405).json({
      success: false,
      error: '허용되지 않는 메서드입니다.'
    });
  }
} 