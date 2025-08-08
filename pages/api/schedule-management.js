import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { region, date } = req.query;
      
      if (!region) {
        return res.status(400).json({ 
          success: false, 
          error: 'region 파라미터가 필요합니다.' 
        });
      }

      // 스케줄 조회
      const schedulesRef = collection(db, 'schedules');
      let schedulesQuery;
      
      if (date) {
        // 특정 날짜의 스케줄 조회
        schedulesQuery = query(
          schedulesRef,
          where('region', '==', region),
          where('date', '==', date)
        );
      } else {
        // 해당 권역의 모든 스케줄 조회
        schedulesQuery = query(
          schedulesRef,
          where('region', '==', region)
        );
      }
      
      const schedulesSnapshot = await getDocs(schedulesQuery);
      const schedules = [];

      schedulesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.schedule && Array.isArray(data.schedule)) {
          data.schedule.forEach((item, index) => {
          schedules.push({
              id: `${doc.id}_${index}`,
              date: item.date,
              time: item.time,
              activity: item.activity,
              location: item.location,
              description: item.description,
              region: data.region
            });
          });
        }
      });
      
      // 날짜별로 그룹화
      const activitiesByDate = {};
      schedules.forEach(schedule => {
        const dateKey = schedule.date;
        if (!activitiesByDate[dateKey]) {
          activitiesByDate[dateKey] = [];
        }
        activitiesByDate[dateKey].push(schedule);
      });

      res.status(200).json({
        success: true,
        schedules: schedules,
        activities: activitiesByDate,
        message: '스케줄 데이터를 성공적으로 조회했습니다.'
      });

    } catch (error) {
      console.error('스케줄 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '스케줄 조회 중 오류가 발생했습니다.' 
      });
    }
  } else {
    res.status(405).json({ 
      success: false, 
      error: '허용되지 않는 메서드입니다.' 
    });
  }
} 