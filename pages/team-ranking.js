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

export default function TeamRanking() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

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
      loadTeamRankings()
    } catch (error) {
      console.error('세션 로드 오류:', error)
      router.push('/')
    }
  }, [])

  const loadTeamRankings = async () => {
    try {
      // 실제 팀별 데이터를 시뮬레이션
      const mockTeams = [
        {
          id: 'team1',
          name: '프라하 탐험대',
          startDate: '2025-08-05T09:00:00Z',
          members: ['김민수', '이영희', '박철수', '정수진'],
          totalScore: 0,
          activities: {
            photos: 15,
            comments: 24,
            reactions: 45,
            participationRate: 98
          }
        },
        {
          id: 'team2', 
          name: '비엔나 여행단',
          startDate: '2025-08-13T09:00:00Z',
          members: ['홍길동', '김수현', '이준호', '박지영'],
          totalScore: 0,
          activities: {
            photos: 12,
            comments: 18,
            reactions: 32,
            participationRate: 85
          }
        },
        {
          id: 'team3',
          name: '중부유럽 러버즈',
          startDate: '2025-08-07T09:00:00Z', 
          members: ['최윤서', '강태현', '오세훈', '신민아'],
          totalScore: 0,
          activities: {
            photos: 18,
            comments: 31,
            reactions: 52,
            participationRate: 92
          }
        },
        {
          id: 'team4',
          name: '체코&오스트리아',
          startDate: '2025-08-10T09:00:00Z',
          members: ['장혜진', '문상호', '배수지', '임시완'],
          totalScore: 0,
          activities: {
            photos: 10,
            comments: 15,
            reactions: 28,
            participationRate: 78
          }
        }
      ]

      // 절대적 시간 기준으로 점수 계산
      const now = new Date()
      const rankedTeams = mockTeams.map(team => {
        const startTime = new Date(team.startDate)
        const hoursFromStart = Math.max(0, (now - startTime) / (1000 * 60 * 60)) // 시작부터 현재까지의 시간(시간 단위)
        
        // 시간 기반 가중치 적용 (14시간 기준)
        const timeWeight = Math.min(hoursFromStart / 14, 2) // 최대 2배까지 가중치
        
        // 활동별 점수 계산
        const photoScore = team.activities.photos * 5
        const commentScore = team.activities.comments * 3  
        const reactionScore = team.activities.reactions * 1
        const participationBonus = team.activities.participationRate * 2
        
        const baseScore = photoScore + commentScore + reactionScore + participationBonus
        const totalScore = Math.round(baseScore * timeWeight)
        
        return {
          ...team,
          totalScore,
          hoursFromStart: Math.round(hoursFromStart * 10) / 10,
          timeWeight: Math.round(timeWeight * 100) / 100
        }
      }).sort((a, b) => b.totalScore - a.totalScore)

      setTeams(rankedTeams)
      setLoading(false)
    } catch (error) {
      console.error('팀 순위 로드 오류:', error)
      toast.error('팀 순위를 불러오는 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const getRankEmoji = (index) => {
    switch(index) {
      case 0: return '🥇'
      case 1: return '🥈' 
      case 2: return '🥉'
      default: return '🏅'
    }
  }

  const getTeamColor = (index) => {
    const colors = [
      'from-yellow-400 to-orange-500', // 1위
      'from-gray-300 to-gray-500',     // 2위  
      'from-orange-400 to-red-500',    // 3위
      'from-blue-400 to-purple-500'    // 4위+
    ]
    return colors[Math.min(index, colors.length - 1)]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">순위 데이터 로딩 중...</div>
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
                  📊 팀별 순위 (실시간)
                </h1>
                <p className="text-sm text-gray-600">
                  절대적 시간 기준 참여도 랭킹
                </p>
              </div>
            </div>
            <button
              onClick={loadTeamRankings}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 새로고침
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* 점수 계산 설명 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 점수 계산 방식</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• 사진 업로드: 5점 | 댓글 작성: 3점 | 반응(좋아요): 1점 | 참여율 보너스: 2점</p>
              <p>• <strong>절대적 시간 기준</strong>: 각 팀의 시작일로부터 경과한 시간에 따라 가중치 적용</p>
              <p>• 예시: 8월 5일 시작팀의 14시간 후 vs 8월 13일 시작팀의 14시간 후 점수 비교</p>
            </div>
          </div>

          {/* 팀별 순위 */}
          <div className="space-y-4">
            {teams.map((team, index) => (
              <div
                key={team.id}
                className={`bg-gradient-to-r ${getTeamColor(index)} rounded-lg p-6 text-white shadow-lg`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">{getRankEmoji(index)}</div>
                    <div>
                      <h3 className="text-2xl font-bold">{index + 1}위 - {team.name}</h3>
                      <p className="text-sm opacity-90">
                        시작일: {new Date(team.startDate).toLocaleDateString('ko-KR')} 
                        ({team.hoursFromStart}시간 경과)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{team.totalScore.toLocaleString()}</div>
                    <div className="text-sm opacity-90">총점</div>
                  </div>
                </div>

                {/* 팀 멤버 */}
                <div className="mb-4">
                  <div className="text-sm opacity-90 mb-2">팀 멤버 ({team.members.length}명)</div>
                  <div className="flex flex-wrap gap-2">
                    {team.members.map((member, idx) => (
                      <span
                        key={idx}
                        className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm"
                      >
                        {member}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 활동 통계 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{team.activities.photos}</div>
                    <div className="text-xs opacity-90">📸 사진</div>
                  </div>
                  <div className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{team.activities.comments}</div>
                    <div className="text-xs opacity-90">💬 댓글</div>
                  </div>
                  <div className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{team.activities.reactions}</div>
                    <div className="text-xs opacity-90">👍 반응</div>
                  </div>
                  <div className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{team.activities.participationRate}%</div>
                    <div className="text-xs opacity-90">✅ 참여율</div>
                  </div>
                </div>

                {/* 시간 가중치 정보 */}
                <div className="mt-4 text-xs opacity-75">
                  시간 가중치: {team.timeWeight}배 적용됨
                </div>
              </div>
            ))}
          </div>

          {/* 내 팀 하이라이트 */}
          {user?.team && (
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🎯 내 팀 ({user.team}) 현황
              </h3>
              {(() => {
                const myTeamIndex = teams.findIndex(team => team.name === user.team)
                const myTeam = teams[myTeamIndex]
                
                if (myTeam) {
                  return (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-medium">현재 순위: {myTeamIndex + 1}위</span>
                        <span className="text-2xl">{getRankEmoji(myTeamIndex)}</span>
                      </div>
                      <p className="text-gray-600">
                        총점: {myTeam.totalScore.toLocaleString()}점 | 
                        참여율: {myTeam.activities.participationRate}%
                      </p>
                      {myTeamIndex > 0 && (
                        <p className="text-sm text-blue-600 mt-2">
                          💪 {teams[myTeamIndex - 1].totalScore - myTeam.totalScore}점 더 올리면 {myTeamIndex}위!
                        </p>
                      )}
                    </div>
                  )
                } else {
                  return (
                    <p className="text-gray-600">내 팀 정보를 찾을 수 없습니다.</p>
                  )
                }
              })()}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
