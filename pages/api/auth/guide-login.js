import { db } from '../../../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { guideOperations } from '../../../utils/firebaseOperations';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { region, authKey } = req.body;

  if (!region || !authKey) {
    return res.status(400).json({
      success: false,
      message: '권역과 인증키를 모두 입력해주세요.',
    });
  }

  try {
    // 환경변수에서 가이드 인증키 확인 (우선순위 1)
    const envGuideAuthKey = process.env[`GUIDE_AUTH_KEY_${region}`];
    if (envGuideAuthKey && envGuideAuthKey === authKey) {
      return res.status(200).json({
        success: true,
        guide: {
          id: `guide_${region}`,
          name: `${region}권역 가이드`,
          region: region,
          isGuide: true,
          project: {
            id: `env_project_${region}`,
            name: `${region}권역 연수 프로젝트`,
            region: region,
            guideAuthKey: envGuideAuthKey
          },
        },
      });
    }

    // 테스트 가이드 계정들 (권역별 인증키) - Firebase 데이터와 일치 (우선순위 2)
    const testGuides = {
      '1': { authKey: 'guide_1', name: '1권역 가이드' },
      '2': { authKey: 'lucky', name: '2권역 가이드' },
      '3': { authKey: 'guide_3', name: '3권역 가이드' },
      '4': { authKey: 'guide_4', name: '4권역 가이드' },
      '5': { authKey: 'guide_5', name: '5권역 가이드' },
      '6': { authKey: 'guide_6', name: '6권역 가이드' },
      '7': { authKey: 'guide_7', name: '7권역 가이드' },
      '8': { authKey: 'guide_8', name: '8권역 가이드' },
      '9': { authKey: 'guide_9', name: '9권역 가이드' },
      '10': { authKey: 'guide_10', name: '10권역 가이드' }
    };

    // 테스트 계정 확인
    if (testGuides[region] && testGuides[region].authKey === authKey) {
      const guideData = testGuides[region];
      
      return res.status(200).json({
        success: true,
        guide: {
          id: `guide_${region}`,
          name: guideData.name,
          region: region,
          isGuide: true,
          project: {
            id: `test_project_${region}`,
            name: `${region}권역 연수 프로젝트`,
            region: region,
            guideAuthKey: guideData.authKey
          },
        },
      });
    }

    // Firebase에서 가이드 계정 확인 (schedules 컬렉션에서 guideAuthKey 확인)
    const schedulesRef = collection(db, 'schedules');
    const scheduleQuery = query(
      schedulesRef, 
      where('guideAuthKey', '==', authKey), 
      where('region', '==', region)
    );
    const scheduleSnapshot = await getDocs(scheduleQuery);

    if (scheduleSnapshot.empty) {
      return res.status(401).json({
        success: false,
        message: '인증 정보가 올바르지 않습니다. 권역과 인증키를 확인해주세요.',
      });
    }
    
    const scheduleDoc = scheduleSnapshot.docs[0];
    const scheduleData = scheduleDoc.data();

    // 가이드 로그인 성공
    return res.status(200).json({
      success: true,
      guide: {
        id: `guide_${scheduleDoc.id}`,
        name: `${region}권역 가이드`,
        region: region,
        isGuide: true,
        project: {
          id: scheduleDoc.id,
          name: `${region}권역 연수 프로젝트`,
          region: region,
          guideAuthKey: scheduleData.guideAuthKey,
        },
      },
    });

  } catch (error) {
    console.error('Guide login error:', error);
    return res.status(500).json({
      success: false,
      error: '로그인 중 오류가 발생했습니다.',
    });
  }
}
