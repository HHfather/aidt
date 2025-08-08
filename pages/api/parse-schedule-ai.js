import { GoogleGenerativeAI } from '@google/generative-ai'

// .env.local 파일에 저장된 API 키를 사용합니다.
// 환경 변수 이름이 다르다면 이 부분을 수정해주세요. (예: process.env.MY_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { scheduleText, assignmentText } = req.body

    if (!scheduleText) {
      return res.status(400).json({ success: false, message: '일정 텍스트가 필요합니다.' })
    }

    // AI에게 전달할 프롬프트 구성
    const prompt = `
다음은 연수 일정 텍스트와 연수 과제 내용입니다.

[연수 일정]
${scheduleText}

[연수 과제]
${assignmentText || '연수 과제 내용이 없습니다.'}

[요청]
위의 연수 일정을 분석하여 JSON 형식으로 변환해주세요.

[파싱 규칙]
1. "제1일", "제2일" 등의 날짜 표시를 "YYYY-MM-DD" 형식으로 변환
   - 예: "제1일 8/5 (화)" → "2025-08-05"
   - 연도는 2025년으로 가정

2. 시간 형식 처리:
   - "10:00" → "10:00"
   - "9:00-12:00" → "09:00-12:00"
   - 시간이 범위로 표시된 경우 그대로 유지

3. 장소 정보 처리:
   - 메인 장소와 세부 장소가 모두 있는 경우 모두 포함
   - 예: "체코(프라하) LEVEBEE MENTOR ACADEMY" → "체코(프라하), LEVEBEE, MENTOR ACADEMY"

4. 활동 내용 처리:
   - "세부 일정 및 연수 내용" 컬럼의 내용을 그대로 사용
   - "▸" 기호가 있는 경우 포함하여 유지
   - 여러 줄의 내용이 있는 경우 하나의 문자열로 결합

5. 각 행을 개별 일정으로 처리:
   - 같은 날짜라도 시간이 다르면 별도 일정으로 분리
   - 장소가 다르면 별도 일정으로 분리

[JSON 형식]
[
  {
    "date": "YYYY-MM-DD",
    "time": "HH:mm",
    "activity": "활동 내용",
    "location": "장소"
  }
]

[주의사항]
- 빈 행이나 헤더 행은 무시
- "비고" 컬럼은 무시
- 날짜가 없는 행은 무시
- 최종 결과는 JSON 배열만 반환 (설명 없이)
`

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      console.log('Gemini 응답:', text)

      // Gemini 응답에서 JSON 부분만 추출 (```json ... ``` 형식 포함)
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```|(\[[\s\S]*\])/)

      if (jsonMatch) {
        // 첫 번째 또는 두 번째 캡처 그룹에서 JSON 문자열을 가져옵니다.
        const jsonString = jsonMatch[1] || jsonMatch[2]
        const parsedData = JSON.parse(jsonString)
        res.status(200).json({ success: true, data: parsedData })
      } else {
        console.error('AI 응답에서 JSON을 찾을 수 없습니다.')
        res.status(500).json({ success: false, message: 'AI 응답 처리 중 오류가 발생했습니다.' })
      }
    } catch (error) {
      console.error('Gemini API 오류:', error)
      res.status(500).json({ success: false, message: 'Gemini API 호출 중 오류가 발생했습니다.' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // 요청 본문 크기 제한을 10MB로 늘립니다.
    },
  },
}
