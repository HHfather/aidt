import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { announcementOperations, participantOperations } from '../../utils/firebaseOperations';
import { initializeFirebaseData } from '../../utils/initializeFirebase';

const regions = ['1','2','3','4','5','6','7','8','9','10'];

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState('announcements');
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // 공지사항
  const [regionAnnouncements, setRegionAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    regions: [],
    urgentLevel: 'normal',
  });

  // 참가자
  const [participants, setParticipants] = useState([]);
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    affiliation: '',
    position: '',
    phone: '',
    email: ''
  });
  
  // 참가자 수정 모달
  const [editParticipant, setEditParticipant] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // 일정 관리
  const [schedules, setSchedules] = useState([]);
  const [newSchedule, setNewSchedule] = useState({
    date: '',
    time: '',
    activity: '',
    location: ''
  });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('1');
  // 피드백 관리
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackFilter, setFeedbackFilter] = useState({ category: 'all', status: 'open', region: 'all' });

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminSession') || localStorage.getItem('adminSession');
    if (!adminData) {
      router.push('/');
    } else {
      setAdmin(JSON.parse(adminData));
      const loadAllData = async () => {
        setLoadingProgress(10);
        await loadRegionAnnouncements();
        setLoadingProgress(40);
        await loadParticipants();
        setLoadingProgress(70);
        await loadSchedules();
        await loadFeedback();
        setLoadingProgress(100);
        setTimeout(() => setLoading(false), 500); // 로딩 완료 후 잠시 대기
      };
      loadAllData();
    }
  }, [router]);

  // 공지사항 CRUD
  const loadRegionAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements-public');
      const result = await response.json();
      
      if (result.success) {
        // 최신순 정렬 보장
        const sorted = [...result.data].sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
        setRegionAnnouncements(sorted);
      } else {
        toast.error('공지사항을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('공지사항 로드 오류:', error);
      setRegionAnnouncements([]);
      toast.error('공지사항을 불러오는데 실패했습니다.');
    }
  };

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
            author: '관리자',
            region: region,
            urgentLevel: newAnnouncement.urgentLevel,
          }),
        });

        if (response.ok) {
          successCount++;
          toast.loading(`[${successCount}/${newAnnouncement.regions.length}] 공지 등록 중...`, { id: loadingToast });
        } else {
            // 실패한 경우에도 계속 진행하되, 로그를 남깁니다.
            const errorResult = await response.json();
            console.error(`Region ${region} announcement failed:`, errorResult.error);
        }
      }

      if(successCount > 0) {
        toast.success(`${successCount}개 권역에 공지사항 등록 완료!`, { id: loadingToast });
        setNewAnnouncement({ title: '', content: '', regions: [], urgentLevel: 'normal' });
        await loadRegionAnnouncements();
      } else {
        toast.error('공지사항 등록에 모두 실패했습니다.', { id: loadingToast });
      }

    } catch (error) {
      console.error('공지사항 추가 오류:', error);
      toast.error('공지사항 추가 중 오류가 발생했습니다.', { id: loadingToast });
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/announcements-public?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('공지사항이 삭제되었습니다!');
        await loadRegionAnnouncements();
      } else {
        toast.error(result.error || '공지사항 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('공지사항 삭제 오류:', error);
      toast.error('공지사항 삭제에 실패했습니다.');
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

  // 참가자 CRUD
  const loadParticipants = async () => {
    try {
      const { collection, query, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../firebaseConfig');
      
      const participantQuery = query(collection(db, 'participants'));
      const participantSnapshot = await getDocs(participantQuery);
      
      const participantData = participantSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setParticipants(participantData);
    } catch (error) {
      console.error('참가자 로드 오류:', error);
      setParticipants([]);
      toast.error('참가자 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleParticipantSubmit = async (e) => {
    e.preventDefault();
    if (!newParticipant.name.trim() || !newParticipant.affiliation.trim()) {
      toast.error('이름과 소속을 입력해주세요!');
      return;
    }
    
    // 중복 체크
    const isDuplicate = participants.some(p => 
      p.name === newParticipant.name && p.affiliation === newParticipant.affiliation
    );
    
    if (isDuplicate) {
      toast.error('이미 등록된 참가자입니다!');
      return;
    }

    const loadingToast = toast.loading('참가자 등록 중...');
    
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebaseConfig');
      
      const participantData = {
        name: newParticipant.name,
        affiliation: newParticipant.affiliation,
        position: newParticipant.position || '',
        phone: newParticipant.phone || '',
        email: newParticipant.email || '',
        region: '1', // 기본값 1권역으로 설정
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'participants'), participantData);
      
      await loadParticipants();
      setNewParticipant({ name: '', affiliation: '', position: '', phone: '', email: '' });
      toast.success('참가자 등록 완료!', { id: loadingToast });
    } catch (error) {
      console.error('참가자 등록 오류:', error);
      toast.error('등록 실패', { id: loadingToast });
    }
  };

  const handleDeleteParticipant = async (id) => {
    if (!confirm('이 참가자를 삭제하시겠습니까?')) return;
    const loadingToast = toast.loading('참가자 삭제 중...');
    
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebaseConfig');
      
      await deleteDoc(doc(db, 'participants', id));
      
      await loadParticipants();
      toast.success('삭제 완료!', { id: loadingToast });
    } catch (error) {
      console.error('참가자 삭제 오류:', error);
      toast.error('삭제 실패', { id: loadingToast });
    }
  };

  // 참가자 수정
  const handleEditParticipant = (participant) => {
    setEditParticipant(participant);
    setShowEditModal(true);
  };

  const handleUpdateParticipant = async () => {
    if (!editParticipant.name.trim() || !editParticipant.affiliation.trim()) {
      toast.error('이름과 소속을 입력해주세요!');
      return;
    }

    const loadingToast = toast.loading('참가자 수정 중...');
    
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../firebaseConfig');
      
      const participantRef = doc(db, 'participants', editParticipant.id);
      await updateDoc(participantRef, {
        name: editParticipant.name,
        affiliation: editParticipant.affiliation,
        position: editParticipant.position || '',
        phone: editParticipant.phone || '',
        email: editParticipant.email || '',
        updatedAt: new Date().toISOString()
      });
      
      await loadParticipants();
      setShowEditModal(false);
      setEditParticipant(null);
      toast.success('참가자 수정 완료!', { id: loadingToast });
    } catch (error) {
      console.error('참가자 수정 오류:', error);
      toast.error('수정 실패', { id: loadingToast });
    }
  };

  // 일정 관리
  const loadSchedules = async () => {
    try {
      const { collection, query, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../firebaseConfig');
      
      const scheduleQuery = query(collection(db, 'schedules'));
      const scheduleSnapshot = await getDocs(scheduleQuery);
      
      let scheduleData = [];
      scheduleSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isDeleted) {
            return;
          }
          if (data.schedule && Array.isArray(data.schedule)) {
            data.schedule.forEach((scheduleItem, index) => {
              if (scheduleItem && scheduleItem.date) {
                scheduleData.push({
                  id: `${doc.id}_${index}`,
                  ...scheduleItem,
                  region: data.region,
                  title: data.title
                });
              }
            });
          } else if (data.date) {
            scheduleData.push({
              id: doc.id,
              ...data
            });
          }
      });

      scheduleData.sort((a, b) => new Date(a.date) - new Date(b.date));
      setSchedules(scheduleData);
      
    } catch (error) {
      console.error('일정 로드 오류:', error);
      setSchedules([]);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newSchedule.date || !newSchedule.time || !newSchedule.activity.trim()) {
      toast.error('날짜, 시간, 활동을 모두 입력해주세요!');
      return;
    }

    const loadingToast = toast.loading('일정 등록 중...');
    try {
      // 새로운 일정을 기존 일정에 추가
      const updatedSchedules = [...schedules, {
        id: `${newSchedule.date}_${Date.now()}`,
        ...newSchedule
      }];

      // 날짜별로 그룹화
      const activities = {};
      updatedSchedules.forEach(schedule => {
        if (!activities[schedule.date]) {
          activities[schedule.date] = [];
        }
        activities[schedule.date].push({
          time: schedule.time,
          activity: schedule.activity,
          location: schedule.location,
          description: schedule.description
        });
      });

      const response = await fetch('/api/schedule-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: selectedRegion, // 선택된 권역 사용
          activities: activities
        })
      });

      const result = await response.json();
      if (result.success) {
        await loadSchedules(selectedRegion);
        setNewSchedule({ date: '', time: '', activity: '', location: '' });
        toast.success('일정 등록 완료!', { id: loadingToast });
      } else {
        toast.error('등록 실패', { id: loadingToast });
      }
    } catch (error) {
      toast.error('등록 중 오류가 발생했습니다.', { id: loadingToast });
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;
    const loadingToast = toast.loading('일정 삭제 중...');
    
    try {
      const updatedSchedules = schedules.filter(s => s.id !== id);
      
      // 날짜별로 그룹화
      const activities = {};
      updatedSchedules.forEach(schedule => {
        if (!activities[schedule.date]) {
          activities[schedule.date] = [];
        }
        activities[schedule.date].push({
          time: schedule.time,
          activity: schedule.activity,
          location: schedule.location,
          description: schedule.description
        });
      });

      const response = await fetch('/api/schedule-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: '1', // 기본값 1권역으로 설정
          activities: activities
        })
      });

      const result = await response.json();
      if (result.success) {
        await loadSchedules(selectedRegion);
        toast.success('일정 삭제 완료!', { id: loadingToast });
      } else {
        toast.error('삭제 실패', { id: loadingToast });
      }
    } catch (error) {
      toast.error('삭제 중 오류가 발생했습니다.', { id: loadingToast });
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminSession');
    localStorage.removeItem('adminSession');
    router.push('/');
  };

  // 피드백 로드
  const loadFeedback = async () => {
    try {
      const params = new URLSearchParams();
      if (feedbackFilter.category !== 'all') params.set('category', feedbackFilter.category);
      if (feedbackFilter.status !== 'all') params.set('status', feedbackFilter.status);
      if (feedbackFilter.region !== 'all') params.set('region', feedbackFilter.region);
      const res = await fetch(`/api/feedback?${params.toString()}`);
      const result = await res.json();
      if (res.ok && result.success) {
        setFeedbackItems(result.data);
      } else {
        setFeedbackItems([]);
      }
    } catch (e) {
      setFeedbackItems([]);
    }
  };

  const updateFeedback = async (id, updates) => {
    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        await loadFeedback();
      }
    } catch (e) {}
  };

  const handleInitializeFirebase = async () => {
    const loadingToast = toast.loading('Firebase 초기화 중...');
    const result = await initializeFirebaseData();
    if (result.success) toast.success('초기화 완료!', { id: loadingToast });
    else toast.error('초기화 실패', { id: loadingToast });
  };

  const handleCreateTestSchedule = async () => {
    const loadingToast = toast.loading('테스트 일정 생성 중...');
    try {
      const response = await fetch('/api/create-test-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          region: selectedRegion
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('테스트 일정 생성 완료!', { id: loadingToast });
        await loadSchedules(selectedRegion);
      } else {
        toast.error(result.error || '테스트 일정 생성 실패', { id: loadingToast });
      }
    } catch (error) {
      console.error('테스트 일정 생성 오류:', error);
      toast.error('테스트 일정 생성 중 오류가 발생했습니다.', { id: loadingToast });
    }
  };

  const handleRecalculateRankings = async () => {
    if (!confirm('전체 사용자의 랭킹 점수를 재계산하시겠습니까? 데이터 양에 따라 시간이 소요될 수 있습니다.')) {
      return;
    }

    const loadingToast = toast.loading('랭킹 점수 재계산 중...');
    try {
      const response = await fetch('/api/user-stats', { method: 'POST' });
      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`랭킹 재계산 완료! (${result.userCount}명 처리)`, { id: loadingToast, duration: 4000 });
      } else {
        throw new Error(result.error || '알 수 없는 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('랭킹 재계산 오류:', error);
      toast.error(`재계산 실패: ${error.message}`, { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center py-4">
          <h1 className="text-3xl font-bold text-gray-800">🛠️ 관리자 대시보드</h1>
          <div>
            <button onClick={() => router.push('/')} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg mr-2">홈으로</button>
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">로그아웃</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-8 px-4">
        {/* 탭 네비게이션 */}
        <nav className="mb-8 flex space-x-8 border-b">
          <button onClick={() => setActiveTab('announcements')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'announcements' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>📢 공지사항 관리</button>
          <button onClick={() => router.push('/admin/file-manager')} className={`py-2 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500`}>📄 계획서/참가자 등록</button>
          <button onClick={() => setActiveTab('participants')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'participants' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>👥 참가자 명단</button>
          <button onClick={() => setActiveTab('schedules')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'schedules' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>📅 일정 관리</button>
          <button onClick={() => setActiveTab('feedback')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'feedback' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>📝 피드백 관리</button>
          <button onClick={() => router.push('/admin/report-generator')} className={`py-2 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500`}>**(미구현)** 최종보고서 생성</button>
        </nav>

        {/* 탭별 콘텐츠 */}
        <div>
          {/* 공지사항 탭 */}
          {activeTab === 'announcements' && (
            <div className="mb-8 bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📢 공지사항 관리</h2>
              
              {/* 공지사항 목록 */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 공지사항 목록</h3>
                {regionAnnouncements.length > 0 ? (
                  <div className="space-y-3">
                    {regionAnnouncements.map(announcement => (
                      <div key={announcement.id} className={`border rounded-lg p-4 hover:shadow-md ${
                        announcement.urgentLevel === 'urgent' ? 'border-red-200 bg-red-50' :
                        announcement.urgentLevel === 'important' ? 'border-orange-200 bg-orange-50' :
                        'border-gray-200 bg-white'
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900">{announcement.title}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                announcement.urgentLevel === 'urgent' ? 'bg-red-100 text-red-800' :
                                announcement.urgentLevel === 'important' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {announcement.urgentLevel === 'urgent' ? '🚨 긴급' :
                                 announcement.urgentLevel === 'important' ? '⚠️ 중요' : '📢 일반'}
                              </span>
                              {announcement.region && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                  {announcement.region}권역
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                              <span>📅 {announcement.createdAt ? new Date(announcement.createdAt).toLocaleString() : '날짜 없음'}</span>
                              <span>✍️ {announcement.author || '관리자'}</span>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteAnnouncement(announcement.id)} className="text-red-500 hover:text-red-700 ml-4">🗑️</button>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📝</div>
                    <p>등록된 공지사항이 없습니다.</p>
                  </div>
                )}
              </div>

              {/* 공지사항 등록 폼 */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  📝 공지사항 등록
                </h3>
                <form onSubmit={handleAnnouncementSubmit}>
                  {/* 권역 선택 */}
                  <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">대상 권역</label>
                      <div className="flex items-center mb-2">
                          <input 
                              type="checkbox" 
                              id="all-regions" 
                              onChange={handleSelectAllRegions}
                              checked={newAnnouncement.regions.length === regions.length}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="all-regions" className="ml-2 block text-sm text-gray-900">
                              전체 선택
                          </label>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-4 border rounded-md bg-gray-50">
                          {regions.map(region => (
                              <div key={region} className="flex items-center">
                                  <input 
                                      type="checkbox" 
                                      id={`region-${region}`} 
                                      value={region} 
                                      onChange={() => handleRegionChange(region)}
                                      checked={newAnnouncement.regions.includes(region)}
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <label htmlFor={`region-${region}`} className="ml-2 block text-sm text-gray-900">
                                      {region}권역
                                  </label>
                              </div>
                          ))}
                      </div>
                  </div>
                  
                  {/* 긴급도 선택 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">긴급도</label>
                    <select 
                      value={newAnnouncement.urgentLevel} 
                      onChange={e => setNewAnnouncement({ ...newAnnouncement, urgentLevel: e.target.value })} 
                      className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="normal">📢 일반</option>
                      <option value="important">⚠️ 중요</option>
                      <option value="urgent">🚨 긴급</option>
                    </select>
                  </div>
                  
                  <div className="space-y-4 mb-4">
                    <input 
                      type="text" 
                      placeholder="제목" 
                      value={newAnnouncement.title} 
                      onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} 
                      className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    />
                    <textarea 
                      placeholder="내용" 
                      value={newAnnouncement.content} 
                      onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} 
                      rows={4}
                      className="w-full border px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" 
                    />
                  </div>
                  <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    📢 공지사항 등록
                  </button>
                </form>
              </div>
            </div>
          )}
          {/* 참가자 명단 탭 */}
          {activeTab === 'participants' && (
            <div className="mb-8 bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">👥 권역별 참가자 명단</h2>
              {/* 등록 폼 */}
              <form onSubmit={handleParticipantSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">이름 *</label>
                    <input type="text" value={newParticipant.name} onChange={e => setNewParticipant({ ...newParticipant, name: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">소속 *</label>
                    <input type="text" value={newParticipant.affiliation} onChange={e => setNewParticipant({ ...newParticipant, affiliation: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">직급</label>
                    <input type="text" value={newParticipant.position} onChange={e => setNewParticipant({ ...newParticipant, position: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
                    <input type="tel" value={newParticipant.phone} onChange={e => setNewParticipant({ ...newParticipant, phone: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                    <input type="email" value={newParticipant.email} onChange={e => setNewParticipant({ ...newParticipant, email: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium">참가자 등록</button>
              </form>
              {/* 목록 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 전체 참가자 목록 ({participants.length}명)</h3>
                {participants.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">이름</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">소속</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">직급</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">연락처</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">이메일</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">관리</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {participants.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">{p.name}</td>
                            <td className="px-6 py-4">{p.affiliation}</td>
                            <td className="px-6 py-4">{p.position || '-'}</td>
                            <td className="px-6 py-4">{p.phone || '-'}</td>
                            <td className="px-6 py-4">{p.email || '-'}</td>
                            <td className="px-6 py-4">
                              <button onClick={() => handleEditParticipant(p)} className="text-blue-600 hover:text-blue-900 mr-2">수정</button>
                              <button onClick={() => handleDeleteParticipant(p.id)} className="text-red-600 hover:text-red-900">삭제</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">👥</div>
                    <p>등록된 참가자가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* 일정 관리 탭 */}
          {activeTab === 'schedules' && (
            <div className="mb-8 bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📅 연수 일정 관리</h2>
              
              {/* 권역 선택 및 테스트 일정 생성 */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">권역 선택:</label>
                    <select 
                      value={selectedRegion} 
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {regions.map(region => (
                        <option key={region} value={region}>{region}권역</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateTestSchedule}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      🧪 테스트 일정 생성
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSchedules()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      🔄 일정 새로고침
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 등록 폼 */}
              <form onSubmit={handleScheduleSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">날짜 *</label>
                    <input type="date" value={newSchedule.date} onChange={e => setNewSchedule({ ...newSchedule, date: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">시간 *</label>
                    <input type="time" value={newSchedule.time} onChange={e => setNewSchedule({ ...newSchedule, time: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">활동 *</label>
                    <input type="text" value={newSchedule.activity} onChange={e => setNewSchedule({ ...newSchedule, activity: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="활동 내용을 입력하세요" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">장소</label>
                    <input type="text" value={newSchedule.location} onChange={e => setNewSchedule({ ...newSchedule, location: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="장소를 입력하세요" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium">일정 등록</button>
              </form>
              {/* 목록 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 전체 일정 목록 ({schedules.length}개)</h3>
                {schedules.length > 0 ? (
                  <div className="space-y-3">
                    {schedules.map(schedule => (
                      <div key={schedule.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-4 mb-2">
                              <span className="text-sm text-gray-500">📅 {new Date(`${schedule.date}T${schedule.time}`).toLocaleString()}</span>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-1">{schedule.activity}</h4>
                            {schedule.location && (
                              <p className="text-sm text-gray-600">📍 {schedule.location}</p>
                            )}
                          </div>
                          <button onClick={() => handleDeleteSchedule(schedule.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📅</div>
                    <p>등록된 일정이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* 피드백 관리 탭 */}
          {activeTab === 'feedback' && (
            <div className="mb-8 bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📝 피드백 관리</h2>
              <div className="flex flex-wrap gap-4 mb-4">
                <select value={feedbackFilter.category} onChange={(e)=> setFeedbackFilter(prev=>({...prev, category: e.target.value}))} className="px-3 py-2 border rounded-md">
                  <option value="all">전체 분류</option>
                  <option value="기능개선">기능개선</option>
                  <option value="버그신고">버그신고</option>
                  <option value="문의">문의</option>
                  <option value="칭찬/응원">칭찬/응원</option>
                </select>
                <select value={feedbackFilter.status} onChange={(e)=> setFeedbackFilter(prev=>({...prev, status: e.target.value}))} className="px-3 py-2 border rounded-md">
                  <option value="all">전체 상태</option>
                  <option value="open">열림</option>
                  <option value="resolved">처리완료</option>
                </select>
                <select value={feedbackFilter.region} onChange={(e)=> setFeedbackFilter(prev=>({...prev, region: e.target.value}))} className="px-3 py-2 border rounded-md">
                  <option value="all">모든 권역</option>
                  {regions.map(r => <option key={r} value={r}>{r}권역</option>)}
                </select>
                <button onClick={loadFeedback} className="px-4 py-2 bg-blue-600 text-white rounded-md">조회</button>
              </div>
              {feedbackItems.length === 0 ? (
                <div className="text-center py-10 text-gray-500">피드백이 없습니다.</div>
              ) : (
                <div className="space-y-3">
                  {feedbackItems.map(item => (
                    <div key={item.id} className={`border rounded-lg p-4 ${item.status === 'resolved' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="space-x-2">
                          <span className="px-2 py-1 text-xs rounded bg-gray-100">{item.category}</span>
                          <span className="px-2 py-1 text-xs rounded bg-yellow-100">{item.priority || '보통'}</span>
                          {item.region && <span className="px-2 py-1 text-xs rounded bg-blue-100">{item.region}권역</span>}
                        </div>
                        <div className="text-xs text-gray-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</div>
                      </div>
                      {item.contact && <div className="text-sm text-gray-600 mb-2">👤 {item.contact}</div>}
                      <div className="whitespace-pre-wrap text-gray-800 mb-3">{item.content}</div>
                      <div className="flex gap-2 justify-end">
                        {item.status !== 'resolved' && (
                          <button onClick={()=>updateFeedback(item.id, { status: 'resolved' })} className="px-3 py-1 bg-green-600 text-white rounded">처리완료</button>
                        )}
                        <button onClick={()=>updateFeedback(item.id, { archived: true })} className="px-3 py-1 bg-gray-600 text-white rounded">제외</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {/* 개발자 정보 및 버전 */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">곡성중앙초 임환진</p>
          <p className="text-xs text-gray-400 mt-1">Version 1.0.0</p>
                     <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button onClick={handleInitializeFirebase} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">Firebase 초기화</button>
            <button onClick={handleCreateTestSchedule} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">테스트 일정 생성</button>
            <button onClick={handleRecalculateRankings} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">🏆 랭킹 점수 재계산</button>
            <button onClick={() => toast('파이어베이스 모니터링 기능 (미구현)', {icon:'🔥'})} className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">Firebase 모니터링</button>
          </div>
        </div>
      </main>

      {/* 참가자 수정 모달 */}
      {showEditModal && editParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">참가자 수정</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">이름 *</label>
                <input type="text" value={editParticipant.name} onChange={e => setEditParticipant({ ...editParticipant, name: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">소속 *</label>
                <input type="text" value={editParticipant.affiliation} onChange={e => setEditParticipant({ ...editParticipant, affiliation: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">직급</label>
                <input type="text" value={editParticipant.position || ''} onChange={e => setEditParticipant({ ...editParticipant, position: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
                <input type="tel" value={editParticipant.phone || ''} onChange={e => setEditParticipant({ ...editParticipant, phone: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                <input type="email" value={editParticipant.email || ''} onChange={e => setEditParticipant({ ...editParticipant, email: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg" />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowEditModal(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400">취소</button>
              <button onClick={handleUpdateParticipant} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">수정</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
