import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType } from 'docx'

/**
 * 연수 보고서를 DOCX 형식으로 생성합니다.
 * (HWP 형식은 기술적 제약으로 DOCX로 대체)
 */
export async function generateReportDocument(reportData) {
  try {
    const {
      title = '연수 보고서',
      period = '2025년도',
      participants = [],
      schedules = [],
      photos = [],
      summary = '',
      achievements = [],
      recommendations = []
    } = reportData

    // 문서 생성
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // 제목
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            alignment: 'center'
          }),
          
          new Paragraph({
            text: `${period} 국외 연수 프로그램 결과 보고서`,
            heading: HeadingLevel.HEADING_1,
            alignment: 'center'
          }),
          
          new Paragraph({ text: '' }), // 빈 줄
          
          // 연수 개요
          new Paragraph({
            text: '1. 연수 개요',
            heading: HeadingLevel.HEADING_2
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: '연수 기간: ', bold: true }),
              new TextRun({ text: period })
            ]
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: '참가자 수: ', bold: true }),
              new TextRun({ text: `${participants.length}명` })
            ]
          }),
          
          new Paragraph({ text: '' }),
          
          // 참가자 명단
          new Paragraph({
            text: '2. 참가자 명단',
            heading: HeadingLevel.HEADING_2
          }),
          
          // 참가자 테이블 생성
          ...createParticipantTable(participants),
          
          new Paragraph({ text: '' }),
          
          // 연수 일정
          new Paragraph({
            text: '3. 연수 일정',
            heading: HeadingLevel.HEADING_2
          }),
          
          // 일정 테이블 생성
          ...createScheduleTable(schedules),
          
          new Paragraph({ text: '' }),
          
          // 연수 성과
          new Paragraph({
            text: '4. 연수 성과',
            heading: HeadingLevel.HEADING_2
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: summary || '이번 연수를 통해 참가자들은 다양한 문화체험과 교육 기관 방문을 통해 글로벌 역량을 강화할 수 있었습니다.' })
            ]
          }),
          
          new Paragraph({ text: '' }),
          
          // 주요 성과
          new Paragraph({
            text: '4.1 주요 성과',
            heading: HeadingLevel.HEADING_3
          }),
          
          ...achievements.map(achievement => 
            new Paragraph({
              children: [
                new TextRun({ text: '• ' }),
                new TextRun({ text: achievement })
              ]
            })
          ),
          
          new Paragraph({ text: '' }),
          
          // 사진 기록
          new Paragraph({
            text: '5. 활동 사진',
            heading: HeadingLevel.HEADING_2
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: `총 ${photos.length}장의 사진이 촬영되었으며, 주요 활동 모습이 기록되었습니다.` })
            ]
          }),
          
          new Paragraph({ text: '' }),
          
          // 개선사항 및 제언
          new Paragraph({
            text: '6. 개선사항 및 제언',
            heading: HeadingLevel.HEADING_2
          }),
          
          ...recommendations.map(recommendation => 
            new Paragraph({
              children: [
                new TextRun({ text: '• ' }),
                new TextRun({ text: recommendation })
              ]
            })
          ),
          
          new Paragraph({ text: '' }),
          
          // 결론
          new Paragraph({
            text: '7. 결론',
            heading: HeadingLevel.HEADING_2
          }),
          
          new Paragraph({
            children: [
              new TextRun({ 
                text: '본 연수 프로그램은 참가자들에게 귀중한 국제적 경험을 제공하였으며, 향후 교육 활동에 긍정적인 영향을 미칠 것으로 기대됩니다. 체계적인 일정 관리와 다양한 문화체험을 통해 연수 목표를 성공적으로 달성하였습니다.'
              })
            ]
          }),
          
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          
          // 서명란
          new Paragraph({
            children: [
              new TextRun({ text: '작성일: ' }),
              new TextRun({ text: new Date().toLocaleDateString('ko-KR') })
            ],
            alignment: 'right'
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: '작성자: 연수 담당자' })
            ],
            alignment: 'right'
          })
        ]
      }]
    })

    // 문서를 바이너리로 변환
    const buffer = await Packer.toBuffer(doc)
    return {
      success: true,
      buffer: buffer,
      filename: `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`
    }

  } catch (error) {
    console.error('보고서 생성 오류:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 참가자 테이블 생성
 */
function createParticipantTable(participants) {
  if (participants.length === 0) {
    return [
      new Paragraph({
        children: [
          new TextRun({ text: '참가자 정보가 없습니다.' })
        ]
      })
    ]
  }

  const table = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    rows: [
      // 헤더
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: '번호', alignment: 'center' })],
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: '이름', alignment: 'center' })],
            width: { size: 20, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: '소속', alignment: 'center' })],
            width: { size: 40, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: '권역', alignment: 'center' })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: '이메일', alignment: 'center' })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      // 데이터 행들
      ...participants.map((participant, index) => 
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: (index + 1).toString(), alignment: 'center' })]
            }),
            new TableCell({
              children: [new Paragraph({ text: participant.name || '-' })]
            }),
            new TableCell({
              children: [new Paragraph({ text: participant.affiliation || participant.school || '-' })]
            }),
            new TableCell({
              children: [new Paragraph({ text: participant.region || participant.team || '-' })]
            }),
            new TableCell({
              children: [new Paragraph({ text: participant.email || '-' })]
            })
          ]
        })
      )
    ]
  })

  return [table, new Paragraph({ text: '' })]
}

/**
 * 일정 테이블 생성
 */
function createScheduleTable(schedules) {
  if (schedules.length === 0) {
    return [
      new Paragraph({
        children: [
          new TextRun({ text: '일정 정보가 없습니다.' })
        ]
      })
    ]
  }

  const table = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    rows: [
      // 헤더
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: '날짜', alignment: 'center' })],
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: '시간', alignment: 'center' })],
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: '활동명', alignment: 'center' })],
            width: { size: 40, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: '장소', alignment: 'center' })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: '비고', alignment: 'center' })],
            width: { size: 10, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      // 데이터 행들
      ...schedules.map(schedule => 
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: formatDate(schedule.date) })]
            }),
            new TableCell({
              children: [new Paragraph({ text: schedule.time || '-' })]
            }),
            new TableCell({
              children: [new Paragraph({ text: schedule.activityName || '-' })]
            }),
            new TableCell({
              children: [new Paragraph({ text: schedule.location || '-' })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                text: schedule.type === 'free' ? '자유일정' : 
                      schedule.type === 'afternoon' ? '오후활동' : '-' 
              })]
            })
          ]
        })
      )
    ]
  })

  return [table, new Paragraph({ text: '' })]
}

/**
 * 날짜 형식 변환
 */
function formatDate(dateString) {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR')
  } catch (error) {
    return dateString || '-'
  }
}
