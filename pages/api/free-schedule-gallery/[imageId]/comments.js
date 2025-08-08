import { db } from '../../../../firebaseConfig'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'

const COMMENT_SCORE = 2;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { imageId } = req.query
      const { text, userData } = req.body

      console.log('자유일정 댓글 추가 요청:', { imageId, text, userData: userData?.id });

      if (!imageId || !text || !userData) {
        console.log('필수 정보 누락:', { imageId: !!imageId, text: !!text, userData: !!userData });
        return res.status(400).json({
          success: false,
          error: '필수 정보가 누락되었습니다.'
        })
      }

      const docRef = doc(db, 'free-schedule-gallery', imageId)
      const rankingRef = doc(db, 'rankings', userData.id)
      const newComment = {
        author: userData.name,
        text: text,
        time: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      console.log('자유일정 댓글 추가 시작');
      
      // 댓글 추가
      await updateDoc(docRef, {
        comments: arrayUnion(newComment)
      })
      
      console.log('자유일정 댓글 추가 완료, 랭킹 업데이트 시작');
      
      // 랭킹 업데이트 (개별적으로 처리)
      try {
        const { getDoc } = await import('firebase/firestore');
        const rankingDoc = await getDoc(rankingRef)
        if (rankingDoc.exists()) {
          const data = rankingDoc.data()
          await updateDoc(rankingRef, {
            commentsAdded: (data.commentsAdded || 0) + 1,
            baseScore: (data.baseScore || 0) + COMMENT_SCORE,
            totalScore: (data.totalScore || 0) + COMMENT_SCORE,
          })
          console.log('자유일정 랭킹 업데이트 완료');
        } else {
          console.log('자유일정 랭킹 문서가 존재하지 않음:', userData.id);
        }
      } catch (rankingError) {
        console.error('자유일정 랭킹 업데이트 오류:', rankingError);
        // 댓글은 추가되었으므로 랭킹 오류는 무시하고 성공으로 처리
      }

      console.log('자유일정 댓글 추가 성공');
      res.status(200).json({
        success: true,
        message: '댓글이 추가되었습니다.',
        comment: newComment
      })
    } catch (error) {
      console.error('자유일정 댓글 추가 오류:', error)
      res.status(500).json({
        success: false,
        error: '댓글 추가 중 오류가 발생했습니다.',
        details: error.message
      })
    }
  } else {
    res.status(405).json({
      success: false,
      error: '허용되지 않은 메서드입니다.'
    })
  }
} 