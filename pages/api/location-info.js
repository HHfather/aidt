import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { location, date, id } = req.query;

      // ID 파라미터가 있으면 활동 ID로 위치 정보 조회
      if (id) {
        try {
          // 활동 정보에서 위치 정보 가져오기 (schedules 컬렉션에서 먼저 찾기)
          let activityData = null;
          
          // 1. schedules 컬렉션에서 찾기 (실제 DB 구조에 맞게)
          try {
            // 먼저 전체 schedules 컬렉션에서 해당 ID를 가진 문서 찾기
            const schedulesSnapshot = await getDocs(collection(db, 'schedules'));
            
            for (const doc of schedulesSnapshot.docs) {
              const data = doc.data();
              if (data.isDeleted) continue;
              
              // schedule 배열에서 해당 ID와 일치하는 항목 찾기
              if (data.schedule && Array.isArray(data.schedule)) {
                for (let i = 0; i < data.schedule.length; i++) {
                  const scheduleId = `${doc.id}_${i}`;
                  if (scheduleId === id) {
                    activityData = {
                      ...data.schedule[i],
                      region: data.region,
                      title: data.title
                    };
                    break;
                  }
                }
              }
              
              // 개별 일정 문서인 경우
              if (doc.id === id) {
                activityData = data;
                break;
              }
              
              if (activityData) break;
            }
          } catch (error) {
            console.log('schedules 컬렉션에서 찾지 못함:', error);
          }
          
          // 2. activities 컬렉션에서 찾기
          if (!activityData) {
            try {
              const activityRef = doc(db, 'activities', id);
              const activityDoc = await getDoc(activityRef);
              if (activityDoc.exists()) {
                activityData = activityDoc.data();
              }
            } catch (error) {
              console.log('activities 컬렉션에서 찾지 못함:', error);
            }
          }
          
          if (activityData) {
            const locationName = activityData.location || activityData.activity || activityData.activityName || '기본 위치';
            
            // 먼저 AI 분석 결과에서 찾기
            const aiLocationInfo = await getAILocationInfo(id, locationName);
            if (aiLocationInfo) {
              return res.status(200).json({
                success: true,
                locationInfo: {
                  ...aiLocationInfo,
                  visitDate: activityData.date || activityData.visitDate || new Date().toISOString().split('T')[0],
                  source: 'ai_analysis'
                }
              });
            }
            
            // AI 분석 결과가 없으면 기본 위치 정보에서 찾기
            const locationInfo = getLocationData(locationName);
            
            if (locationInfo) {
              return res.status(200).json({
                success: true,
                locationInfo: {
                  ...locationInfo,
                  visitDate: activityData.date || activityData.visitDate || new Date().toISOString().split('T')[0],
                  source: 'default_data'
                }
              });
            }
          }
        } catch (error) {
          console.error('활동 정보 조회 오류:', error);
        }
      }

      // 기존 로직 (location, date 파라미터 사용)
      if (location) {
        // AI 분석 결과에서 찾기
        const aiLocationInfo = await getAILocationInfo(null, location);
        if (aiLocationInfo) {
          return res.status(200).json({
            success: true,
            locationInfo: {
              ...aiLocationInfo,
              visitDate: date || new Date().toISOString().split('T')[0],
              source: 'ai_analysis'
            }
          });
        }
        
        // 기본 위치 정보에서 찾기
        const locationInfo = getLocationData(location);
        
        if (locationInfo) {
          return res.status(200).json({
            success: true,
            locationInfo: {
              ...locationInfo,
              visitDate: date || new Date().toISOString().split('T')[0],
              source: 'default_data'
            }
          });
        }
      }

      // 기본 위치 정보 반환
      const defaultLocation = getLocationData('프라하 제1고등학교');
      return res.status(200).json({
        success: true,
        locationInfo: {
          ...defaultLocation,
          visitDate: date || new Date().toISOString().split('T')[0],
          source: 'default_fallback'
        }
      });

    } catch (error) {
      console.error('Location info error:', error);
      res.status(500).json({ 
        success: false, 
        error: '위치 정보를 불러오는 중 오류가 발생했습니다.' 
      });
    }
  } else {
    res.status(405).json({ 
      success: false, 
      error: '허용되지 않는 메서드입니다.' 
    });
  }
}

