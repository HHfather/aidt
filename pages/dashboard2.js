import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

// Firebase 및 Next.js 관련 import 제거
// import { useRouter } from 'next/router';
// import Link from 'next/link';
// import { 
//   collection, 
//   query, 
//   where, 
//   getDocs, 
//   orderBy 
// } from 'firebase/firestore';
// import { db } from '../firebaseConfig';


// Mock DB object to allow the code to run without a real firebase config
const db = null;

export default function Dashboard() {
  // const router = useRouter(); // useRouter 제거
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    comments: 3,
    reactions: 12,
    photos: 2
  });
  const [teamRanking, setTeamRanking] = useState({
    currentRank: 1,
    totalTeams: 4,
    pointsToNext: 0,
    motivationMessage: ''
  });

  // 날짜 포맷팅 함수
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  // 동기부여 메시지 생성 함수
  const getMotivationMessage = () => {
    const { comments, reactions, photos } = userStats;
    const total = comments + reactions + photos;
    
    if (total === 0) {
      return "아직 참여가 부족해요 😢 사진을 올리고 댓글을 남겨보세요!";
    } else if (total < 5) {
      return "좋은 시작이에요! 👍 더 많이 참여해보세요!";
    } else if (total < 15) {
      return "활발하게 참여하고 계시네요! 🎉";
    } else {
      return "정말 멋진 참여도입니다! 🌟 최고에요!";
    }
  };

  // 📊 실시간 사용자 통계 로드 함수 (Firebase 로직 제거, 목업 데이터 사용)
  const loadUserStats = useCallback(async (userId) => {
    console.log('Firebase 통계 로드 실패, 임시 데이터 사용');
    setUserStats({
      comments: 3,
      reactions: 12,
      photos: 2
    });
  }, []);

  // 🏆 팀 순위 로드 함수 (기존 목업 데이터 로직 유지)
  const loadTeamRanking = useCallback(async (teamName) => {
    try {
      const mockTeams = [
        { name: '프라하 탐험대', startDate: '2025-08-05T09:00:00Z', activities: { photos: 15, comments: 24, reactions: 45, participationRate: 98 } },
        { name: '비엔나 여행단', startDate: '2025-08-13T09:00:00Z', activities: { photos: 12, comments: 18, reactions: 32, participationRate: 85 } },
        { name: '중부유럽 러버즈', startDate: '2025-08-07T09:00:00Z', activities: { photos: 18, comments: 31, reactions: 52, participationRate: 92 } },
        { name: '체코&오스트리아', startDate: '2025-08-10T09:00:00Z', activities: { photos: 10, comments: 15, reactions: 28, participationRate: 78 } }
      ];

      const now = new Date();
      const rankedTeams = mockTeams.map(team => {
        const startTime = new Date(team.startDate);
        const hoursFromStart = Math.max(0, (now - startTime) / (1000 * 60 * 60));
        const timeWeight = Math.min(hoursFromStart / 14, 2);
        
        const photoScore = team.activities.photos * 5;
        const commentScore = team.activities.comments * 3;
        const reactionScore = team.activities.reactions * 1;
        const participationBonus = team.activities.participationRate * 2;
        
        const baseScore = photoScore + commentScore + reactionScore + participationBonus;
        const totalScore = Math.round(baseScore * timeWeight);
        
        return { ...team, totalScore };
      }).sort((a, b) => b.totalScore - a.totalScore);

      const myTeamIndex = rankedTeams.findIndex(team => team.name === teamName);
      const currentRank = myTeamIndex + 1;
      const pointsToNext = myTeamIndex > 0 ? rankedTeams[myTeamIndex - 1].totalScore - rankedTeams[myTeamIndex].totalScore : 0;

      const motivationMessages = [
        "선생님들보다 더 많이 작성하지 않을까요? 📝✨",
        "이정도 참여도면 선생님들도 깜짝 놀라실 것 같아요! 👨‍🏫😮",
        "벌써 이렇게 활발하시다니, 연수가 끝날 때까지 얼마나 더 성장하실지 기대돼요! 🚀",
        "선생님들 눈에 띌 만한 활동량이네요! 계속 이런 열정 보여주세요! 🔥"
      ];

      setTeamRanking({
        currentRank,
        totalTeams: rankedTeams.length,
        pointsToNext,
        motivationMessage: motivationMessages[Math.floor(Math.random() * motivationMessages.length)]
      });
    } catch (error) {
      console.error('팀 순위 로드 오류:', error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadProjectData = async (userData) => {
      try {
        // --- 일정 데이터 로드 (임시 데이터 사용) ---
        const fallbackSchedules = [
            { id: 'temp1', date: '2025-08-06', time: '09:00', activityName: '프라하 성 방문', location: '프라하, 체코', adminNotes: '' },
            { id: 'auto_free_2025-08-06', date: '2025-08-06', time: '자유시간', activityName: '🗓️ 자유일정', location: '자유 선택', type: 'free', adminNotes: '프라하에서의 자유로운 시간을 만끽해보세요!', autoGenerated: true },
            { id: 'temp3', date: '2025-08-07', time: '10:00', activityName: '체스키 크룸로프 당일치기', location: '체스키 크룸로프, 체코', adminNotes: '' },
            { id: 'auto_free_2025-08-07', date: '2025-08-07', time: '자유시간', activityName: '🗓️ 자유일정', location: '자유 선택', type: 'free', adminNotes: '체스키 크룸로프에서의 자유로운 시간을 만끽해보세요!', autoGenerated: true },
        ];
        if (isMounted) setSchedules(fallbackSchedules);

        // --- 공지사항 데이터 로드 (임시 데이터 사용) ---
        if (isMounted) {
            setAnnouncements([
              { id: 1, date: new Date().toISOString().split('T')[0], content: "🎉 안녕하세요! 연수 프로그램에 오신 것을 환영합니다.", author: "가이드", urgentLevel: "normal" },
              { id: 2, date: new Date().toISOString().split('T')[0], content: "⏰ 오늘 오후 2시 카를교 투어가 예정되어 있습니다. 늦지 마세요!", author: "박철수 가이드", urgentLevel: "urgent" }
            ]);
        }

        // --- 통계 및 순위 데이터 로드 ---
        await loadUserStats(userData.id);
        await loadTeamRanking(userData.team);

      } catch (error) {
        console.error('프로젝트 데이터 로드 오류:', error);
        toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const userSession = localStorage.getItem('userSession');
    if (!userSession) {
      // router.push('/'); // Next.js 라우터 대신 window.location 사용
      window.location.href = '/';
      return;
    }

    try {
      const userData = JSON.parse(userSession);
      if (isMounted) {
        setUser(userData);
        setProject(userData.currentProject);
      }
      loadProjectData(userData);
    } catch (error) {
      console.error('세션 로드 오류:', error);
      // router.push('/');
      window.location.href = '/';
    }

    return () => {
      isMounted = false;
    };
  }, [loadUserStats, loadTeamRanking]);

  const handleLogout = () => {
    localStorage.removeItem('userSession');
    toast.success('로그아웃 되었습니다.');
    // router.push('/');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-lg">데이터 로딩 중...</div>
      </div>
    );
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
              className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg transition-colors hover:bg-red-700"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* 상단: 공지사항 + 오늘의 활동 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            
            {/* 📢 공지사항 */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-4 border-b bg-yellow-50">
                <h2 className="flex items-center text-lg font-semibold text-yellow-800">
                  📢 최신 공지사항
                </h2>
              </div>
              <div className="p-4">
                {announcements.length > 0 ? (
                  <div className="space-y-3">
                    {announcements.slice(0, 2).map(announcement => (
                      <div key={announcement.id} className={`p-3 rounded-lg ${
                        announcement.urgentLevel === 'urgent' ? 'bg-red-50 border border-red-200' :
                        announcement.urgentLevel === 'important' ? 'bg-orange-50 border border-orange-200' :
                        'bg-blue-50 border border-blue-200'
                      }`}>
                        <div className="flex items-start justify-between mb-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            announcement.urgentLevel === 'urgent' ? 'bg-red-100 text-red-800' :
                            announcement.urgentLevel === 'important' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {announcement.urgentLevel === 'urgent' ? '🚨 긴급' :
                             announcement.urgentLevel === 'important' ? '⚠️ 중요' : '📢 일반'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(announcement.date)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800">{announcement.content}</p>
                        <p className="mt-1 text-xs text-gray-600">- {announcement.author}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <div className="mb-2 text-3xl">📭</div>
                    <p className="text-gray-600">새로운 공지사항이 없습니다</p>
                  </div>
                )}
              </div>
            </div>

            {/* 📅 오늘의 활동 */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-4 border-b bg-blue-50">
                <h2 className="flex items-center text-lg font-semibold text-blue-800">
                  📅 오늘의 활동
                </h2>
              </div>
              <div className="p-4">
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todaySchedules = schedules.filter(schedule => schedule.date === today);
                  
                  return todaySchedules.length > 0 ? (
                    <div className="space-y-3">
                      {todaySchedules.map((schedule) => (
                        <div 
                          key={schedule.id}
                          onClick={() => window.location.href = `/activity/${schedule.id}`}
                          className="p-3 border border-gray-200 rounded-lg cursor-pointer transition-shadow hover:shadow-md"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                              {schedule.time}
                            </div>
                            <span className="text-xs text-gray-500">📍 {schedule.location}</span>
                          </div>
                          <h3 className="font-semibold text-gray-900">{schedule.activityName}</h3>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="mb-2 text-3xl">🗓️</div>
                      <p className="text-gray-600">오늘 예정된 활동이 없습니다</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          
          {/* 🗺️ 빠른 링크 (Link -> a 태그로 변경) */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a href="/free-schedule" className="p-6 bg-white border-2 border-transparent rounded-lg shadow-md cursor-pointer transition-shadow hover:shadow-lg hover:border-green-300 block">
                  <div className="text-center">
                    <div className="mb-3 text-4xl">🗓️</div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">자유일정 관리</h3>
                    <p className="text-sm text-gray-600">자유시간 활동 계획하기</p>
                  </div>
              </a>
              
              <a href="/team-ranking" className="p-6 bg-white border-2 border-transparent rounded-lg shadow-md cursor-pointer transition-shadow hover:shadow-lg hover:border-purple-300 block">
                  <div className="text-center">
                    <div className="mb-3 text-4xl">📊</div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">팀별 순위</h3>
                    <p className="text-sm text-gray-600">실시간 참여도 랭킹</p>
                    
                    <div className="p-3 mt-3 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-800">
                        현재 {teamRanking.currentRank}위 / {teamRanking.totalTeams}팀
                      </div>
                      {teamRanking.pointsToNext > 0 && (
                        <div className="mt-1 text-sm text-purple-600">
                          상위팀과 {teamRanking.pointsToNext}점 차이
                        </div>
                      )}
                      {teamRanking.currentRank === 1 && (
                        <div className="mt-1 text-sm text-purple-600">
                          🏆 현재 1위! 
                        </div>
                      )}
                    </div>
                  </div>
              </a>
            </div>
          </div>

          {/* 참여 현황 카드 */}
          <div className="mb-6">
            <div className="p-6 text-white rounded-lg shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600">
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center text-xl font-semibold">
                  🌟 {user?.name}님의 참여 현황
                </h2>
                <button
                  onClick={() => {
                    loadUserStats(user?.id);
                    loadTeamRanking(user?.team);
                  }}
                  className="px-3 py-1 text-sm bg-white rounded-full bg-opacity-20 transition-all hover:bg-opacity-30"
                >
                  🔄 새로고침
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 text-center bg-white rounded-lg bg-opacity-10">
                  <div className="text-3xl font-bold">{userStats.photos}</div>
                  <div className="text-sm opacity-90">📸 사진</div>
                </div>
                <div className="p-3 text-center bg-white rounded-lg bg-opacity-10">
                  <div className="text-3xl font-bold">{userStats.comments}</div>
                  <div className="text-sm opacity-90">💬 댓글</div>
                </div>
                <div className="p-3 text-center bg-white rounded-lg bg-opacity-10">
                  <div className="text-3xl font-bold">{userStats.reactions}</div>
                  <div className="text-sm opacity-90">👍 반응</div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium opacity-95">{getMotivationMessage()}</p>
                {teamRanking.motivationMessage && (
                  <p className="p-2 mt-2 text-sm bg-white rounded-lg opacity-90 bg-opacity-20">
                    💡 {teamRanking.motivationMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 연수 일정 */}
          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              📅 연수 일정
            </h2>
            <div className="grid gap-4">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="p-6 bg-white border border-gray-200 rounded-lg shadow-md cursor-pointer transition-shadow hover:shadow-lg"
                  onClick={() => {
                    if (schedule.type === 'free') {
                      window.location.href = `/free-schedule`;
                    } else {
                      window.location.href = `/activity/${schedule.id}`;
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2 space-x-3">
                        <div className={`px-3 py-1 text-sm font-medium rounded-full ${
                          schedule.type === 'free'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {formatDate(schedule.date)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {schedule.time}
                        </div>
                        {schedule.type === 'free' && (
                          <span className="px-2 py-1 text-xs text-green-800 bg-green-100 rounded-full">
                            🗓️ 자유일정
                          </span>
                        )}
                      </div>
                      <h3 className="mb-2 text-xl font-semibold text-gray-900">
                        {schedule.activityName}
                      </h3>
                      <p className="flex items-center text-gray-600">
                        📍 {schedule.location}
                      </p>
                      {schedule.adminNotes && (
                        <p className="mt-2 text-sm text-blue-600">
                          💡 {schedule.adminNotes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                       <div className="text-sm text-gray-500">
                        클릭하여 보기 →
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 