import { db } from '../../../../../firebaseConfig';
import { doc, runTransaction } from 'firebase/firestore';

const BASE_SCORE = 1;

const calculateBonus = (isFirst) => {
  if (isFirst) {
    return { points: 1, message: "첫 이모티콘! +1점 보너스! 👍" };
  }
  const random = Math.random();
  if (random < 0.05) return { points: 4, message: "이모티콘 잭팟! +4점! 🎰" };
  if (random < 0.2) return { points: 2, message: "감동 두배! +2점! ❤️" };
  return { points: 0, message: null };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { imageId } = req.query;
  const { userId, emoji } = req.body;

  if (!imageId || !userId || !emoji) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    let bonusResult = { points: 0, message: null };
    let uploaderBonusResult = { points: 0, message: null };

    await runTransaction(db, async (transaction) => {
      const imageRef = doc(db, 'meals-gallery', imageId);
      const userRankingRef = doc(db, 'rankings', userId);

      const imageDoc = await transaction.get(imageRef);
      if (!imageDoc.exists()) throw new Error("Image not found");
      
      const imageData = imageDoc.data();
      const uploaderId = imageData.uploadedBy?.id;
      
      const emojis = imageData.emojis || {};
      const emojiUsers = emojis[emoji] || [];
      const userHasReacted = emojiUsers.includes(userId);

      if (userHasReacted) {
        // --- 이모티콘 취소 (점수 차감) ---
        const updatedUsers = emojiUsers.filter(uid => uid !== userId);
        emojis[emoji] = updatedUsers.length > 0 ? updatedUsers : undefined; // 배열이 비면 필드 삭제
        transaction.update(imageRef, { emojis });

        const userRankingDoc = await transaction.get(userRankingRef);
        if (userRankingDoc.exists()) {
          transaction.update(userRankingRef, {
            totalScore: (userRankingDoc.data().totalScore || 0) - BASE_SCORE,
            emojisAdded: (userRankingDoc.data().emojisAdded || 0) - 1,
          });
        }
        if (uploaderId && uploaderId !== userId) {
            const uploaderRankingRef = doc(db, 'rankings', uploaderId);
            const uploaderRankingDoc = await transaction.get(uploaderRankingRef);
            if (uploaderRankingDoc.exists()) {
                transaction.update(uploaderRankingRef, {
                    totalScore: (uploaderRankingDoc.data().totalScore || 0) - BASE_SCORE,
                    emojisReceived: (uploaderRankingDoc.data().emojisReceived || 0) - 1,
                });
            }
        }
      } else {
        // --- 새 이모티콘 추가 (점수 추가) ---
        const isFirstEmojiOverall = Object.keys(emojis).every(e => (emojis[e] || []).length === 0);
        bonusResult = calculateBonus(isFirstEmojiOverall);
        
        emojis[emoji] = [...emojiUsers, userId];
        transaction.update(imageRef, { emojis });

        const userRankingDoc = await transaction.get(userRankingRef);
        if (userRankingDoc.exists()) {
          const pointsToAdd = BASE_SCORE + bonusResult.points;
          transaction.update(userRankingRef, {
            baseScore: (userRankingDoc.data().baseScore || 0) + BASE_SCORE,
            bonusScore: (userRankingDoc.data().bonusScore || 0) + bonusResult.points,
            totalScore: (userRankingDoc.data().totalScore || 0) + pointsToAdd,
            emojisAdded: (userRankingDoc.data().emojisAdded || 0) + 1,
          });
        }
        
        if (uploaderId && uploaderId !== userId) {
          const uploaderRankingRef = doc(db, 'rankings', uploaderId);
          const uploaderRankingDoc = await transaction.get(uploaderRankingRef);
          if (uploaderRankingDoc.exists()) {
              const uploaderBonusPoints = isFirstEmojiOverall ? 1 : 0;
              if (uploaderBonusPoints > 0) {
                  uploaderBonusResult = { points: uploaderBonusPoints, message: "내 사진에 첫 이모티콘! +1점! 💖" };
              }
              const pointsToAddToUploader = BASE_SCORE + uploaderBonusPoints;
              transaction.update(uploaderRankingRef, {
                  baseScore: (uploaderRankingDoc.data().baseScore || 0) + BASE_SCORE,
                  bonusScore: (uploaderRankingDoc.data().bonusScore || 0) + uploaderBonusPoints,
                  totalScore: (uploaderRankingDoc.data().totalScore || 0) + pointsToAddToUploader,
                  emojisReceived: (uploaderRankingDoc.data().emojisReceived || 0) + 1,
              });
          }
        }
      }
    });

    res.status(200).json({ 
        success: true, 
        message: 'Emoji updated successfully.', 
        bonus: bonusResult,
        uploaderBonus: uploaderBonusResult.points > 0 ? uploaderBonusResult : null
    });

  } catch (error) {
    console.error('Error updating emoji:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
}
