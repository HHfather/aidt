import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { db } from '../../firebaseConfig';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc } from 'firebase/firestore';

export default function GuideDashboard() {
  const router = useRouter();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('announcements');
  
  // 상태 변수들을 관리자 페이지와 유사하게 재구성
  const [schedules, setSchedules] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', regions: [] });
  const [attendance, setAttendance] = useState({});
  
  const regions = ['1','2','3','4','5','6','7','8','9','10'];

  // 세션 확인 및 데이터 로딩 useEffect
  useEffect(() => {
    const session = localStorage.getItem('guideSession');
    if (!session) {
      toast.error('로그인이 필요합니다.');
      router.push('/guide/login');
      return;
    }
    
    try {
      const userData = JSON.parse(session);
      if (!userData.isGuide) {
        toast.error('가이드 권한이 필요합니다.');
        router.push('/');
        return;
      }
      setGuide(userData);
    } catch (error) {
      toast.error('세션 정보를 처리하는 중 오류가 발생했습니다.');
      localStorage.removeItem('guideSession');
      router.push('/guide/login');
    }
  }, [router]);

  // 가이드 정보가 설정되면 데이터 로딩 시작
  useEffect(() => {
    if (guide) {
      setLoading(true);
      Promise.all([
        loadSchedulesAndParticipants(guide.region),
        loadAnnouncements()
      ]).finally(() => setLoading(false));
    }
  }, [guide]);

  // 출석 상태 저장 useEffect
  useEffect(() => {
    if (guide?.region) {
      localStorage.setItem(`attendance_${guide.region}`, JSON.stringify(attendance));
    }
  }, [attendance, guide?.region]);

  // 관리자 페이지의 일정/참가자 로딩 로직을 가져와 가이드에 맞게 수정
  const loadSchedulesAndParticipants = async (region) => {
    try {
      // 숫자만 추출하여 API 호출
      const regionNumber = region.replace(/[^0-9]/g, '');
      const response = await fetch(`/api/schedule-management?region=${regionNumber}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // 일정 데이터 처리
        let scheduleData = [];
        if (result.data.activities) {
          Object.entries(result.data.activities).forEach(([date, activities]) => {
            if (Array.isArray(activities)) {
              activities.forEach((activity, index) => {
                scheduleData.push({
                  id: `${date}_${index}`,
                  date,
                  ...activity
                });
              });
            }
          });
          scheduleData.sort((a, b) => new Date(a.date) - new Date(b.date) || a.time.localeCompare(b.time));
          setSchedules(scheduleData);
        }

        // 참가자 데이터 처리
        let participantData = [];
        if (result.data.participants && Array.isArray(result.data.participants)) {
            participantData = result.data.participants.map((p, index) => ({
                id: `${result.data.id}_participant_${index}`,
                ...p
            })).sort((a, b) => a.name.localeCompare(b.name));
        }
        setParticipants(participantData);

        // 출석 상태 초기화
        const savedAttendance = JSON.parse(localStorage.getItem(`attendance_${region}`) || '{}');
        const initialAttendance = {};
        participantData.forEach(p => {
          initialAttendance[p.id] = savedAttendance[p.id] || false;
        });
        setAttendance(initialAttendance);

      } else {
        toast.error('일정 및 참가자 정보 로딩에 실패했습니다.');
        setSchedules([]);
        setParticipants([]);
      }
    } catch (error) {
      console.error('일정 및 참가자 로드 오류:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
      setSchedules([]);
      setParticipants([]);
    }
  };

  // 관리자 페이지의 공지사항 로딩 로직
  const loadAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements-public');
      const result = await response.json();
      if (result.success) {
        setAnnouncements(result.data);
      } else {
        toast.error('공지사항을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('공지사항 로드 오류:', error);
      toast.error('공지사항을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 관리자 페이지의 공지사항 추가 로직
  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      return toast.error('제목과 내용을 모두 입력해주세요.');
    }
    if (newAnnouncement.regions.length === 0) {
      return toast.error('공지할 권역을 하나 이상 선택해주세요.');
    }

    const loadingToast = toast.loading(`[0/${newAnnouncement.regions.length}] 공지 등록 중...`);

    try {
      let successCount = 0;
      for (const region of newAnnouncement.regions) {
        const response = await fetch('/api/announcements-public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newAnnouncement.title,
            content: newAnnouncement.content,
            author: guide.name,
            region: `${region}권역`, // API가 "N권역" 형식을 기대할 수 있으므로 맞춰줌
          }),
        });

        if (response.ok) {
          successCount++;
          toast.loading(`[${successCount}/${newAnnouncement.regions.length}] 공지 등록 중...`, { id: loadingToast });
        }
      }

      toast.success(`${successCount}개 권역에 공지사항 등록 완료!`, { id: loadingToast });
      setNewAnnouncement({ title: '', content: '', regions: [] });
      await loadAnnouncements();

    } catch (error) {
      toast.error('공지사항 등록 중 오류가 발생했습니다.', { id: loadingToast });
    }
  };

  // 관리자 페이지의 공지사항 삭제 로직
  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) return;
    try {
      const response = await fetch(`/api/announcements-public?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        toast.success('공지사항이 삭제되었습니다.');
        await loadAnnouncements();
      } else {
        toast.error(result.error || '공지사항 삭제에 실패했습니다.');
      }
    } catch (error) {
      toast.error('공지사항 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleRegionChange = (region) => {
    setNewAnnouncement(prevState => {
      const regions = prevState.regions.includes(region)
        ? prevState.regions.filter(r => r !== region)
        : [...prevState.regions, region];
      return { ...prevState, regions };
    });
  };

  const handleSelectAllRegions = (e) => {
    if (e.target.checked) {
      setNewAnnouncement(prevState => ({ ...prevState, regions: regions }));
    } else {
      setNewAnnouncement(prevState => ({ ...prevState, regions: [] }));
    }
  };
  
  const toggleAttendance = (participantId) => {
    setAttendance(prev => ({
      ...prev,
      [participantId]: !prev[participantId]
    }));
  };
  
  const handleLogout = () => {
    localStorage.removeItem('guideSession');
    toast.success('로그아웃 되었습니다.');
    router.push('/guide/login');
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${month}월 ${day}일 (${weekday})`;
  };

  if (loading || !guide) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 참가자를 출석 상태에 따라 정렬 (출석 안한 사람이 위로)
  const sortedParticipants = [...participants].sort((a, b) => {
      const aAttended = attendance[a.id] || false;
      const bAttended = attendance[b.id] || false;
      return aAttended - bAttended;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center py-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🧭 가이드 대시보드({guide.region})</h1>
            <p className="text-gray-600">{guide.name} 가이드님</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => router.push('/')} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">홈으로</button>
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">로그아웃</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8 flex space-x-2">
          {['announcements', 'schedule', 'participants'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`px-4 py-2 rounded-lg font-semibold ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {tab === 'announcements' && '📢 공지사항'}
              {tab === 'schedule' && '📅 일정확인'}
              {tab === 'participants' && '👥 참가자관리'}
            </button>
          ))}
        </div>

        {activeTab === 'announcements' && (
          <section>
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h3 className="text-lg font-semibold mb-4">📋 공지사항 목록</h3>
              <div className="space-y-3">
                {announcements.length > 0 ? announcements.map(a => (
                  <div key={a.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{a.title}</h4>
                        <p className="text-sm text-gray-500">{new Date(a.createdAt).toLocaleString()} by {a.author}</p>
                      </div>
                      <button onClick={() => handleDeleteAnnouncement(a.id)} className="text-red-500">삭제</button>
                    </div>
                    <p className="mt-2 text-gray-700">{a.content}</p>
                  </div>
                )) : <p>등록된 공지사항이 없습니다.</p>}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">📝 공지사항 등록</h3>
              <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
                  {/* 권역 선택 */}
                  <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">대상 권역</label>
                      <div className="flex items-center mb-2">
                          <input 
                              type="checkbox" 
                              id="all-regions-guide" 
                              onChange={handleSelectAllRegions}
                              checked={newAnnouncement.regions.length === regions.length}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="all-regions-guide" className="ml-2 block text-sm text-gray-900">
                              전체 선택
                          </label>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-4 border rounded-md bg-gray-50">
                          {regions.map(region => (
                              <div key={region} className="flex items-center">
                                  <input 
                                      type="checkbox" 
                                      id={`guide-region-${region}`} 
                                      value={region} 
                                      onChange={() => handleRegionChange(region)}
                                      checked={newAnnouncement.regions.includes(region)}
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <label htmlFor={`guide-region-${region}`} className="ml-2 block text-sm text-gray-900">
                                      {region}권역
                                  </label>
                              </div>
                          ))}
                      </div>
                  </div>
                <input type="text" placeholder="제목" value={newAnnouncement.title} onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} className="w-full border px-3 py-2 rounded-lg" />
                <textarea placeholder="내용" value={newAnnouncement.content} onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} rows={4} className="w-full border px-3 py-2 rounded-lg" />
                <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded-lg">등록</button>
              </form>
            </div>
          </section>
        )}

        {activeTab === 'schedule' && (
          <section>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">연수 일정</h2>
              <div className="space-y-6">
                {Object.entries(
                  schedules.reduce((acc, s) => {
                    if (!acc[s.date]) acc[s.date] = [];
                    acc[s.date].push(s);
                    return acc;
                  }, {})
                ).map(([date, activities]) => (
                  <div key={date} className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">{formatDate(date)}</h3>
                    <div className="space-y-3">
                      {activities.map(activity => (
                        <div key={activity.id} className="border-l-4 border-green-500 pl-4">
                          <p className="font-semibold">{activity.time} - {activity.activity}</p>
                          <p className="text-sm text-gray-600">{activity.location}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'participants' && (
            <section>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-blue-600">{participants.length}</div>
                                <div className="text-sm">총 참가자</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-600">{Object.values(attendance).filter(Boolean).length}</div>
                                <div className="text-sm">출석</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-red-600">{participants.length - Object.values(attendance).filter(Boolean).length}</div>
                                <div className="text-sm">부재</div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {sortedParticipants.map((participant) => (
                            <div
                                key={participant.id}
                                onClick={() => toggleAttendance(participant.id)}
                                className={`p-4 rounded-lg border-2 text-center cursor-pointer ${attendance[participant.id] ? 'border-green-300 bg-green-100' : 'border-gray-300 bg-white'}`}
                            >
                                <div className="font-bold">{participant.name}</div>
                                <p className="text-xs text-gray-500 mb-2">{participant.affiliation}</p>
                                <div className={`py-1 px-3 rounded-full text-sm ${attendance[participant.id] ? 'bg-green-500 text-white' : 'bg-gray-300'}`}>
                                    {attendance[participant.id] ? '출석' : '부재'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )}
      </main>
    </div>
  );
}
