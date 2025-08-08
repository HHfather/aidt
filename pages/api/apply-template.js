import { db } from '../../firebaseConfig'
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { content, activityId } = req.body

      if (!content || !activityId) {
        return res.status(400).json({ error: 'Content and activityId are required' })
      }

      // 현재 활동의 위치 정보 가져오기
      let locationInfo = null
      try {
        const locationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/location-info?id=${activityId}`)
        if (locationResponse.ok) {
          const locationData = await locationResponse.json()
          if (locationData.success) {
            locationInfo = locationData.locationInfo
          }
        }
      } catch (error) {
        console.log('위치 정보 로드 실패:', error)
      }

      // AI로 양식 분석
      const analyzedTemplate = analyzeContentStructure(content, locationInfo)

      // 분석된 양식을 Firestore에 저장
      const templateRef = doc(db, 'activityTemplates', activityId)
      await setDoc(templateRef, {
        originalContent: content,
        analyzedTemplate: analyzedTemplate,
        locationInfo: locationInfo,
        createdAt: new Date(),
        activityId: activityId
      })

      res.status(200).json({ 
        success: true, 
        template: analyzedTemplate,
        message: '양식이 성공적으로 분석되었습니다.'
      })

    } catch (error) {
      console.error('Template analysis error:', error)
      res.status(500).json({ error: '양식 분석 중 오류가 발생했습니다.' })
    }
  } else if (req.method === 'GET') {
    try {
      const { activityId } = req.query

      if (!activityId) {
        return res.status(400).json({ error: 'ActivityId is required' })
      }

      // 저장된 양식 불러오기
      const templateRef = doc(db, 'activityTemplates', activityId)
      const templateDoc = await getDoc(templateRef)

      if (templateDoc.exists()) {
        res.status(200).json({ 
          success: true, 
          template: templateDoc.data()
        })
      } else {
        res.status(404).json({ error: '저장된 양식을 찾을 수 없습니다.' })
      }

    } catch (error) {
      console.error('Get template error:', error)
      res.status(500).json({ error: '양식 불러오기 중 오류가 발생했습니다.' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

function analyzeContentStructure(content, locationInfo) {
  // 내용을 분석하여 구조화된 양식 추출
  const lines = content.split('\n')
  const template = {
    title: '',
    sections: [],
    format: ''
  }

  let currentSection = null
  let sectionContent = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 제목 추출 (숫자로 시작하는 줄)
    if (line.match(/^\d+\.\s*[가-힣]/) && !template.title) {
      template.title = line
      continue
    }

    // 섹션 추출 (가, 나, 다, 라 등으로 시작하는 줄)
    if (line.match(/^[가-힣]\.\s/)) {
      if (currentSection) {
        currentSection.content = sectionContent.join('\n')
        template.sections.push(currentSection)
      }
      
      currentSection = {
        title: line,
        subsections: [],
        content: ''
      }
      sectionContent = []
      continue
    }

    // 하위 섹션 추출 (숫자로 시작하는 줄)
    if (line.match(/^\d+\)\s/) && currentSection) {
      currentSection.subsections.push(line)
      continue
    }

    // 내용 수집
    if (currentSection && line) {
      sectionContent.push(line)
    }
  }

  // 마지막 섹션 처리
  if (currentSection) {
    currentSection.content = sectionContent.join('\n')
    template.sections.push(currentSection)
  }

  // 양식 구조 생성 (위치 정보 포함)
  template.format = generateTemplateFormat(template, locationInfo)

  return template
}

function generateTemplateFormat(template, locationInfo) {
  let format = ''
  
  if (template.title) {
    format += `${template.title}\n\n`
  }

  // 방문 개요 섹션에 위치 정보 포함
  const overviewSection = template.sections.find(section => 
    section.title.includes('방문 개요') || section.title.includes('가.')
  )

  if (overviewSection && locationInfo) {
    format += `가. 방문 개요\n`
    if (locationInfo.name) {
      format += `  ○ 장소: ${locationInfo.name}\n`
    }
    if (locationInfo.address) {
      format += `  ○ 주소: ${locationInfo.address}\n`
    }
    if (locationInfo.visitDate) {
      format += `  ○ 방문 일시: ${locationInfo.visitDate}\n`
    }
    if (locationInfo.website) {
      format += `  ○ 홈페이지: ${locationInfo.website}\n`
    }
    format += '\n'
  }

  // 나머지 섹션들 처리
  template.sections.forEach((section, index) => {
    // 방문 개요는 이미 처리했으므로 건너뛰기
    if (section.title.includes('방문 개요') || section.title.includes('가.')) {
      return
    }

    // 섹션 제목 변환 (나, 다, 라 순서로)
    const sectionLetters = ['나', '다', '라', '마', '바', '사']
    const sectionLetter = sectionLetters[index] || String.fromCharCode(44032 + index)
    
    format += `${sectionLetter}. ${section.title.replace(/^[가-힣]\.\s*/, '')}\n`
    
    if (section.subsections.length > 0) {
      section.subsections.forEach((subsection, subIndex) => {
        format += `  ${subIndex + 1}) ${subsection.replace(/^\d+\)\s*/, '')}\n`
      })
    }
    
    format += '\n'
  })

  // 연수 사진 섹션 추가
  format += `라. 연수 사진\n`
  format += `(업로드된 사진들이 여기에 표시됩니다)\n`

  return format
}
