import { db } from '../../../../firebaseConfig';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const COMMENT_SCORE = 5;

export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const { text, author, userId } = req.body;
    console.log('댓글 추가 요청:', { id, text, author, userId });
    
    if (!text || !author || !userId) {
      console.log('필수 정보 누락:', { text: !!text, author: !!author, userId: !!userId });
      return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' });
    }
    
    const comment = {
      text,
      author,
      userId,
      createdAt: new Date().toISOString(),
      time: new Date().toISOString(),
    };
    
    const imageRef = doc(db, 'gallery', id);
    const rankingRef = doc(db, 'rankings', userId);
    
    console.log('댓글 추가 시작');
    
    // 댓글 추가
    await updateDoc(imageRef, {
      comments: arrayUnion(comment),
    });
    
    console.log('댓글 추가 완료, 랭킹 업데이트 시작');
    
    // 랭킹 업데이트 (개별적으로 처리)
    try {
      const { getDoc } = await import('firebase/firestore');
      const rankingDoc = await getDoc(rankingRef);
      if (rankingDoc.exists()) {
        const data = rankingDoc.data();
        await updateDoc(rankingRef, {
          commentsAdded: (data.commentsAdded || 0) + 1,
          baseScore: (data.baseScore || 0) + COMMENT_SCORE,
          totalScore: (data.totalScore || 0) + COMMENT_SCORE,
        });
        console.log('랭킹 업데이트 완료');
      } else {
        console.log('랭킹 문서가 존재하지 않음:', userId);
      }
    } catch (rankingError) {
      console.error('랭킹 업데이트 오류:', rankingError);
      // 댓글은 추가되었으므로 랭킹 오류는 무시하고 성공으로 처리
    }
    
    console.log('댓글 추가 성공');
    res.status(200).json({ success: true, comment });
  } catch (error) {
    console.error('댓글 추가 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '댓글 추가 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
}