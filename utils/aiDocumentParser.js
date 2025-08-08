import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini API 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/**
 * Gemini AI를 사용한 HWP/PDF 파일 텍스트 분석 및 일정 추출
 */
export async function parseDocumentWithAI(buffer, fileName) {
  try {
    console.log('AI 기반 문서 파싱 시작:', fileName)
    
    // 1. 텍스트 추출
    let extractedText = ''
    
    if (fileName.toLowerCase().endsWith('.pdf')) {
      // PDF 파싱
      const pdf = require('pdf-parse')
      const pdfData = await pdf(buffer)
      extractedText = pdfData.text
    } else if (fileName.toLowerCase().endsWith('.hwp') || fileName.toLowerCase().endsWith('.hwpx')) {
      // HWP 파싱 시도
      try {
        const HWP = require('hwp.js')
        const hwpDoc = new HWP(buffer)
        extractedText = hwpDoc.getText()
      } catch (hwpError) {
        console.log('HWP 라이브러리 파싱 실패, 텍스트 기반 추출 시도')
        // Fallback: 텍스트 기반 추출
        extractedText = buffer.toString('utf-8', 0, Math.min(buffer.length, 50000))
      }
    } else {
      throw new Error('지원하지 않는 파일 형식입니다.')
    }

    if (!extractedText || extractedText.length < 10) {
      throw new Error('문서에서 텍스트를 추출할 수 없습니다.')
    }

    console.log('텍스트 추출 완료, 길이:', extractedText.length)

    // 2. Gemini AI로 일정 정보 분석
    const schedules = await analyzeScheduleWithGemini(extractedText)
    
    // 3. 결과 검증 및 정리
    const cleanedSchedules = validateAndEnhanceSchedules(schedules)
    
    return {
      success: true,
      rawText: extractedText.substring(0, 2000), // 처음 2000자만 저장
      schedules: cleanedSchedules,
      extractedInfo: {
        totalDays: cleanedSchedules.length,
        locations: [...new Set(cleanedSchedules.map(s => s.location).filter(Boolean))],
        activities: [...new Set(cleanedSchedules.map(s => s.activityName).filter(Boolean))],
        aiProcessed: true
      }
    }

  } catch (error) {
    console.error('AI 문서 파싱 오류:', error)
    return {
      success: false,
      error: error.message,
      schedules: []
    }
  }
}

/**
 * Gemini AI로 일정 정보 분석
 */
async function analyzeScheduleWithGemini(text) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
다음 연수 계획서 텍스트를 분석하여 일정 정보를 JSON 형식으로 추출해주세요.

텍스트:
"""
${text.substring(0, 8000)} // 토큰 제한을 위해 8000자로 제한
"""

추출해야 할 정보:
1. 날짜 (YYYY-MM-DD 형식)
2. 시간 (HH:MM 형식)
3. 활동명
4. 장소/위치
5. 활동 유형 (activity, free, afternoon 중 하나)

다음 JSON 배열 형식으로 응답해주세요:
[
  {
    "date": "2025-07-30",
    "time": "09:00",
    "activityName": "문화유산 탐방",
    "location": "경복궁",
    "type": "activity",
    "notes": "추출된 원문"
  }
]

주의사항:
- 날짜가 명시되지 않은 경우 2025-07-30부터 순차적으로 배정
- 시간이 명시되지 않은 경우 오전 9시부터 2시간 간격으로 배정
- 자유시간/개인시간은 type을 "free"로 설정
- 저녁/야간 활동은 type을 "afternoon"으로 설정
- 장소가 불분명한 경우 문맥상 추측되는 장소나 "미정"으로 설정
- 응답은 반드시 JSON 배열만 출력하고 다른 텍스트는 포함하지 마세요
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const responseText = response.text()

    console.log('Gemini AI 응답:', responseText)

    // JSON 파싱
    let schedules = []
    try {
      // JSON 블록 추출 (```json으로 감싸진 경우 처리)
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       responseText.match(/\[([\s\S]*)\]/)
      
      const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText
      schedules = JSON.parse(jsonText.startsWith('[') ? jsonText : `[${jsonText}]`)
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError)
      console.log('원본 응답:', responseText)
      
      // Fallback: 텍스트에서 수동 추출
      schedules = extractScheduleFromText(text)
    }

    return schedules

  } catch (error) {
    console.error('Gemini AI 호출 오류:', error)
    // Fallback: 기본 추출 방식
    return extractScheduleFromText(text)
  }
}

/**
 * Fallback: 텍스트에서 패턴 기반 일정 추출
 */
