import { db } from '../../firebaseConfig';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { region } = req.query;
      
      if (!region) {
        return res.status(400).json({ success: false, error: 'region이 필요합니다.' });
      }

      console.log('Hall of Fame 요청 - region:', region);

      // 모든 갤러리 이미지 가져오기 (일정 갤러리 + 자유일정 갤러리)
      const galleryQuery = query(collection(db, 'gallery'));
      const gallerySnapshot = await getDocs(galleryQuery);
      
      const freeScheduleQuery = query(collection(db, 'free-schedule-gallery'));
      const freeScheduleSnapshot = await getDocs(freeScheduleQuery);
      
      const allImages = [
        ...gallerySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'schedule'
        })),
        ...freeScheduleSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'free-schedule'
        }))
      ];

      // 각 이미지의 총 점수 계산 (댓글 수 + 이모티콘 수)
      const imagesWithScore = allImages.map(image => {
        const commentCount = image.comments?.length || 0;
        
        // 이모티콘 수 계산 - 안전한 처리
        let emojiCount = 0;
        if (image.emojis && typeof image.emojis === 'object') {
          try {
            emojiCount = Object.values(image.emojis).reduce((sum, users) => {
              // users가 배열인 경우 길이를, 숫자인 경우 그 값을 사용
              if (Array.isArray(users)) {
                return sum + users.length;
              } else if (typeof users === 'number') {
                return sum + users;
              } else if (typeof users === 'string') {
                // 문자열인 경우 쉼표로 구분된 사용자 수 계산
                return sum + (users.split(',').length || 0);
              }
              return sum;
            }, 0);
          } catch (error) {
            console.log('이모티콘 수 계산 오류:', error, '이미지:', image.id);
            emojiCount = 0;
          }
        }
        
        const totalScore = commentCount + emojiCount;
        
        // 날짜 추출 (uploadedAt에서) - 안전한 처리
        let uploadDate;
        try {
          if (image.uploadedAt?.toDate) {
            uploadDate = image.uploadedAt.toDate().toISOString().split('T')[0];
          } else if (image.uploadedAt) {
            uploadDate = new Date(image.uploadedAt).toISOString().split('T')[0];
          } else {
            // uploadedAt이 없으면 현재 날짜 사용
            uploadDate = new Date().toISOString().split('T')[0];
          }
        } catch (error) {
          console.log('날짜 처리 오류:', error, '이미지:', image.id);
          uploadDate = new Date().toISOString().split('T')[0];
        }
        
        // 업로더 정보 처리
        let uploadedBy = null;
        if (image.uploadedBy) {
          uploadedBy = {
            id: image.uploadedBy.id || image.uploadedBy.userId,
            name: image.uploadedBy.name || image.uploadedBy.userName || '익명'
          };
        } else if (image.userId && image.userName) {
          uploadedBy = {
            id: image.userId,
            name: image.userName
          };
        }
        
        return {
          ...image,
          commentCount,
          emojiCount,
          totalScore,
          uploadDate,
          uploadedBy
        };
      });

      // 날짜별로 그룹화하고 각 날짜에서 최고 점수 이미지 선택
      const dailyGroups = {};
      imagesWithScore.forEach(image => {
        const date = image.uploadDate;
        if (!dailyGroups[date]) {
          dailyGroups[date] = [];
        }
        dailyGroups[date].push(image);
      });

      // 각 날짜에서 최고 점수 이미지 선택
      const topImages = Object.entries(dailyGroups).map(([date, images]) => {
        // 해당 날짜의 이미지들을 점수순으로 정렬
        images.sort((a, b) => b.totalScore - a.totalScore);
        return images[0]; // 최고 점수 이미지
      });

      // 날짜순으로 정렬 (최신순)
      topImages.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

      console.log('Hall of Fame 결과:', topImages.length, '개 이미지');

      res.status(200).json({ 
        success: true, 
        data: topImages 
      });
    } catch (error) {
      console.error('명예의 전당 조회 오류:', error);
      res.status(500).json({ success: false, error: '명예의 전당 조회 중 오류가 발생했습니다.' });
    }
  } else {
    res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' });
  }
} 