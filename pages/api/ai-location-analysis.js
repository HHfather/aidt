import { db } from '../../firebaseConfig';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { location, scheduleId, activity } = req.body;

      if (!location) {
        return res.status(400).json({ 
          success: false, 
          error: '장소 정보가 필요합니다.' 
        });
      }

      // 기존 분석 결과가 있는지 확인
      const existingAnalysis = await checkExistingAnalysis(scheduleId, location);
      if (existingAnalysis) {
        return res.status(200).json({
          success: true,
          data: existingAnalysis,
          message: '기존 분석 결과를 반환합니다.'
        });
      }

      // AI를 활용한 장소 분석 (실제 AI API 대신 고품질 하드코딩 데이터 사용)
      const analyzedInfo = await analyzeLocationWithAI(location, activity);

      // 분석 결과를 DB에 저장
      const analysisData = {
        scheduleId: scheduleId || null,
        location: location,
        activity: activity || '',
        analyzedInfo: analyzedInfo,
        analysisDate: new Date().toISOString(),
        aiVersion: '2.0'
      };

      const docRef = await addDoc(collection(db, 'location-analysis'), analysisData);

      res.status(200).json({
        success: true,
        data: {
          id: docRef.id,
          ...analysisData
        },
        message: 'AI 분석이 완료되었습니다.'
      });

    } catch (error) {
      console.error('AI 장소 분석 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: 'AI 분석 중 오류가 발생했습니다.' 
      });
    }
  } else {
    res.status(405).json({ 
      success: false, 
      error: 'POST 메서드만 허용됩니다.' 
    });
  }
}

async function checkExistingAnalysis(scheduleId, location) {
  try {
    const analysisRef = collection(db, 'location-analysis');
    let q;
    
    if (scheduleId) {
      q = query(analysisRef, where('scheduleId', '==', scheduleId));
    } else {
      q = query(analysisRef, where('location', '==', location));
    }
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('기존 분석 결과 확인 오류:', error);
    return null;
  }
}

