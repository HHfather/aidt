import { db } from '../../firebaseConfig'
import { collection, query, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const announcementsQuery = query(collection(db, 'announcements'))
      const snapshot = await getDocs(announcementsQuery)
      const announcements = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        // Firestore Timestamp를 JavaScript Date 객체로 변환
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        
        announcements.push({
          id: doc.id,
          title: data.title || '공지사항',
          content: data.content,
          // toLocaleString을 사용하여 서버 시간을 기준으로 현지 시간 표시
          createdAt: createdAt.toLocaleString('ko-KR', {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
          }),
          author: data.author || '관리자',
          region: data.region || '전체',
          urgentLevel: data.urgentLevel || 'normal'
        })
      })

      // 최신순으로 정렬
      announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      res.status(200).json({ success: true, data: announcements })
    } catch (error) {
      console.error('공지사항 로드 오류:', error)
      res.status(500).json({ success: false, message: 'Internal server error' })
    }
  } else if (req.method === 'POST') {
    try {
      const { title, content, author, region } = req.body

      if (!title || !content || !author || !region) {
        return res.status(400).json({ 
          success: false, 
          error: '제목, 내용, 작성자, 권역 정보가 모두 필요합니다.' 
        })
      }

      const announcementData = {
        title: title.trim(),
        content: content.trim(),
        author,
        region,
        urgentLevel: req.body.urgentLevel || 'normal', // 긴급, 중요, 일반
        createdAt: serverTimestamp() // Firestore 서버 타임스탬프 사용
      }

      const docRef = await addDoc(collection(db, 'announcements'), announcementData)
      
      res.status(200).json({ 
        success: true, 
        message: "공지사항이 성공적으로 등록되었습니다.",
        data: { id: docRef.id }
      })
    } catch (error) {
      console.error('공지사항 등록 오류:', error)
      res.status(500).json({ 
        success: false, 
        error: '공지사항 등록 중 오류가 발생했습니다.' 
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query

      if (!id) {
        return res.status(400).json({ 
          success: false, 
          error: '삭제할 공지사항 ID가 필요합니다.' 
        })
      }

      await deleteDoc(doc(db, 'announcements', id))
      
      res.status(200).json({ 
        success: true, 
        message: '공지사항이 삭제되었습니다.' 
      })
    } catch (error) {
      console.error('공지사항 삭제 오류:', error)
      res.status(500).json({ 
        success: false, 
        error: '공지사항 삭제 중 오류가 발생했습니다.' 
      })
    }
  } else {
    res.status(405).json({ 
      success: false, 
      error: '허용되지 않는 메서드입니다.' 
    })
  }
}
