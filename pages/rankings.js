import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function Rankings() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('our-region') // 'our-region' or 'all'

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
      loadRankings()
    } catch (error) {
      console.error('세션 로드 오류:', error)
      router.push('/')
    }
  }, [])

  const loadRankings = async () => {
    try {
      // 전체 랭킹 로드
      const response = await fetch('/api/rankings')
      const data = await response.json()
      
      if (response.ok) {
        setRankings(data) // API에서 이미 정렬되어 옴
      } else {
        throw new Error(data.error || '랭킹 데이터를 불러올 수 없습니다.')
      }
    } catch (error) {
      console.error('랭킹 로드 오류:', error)
      toast.error('랭킹 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredRankings = () => {
    if (!user || !rankings.length) return []
    
    if (activeTab === 'our-region') {
      // 우리 권역만 필터링
      return rankings.filter(ranking => ranking.region === user.region)
    }
    
    // 전체 랭킹
    return rankings
  }

  const getRankDisplay = (index) => {
    const rank = index + 1
    switch(rank) {
      case 1: return { emoji: '🥇', text: '1위', color: 'from-yellow-400 to-yellow-600' }
      case 2: return { emoji: '🥈', text: '2위', color: 'from-gray-400 to-gray-600' }
      case 3: return { emoji: '🥉', text: '3위', color: 'from-orange-400 to-orange-600' }
      default: return { emoji: '🏅', text: `${rank}위`, color: 'from-blue-400 to-blue-600' }
    }
  }

  const getScoreBreakdown = (ranking) => {
    return [
      { label: '출석', value: ranking.attendance || 0, color: 'bg-green-500' },
      { label: '사진 업로드', value: ranking.photoUploads || 0, color: 'bg-blue-500' },
      { label: '댓글', value: ranking.commentsAdded || 0, color: 'bg-purple-500' },
      { label: '이모지', value: ranking.emojisAdded || 0, color: 'bg-pink-500' },
      { label: '받은 이모지', value: ranking.emojisReceived || 0, color: 'bg-yellow-500' }
    ]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">랭킹 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const filteredRankings = getFilteredRankings().slice(0, 10) // 상위 10명만 표시

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">🏆 참여도 랭킹</h1>
            </div>
            <div className="text-sm text-gray-600">
              {user && `${user.name} (${user.region})`}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 메뉴 */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-md">
            <button
              onClick={() => setActiveTab('our-region')}
              className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'our-region'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
              }`}
            >
              🏘️ 우리 권역 랭킹
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 ml-1 ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
              }`}
            >
              🌍 전체 랭킹
            </button>
          </div>
        </div>

        {/* 랭킹 카드 그리드 */}
        {filteredRankings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRankings.map((ranking, index) => {
              const rankDisplay = getRankDisplay(index)
              const scoreBreakdown = getScoreBreakdown(ranking)
              const isCurrentUser = ranking.id === user?.id

              return (
                <div
                  key={ranking.id}
                  className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                    isCurrentUser ? 'ring-4 ring-indigo-400 ring-opacity-75' : ''
                  }`}
                >
                  {/* 배경 그라데이션 */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${rankDisplay.color} opacity-90`} />
                  
                  {/* 카드 내용 */}
                  <div className="relative p-6 text-white">
                    {/* 순위 표시 */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-3xl">{rankDisplay.emoji}</span>
                        <span className="text-xl font-bold">{rankDisplay.text}</span>
                      </div>
                      {isCurrentUser && (
                        <div className="bg-white bg-opacity-20 rounded-full px-3 py-1">
                          <span className="text-sm font-medium">나</span>
                        </div>
                      )}
                    </div>

                    {/* 사용자 정보 */}
                    <div className="mb-4">
                      <h3 className="text-lg font-bold truncate">{ranking.name}</h3>
                      <p className="text-sm opacity-90">{ranking.region} • {ranking.affiliation}</p>
                    </div>

                    {/* 총점 */}
                    <div className="mb-4">
                      <div className="text-center bg-white bg-opacity-20 rounded-lg py-3">
                        <div className="text-2xl font-bold">{ranking.totalScore}</div>
                        <div className="text-sm opacity-90">총점</div>
                      </div>
                    </div>

                    {/* 활동 내역 */}
                    <div className="space-y-2">
                      {scoreBreakdown.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="opacity-90">{item.label}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* 기본/보너스 점수 */}
                    <div className="mt-4 pt-4 border-t border-white border-opacity-30">
                      <div className="flex justify-between text-sm">
                        <span className="opacity-90">기본점수</span>
                        <span className="font-medium">{ranking.baseScore || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="opacity-90">보너스점수</span>
                        <span className="font-medium">{ranking.bonusScore || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === 'our-region' ? '우리 권역' : '전체'} 랭킹 데이터가 없습니다
            </h3>
            <p className="text-gray-600">
              아직 참여 활동이 없거나 데이터를 불러올 수 없습니다.
            </p>
          </div>
        )}

        {/* 하단 설명 */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 점수 계산 방식</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>출석: 활동에 참여한 횟수</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>사진 업로드: 갤러리에 올린 사진 수</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>댓글: 작성한 댓글 수</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
              <span>이모지: 추가한 이모지 수</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>받은 이모지: 다른 사람이 준 이모지 수</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}