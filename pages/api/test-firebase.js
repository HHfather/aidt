import { db, storage } from '../../firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'
import { ref, listAll } from 'firebase/storage'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' })
  }

  try {
    const results = {
      firestore: false,
      storage: false,
      errors: []
    }

    // Firestore 연결 테스트
    try {
      const testCollection = collection(db, 'test')
      await getDocs(testCollection)
      results.firestore = true
      console.log('Firestore 연결 성공')
    } catch (error) {
      results.errors.push(`Firestore 오류: ${error.message}`)
      console.error('Firestore 연결 실패:', error)
    }

    // Storage 연결 테스트
    try {
      const testRef = ref(storage, 'test')
      await listAll(testRef)
      results.storage = true
      console.log('Storage 연결 성공')
    } catch (error) {
      results.errors.push(`Storage 오류: ${error.message}`)
      console.error('Storage 연결 실패:', error)
    }

    res.status(200).json({
      success: true,
      data: results
    })

  } catch (error) {
    console.error('Firebase 테스트 오류:', error)
    res.status(500).json({ 
      success: false, 
      error: `Firebase 테스트 중 오류가 발생했습니다: ${error.message}` 
    })
  }
} 