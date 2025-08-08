import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

export default function AnnouncementsTab({ announcements, schedules, formatDate }) {
  const router = useRouter();
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userRegion, setUserRegion] = useState('');
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [announcementFilter, setAnnouncementFilter] = useState('all'); // all, urgent, important, normal

  // 장소 간 이동시간 계산 함수
  const calculateTravelTime = (fromLocation, toLocation) => {
    if (!fromLocation || !toLocation || fromLocation === toLocation) {
      return null;
    }

    // 프라하 주요 장소 간 이동시간 (버스 기준, 분 단위)
    const travelTimes = {
      '프라하 성': {
        '카를교': 15,
        '프라하 국립박물관': 20,
        '프라하 제1고등학교': 25,
        '프라하 교육청': 20,
        '체코 국립도서관': 18,
        '프라하 제15중학교': 30,
        '올드타운 스퀘어': 12,
        '바츨라프 광장': 22
      },
      '카를교': {
        '프라하 성': 15,
        '프라하 국립박물관': 18,
        '프라하 제1고등학교': 12,
        '프라하 교육청': 15,
        '체코 국립도서관': 8,
        '프라하 제15중학교': 25,
        '올드타운 스퀘어': 5,
        '바츨라프 광장': 15
      },
      '프라하 국립박물관': {
        '프라하 성': 20,
        '카를교': 18,
        '프라하 제1고등학교': 25,
        '프라하 교육청': 22,
        '체코 국립도서관': 15,
        '프라하 제15중학교': 35,
        '올드타운 스퀘어': 12,
        '바츨라프 광장': 3
      },
      '프라하 제1고등학교': {
        '프라하 성': 25,
        '카를교': 12,
        '프라하 국립박물관': 25,
        '프라하 교육청': 8,
        '체코 국립도서관': 10,
        '프라하 제15중학교': 20,
        '올드타운 스퀘어': 8,
        '바츨라프 광장': 18
      },
      '프라하 교육청': {
        '프라하 성': 20,
        '카를교': 15,
        '프라하 국립박물관': 22,
        '프라하 제1고등학교': 8,
        '체코 국립도서관': 12,
        '프라하 제15중학교': 25,
        '올드타운 스퀘어': 5,
        '바츨라프 광장': 15
      },
      '체코 국립도서관': {
        '프라하 성': 18,
        '카를교': 8,
        '프라하 국립박물관': 15,
        '프라하 제1고등학교': 10,
        '프라하 교육청': 12,
        '프라하 제15중학교': 22,
        '올드타운 스퀘어': 3,
        '바츨라프 광장': 8
      }
    };

    // 정확한 매칭 시도
    if (travelTimes[fromLocation] && travelTimes[fromLocation][toLocation]) {
      return travelTimes[fromLocation][toLocation];
    }

    // 부분 매칭 시도
    for (const [from, destinations] of Object.entries(travelTimes)) {
      if (fromLocation.includes(from) || from.includes(fromLocation)) {
        for (const [to, time] of Object.entries(destinations)) {
          if (toLocation.includes(to) || to.includes(toLocation)) {
            return time;
          }
        }
      }
    }

    // 기본 이동시간 (프라하 시내 기준)
    return 20;
  };

  // 일정에 이동시간 정보 추가
  const addTravelTimes = (schedules) => {
    if (!schedules || schedules.length < 2) return schedules;

    const schedulesWithTravel = [];
    
    for (let i = 0; i < schedules.length; i++) {
      schedulesWithTravel.push(schedules[i]);
      
      // 마지막 일정이 아니고, 다음 일정과 다른 장소인 경우 이동시간 추가
      if (i < schedules.length - 1) {
        const currentSchedule = schedules[i];
        const nextSchedule = schedules[i + 1];
        
        // 식사나 자유시간이 아닌 경우에만 이동시간 계산
        const isCurrentMeal = currentSchedule.isMeal || 
                             currentSchedule.activity?.includes('조식') || 
                             currentSchedule.activity?.includes('중식') || 
                             currentSchedule.activity?.includes('석식');
        const isNextMeal = nextSchedule.isMeal || 
                          nextSchedule.activity?.includes('조식') || 
                          nextSchedule.activity?.includes('중식') || 
                          nextSchedule.activity?.includes('석식');
        
        if (!isCurrentMeal && !isNextMeal && 
            currentSchedule.location && nextSchedule.location &&
            currentSchedule.location !== nextSchedule.location) {
          
          const travelTime = calculateTravelTime(currentSchedule.location, nextSchedule.location);
          
          if (travelTime) {
            schedulesWithTravel.push({
              id: `travel-${currentSchedule.id}-${nextSchedule.id}`,
              date: currentSchedule.date,
              time: currentSchedule.time, // 실제로는 이전 일정 종료 시간 + 이동시간
              activity: '이동',
              location: `${currentSchedule.location} → ${nextSchedule.location}`,
              description: `🚌 버스로 이동시간 ${travelTime}분 예상됩니다. (본 예상은 버스를 기준으로 계산하여 부정확할 수 있습니다.)`,
              isTravel: true,
              travelTime: travelTime,
              region: currentSchedule.region
            });
          }
        }
      }
    }
    
    return schedulesWithTravel;
  };

  useEffect(() => {
    // 사용자의 권역 정보 가져오기
    const getUserRegion = () => {
      // 1. userSession에서 권역 정보 가져오기
      const userSession = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
      if (userSession) {
        try {
          const sessionData = JSON.parse(userSession);
          if (sessionData.region) {
            // "2권역" 형태에서 숫자만 추출
            const regionMatch = sessionData.region.match(/(\d+)/);
            if (regionMatch) {
              return regionMatch[1];
            }
          }
        } catch (error) {
          console.error('세션 데이터 파싱 오류:', error);
        }
      }

      // 2. guideSession에서 권역 정보 가져오기
      const guideSession = localStorage.getItem('guideSession');
      if (guideSession) {
        try {
          const sessionData = JSON.parse(guideSession);
          if (sessionData.region) {
            const regionMatch = sessionData.region.match(/(\d+)/);
            if (regionMatch) {
              return regionMatch[1];
            }
          }
        } catch (error) {
          console.error('가이드 세션 데이터 파싱 오류:', error);
        }
      }

      // 3. 관리자의 마지막 선택 권역
      const lastAdminRegion = localStorage.getItem('lastAdminRegion');
      if (lastAdminRegion) {
        return lastAdminRegion;
      }

      // 4. 기본값
      return '1';
    };

    const region = getUserRegion();
    setUserRegion(region);
    loadTodaySchedules(region);
    
    // 공지사항 필터링 및 정렬
    if (announcements && announcements.length > 0) {
      let filtered = announcements.filter(announcement => {
        // 사용자 권역에 맞는 공지사항만 표시 (전체 공지사항도 포함)
        const isUserRegion = announcement.region === region || announcement.region === '전체' || announcement.region === 'all';
        
        // 필터 적용
        if (announcementFilter === 'all') return isUserRegion;
        if (announcementFilter === 'urgent') return isUserRegion && announcement.urgentLevel === 'urgent';
        if (announcementFilter === 'important') return isUserRegion && announcement.urgentLevel === 'important';
        if (announcementFilter === 'normal') return isUserRegion && (!announcement.urgentLevel || announcement.urgentLevel === 'normal');
        
        return isUserRegion;
      });
      
      // 최신순으로 정렬
      filtered.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      setFilteredAnnouncements(filtered);
    }
  }, [announcements, userRegion, announcementFilter]);

  const loadTodaySchedules = async (region) => {
    try {
      setLoading(true);
      const response = await fetch('/api/simple-schedules');
      const result = await response.json();

      if (result.success) {
        const today = new Date().toISOString().split('T')[0];
        // 오늘 날짜이면서 사용자 권역에 맞는 일정만 필터링
        let todaySchedules = result.schedules.filter(schedule => 
          schedule.date === today && schedule.region === region
        );

        // 시간대별로 일정 분류 및 추가 일정 생성
        const categorizedSchedules = categorizeSchedulesByTime(todaySchedules);

        // 자유시간 일정 추가 (매일 마지막에)
        const freeTimeSchedule = {
          id: `free-time-${today}-${region}`,
          date: today,
          time: '22:00',
          activity: '자유시간',
          location: '숙소',
          description: '개인 휴식 및 준비 시간',
          region: region,
          isFreeTime: true,
          timeCategory: 'evening'
        };

        // 자유시간이 이미 있는지 확인하고 없으면 추가
        const hasFreeTime = categorizedSchedules.some(schedule => 
          schedule.activity?.includes('자유시간') || schedule.isFreeTime
        );

        if (!hasFreeTime) {
          categorizedSchedules.push(freeTimeSchedule);
        }

        // 이동시간 정보 추가
        const schedulesWithTravel = addTravelTimes(categorizedSchedules);
        setTodaySchedules(schedulesWithTravel);
      }
    } catch (error) {
      console.error('오늘의 일정 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 시간대별로 일정 분류하는 함수
  const categorizeSchedulesByTime = (schedules) => {
    return schedules.map(schedule => {
      const time = schedule.time || '09:00';
      const hour = parseInt(time.split(':')[0]);
      
      let timeCategory = 'morning';
      if (hour >= 12 && hour < 18) {
        timeCategory = 'afternoon';
      } else if (hour >= 18) {
        timeCategory = 'evening';
      }
      
      return {
        ...schedule,
        timeCategory
      };
    });
  };

  // 시간대별 배경색과 아이콘
  const getTimeCategoryStyle = (timeCategory) => {
    switch (timeCategory) {
      case 'morning':
        return {
          bgColor: 'bg-gradient-to-r from-yellow-50 to-orange-50',
          borderColor: 'border-yellow-200',
          icon: '🌅',
          label: '오전'
        };
      case 'afternoon':
        return {
          bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
          borderColor: 'border-blue-200',
          icon: '🌞',
          label: '오후'
        };
      case 'evening':
        return {
          bgColor: 'bg-gradient-to-r from-purple-50 to-pink-50',
          borderColor: 'border-purple-200',
          icon: '🌙',
          label: '저녁'
        };
      default:
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: '📅',
          label: '일정'
        };
    }
  };

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case 'breakfast': return '🌅';
      case 'lunch': return '🌞';
      case 'dinner': return '🌙';
      default: return '🍽️';
    }
  };

  const getActivityIcon = (activity) => {
    if (activity?.includes('조식') || activity?.includes('아침')) return '🌅';
    if (activity?.includes('중식') || activity?.includes('점심')) return '🌞';
    if (activity?.includes('석식') || activity?.includes('저녁')) return '🌙';
    if (activity?.includes('관광') || activity?.includes('투어')) return '🗺️';
    if (activity?.includes('강의') || activity?.includes('수업')) return '📚';
    if (activity?.includes('실습') || activity?.includes('워크샵')) return '🔧';
    if (activity?.includes('휴식') || activity?.includes('자유')) return '😴';
    if (activity?.includes('이동') || activity?.includes('출발')) return '🚌';
    if (activity?.includes('도착') || activity?.includes('체크인')) return '🏨';
    return '📋';
  };

  const getScheduleTypeColor = (schedule) => {
    if (schedule.isTravel) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (schedule.isMeal) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (schedule.isFreeTime) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (schedule.activity?.includes('강의') || schedule.activity?.includes('수업')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (schedule.activity?.includes('실습') || schedule.activity?.includes('워크샵')) return 'bg-green-100 text-green-800 border-green-200';
    if (schedule.activity?.includes('관광') || schedule.activity?.includes('투어')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTodayString = () => {
    const today = new Date();
    return today.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const handleScheduleClick = (schedule) => {
    // 이동 일정은 클릭 불가
    if (schedule.isTravel) {
      toast.info('이동 시간입니다. 안전하게 이동하세요! 🚌');
      return;
    }

    // 식사 관련 일정인지 확인
    const isMeal = schedule.isMeal || 
                   schedule.activity?.includes('조식') || 
                   schedule.activity?.includes('중식') || 
                   schedule.activity?.includes('석식') ||
                   schedule.activity?.includes('아침') ||
                   schedule.activity?.includes('점심') ||
                   schedule.activity?.includes('저녁');

    // 학교/강의 관련 일정인지 확인
    const isSchoolActivity = schedule.activity?.includes('강의') || 
                            schedule.activity?.includes('수업') ||
                            schedule.activity?.includes('실습') ||
                            schedule.activity?.includes('워크샵');

    if (isMeal) {
      // 식사 갤러리로 이동
      router.push(`/gallery/meals?region=${userRegion}&date=${schedule.date}`);
    } else if (isSchoolActivity) {
      // 연수 일정 갤러리로 이동
      router.push(`/gallery/${schedule.date}?region=${userRegion}`);
    } else if (schedule.isFreeTime) {
      // 자유시간은 클릭 불가
      toast.info('자유시간입니다. 휴식을 취하세요! 😴');
    } else {
      // 기타 일정은 상세 페이지로
      router.push(`/activity/${schedule.id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* 공지사항 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b bg-gradient-to-r from-yellow-50 to-orange-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-yellow-800 flex items-center">
              📢 공지사항
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                {userRegion}권역
              </span>
              <select
                value={announcementFilter}
                onChange={(e) => setAnnouncementFilter(e.target.value)}
                className="px-3 py-1 border border-yellow-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="all">전체</option>
                <option value="urgent">🚨 긴급</option>
                <option value="important">⚠️ 중요</option>
                <option value="normal">📢 일반</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-4">
          {filteredAnnouncements && filteredAnnouncements.length > 0 ? (
            <div className="space-y-4">
              {filteredAnnouncements.map(announcement => (
                <div key={announcement.id} className={`p-4 rounded-lg border ${
                  announcement.urgentLevel === 'urgent' ? 'bg-red-50 border-red-200' :
                  announcement.urgentLevel === 'important' ? 'bg-orange-50 border-orange-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        announcement.urgentLevel === 'urgent' ? 'bg-red-100 text-red-800' :
                        announcement.urgentLevel === 'important' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {announcement.urgentLevel === 'urgent' ? '🚨 긴급' :
                         announcement.urgentLevel === 'important' ? '⚠️ 중요' : '📢 일반'}
                      </span>
                      {announcement.region && announcement.region !== '전체' && announcement.region !== 'all' && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {announcement.region}권역
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate ? formatDate(announcement.date || announcement.createdAt) : 
                       new Date(announcement.date || announcement.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  {announcement.title && announcement.title !== '공지사항' && (
                    <h3 className="font-semibold text-lg mb-2 text-gray-900">{announcement.title}</h3>
                  )}
                  <div className="text-gray-800 mb-3 leading-relaxed whitespace-pre-wrap">
                    {announcement.content}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">- {announcement.author || announcement.createdBy || '관리자'}</p>
                    {announcement.urgentLevel === 'urgent' && (
                      <span className="text-xs text-red-600 font-medium animate-pulse">즉시 확인 필요</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-gray-600 text-lg">
                {announcementFilter === 'all' ? '새로운 공지사항이 없습니다' : 
                 `${announcementFilter === 'urgent' ? '긴급' : 
                   announcementFilter === 'important' ? '중요' : '일반'} 공지사항이 없습니다`}
              </p>
              <p className="text-gray-500 mt-2">
                {announcementFilter === 'all' ? '모든 공지사항을 확인했습니다' : 
                 '다른 카테고리의 공지사항을 확인해보세요'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 오늘의 일정 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-blue-800 flex items-center">
              📅 오늘의 일정
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-600 font-medium">{getTodayString()}</span>
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {userRegion}권역
              </span>
              
              {/* 갤러리 버튼들 */}
              <button
                onClick={() => router.push(`/gallery/meals?region=${userRegion}&date=${new Date().toISOString().split('T')[0]}`)}
                className="px-3 py-1 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition-colors"
              >
                🍽️ 식사 갤러리
              </button>
              
              <button
                onClick={() => router.push(`/activity/${todaySchedules.find(s => !s.isMeal && !s.isTravel && !s.isFreeTime)?.id || '1'}`)}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
              >
                📅 연수 일정 갤러리
              </button>
              
              <button
                onClick={() => loadTodaySchedules(userRegion)}
                className="px-3 py-1 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                🔄 새로고침
              </button>
            </div>
          </div>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">오늘의 일정을 불러오는 중...</span>
            </div>
          ) : todaySchedules.length > 0 ? (
            <div className="space-y-6">
              {/* 시간대별로 일정 그룹화 */}
              {(() => {
                const groupedSchedules = todaySchedules.reduce((groups, schedule) => {
                  const category = schedule.timeCategory || 'morning';
                  if (!groups[category]) {
                    groups[category] = [];
                  }
                  groups[category].push(schedule);
                  return groups;
                }, {});

                // 시간대 순서 정의
                const timeOrder = ['morning', 'afternoon', 'evening'];
                
                return timeOrder.map(category => {
                  const schedules = groupedSchedules[category];
                  if (!schedules || schedules.length === 0) return null;
                  
                  const style = getTimeCategoryStyle(category);
                  
                  return (
                    <div key={category} className={`rounded-lg border ${style.borderColor} ${style.bgColor} p-4`}>
                      <div className="flex items-center mb-4">
                        <span className="text-2xl mr-2">{style.icon}</span>
                        <h3 className="text-lg font-semibold text-gray-800">{style.label} 일정</h3>
                        <span className="ml-auto text-sm text-gray-600">
                          {schedules.length}개 일정
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {schedules
                          .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'))
                          .map((schedule) => (
                            <div 
                              key={schedule.id}
                              className={`p-4 border rounded-lg hover:shadow-md transition-all bg-white ${getScheduleTypeColor(schedule)}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">
                                    {schedule.isTravel ? '🚌' :
                                     schedule.isMeal ? getMealIcon(schedule.mealType) : 
                                     schedule.isFreeTime ? '😴' : getActivityIcon(schedule.activity)}
                                  </span>
                                  <div className="bg-white bg-opacity-80 px-3 py-1 rounded-full text-sm font-medium">
                                    ⏰ {schedule.time}
                                  </div>
                                  {schedule.isTravel && (
                                    <div className="bg-yellow-200 bg-opacity-80 px-3 py-1 rounded-full text-sm font-medium">
                                      ⏱️ {schedule.travelTime}분
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* 식사 갤러리 버튼 */}
                                  {schedule.isMeal && (
                                    <button
                                      onClick={() => router.push(`/gallery/meals?region=${userRegion}`)}
                                      className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded hover:bg-orange-200 transition-colors"
                                    >
                                      🍽️ 식사 갤러리
                                    </button>
                                  )}
                                  
                                  {/* 이동 일정 표시 */}
                                  {schedule.isTravel && (
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                      🚌 이동
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div 
                                onClick={() => handleScheduleClick(schedule)}
                                className="cursor-pointer"
                              >
                                <h3 className="font-semibold text-lg mb-2">{schedule.activity}</h3>
                                {schedule.location && (
                                  <p className="text-sm mb-2">📍 {schedule.location}</p>
                                )}
                                {schedule.description && (
                                  <p className="text-sm opacity-80">{schedule.description}</p>
                                )}
                                {schedule.isFreeTime && (
                                  <p className="text-xs text-purple-600 mt-2">💡 클릭하면 휴식 안내를 받을 수 있습니다</p>
                                )}
                                {schedule.isTravel && (
                                  <p className="text-xs text-yellow-600 mt-2">💡 클릭하면 이동 안내를 받을 수 있습니다</p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🗓️</div>
              <p className="text-gray-600 text-lg">오늘 예정된 활동이 없습니다</p>
              <p className="text-gray-500 mt-2">{userRegion}권역의 오늘 일정이 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 