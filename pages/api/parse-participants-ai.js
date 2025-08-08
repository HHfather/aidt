import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { participantsText } = req.body;

    if (!participantsText) {
      return res.status(400).json({ success: false, message: '참가자 명단 텍스트가 필요합니다.' });
    }

    const prompt = `
다음은 참가자 명단 텍스트입니다. 이 텍스트를 분석하여 아래 JSON 형식에 맞춰 참가자 목록을 생성해주세요.
'name', 'affiliation', 'region' 필드는 필수입니다. 텍스트에서 해당 정보를 찾을 수 없으면 빈 문자열("")로 처리해주세요.

[참가자 명단 텍스트]
${participantsText}

[요청]
1. 위의 텍스트를 파싱하여 각 참가자의 '이름(name)', '소속(affiliation)', '권역(region)'을 추출해주세요.
2. 최종 결과는 반드시 JSON 배열만 포함해야 합니다. 설명이나 추가 텍스트 없이 JSON만 반환해주세요.
3. 분석이 불가능하면 빈 배열([])을 반환해주세요.

[JSON 형식]
[
  {
    "name": "참가자 이름",
    "affiliation": "소속 기관",
    "region": "권역"
  }
]
`;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('Gemini 응답 (참가자):', text);

      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```|(\[[\s\S]*\])/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[2];
        const parsedData = JSON.parse(jsonString);
        res.status(200).json({ success: true, data: parsedData });
      } else {
        console.error('AI 응답에서 JSON을 찾을 수 없습니다.');
        res.status(500).json({ success: false, message: 'AI 응답 처리 중 오류가 발생했습니다.' });
      }
    } catch (error) {
      console.error('Gemini API 오류:', error);
      res.status(500).json({ success: false, message: 'Gemini API 호출 중 오류가 발생했습니다.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
