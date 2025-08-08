import { db, storage } from '../../firebaseConfig';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { region, date, allDates } = req.query;

      // 모든 날짜 데이터 요청 시
      if (allDates === 'true') {
        if (!region) {
          return res.status(400).json({ 
            success: false, 
            error: 'region 파라미터가 필요합니다.' 
          });
        }
      } else {
        // 기존 단일 날짜 요청
        if (!region || !date) {
          return res.status(400).json({ 
            success: false, 
            error: 'region과 date 파라미터가 필요합니다.' 
          });
        }
      }

      // 식사 관련 일정 조회
      let mealSchedules = [];
      try {
        const schedulesRef = collection(db, 'schedules');
        const schedulesQuery = query(
          schedulesRef,
          where('region', '==', region),
          where('date', '==', date)
        );

        const schedulesSnapshot = await getDocs(schedulesQuery);
        
        schedulesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.schedule && Array.isArray(data.schedule)) {
            data.schedule.forEach((item, index) => {
              // 식사 관련 일정 필터링
              if (item.activity && (
                item.activity.includes('조식') || 
                item.activity.includes('중식') || 
                item.activity.includes('석식') ||
                item.activity.includes('아침') ||
                item.activity.includes('점심') ||
                item.activity.includes('저녁') ||
                item.activity.includes('식사')
              )) {
                mealSchedules.push({
                  id: `${doc.id}_${index}`,
                  date: item.date,
                  time: item.time,
                  activity: item.activity,
                  location: item.location,
                  description: item.description,
                  region: data.region
                });
              }
            });
          }
        });
      } catch (error) {
        console.error('일정 조회 오류:', error);
        // 일정 조회 실패해도 계속 진행
      }

      // 식사 갤러리 이미지 조회
      let images = [];
      try {
        const mealsGalleryRef = collection(db, 'gallery');
        let galleryQuery;
        
        console.log('--- Meals Gallery Query ---');
        console.log('Region:', region);
        console.log('AllDates:', allDates);
        
        if (allDates === 'true') {
          // 단순한 쿼리로 먼저 시도 (복합 인덱스 문제 방지)
          galleryQuery = query(
            mealsGalleryRef,
            where('type', '==', 'meal')
          );
          console.log('Query: type == meal (all dates)');
        } else {
          // 특정 날짜의 식사 데이터 조회
          galleryQuery = query(
            mealsGalleryRef,
            where('region', '==', region),
            where('date', '==', date),
            where('type', '==', 'meal')
          );
          console.log('Query: region == ', region, ', date == ', date, ', type == meal');
        }

        const gallerySnapshot = await getDocs(galleryQuery);
        console.log('Found documents:', gallerySnapshot.size);

        gallerySnapshot.forEach(doc => {
          const data = doc.data();
          console.log('Document data:', {
            id: doc.id,
            type: data.type,
            region: data.region,
            date: data.date,
            mealType: data.mealType
          });
          
          // allDates=true일 때는 region 필터링을 코드에서 처리
          if (allDates === 'true' && data.region !== region) {
            return; // skip this document
          }
          
          images.push({
            id: doc.id,
            imageUrl: data.imageUrl || data.url,
            description: data.description,
            uploadedAt: data.uploadedAt?.toDate?.() || data.uploadedAt,
            uploadedBy: data.uploadedBy,
            mealType: data.mealType,
            region: data.region,
            date: data.date,
            type: data.type,
            emojis: data.emojis || [],
            comments: data.comments || []
          });
        });
        
        console.log('Filtered images count:', images.length);
      } catch (error) {
        console.error('갤러리 이미지 조회 오류:', error);
        // 갤러리 조회 실패해도 계속 진행
      }

      // 더미 이미지 데이터 (실제 구현 시 제거)
      if (images.length === 0) {
        // 식사 일정이 있지만 이미지가 없는 경우 더미 데이터 제공
        if (mealSchedules.length > 0) {
          images.push({
            id: 'dummy-1',
            url: 'https://via.placeholder.com/400x300/FF6B35/FFFFFF?text=식사+사진+예시',
            description: '오늘의 식사 사진을 업로드해보세요!',
            uploadedAt: new Date(),
            uploadedBy: { name: '시스템' },
            mealType: '중식',
            region: region,
            date: date
          });
        }
      }

      // 날짜별, 식사종류별 그룹화
      const groupedData = {};
      
      images.forEach(image => {
        const dateKey = image.date;
        const mealType = image.mealType || '기타';
        
        if (!groupedData[dateKey]) {
          groupedData[dateKey] = {};
        }
        
        if (!groupedData[dateKey][mealType]) {
          groupedData[dateKey][mealType] = [];
        }
        
        groupedData[dateKey][mealType].push(image);
      });

      // 날짜별로 정렬된 키 생성
      const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(b) - new Date(a));

      res.status(200).json({
        success: true,
        images: images,
        groupedData: groupedData,
        sortedDates: sortedDates,
        mealSchedules: mealSchedules,
        message: allDates === 'true' ? 
          '모든 식사 갤러리 데이터를 성공적으로 조회했습니다.' : 
          '식사 갤러리 데이터를 성공적으로 조회했습니다.'
      });

    } catch (error) {
      console.error('식사 갤러리 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '식사 갤러리 조회 중 오류가 발생했습니다.' 
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { region, date, mealType } = req.query;
      
      console.log('DELETE 요청 받음:', { region, date, mealType });
      
      if (!region || !date) {
        return res.status(400).json({ 
          success: false, 
          error: 'region과 date 파라미터가 필요합니다.' 
        });
      }

      // 조식 관련 데이터만 삭제
      const targetMealType = mealType || '조식';
      
      console.log(`조식 데이터 삭제 시작: region=${region}, date=${date}, mealType=${targetMealType}`);

      // 갤러리에서 조식 관련 이미지 조회
      const galleryRef = collection(db, 'gallery');
      const galleryQuery = query(
        galleryRef,
        where('region', '==', region),
        where('date', '==', date),
        where('type', '==', 'meal')
      );

      const gallerySnapshot = await getDocs(galleryQuery);
      const imagesToDelete = [];

      gallerySnapshot.forEach(doc => {
        const data = doc.data();
        // 조식 관련 이미지만 필터링
        if (data.mealType === targetMealType || 
            (targetMealType === '조식' && (
              data.mealType === '조식' || 
              data.mealType === '아침' ||
              data.mealType === 'breakfast' ||
              (data.description && data.description.includes('조식')) ||
              (data.description && data.description.includes('아침'))
            ))) {
          imagesToDelete.push({
            id: doc.id,
            ...data
          });
        }
      });

      console.log(`삭제할 조식 이미지 개수: ${imagesToDelete.length}`);

      // 각 이미지 삭제
      const deletePromises = imagesToDelete.map(async (image) => {
        try {
          // Firestore 문서 삭제
          await deleteDoc(doc(db, 'gallery', image.id));
          console.log(`Firestore 문서 삭제 성공: ${image.id}`);
          
          // Firebase Storage 파일 삭제 (storagePath가 있는 경우)
          if (image.storagePath) {
            try {
              const storageRef = ref(storage, image.storagePath);
              await deleteObject(storageRef);
              console.log(`Storage 파일 삭제 성공: ${image.storagePath}`);
            } catch (storageError) {
              console.warn(`Storage 파일 삭제 실패: ${image.storagePath}`, storageError);
              // Storage 삭제 실패해도 Firestore는 삭제됨
            }
          }
          
          return { success: true, id: image.id };
        } catch (error) {
          console.error(`이미지 삭제 실패: ${image.id}`, error);
          return { success: false, id: image.id, error: error.message };
        }
      });
      
      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      console.log(`조식 데이터 삭제 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
      
      res.status(200).json({ 
        success: true, 
        message: `조식 데이터 삭제 완료: 성공 ${successCount}개, 실패 ${failCount}개`,
        deletedCount: successCount,
        failedCount: failCount,
        deletedImages: imagesToDelete.map(img => img.id)
      });
    } catch (error) {
      console.error('조식 데이터 삭제 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '조식 데이터 삭제 중 오류가 발생했습니다.' 
      });
    }
  } else {
    res.status(405).json({ 
      success: false, 
      error: '허용되지 않는 메서드입니다.' 
    });
  }
}
