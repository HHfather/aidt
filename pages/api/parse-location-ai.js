import { db } from '../../firebaseConfig'
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { location, activity, scheduleId, userRegion } = req.body

    if (!location || !activity || !scheduleId) {
      return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' })
    }

    // AI 분석 시뮬레이션 (실제로는 OpenAI API 호출)
    const analyzedInfo = await analyzeLocationWithAI(location, activity, userRegion)

    // DB에 분석 결과 저장
    const locationAnalysisData = {
      scheduleId: scheduleId,
      location: location,
      activity: activity,
      userRegion: userRegion,
      analyzedInfo: analyzedInfo,
      analysisDate: new Date(),
      aiVersion: '1.0'
    }

    // 기존 분석 결과가 있는지 확인
    const existingQuery = query(
      collection(db, 'location-analysis'),
      where('scheduleId', '==', scheduleId),
      where('location', '==', location)
    )
    
    const existingDocs = await getDocs(existingQuery)
    
    if (!existingDocs.empty) {
      // 기존 문서 업데이트
      const docRef = doc(db, 'location-analysis', existingDocs.docs[0].id)
      await updateDoc(docRef, {
        analyzedInfo: analyzedInfo,
        analysisDate: new Date(),
        aiVersion: '1.0'
      })
    } else {
      // 새 문서 생성
      await addDoc(collection(db, 'location-analysis'), locationAnalysisData)
    }

    res.status(200).json({
      success: true,
      analyzedInfo: analyzedInfo,
      message: '장소 정보가 AI로 분석되어 저장되었습니다.'
    })

  } catch (error) {
    console.error('AI 장소 분석 오류:', error)
    res.status(500).json({
      success: false,
      error: 'AI 분석 중 오류가 발생했습니다.',
      details: error.message
    })
  }
}

