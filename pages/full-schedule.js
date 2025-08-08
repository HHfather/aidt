import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function FullSchedulePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedActivities, setSelectedActivities] = useState([])

  useEffect(() => {
    // 사용자 세션 확인
    const userSession = localStorage.getItem('userSession')
    if (!userSession) {
      router.push('/')
      return
    }

    try {
      const sessionData = JSON.parse(userSession)
      if (sessionData.success && sessionData.user) {
        setUser(sessionData.user)
        loadScheduleData(sessionData.user)
      } else {
        router.push('/')
        return
      }
    } catch (error) {
      console.error('세션 파싱 오류:', error)
      router.push('/')
      return
    }
  }, [router])

  const loadScheduleData = async (userData) => {
    try {
      setLoading(true)

      // 프로젝트 데이터에서 스케줄 가져오기
      const projectData = userData.currentProject
      if (!projectData || !projectData.schedule) {
        toast.error('일정 데이터를 찾을 수 없습니다.')
        return
      }

      setSchedule(projectData.schedule || [])
    } catch (error) {
      console.error('일정 데이터 로딩 오류:', error)
      toast.error('일정 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDateClick = (day) => {
    const daySchedule = schedule.find(s => s.day === day.day)
    if (daySchedule) {
      setSelectedDate(day)
      
      // 자유일정 자동 추가 (마지막 날 제외)
      const isLastDay = day.day === Math.max(...schedule.map(s => s.day))
      const activities = [...(daySchedule.activities || [])]
      
      if (!isLastDay && activities.length > 0) {
        // 마지막 활동 시간 계산
        const lastActivity = activities[activities.length - 1]
        const lastTime = lastActivity.time ? lastActivity.time.split('-')[1] || lastActivity.time : '18:00'
        
        activities.push({
          activityName: '자유일정',
          time: `${lastTime.trim()} - 자유시간`,
          location: '자유선택',
          description: '개인 시간 활용',
          isFreeTime: true
        })
      }
      
      setSelectedActivities(activities)
    }
  }

  const handleActivityClick = (activity, dayIndex, activityIndex) => {
    if (activity.isFreeTime) {
      router.push(`/activities/freeTime-${selectedDate.day}`)
    } else {
      router.push(`/activities/${selectedDate.day}-${activityIndex}`)
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      })
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">일정을 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
                ← 대시보드
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">전체 일정</h1>
                <p className="text-sm text-gray-500">
                  {user?.currentProject?.projectName || '연수 프로그램'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 캘린더 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">일정 캘린더</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {schedule.map((day, index) => (
                  <div
                    key={day.day}
                    onClick={() => handleDateClick(day)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedDate?.day === day.day
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-500 mb-1">
                        Day {day.day}
                      </div>
                      <div className="text-lg font-semibold text-gray-900 mb-2">
                        {formatDate(day.date)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {day.activities?.length || 0}개 활동
                      </div>
                      {day.activities && day.activities.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600 line-clamp-2">
                          {day.activities[0].activityName}
                          {day.activities.length > 1 && ` 외 ${day.activities.length - 1}개`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {schedule.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>등록된 일정이 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* 선택된 날짜의 상세 일정 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {selectedDate ? `Day ${selectedDate.day} 일정` : '날짜 선택'}
              </h2>
              
              {selectedDate ? (
                <div>
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">날짜</div>
                    <div className="font-medium text-gray-900">
                      {formatDate(selectedDate.date)}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedActivities.map((activity, index) => (
                      <div
                        key={index}
                        onClick={() => handleActivityClick(activity, selectedDate.day, index)}
                        className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all duration-200 ${
                          activity.isFreeTime 
                            ? 'border-green-200 bg-green-50 hover:bg-green-100' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`font-medium ${
                              activity.isFreeTime ? 'text-green-900' : 'text-gray-900'
                            }`}>
                              {activity.activityName}
                              {activity.isFreeTime && ' 🏃‍♂️'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {activity.time}
                            </p>
                            <p className="text-xs text-gray-500">
                              {activity.location}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {selectedActivities.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <p>이 날의 활동이 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>왼쪽에서 날짜를 선택하면</p>
                  <p>해당 날의 상세 일정을 볼 수 있습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
