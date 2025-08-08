import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

export default function AllSchedules() {
  const router = useRouter();
  const [schedules, setSchedules] = useState([]);
  const [schedulesByRegion, setSchedulesByRegion] = useState({});
  const [schedulesByRegionAndDate, setSchedulesByRegionAndDate] = useState({});
  const [allSchedulesByDate, setAllSchedulesByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'byRegion', 'byDate'
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');

  useEffect(() => {
    loadAllSchedules();
  }, []);

  const loadAllSchedules = async () => {
    try {
      setLoading(true);
      // 먼저 인덱스 활용 API 시도
      let response = await fetch('/api/schedules-with-index');
      let result = await response.json();
      
      // 인덱스 API가 실패하면 기본 API 사용
      if (!result.success) {
        console.log('인덱스 API 실패, 기본 API 사용');
        response = await fetch('/api/all-schedules');
        result = await response.json();
      }

      if (result.success) {
        setSchedules(result.schedules);
        setSchedulesByRegion(result.schedulesByRegion);
        setSchedulesByRegionAndDate(result.schedulesByRegionAndDate);
        setAllSchedulesByDate(result.allSchedulesByDate);
        toast.success(`${result.totalSchedules}개 일정을 불러왔습니다.`);
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

  const renderScheduleCard = (schedule) => (
    <div key={schedule.id} className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
      schedule.isMeal ? 'border-orange-400' : 'border-blue-400'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">
              {schedule.isMeal ? getMealIcon(schedule.mealType) : getActivityIcon(schedule.activity)}
            </span>
            <h3 className="font-semibold text-gray-800">{schedule.activity}</h3>
            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {schedule.region}권역
            </span>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            <span className="font-medium">⏰ {schedule.time}</span>
            {schedule.location && (
              <span className="ml-4 font-medium">📍 {schedule.location}</span>
            )}
          </div>
          {schedule.description && (
            <p className="text-gray-700 text-sm mb-2">{schedule.description}</p>
          )}
          {schedule.details && schedule.details.length > 0 && (
            <div className="text-xs text-gray-500">
              <ul className="list-disc list-inside">
                {schedule.details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAllSchedules = () => (
    <div className="space-y-6">
      {Object.keys(allSchedulesByDate).sort().map(date => (
        <div key={date} className="bg-gray-50 rounded-lg p-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            📅 {formatDate(date)}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allSchedulesByDate[date].map(schedule => renderScheduleCard(schedule))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderByRegion = () => (
    <div className="space-y-8">
      {Object.keys(schedulesByRegionAndDate).sort().map(region => (
        <div key={region} className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
            🏢 {region}권역 일정
          </h2>
          {Object.keys(schedulesByRegionAndDate[region]).sort().map(date => (
            <div key={date} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                📅 {formatDate(date)}
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {schedulesByRegionAndDate[region][date].map(schedule => renderScheduleCard(schedule))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderByDate = () => (
    <div className="space-y-6">
      {Object.keys(allSchedulesByDate).sort().map(date => (
        <div key={date} className="bg-gray-50 rounded-lg p-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            📅 {formatDate(date)}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allSchedulesByDate[date].map(schedule => renderScheduleCard(schedule))}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">전체 일정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                📋 전체 연수 일정
              </h1>
              <p className="text-gray-600">
                총 {schedules.length}개 일정, {Object.keys(schedulesByRegion).length}개 권역
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                ← 돌아가기
              </button>
              <button
                onClick={loadAllSchedules}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                🔄 새로고침
              </button>
            </div>
          </div>
        </div>

        {/* 뷰 모드 선택 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📅 전체 일정
            </button>
            <button
              onClick={() => setViewMode('byRegion')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'byRegion' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🏢 권역별 보기
            </button>
            <button
              onClick={() => setViewMode('byDate')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'byDate' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📆 날짜별 보기
            </button>
          </div>
        </div>

        {/* 일정 표시 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {viewMode === 'all' && renderAllSchedules()}
          {viewMode === 'byRegion' && renderByRegion()}
          {viewMode === 'byDate' && renderByDate()}
        </div>
      </div>
    </div>
  );
} 