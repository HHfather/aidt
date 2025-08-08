import { db } from '../../../../../firebaseConfig';
import { doc, runTransaction, setDoc } from 'firebase/firestore';

const BASE_SCORE = 1;

const calculateBonus = (isFirst) => {
  if (isFirst) return { points: 1, message: "첫 이모티콘! +1점 보너스! 👍" };
  const random = Math.random();
  if (random < 0.05) return { points: 4, message: "이모티콘 잭팟! +4점! 🎰" };
  if (random < 0.2) return { points: 2, message: "감동 두배! +2점! ❤️" };
  return { points: 0, message: null };
};

export default async function handler(req, res) {
  const { id: imageId } = req.query;
  console.log(`--- EMOJI API START for imageId: ${imageId} ---`);

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
    return;
  }

  const { userId, emoji } = req.body;
  console.log('Request body:', req.body);

  if (!imageId || !userId || !emoji) {
    console.error('[ERROR] Missing required fields:', { imageId, userId, emoji });
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    let bonusResult = { points: 0, message: null };
    let uploaderBonusResult = { points: 0, message: null };

    await runTransaction(db, async (transaction) => {
      console.log('Transaction started.');
      const imageRef = doc(db, 'gallery', imageId);
      const userRankingRef = doc(db, 'rankings', userId);

      const imageDoc = await transaction.get(imageRef);
      if (!imageDoc.exists()) throw new Error(`Image with ID ${imageId} not found`);
      
      const imageData = imageDoc.data();
      const uploaderId = imageData.uploadedBy?.id;
      
      const emojis = imageData.emojis || {};
      const emojiUsers = emojis[emoji] || [];
      const userHasReacted = emojiUsers.includes(userId);
      console.log(`User ${userId} has reacted with ${emoji}? ${userHasReacted}`);

      const userRankingDoc = await transaction.get(userRankingRef);
      const currentData = userRankingDoc.data() || {};

      if (userHasReacted) {
        console.log('Removing emoji reaction.');
        const updatedUsers = emojiUsers.filter(uid => uid !== userId);
        emojis[emoji] = updatedUsers.length > 0 ? updatedUsers : undefined;
        transaction.update(imageRef, { emojis });

        transaction.set(userRankingRef, {
            ...currentData,
            totalScore: (currentData.totalScore || 0) - BASE_SCORE,
            emojisAdded: (currentData.emojisAdded || 0) - 1,
        }, { merge: true });

        if (uploaderId && uploaderId !== userId) {
            const uploaderRankingRef = doc(db, 'rankings', uploaderId);
            const uploaderRankingDoc = await transaction.get(uploaderRankingRef);
            const uploaderData = uploaderRankingDoc.data() || {};
            transaction.set(uploaderRankingRef, {
                ...uploaderData,
                totalScore: (uploaderData.totalScore || 0) - BASE_SCORE,
                emojisReceived: (uploaderData.emojisReceived || 0) - 1,
            }, { merge: true });
        }
      } else {
        console.log('Adding new emoji reaction.');
        const isFirstEmojiOverall = Object.values(emojis).every(users => (users || []).length === 0);
        bonusResult = calculateBonus(isFirstEmojiOverall);
        
        emojis[emoji] = [...emojiUsers, userId];
        transaction.update(imageRef, { emojis });

        const pointsToAdd = BASE_SCORE + bonusResult.points;
        transaction.set(userRankingRef, {
            ...currentData,
            totalScore: (currentData.totalScore || 0) + pointsToAdd,
            emojisAdded: (currentData.emojisAdded || 0) + 1,
            bonusScore: (currentData.bonusScore || 0) + bonusResult.points,
        }, { merge: true });
        
        if (uploaderId && uploaderId !== userId) {
          const uploaderRankingRef = doc(db, 'rankings', uploaderId);
          const uploaderRankingDoc = await transaction.get(uploaderRankingRef);
          const uploaderData = uploaderRankingDoc.data() || {};
          const uploaderBonusPoints = isFirstEmojiOverall ? 1 : 0;
          if (uploaderBonusPoints > 0) {
              uploaderBonusResult = { points: uploaderBonusPoints, message: "내 사진에 첫 이모티콘! +1점! 💖" };
          }
          const pointsToAddToUploader = BASE_SCORE + uploaderBonusPoints;
          transaction.set(uploaderRankingRef, {
              ...uploaderData,
              totalScore: (uploaderData.totalScore || 0) + pointsToAddToUploader,
              emojisReceived: (uploaderData.emojisReceived || 0) + 1,
              bonusScore: (uploaderData.bonusScore || 0) + uploaderBonusPoints,
          }, { merge: true });
        }
      }
      console.log('Transaction finished successfully.');
    });

    res.status(200).json({ success: true, message: 'Emoji updated.', bonus: bonusResult, uploaderBonus: uploaderBonusResult.points > 0 ? uploaderBonusResult : null });
    console.log('--- EMOJI API END ---');

  } catch (error) {
    console.error('[CRITICAL ERROR] in emoji API:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
}
