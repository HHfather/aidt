import { db } from '../../../../firebaseConfig';
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
  console.log(`--- Emoji API called for imageId: ${req.query.imageId} ---`);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { imageId } = req.query;
  const { userId, emoji } = req.body;

  console.log('Request body:', req.body);

  if (!imageId || !userId || !emoji) {
    console.error('Missing required fields:', { imageId, userId, emoji });
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
      if (!imageDoc.exists()) {
          console.error(`Image with id ${imageId} not found.`);
          throw new Error("Image not found");
      }
      console.log('Image document found.');
      
      const imageData = imageDoc.data();
      const uploaderId = imageData.uploadedBy?.id;
      console.log(`Uploader ID: ${uploaderId}`);
      
      const emojis = imageData.emojis || {};
      const emojiUsers = emojis[emoji] || [];
      const userHasReacted = emojiUsers.includes(userId);
      console.log(`User ${userId} has reacted with ${emoji}? ${userHasReacted}`);

      if (userHasReacted) {
        console.log('Cancelling emoji reaction.');
        const updatedUsers = emojiUsers.filter(uid => uid !== userId);
        emojis[emoji] = updatedUsers.length > 0 ? updatedUsers : undefined;
        transaction.update(imageRef, { emojis });
        console.log('Image emojis updated (cancelled).');

        const userRankingDoc = await transaction.get(userRankingRef);
        if (userRankingDoc.exists()) {
          transaction.update(userRankingRef, {
            totalScore: (userRankingDoc.data().totalScore || 0) - BASE_SCORE,
            emojisAdded: (userRankingDoc.data().emojisAdded || 0) - 1,
          });
          console.log(`User ${userId} score decreased.`);
        }
        if (uploaderId && uploaderId !== userId) {
            const uploaderRankingRef = doc(db, 'rankings', uploaderId);
            const uploaderRankingDoc = await transaction.get(uploaderRankingRef);
            if (uploaderRankingDoc.exists()) {
                transaction.update(uploaderRankingRef, {
                    totalScore: (uploaderRankingDoc.data().totalScore || 0) - BASE_SCORE,
                    emojisReceived: (uploaderRankingDoc.data().emojisReceived || 0) - 1,
                });
                console.log(`Uploader ${uploaderId} score decreased.`);
            }
        }
      } else {
        console.log('Adding new emoji reaction.');
        const isFirstEmojiOverall = Object.keys(emojis).filter(e => emojis[e] && emojis[e].length > 0).length === 0;
        bonusResult = calculateBonus(isFirstEmojiOverall);
        
        emojis[emoji] = [...emojiUsers, userId];
        transaction.update(imageRef, { emojis });
        console.log('Image emojis updated (added).');

        const userRankingDoc = await transaction.get(userRankingRef);
        const pointsToAdd = BASE_SCORE + bonusResult.points;
        transaction.update(userRankingRef, {
            bonusScore: (userRankingDoc.data()?.bonusScore || 0) + pointsToAdd,
            totalScore: (userRankingDoc.data()?.totalScore || 0) + pointsToAdd,
            emojisAdded: (userRankingDoc.data()?.emojisAdded || 0) + 1,
        });
        console.log(`User ${userId} score increased by ${pointsToAdd}.`);
        
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
                  bonusScore: (uploaderRankingDoc.data().bonusScore || 0) + pointsToAddToUploader,
                  totalScore: (uploaderRankingDoc.data().totalScore || 0) + pointsToAddToUploader,
                  emojisReceived: (uploaderRankingDoc.data().emojisReceived || 0) + 1,
              });
              console.log(`Uploader ${uploaderId} score increased by ${pointsToAddToUploader}.`);
          }
        }
      }
      console.log('Transaction finished.');
    });

    res.status(200).json({ 
        success: true, 
        message: 'Emoji updated successfully.', 
        bonus: bonusResult,
        uploaderBonus: uploaderBonusResult.points > 0 ? uploaderBonusResult : null
    });

  } catch (error) {
    console.error('Error in emoji API handler:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
  }
}