function extractScheduleFromText(text) {
  const lines = text.split('\n').filter(line => line.trim().length > 5)
  const schedules = []
  
  let currentDate = null
  const today = new Date()
  
  for (let i = 0; i < Math.min(lines.length, 20); i++) { // 최대 20개 라인만 처리
    const line = lines[i].trim()
    
    // 날짜 패턴 찾기
    const dateMatch = line.match(/(\d{4}[\.\-\/]\d{1,2}[\.\-\/]\d{1,2}|\d{1,2}월\s*\d{1,2}일)/)
    if (dateMatch) {
      currentDate = parseDateString(dateMatch[0])
      continue
    }
    
    // 시간 패턴과 활동이 있는 라인
    const timeMatch = line.match(/(\d{1,2}:\d{2}|오전\s*\d{1,2}시|오후\s*\d{1,2}시)/)
    
    if (timeMatch || line.length > 10) {
      const schedule = {
        date: currentDate || getDateString(schedules.length),
        time: timeMatch ? normalizeTime(timeMatch[0]) : getTimeString(schedules.length),
        activityName: extractActivityName(line),
        location: extractLocationFromText(line) || '미정',
        type: determineActivityType(line),
        notes: line.substring(0, 100)
      }
      
      schedules.push(schedule)
    }
  }
  
  return schedules.length > 0 ? schedules : getDefaultSchedules()
}

/**
 * 일정 데이터 검증 및 보강
 */
function validateAndEnhanceSchedules(schedules) {
  return schedules.map((schedule, index) => ({
    id: `ai_schedule_${index + 1}`,
    date: schedule.date || getDateString(index),
    time: schedule.time || getTimeString(index),
    activityName: schedule.activityName || '연수 활동',
    location: schedule.location || '미정',
    type: schedule.type || 'activity',
    autoGenerated: true,
    adminNotes: schedule.notes || 'AI가 자동 추출한 일정입니다.'
  }))
}

/**
 * 유틸리티 함수들
 */
function parseDateString(dateStr) {
  try {
    if (dateStr.includes('월') && dateStr.includes('일')) {
      const match = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/)
      if (match) {
        const month = match[1].padStart(2, '0')
        const day = match[2].padStart(2, '0')
        return `2025-${month}-${day}`
      }
    } else if (dateStr.includes('.')) {
      const parts = dateStr.split('.')
      if (parts.length === 3) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
      }
    }
    return dateStr
  } catch (error) {
    return getDateString(0)
  }
}

function normalizeTime(timeStr) {
  try {
    if (timeStr.includes('오전')) {
      const hour = timeStr.match(/\d{1,2}/)[0]
      return `${hour.padStart(2, '0')}:00`
    } else if (timeStr.includes('오후')) {
      const hour = parseInt(timeStr.match(/\d{1,2}/)[0])
      const normalizedHour = hour === 12 ? 12 : hour + 12
      return `${normalizedHour.toString().padStart(2, '0')}:00`
    } else if (timeStr.includes(':')) {
      return timeStr
    }
    return timeStr
  } catch (error) {
    return '09:00'
  }
}

function extractActivityName(line) {
  let activityName = line.replace(/\d{1,2}:\d{2}|오전\s*\d{1,2}시|오후\s*\d{1,2}시/g, '').trim()
  activityName = activityName.replace(/[-–—•]/g, '').trim()
  
  if (activityName.length < 3) {
    activityName = '연수 활동'
  }
  
  return activityName.substring(0, 50) // 길이 제한
}

function extractLocationFromText(line) {
  const locationKeywords = ['박물관', '궁', '성', '공원', '호텔', '공항', '역', '대학교', '교육청', '센터']
  
  for (const keyword of locationKeywords) {
    if (line.includes(keyword)) {
      const words = line.split(/\s+/)
      const keywordIndex = words.findIndex(word => word.includes(keyword))
      if (keywordIndex >= 0) {
        return words.slice(Math.max(0, keywordIndex - 1), keywordIndex + 1).join(' ')
      }
    }
  }
  
  return null
}

function determineActivityType(line) {
  if (line.includes('자유') || line.includes('개인')) {
    return 'free'
  } else if (line.includes('오후') || line.includes('저녁') || line.includes('숙소')) {
    return 'afternoon'
  }
  return 'activity'
}

function getDateString(index) {
  const today = new Date()
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + index)
  return targetDate.toISOString().split('T')[0]
}

function getTimeString(index) {
  const baseHour = 9 + (index * 2) % 12
  return `${baseHour.toString().padStart(2, '0')}:00`
}

function getDefaultSchedules() {
  return [
    {
      date: getDateString(0),
      time: '09:00',
      activityName: '연수 프로그램 시작',
      location: '집합 장소',
      type: 'activity',
      notes: 'AI 파싱 실패로 기본 일정 생성'
    }
  ]
}
