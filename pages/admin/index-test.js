import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { announcementOperations, participantOperations } from '../../utils/firebaseOperations';
import { initializeFirebaseData } from '../../utils/initializeFirebase';

const regions = ['1','2','3','4','5','6','7','8','9','10'];

export default function AdminDashboardTest() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState('announcements');
  const [selectedRegion, setSelectedRegion] = useState('1');
  const [loading, setLoading] = useState(true);

  // 공지사항
  const [regionAnnouncements, setRegionAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    title: '',
    content: ''
  });
  // 시간 선택 옵션
  const timeOptions = [
    '08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'
  ];

  // 참가자
  const [participants, setParticipants] = useState([]);
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    affiliation: '',
    position: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminSession') || localStorage.getItem('adminSession');
    if (!adminData) {
      router.push('/admin/login');
    } else {
      setAdmin(JSON.parse(adminData));
      loadRegionAnnouncements(selectedRegion);
      loadParticipants(selectedRegion);
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (admin) {
      loadRegionAnnouncements(selectedRegion);
      loadParticipants(selectedRegion);
    }
  }, [selectedRegion, admin]);

  // 공지사항 CRUD
  const loadRegionAnnouncements = async (region) => {
    try {
      const result = await announcementOperations.getByRegion(region);
      if (result.success) setRegionAnnouncements(result.data);
      else toast.error('공지사항을 불러오는데 실패했습니다.');
    } catch {
      setRegionAnnouncements([]);
      toast.error('공지사항 로드 오류');
    }
  };

  const handleAnnouncementSubmit = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요!');
      return;
    }
    const loadingToast = toast.loading('공지사항 등록 중...');
    const data = { ...newAnnouncement, region: selectedRegion, createdBy: '관리자' };
    const result = await announcementOperations.create(data);
    if (result.success) {
      await loadRegionAnnouncements(selectedRegion);
      setNewAnnouncement({ date: new Date().toISOString().split('T')[0], time: '09:00', title: '', content: '' });
      toast.success('공지사항 등록 완료!', { id: loadingToast });
    } else {
      toast.error('등록 실패', { id: loadingToast });
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return;
    const loadingToast = toast.loading('공지사항 삭제 중...');
    const result = await announcementOperations.delete(id);
    if (result.success) {
      await loadRegionAnnouncements(selectedRegion);
      toast.success('삭제 완료!', { id: loadingToast });
    } else {
      toast.error('삭제 실패', { id: loadingToast });
    }
  };

  // 참가자 CRUD
  const loadParticipants = async (region) => {
    try {
      const result = await participantOperations.getByRegion(region);
      if (result.success) setParticipants(result.data);
      else toast.error('참가자 목록을 불러오는데 실패했습니다.');
    } catch {
      setParticipants([]);
      toast.error('참가자 로드 오류');
    }
  };

  const handleParticipantSubmit = async (e) => {
    e.preventDefault();
    if (!newParticipant.name.trim() || !newParticipant.affiliation.trim()) {
      toast.error('이름과 소속을 입력해주세요!');
      return;
    }
    const loadingToast = toast.loading('참가자 등록 중...');
    const data = { ...newParticipant, region: selectedRegion };
    const result = await participantOperations.create(data);
    if (result.success) {
      await loadParticipants(selectedRegion);
      setNewParticipant({ name: '', affiliation: '', position: '', phone: '', email: '' });
      toast.success('참가자 등록 완료!', { id: loadingToast });
    } else {
      toast.error('등록 실패', { id: loadingToast });
    }
  };

  const handleDeleteParticipant = async (id) => {
    if (!confirm('이 참가자를 삭제하시겠습니까?')) return;
    const loadingToast = toast.loading('참가자 삭제 중...');
    const result = await participantOperations.delete(id);
    if (result.success) {
      await loadParticipants(selectedRegion);
      toast.success('삭제 완료!', { id: loadingToast });
    } else {
      toast.error('삭제 실패', { id: loadingToast });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    sessionStorage.removeItem('adminSession');
    toast.success('로그아웃 되었습니다.');
    router.push('/');
  };

  const handleInitializeFirebase = async () => {
    if (!confirm('Firebase 데이터베이스를 초기화하시겠습니까?')) return;
    const loadingToast = toast.loading('Firebase 초기화 중...');
    const result = await initializeFirebaseData();
    if (result.success) toast.success('초기화 완료!', { id: loadingToast });
    else toast.error('초기화 실패', { id: loadingToast });
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
          <h1 className="text-3xl font-bold text-gray-800">🛠️ 관리자 대시보드 TEST</h1>
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
          <button onClick={() => setActiveTab('participants')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'participants' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>👥 참가자 명단</button>
          <button onClick={() => setActiveTab('schedules')} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'schedules' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>📅 일정 관리</button>
        </nav>
        {/* 권역 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">권역 선택</label>
          <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)} className="w-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            {regions.map(region => <option key={region} value={region}>{region}권역</option>)}
          </select>
        </div>
        {/* 탭별 콘텐츠 */}
        <div>
          {/* 공지사항 탭 */}
          {activeTab === 'announcements' && (
            <div className="mb-8 bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📢 권역별 공지사항 관리</h2>
              {/* 작성 폼 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
                <input type="text" value={newAnnouncement.title} onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg mb-2" placeholder="공지사항 제목을 입력하세요..." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">날짜</label>
                    <input type="date" value={newAnnouncement.date} onChange={e => setNewAnnouncement(prev => ({ ...prev, date: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">시간</label>
                    <select value={newAnnouncement.time} onChange={e => setNewAnnouncement(prev => ({ ...prev, time: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg">
                      {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                <textarea value={newAnnouncement.content} onChange={e => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))} placeholder="공지사항 내용을 입력하세요..." className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none mb-2" />
                <div className="flex justify-end">
                  <button onClick={handleAnnouncementSubmit} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                    <span>📢</span>
                    <span>공지사항 등록</span>
                  </button>
                </div>
              </div>
              {/* 목록 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 공지사항 목록</h3>
                {regionAnnouncements.length > 0 ? (
                  <div className="space-y-3">
                    {regionAnnouncements.map(announcement => (
                      <div key={announcement.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">{announcement.title}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                              <span>📅 {announcement.date}</span>
                              <span>🕐 {announcement.time}</span>
                              <span>✍️ {announcement.createdBy}</span>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteAnnouncement(announcement.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📝</div>
                    <p>{selectedRegion}권역에 등록된 공지사항이 없습니다.</p>
                  </div>
                )}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 {selectedRegion}권역 참가자 목록 ({participants.length}명)</h3>
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
                    <p>{selectedRegion}권역에 등록된 참가자가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* 일정 관리 탭 (플레이스홀더) */}
          {activeTab === 'schedules' && (
            <div className="mb-8 bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📅 연수 일정 관리</h2>
              <p className="text-gray-600 mb-4">연수 일정을 등록하고 관리할 수 있습니다.</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">🚧 일정 관리 기능은 곧 추가될 예정입니다.</p>
              </div>
              <button onClick={handleInitializeFirebase} className="mt-6 w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700">Firebase 초기화</button>
            </div>
          )}
        </div>
        {/* 개발자 정보 및 버전 */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">곡성중앙초 임환진</p>
          <p className="text-xs text-gray-400 mt-1">Version 1.0.0</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button onClick={() => router.push('/admin/file-manager')} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">파일매니저</button>
            <button onClick={() => router.push('/admin/report-generator')} className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600">최종보고서 생성</button>
            <button onClick={handleInitializeFirebase} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">Firebase 초기화</button>
            <button onClick={() => toast('파이어베이스 모니터링 기능 (미구현)', {icon:'🔥'})} className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">Firebase 모니터링</button>
          </div>
        </div>
      </main>
    </div>
  );
}
