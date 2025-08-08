import { db } from '../../firebaseConfig'
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { region } = req.body
      
      if (!region) {
        return res.status(400).json({ 
          success: false, 
          error: 'region 파라미터가 필요합니다.' 
        })
      }

      console.log('연수 일행 초기화 요청:', region)

      // 기존 데이터 삭제
      const existingQuery = query(
        collection(db, 'participants'),
        where('region', '==', region)
      )
      const existingSnapshot = await getDocs(existingQuery)
      
      const deletePromises = existingSnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
      
      console.log('기존 데이터 삭제 완료:', existingSnapshot.docs.length, '개')

      // 2권역 연수 일행 데이터
      const participantsData = [
        { name: '임환진', affiliation: '관리자', role: 'admin' },
        { name: '김철수', affiliation: '서울시 교육청', role: 'participant' },
        { name: '이영희', affiliation: '부산시 교육청', role: 'participant' },
        { name: '박민수', affiliation: '대구시 교육청', role: 'participant' },
        { name: '정수진', affiliation: '인천시 교육청', role: 'participant' },
        { name: '최동욱', affiliation: '광주시 교육청', role: 'participant' },
        { name: '한미영', affiliation: '대전시 교육청', role: 'participant' },
        { name: '송태호', affiliation: '울산시 교육청', role: 'participant' },
        { name: '강지원', affiliation: '세종시 교육청', role: 'participant' },
        { name: '윤서연', affiliation: '경기도 교육청', role: 'participant' },
        { name: '조현우', affiliation: '강원도 교육청', role: 'participant' },
        { name: '박지민', affiliation: '충청북도 교육청', role: 'participant' },
        { name: '김서연', affiliation: '충청남도 교육청', role: 'participant' },
        { name: '이준호', affiliation: '전라북도 교육청', role: 'participant' },
        { name: '최유진', affiliation: '전라남도 교육청', role: 'participant' },
        { name: '정민수', affiliation: '경상북도 교육청', role: 'participant' },
        { name: '한지은', affiliation: '경상남도 교육청', role: 'participant' },
        { name: '김태현', affiliation: '제주도 교육청', role: 'participant' }
      ]

      // 새 데이터 추가
      const addPromises = participantsData.map(participant => {
        const participantData = {
          region,
          name: participant.name,
          affiliation: participant.affiliation,
          role: participant.role,
          createdAt: new Date().toISOString()
        }
        return addDoc(collection(db, 'participants'), participantData)
      })

      await Promise.all(addPromises)
      
      console.log('새 데이터 추가 완료:', participantsData.length, '개')

      res.status(200).json({ 
        success: true, 
        message: `${region}권역 연수 일행 데이터가 초기화되었습니다.`,
        count: participantsData.length
      })
    } catch (error) {
      console.error('연수 일행 초기화 오류:', error)
      res.status(500).json({ 
        success: false, 
        error: '연수 일행 초기화 중 오류가 발생했습니다.' 
      })
    }
  } else {
    res.status(405).json({ 
      success: false, 
      error: '허용되지 않는 메서드입니다.' 
    })
  }
} 