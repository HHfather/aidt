import { db } from '../../firebaseConfig'
import { collection, addDoc, getDocs, query, where, updateDoc, doc, increment } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { photoId, activityId, emoji, userEmail } = req.body

    if (!photoId || !activityId || !emoji || !userEmail) {
      return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' })
    }

    // 기존 반응이 있는지 확인
    const existingQuery = query(
      collection(db, 'activity-reactions'),
      where('photoId', '==', photoId),
      where('userEmail', '==', userEmail),
      where('emoji', '==', emoji)
    )
    
    const existingDocs = await getDocs(existingQuery)
    
    if (!existingDocs.empty) {
      // 이미 반응한 경우 제거
      const reactionDoc = existingDocs.docs[0]
      await updateDoc(doc(db, 'activity-reactions', reactionDoc.id), {
        active: false,
        updatedAt: new Date()
      })
      
      res.status(200).json({
        success: true,
        message: '반응이 제거되었습니다.',
        action: 'removed'
      })
    } else {
      // 새로운 반응 추가
      const reactionData = {
        photoId,
        activityId,
        emoji,
        userEmail,
        timestamp: new Date(),
        active: true
      }

      await addDoc(collection(db, 'activity-reactions'), reactionData)

      // 사용자 랭킹 포인트 적립 (+2 포인트)
      const userQuery = query(collection(db, 'users'), where('email', '==', userEmail))
      const userDocs = await getDocs(userQuery)
      
      if (!userDocs.empty) {
        const userDoc = userDocs.docs[0]
        await updateDoc(doc(db, 'users', userDoc.id), {
          points: increment(2),
          lastActivity: new Date()
        })
      }

      res.status(200).json({
        success: true,
        message: '반응이 추가되었습니다.',
        pointsEarned: 2,
        action: 'added'
      })
    }

  } catch (error) {
    console.error('반응 처리 오류:', error)
    res.status(500).json({
      success: false,
      error: '반응 처리 중 오류가 발생했습니다.',
      details: error.message
    })
  }
} 