// AI 분석 결과에서 위치 정보 가져오기
async function getAILocationInfo(scheduleId, locationName) {
  try {
    const locationAnalysisRef = collection(db, 'location-analysis');
    let q;
    
    if (scheduleId) {
      q = query(locationAnalysisRef, where('scheduleId', '==', scheduleId));
    } else {
      q = query(locationAnalysisRef, where('location', '==', locationName));
    }
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      // AI 분석 결과를 위치 정보 형식으로 변환
      return {
        name: data.location,
        address: data.analyzedInfo?.address || '주소 정보 없음',
        description: data.analyzedInfo || 'AI가 분석한 장소 정보입니다.',
        transportation: {
          subway: data.analyzedInfo?.transportation?.subway || '교통 정보 없음',
          bus: data.analyzedInfo?.transportation?.bus || '버스 정보 없음',
          tram: data.analyzedInfo?.transportation?.tram || '트램 정보 없음'
        },
        hours: data.analyzedInfo?.hours || '운영시간 정보 없음',
        phone: data.analyzedInfo?.phone || '연락처 정보 없음',
        website: data.analyzedInfo?.website || '웹사이트 정보 없음',
        admission: data.analyzedInfo?.admission || '입장료 정보 없음',
        nearby: data.analyzedInfo?.nearby || [],
        tips: data.analyzedInfo?.tips || [],
        aiAnalyzed: true,
        analysisDate: data.analysisDate
      };
    }
    
    return null;
  } catch (error) {
    console.error('AI 위치 정보 조회 오류:', error);
    return null;
  }
}

