import { db } from '../../firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { region } = req.query;
      const debugData = {
        schedules: [],
        participants: [],
        region: region
      };

      console.log('디버그 시작 - region:', region);

      // 1. schedules 컬렉션 확인
      try {
        const schedulesQuery = query(collection(db, 'schedules'));
        const schedulesSnapshot = await getDocs(schedulesQuery);
        
        debugData.schedules = schedulesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('Schedules 컬렉션 데이터:', debugData.schedules.length, '개');
      } catch (error) {
        console.error('Schedules 조회 오류:', error);
        debugData.schedulesError = error.message;
      }

      // 2. 특정 region의 schedules 확인
      if (region) {
        try {
          const regionSchedulesQuery = query(
            collection(db, 'schedules'),
            where('region', '==', region)
          );
          const regionSchedulesSnapshot = await getDocs(regionSchedulesQuery);
          
          debugData.regionSchedules = regionSchedulesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log('Region schedules 데이터:', debugData.regionSchedules.length, '개');
        } catch (error) {
          console.error('Region schedules 조회 오류:', error);
          debugData.regionSchedulesError = error.message;
        }
      }

      // 3. 다른 region 형식들도 시도
      const regionFormats = [String(region), Number(region), `${region}권역`, `region_${region}`];
      debugData.regionFormats = regionFormats;
      
      for (const format of regionFormats) {
        try {
          const formatQuery = query(
            collection(db, 'schedules'),
            where('region', '==', format)
          );
          const formatSnapshot = await getDocs(formatQuery);
          
          if (!formatSnapshot.empty) {
            debugData.foundRegionFormat = format;
            debugData.foundRegionData = formatSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            console.log(`Region format "${format}"에서 데이터 발견:`, debugData.foundRegionData.length, '개');
            break;
          }
        } catch (error) {
          console.log(`Region format "${format}" 조회 실패:`, error.message);
        }
      }

      res.status(200).json({
        success: true,
        data: debugData
      });

    } catch (error) {
      console.error('디버그 API 오류:', error);
      res.status(500).json({
        success: false,
        error: '디버그 중 오류가 발생했습니다.',
        details: error.message
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 