async function analyzeLocationWithAI(location, activity, userRegion) {
  // 실제 OpenAI API 호출 대신 시뮬레이션
  // 실제 구현 시에는 OpenAI API를 사용하여 장소 정보를 분석
  
  // 위치별 맞춤형 정보 생성
  const locationLower = location.toLowerCase()
  
  // 기본 정보 구조
  let locationInfo = {
    name: location,
    address: '',
    description: '',
    transportation: {
      subway: '',
      bus: '',
      tram: ''
    },
    hours: '',
    phone: '',
    website: '',
    admission: '',
    nearby: [],
    tips: [],
    analysis: ''
  }
  
  // 위치별 맞춤 정보 생성
  if (locationLower.includes('프라하') || locationLower.includes('prague')) {
    if (locationLower.includes('성') || locationLower.includes('castle') || locationLower.includes('hrad')) {
      locationInfo = {
        name: location,
        address: 'Hradčany, 119 08 Praha 1, Czech Republic',
        description: '체코의 상징적인 성채로, 중세 시대부터 이어져온 역사적 건축물입니다. 현재는 대통령 관저로 사용되며, 체코의 문화와 역사를 한눈에 볼 수 있는 중요한 관광지입니다.\n\n성 내부에는 성 비투스 대성당, 옛 왕궁, 황금소로 등 다양한 역사적 건물들이 있으며, 프라하 시내를 조망할 수 있는 전망대도 마련되어 있습니다. 연수 참가자들에게는 체코의 역사와 문화를 체험할 수 있는 교육적 가치가 높은 장소입니다.',
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
        ],
        analysis: `${location}은(는) 체코의 대표적인 문화유산으로, ${activity} 활동에 매우 적합한 장소입니다. 역사적 가치와 교육적 의미가 깊어 연수 참가자들에게 특별한 경험을 제공할 것입니다.`
      }
    } else if (locationLower.includes('교') || locationLower.includes('bridge') || locationLower.includes('karl')) {
      locationInfo = {
        name: location,
        address: 'Karlův most, 110 00 Praha 1, Czech Republic',
        description: '1357년에 건설된 고딕 양식의 돌다리로, 프라하의 상징적인 랜드마크입니다. 30개의 성인 동상이 설치되어 있으며, 거리 예술가들의 공연을 감상할 수 있습니다.\n\n다리는 프라하의 구시가와 소시가를 연결하는 중요한 교량으로, 일출과 일몰 시간에 가장 아름다운 풍경을 제공합니다. 연수 참가자들에게는 프라하의 역사와 문화를 체험할 수 있는 특별한 경험을 제공하는 장소입니다.',
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
        ],
        analysis: `${location}은(는) 프라하의 상징적인 관광지로, ${activity} 활동을 통해 현지 문화와 역사를 체험할 수 있는 최적의 장소입니다.`
      }
    } else if (locationLower.includes('박물관') || locationLower.includes('museum') || locationLower.includes('muzeum')) {
      locationInfo = {
        name: location,
        address: 'Václavské nám. 68, 110 00 Praha 1, Czech Republic',
        description: '체코의 역사, 자연사, 문화를 전시하는 국립 박물관입니다. 방대한 컬렉션과 아름다운 건축물로 유명하며, 체코의 문화유산을 체계적으로 보존하고 전시하는 중요한 기관입니다.\n\n박물관은 다양한 전시실과 교육 프로그램을 운영하여 방문자들에게 체코의 역사와 문화를 깊이 있게 이해할 수 있는 기회를 제공합니다. 연수 참가자들에게는 체코의 문화와 역사를 학습할 수 있는 교육적 가치가 높은 장소입니다.',
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
        ],
        analysis: `${location}은(는) 체코의 문화와 역사를 체계적으로 학습할 수 있는 교육적 가치가 높은 장소입니다. ${activity} 활동에 매우 적합합니다.`
      }
    } else if (locationLower.includes('학교') || locationLower.includes('school') || locationLower.includes('gymnázium')) {
      locationInfo = {
        name: location,
        address: 'Jánská 22, 110 00 Praha 1, Czech Republic',
        description: '체코의 대표적인 교육 기관으로, 전통적인 교육 방식과 현대적 교육을 결합한 혁신적인 교육 환경을 제공합니다. 체코의 교육 시스템과 방법론을 직접 체험할 수 있는 중요한 기관입니다.\n\n학교는 다양한 교육 프로그램과 시설을 갖추고 있으며, 학생들과의 교류 기회도 제공합니다. 연수 참가자들에게는 체코의 교육 현장을 직접 관찰하고 학습할 수 있는 특별한 경험을 제공하는 장소입니다.',
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
        ],
        analysis: `${location}은(는) 체코의 교육 현장을 직접 체험할 수 있는 중요한 기관입니다. ${activity} 활동을 통해 현지 교육 시스템과 방법론을 학습할 수 있습니다.`
      }
    } else if (locationLower.includes('교육청') || locationLower.includes('education')) {
      locationInfo = {
        name: location,
        address: 'Mariánské nám. 2, 110 00 Praha 1, Czech Republic',
        description: '프라하 지역의 교육 정책과 행정을 담당하는 공식 기관으로, 체코의 교육 시스템과 정책을 이해할 수 있는 중요한 기관입니다. 교육 정책 수립과 행정 업무를 담당하는 핵심 기관입니다.\n\n교육청은 다양한 교육 프로그램과 정책을 운영하며, 교육 관계자들과의 면담 기회도 제공합니다. 연수 참가자들에게는 체코의 교육 정책과 행정 시스템을 이해할 수 있는 귀중한 학습 기회를 제공하는 장소입니다.',
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
        ],
        analysis: `${location}은(는) 체코의 교육 정책과 행정 시스템을 이해할 수 있는 공식 기관입니다. ${activity} 활동을 통해 교육 정책과 행정에 대한 인사이트를 얻을 수 있습니다.`
      }
    } else {
      // 일반적인 프라하 장소
      locationInfo = {
        name: location,
        address: 'Praha, Czech Republic',
        description: `${location}은(는) 프라하의 중요한 장소로, ${activity} 활동에 적합한 환경을 제공합니다. 프라하의 역사와 문화를 체험할 수 있는 의미 있는 장소입니다.\n\n이 장소는 연수 참가자들에게 현지 문화와 교육 환경을 직접 체험할 수 있는 기회를 제공하며, 교육적 가치가 높은 경험을 할 수 있는 최적의 환경을 갖추고 있습니다.`,
        transportation: {
          subway: '지하철 A호선, B호선, C호선',
          bus: '다양한 버스 노선',
          tram: '다양한 트램 노선'
        },
        hours: '09:00-18:00',
        phone: '+420 정보 없음',
        website: '정보 없음',
        admission: '정보 없음',
        nearby: [
          { name: '프라하 성', distance: '1-2km', type: '🏰 관광' },
          { name: '카를교', distance: '1-2km', type: '🌉 관광' },
          { name: '올드타운 스퀘어', distance: '1-2km', type: '🏛️ 관광' }
        ],
        tips: [
          '방문 전에 운영시간을 확인하세요',
          '대중교통을 이용하면 편리합니다',
          '현지 가이드의 도움을 받으면 좋습니다'
        ],
        analysis: `${location}은(는) 프라하의 중요한 장소로, ${activity} 활동을 통해 현지 문화와 교육 환경을 체험할 수 있습니다.`
      }
    }
  } else if (locationLower.includes('frankfurt') || locationLower.includes('독일')) {
    locationInfo = {
      name: location,
      address: 'Frankfurt am Main, Germany',
      description: `${location}은(는) 독일의 중요한 교육 기관으로, 혁신적인 교육 방법과 포용적 교육 체계를 특징으로 합니다.`,
      transportation: {
        subway: 'U-Bahn 4, 5호선',
        bus: '다양한 버스 노선',
        tram: '다양한 트램 노선'
      },
      hours: '08:00-16:00 (평일)',
      phone: '+49 정보 없음',
      website: '정보 없음',
      admission: '방문 예약 필요',
      nearby: [
        { name: 'Frankfurt Zoo', distance: '1-2km', type: '🦁 관광' },
        { name: 'Palmengarten', distance: '2-3km', type: '🌺 자연' },
        { name: 'Frankfurt University', distance: '3-4km', type: '🎓 교육' }
      ],
      tips: [
        '방문 전에 기관에 미리 연락하여 예약하는 것이 좋습니다',
        '독일어 통역이 필요할 수 있습니다',
        '교육 시설과 운영 방식을 관찰할 수 있습니다'
      ],
      analysis: `${location}은(는) 독일의 교육 현장을 체험할 수 있는 중요한 기관입니다. ${activity} 활동을 통해 독일의 교육 시스템과 방법론을 학습할 수 있습니다.`
    }
  } else {
    // 기타 장소
    locationInfo = {
      name: location,
      address: '주소 정보 없음',
      description: `${location}은(는) ${activity} 활동에 적합한 장소로, 연수 참가자들에게 특별한 경험을 제공할 것입니다.`,
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
      ],
      analysis: `${location}은(는) ${activity} 활동을 위한 중요한 장소입니다. 이곳에서 연수 참가자들은 현지 문화와 교육 환경을 체험할 수 있으며, 교육적 가치가 높은 경험을 할 수 있을 것입니다.`
    }
  }

  return locationInfo
} 