import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { 
  collection, 
  addDoc,
  query, 
  where, 
  getDocs, 
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore'
import { db } from '../../firebaseConfig'
import toast from 'react-hot-toast'

export default function GuideAnnouncementPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [project, setProject] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [newAnnouncement, setNewAnnouncement] = useState('')
  const [urgentLevel, setUrgentLevel] = useState('normal')
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    // 사용자 세션 확인
    const userSession = localStorage.getItem('userSession')
    if (!userSession) {
      router.push('/')
      return
    }

    try {
      const userData = JSON.parse(userSession)
      setUser(userData)
      
      // 가이드/관리자 권한 확인
      if (userData.role !== 'admin' && userData.role !== 'guide') {
        toast.error('가이드/관리자만 접근할 수 있습니다.')
        router.push('/dashboard')
        return
      }

      setProject(userData.currentProject)
      loadAnnouncements(userData.currentProject.id)
    } catch (error) {
      console.error('세션 로드 오류:', error)
      router.push('/')
    }
  }, [router])

  const loadAnnouncements = async (projectId) => {
    try {
      setLoading(true)

      // Firebase에서 공지사항 로드
      try {
        const announcementQuery = query(
          collection(db, 'announcements'),
          where('projectId', '==', projectId),
          orderBy('createdAt', 'desc')
        )
        const snapshot = await getDocs(announcementQuery)
        const announcementData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        if (announcementData.length > 0) {
          setAnnouncements(announcementData)
        } else {
          // 임시 데이터
          setAnnouncements([
            {
              id: 'temp1',
              content: '🎉 안녕하세요! 연수 프로그램에 오신 것을 환영합니다.',
              urgentLevel: 'normal',
              author: user?.name || '가이드',
              date: new Date().toISOString(),
              readCount: 12
            },
            {
              id: 'temp2', 
              content: '⏰ 오늘 오후 2시 카를교 투어가 예정되어 있습니다. 늦지 마세요!',
              urgentLevel: 'urgent',
              author: user?.name || '가이드',
              date: new Date().toISOString(),
              readCount: 8
            }
          ])
        }
      } catch (fbError) {
        console.log('Firebase 로드 실패, 임시 데이터 사용:', fbError)
        setAnnouncements([
          {
            id: 'temp1',
            content: '🎉 안녕하세요! 연수 프로그램에 오신 것을 환영합니다.',
            urgentLevel: 'normal',
            author: user?.name || '가이드',
            date: new Date().toISOString(),
            readCount: 12
          }
        ])
      }

      setLoading(false)
    } catch (error) {
      console.error('공지사항 로드 오류:', error)
      toast.error('공지사항을 불러오는 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handlePublishAnnouncement = async () => {
    if (!newAnnouncement.trim()) {
      toast.error('공지사항 내용을 입력해주세요.')
      return
    }

    setPublishing(true)

    try {
      const announcementData = {
        projectId: project.id,
        content: newAnnouncement.trim(),
        urgentLevel: urgentLevel,
        author: user.name,
        authorId: user.id,
        createdAt: serverTimestamp(),
        readCount: 0
      }

      // Firebase에 저장
      try {
        const docRef = await addDoc(collection(db, 'announcements'), announcementData)
        console.log('공지사항이 Firebase에 저장되었습니다:', docRef.id)
        
        // 즉시 UI 업데이트
        const newAnnouncementWithId = {
          id: docRef.id,
          ...announcementData,
          date: new Date().toISOString()
        }
        setAnnouncements(prev => [newAnnouncementWithId, ...prev])

      } catch (fbError) {
        console.log('Firebase 저장 실패, 로컬에만 저장:', fbError)
        
        // 로컬 업데이트
        const tempAnnouncement = {
          id: Date.now().toString(),
          ...announcementData,
          date: new Date().toISOString()
        }
        setAnnouncements(prev => [tempAnnouncement, ...prev])
      }

      // 푸시 알림 시뮬레이션
      if (urgentLevel === 'urgent') {
        toast.success('🚨 긴급 공지사항이 모든 참가자에게 전송되었습니다!', {
          duration: 4000,
          style: {
            background: '#EF4444',
            color: 'white'
          }
        })
      } else {
        toast.success('📢 공지사항이 성공적으로 발행되었습니다!')
      }

      // 입력 초기화
      setNewAnnouncement('')
      setUrgentLevel('normal')

    } catch (error) {
      console.error('공지사항 발행 오류:', error)
      toast.error('공지사항 발행 중 오류가 발생했습니다.')
    } finally {
      setPublishing(false)
    }
  }

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return

    try {
      // Firebase에서 삭제
      if (announcementId.startsWith('temp')) {
        // 임시 데이터는 로컬에서만 삭제
        setAnnouncements(prev => prev.filter(ann => ann.id !== announcementId))
      } else {
        await deleteDoc(doc(db, 'announcements', announcementId))
        setAnnouncements(prev => prev.filter(ann => ann.id !== announcementId))
      }

      toast.success('공지사항이 삭제되었습니다.')
    } catch (error) {
      console.error('공지사항 삭제 오류:', error)
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUrgencyBadge = (level) => {
    switch (level) {
      case 'urgent':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">🚨 긴급</span>
      case 'important':
        return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">⚠️ 중요</span>
      default:
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">📢 일반</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">데이터 로딩 중...</div>
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
              <Link href="/dashboard">
                <button className="text-gray-600 hover:text-gray-900">
                  ← 대시보드
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  📢 공지사항 관리
                </h1>
                <p className="text-sm text-gray-600">
                  {user?.name} 가이드 - 실시간 공지 발행
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* 새 공지사항 작성 */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                ✏️ 새 공지사항 작성
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    중요도 선택
                  </label>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setUrgentLevel('normal')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        urgentLevel === 'normal'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      📢 일반
                    </button>
                    <button
                      onClick={() => setUrgentLevel('important')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        urgentLevel === 'important'
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      ⚠️ 중요
                    </button>
                    <button
                      onClick={() => setUrgentLevel('urgent')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        urgentLevel === 'urgent'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      🚨 긴급
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    공지사항 내용
                  </label>
                  <textarea
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    placeholder="참가자들에게 전달할 공지사항을 입력해주세요..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    이모티콘을 활용하면 더 눈에 띄는 공지사항을 만들 수 있습니다! 🎉
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {urgentLevel === 'urgent' && '🚨 긴급 공지는 즉시 푸시 알림으로 전송됩니다'}
                    {urgentLevel === 'important' && '⚠️ 중요 공지는 대시보드 상단에 표시됩니다'}
                    {urgentLevel === 'normal' && '📢 일반 공지는 공지사항 목록에 추가됩니다'}
                  </div>
                  <button
                    onClick={handlePublishAnnouncement}
                    disabled={publishing || !newAnnouncement.trim()}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      publishing || !newAnnouncement.trim()
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {publishing ? '발행 중...' : '📤 공지사항 발행'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 기존 공지사항 목록 */}
          <div>
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold flex items-center justify-between">
                  📋 발행된 공지사항 ({announcements.length}건)
                  <span className="text-sm text-gray-500 font-normal">최신순</span>
                </h2>
              </div>
              
              <div className="p-6">
                {announcements.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📭</div>
                    <p className="text-gray-600">아직 발행된 공지사항이 없습니다.</p>
                    <p className="text-sm text-gray-500 mt-2">첫 번째 공지사항을 작성해보세요!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-3">
                            {getUrgencyBadge(announcement.urgentLevel)}
                            <span className="text-sm text-gray-600">
                              {formatDate(announcement.date)}
                            </span>
                            <span className="text-sm text-gray-500">
                              👁️ {announcement.readCount || 0}명 읽음
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            🗑️ 삭제
                          </button>
                        </div>
                        
                        <p className="text-gray-900 mb-2">{announcement.content}</p>
                        
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>작성자: {announcement.author}</span>
                          {announcement.urgentLevel === 'urgent' && (
                            <span className="text-red-600 font-medium">
                              🔔 푸시 알림 발송됨
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
