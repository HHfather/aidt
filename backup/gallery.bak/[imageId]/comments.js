import { db } from '../../../../firebaseConfig';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { imageId } = req.query;
      const { text, author, userId } = req.body;
      
      if (!imageId || !text) {
        return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' });
      }

      const commentData = {
        id: Date.now().toString(),
        text,
        author: author || '익명',
        userId: userId || 'unknown',
        time: new Date().toISOString()
      };

      await updateDoc(doc(db, 'gallery', imageId), {
        comments: arrayUnion(commentData)
      });
      
      res.status(200).json({ 
        success: true, 
        data: commentData
      });
    } catch (error) {
      console.error('댓글 등록 오류:', error);
      res.status(500).json({ success: false, error: '댓글 등록 중 오류가 발생했습니다.' });
    }
  } else {
    res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' });
  }
} 