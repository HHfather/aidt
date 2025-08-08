import { db } from '../../firebaseConfig';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { scheduleManagement } from './schedule-management';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 기존 일정 데이터 조회
    const schedulesRef = collection(db, 'schedules');
    const schedulesSnapshot = await getDocs(schedulesRef);
    
    const regionSchedules = {};
    
    // 기존 데이터를 권역별로 그룹화
    schedulesSnapshot.forEach((doc) => {
      const data = doc.data();
      
      if (data.region) {
        if (!regionSchedules[data.region]) {
          regionSchedules[data.region] = [];
        }
        
        // 일정이 배열로 저장된 경우
        if (data.schedule && Array.isArray(data.schedule)) {
          data.schedule.forEach((scheduleItem) => {
            regionSchedules[data.region].push({
              ...scheduleItem,
              region: data.region
            });
          });
        } else if (data.date) {
          // 개별 일정 문서인 경우
          regionSchedules[data.region].push({
            date: data.date,
            time: data.time,
            activity: data.activity || data.activityName,
            location: data.location,
            description: data.description || '',
            details: data.details || [],
            region: data.region
          });
        }
      }
    });
    
    // 각 권역별로 새 구조로 마이그레이션
    for (const [region, schedules] of Object.entries(regionSchedules)) {
      if (schedules.length > 0) {
        // 날짜별로 그룹화
        const activitiesByDate = {};
        
        schedules.forEach((schedule) => {
          const date = schedule.date;
          if (!activitiesByDate[date]) {
            activitiesByDate[date] = [];
          }
          
          activitiesByDate[date].push({
            time: schedule.time,
            activity: schedule.activity,
            location: schedule.location,
            description: schedule.description || '',
            details: schedule.details || []
          });
        });
        
        // 각 날짜의 활동을 시간순으로 정렬
        Object.keys(activitiesByDate).forEach(date => {
          activitiesByDate[date].sort((a, b) => {
            const timeA = a.time ? a.time.replace(':', '') : '0000';
            const timeB = b.time ? b.time.replace(':', '') : '0000';
            return timeA.localeCompare(timeB);
          });
        });
        
        // 새 구조로 저장
        await scheduleManagement.createOrUpdateRegionSchedule(region, {
          guideAuthKey: region === '2' ? 'lucky' : `guide_${region}`,
          participantAuthKey: 'happy',
          activities: activitiesByDate
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: '일정 데이터 마이그레이션이 완료되었습니다.',
      migratedRegions: Object.keys(regionSchedules)
    });
    
  } catch (error) {
    console.error('마이그레이션 오류:', error);
    return res.status(500).json({
      success: false,
      error: '마이그레이션 중 오류가 발생했습니다.'
    });
  }
} 