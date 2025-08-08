import { db } from '../../../../../firebaseConfig';
import { doc, runTransaction, arrayUnion, setDoc } from 'firebase/firestore';

const BASE_SCORE = 2;

const calculateBonus = (isFirst) => {
  if (isFirst) {
    return { points: 2, message: "첫 댓글 보너스! +2점! 🎉" };
  }
  const random = Math.random();
  if (random < 0.1) return { points: 5, message: "엄청난 댓글이에요! +5점! 💰" };
  if (random < 0.3) return { points: 3, message: "멋진 댓글! +3점! ✨" };
  return { points: 0, message: null };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { id: imageId } = req.query;
  const { userId, author, text } = req.body;

  if (!imageId || !userId || !author || !text) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    let bonusResult = { points: 0, message: null };
    
    await runTransaction(db, async (transaction) => {
      const imageRef = doc(db, 'gallery', imageId);
      const rankingRef = doc(db, 'rankings', userId);

      const imageDoc = await transaction.get(imageRef);
      if (!imageDoc.exists()) {
        throw new Error("Image not found");
      }
      const imageData = imageDoc.data();
      const uploaderId = imageData.uploadedBy?.id;

      const isFirstComment = !imageData.comments || imageData.comments.length === 0;
      bonusResult = calculateBonus(isFirstComment);

      const newComment = {
        userId,
        author,
        text,
        time: new Date().toISOString(),
      };
      transaction.update(imageRef, {
        comments: arrayUnion(newComment)
      });

      // 댓글 작성자 점수 업데이트
      const rankingDoc = await transaction.get(rankingRef);
      const currentData = rankingDoc.data() || {};
      const pointsToAdd = BASE_SCORE + bonusResult.points;
      transaction.set(rankingRef, {
        ...currentData,
        bonusScore: (currentData.bonusScore || 0) + pointsToAdd,
        totalScore: (currentData.totalScore || 0) + pointsToAdd,
        commentsAdded: (currentData.commentsAdded || 0) + 1,
      }, { merge: true });

      // 사진 업로더 점수 업데이트 (본인이 아닐 경우)
      if (uploaderId && uploaderId !== userId) {
        const uploaderRankingRef = doc(db, 'rankings', uploaderId);
        const uploaderRankingDoc = await transaction.get(uploaderRankingRef);
        const uploaderData = uploaderRankingDoc.data() || {};
        const pointsForReceivingComment = 1;
        transaction.set(uploaderRankingRef, {
            ...uploaderData,
            totalScore: (uploaderData.totalScore || 0) + pointsForReceivingComment,
            commentsReceived: (uploaderData.commentsReceived || 0) + 1,
        }, { merge: true });
      }
    });

    res.status(201).json({ success: true, message: 'Comment added successfully.', bonus: bonusResult });

  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
}