function getLocationData(locationName) {
  // 방문장소 정보 데이터 (확장된 버전)
  const locationData = {
    '프라하 성': {
      name: '프라하 성 (Pražský hrad)',
      address: 'Hradčany, 119 08 Praha 1, Czech Republic',
      description: '체코의 상징적인 성채로, 중세 시대부터 이어져온 역사적 건축물입니다.',
      transportation: {
        subway: '지하철 A호선 Malostranská역',
        bus: '22번, 23번 버스',
        tram: '22번, 23번 트램'
      },
      hours: '09:00-17:00 (4월-10월), 09:00-16:00 (11월-3월)',
      phone: '+420 224 373 368',
      website: 'www.hrad.cz',
      admission: '성내 구역 무료, 개별 건물 유료',
      nearby: [
        { name: '성 세인트 비투스 대성당', distance: '0.1km', type: '🏛️ 종교' },
        { name: '골든 레인', distance: '0.2km', type: '🏘️ 관광' },
        { name: '성 조지 대성당', distance: '0.1km', type: '🏛️ 종교' }
      ],
      tips: [
        '오전 일찍 방문하면 관광객이 적습니다',
        '성내 구역은 무료이지만 개별 건물은 유료입니다',
        '가이드 투어를 예약하면 더 자세한 설명을 들을 수 있습니다'
      ]
    },
    '카를교': {
      name: '카를교 (Karlův most)',
      address: 'Karlův most, 110 00 Praha 1, Czech Republic',
      description: '1357년에 건설된 고딕 양식의 돌다리로, 프라하의 상징적인 랜드마크입니다.',
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
        { name: '올드타운 스퀘어', distance: '0.3km', type: '🏛️ 관광' },
        { name: '성 니콜라스 교회', distance: '0.2km', type: '🏛️ 종교' },
        { name: '요한 레넌츠 동상', distance: '0.1km', type: '🗿 기념물' }
      ],
      tips: [
        '일출과 일몰 시간에 가장 아름다운 사진을 찍을 수 있습니다',
        '거리 예술가들의 공연을 감상할 수 있습니다',
        '다리 위의 30개의 성인 동상을 관찰해보세요'
      ]
    },
    '프라하 국립박물관': {
      name: '프라하 국립박물관 (Národní muzeum)',
      address: 'Václavské nám. 68, 110 00 Praha 1, Czech Republic',
      description: '체코의 역사, 자연사, 문화를 전시하는 국립 박물관입니다.',
      transportation: {
        subway: '지하철 A호선, C호선 Muzeum역',
        bus: '505번, 511번 버스',
        tram: '3번, 9번, 14번, 24번 트램'
      },
      hours: '10:00-18:00 (화-일요일)',
      phone: '+420 224 497 111',
      website: 'www.nm.cz',
      admission: '성인 250 CZK, 학생 170 CZK',
      nearby: [
        { name: '바츨라프 광장', distance: '0.1km', type: '🏛️ 관광' },
        { name: '국립극장', distance: '0.5km', type: '🎭 문화' },
        { name: '루체르나 궁전', distance: '0.3km', type: '🏛️ 건축' }
      ],
      tips: [
        '매월 첫 번째 월요일은 무료 입장입니다',
        '오디오 가이드를 대여하면 더 자세한 설명을 들을 수 있습니다',
        '박물관 카페에서 휴식을 취할 수 있습니다'
      ]
    },
    '프라하 제1고등학교': {
      name: '프라하 제1고등학교 (První české gymnázium)',
      address: 'Jánská 22, 110 00 Praha 1, Czech Republic',
      description: '체코의 대표적인 고등학교로, 전통적인 교육 방식과 현대적 교육을 결합합니다.',
      transportation: {
        subway: '지하철 A호선 Staroměstská역',
        bus: '194번, 207번 버스',
        tram: '17번, 18번 트램'
      },
      hours: '08:00-16:00 (평일)',
      phone: '+420 222 329 111',
      website: 'www.gymnazium-janska.cz',
      admission: '방문 예약 필요',
      nearby: [
        { name: '올드타운 스퀘어', distance: '0.2km', type: '🏛️ 관광' },
        { name: '티인 교회', distance: '0.1km', type: '🏛️ 종교' },
        { name: '카를교', distance: '0.3km', type: '🌉 관광' }
      ],
      tips: [
        '방문 전에 학교에 미리 연락하여 예약하는 것이 좋습니다',
        '교육 시설과 수업 방식을 관찰할 수 있습니다',
        '학생들과의 교류 기회가 있을 수 있습니다'
      ]
    },
    'Josephine-Baker-Gesamtschule Frankfurt': {
      name: 'Josephine-Baker-Gesamtschule Frankfurt',
      address: 'Gräfin-Dönhoff-Str. 11, 60438 Frankfurt',
      description: '독일의 종합중고등학교로, 포용적 교육 체계와 프로젝트 중심 학습을 특징으로 합니다.',
      transportation: {
        subway: 'U-Bahn 4, 5호선 Eschersheim역',
        bus: '34번, 35번 버스',
        tram: '12번, 16번 트램'
      },
      hours: '08:15-16:00 (평일)',
      phone: '+49 69 212 45678',
      website: 'https://www.josephine-baker-gesamtschule.org/',
      admission: '방문 예약 필요',
      nearby: [
        { name: 'Frankfurt Zoo', distance: '1.2km', type: '🦁 관광' },
        { name: 'Palmengarten', distance: '2.1km', type: '🌺 자연' },
        { name: 'Frankfurt University', distance: '3.5km', type: '🎓 교육' }
      ],
      tips: [
        '방문 전에 학교에 미리 연락하여 예약하는 것이 좋습니다',
        '포용적 교육 체계와 프로젝트 중심 학습을 관찰할 수 있습니다',
        '교사 협업 중심 운영 방식을 학습할 수 있습니다'
      ]
    },
    // 추가 장소들
    '프라하 교육청': {
      name: '프라하 교육청 (Praha Education Department)',
      address: 'Mariánské nám. 2, 110 00 Praha 1, Czech Republic',
      description: '프라하 지역의 교육 정책과 행정을 담당하는 공식 기관입니다.',
      transportation: {
        subway: '지하철 A호선 Staroměstská역',
        bus: '194번, 207번 버스',
        tram: '17번, 18번 트램'
      },
      hours: '09:00-17:00 (평일)',
      phone: '+420 236 002 111',
      website: 'www.praha.eu',
      admission: '방문 예약 필요',
      nearby: [
        { name: '올드타운 스퀘어', distance: '0.1km', type: '🏛️ 관광' },
        { name: '티인 교회', distance: '0.2km', type: '🏛️ 종교' },
        { name: '카를교', distance: '0.3km', type: '🌉 관광' }
      ],
      tips: [
        '공식 방문은 사전 예약이 필수입니다',
        '교육 정책 관련 자료를 미리 준비하면 좋습니다',
        '통역 서비스가 필요할 수 있습니다'
      ]
    },
    '체코 국립도서관': {
      name: '체코 국립도서관 (Národní knihovna České republiky)',
      address: 'Klementinum 190, 110 00 Praha 1, Czech Republic',
      description: '체코의 대표적인 국립도서관으로, 방대한 장서와 역사적 건물을 보유하고 있습니다.',
      transportation: {
        subway: '지하철 A호선 Staroměstská역',
        bus: '194번, 207번 버스',
        tram: '17번, 18번 트램'
      },
      hours: '09:00-19:00 (평일), 09:00-17:00 (토요일)',
      phone: '+420 221 663 111',
      website: 'www.nkp.cz',
      admission: '무료 (도서관 카드 필요)',
      nearby: [
        { name: '카를교', distance: '0.2km', type: '🌉 관광' },
        { name: '올드타운 스퀘어', distance: '0.3km', type: '🏛️ 관광' },
        { name: '성 니콜라스 교회', distance: '0.1km', type: '🏛️ 종교' }
      ],
      tips: [
        '도서관 카드 발급이 필요합니다',
        '사진 촬영은 제한적입니다',
        '조용한 학습 환경을 유지해야 합니다'
      ]
    },
    '프라하 제15중학교': {
      name: '프라하 제15중학교 (Gymnázium Jana Keplera)',
      address: 'Parléřova 2, 169 00 Praha 6, Czech Republic',
      description: '프라하의 우수한 중등교육 기관으로, 혁신적인 교육 방법을 적용하고 있습니다.',
      transportation: {
        subway: '지하철 A호선 Hradčanská역',
        bus: '108번, 174번 버스',
        tram: '1번, 2번, 18번 트램'
      },
      hours: '08:00-16:00 (평일)',
      phone: '+420 220 514 111',
      website: 'www.gjk.cz',
      admission: '방문 예약 필요',
      nearby: [
        { name: '프라하 성', distance: '0.5km', type: '🏰 관광' },
        { name: '페트린 타워', distance: '0.8km', type: '🗼 관광' },
        { name: '스트라호프 수도원', distance: '1.2km', type: '🏛️ 종교' }
      ],
      tips: [
        '교육 현장 방문은 사전 승인이 필요합니다',
        '수업 참관 시 방해가 되지 않도록 주의해야 합니다',
        '학생들과의 교류 기회를 활용하세요'
      ]
    },
    // 숙소 정보 추가
    '호텔': {
      name: '프라하 호텔',
      address: 'Praha, Czech Republic',
      description: '연수 참가자들이 숙박하는 호텔입니다. 편안한 휴식과 준비를 위한 공간을 제공합니다.',
      transportation: {
        subway: '지하철 A호선, B호선, C호선',
        bus: '다양한 버스 노선',
        tram: '다양한 트램 노선'
      },
      hours: '24시간 운영',
      phone: '+420 호텔 연락처',
      website: '호텔 웹사이트',
      admission: '숙박객 전용',
      nearby: [
        { name: '프라하 시내', distance: '0.5-2km', type: '🏛️ 관광' },
        { name: '대중교통', distance: '0.1-0.5km', type: '🚇 교통' },
        { name: '편의시설', distance: '0.1-0.3km', type: '🛒 편의' }
      ],
      tips: [
        '체크인/체크아웃 시간을 확인하세요',
        '호텔 내 편의시설을 활용하세요',
        '안전한 여행을 위해 호텔 정보를 잘 보관하세요'
      ]
    },
    '숙소': {
      name: '연수 숙소',
      address: 'Praha, Czech Republic',
      description: '연수 참가자들이 숙박하는 숙소입니다. 편안한 휴식과 준비를 위한 공간을 제공합니다.',
      transportation: {
        subway: '지하철 A호선, B호선, C호선',
        bus: '다양한 버스 노선',
        tram: '다양한 트램 노선'
      },
      hours: '24시간 운영',
      phone: '+420 숙소 연락처',
      website: '숙소 웹사이트',
      admission: '숙박객 전용',
      nearby: [
        { name: '프라하 시내', distance: '0.5-2km', type: '🏛️ 관광' },
        { name: '대중교통', distance: '0.1-0.5km', type: '🚇 교통' },
        { name: '편의시설', distance: '0.1-0.3km', type: '🛒 편의' }
      ],
      tips: [
        '체크인/체크아웃 시간을 확인하세요',
        '숙소 내 편의시설을 활용하세요',
        '안전한 여행을 위해 숙소 정보를 잘 보관하세요'
      ]
    }
  };

  // 위치 이름 매칭 (더 정확한 매칭)
  const normalizedLocationName = locationName.toLowerCase().trim();
  
  // 1. 정확한 키 매칭
  if (locationData[locationName]) {
    return locationData[locationName];
  }
  
  // 2. 부분 일치 매칭 (더 정확하게)
  for (const [key, value] of Object.entries(locationData)) {
    const normalizedKey = key.toLowerCase();
    const normalizedValueName = value.name.toLowerCase();
    
    // 키나 값 이름에 포함되어 있는지 확인
    if (normalizedKey.includes(normalizedLocationName) || 
        normalizedLocationName.includes(normalizedKey) ||
        normalizedValueName.includes(normalizedLocationName) ||
        normalizedLocationName.includes(normalizedValueName)) {
      return value;
    }
  }
  
  // 3. 키워드 매칭 (더 유연한 매칭)
  const keywords = {
    '프라하': ['프라하 성', '프라하 제1고등학교', '프라하 국립박물관', '프라하 교육청', '프라하 제15중학교'],
    '카를': ['카를교'],
    '박물관': ['프라하 국립박물관'],
    '학교': ['프라하 제1고등학교', 'Josephine-Baker-Gesamtschule Frankfurt', '프라하 제15중학교'],
    '고등학교': ['프라하 제1고등학교'],
    '중학교': ['프라하 제15중학교'],
    '성': ['프라하 성'],
    '교': ['카를교'],
    '교육청': ['프라하 교육청'],
    '도서관': ['체코 국립도서관'],
    'frankfurt': ['Josephine-Baker-Gesamtschule Frankfurt'],
    'gesamtschule': ['Josephine-Baker-Gesamtschule Frankfurt'],
    '국립': ['프라하 국립박물관', '체코 국립도서관'],
    '호텔': ['호텔', '숙소'],
    '숙소': ['호텔', '숙소'],
    'hotel': ['호텔', '숙소'],
    'accommodation': ['호텔', '숙소']
  };
  
  for (const [keyword, locations] of Object.entries(keywords)) {
    if (normalizedLocationName.includes(keyword.toLowerCase())) {
      for (const location of locations) {
        if (locationData[location]) {
          return locationData[location];
        }
      }
    }
  }

  // 4. 기본값 반환 (더 유용한 정보 제공)
  console.log('위치 매칭 실패, 기본값 사용:', locationName);
  return {
    name: locationName,
    address: '주소 정보 없음',
    description: `${locationName}은(는) 연수 활동에 적합한 장소입니다.`,
    transportation: {
      subway: '교통 정보 없음',
      bus: '교통 정보 없음',
      tram: '교통 정보 없음'
    },
    hours: '운영시간 정보 없음',
    phone: '연락처 정보 없음',
    website: '웹사이트 정보 없음',
    admission: '입장료 정보 없음',
    nearby: [],
    tips: [
      '방문 전에 운영시간을 확인하세요',
      '사전 예약이 필요할 수 있습니다',
      '현지 가이드의 도움을 받으면 좋습니다'
    ]
  };
} 