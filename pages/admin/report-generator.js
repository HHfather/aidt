import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

export default function ReportGenerator() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [reportData, setReportData] = useState({
    totalParticipants: 25,
    totalActivities: 12,
    totalPhotos: 156,
    totalComments: 89,
    averageRating: 4.7
  })
  const [generating, setGenerating] = useState(false)
  const [reportTemplate, setReportTemplate] = useState('standard')

  useEffect(() => {
    // 관리자 세션 확인
    const adminSession = localStorage.getItem('adminSession')
    if (!adminSession) {
      router.push('/admin/login')
      return
    }

    try {
      const adminData = JSON.parse(adminSession)
      setAdmin(adminData)
    } catch (error) {
      console.error('관리자 세션 로드 오류:', error)
      router.push('/admin/login')
    }
  }, [router])

  const generateReport = async () => {
    setGenerating(true)
    
    try {
      const customData = {
        title: '2025년도 국외 연수 프로그램 결과 보고서',
        period: '2025년 7월 30일 ~ 8월 10일',
        summary: '본 연수 프로그램을 통해 교육 관계자들이 해외 교육 시스템을 직접 체험하고 글로벌 교육 역량을 강화할 수 있었습니다.',
        achievements: [
          '참가자 전원의 적극적인 프로그램 참여',
          '현지 교육기관과의 성공적인 교류',
          `총 ${reportData.totalPhotos}장의 활동 사진 기록`,
          `${reportData.totalComments}건의 소중한 경험 공유`,
          `평균 만족도 ${reportData.averageRating}/5.0 달성`
        ],
        recommendations: [
          '연수 기간을 10일에서 14일로 확대 검토',
          '사전 언어 교육 프로그램 강화',
          '현지 교육기관과의 장기적 협력 방안 모색',
          '연수 후 follow-up 프로그램 개발'
        ]
      }

      // API 호출로 보고서 생성
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reportType: reportTemplate,
          projectId: 'current',
          customData: customData
        })
      })

      if (!response.ok) {
        throw new Error('보고서 생성 API 호출 실패')
      }

      const result = await response.json()

      if (result.success) {
        // Base64 데이터를 Blob으로 변환하여 다운로드
        const binaryString = atob(result.data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        const blob = new Blob([bytes], { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        })
        
        // 파일 다운로드
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = result.filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast.success('📄 DOCX 보고서가 성공적으로 다운로드되었습니다!')
      } else {
        throw new Error(result.error || '보고서 생성 실패')
      }
      
    } catch (error) {
      console.error('보고서 생성 오류:', error)
      toast.error('보고서 생성 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const generateReportContent = () => {
    const currentDate = new Date().toLocaleDateString('ko-KR')
    
    return `
# 2025 프라하 해외연수 최종 보고서

## 📋 연수 개요
- **연수 기간**: 2025년 8월 5일 ~ 8월 12일 (8일간)
- **연수 장소**: 체코 프라하
- **참가 인원**: ${reportData.totalParticipants}명
- **보고서 작성일**: ${currentDate}

## 📊 연수 통계
- **총 활동 수**: ${reportData.totalActivities}개
- **업로드된 사진**: ${reportData.totalPhotos}장
- **참가자 댓글**: ${reportData.totalComments}개
- **평균 만족도**: ${reportData.averageRating}/5.0

## 🎯 주요 활동 성과

### 1. 교육 프로그램 참여
- 프라하 성 문화유산 탐방
- 카를교 역사 문화 체험
- 체코 전통 음식 체험
- 현지 학교 교육과정 견학

### 2. 자유 탐방 활동
- 참가자 주도적 일정 계획 및 실행
- 소그룹별 문화 체험 활동
- 현지인과의 문화 교류

### 3. 디지털 플랫폼 활용
- 실시간 소통 및 정보 공유
- 사진 및 후기 공유를 통한 경험 확산
- 온라인 커뮤니티 형성

## 💡 개선사항 및 제언

### 1. 긍정적 측면
- 참가자 간 활발한 소통 및 협력
- 디지털 플랫폼을 통한 효율적 정보 관리
- 자유일정의 높은 참여도와 만족도

### 2. 개선 필요 사항
- 사전 오리엔테이션 강화 필요
- 응급상황 대응 매뉴얼 보완
- 언어 소통 지원 확대

## 🔗 첨부 자료
- 참가자 명단
- 일정표
- 활동 사진 모음
- 참가자 피드백 종합

---

**작성자**: ${admin?.name || '관리자'}
**작성일**: ${currentDate}
    `
  }

  const downloadReport = (content) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `프라하연수_최종보고서_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/admin')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← 관리자 대시보드
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                📄 최종 보고서 생성
              </h1>
            </div>
            <div className="text-sm text-gray-600">
              {admin.name} 관리자
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* 보고서 데이터 요약 */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                📊 연수 데이터 요약
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{reportData.totalParticipants}</div>
                  <div className="text-sm text-blue-800">총 참가자</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{reportData.totalActivities}</div>
                  <div className="text-sm text-green-800">총 활동 수</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{reportData.totalPhotos}</div>
                  <div className="text-sm text-purple-800">업로드 사진</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{reportData.totalComments}</div>
                  <div className="text-sm text-yellow-800">참가자 댓글</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{reportData.averageRating}</div>
                  <div className="text-sm text-red-800">평균 만족도</div>
                </div>
              </div>
            </div>
          </div>

          {/* 보고서 템플릿 선택 */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                📝 보고서 템플릿 선택
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  onClick={() => setReportTemplate('standard')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    reportTemplate === 'standard' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 mb-2">📋 표준 보고서</h3>
                  <p className="text-sm text-gray-600">
                    기본적인 연수 개요와 통계가 포함된 표준 형식의 보고서
                  </p>
                </div>

                <div 
                  onClick={() => setReportTemplate('detailed')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    reportTemplate === 'detailed' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 mb-2">📊 상세 보고서</h3>
                  <p className="text-sm text-gray-600">
                    참가자 피드백, 사진, 활동별 상세 분석이 포함된 종합 보고서
                  </p>
                </div>

                <div 
                  onClick={() => setReportTemplate('summary')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    reportTemplate === 'summary' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 mb-2">⚡ 요약 보고서</h3>
                  <p className="text-sm text-gray-600">
                    핵심 성과와 통계만 간략하게 정리한 요약형 보고서
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 참고 파일 안내 */}
          <div className="mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                💡 참고 파일 업로드 안내
              </h3>
              <p className="text-blue-700 text-sm mb-3">
                보고서 생성 시 다음 파일들을 참고할 수 있습니다:
              </p>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• <strong>연수 계획서</strong>: 파일 관리에서 업로드한 계획서 파일</li>
                <li>• <strong>참가자 명단</strong>: 참가자 정보 및 권역별 분류</li>
                <li>• <strong>활동 사진</strong>: 각 활동별 업로드된 사진들</li>
                <li>• <strong>참가자 피드백</strong>: 댓글 및 반응 데이터</li>
              </ul>
              <div className="mt-3">
                <button 
                  onClick={() => router.push('/admin/file-manager')}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  📁 파일 관리로 이동
                </button>
              </div>
            </div>
          </div>

          {/* 보고서 생성 버튼 */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                🚀 보고서 생성하기
              </h2>
              
              {generating ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">보고서를 생성하고 있습니다...</p>
                  <p className="text-sm text-gray-500 mt-1">잠시만 기다려주세요.</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">
                    선택한 템플릿: <strong>{
                      reportTemplate === 'standard' ? '표준 보고서' :
                      reportTemplate === 'detailed' ? '상세 보고서' : '요약 보고서'
                    }</strong>
                  </p>
                  <p className="text-sm text-blue-600 mb-4">
                    📁 생성 형식: DOCX (Microsoft Word 문서) - HWP 호환 가능
                  </p>
                  <button
                    onClick={generateReport}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-all hover:scale-105"
                  >
                    📄 DOCX 보고서 다운로드
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
