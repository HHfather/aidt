import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Loader } from '@googlemaps/js-api-loader'
import { 
  collection, 
  doc,
  getDoc,
  query, 
  where, 
  getDocs, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../firebaseConfig'
import toast from 'react-hot-toast'

export default function ActivityPage() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [activity, setActivity] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [selectedPhotoComments, setSelectedPhotoComments] = useState({})
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [reactionSubmitting, setReactionSubmitting] = useState(false)
  const [userReactions, setUserReactions] = useState({})
  
  // 🗺️ 지도 관련 상태
  const mapRef = useRef(null)
  const [mapLoading, setMapLoading] = useState(true)
  const [recommendedPlaces, setRecommendedPlaces] = useState([])
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [exploreTheme, setExploreTheme] = useState('restaurant')
  const [isExploring, setIsExploring] = useState(false)

  // 📝 연수과제/보고서 작성 관련 상태
  const [report, setReport] = useState({
    title: '',
    content: '',
    author: '',
    activityId: '',
    createdAt: null,
    updatedAt: null
  })

  const [isSaving, setIsSaving] = useState(false)
  const [reportSaved, setReportSaved] = useState(false)

  useEffect(() => {
    // 사용자 세션 확인
    const userSession = localStorage.getItem('userSession')
    if (!userSession) {
      router.push('/')
      return
    }

    try {
      const sessionData = JSON.parse(userSession)
      const userData = sessionData.user || sessionData
      setUser(userData)
      
      if (id) {
        loadActivityData(id)
        loadRecommendedPlaces()
        initializeMap()
      }
    } catch (error) {
      console.error('세션 로드 오류:', error)
      router.push('/')
    }
  }, [router, id])

  const loadActivityData = async (activityId) => {
    try {
      // 활동 정보 로드 (임시 데이터 사용)
      const tempActivities = {
        'temp1': {
          id: 'temp1',
          activityName: '프라하 성 방문',
          date: '2025-08-06',
          time: '09:00',
          location: '프라하, 체코',
          description: '중세 시대부터 이어져온 프라하 성의 역사와 체코의 문화를 체험하는 시간입니다.',
          projectId: 'test-project'
        },
        'temp2': {
          id: 'temp2', 
          activityName: '카를교 도보 투어',
          date: '2025-08-06',
          time: '14:00',
          location: '프라하, 체코',
          description: '프라하의 상징적인 카를교를 거닐며 현지 문화와 역사를 체험합니다.',
          projectId: 'test-project'
        },
        'temp3': {
          id: 'temp3',
          activityName: '프라하 교육청 방문',
          date: '2025-08-07',
          time: '10:00',
          location: '프라하, 체코',
          description: '체코의 교육 시스템과 정책에 대해 알아보는 공식 방문 일정입니다.',
          projectId: 'test-project'
        }
      }

      let activity = tempActivities[activityId]
      
      if (!activity && activityId.startsWith('auto_free_')) {
        const date = activityId.replace('auto_free_', '')
        activity = {
          id: activityId,
          activityName: '🗓️ 자유일정',
          date: date,
          time: '자유시간',
          location: '자유 선택',
          description: '개인 또는 팀별로 자유롭게 계획할 수 있는 시간입니다.',
          type: 'free',
          projectId: 'test-project'
        }
      }
      
      if (activity) {
        setActivity(activity)
      } else {
        setActivity({
          id: activityId,
          activityName: '활동 정보',
          date: new Date().toISOString().split('T')[0],
          time: '미정',
          location: '위치 미정',
          description: '활동 정보를 불러오는 중입니다.',
          projectId: 'default'
        })
      }

      // 빈 사진 배열로 초기화
      setPhotos([])

      setLoading(false)
    } catch (error) {
      console.error('활동 데이터 로드 오류:', error)
      setLoading(false)
    }
  }

  // 📝 보고서 관련 함수들
  const loadReport = async () => {
    try {
      if (!activity?.id) return

      // 기본 보고서 템플릿 설정
      setReport({
        title: `${activity.activityName} - 연수 보고서`,
        content: `🗓️ 일시: ${activity.date} ${activity.time}\n📍 장소: ${activity.location}\n\n📋 활동 내용:\n- \n\n💡 소감 및 학습 내용:\n- \n\n📝 개선사항 및 제안:\n- `,
        author: user?.name || '작성자',
        activityId: activity.id,
        createdAt: null,
        updatedAt: null
      })
    } catch (error) {
      console.log('보고서 로드 실패:', error)
    }
  }

  const handleAiRefine = async () => {
    if (!report.content.trim()) {
      alert('내용을 입력해주세요.')
      return
    }

    // 기존 내용을 클립보드에 복사
    try {
      await navigator.clipboard.writeText(report.content)
      alert('기존 내용이 클립보드에 복사되었습니다.')
    } catch (error) {
      console.log('클립보드 복사 실패:', error)
      alert('클립보드 복사에 실패했습니다.')
      return
    }

    // 기존 내용 삭제
    setReport(prev => ({
      ...prev,
      content: ''
    }))
    
    alert('기존 내용이 삭제되었습니다. 클립보드에서 복사하여 사용하세요.')
  }

  const handleSaveReport = async () => {
    if (!report.title.trim() || !report.content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }

    setIsSaving(true)
    
    try {
      const reportData = {
        ...report,
        authorId: user?.id || 'current-user',
        activityDate: activity?.date || '',
        activityLocation: activity?.location || '',
        updatedAt: serverTimestamp()
      }

      // 로컬 스토리지에 저장 (임시)
      const existingReports = JSON.parse(localStorage.getItem('reports') || '[]')
      const newReports = [...existingReports, { ...reportData, id: Date.now().toString() }]
      localStorage.setItem('reports', JSON.stringify(newReports))
      
      setReportSaved(true)
      alert('보고서가 저장되었습니다!')
    } catch (error) {
      alert('보고서 저장에 실패했습니다.')
      console.error('보고서 저장 오류:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // 간단한 지도 초기화
  const initializeMap = () => {
    // 지도 로딩 상태만 관리
    setTimeout(() => {
      setMapLoading(false)
    }, 1000)
  }

  const loadRecommendedPlaces = () => {
    // 추천장소 기본 데이터
    setRecommendedPlaces([
      {
        id: 'place1',
        name: 'U Fleků 맥주집',
        type: 'restaurant',
        rating: 4.5,
        description: '1499년부터 운영된 체코 전통 맥주집',
        distance: '0.3km'
      }
    ])
  }

  // 활동 로드시 보고서도 함께 로드
  useEffect(() => {
    if (activity && user) {
      loadReport()
    }
  }, [activity, user])

  if (loading || !activity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">활동 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <span className="text-2xl cursor-pointer hover:scale-110 transition-transform">🏠</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{activity.activityName}</h1>
                <p className="text-sm text-gray-600">
                  📅 {activity.date} {activity.time} | 📍 {activity.location}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">👤 {user?.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* 1. 방문 장소 설명 + 지도 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📍 방문 장소 정보</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{activity.location}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {activity.description || '이곳에서 특별한 연수 활동이 진행됩니다.'}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>🗓️ <strong>일정:</strong> {activity.date}</div>
                  <div>⏰ <strong>시간:</strong> {activity.time}</div>
                </div>
              </div>
              <div>
                {mapLoading ? (
                  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                      <p>지도 로딩 중...</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🗺️</div>
                      <p className="text-gray-600">지도 (구현 예정)</p>
                      <p className="text-sm text-gray-500 mt-1">{activity.location}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. 갤러리 섹션 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📸 활동 갤러리</h2>
            
            {/* 사진 업로드 버튼 */}
            <div className="mb-6">
              <label className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-400 transition-colors">
                <span className="text-blue-600 font-medium">📷 사진 업로드하기</span>
                <input type="file" multiple accept="image/*" className="hidden" />
                <p className="text-sm text-gray-500 mt-1">PC/모바일에서 다중 선택 가능 (20MB 이하)</p>
              </label>
            </div>

            {/* 사진 그리드 */}
            {photos.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📷</div>
                <p className="text-xl text-gray-600">아직 업로드된 사진이 없습니다</p>
                <p className="text-sm text-gray-500 mt-2">첫 번째 사진을 업로드해보세요!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.map((photo) => (
                  <div key={photo.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <img
                      src={photo.imageUrl}
                      alt="연수 사진"
                      className="w-full h-64 object-cover"
                    />
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-600">
                          {photo.uploaderName} ({photo.team})
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <button className="flex items-center space-x-1 text-red-600">
                          <span>❤️</span>
                          <span className="text-sm">{photo.likes}</span>
                        </button>
                        <button className="flex items-center space-x-1 text-blue-600">
                          <span>💬</span>
                          <span className="text-sm">{photo.comments?.length || 0}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. 연수 보고서 작성 섹션 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              📝 연수 보고서 작성
              {reportSaved && (
                <span className="ml-3 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  저장됨 ✓
                </span>
              )}
            </h2>

            <div className="space-y-4">
              {/* 제목 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📋 보고서 제목
                </label>
                <input
                  type="text"
                  value={report.title}
                  onChange={(e) => setReport(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="보고서 제목을 입력하세요"
                />
              </div>

              {/* 작성자 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👤 작성자
                </label>
                <input
                  type="text"
                  value={report.author}
                  onChange={(e) => setReport(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="작성자 이름"
                />
              </div>

              {/* 내용 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📄 보고서 내용
                </label>
                <textarea
                  value={report.content}
                  onChange={(e) => setReport(prev => ({ ...prev, content: e.target.value }))}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="연수 활동 내용, 소감, 학습 내용 등을 자유롭게 작성해주세요..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  양식 불러오을 누르시면 양식이 반영됩니다.(기존 내용삭제). ai 글 다듬기를 누르면 기존의 내용이 클립보드로 복사되고 기존의 내용이 삭제됩니다.
                </p>
              </div>

              {/* 버튼들 */}
              <div className="flex space-x-3">
                <button
                  onClick={handleAiRefine}
                  disabled={!report.content.trim()}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    !report.content.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  📋 내용 클립보드 복사
                </button>

                <button
                  onClick={handleSaveReport}
                  disabled={isSaving || !report.title.trim() || !report.content.trim()}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    isSaving || !report.title.trim() || !report.content.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <span className="inline-block animate-spin mr-2">⏳</span>
                      저장 중...
                    </>
                  ) : (
                    '💾 저장하기'
                  )}
                </button>
              </div>

              {/* 안내 메시지 */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-blue-400 text-xl">💡</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      보고서 작성 안내
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>내용 클립보드 복사 사용 시 기존 내용이 클립보드에 자동 복사됩니다</li>
                        <li>저장된 보고서는 최종 연수 보고서 작성시 활용됩니다</li>
                        <li>언제든지 수정하고 다시 저장할 수 있습니다</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
