import { db } from '../../../firebaseConfig'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 테스트 프로젝트 데이터
    const testProject = {
      projectName: '2025 체코/오스트리아 연수 (테스트)',
      authKey: 'test2025',
      reportInfo: {
        title: '2025년 국외 연수 프로그램',
        purpose: '해외 교육 시스템 벤치마킹 및 글로벌 역량 강화',
        necessity: '급변하는 교육 환경에 대응하기 위한 선진 교육 사례 학습'
      },
      createdAt: serverTimestamp(),
      status: 'active'
    }

    // Firestore에 프로젝트 생성
    const projectRef = await addDoc(collection(db, 'projects'), testProject)

    // 테스트용 일정 데이터 생성
    const testSchedules = [
      {
        projectId: projectRef.id,
        date: '2025-08-06',
        time: '09:00',
        activityName: '프라하 성 방문',
        location: '프라하, 체코',
        adminNotes: '',
        createdAt: serverTimestamp()
      },
      {
        projectId: projectRef.id,
        date: '2025-08-06',
        time: '14:00',
        activityName: '카를교 도보 투어',
        location: '프라하, 체코',
        adminNotes: '',
        createdAt: serverTimestamp()
      },
      {
        projectId: projectRef.id,
        date: '2025-08-07',
        time: '10:00',
        activityName: '프라하 교육청 방문',
        location: '프라하, 체코',
        adminNotes: '',
        createdAt: serverTimestamp()
      }
    ]

    // 일정 데이터 추가
    for (const schedule of testSchedules) {
      await addDoc(collection(db, 'schedules'), schedule)
    }

    // 테스트용 사용자 데이터 생성
    const testUsers = [
      {
        name: '홍길동',
        affiliation: '여수교육지원청',
        team: 'A팀',
        role: 'participant',
        projectIds: [projectRef.id],
        createdAt: serverTimestamp()
      },
      {
        name: '김영희',
        affiliation: '순천교육지원청',
        team: 'A팀',
        role: 'participant',
        projectIds: [projectRef.id],
        createdAt: serverTimestamp()
      },
      {
        name: '박철수',
        affiliation: '광양교육지원청',
        team: 'B팀',
        role: 'guide',
        projectIds: [projectRef.id],
        createdAt: serverTimestamp()
      }
    ]

    // 사용자 데이터 추가
    for (const user of testUsers) {
      await addDoc(collection(db, 'users'), user)
    }

    return res.status(200).json({
      success: true,
      message: '테스트 프로젝트가 성공적으로 생성되었습니다.',
      project: {
        id: projectRef.id,
        ...testProject
      }
    })

  } catch (error) {
    console.error('Test project creation error:', error)
    return res.status(500).json({
      success: false,
      error: '프로젝트 생성 중 오류가 발생했습니다.',
      details: error.message
    })
  }
}
