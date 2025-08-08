import { parseHwpPlan } from '../../utils/hwpParser'

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
    
    console.log('HWP 파싱 시작, 파일 크기:', buffer.length, 'bytes')
    
    // HWP 파싱 실행
    const result = await parseHwpPlan(buffer)
    
    if (result.success) {
      console.log('HWP 파싱 성공:', result.schedules.length, '개 일정 추출')
      return res.status(200).json(result)
    } else {
      console.error('HWP 파싱 실패:', result.error)
      return res.status(400).json({
        error: 'HWP 파싱 실패',
        details: result.error
      })
    }
    
  } catch (error) {
    console.error('HWP API 오류:', error)
    return res.status(500).json({
      error: 'HWP API 오류',
      details: error.message
    })
  }
}

export const config = {
  api: {
    bodyParser: false, // raw body를 받기 위해 bodyParser 비활성화
  },
}
