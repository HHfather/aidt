import { db } from '../../firebaseConfig'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { content, activityId, title } = req.body

      if (!content || !activityId) {
        return res.status(400).json({ error: 'Content and activityId are required' })
      }

      // 예시자료를 Firestore에 저장
      const exampleRef = doc(db, 'activityExamples', activityId)
      await setDoc(exampleRef, {
        title: title || '예시자료',
        content: content,
        createdAt: new Date(),
        activityId: activityId
      })

      res.status(200).json({ 
        success: true, 
        message: '예시자료가 성공적으로 저장되었습니다.'
      })

    } catch (error) {
      console.error('Save example error:', error)
      res.status(500).json({ error: '예시자료 저장 중 오류가 발생했습니다.' })
    }
  } else if (req.method === 'GET') {
    try {
      const { activityId } = req.query

      if (!activityId) {
        return res.status(400).json({ error: 'ActivityId is required' })
      }

      // 예시자료 불러오기
      const exampleRef = doc(db, 'activityExamples', activityId)
      const exampleDoc = await getDoc(exampleRef)

      if (exampleDoc.exists()) {
        res.status(200).json({ 
          success: true, 
          example: exampleDoc.data()
        })
      } else {
        res.status(404).json({ error: '예시자료를 찾을 수 없습니다.' })
      }

    } catch (error) {
      console.error('Get example error:', error)
      res.status(500).json({ error: '예시자료 불러오기 중 오류가 발생했습니다.' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
