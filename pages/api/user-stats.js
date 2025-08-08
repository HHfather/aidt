import { db } from '../../firebaseConfig';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

// 점수 가중치 (기본 점수)
const SCORE_WEIGHTS = {
  attendance: 10,
  photoUploads: 5,
  commentsAdded: 2,
  emojisAdded: 1,
  emojisReceived: 1,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    console.log('Starting user stats recalculation...');
    const scores = {};

    // 1. 모든 참가자 정보 가져오기 및 기본 구조 초기화
    const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
    if (schedulesSnapshot.empty) {
      console.log('No schedules found.');
      return res.status(200).json({ success: true, message: 'No data to process.' });
    }

    schedulesSnapshot.docs.forEach(doc => {
      const schedule = doc.data();
      const region = schedule.region;
      schedule.participants?.forEach(p => {
        if (!p.id) return;
        if (!scores[p.id]) {
          scores[p.id] = {
            id: p.id,
            name: p.name,
            affiliation: p.affiliation,
            region: region,
            // 활동 횟수
            attendance: 0,
            photoUploads: 0,
            commentsAdded: 0,
            emojisAdded: 0,
            emojisReceived: 0,
            // 점수
            baseScore: 0,
            bonusScore: 0, // 보너스 점수 필드 추가
            totalScore: 0,
          };
        }
        if (p.isAttended) {
          scores[p.id].attendance += 1;
        }
      });
    });
    console.log(`Found ${Object.keys(scores).length} unique participants.`);

    // 2. 갤러리 활동 집계 (일반 + 식사)
    const galleryNames = ['gallery', 'meals-gallery'];
    for (const galleryName of galleryNames) {
        const gallerySnapshot = await getDocs(collection(db, galleryName));
        gallerySnapshot.forEach(doc => {
            const image = doc.data();
            const uploaderId = image.uploadedBy?.id;

            if (uploaderId && scores[uploaderId]) {
                scores[uploaderId].photoUploads += 1;
            }
            
            image.comments?.forEach(comment => {
                const commenterId = comment.authorId;
                if (commenterId && scores[commenterId]) {
                scores[commenterId].commentsAdded += 1;
                }
            });

            Object.values(image.emojis || {}).forEach(users => {
                users.forEach(userId => {
                    if (userId && scores[userId]) {
                        scores[userId].emojisAdded += 1;
                    }
                    if (uploaderId && scores[uploaderId] && uploaderId !== userId) {
                        scores[uploaderId].emojisReceived += 1;
                    }
                });
            });
        });
        console.log(`Processed ${galleryName} stats.`);
    }

    // 3. 기본 점수 계산 (보너스 점수는 0으로 초기화)
    const rankedUsers = Object.values(scores).map(user => {
      user.baseScore =
        (user.attendance * SCORE_WEIGHTS.attendance) +
        (user.photoUploads * SCORE_WEIGHTS.photoUploads) +
        (user.commentsAdded * SCORE_WEIGHTS.commentsAdded) +
        (user.emojisAdded * SCORE_WEIGHTS.emojisAdded) +
        (user.emojisReceived * SCORE_WEIGHTS.emojisReceived);
      
      user.bonusScore = 0; // 재계산 시 보너스 점수는 0으로 초기화
      user.totalScore = user.baseScore;
      return user;
    });

    // 4. 순위 매기기
    rankedUsers.sort((a, b) => b.totalScore - a.totalScore);
    rankedUsers.forEach((user, index) => {
      user.rank = index + 1;
    });
    console.log('Calculated base scores and ranks.');

    // 5. 'rankings' 컬렉션에 결과 저장 (Batch Write 사용)
    const batch = writeBatch(db);
    const rankingsCol = collection(db, 'rankings');
    
    const existingRankingsSnap = await getDocs(rankingsCol);
    existingRankingsSnap.forEach(doc => batch.delete(doc.ref));

    rankedUsers.forEach(user => {
      const docRef = doc(rankingsCol, user.id);
      batch.set(docRef, user);
    });

    await batch.commit();
    console.log('Successfully saved new rankings to Firestore.');

    res.status(200).json({ success: true, message: 'Ranking recalculation complete.', userCount: rankedUsers.length });
  } catch (error) {
    console.error('Error calculating user stats:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
} 
