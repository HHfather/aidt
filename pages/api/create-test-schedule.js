import { db } from '../../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { region = '2' } = req.body;
    
    // 테스트 일정 데이터 생성
    const testScheduleData = {
      region: region,
      title: `${region}권역 연수 일정`,
      schedule: [
        {
          date: '2025-01-01',
          time: '07:00',
          activity: '조식',
          location: '호텔 레스토랑',
          description: '아침 식사'
        },
        {
          date: '2025-01-01',
          time: '09:00',
          activity: '오리엔테이션',
          location: '강의실 A',
          description: '연수 시작 및 일정 안내'
        },
        {
          date: '2025-01-01',
          time: '10:00',
          activity: '기초 강의',
          location: '강의실 A',
          description: '기본 개념 학습'
        },
        {
          date: '2025-01-01',
          time: '12:00',
          activity: '중식',
          location: '학생식당',
          description: '점심 식사'
        },
        {
          date: '2025-01-01',
          time: '14:00',
          activity: '실습',
          location: '실습실 B',
          description: '실습을 통한 학습'
        },
        {
          date: '2025-01-01',
          time: '18:00',
          activity: '석식',
          location: '호텔 레스토랑',
          description: '저녁 식사'
        },
        {
          date: '2025-01-02',
          time: '07:00',
          activity: '조식',
          location: '호텔 레스토랑',
          description: '아침 식사'
        },
        {
          date: '2025-01-02',
          time: '09:00',
          activity: '심화 강의',
          location: '강의실 A',
          description: '심화 내용 학습'
        },
        {
          date: '2025-01-02',
          time: '12:00',
          activity: '중식',
          location: '학생식당',
          description: '점심 식사'
        },
        {
          date: '2025-01-02',
          time: '15:00',
          activity: '토론',
          location: '세미나실',
          description: '그룹 토론 및 의견 교환'
        },
        {
          date: '2025-01-02',
          time: '18:00',
          activity: '석식',
          location: '호텔 레스토랑',
          description: '저녁 식사'
        },
        {
          date: '2025-01-03',
          time: '07:00',
          activity: '조식',
          location: '호텔 레스토랑',
          description: '아침 식사'
        },
        {
          date: '2025-01-03',
          time: '09:00',
          activity: '현장 견학',
          location: '현장 학습지',
          description: '실제 현장에서의 학습'
        },
        {
          date: '2025-01-03',
          time: '12:00',
          activity: '중식',
          location: '현지 식당',
          description: '현지 음식 체험'
        },
        {
          date: '2025-01-03',
          time: '15:00',
          activity: '자유 시간',
          location: '자유 공간',
          description: '개인 학습 및 휴식 시간'
        },
        {
          date: '2025-01-03',
          time: '18:00',
          activity: '석식',
          location: '호텔 레스토랑',
          description: '저녁 식사'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    };

    // Firestore에 저장
    const scheduleRef = doc(db, 'schedules', `test_schedule_${region}`);
    await setDoc(scheduleRef, testScheduleData);

    res.status(200).json({
      success: true,
      message: `${region}권역 테스트 일정이 생성되었습니다.`,
      data: testScheduleData
    });

  } catch (error) {
    console.error('테스트 일정 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: '테스트 일정 생성 중 오류가 발생했습니다.'
    });
  }
} 