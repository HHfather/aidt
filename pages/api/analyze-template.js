import { db } from '../../firebaseConfig'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { content, activityId } = req.body

    if (!content || !activityId) {
      return res.status(400).json({ error: 'Content and activityId are required' })
    }

    // AI 분석 시뮬레이션 - 실제로는 OpenAI API 등을 사용
    const analyzedTemplate = analyzeContentStructure(content)

    // 분석 결과를 Firestore에 저장
    const templateRef = doc(db, 'activityTemplates', activityId)
    await setDoc(templateRef, {
      originalContent: content,
      analyzedTemplate: analyzedTemplate,
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
}

function analyzeContentStructure(content) {
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

  // 양식 구조 생성
  template.format = generateTemplateFormat(template)

  return template
}

function generateTemplateFormat(template) {
  let format = ''
  
  if (template.title) {
    format += `${template.title}\n\n`
  }

  template.sections.forEach((section, index) => {
    format += `${String.fromCharCode(44032 + index)}. ${section.title.replace(/^[가-힣]\.\s*/, '')}\n`
    
    if (section.subsections.length > 0) {
      section.subsections.forEach((subsection, subIndex) => {
        format += `  ${subIndex + 1}) ${subsection.replace(/^\d+\)\s*/, '')}\n`
      })
    }
    
    format += '\n'
  })

  return format
}






