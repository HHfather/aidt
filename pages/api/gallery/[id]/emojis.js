import { db } from '../../../../firebaseConfig';
import { doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';

const EMOJI_SCORE = 1;

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { emoji, userId } = req.body;

    if (!emoji || !userId) {
      return res.status(400).json({ success: false, error: 'Emoji and userId are required' });
    }

    console.log(`Emoji API called - Image: ${id}, Emoji: ${emoji}, User: ${userId}`);

    // 트랜잭션을 사용하여 이모지 업데이트
    const result = await runTransaction(db, async (transaction) => {
      const imageRef = doc(db, 'gallery', id);
      const userRankingRef = doc(db, 'rankings', userId);
      
      // 모든 읽기 작업을 먼저 수행
      const imageDoc = await transaction.get(imageRef);
      const rankingDoc = await transaction.get(userRankingRef);

      if (!imageDoc.exists()) {
        throw new Error('Image not found');
      }

      const imageData = imageDoc.data();
      const currentEmojis = imageData.emojis || {};
      const emojiUsers = currentEmojis[emoji] || [];
      
      console.log('Current emoji users:', emojiUsers);
      
      // 사용자가 이미 이 이모지를 눌렀는지 확인
      const userIndex = emojiUsers.indexOf(userId);
      let newEmojiUsers;
      let action;

      if (userIndex > -1) {
        // 이미 눌렀다면 제거 (토글)
        newEmojiUsers = emojiUsers.filter(id => id !== userId);
        action = 'removed';
      } else {
        // 아직 안 눌렀다면 추가
        newEmojiUsers = [...emojiUsers, userId];
        action = 'added';
      }

      // 업데이트된 이모지 객체
      const updatedEmojis = {
        ...currentEmojis,
        [emoji]: newEmojiUsers
      };

      // 빈 배열인 이모지는 제거
      if (newEmojiUsers.length === 0) {
        delete updatedEmojis[emoji];
      }

      console.log('Updated emojis:', updatedEmojis);

      // 모든 쓰기 작업을 나중에 수행
      transaction.update(imageRef, {
        emojis: updatedEmojis
      });

      // 랭킹 점수 업데이트
      if (rankingDoc.exists()) {
        const data = rankingDoc.data();
        if (action === 'added') {
          transaction.update(userRankingRef, {
            emojisAdded: (data.emojisAdded || 0) + 1,
            baseScore: (data.baseScore || 0) + EMOJI_SCORE,
            totalScore: (data.totalScore || 0) + EMOJI_SCORE,
          });
        } else if (action === 'removed') {
          transaction.update(userRankingRef, {
            emojisAdded: Math.max(0, (data.emojisAdded || 0) - 1),
            baseScore: Math.max(0, (data.baseScore || 0) - EMOJI_SCORE),
            totalScore: Math.max(0, (data.totalScore || 0) - EMOJI_SCORE),
          });
        }
      } else {
        // 랭킹 문서가 없으면 새로 생성
        if (action === 'added') {
          transaction.set(userRankingRef, {
            emojisAdded: 1,
            baseScore: EMOJI_SCORE,
            totalScore: EMOJI_SCORE,
            commentsCount: 0,
            userId: userId
          });
        }
      }

      return {
        action,
        newCount: newEmojiUsers.length,
        updatedEmojis
      };
    });

    console.log('Transaction result:', result);

    // 성공 응답
    res.status(200).json({
      success: true,
      action: result.action,
      count: result.newCount,
      emojis: result.updatedEmojis
    });

  } catch (error) {
    console.error('Emoji API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update emoji',
      details: error.message
    });
  }
}