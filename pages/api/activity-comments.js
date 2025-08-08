import { db } from '../../firebaseConfig'
import { collection, addDoc, getDocs, query, where, updateDoc, doc, increment } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { photoId, activityId, comment, userEmail } = req.body

    if (!photoId || !activityId || !comment || !userEmail) {
      return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' })
    }

    // 댓글 데이터 저장
    const commentData = {
      photoId,
      activityId,
      text: comment.text,
      author: comment.author,
      timestamp: comment.timestamp,
      userRegion: comment.userRegion,
      userEmail
    }

    await addDoc(collection(db, 'activity-comments'), commentData)

    // 사용자 랭킹 포인트 적립 (+5 포인트)
    const userQuery = query(collection(db, 'users'), where('email', '==', userEmail))
    const userDocs = await getDocs(userQuery)
    
    if (!userDocs.empty) {
      const userDoc = userDocs.docs[0]
      await updateDoc(doc(db, 'users', userDoc.id), {
        points: increment(5),
        lastActivity: new Date()
      })
    }

    res.status(200).json({
      success: true,
      message: '댓글이 추가되었습니다.',
      pointsEarned: 5
    })

  } catch (error) {
    console.error('댓글 추가 오류:', error)
    res.status(500).json({
      success: false,
      error: '댓글 추가 중 오류가 발생했습니다.',
      details: error.message
    })
  }
} 