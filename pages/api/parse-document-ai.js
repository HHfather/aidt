import { parseDocumentWithAI } from '../../utils/aiDocumentParser'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 요청 본문을 Buffer로 변환
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    
    // 파일명 추출
    const fileName = req.headers['x-file-name'] || 'document'
    
    console.log('AI 문서 파싱 시작:', fileName, 'size:', buffer.length, 'bytes')
    
    // AI 기반 문서 파싱 실행
    const result = await parseDocumentWithAI(buffer, fileName)
    
    if (result.success) {
      console.log('AI 문서 파싱 성공:', result.schedules.length, '개 일정 추출')
      return res.status(200).json(result)
    } else {
      console.error('AI 문서 파싱 실패:', result.error)
      return res.status(400).json({
        error: 'AI 문서 파싱 실패',
        details: result.error
      })
    }
    
  } catch (error) {
    console.error('AI 문서 파싱 API 오류:', error)
    return res.status(500).json({
      error: 'AI 문서 파싱 API 오류',
      details: error.message
    })
  }
}

export const config = {
  api: {
    bodyParser: false, // raw body를 받기 위해 bodyParser 비활성화
    responseLimit: '50mb', // 큰 파일 처리를 위한 제한 증가
  },
}
