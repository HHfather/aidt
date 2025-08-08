import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy 
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
import toast from 'react-hot-toast'

// 탭 컴포넌트들 import
import AnnouncementsTab from '../components/AnnouncementsTab'
import PhotosTab from '../components/PhotosTab'
import ScheduleTab from '../components/ScheduleTab'
import FeedbackTab from '../components/FeedbackTab'
import ParticipantsTab from '../components/ParticipantsTab'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [project, setProject] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [participants, setParticipants] = useState([])
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('photos') // 기본 탭을 공지사항으로 설정
  
  // 사용자 통계
  const [userStats, setUserStats] = useState({
    totalScore: 0,
    rank: 0,
    commentsAdded: 0,
    photosAdded: 0,
    emojisAdded: 0
  })

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
      setProject(userData.currentProject)
      loadProjectData(userData.currentProject.id, userData)
    } catch (error) {
      console.error('세션 로드 오류:', error)
      router.push('/')
    }
  }, [router])

  const loadProjectData = async (projectId, userData) => {
    try {
      // 일정 데이터 로드
      await loadSchedules(projectId)
      
      // 공지사항 로드
      await loadAnnouncements(projectId)
      
      // 참가자 목록 로드
      await loadParticipants(projectId)
      

      
      setLoading(false)
    } catch (error) {
      console.error('프로젝트 데이터 로드 오류:', error)
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const loadSchedules = async (projectId) => {
    try {
      // 사용자 세션에서 권역 정보 가져오기
      const userSession = localStorage.getItem('userSession')
      if (!userSession) {
        console.log('사용자 세션 없음')
        setSchedules([])
        return
      }
      
      const userData = JSON.parse(userSession)
      const region = userData.region || userData.affiliation?.replace(/[^0-9]/g, '') || '1'
      
      // 가이드 일정 관리에서 일정 데이터 가져오기
      const response = await fetch(`/api/schedule-management?region=${region}`)
      const result = await response.json()
      
      if (result.success && result.data && result.data.activities) {
        const processedSchedules = []
        const activities = result.data.activities
        
        Object.keys(activities).forEach(date => {
          const daySchedules = activities[date]
          
          // 해당 날짜의 일정들을 시간순으로 정렬
          daySchedules.sort((a, b) => {
            const timeA = a.time || '00:00'
            const timeB = b.time || '00:00'
            return timeA.localeCompare(timeB)
          })
          
          // 기존 일정들 추가
          daySchedules.forEach(schedule => {
            processedSchedules.push({
              id: `${date}_${schedule.time}`,
              date: date,
              time: schedule.time,
              activityName: schedule.activity,
              location: schedule.location,
              adminNotes: schedule.description || '',
              type: 'normal',
              hasResearchTask: schedule.activity?.includes('연구') || schedule.activity?.includes('과제') || false,
              isMeal: schedule.activity?.includes('조식') || schedule.activity?.includes('중식') || schedule.activity?.includes('석식') || schedule.activity?.includes('아침') || schedule.activity?.includes('점심') || schedule.activity?.includes('저녁') || false
            })
          })
          
          // 마지막 일정 1시간 후에 자유시간 추가
          if (daySchedules.length > 0) {
            const lastSchedule = daySchedules[daySchedules.length - 1]
            const lastTime = lastSchedule.time || '18:00'
            
            // 시간을 분으로 변환하여 1시간 추가
            const [hours, minutes] = lastTime.split(':').map(Number)
            const freeTimeHours = hours + 1
            const freeTime = `${freeTimeHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
            
            processedSchedules.push({
              id: `auto_free_${date}`,
              date: date,
              time: freeTime,
              activityName: '🗓️ 자유일정',
              location: '자유 선택',
              type: 'free',
              adminNotes: '자유로운 시간을 만끽해보세요!',
              autoGenerated: true
            })
          }
        })
        
        setSchedules(processedSchedules)
      } else {
        // DB에 데이터가 없을 때는 빈 배열로 설정
        setSchedules([])
      }
    } catch (error) {
      console.log('일정 로드 실패:', error)
      setSchedules([])
    }
  }

  const loadAnnouncements = async (projectId) => {
    try {
      // 사용자 세션에서 권역 정보 가져오기
      const userSession = localStorage.getItem('userSession')
      if (!userSession) {
        console.log('사용자 세션 없음')
        setAnnouncements([])
        return
      }
      
      const userData = JSON.parse(userSession)
      const region = userData.region || userData.affiliation?.replace(/[^0-9]/g, '') || '1'
      
      // 공지사항 API에서 데이터 가져오기
      const response = await fetch(`/api/announcements?region=${region}`)
      const result = await response.json()
      
      if (result.success && result.data && result.data.length > 0) {
        // 공지사항 데이터를 대시보드 형식에 맞게 변환
        const formattedAnnouncements = result.data.slice(0, 5).map(announcement => ({
          id: announcement.id,
          date: announcement.date,
          content: announcement.content,
          author: announcement.createdBy,
          urgentLevel: announcement.urgentLevel || 'normal'
        }))
        setAnnouncements(formattedAnnouncements)
      } else {
        setAnnouncements([
          {
            id: 1,
            date: new Date().toISOString().split('T')[0],
            content: "🎉 안녕하세요! 연수 프로그램에 오신 것을 환영합니다.",
            author: "가이드",
            urgentLevel: "normal"
          }
        ])
      }
    } catch (error) {
      console.log('공지사항 로드 실패:', error)
      setAnnouncements([
        {
          id: 1,
          date: new Date().toISOString().split('T')[0],
          content: "🎉 안녕하세요! 연수 프로그램에 오신 것을 환영합니다.",
          author: "가이드",
          urgentLevel: "normal"
        }
      ])
    }
  }

  const loadParticipants = async (projectId) => {
    try {
      // 사용자 세션에서 권역 정보 가져오기
      const userSession = localStorage.getItem('userSession')
      if (!userSession) {
        console.log('사용자 세션 없음')
        setParticipants([])
        return
      }
      
      const userData = JSON.parse(userSession)
      const region = userData.region || userData.affiliation?.replace(/[^0-9]/g, '') || '1'
      
      // 참가자 관리에서 데이터 가져오기 (참가자 관리가 불러오는 값 그대로 사용)
      const response = await fetch(`/api/participants?region=${region}`)
      const result = await response.json()
      
      if (result.success && result.data && result.data.length > 0) {
        // 참가자 데이터를 가나다순으로 정렬 (부재자 제외)
        const activeParticipants = result.data.filter(participant => 
          !participant.name?.includes('부재') && 
          !participant.affiliation?.includes('부재')
        )
        
        const sortedParticipants = activeParticipants.sort((a, b) => 
          a.name.localeCompare(b.name, 'ko')
        )
        setParticipants(sortedParticipants)
      } else {
        setParticipants([])
      }
    } catch (error) {
      console.log('참가자 로드 실패:', error)
      setParticipants([])
    }
  }



  const handleLogout = () => {
    localStorage.removeItem('userSession')
    toast.success('로그아웃 되었습니다.')
    router.push('/')
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {project?.projectName}
              </h1>
              <p className="text-sm text-gray-600">
                {user?.name}님 ({user?.affiliation})
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* 탭 네비게이션 */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'photos', name: '베스트 포토', icon: '📸' },
                  { id: 'announcements', name: '공지사항 및 오늘의 일정', icon: '📢' },
                  { id: 'schedule', name: '전체 연수 일정', icon: '📅' },
                  { id: 'participants', name: '함께하는 분들', icon: '👥' },
                  { id: 'feedback', name: '피드백 보내기', icon: '📝' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.icon} {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* 탭 내용 */}

          {activeTab === 'photos' && <PhotosTab />}

          {activeTab === 'announcements' && (
            <AnnouncementsTab 
              announcements={announcements}
              schedules={schedules}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleTab 
              projectId={project?.id}
            />
          )}

          {activeTab === 'participants' && (
            <ParticipantsTab 
              participants={participants}
            />
          )}

          {activeTab === 'feedback' && (
            <FeedbackTab />
          )}

        </div>
      </main>
    </div>
  )
}
