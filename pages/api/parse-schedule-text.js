// AI 기반 텍스트 스케줄 파싱 API (JSON 전용)
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// AI 프롬프트 템플릿
const SCHEDULE_PARSING_PROMPT = `
당신은 국외 연수 일정표를 분석하는 전문가입니다. 주어진 텍스트에서 일정 정보를 추출하고 구조화된 JSON 형태로 변환해 주세요.

텍스트는 다양한 형태일 수 있습니다:
1. 자유형 텍스트 (날짜, 시간, 활동이 자연스럽게 서술)
2. 표 형식 (일자, 장소, 시간, 세부일정이 열로 구분)
3. 목록 형식 (번호나 기호로 구분된 일정)

추출해야 할 정보:
1. 날짜 (예: 8/5, 제1일, 2025년 8월 1일 등 다양한 형식)
2. 시간 (예: 10:00, 9시 등)
3. 활동 내용 (세부 일정, 방문 기관, 활동 등)
4. 장소 (도시, 기관명, 주소 등)
5. 특별 주의사항이나 비고

출력 형식 (JSON):
{
  "schedules": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "activity": "활동 내용",
      "location": "장소",
      "participants": "참가자",
      "notes": "특별사항",
      "category": "이동|식사|관광|교육|자유시간|기타"
    }
  ],
  "metadata": {
    "title": "일정표 제목",
    "duration": "기간",
    "destination": "목적지",
    "totalParticipants": "참가자 수"
  }
}

표 형식인 경우 각 행의 정보를 잘 분석하여 날짜, 시간, 장소, 활동을 정확히 매핑해주세요.
"제N일" 형식의 날짜는 첫날을 기준으로 계산하여 실제 날짜로 변환해주세요.

다음 텍스트를 분석해 주세요:
`;

// AI 기반 스케줄 파싱
async function parseScheduleWithAI(text) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = SCHEDULE_PARSING_PROMPT + text;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();
    
    console.log('AI 응답:', generatedText.substring(0, 500) + '...');
    
    // JSON 추출 (```json...``` 형태로 감싸져 있을 수 있음)
    const jsonMatch = generatedText.match(/```json\s*([\s\S]*?)\s*```/) || 
                     generatedText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonText);
    } else {
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');
    }
  } catch (error) {
    console.error('AI 파싱 오류:', error);
    throw error;
  }
}

// 규칙 기반 백업 파싱
function parseScheduleWithRules(text) {
  const schedules = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // 표 형식 데이터 패턴 감지
  const isTableFormat = text.includes('제1일') || text.includes('일 자') || text.includes('장 소');
  
  if (isTableFormat) {
    return parseTableFormat(text);
  }
  
  // 기존 자유형 텍스트 파싱
  return parseFreeText(text);
}

// 표 형식 파싱
function parseTableFormat(text) {
  const schedules = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentDate = null;
  let currentLocation = null;
  const currentYear = new Date().getFullYear();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // "제N일" 형식 날짜 찾기
    const dayMatch = line.match(/제(\d+)일/);
    if (dayMatch) {
      const dayNumber = parseInt(dayMatch[1]);
      // 다음 줄에서 실제 날짜 찾기
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const dateMatch = nextLine.match(/(\d{1,2})\/(\d{1,2})/);
        if (dateMatch) {
          const month = dateMatch[1].padStart(2, '0');
          const day = dateMatch[2].padStart(2, '0');
          currentDate = `${currentYear}-${month}-${day}`;
        }
      }
      continue;
    }
    
    // 날짜 패턴 (8/5, 8/6 등)
    const dateMatch = line.match(/(\d{1,2})\/(\d{1,2})/);
    if (dateMatch) {
      const month = dateMatch[1].padStart(2, '0');
      const day = dateMatch[2].padStart(2, '0');
      currentDate = `${currentYear}-${month}-${day}`;
      continue;
    }
    
    // 장소 정보 (도시명, 기관명)
    if (line.includes('체코') || line.includes('오스트리아') || line.includes('인천') || 
        line.includes('프라하') || line.includes('비엔나') || line.includes('짤쯔부르크')) {
      currentLocation = line;
      continue;
    }
    
    // 시간과 활동 패턴
    const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch && currentDate) {
      const time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      
      // 같은 줄 또는 다음 줄에서 활동 내용 찾기
      let activity = line.replace(/\d{1,2}:\d{2}/, '').trim();
      
      // 다음 몇 줄을 확인하여 활동 내용 수집
      let j = i + 1;
      while (j < lines.length && j < i + 5) {
        const nextLine = lines[j].trim();
        if (nextLine && !nextLine.match(/\d{1,2}:\d{2}/) && 
            !nextLine.match(/제\d+일/) && !nextLine.match(/\d{1,2}\/\d{1,2}/)) {
          activity += ' ' + nextLine;
        } else {
          break;
        }
        j++;
      }
      
      if (activity) {
        schedules.push({
          date: currentDate,
          time: time,
          activity: activity.trim(),
          location: currentLocation || '',
          participants: '',
          notes: '',
          category: categorizeActivity(activity)
        });
      }
    }
  }
  
  return {
    schedules: schedules,
    metadata: {
      title: '해외 연수 일정표',
      duration: schedules.length > 0 ? `${schedules[0].date} ~ ${schedules[schedules.length-1].date}` : '',
      destination: currentLocation || '',
      totalParticipants: ''
    }
  };
}

