import { db } from '../../firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'GET 메서드만 허용됩니다.' });
  }

  try {
    const { region } = req.query;
    
    console.log('🔍 Firebase 디버깅 시작 - 권역:', region);
    
    // 1. schedules 컬렉션 전체 조회 시도
    console.log('📋 1. schedules 컬렉션 전체 조회 시도...');
    const allSchedulesQuery = collection(db, 'schedules');
    const allSchedulesSnapshot = await getDocs(allSchedulesQuery);
    
    const allSchedules = [];
    allSchedulesSnapshot.forEach(doc => {
      allSchedules.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('✅ 전체 schedules 문서 수:', allSchedules.length);
    console.log('📄 전체 schedules 문서:', allSchedules);
    
    // 2. 특정 권역 조회 시도
    let regionSchedules = [];
    if (region) {
      console.log(`📋 2. ${region}권역 schedules 조회 시도...`);
      const regionQuery = query(
        collection(db, 'schedules'),
        where('region', '==', region)
      );
      const regionSnapshot = await getDocs(regionQuery);
      
      regionSnapshot.forEach(doc => {
        regionSchedules.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ ${region}권역 schedules 문서 수:`, regionSchedules.length);
      console.log(`📄 ${region}권역 schedules 문서:`, regionSchedules);
    }
    
    // 3. region_2 문서 직접 조회 시도
    console.log('📋 3. region_2 문서 직접 조회 시도...');
    try {
      const region2Query = query(
        collection(db, 'schedules'),
        where('__name__', '==', 'region_2')
      );
      const region2Snapshot = await getDocs(region2Query);
      
      const region2Data = [];
      region2Snapshot.forEach(doc => {
        region2Data.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ region_2 문서 조회 결과:', region2Data);
    } catch (region2Error) {
      console.error('❌ region_2 문서 조회 실패:', region2Error);
    }
    
    // 4. participants 컬렉션 조회 시도
    console.log('📋 4. participants 컬렉션 조회 시도...');
    try {
      const participantsQuery = collection(db, 'participants');
      const participantsSnapshot = await getDocs(participantsQuery);
      
      const participants = [];
      participantsSnapshot.forEach(doc => {
        participants.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ participants 문서 수:', participants.length);
    } catch (participantsError) {
      console.error('❌ participants 조회 실패:', participantsError);
    }
    
    // 5. announcements 컬렉션 조회 시도
    console.log('📋 5. announcements 컬렉션 조회 시도...');
    try {
      const announcementsQuery = collection(db, 'announcements');
      const announcementsSnapshot = await getDocs(announcementsQuery);
      
      const announcements = [];
      announcementsSnapshot.forEach(doc => {
        announcements.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ announcements 문서 수:', announcements.length);
    } catch (announcementsError) {
      console.error('❌ announcements 조회 실패:', announcementsError);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Firebase 디버깅 완료',
      data: {
        allSchedules,
        regionSchedules,
        totalSchedules: allSchedules.length,
        regionSchedulesCount: regionSchedules.length
      }
    });
    
  } catch (error) {
    console.error('❌ Firebase 디버깅 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Firebase 디버깅 중 오류가 발생했습니다.',
      details: error.message,
      stack: error.stack
    });
  }
} 