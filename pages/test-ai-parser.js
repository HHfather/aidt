import { useState } from 'react'
import Head from 'next/head'

export default function TestAIParser() {
  const [text, setText] = useState(`2025년 8월 1일 (목요일) 1일차
09:00 인천공항 제2터미널 3층 출국장 집합
11:00 인천공항 출발 (OZ호항공 OZ123편)
15:30 싱가포르 창이공항 도착
17:00 입국수속 및 가이드 미팅
18:30 호텔 체크인 (마리나 베이 샌즈 호텔)
19:30 환영 만찬 (호텔 레스토랑)

2025년 8월 2일 (금요일) 2일차
08:00 호텔 조식
09:30 시내관광 투어 시작
10:00 머라이언 파크 견학 및 사진촬영
11:30 싱가포르 국립박물관 방문
13:00 현지 레스토랑에서 중식
14:30 차이나타운 문화탐방
16:00 쇼핑몰 자유시간 (오차드 로드)
18:00 호텔 복귀
19:00 석식 (현지 음식 체험)

2025년 8월 3일 (토요일) 3일차  
08:00 호텔 조식
09:00 센토사 아일랜드 투어
10:00 유니버설 스튜디오 싱가포르 입장
12:00 원내 레스토랑에서 중식
13:00~17:00 자유시간 (어트랙션 체험)
17:30 케이블카 탑승
18:30 호텔 복귀
19:30 팀별 자유 저녁식사`)
  
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testAIParsing = async () => {
    if (!text.trim()) {
      setResult('텍스트를 입력해주세요!')
      return
    }
    
    setLoading(true)
    setResult('🔄 AI 파싱 중...')
    
    try {
      const response = await fetch('/api/parse-schedule-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text })
      })
      
      const data = await response.json()
      
      if (data.success) {
        let resultHtml = `✅ AI 파싱 성공!

📊 파싱 결과:
- 사용된 방법: ${data.meta.parseMethod}
- 스케줄 개수: ${data.meta.scheduleCount}

📅 파싱된 스케줄:`

        data.data.schedules.forEach((schedule, index) => {
          resultHtml += `
${index + 1}. ${schedule.date} ${schedule.time} - ${schedule.activity}
   📍 ${schedule.location}
   🏷️ ${schedule.category}`
        })

        resultHtml += `

📋 메타데이터:
- 제목: ${data.data.metadata.title}
- 기간: ${data.data.metadata.duration}
- 목적지: ${data.data.metadata.destination}`

        setResult(resultHtml)
      } else {
        setResult('❌ 파싱 실패: ' + JSON.stringify(data, null, 2))
      }
    } catch (error) {
      setResult('🚨 오류 발생: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const clearResult = () => {
    setResult('')
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: '20px' }}>
      <Head>
        <title>AI 스케줄 파싱 테스트</title>
      </Head>
      
      <h1>🤖 AI 스케줄 파싱 테스트</h1>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: '100%', height: '300px', margin: '10px 0' }}
        placeholder="일정 텍스트를 입력하세요..."
      />
      
      <div>
        <button 
          onClick={testAIParsing}
          disabled={loading}
          style={{ padding: '10px 20px', margin: '5px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '🔄 파싱 중...' : '🤖 AI 파싱 테스트'}
        </button>
        <button 
          onClick={clearResult}
          style={{ padding: '10px 20px', margin: '5px' }}
        >
          🗑️ 결과 지우기
        </button>
      </div>
      
      {result && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          border: '1px solid #ccc',
          backgroundColor: result.includes('✅') ? '#d4edda' : result.includes('❌') ? '#f8d7da' : '#fff',
          borderColor: result.includes('✅') ? '#c3e6cb' : result.includes('❌') ? '#f5c6cb' : '#ccc',
          whiteSpace: 'pre-wrap'
        }}>
          {result}
        </div>
      )}
      
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6' }}>
        <h3>💡 사용 방법</h3>
        <ul>
          <li>위 텍스트 박스에 자유롭게 일정을 입력하세요</li>
          <li>날짜와 시간 형식은 다양하게 지원됩니다 (예: 8월 1일, 09:00)</li>
          <li>AI가 자동으로 구조화된 스케줄표로 변환합니다</li>
          <li>PDF나 HWP에서 복사한 텍스트도 파싱 가능합니다</li>
        </ul>
      </div>
    </div>
  )
}
