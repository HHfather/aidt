import { generateReportDocument } from '../../utils/reportGenerator'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebaseConfig'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { reportType, projectId, customData } = req.body

    // Firebase에서 데이터 수집
    const reportData = await collectReportData(projectId, customData)
    
    // 보고서 문서 생성
    const result = await generateReportDocument(reportData)
    
    if (result.success) {
      // 바이너리 데이터를 base64로 인코딩하여 전송
      const base64Buffer = result.buffer.toString('base64')
      
      return res.status(200).json({
        success: true,
        filename: result.filename,
        data: base64Buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })
    } else {
      return res.status(400).json({
        error: '보고서 생성 실패',
        details: result.error
      })
    }

  } catch (error) {
    console.error('보고서 생성 API 오류:', error)
    return res.status(500).json({
      error: 'API 오류',
      details: error.message
    })
  }
}

/**
 * 보고서 데이터 수집
 */
async function collectReportData(projectId, customData = {}) {
  const reportData = {
    title: customData.title || '연수 프로그램 보고서',
    period: customData.period || '2025년도',
    participants: [],
    schedules: [],
    photos: [],
    summary: customData.summary || '',
    achievements: customData.achievements || [
      '참가자들의 글로벌 역량 강화',
      '다문화 이해 증진',
      '국제적 시각 확대',
      '교육 방법론 개선 아이디어 습득'
    ],
    recommendations: customData.recommendations || [
      '연수 기간 확대 검토',
      '사전 교육 프로그램 강화',
      '현지 교육기관과의 협력 확대',
      '후속 프로그램 개발'
    ]
  }

  try {
    // 참가자 데이터 수집
    const participantsQuery = query(collection(db, 'participants'), orderBy('name', 'asc'))
    const participantsSnapshot = await getDocs(participantsQuery)
    reportData.participants = participantsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // 일정 데이터 수집
    const schedulesQuery = query(collection(db, 'schedules'), orderBy('date', 'asc'))
    const schedulesSnapshot = await getDocs(schedulesQuery)
    reportData.schedules = schedulesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // 사진 데이터 수집 (활동별 사진 개수)
    const photosQuery = query(collection(db, 'photos'))
    const photosSnapshot = await getDocs(photosQuery)
    reportData.photos = photosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

  } catch (error) {
    console.error('데이터 수집 오류:', error)
    
    // 오류 시 테스트 데이터 사용
    reportData.participants = [
      {
        name: '김철수',
        affiliation: '서울초등학교',
        email: 'kimcs@gmail.com',
        region: '1권역'
      },
      {
        name: '이영희',
        affiliation: '부산교육지원청',
        email: 'leeyh@gmail.com',
        region: '2권역'
      }
    ]

    reportData.schedules = [
      {
        date: '2025-07-30',
        time: '09:00',
        activityName: '문화유산 탐방',
        location: '고궁 박물관',
        type: 'activity'
      },
      {
        date: '2025-07-30',
        time: '14:00',
        activityName: '자유시간 활동',
        location: '개인 선택',
        type: 'free'
      }
    ]

    reportData.photos = []
  }

  return reportData
}
