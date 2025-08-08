import { db } from '../../../../../firebaseConfig';
import { doc, updateDoc, arrayUnion, getDoc, runTransaction } from 'firebase/firestore';

// 보너스 점수 로직
const calculateBonus = (isFirst) => {
  if (isFirst) {
    // 첫 활동 보너스: 2배 (기본 점수 2점 * 1 = 2점 추가)
    return { points: 2, message: "첫 댓글 보너스! +2점! 🎉" };
  }

  const random = Math.random();
  if (random < 0.1) { // 10% 확률
    return { points: 5, message: "엄청난 댓글이에요! +5점! 💰" };
  }
  if (random < 0.3) { // 20% 확률 (누적 30%)
    return { points: 3, message: "멋진 댓글! +3점! ✨" };
  }

  return { points: 0, message: null }; // 보너스 없음
};


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { id: imageId } = req.query;
  const { authorId, authorName, text } = req.body;

  if (!imageId || !authorId || !authorName || !text) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    let bonusResult = { points: 0, message: null };
    
    await runTransaction(db, async (transaction) => {
      const imageRef = doc(db, 'meals-gallery', imageId);
      const rankingRef = doc(db, 'rankings', authorId);

      // 1. 이미지 문서 가져오기
      const imageDoc = await transaction.get(imageRef);
      if (!imageDoc.exists()) {
        throw new Error("Image not found");
      }
      const imageData = imageDoc.data();

      // 2. 첫 댓글 여부 확인 및 보너스 계산
      const isFirstComment = !imageData.comments || imageData.comments.length === 0;
      bonusResult = calculateBonus(isFirstComment);

      // 3. 댓글 추가
      const newComment = {
        authorId,
        authorName,
        text,
        createdAt: new Date().toISOString(),
      };
      transaction.update(imageRef, {
        comments: arrayUnion(newComment)
      });

      // 4. 랭킹 점수 업데이트
      const rankingDoc = await transaction.get(rankingRef);
      if (rankingDoc.exists()) {
        const currentBonus = rankingDoc.data().bonusScore || 0;
        const currentTotal = rankingDoc.data().totalScore || 0;
        
        // 기본 점수(2점) + 보너스 점수
        const pointsToAdd = 2 + bonusResult.points;
        
        transaction.update(rankingRef, {
          bonusScore: currentBonus + pointsToAdd, // 기본점수도 보너스에 합산 (실시간 반영)
          totalScore: currentTotal + pointsToAdd,
          commentsAdded: (rankingDoc.data().commentsAdded || 0) + 1,
        });
      }
    });

    res.status(201).json({ success: true, message: 'Comment added successfully.', bonus: bonusResult });

  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
}
