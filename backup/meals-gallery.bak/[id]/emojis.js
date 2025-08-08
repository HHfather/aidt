import { db } from '../../../../../firebaseConfig';
import { doc, runTransaction } from 'firebase/firestore';

// 보너스 점수 로직
const calculateBonus = (isFirst) => {
  if (isFirst) {
    // 첫 활동 보너스: +2점 (기본 점수 1점 + 보너스 1점)
    return { points: 1, message: "첫 이모티콘! +1점 보너스! 👍" };
  }

  const random = Math.random();
  if (random < 0.05) { // 5% 확률
    return { points: 4, message: "이모티콘 잭팟! +4점! 🎰" };
  }
  if (random < 0.2) { // 15% 확률 (누적 20%)
    return { points: 2, message: "이모티콘으로 감동 두배! +2점! ❤️" };
  }

  return { points: 0, message: null };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { id: imageId } = req.query;
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
      if (!imageDoc.exists()) {
        throw new Error("Image not found");
      }
      
      const imageData = imageDoc.data();
      const uploaderId = imageData.uploadedBy?.id;
      
      const emojis = imageData.emojis || {};
      const emojiUsers = emojis[emoji] || [];

      const userHasReacted = emojiUsers.includes(userId);

      // 사용자가 이미 같은 이모티콘을 눌렀다면, 취소(제거) 로직 실행
      if (userHasReacted) {
        const updatedUsers = emojiUsers.filter(uid => uid !== userId);
        emojis[emoji] = updatedUsers;
        transaction.update(imageRef, { emojis: emojis });
        
        // 점수 차감 (보너스는 고려하지 않고 기본 점수만 차감)
        const userRankingDoc = await transaction.get(userRankingRef);
        if (userRankingDoc.exists()) {
          transaction.update(userRankingRef, {
            totalScore: (userRankingDoc.data().totalScore || 0) - 1,
            emojisAdded: (userRankingDoc.data().emojisAdded || 0) - 1,
          });
        }
        if (uploaderId && uploaderId !== userId) {
            const uploaderRankingRef = doc(db, 'rankings', uploaderId);
            const uploaderRankingDoc = await transaction.get(uploaderRankingRef);
            if (uploaderRankingDoc.exists()) {
                transaction.update(uploaderRankingRef, {
                    totalScore: (uploaderRankingDoc.data().totalScore || 0) - 1,
                    emojisReceived: (uploaderRankingDoc.data().emojisReceived || 0) - 1,
                });
            }
        }
        return; // 점수 차감 후 로직 종료
      }

      // 새로운 이모티콘 추가 로직
      // 첫 이모티콘 활동 여부 확인
      const isFirstEmojiOverall = !imageData.emojis || Object.keys(imageData.emojis).length === 0;
      bonusResult = calculateBonus(isFirstEmojiOverall);
      
      // 이모티콘 추가
      emojis[emoji] = [...emojiUsers, userId];
      transaction.update(imageRef, { emojis: emojis });

      // 이모티콘 누른 사람 점수 업데이트
      const userRankingDoc = await transaction.get(userRankingRef);
      if (userRankingDoc.exists()) {
        const pointsToAdd = 1 + bonusResult.points;
        transaction.update(userRankingRef, {
          bonusScore: (userRankingDoc.data().bonusScore || 0) + pointsToAdd,
          totalScore: (userRankingDoc.data().totalScore || 0) + pointsToAdd,
          emojisAdded: (userRankingDoc.data().emojisAdded || 0) + 1,
        });
      }
      
      // 사진 올린 사람 점수 업데이트 (본인이 아닐 경우)
      if (uploaderId && uploaderId !== userId) {
        const uploaderRankingRef = doc(db, 'rankings', uploaderId);
        const uploaderRankingDoc = await transaction.get(uploaderRankingRef);
        if (uploaderRankingDoc.exists()) {
            // 받은 이모티콘에 대한 보너스 (첫 이모티콘일 경우 +1점)
            const uploaderBonusPoints = isFirstEmojiOverall ? 1 : 0;
            if (uploaderBonusPoints > 0) {
                uploaderBonusResult = { points: uploaderBonusPoints, message: "내 사진에 첫 이모티콘! +1점! 💖" };
            }

            const pointsToAddToUploader = 1 + uploaderBonusPoints;
            transaction.update(uploaderRankingRef, {
                bonusScore: (uploaderRankingDoc.data().bonusScore || 0) + pointsToAddToUploader,
                totalScore: (uploaderRankingDoc.data().totalScore || 0) + pointsToAddToUploader,
                emojisReceived: (uploaderRankingDoc.data().emojisReceived || 0) + 1,
            });
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
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
