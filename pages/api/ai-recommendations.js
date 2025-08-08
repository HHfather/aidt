export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { hotelAddress, location, theme = '맛집' } = req.body

    // AI 추천 로직 (실제로는 OpenAI API 등을 사용)
    const recommendations = await generateAIRecommendations(hotelAddress, location, theme)
    
    res.status(200).json({ 
      success: true, 
      recommendations 
    })
  } catch (error) {
    console.error('AI 추천 오류:', error)
    res.status(500).json({ 
      success: false, 
      error: '추천 생성 중 오류가 발생했습니다.' 
    })
  }
}

async function generateAIRecommendations(hotelAddress, location) {
  // 실제 AI API 호출 대신 위치 기반 추천 로직
  const locationLower = location?.toLowerCase() || ''
  const addressLower = hotelAddress?.toLowerCase() || ''
  
  // 위치별 추천 장소
  if (locationLower.includes('프라하') || locationLower.includes('prague') || 
      addressLower.includes('프라하') || addressLower.includes('prague')) {
    return [
      {
        id: 1,
        name: '프라하 성',
        category: '관광',
        description: '체코의 상징적인 성과 역사적 건축물',
        position: { lat: 50.0911, lng: 14.4016 },
        distance: '0.2km',
        rating: 4.8
      },
      {
        id: 2,
        name: '찰스 다리',
        category: '관광',
        description: '프라하의 유명한 중세 다리',
        position: { lat: 50.0865, lng: 14.4114 },
        distance: '0.5km',
        rating: 4.7
      },
      {
        id: 3,
        name: '올드타운 스퀘어',
        category: '관광',
        description: '프라하의 중심 광장과 천문시계',
        position: { lat: 50.0875, lng: 14.4213 },
        distance: '0.8km',
        rating: 4.9
      },
      {
        id: 4,
        name: '빈셔스 광장',
        category: '쇼핑',
        description: '프라하의 주요 쇼핑 거리',
        position: { lat: 50.0811, lng: 14.4276 },
        distance: '1.0km',
        rating: 4.5
      },
      {
        id: 5,
        name: '요제포프 유대인 묘지',
        category: '문화',
        description: '유럽에서 가장 오래된 유대인 묘지',
        position: { lat: 50.0899, lng: 14.4175 },
        distance: '0.3km',
        rating: 4.6
      }
    ]
  } else if (locationLower.includes('서울') || locationLower.includes('seoul') || 
             addressLower.includes('서울') || addressLower.includes('seoul')) {
    return [
      {
        id: 1,
        name: '강남역 지하상가',
        category: '쇼핑',
        description: '다양한 쇼핑몰과 음식점이 있는 지하상가',
        position: { lat: 37.4981, lng: 127.0276 },
        distance: '0.2km',
        rating: 4.5
      },
      {
        id: 2,
        name: '코엑스몰',
        category: '쇼핑',
        description: '대형 쇼핑몰과 아쿠아리움',
        position: { lat: 37.5125, lng: 127.0589 },
        distance: '0.5km',
        rating: 4.7
      },
      {
        id: 3,
        name: '롯데월드타워',
        category: '관광',
        description: '서울의 랜드마크, 전망대와 쇼핑몰',
        position: { lat: 37.5139, lng: 127.1026 },
        distance: '0.8km',
        rating: 4.8
      },
      {
        id: 4,
        name: '한강공원',
        category: '자연',
        description: '한강변 공원, 산책과 운동하기 좋은 곳',
        position: { lat: 37.5215, lng: 126.9369 },
        distance: '1.0km',
        rating: 4.6
      },
      {
        id: 5,
        name: '삼성동 무역센터',
        category: '비즈니스',
        description: '국제무역센터와 전시장',
        position: { lat: 37.5087, lng: 127.0642 },
        distance: '0.3km',
        rating: 4.4
      }
    ]
  } else {
    // 기본 추천 (일반적인 장소)
    return [
      {
        id: 1,
        name: '주변 쇼핑몰',
        category: '쇼핑',
        description: '다양한 쇼핑과 음식점',
        position: { lat: 37.5665, lng: 126.9780 },
        distance: '0.2km',
        rating: 4.5
      },
      {
        id: 2,
        name: '관광 명소',
        category: '관광',
        description: '지역의 주요 관광지',
        position: { lat: 37.5665, lng: 126.9780 },
        distance: '0.5km',
        rating: 4.7
      },
      {
        id: 3,
        name: '공원',
        category: '자연',
        description: '산책과 휴식하기 좋은 공원',
        position: { lat: 37.5665, lng: 126.9780 },
        distance: '0.8km',
        rating: 4.6
      },
      {
        id: 4,
        name: '음식점',
        category: '음식',
        description: '현지 맛집',
        position: { lat: 37.5665, lng: 126.9780 },
        distance: '1.0km',
        rating: 4.4
      },
      {
        id: 5,
        name: '문화시설',
        category: '문화',
        description: '박물관이나 갤러리',
        position: { lat: 37.5665, lng: 126.9780 },
        distance: '0.3km',
        rating: 4.3
      }
    ]
  }
} 