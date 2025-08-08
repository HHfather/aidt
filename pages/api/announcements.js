import { db } from '../../firebaseConfig'
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { region } = req.query

      if (!region) {
        return res.status(400).json({ success: false, message: 'Region parameter is required' })
      }

      // 공지사항 쿼리 (orderBy 제거하여 인덱스 오류 방지)
      const announcementsQuery = query(
        collection(db, 'announcements'),
        where('region', '==', region)
      )

      const snapshot = await getDocs(announcementsQuery)
      const announcements = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        announcements.push({
          id: doc.id,
          title: data.title || '공지사항',
          content: data.content,
          region: data.region || '전체',
          date: data.date || (data.createdAt ? new Date(data.createdAt.toDate()).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          time: data.time || (data.createdAt ? new Date(data.createdAt.toDate()).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })),
          createdBy: data.createdBy || data.author || '관리자',
          urgentLevel: data.urgentLevel || 'normal'
        })
      })

      // 클라이언트에서 날짜순 정렬
      announcements.sort((a, b) => new Date(b.date) - new Date(a.date))

      res.status(200).json({ success: true, data: announcements })
    } catch (error) {
      console.error('공지사항 로드 오류:', error)
      res.status(500).json({ success: false, message: 'Internal server error' })
    }
  } else if (req.method === 'POST') {
    try {
      const { title, content, region, createdBy } = req.body

      if (!title || !content || !region || !createdBy) {
        return res.status(400).json({ 
          success: false, 
          error: '필수 정보가 누락되었습니다.' 
        })
      }

      const announcementData = {
        title: title.trim(),
        content: content.trim(),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        region,
        createdBy,
        createdAt: new Date().toISOString()
      }

      const docRef = await addDoc(collection(db, 'announcements'), announcementData)
      
      res.status(200).json({ 
        success: true, 
        data: { id: docRef.id, ...announcementData }
      })
    } catch (error) {
      console.error('공지사항 등록 오류:', error)
      res.status(500).json({ 
        success: false, 
        error: '공지사항 등록 중 오류가 발생했습니다.' 
      })
    }
  } else {
    res.status(405).json({ 
      success: false, 
      error: '허용되지 않는 메서드입니다.' 
    })
  }
} 