// 자유형 텍스트 파싱 (기존 로직)
function parseFreeText(text) {
  const schedules = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // 날짜 패턴 (다양한 형식 지원)
  const datePatterns = [
    /(\d{4})[년.-](\d{1,2})[월.-](\d{1,2})[일]?/g,
    /(\d{1,2})[월.-](\d{1,2})[일]?/g,
    /(\d{1,2})\/(\d{1,2})/g
  ];
  
  // 시간 패턴
  const timePattern = /(\d{1,2}):(\d{2})|(\d{1,2})시\s*(\d{2})?분?/g;
  
  let currentDate = null;
  
  for (const line of lines) {
    // 날짜 찾기
    for (const pattern of datePatterns) {
      const dateMatch = pattern.exec(line);
      if (dateMatch) {
        if (dateMatch[1] && dateMatch[1].length === 4) {
          // YYYY-MM-DD 형식
          currentDate = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}`;
        } else if (dateMatch[1] && dateMatch[1].length <= 2) {
          // MM-DD 형식 (현재 년도 추가)
          const currentYear = new Date().getFullYear();
          currentDate = `${currentYear}-${String(dateMatch[1]).padStart(2, '0')}-${String(dateMatch[2]).padStart(2, '0')}`;
        }
        break;
      }
    }
    
    // 시간과 활동 찾기
    const timeMatch = timePattern.exec(line);
    if (timeMatch && currentDate) {
      const hour = timeMatch[1] || timeMatch[3];
      const minute = timeMatch[2] || timeMatch[4] || '00';
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      
      // 활동 내용 추출 (시간 정보 제거)
      const activity = line.replace(timePattern, '').trim().replace(/^[-•\s]+/, '');
      
      if (activity) {
        schedules.push({
          date: currentDate,
          time: time,
          activity: activity,
          location: '',
          participants: '',
          notes: '',
          category: categorizeActivity(activity)
        });
      }
    }
  }
  
  return {
    schedules: schedules,
    metadata: {
      title: '파싱된 일정표',
      duration: schedules.length > 0 ? `${schedules[0].date} ~ ${schedules[schedules.length-1].date}` : '',
      destination: '',
      totalParticipants: ''
    }
  };
}

// 활동 카테고리 분류
function categorizeActivity(activity) {
  const categories = {
    '이동': ['출발', '도착', '이동', '공항', '버스', '기차', '항공', '에서', '으로'],
    '식사': ['조식', '중식', '석식', '아침', '점심', '저녁', '식사', '레스토랑'],
    '관광': ['관광', '견학', '투어', '방문', '구경', '산책', '문화유적지', '마을', '할슈타트', '쇤부른', '벨베데레'],
    '교육': ['강의', '수업', '세미나', '워크숍', '교육', '학습', '연수과제', '면담', '기관 방문', '도서관', '교육청', '에듀테크', '프로그램'],
    '자유시간': ['자유', '개인', '휴식', '쇼핑', '자율'],
    '회의': ['협의회', '분임', '토의', '정리', '점검']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => activity.includes(keyword))) {
      return category;
    }
  }
  
  return '기타';
}

export default async function handler(req, res) {
  console.log('🔍 텍스트 스케줄 파싱 API 호출됨:', req.method, req.headers['content-type']);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 메서드만 지원됩니다' });
  }

  try {
    const { text } = req.body || {};
    
    if (!text) {
      console.log('요청 본문:', req.body);
      return res.status(400).json({ error: '텍스트가 제공되지 않았습니다' });
    }
    
    console.log('받은 텍스트 길이:', text.length);
    console.log('텍스트 미리보기:', text.substring(0, 200) + '...');

    let result;
    let usedMethod = '';

    try {
      // AI 파싱 시도
      result = await parseScheduleWithAI(text);
      usedMethod = 'AI';
      console.log('✅ AI 파싱 성공');
    } catch (aiError) {
      console.warn('AI 파싱 실패, 규칙 기반 파싱으로 전환:', aiError.message);
      
      try {
        // 규칙 기반 백업 파싱
        result = parseScheduleWithRules(text);
        usedMethod = 'Rules';
        console.log('✅ 규칙 기반 파싱 성공');
      } catch (rulesError) {
        console.error('규칙 기반 파싱도 실패:', rulesError.message);
        return res.status(500).json({ 
          error: '스케줄 파싱에 실패했습니다',
          details: {
            aiError: aiError.message,
            rulesError: rulesError.message
          }
        });
      }
    }

    // 결과 검증 및 정제
    if (!result.schedules || !Array.isArray(result.schedules)) {
      result.schedules = [];
    }

    // 메타데이터 기본값 설정
    if (!result.metadata) {
      result.metadata = {
        title: '파싱된 일정표',
        duration: '',
        destination: '',
        totalParticipants: ''
      };
    }

    console.log(`📊 파싱 완료: ${result.schedules.length}개 스케줄, 방법: ${usedMethod}`);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        parseMethod: usedMethod,
        inputMethod: 'text',
        scheduleCount: result.schedules.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('스케줄 파싱 API 오류:', error);
    res.status(500).json({ 
      error: '서버 오류가 발생했습니다',
      details: error.message 
    });
  }
}
