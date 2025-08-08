import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

export default function ScheduleTab({ projectId }) {
  const router = useRouter();
  const [schedules, setSchedules] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [schedulesByRegion, setSchedulesByRegion] = useState({});
  const [schedulesByRegionAndDate, setSchedulesByRegionAndDate] = useState({});
  const [allSchedulesByDate, setAllSchedulesByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('byDate'); // 'all', 'byRegion', 'byDate' - 기본값을 날짜별로 변경
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [userRegion, setUserRegion] = useState(null);

  useEffect(() => {
    // 사용자 권역 정보 가져오기
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
    setSelectedRegion(region); // 기본값을 사용자 권역으로 설정
    loadAllSchedules();
  }, []);

  const loadAllSchedules = async () => {
    try {
      setLoading(true);
      // 간단한 API 사용 (인덱스 없이도 작동)
      const response = await fetch('/api/simple-schedules');
      const result = await response.json();

      if (result.success) {
        // 자유일정 추가
        const schedulesWithFreeTime = addFreeTimeSchedules(result.schedules);
        
        setSchedules(schedulesWithFreeTime);
        setAllSchedules(schedulesWithFreeTime);
        
        // 권역별, 날짜별 그룹화 업데이트
        const updatedSchedulesByRegion = {};
        const updatedSchedulesByDate = {};
        const updatedSchedulesByRegionAndDate = {};
        
        schedulesWithFreeTime.forEach(schedule => {
          // 권역별 그룹화
          if (!updatedSchedulesByRegion[schedule.region]) {
            updatedSchedulesByRegion[schedule.region] = [];
          }
          updatedSchedulesByRegion[schedule.region].push(schedule);
          
          // 날짜별 그룹화
          if (!updatedSchedulesByDate[schedule.date]) {
            updatedSchedulesByDate[schedule.date] = [];
          }
          updatedSchedulesByDate[schedule.date].push(schedule);
          
          // 권역별 날짜별 그룹화
          if (!updatedSchedulesByRegionAndDate[schedule.region]) {
            updatedSchedulesByRegionAndDate[schedule.region] = {};
          }
          if (!updatedSchedulesByRegionAndDate[schedule.region][schedule.date]) {
            updatedSchedulesByRegionAndDate[schedule.region][schedule.date] = [];
          }
          updatedSchedulesByRegionAndDate[schedule.region][schedule.date].push(schedule);
        });
        
        setSchedulesByRegion(updatedSchedulesByRegion);
        setSchedulesByRegionAndDate(updatedSchedulesByRegionAndDate);
        setAllSchedulesByDate(updatedSchedulesByDate);
        
        toast.success(`${schedulesWithFreeTime.length}개 일정을 불러왔습니다.`);
      } else {
        toast.error('일정을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('일정 로드 오류:', error);
      toast.error('일정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 자유일정 추가 함수
  const addFreeTimeSchedules = (schedules) => {
    if (!schedules || schedules.length === 0) return schedules;
    
    const schedulesWithFreeTime = [...schedules];
    const dates = [...new Set(schedules.map(s => s.date))].sort();
    
    // 각 권역별로 자유일정 추가
    const regions = [...new Set(schedules.map(s => s.region))];
    
    regions.forEach(region => {
      dates.forEach(date => {
        // 해당 날짜에 자유일정이 이미 있는지 확인
        const hasFreeTime = schedulesWithFreeTime.some(s => 
          s.date === date && s.region === region && 
          (s.activity?.includes('자유') || s.activity?.includes('자율') || s.isFreeTime)
        );
        
        // 공항 출발일인지 확인 (간단한 로직)
        const isDepartureDay = schedulesWithFreeTime.some(s => 
          s.date === date && s.region === region && 
          (s.activity?.includes('공항') || s.activity?.includes('출발') || s.activity?.includes('귀국'))
        );
        
        if (!hasFreeTime && !isDepartureDay) {
          // 해당 날짜의 마지막 일정 시간 확인
          const daySchedules = schedulesWithFreeTime.filter(s => 
            s.date === date && s.region === region
          );
          
          let freeTimeStart = '22:00'; // 기본값
          if (daySchedules.length > 0) {
            // 가장 늦은 시간 + 1시간 후
            const latestTime = daySchedules.reduce((latest, s) => {
              const time = s.time || '00:00';
              return time > latest ? time : latest;
            }, '00:00');
            
            // 시간 계산 (간단한 로직)
            const [hour, minute] = latestTime.split(':').map(Number);
            const newHour = Math.min(22, hour + 1);
            freeTimeStart = `${newHour.toString().padStart(2, '0')}:00`;
          }
          
          const freeTimeSchedule = {
            id: `free_time_${date}_${region}`,
            date: date,
            time: freeTimeStart,
            activity: '🗓️ 자율일정',
            location: '자유 선택',
            description: '개인 또는 팀별로 자유롭게 계획할 수 있는 시간입니다.',
            region: region,
            isFreeTime: true,
            type: 'free_time'
          };
          
          schedulesWithFreeTime.push(freeTimeSchedule);
        }
      });
    });
    
    // 날짜순, 시간순으로 재정렬
    return schedulesWithFreeTime.sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const getRegionColor = (region) => {
    const colors = {
      '1': 'bg-red-100 text-red-800',
      '2': 'bg-blue-100 text-blue-800',
      '3': 'bg-green-100 text-green-800',
      '4': 'bg-yellow-100 text-yellow-800',
      '5': 'bg-purple-100 text-purple-800',
      '6': 'bg-pink-100 text-pink-800',
      '7': 'bg-indigo-100 text-indigo-800',
      '8': 'bg-gray-100 text-gray-800',
      '9': 'bg-orange-100 text-orange-800',
      '10': 'bg-teal-100 text-teal-800'
    };
    return colors[region] || 'bg-gray-100 text-gray-800';
  };

  const handleScheduleClick = (schedule) => {
    // 일정 타입에 따라 다른 갤러리로 이동
    if (schedule.isFreeTime) {
      // 자유시간 갤러리
      router.push(`/free-time-gallery/${schedule.id}`);
    } else if (schedule.isMeal) {
      // 식사 갤러리 (새로운 링크)
      router.push(`/gallery/meals?region=${schedule.region}&date=${schedule.date}`);
    } else {
      // 연수 일정 갤러리
      router.push(`/activity/${schedule.id}`);
    }
  };

  const filterSchedules = (schedules) => {
    let filtered = schedules;
    
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(schedule => schedule.region === selectedRegion);
    }
    
    if (selectedDate !== 'all') {
      filtered = filtered.filter(schedule => schedule.date === selectedDate);
    }
    
    return filtered;
  };

  const renderScheduleCard = (schedule) => (
    <div 
      key={schedule.id}
      className={`bg-white rounded-lg shadow-md p-4 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 border-l-4 ${
        schedule.isFreeTime ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-white' :
        schedule.isMeal ? 'border-orange-500 bg-gradient-to-r from-orange-50 to-white' :
        'border-blue-500 bg-gradient-to-r from-blue-50 to-white'
      } relative group`}
      onClick={() => handleScheduleClick(schedule)}
    >
      {/* 클릭 유도 오버레이 */}
      <div className="absolute inset-0 bg-blue-500 bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-300 rounded-lg"></div>
      
      {/* 클릭 힌트 */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-blue-600 text-sm font-medium">👆 클릭</span>
      </div>
      
      <div className="flex items-start justify-between mb-2 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            {schedule.isFreeTime ? '🗓️' :
             schedule.isMeal ? getMealIcon(schedule.mealType) : getActivityIcon(schedule.activity)}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRegionColor(schedule.region)}`}>
            {schedule.region}권역
          </span>
          {schedule.isFreeTime && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              자율일정
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">{schedule.time}</div>
          <div className="text-xs text-gray-500">{formatDate(schedule.date)}</div>
        </div>
      </div>
      
      <h3 className="font-semibold text-lg mb-2 text-gray-900 relative z-10">{schedule.activity}</h3>
      
      {schedule.location && (
        <p className="text-sm text-gray-600 mb-1 relative z-10">📍 {schedule.location}</p>
      )}
      
      {schedule.description && (
        <p className="text-sm text-gray-500 relative z-10">{schedule.description}</p>
      )}
      
      {/* 하단 액션 힌트 */}
      <div className="mt-3 pt-3 border-t border-gray-100 relative z-10">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {schedule.isFreeTime ? '🎯 자유시간 갤러리' : 
             schedule.isMeal ? '🍽️ 식사 갤러리' : '📅 연수 갤러리'}
          </span>
          <span className="group-hover:text-blue-600 transition-colors">→</span>
        </div>
      </div>
    </div>
  );

  const renderAllSchedules = () => {
    const filteredSchedules = filterSchedules(allSchedules);
    
    if (filteredSchedules.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-gray-600">선택한 조건에 맞는 일정이 없습니다</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSchedules.map(renderScheduleCard)}
      </div>
    );
  };

  const renderByRegion = () => {
    if (!schedulesByRegion || Object.keys(schedulesByRegion).length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🏢</div>
          <p className="text-gray-600">권역별 일정 데이터가 없습니다</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {Object.keys(schedulesByRegion).map(region => {
          const regionSchedules = schedulesByRegion[region];
          const filteredSchedules = selectedDate !== 'all' 
            ? regionSchedules.filter(schedule => schedule.date === selectedDate)
            : regionSchedules;

          if (filteredSchedules.length === 0) return null;

          return (
            <div key={region} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold px-3 py-1 rounded-full ${getRegionColor(region)}`}>
                  {region}권역 ({filteredSchedules.length}개 일정)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSchedules.map(renderScheduleCard)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderByDate = () => {
    if (!allSchedulesByDate || Object.keys(allSchedulesByDate).length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📅</div>
          <p className="text-gray-600">날짜별 일정 데이터가 없습니다</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {Object.keys(allSchedulesByDate).sort().map(date => {
          const dateSchedules = allSchedulesByDate[date];
          const filteredSchedules = selectedRegion !== 'all' 
            ? dateSchedules.filter(schedule => schedule.region === selectedRegion)
            : dateSchedules;

          if (filteredSchedules.length === 0) return null;

          return (
            <div key={date} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {formatDate(date)} ({filteredSchedules.length}개 일정)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSchedules.map(renderScheduleCard)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 필터 컨트롤 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">보기 모드</label>
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">전체 일정</option>
              <option value="byRegion">권역별 보기</option>
              <option value="byDate">날짜별 보기</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">권역 선택</label>
            <select 
              value={selectedRegion} 
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 권역</option>
              {userRegion && (
                <option value={userRegion} className="font-semibold">
                  {userRegion}권역 (내 권역)
                </option>
              )}
              {schedulesByRegion && Object.keys(schedulesByRegion).sort().map(region => (
                <option key={region} value={region}>{region}권역</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜 선택</label>
            <select 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">모든 날짜</option>
              {allSchedulesByDate && Object.keys(allSchedulesByDate).sort().map(date => (
                <option key={date} value={date}>{formatDate(date)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadAllSchedules}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              🔄 새로고침
            </button>
          </div>
        </div>

        {userRegion && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 현재 <strong>{userRegion}권역</strong>으로 설정되어 있습니다. 
              다른 권역의 일정도 확인하려면 권역 선택에서 변경하세요.
            </p>
          </div>
        )}
      </div>

      {/* 일정 표시 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">일정을 불러오는 중...</span>
          </div>
        ) : (
          <>
            {viewMode === 'all' && renderAllSchedules()}
            {viewMode === 'byRegion' && renderByRegion()}
            {viewMode === 'byDate' && renderByDate()}
          </>
        )}
      </div>
    </div>
  );
} 