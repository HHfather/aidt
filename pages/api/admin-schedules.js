import { db } from '../../firebaseConfig';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { region, type = 'all' } = req.query;
      
      console.log('어드민 일정 조회 요청:', { region, type });

      let allSchedules = [];

      // 1. schedules 컬렉션에서 일정 가져오기 (새로운 구조)
      try {
        const schedulesQuery = query(collection(db, 'schedules'));
        const schedulesSnapshot = await getDocs(schedulesQuery);
        
        schedulesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.isDeleted) return;
          
          // 특정 권역만 요청한 경우 필터링
          if (region && data.region !== region) return;
          
          if (data.schedule && Array.isArray(data.schedule)) {
            // schedule 배열 형태의 데이터
            data.schedule.forEach((item, index) => {
              if (item && item.date) {
                allSchedules.push({
                  id: `${doc.id}_${index}`,
                  docId: doc.id,
                  region: data.region,
                  title: data.title,
                  date: item.date,
                  time: item.time,
                  activity: item.activity,
                  location: item.location,
                  description: item.description || '',
                  details: item.details || [],
                  type: 'schedule_array',
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt
                });
              }
            });
          } else if (data.date) {
            // 개별 일정 형태의 데이터
            allSchedules.push({
              id: doc.id,
              docId: doc.id,
              region: data.region,
              title: data.title || `${data.region}권역 일정`,
              date: data.date,
              time: data.time,
              activity: data.activity || data.activityName,
              location: data.location,
              description: data.description || '',
              details: data.details || [],
              type: 'individual_schedule',
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          }
        });
      } catch (error) {
        console.error('schedules 컬렉션 조회 오류:', error);
      }

      // 2. 기존 구조의 일정도 가져오기 (region_X 형태)
      if (!region || type === 'all') {
        try {
          for (let i = 1; i <= 10; i++) {
            const regionDocRef = doc(db, 'schedules', `region_${i}`);
            const regionDoc = await getDoc(regionDocRef);
            
            if (regionDoc.exists()) {
              const regionData = regionDoc.data();
              
              // 특정 권역만 요청한 경우 필터링
              if (region && i.toString() !== region) continue;
              
              // activities 서브컬렉션에서 일정 가져오기
              try {
                const activitiesRef = collection(db, 'schedules', `region_${i}`, 'activities');
                const activitiesSnapshot = await getDocs(activitiesRef);
                
                activitiesSnapshot.forEach(activityDoc => {
                  const dateData = activityDoc.data();
                  const date = activityDoc.id;
                  
                  Object.entries(dateData).forEach(([time, activity]) => {
                    allSchedules.push({
                      id: `region_${i}_${date}_${time}`,
                      docId: `region_${i}`,
                      region: i.toString(),
                      title: regionData.title || `${i}권역 연수 일정`,
                      date: date,
                      time: time,
                      activity: activity.activity,
                      location: activity.location,
                      description: activity.description || '',
                      details: activity.details || [],
                      type: 'legacy_structure',
                      createdAt: regionData.createdAt,
                      updatedAt: regionData.updatedAt
                    });
                  });
                });
              } catch (error) {
                console.error(`region_${i} activities 조회 오류:`, error);
              }
            }
          }
        } catch (error) {
          console.error('기존 구조 일정 조회 오류:', error);
        }
      }

      // 3. 데이터 정제 및 정렬
      const processedSchedules = allSchedules.map(schedule => {
        // 식사 관련 일정인지 확인
        let isMeal = false;
        let mealType = null;
        
        if (schedule.activity?.includes('조식') || schedule.activity?.includes('아침')) {
          isMeal = true;
          mealType = 'breakfast';
        } else if (schedule.activity?.includes('중식') || schedule.activity?.includes('점심')) {
          isMeal = true;
          mealType = 'lunch';
        } else if (schedule.activity?.includes('석식') || schedule.activity?.includes('저녁')) {
          isMeal = true;
          mealType = 'dinner';
        }

        return {
          ...schedule,
          isMeal,
          mealType
        };
      });

      // 날짜순, 시간순으로 정렬
      processedSchedules.sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '00:00').localeCompare(b.time || '00:00');
      });

      // 권역별로 그룹화
      const schedulesByRegion = {};
      processedSchedules.forEach(schedule => {
        const region = schedule.region;
        if (!schedulesByRegion[region]) {
          schedulesByRegion[region] = [];
        }
        schedulesByRegion[region].push(schedule);
      });

      // 날짜별로 그룹화
      const schedulesByDate = {};
      processedSchedules.forEach(schedule => {
        const date = schedule.date;
        if (!schedulesByDate[date]) {
          schedulesByDate[date] = [];
        }
        schedulesByDate[date].push(schedule);
      });

      console.log(`어드민 일정 조회 완료: ${processedSchedules.length}개 일정, ${Object.keys(schedulesByRegion).length}개 권역`);

      res.status(200).json({
        success: true,
        totalSchedules: processedSchedules.length,
        totalRegions: Object.keys(schedulesByRegion).length,
        schedules: processedSchedules,
        schedulesByRegion: schedulesByRegion,
        schedulesByDate: schedulesByDate
      });

    } catch (error) {
      console.error('어드민 일정 조회 오류:', error);
      res.status(500).json({ success: false, error: '어드민 일정 조회 중 오류가 발생했습니다.' });
    }
  } else {
    res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' });
  }
} 