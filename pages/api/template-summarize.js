import { db } from '../../firebaseConfig'
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { templateType, activityInfo } = req.body

    // Check if template already exists in DB
    const templateQuery = query(
      collection(db, 'report-templates'), 
      where('templateType', '==', templateType)
    )
    const existingTemplates = await getDocs(templateQuery)

    let summarizedTemplate = ''

    if (!existingTemplates.empty) {
      // Template already exists, return it
      summarizedTemplate = existingTemplates.docs[0].data().content
    } else {
      // Generate new template using AI based on example content
      summarizedTemplate = await generateTemplateWithAI(templateType, activityInfo)
      
      // Save to DB
      await addDoc(collection(db, 'report-templates'), {
        templateType,
        content: summarizedTemplate,
        createdAt: new Date(),
        activityInfo
      })
    }

    res.status(200).json({ 
      success: true, 
      template: summarizedTemplate,
      message: '양식이 AI로 정리되어 적용되었습니다.' 
    })

  } catch (error) {
    console.error('템플릿 생성 오류:', error)
    res.status(500).json({ 
      success: false, 
      error: '템플릿 생성 중 오류가 발생했습니다.', 
      details: error.message 
    })
  }
}

async function generateTemplateWithAI(templateType, activityInfo) {
  // Example content based on user's provided examples
  const freiburgExample = `2. 프라이부르크 도시 도서관 방문을 통한 교육적 시사점

가. 방문 개요
○ 위치: Münsterplatz 17, 79098 Freiburg im Breisgau, 독일
○ 전화: +49-761-2012207
○ 방문 일시: 2025년 2월 4일 16:00~17:30
○ 홈페이지: https://www.stadtbibliothek.freiburg.de/

나. 방문 내용
독일에서 가장 사랑받는 숲인 슈바르츠발트, '흑림'이 위치한 도시로 친 환경적이고, 역사가 살아있는 이 도시에서 문학의 중심 공간인 시립 도서관이 어떻게 시민에게 활용되는지 우리나라 독서 교육과 어떻게 다른지를 찾는 관점에서 탐방하였다. 특히 디지털화가 진행되고 있는 도서관이 어떻게 기술을 접목하고 있고, 사람들을 몰입시키는지와 프라이부르크 도시도서관의 디지털 자료 및 인터랙티브한 자료 제공 방식과 디지털 활용 교육에 활용하는 방법을 중점으로 두고 탐방하였다.

1) 프라이부르크 도시 도서관 현장 탐방
- 도서관 소개: 프라이부르크 25만 시민을 위한 연간 130만 권의 책을 취급하는 이 도서관은 4개의 시립 도서관 중 1개로 운영되고 있으며 음악 도서관, 어린이 도서관, 잡지 도서관, 일반 도서관, 이동식 도서관 등 다양한 섹터로 운영되고 있다.

- 도서관의 역할과 운영 방식: 프라이부르크 도시 도서관은 단순한 책 대여 공간을 넘어 지역 사회의 문화 및 교육 허브 역할을 하고 있다. 첫째, 어린이부터 성인까지 다양한 연령층을 대상으로 도서관이 운영된다. 둘째, 디지털 자료 활용이 강조되며, 전자책 대출 시스템과 온라인 학습 플랫폼을 통해 언제 어디서든 교육할 수 있도록 지원하고 있었다. 셋째, 지역 사회와 연계하여 다문화 배경을 가진 주민을 위한 독일어 학습 지원 및 문화 교류 프로그램이 운영되고 있었다.

2) 디지털 학습 환경 및 스마트 도서관 시스템
- 자율 대출 및 반납 시스템을 구축하여 이용자 편의를 극대화하고 있었다.
- 다양한 디지털 자료가 제공되며, 오디오북, 전자책, 온라인 학습 리소스 등을 활용하여 더욱 접근성이 좋은 학습 환경을 조성하고 있다.
- VR 및 AR 기술을 활용한 역사 및 예술 교육 프로그램이 운영되고 있어, 학생들과 일반 시민들이 더욱 몰입감 있는 학습 경험을 할 수 있도록 지원하고 있다.

다. 교육적 시사점과 활용 방안
독일 교육은 전통적으로 자율성과 실용성을 강조하며, 이러한 특징이 프라이부르크 도시 도서관 운영에도 반영되어 있다. 역사적 공간과 함께 있는 현실의 공간인 도서관이 단순한 책 대여할 수 있는 곳이 아니라 지역 사회의 지식 및 문화의 중심지로 자리 잡고 있고, 과거를 잇고 미래로 나아갈 수 있게 하는 공간이 된다는 것이다. 특히, 디지털 학습 환경을 적극적으로 도입하고, 지역 사회와 협력하여 다양한 교육 및 문화 프로그램을 운영하는 점이 국내 도서관에서도 참고할 가치가 크다고 생각된다.`

  const jungfraujochExample = `5. 융프라우 문화 유산 탐방을 통한 교육적 시사점

가. 방문 개요
○ 위치: Jungfraujoch, 3454 Grindelwald, Switzerland
○ 방문 일시: 2025년 2월 6일 08:30~14:00
○ 홈페이지: www.jungfrau.ch

나. 방문 내용
융프라우 등정을 통해 스위스의 대표적인 자연 문화유산을 탐방하고, 이를 교육적 관점에서 고찰하였다. 특히 관광지이자 교육의 장으로서 융프라우의 활용 방안에 대해 연구하였다.

1) 융프라우 현장 탐방
첫째, 코그휠 기차를 이용한 등정 과정에서 고도에 따른 자연환경의 변화를 관찰할 수 있었다. 해발고도가 높아질수록 변화하는 식생과 기후는 학생들에게 생태계와 기후에 대한 실제적인 학습 기회를 제공할 수 있다. 둘째, 빙하 전시관(Ice Palace)에서는 빙하의 형성 과정과 특성을 직접 체험할 수 있었다. 실제 빙하 내부를 걸으며 관찰할 수 있는 공간은 환경 교육에 매우 효과적으로 활용될 수 있다. 셋째, 전망대(Sphinx Observatory)에서는 알프스의 파노라마 전경과 함께 기상 관측소의 역할도 확인할 수 있었다. 이는 지리 교육과 기상 학습의 좋은 사례가 될 수 있다.

다. 교육적 시사점과 활용 방안
융프라우에서의 경험을 바탕으로, 다음과 같은 교육적 활용 방안을 도출할 수 있었다:
1) 과학 교과 연계: 고도에 따른 기압과 온도 변화 관찰, 빙하 지형의 형성 과정 학습, 기상 관측 및 기후 변화 교육
2) 사회 교과 연계: 스위스의 관광 산업 발전 사례 연구, 환경 보존과 관광 개발의 균형, 산악 지역의 교통 인프라 발전
3) 환경 교육 연계: 기후 변화가 빙하에 미치는 영향 관찰, 자연 보존의 중요성 인식, 지속 가능한 관광 개발의 사례

라. 시사점
융프라우 방문을 통해 자연 문화유산의 교육적 활용 가능성을 확인할 수 있었다. 특히 실제 현장 경험과 디지털 기술을 접목한 교육 기술 인재 양성을 위한 중요한 벤치마킹 요소가 될 수 있다. 국내에서도 연구 중심 교육을 강화하고, 디지털 기술을 적극적으로 활용한 맞춤형 학습 시스템을 도입함으로써 학생들의 창의성과 문제 해결 역량을 높일 수 있는 방향을 모색할 필요가 있다고 생각한다.`

  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Generate template based on type and activity info
  const location = activityInfo?.location || '해당 장소'
  const activityName = activityInfo?.activityName || '연수 활동'
  const date = activityInfo?.date || new Date().toISOString().split('T')[0]
  const time = activityInfo?.time || ''

  switch (templateType) {
    case 'freiburg':
      return `2. ${location} 방문을 통한 교육적 시사점

가. 방문 개요
○ 위치: ${location}
○ 방문 일시: ${date} ${time}
○ 방문 목적: 교육적 시사점 도출 및 현장 학습
○ 활동 내용: ${activityName}

나. 방문 내용
${location} 방문을 통해 현지의 교육 시스템과 문화적 특성을 체험하는 시간을 가졌습니다. 이번 방문은 단순한 관람을 넘어서 교육적 가치를 극대화할 수 있는 방법을 탐구하는 기회였습니다.

1) ${location} 현장 탐방
- 시설 소개: ${location}의 주요 시설과 운영 방식을 관찰하고, 현지의 교육 철학과 접근 방식을 이해할 수 있었습니다.
- 교육 프로그램: 다양한 연령층을 대상으로 한 맞춤형 교육 프로그램과 디지털 기술을 활용한 혁신적인 학습 환경을 확인할 수 있었습니다.
- 지역 연계: 지역 사회와의 협력 관계를 통한 포괄적인 교육 서비스 제공 방식을 학습할 수 있었습니다.

2) 디지털 학습 환경 및 시스템
- 자율 학습 시스템: 이용자 편의를 극대화한 자동화된 서비스 시스템을 관찰할 수 있었습니다.
- 디지털 자료 활용: 다양한 디지털 자료와 온라인 학습 플랫폼을 통한 접근성 높은 교육 환경을 확인할 수 있었습니다.
- 기술 융합: VR, AR 등 최신 기술을 활용한 몰입형 학습 경험 제공 방식을 학습할 수 있었습니다.

다. 교육적 시사점과 활용 방안
${location}에서의 경험을 바탕으로, 다음과 같은 교육적 활용 방안을 도출할 수 있었다:
1) 교과 연계: ${location}의 특성을 활용한 다양한 교과 연계 방안 모색
2) 현장 학습: 실제 경험을 통한 학습 효과 극대화 방안
3) 교육 프로그램: ${location}을 활용한 교육 프로그램 개발 방안

라. 시사점
이번 ${location} 방문을 통해 해당 장소의 교육적 활용 가능성을 확인할 수 있었다. 특히 실제 현장 경험과 교육적 목적을 접목한 학습 시스템의 중요성을 재확인하였다. 향후 교육 활동에서 이러한 현장 학습의 효과를 극대화할 수 있는 방안을 지속적으로 모색할 필요가 있다.`

    case 'jungfraujoch':
      return `5. ${location} 문화 유산 탐방을 통한 교육적 시사점

가. 방문 개요
○ 위치: ${location}
○ 방문 일시: ${date} ${time}
○ 방문 목적: 문화 유산의 교육적 활용 방안 탐구
○ 활동 내용: ${activityName}

나. 방문 내용
${location} 탐방을 통해 자연 및 문화 유산의 교육적 가치를 체험하고, 이를 교육적 관점에서 고찰하였다. 특히 관광지이자 교육의 장으로서 ${location}의 활용 방안에 대해 연구하였다.

1) ${location} 현장 탐방
- 자연 환경 관찰: ${location}의 자연적 특성과 환경 변화를 관찰하며 생태계와 기후에 대한 실제적인 학습 기회를 제공받을 수 있었다.
- 문화 유산 체험: ${location}의 역사적, 문화적 가치를 직접 체험하며 문화 유산의 보존과 활용의 중요성을 이해할 수 있었다.
- 교육 시설 활용: ${location}의 교육 시설과 프로그램을 통해 현장 학습의 효과를 확인할 수 있었다.

2) 교육적 활용 방안
- 과학적 접근: 자연 현상과 환경 변화에 대한 과학적 관찰과 분석 방법을 학습할 수 있었다.
- 문화적 이해: 지역의 문화적 특성과 역사적 배경을 통한 문화 이해 교육의 중요성을 확인할 수 있었다.
- 환경 교육: 자연 보존과 지속 가능한 개발의 균형에 대한 인식을 높일 수 있었다.

다. 교육적 시사점과 활용 방안
${location}에서의 경험을 바탕으로, 다음과 같은 교육적 활용 방안을 도출할 수 있었다:
1) 과학 교과 연계: 자연 현상 관찰, 환경 변화 학습, 생태계 이해 교육
2) 사회 교과 연계: 지역 문화 이해, 관광 산업 연구, 환경 보존과 개발의 균형
3) 환경 교육 연계: 자연 보존의 중요성, 지속 가능한 개발, 기후 변화 영향 관찰

라. 시사점
${location} 방문을 통해 자연 및 문화 유산의 교육적 활용 가능성을 확인할 수 있었다. 특히 실제 현장 경험과 디지털 기술을 접목한 교육 기술 인재 양성을 위한 중요한 벤치마킹 요소가 될 수 있다. 국내에서도 연구 중심 교육을 강화하고, 디지털 기술을 적극적으로 활용한 맞춤형 학습 시스템을 도입함으로써 학생들의 창의성과 문제 해결 역량을 높일 수 있는 방향을 모색할 필요가 있다고 생각한다.`

    default:
      return `🗓️ 일시: ${date} ${time}
📍 장소: ${location}

📋 활동 개요
${activityName}에 참여하여 다음과 같은 활동을 수행하였습니다.

💡 주요 학습 내용
• 

🎯 성과 및 소감
• 

�� 향후 적용 방안
• `
  }
} 