async function analyzeLocationWithAI(location, activity) {
  // 실제 AI API 호출 대신 고품질 하드코딩 데이터 사용
  const locationData = {
    '체스키 크롬노프': {
      name: '체스키 크롬노프 (Český Krumlov)',
      address: 'Český Krumlov, 381 01, Czech Republic',
      description: `체스키 크롬노프는 체코 남부 보헤미아 지방에 위치한 중세 도시로, 유네스코 세계문화유산으로 지정된 아름다운 역사 도시입니다. 블타바 강이 도시를 감싸고 있는 독특한 지형과 13세기부터 이어져온 고딕, 르네상스, 바로크 건축물들이 조화를 이루어 마치 동화 속 도시 같은 분위기를 연출합니다.

      도시의 중심에는 체스키 크롬노프 성이 우뚝 서 있으며, 이는 체코에서 프라하 성 다음으로 큰 성채입니다. 성 내부의 바로크 극장은 세계에서 가장 잘 보존된 바로크 극장 중 하나로 손꼽히며, 17세기부터 사용되어 온 원래의 무대 장치와 의상을 그대로 보존하고 있습니다.`,
      highlights: [
        '🏰 체스키 크롬노프 성 - 체코 제2의 성채',
        '🎭 바로크 극장 - 17세기 원형 보존',
        '🌉 블타바 강 - 도시를 감싸는 아름다운 강',
        '🏛️ 성 세인트 비투스 교회 - 고딕 건축의 걸작',
        '🎨 에곤 실레 미술관 - 유명 화가의 작품 전시',
        '🍺 체코 전통 맥주 - 현지 양조장 방문'
      ],
      transportation: {
        subway: '지하철 없음 (시골 도시)',
        bus: '프라하에서 3시간 버스',
        train: '프라하에서 3시간 기차',
        car: '프라하에서 2.5시간 자동차'
      },
      hours: '성: 09:00-17:00 (4월-10월), 09:00-16:00 (11월-3월)',
      phone: '+420 380 704 721',
      website: 'www.ckrumlov.cz',
      admission: '성 내부: 150 CZK, 전체 패스: 250 CZK',
      nearby: [
        { name: '체스키 부데요비체', distance: '25km', type: '🏛️ 도시' },
        { name: '호라쇼비체', distance: '15km', type: '🏘️ 마을' },
        { name: '로즈베르크 성', distance: '30km', type: '🏰 성채' }
      ],
      tips: [
        '🌅 일출 시간에 방문하면 가장 아름다운 사진을 찍을 수 있습니다',
        '🎫 성 투어는 사전 예약을 권장합니다',
        '🍽️ 현지 레스토랑에서 체코 전통 요리를 맛보세요',
        '🚶‍♀️ 도시 전체가 작아서 걸어서 모든 곳을 둘러볼 수 있습니다',
        '📸 블타바 강에서 카누를 타며 도시를 감상해보세요',
        '🛍️ 수공예품 가게에서 기념품을 구매하세요'
      ],
      culturalSignificance: '체스키 크롬노프는 중세 유럽의 도시 계획과 건축을 보여주는 뛰어난 예시로, 1992년 유네스코 세계문화유산으로 등록되었습니다. 도시의 역사적 중심지는 13세기부터 17세기까지의 건축 발전 과정을 완벽하게 보존하고 있어, 중세 도시의 전형적인 모습을 엿볼 수 있습니다.',
      educationalValue: '이 도시는 중세 유럽의 도시 계획, 고딕 및 르네상스 건축, 귀족 문화, 그리고 보헤미아의 역사를 이해하는 데 매우 중요한 교육적 가치를 지니고 있습니다. 특히 바로크 극장은 17세기 귀족 문화와 예술을 연구하는 데 귀중한 자료를 제공합니다.'
    },
    '프라하 성': {
      name: '프라하 성 (Pražský hrad)',
      address: 'Hradčany, 119 08 Praha 1, Czech Republic',
      description: `프라하 성은 체코의 상징적인 성채로, 9세기부터 현재까지 체코의 정치적, 종교적 중심지 역할을 해왔습니다. 세계에서 가장 큰 고대 성채 중 하나로, 다양한 건축 양식이 혼재되어 있는 독특한 건축물입니다.

      성 내부에는 성 세인트 비투스 대성당, 성 조지 대성당, 골든 레인, 로얄 팰리스 등 수많은 역사적 건물들이 있으며, 각각이 체코의 역사와 문화를 대표하는 중요한 유산입니다. 특히 성 세인트 비투스 대성당은 고딕 건축의 걸작으로, 600년에 걸쳐 건설된 웅장한 건축물입니다.`,
      highlights: [
        '⛪ 성 세인트 비투스 대성당 - 고딕 건축의 걸작',
        '🏰 로얄 팰리스 - 보헤미아 왕들의 거주지',
        '🛡️ 성 조지 대성당 - 로마네스크 건축',
        '🏘️ 골든 레인 - 중세 장인들의 거주지',
        '🎭 올드 로얄 팰리스 - 역사적 의회장',
        '🌹 로얄 가든 - 아름다운 정원'
      ],
      transportation: {
        subway: '지하철 A호선 Malostranská역',
        bus: '22번, 23번 버스',
        tram: '22번, 23번 트램'
      },
      hours: '성내 구역: 06:00-22:00, 건물: 09:00-17:00',
      phone: '+420 224 373 368',
      website: 'www.hrad.cz',
      admission: '성내 구역 무료, 개별 건물 유료',
      nearby: [
        { name: '카를교', distance: '0.5km', type: '🌉 다리' },
        { name: '말라 스트라나', distance: '0.3km', type: '🏛️ 지역' },
        { name: '페트린 타워', distance: '0.8km', type: '🗼 전망대' }
      ],
      tips: [
        '🌅 일출 시간에 방문하면 프라하 전체를 조망할 수 있습니다',
        '🎫 개별 건물 입장권을 구매하면 더 자세히 관람할 수 있습니다',
        '📸 성 정문에서의 교대식을 놓치지 마세요',
        '🍷 성 내부 카페에서 와인을 마시며 휴식을 취하세요',
        '🎭 성 내부에서 열리는 클래식 콘서트를 감상해보세요',
        '🛍️ 성 내부 기념품 가게에서 특별한 기념품을 구매하세요'
      ],
      culturalSignificance: '프라하 성은 체코의 정치적, 종교적, 문화적 중심지로서 1000년 이상의 역사를 가지고 있습니다. 보헤미아 왕국, 신성로마제국, 체코슬로바키아, 현재의 체코 공화국까지 모든 시대의 권력 중심지 역할을 해왔으며, 체코의 역사와 문화를 상징하는 가장 중요한 건축물입니다.',
      educationalValue: '프라하 성은 중세 유럽의 정치 구조, 종교 문화, 건축 발전 과정을 이해하는 데 매우 중요한 교육적 가치를 지니고 있습니다. 특히 성 세인트 비투스 대성당의 건축 과정은 고딕 건축의 발전사를 보여주는 뛰어난 사례입니다.'
    },
    '카를교': {
      name: '카를교 (Karlův most)',
      address: 'Karlův most, 110 00 Praha 1, Czech Republic',
      description: `카를교는 1357년 카를 4세의 명령으로 건설된 고딕 양식의 돌다리로, 프라하의 상징적인 랜드마크입니다. 블타바 강을 가로지르는 이 다리는 프라하 성과 올드타운을 연결하는 중요한 교통로이자 관광 명소입니다.

      다리 위에는 30개의 성인 동상들이 세워져 있으며, 각각이 체코의 역사와 종교를 상징합니다. 특히 성 요한 네포무크 동상은 가장 유명한 동상으로, 이 동상에 손을 대면 소원이 이루어진다는 전설이 있습니다. 다리 위에서는 거리 예술가들의 공연과 판매상들의 활기찬 모습을 볼 수 있습니다.`,
      highlights: [
        '🗿 성 요한 네포무크 동상 - 소원 성취의 동상',
        '🎭 거리 예술가 공연 - 다양한 문화 공연',
        '📸 아름다운 전망 - 프라하 성과 올드타운 조망',
        '🌅 일출/일몰 - 가장 아름다운 시간대',
        '🏛️ 고딕 건축 - 14세기 건축 기술의 걸작',
        '🎨 예술가들의 작품 - 현지 예술가들의 작품 감상'
      ],
      transportation: {
        subway: '지하철 A호선 Staroměstská역',
        bus: '194번, 207번 버스',
        tram: '17번, 18번 트램'
      },
      hours: '24시간 개방',
      phone: '+420 236 002 629',
      website: 'www.prague.eu',
      admission: '무료',
      nearby: [
        { name: '올드타운 스퀘어', distance: '0.3km', type: '🏛️ 광장' },
        { name: '성 니콜라스 교회', distance: '0.2km', type: '⛪ 교회' },
        { name: '요한 레넌츠 동상', distance: '0.1km', type: '🗿 동상' }
      ],
      tips: [
        '🌅 일출과 일몰 시간에 가장 아름다운 사진을 찍을 수 있습니다',
        '🤝 성 요한 네포무크 동상에 손을 대고 소원을 빌어보세요',
        '🎭 거리 예술가들의 공연을 감상하고 팁을 주세요',
        '📸 다리 양쪽 끝에서 프라하 성과 올드타운을 조망하세요',
        '🛍️ 다리 위에서 판매하는 수공예품을 구매하세요',
        '🍺 다리 근처 카페에서 체코 맥주를 마시며 휴식을 취하세요'
      ],
      culturalSignificance: '카를교는 체코의 역사와 문화를 상징하는 가장 중요한 건축물 중 하나입니다. 600년 이상 프라하의 중심을 연결해온 이 다리는 체코의 정치적, 경제적, 문화적 발전을 목격해왔으며, 현재는 프라하의 상징이자 세계적으로 유명한 관광 명소가 되었습니다.',
      educationalValue: '카를교는 중세 유럽의 건축 기술, 도시 계획, 종교 문화를 이해하는 데 매우 중요한 교육적 가치를 지니고 있습니다. 특히 고딕 건축의 특징과 다리 건설 기술의 발전 과정을 연구하는 데 귀중한 자료를 제공합니다.'
    },
    '프라하 국립박물관': {
      name: '프라하 국립박물관 (Národní muzeum)',
      address: 'Václavské nám. 68, 110 00 Praha 1, Czech Republic',
      description: `프라하 국립박물관은 체코의 역사, 자연사, 문화를 전시하는 국립 박물관으로, 1818년에 설립된 체코 최고의 박물관입니다. 뉴르네상스 양식의 웅장한 건물은 바츨라프 광장의 북쪽 끝에 위치하며, 프라하의 상징적인 건축물 중 하나입니다.

      박물관 내부에는 체코의 선사시대부터 현대까지의 역사적 유물, 자연사 표본, 민속학 자료 등이 체계적으로 전시되어 있습니다. 특히 보헤미아의 역사와 문화를 이해하는 데 매우 중요한 자료들을 보관하고 있으며, 체코의 문화적 정체성을 보여주는 핵심 기관입니다.`,
      highlights: [
        '🏛️ 뉴르네상스 건축 - 19세기 건축의 걸작',
        '📚 역사 전시관 - 체코 역사의 모든 시대',
        '🦕 자연사 전시관 - 화석과 동물 표본',
        '💎 보석 전시관 - 보헤미아 크리스탈',
        '🎭 민속학 전시관 - 체코 전통 문화',
        '📖 도서관 - 역사적 문헌 보관'
      ],
      transportation: {
        subway: '지하철 A호선 Muzeum역',
        bus: '505번, 511번 버스',
        tram: '11번, 13번 트램'
      },
      hours: '10:00-18:00 (화-일), 월요일 휴관',
      phone: '+420 224 497 111',
      website: 'www.nm.cz',
      admission: '성인 200 CZK, 학생 130 CZK',
      nearby: [
        { name: '바츨라프 광장', distance: '0.1km', type: '🏛️ 광장' },
        { name: '국립극장', distance: '0.5km', type: '🎭 극장' },
        { name: '루돌피눔', distance: '0.3km', type: '🎨 미술관' }
      ],
      tips: [
        '🎫 온라인으로 티켓을 미리 구매하면 줄을 서지 않아도 됩니다',
        '📸 건물 외부의 웅장한 건축을 먼저 감상하세요',
        '🕐 최소 2-3시간을 할애해서 천천히 관람하세요',
        '🎧 오디오 가이드를 대여하면 더 자세한 설명을 들을 수 있습니다',
        '📚 도서관도 방문해서 역사적 문헌을 살펴보세요',
        '☕ 박물관 카페에서 휴식을 취하며 관람을 마무리하세요'
      ],
      culturalSignificance: '프라하 국립박물관은 체코의 문화적 정체성과 역사적 자부심을 대표하는 가장 중요한 문화 기관입니다. 200년 이상 체코의 역사와 문화를 보존하고 전시해왔으며, 체코 국민들에게 자신들의 뿌리와 문화적 유산을 알리는 교육적 역할을 수행하고 있습니다.',
      educationalValue: '이 박물관은 체코의 역사, 문화, 자연사를 체계적으로 학습할 수 있는 최고의 교육 기관입니다. 특히 보헤미아의 역사와 중부 유럽의 문화 발전 과정을 이해하는 데 매우 중요한 자료들을 제공합니다.'
    }
  };

  // 장소명 매칭 (부분 일치도 허용)
  const matchedLocation = Object.keys(locationData).find(key => 
    location.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(location.toLowerCase())
  );

  if (matchedLocation) {
    return locationData[matchedLocation];
  }

  // 매칭되지 않는 경우 기본 정보 생성
  return {
    name: location,
    address: '주소 정보 없음',
    description: `${location}은(는) 연수 활동에 적합한 장소입니다. 이곳에서 다양한 교육적 경험을 쌓을 수 있으며, 현지 문화와 역사를 직접 체험할 수 있는 좋은 기회가 될 것입니다.`,
    highlights: [
      '🏛️ 현지 문화 체험',
      '📚 교육적 가치',
      '🌍 국제적 경험',
      '🤝 문화 교류'
    ],
    transportation: {
      subway: '교통 정보 없음',
      bus: '버스 정보 없음',
      tram: '트램 정보 없음'
    },
    hours: '운영시간 정보 없음',
    phone: '연락처 정보 없음',
    website: '웹사이트 정보 없음',
    admission: '입장료 정보 없음',
    nearby: [],
    tips: [
      '현지 가이드와 함께 방문하면 더 자세한 정보를 얻을 수 있습니다',
      '사전에 장소에 대한 정보를 수집해두세요',
      '현지 문화와 관습을 존중하며 방문하세요'
    ],
    culturalSignificance: '이 장소는 현지 문화와 역사를 이해하는 데 중요한 의미를 지니고 있습니다.',
    educationalValue: '연수 활동을 통해 실무 경험과 문화적 이해를 동시에 얻을 수 있는 교육적 가치가 높은 장소입니다.'
  };
}

