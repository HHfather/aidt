import { db } from '../../firebaseConfig';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { region, excludeFreeSchedule = 'true' } = req.query;
      
      if (!region) {
        return res.status(400).json({ success: false, error: '권역 정보가 필요합니다.' });
      }

      // 갤러리 컬렉션에서 해당 권역의 이미지들을 가져오기 (인덱스 오류 방지)
      let galleryImages = [];
      try {
        const galleryQuery = query(
          collection(db, 'gallery'),
          where('region', '==', region)
        );
        
        const gallerySnapshot = await getDocs(galleryQuery);
        galleryImages = gallerySnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'gallery',
          ...doc.data()
        }));

        // 클라이언트 사이드에서 날짜별 정렬 (인덱스 오류 방지)
        galleryImages.sort((a, b) => {
          const dateA = a.date || '9999-12-31';
          const dateB = b.date || '9999-12-31';
          return dateA.localeCompare(dateB);
        });
      } catch (galleryError) {
        console.error('갤러리 데이터 로드 오류:', galleryError);
        // 갤러리 로드 실패 시 빈 배열로 처리
        galleryImages = [];
      }

      // 연구과제 컬렉션에서 해당 권역의 과제들을 가져오기 (인덱스 오류 방지)
      let researchTasks = [];
      try {
        const researchQuery = query(
          collection(db, 'researchTasks'),
          where('region', '==', region)
        );
        
        const researchSnapshot = await getDocs(researchQuery);
        researchTasks = researchSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'research',
          ...doc.data()
        }));

        // 클라이언트 사이드에서 생성일별 정렬 (인덱스 오류 방지)
        researchTasks.sort((a, b) => {
          const dateA = a.createdAt || '9999-12-31T23:59:59Z';
          const dateB = b.createdAt || '9999-12-31T23:59:59Z';
          return dateA.localeCompare(dateB);
        });
      } catch (researchError) {
        console.error('연구과제 데이터 로드 오류:', researchError);
        // 연구과제 로드 실패 시 빈 배열로 처리
        researchTasks = [];
      }

      // 자유일정 제외 옵션이 활성화된 경우 갤러리 필터링
      let filteredGalleryImages = galleryImages;
      if (excludeFreeSchedule === 'true') {
        filteredGalleryImages = galleryImages.filter(img => 
          !img.activity?.toLowerCase().includes('자유') && 
          !img.activity?.toLowerCase().includes('free')
        );
      }

      // 모든 데이터를 날짜별로 그룹화
      const groupedByDate = {};
      
      // 갤러리 이미지 그룹화
      filteredGalleryImages.forEach(image => {
        const date = image.date || '날짜 미정';
        if (!groupedByDate[date]) {
          groupedByDate[date] = { gallery: [], research: [] };
        }
        groupedByDate[date].gallery.push(image);
      });

      // 연구과제 그룹화 (scheduleId를 기반으로 날짜 추정)
      researchTasks.forEach(task => {
        // scheduleId에서 날짜 추출 (예: "2024-01-15_morning" -> "2024-01-15")
        let date = '날짜 미정';
        if (task.scheduleId) {
          const dateMatch = task.scheduleId.match(/^(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            date = dateMatch[1];
          }
        }
        
        if (!groupedByDate[date]) {
          groupedByDate[date] = { gallery: [], research: [] };
        }
        groupedByDate[date].research.push(task);
      });

      // 날짜별로 정렬
      const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        if (a === '날짜 미정') return 1;
        if (b === '날짜 미정') return -1;
        return new Date(a) - new Date(b);
      });

      const organizedData = {
        region: region,
        totalImages: filteredGalleryImages.length,
        totalResearchTasks: researchTasks.length,
        totalDates: sortedDates.length,
        dataByDate: sortedDates.map(date => ({
          date: date,
          galleryCount: groupedByDate[date].gallery.length,
          researchCount: groupedByDate[date].research.length,
          gallery: groupedByDate[date].gallery.map(img => ({
            id: img.id,
            imageUrl: img.imageUrl,
            activity: img.activity || '활동 미정',
            location: img.location || '장소 미정',
            uploadedBy: img.uploadedBy || '업로더 미정',
            uploadedAt: img.uploadedAt,
            emoji: img.emoji || '',
            likes: img.likes || 0,
            comments: img.comments || []
          })),
          research: groupedByDate[date].research.map(task => ({
            id: task.id,
            scheduleId: task.scheduleId,
            content: task.content || '',
            originalContent: task.originalContent || '',
            aiEdited: task.aiEdited || false,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
          }))
        }))
      };

      res.status(200).json({ 
        success: true, 
        data: organizedData 
      });
    } catch (error) {
      console.error('결과보고서 다운로드 오류:', error);
      
      // Firebase 인덱스 오류인 경우 더 자세한 오류 메시지 제공
      if (error.code === 'failed-precondition') {
        res.status(500).json({ 
          success: false, 
          error: 'Firebase 인덱스가 필요합니다. 관리자에게 문의하세요.',
          details: error.message 
        });
      } else {
        res.status(500).json({ success: false, error: '결과보고서 다운로드 중 오류가 발생했습니다.' });
      }
    }
  } else {
    res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' });
  }
} 