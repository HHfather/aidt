import { db } from '../../firebaseConfig';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getHotelInfo(region, date) {
  try {
    const hotelRef = doc(db, 'hotelInfo', `${region}_${date}`);
    const hotelDoc = await getDoc(hotelRef);
    if (hotelDoc.exists()) {
      return hotelDoc.data();
    }
  } catch (error) {
    console.error('숙소 정보 조회 실패:', error);
  }
  return null;
}

async function generateRecommendations(theme, hotelInfo, placeCount, existingPlaces = [], radius = null) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
    }

    let prompt;
    if (hotelInfo?.hotelAddress) {
        prompt = `사용자의 숙소는 "${hotelInfo.hotelAddress}"입니다. 이 주소를 중심으로 한 현지 여행 전문가로서, 다음 요청에 따라 여행 장소를 추천해주세요.`;
        if (radius) {
            prompt += ` 모든 추천 장소는 반드시 숙소 반경 ${radius / 1000}km 이내에 있어야 합니다.`;
        } else {
            prompt += ` 모든 추천 장소는 대중교통 또는 도보로 30분 이내 거리에 있어야 합니다.`
        }
    } else {
        prompt = `당신은 현지 여행 전문가입니다. 사용자의 요청에 따라 여행 장소를 추천해주세요.`;
    }

    prompt += `\n\n- **매우 중요한 지시사항**: 추천하는 모든 장소는 반드시 "${theme}" 테마와 직접적으로 관련된 장소여야 합니다.
- 추천 개수: ${placeCount}개`;

    if (existingPlaces.length > 0) {
      const existingPlaceNames = existingPlaces.map(p => p.name).join(', ');
      prompt += `\n- 제외할 장소: 다음 장소들은 이미 추천되었으니 반드시 제외해주세요: ${existingPlaceNames}`;
    }

    prompt += `\n\n각 장소는 아래의 JSON 형식에 맞춰 응답해주세요:\n
{
  "places": [
    {
      "name": "장소명 (한글)",
      "original_name": "Original Store Name (e.g., Le Procope)",
      "description": "장소에 대한 1~2문장의 특징적인 설명 (한글)",
      "rating": 4.5,
      "operating_hours": "영업 시간 (예: 09:00 - 18:00 또는 24시간 영업)",
      "location": "A 정확한 전체 주소 (예: 1600 Amphitheatre Parkway, Mountain View, CA)",
      "lat": 0.0,
      "lng": 0.0,
      "distance": "숙소와의 예상 거리 (예: 도보 15분)",
      "transport": "추천 교통수단 (예: 지하철, 버스, 도보)"
    }
  ]
}

- "lat", "lng"는 실제 정확한 위도, 경도 값을 반드시 포함해야 합니다.
- "rating"은 Google 평점을 기준으로 1.0에서 5.0 사이의 숫자여야 하며, 가급적 평점이 높은 곳을 추천해주세요.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.places || [];
    }
    
    return [];
  } catch (error) {
    console.error('AI 추천 생성 오류:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  const { region, date, theme, radius } = req.method === 'GET' ? req.query : req.body;

  if (!region || !date || !theme) {
    return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' });
  }

  const recommendationId = `${region}_${date}_${theme}` + (radius ? `_${radius}` : '');
  const recommendationRef = doc(db, 'recommendations', recommendationId);

  try {
    if (req.method === 'GET') {
      const docSnap = await getDoc(recommendationRef);
      if (docSnap.exists()) {
        return res.status(200).json({ success: true, data: docSnap.data().places });
      }

      const hotelInfo = await getHotelInfo(region, date);
      if (!hotelInfo) {
        return res.status(404).json({ success: false, error: '숙소 정보가 없어 추천을 생성할 수 없습니다.' });
      }
      
      const newPlaces = await generateRecommendations(theme, hotelInfo, 3, [], radius ? parseInt(radius) : null);

      await setDoc(recommendationRef, { places: newPlaces, createdAt: new Date().toISOString() });
      return res.status(200).json({ success: true, data: newPlaces });

    } else if (req.method === 'POST') { // '더보기' - radius 없이 넓은 범위 탐색
      const hotelInfo = await getHotelInfo(region, date);
      if (!hotelInfo) {
        return res.status(404).json({ success: false, error: '숙소 정보가 없어 추천을 생성할 수 없습니다.' });
      }
      
      // 더보기 시에는 모든 기존 추천을 참고하여 중복을 피함
      const allRecsQuery = query(collection(db, 'recommendations'), where('date', '==', date), where('region', '==', region), where('theme', '==', theme));
      const querySnapshot = await getDocs(allRecsQuery);
      const existingPlaces = querySnapshot.docs.flatMap(doc => doc.data().places);

      const additionalPlaces = await generateRecommendations(theme, hotelInfo, 2, existingPlaces, null); // radius 없이 호출
      
      // '더보기'로 받은 추천은 캐시하지 않고 바로 반환
      return res.status(200).json({ success: true, data: additionalPlaces });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API 핸들러 오류:', error.message);
    return res.status(500).json({ success: false, error: '추천 생성 중 서버에서 오류가 발생했습니다.' });
  }
}
