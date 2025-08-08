import { db } from '../../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'POST 메서드만 허용됩니다.' });
  }

  try {
    // 2권역 테스트 일정 데이터 생성
    const regionRef = doc(db, 'schedules', 'region_2');
    
    // 권역별 기본 정보 저장
    await setDoc(regionRef, {
      region: '2',
      title: '2권역 연수 일정',
      guideAuthKey: 'lucky',
      participantAuthKey: 'happy',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    });

    // 2025년 8월 일정 데이터 생성
    const testActivities = {
      '2025-08-06': [
        {
          time: '09:00',
          activity: '프라하 성 방문',
          location: '프라하, 체코',
          description: '체코의 역사적 문화유산 방문',
          details: ['성 내부 관람', '역사 설명 듣기', '사진 촬영']
        },
        {
          time: '14:00',
          activity: '카를교 도보 투어',
          location: '프라하, 체코',
          description: '유명한 카를교를 걸으며 도시 관광',
          details: ['다리 건너기', '강변 풍경 감상', '문화재 설명']
        }
      ],
      '2025-08-07': [
        {
          time: '10:00',
          activity: '프라하 교육청 방문',
          location: '프라하, 체코',
          description: '체코 교육 시스템에 대한 이해',
          details: ['교육청 관계자 면담', '교육 정책 설명', '질의응답']
        },
        {
          time: '15:00',
          activity: '자유 관광',
          location: '프라하 시내',
          description: '개인별 자유 관광 시간',
          details: ['개별 관광지 선택', '쇼핑', '맛집 탐방']
        }
      ],
      '2025-08-08': [
        {
          time: '09:00',
          activity: '오스트리아로 이동',
          location: '프라하 → 비엔나',
          description: '체코에서 오스트리아로 이동',
          details: ['기차 이동', '호텔 체크인', '오리엔테이션']
        }
      ]
    };

    // 날짜별 활동 저장
    for (const [date, activities] of Object.entries(testActivities)) {
      const dateRef = doc(db, 'schedules', 'region_2', 'activities', date);
      
      const dateActivities = {};
      activities.forEach((activity, index) => {
        dateActivities[activity.time] = {
          activity: activity.activity,
          location: activity.location,
          description: activity.description || '',
          details: activity.details || [],
          order: index
        };
      });
      
      await setDoc(dateRef, dateActivities);
    }

    console.log('2권역 테스트 데이터 생성 완료');
    
    return res.status(200).json({
      success: true,
      message: '2권역 테스트 일정 데이터가 성공적으로 생성되었습니다.',
      data: {
        region: '2',
        activities: testActivities
      }
    });

  } catch (error) {
    console.error('테스트 데이터 생성 오류:', error);
    return res.status(500).json({
      success: false,
      error: '테스트 데이터 생성 중 오류가 발생했습니다.',
      details: error.message
    });
  }
} 