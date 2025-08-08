import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { db } from '../../firebaseConfig'
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from 'react-hot-toast'

// --- Helper Components ---

const ManualInputModal = ({ isOpen, onClose, onSave, columns, title, description }) => {
  const [rows, setRows] = useState([{}])
  if (!isOpen) return null
  const handleAddRow = () => setRows([...rows, {}])
  const handleRemoveRow = (index) => setRows(rows.filter((_, i) => i !== index))
  const handleChange = (index, name, value) => {
    const newRows = [...rows];
    newRows[index][name] = value;
    setRows(newRows);
  }
  const handleSave = () => {
    const filteredRows = rows.filter(row => Object.values(row).some(val => val));
    if (filteredRows.length === 0) {
      toast.error('데이터를 1개 이상 입력해주세요.');
      return;
    }
    onSave(filteredRows);
    onClose();
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-gray-600 mb-6">{description}</p>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {columns.map(col => <th key={col.key} className="px-4 py-2 text-left font-semibold text-gray-700">{col.label}</th>)}
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b">
                  {columns.map(col => (
                    <td key={col.key} className="p-2">
                      <input type="text" placeholder={col.label} value={row[col.key] || ''} onChange={(e) => handleChange(index, col.key, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                  ))}
                  <td className="p-2 text-center"><button onClick={() => handleRemoveRow(index)} className="text-red-500 hover:text-red-700 font-bold">X</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-between">
          <button onClick={handleAddRow} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">+ 행 추가</button>
          <div>
            <button onClick={onClose} className="mr-2 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400">취소</button>
            <button onClick={handleSave} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">저장</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ConfirmationModal = ({ isOpen, onClose, onConfirm, data }) => {
  if (!isOpen || !data) return null;

  const { title: modalTitle, content } = data;
  const { schedule, participants } = content;

  const scheduleColumns = [{ key: 'date', label: '날짜' }, { key: 'time', label: '시간' }, { key: 'activity', label: '활동' }, { key: 'location', label: '장소' }];
  const participantColumns = [{ key: 'name', label: '이름' }, { key: 'affiliation', label: '소속' }, { key: 'region', label: '권역' }];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{modalTitle}</h2>
        <p className="text-gray-600 mb-6">아래 분석된 내용을 확인하고 최종 등록하시겠습니까?</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow overflow-y-auto">
          {/* Schedule Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">📋 연수 일정</h3>
            <div className="border rounded-lg overflow-y-auto max-h-64">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>{scheduleColumns.map(col => <th key={col.key} className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">{col.label}</th>)}</tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schedule && schedule.length > 0 ? (
                    schedule.map((row, index) => (<tr key={index}>{scheduleColumns.map(col => <td key={col.key} className="px-4 py-3 whitespace-nowrap text-gray-700">{row[col.key] || ''}</td>)}</tr>))
                  ) : (
                    <tr><td colSpan={scheduleColumns.length} className="text-center py-4 text-gray-500">일정 정보 없음</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Participants Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">👥 참가자 명단</h3>
            <div className="border rounded-lg overflow-y-auto max-h-64">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>{participantColumns.map(col => <th key={col.key} className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">{col.label}</th>)}</tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants && participants.length > 0 ? (
                    participants.map((row, index) => (<tr key={index}>{participantColumns.map(col => <td key={col.key} className="px-4 py-3 whitespace-nowrap text-gray-700">{row[col.key] || ''}</td>)}</tr>))
                  ) : (
                     <tr><td colSpan={participantColumns.length} className="text-center py-4 text-gray-500">참가자 정보 없음</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button onClick={onClose} className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600">취소</button>
          <button onClick={onConfirm} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">확인 및 최종 등록</button>
        </div>
      </div>
    </div>
  );
};

const PasswordConfirmationModal = ({ isOpen, onClose, onConfirm, message }) => {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(password);
    setPassword('');
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h2 className="text-lg font-bold mb-4">비밀번호 확인</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
          placeholder="관리자 비밀번호를 입력하세요"
          autoFocus
        />
        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400">
            취소
          </button>
          <button onClick={handleConfirm} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
export default function FileManager() {
  const [admin, setAdmin] = useState(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule-register');

  // --- Unified State for Registration ---
  const [trainingTitle, setTrainingTitle] = useState('');
  const [trainingRegion, setTrainingRegion] = useState('1');
  const [scheduleInput, setScheduleInput] = useState('');
  const [assignmentInput, setAssignmentInput] = useState('');
  const [participantInput, setParticipantInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // --- State for Modals and Data Management ---
  const [dataToConfirm, setDataToConfirm] = useState(null);
  const [isManualModalOpen, setManualModalOpen] = useState(false);
  const [manualModalConfig, setManualModalConfig] = useState({});
  const [savedSchedules, setSavedSchedules] = useState([]);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState(null);

  useEffect(() => {
    const adminData = sessionStorage.getItem('adminSession') || localStorage.getItem('adminSession');
    if (!adminData) {
      router.push('/admin/login');
    } else {
      setAdmin(JSON.parse(adminData));
      fetchSchedules();
    }
  }, [router]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "schedules"));
      const schedules = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedSchedules(schedules);
    } catch (error) {
      console.error("저장된 일정 로드 오류:", error);
      toast.error("저장된 일정을 불러오는데 실패했습니다. Firestore 권한을 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeRegistration = async () => {
    if (!trainingTitle.trim()) {
      toast.error('연수 제목을 입력해주세요.');
      return;
    }
    if (!scheduleInput.trim() && !participantInput.trim()) {
      toast.error('일정 또는 참가자 정보를 입력해주세요.');
      return;
    }
    if (!password) {
      toast.error('비밀번호를 입력해주세요.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      let scheduleData = [];
      if (scheduleInput.trim()) {
        const scheduleRes = await fetch('/api/parse-schedule-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduleText: scheduleInput, assignmentText: assignmentInput }),
        });
        const scheduleResult = await scheduleRes.json();
        if (!scheduleResult.success || scheduleResult.data.length === 0) {
          toast.error('AI가 일정을 분석하지 못했습니다. 수동 입력이 필요합니다.');
        }
        scheduleData = scheduleResult.data || [];
      }

      let participantData = [];
      if (participantInput.trim()) {
        const participantRes = await fetch('/api/parse-participants-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantsText: participantInput }),
        });
        const participantResult = await participantRes.json();
        if (!participantResult.success || participantResult.data.length === 0) {
           toast.error('AI가 참가자 명단을 분석하지 못했습니다. 수동 입력이 필요합니다.');
        }
        participantData = participantResult.data || [];
      }
      
      if(scheduleData.length === 0 && participantData.length === 0) {
        toast.error("AI가 일정과 참가자 명단을 모두 분석하지 못했습니다. 내용을 확인 후 다시 시도하거나 수동으로 입력해주세요.");
        return;
      }

      toast.success("AI 분석 완료! 내용을 확인해주세요.");
      setDataToConfirm({
        type: 'finalize',
        content: { schedule: scheduleData, participants: participantData },
        title: `'${trainingTitle}' 연수 등록 확인`,
      });

    } catch (error) {
      toast.error(`등록 중 오류 발생: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!dataToConfirm || dataToConfirm.type !== 'finalize') return;
    setLoading(true);
    try {
      const { schedule, participants } = dataToConfirm.content;
      const docId = `${trainingRegion}권역_${trainingTitle.replace(/\s+/g, '_')}_${Date.now()}`;
      
      await setDoc(doc(db, "schedules", docId), {
        title: trainingTitle,
        region: trainingRegion,
        schedule: schedule,
        assignments: assignmentInput,
        participants: participants,
        password: password,
        isDeleted: false,
        createdAt: serverTimestamp(),
        createdBy: admin?.id || 'admin'
      });

      toast.success('연수 정보가 성공적으로 등록되었습니다!');
      // Reset form
      setTrainingTitle('');
      setTrainingRegion('1');
      setScheduleInput('');
      setAssignmentInput('');
      setParticipantInput('');
      setPassword('');
      setConfirmPassword('');
      setDataToConfirm(null);
      
      await fetchSchedules(); // Refresh the schedule list
      setActiveTab('schedule-manage'); // Switch to the management tab
    } catch (error) {
      console.error('Firestore 저장 오류:', error);
      toast.error('데이터 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordConfirm = async (enteredPassword) => {
    if (!admin?.password) {
      toast.error("관리자 정보를 불러올 수 없습니다. 다시 로그인해주세요.");
      setPasswordModalOpen(false);
      return;
    }

    if (enteredPassword !== admin.password) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }

    setPasswordModalOpen(false);
    setLoading(true);

    if (!actionToConfirm) {
      setLoading(false);
      return;
    }

    const { type, id, currentStatus } = actionToConfirm;

    try {
      if (type === 'toggle') {
        const action = !currentStatus ? '삭제' : '복구';
        await updateDoc(doc(db, "schedules", id), { isDeleted: !currentStatus });
        toast.success(`일정이 성공적으로 ${action}되었습니다.`);
      } else if (type === 'delete') {
        await deleteDoc(doc(db, "schedules", id));
        toast.success("일정이 영구적으로 삭제되었습니다.");
      }
      await fetchSchedules();
    } catch (error) {
      toast.error(`작업 중 오류가 발생했습니다: ${error.message}`);
      console.error("Error during confirmed action:", error);
    } finally {
      setLoading(false);
      setActionToConfirm(null);
    }
  };

  const toggleScheduleDeletion = (id, currentStatus) => {
    const action = !currentStatus ? '삭제' : '복구';
    setActionToConfirm({
      type: 'toggle',
      id,
      currentStatus,
      message: `이 일정을 ${action}하시겠습니까?`
    });
    setPasswordModalOpen(true);
  };

  const deleteSchedulePermanently = (id) => {
    setActionToConfirm({
      type: 'delete',
      id,
      message: "이 일정을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
    });
    setPasswordModalOpen(true);
  };
  
  const scheduleColumns = [{ key: 'date', label: '날짜' }, { key: 'time', label: '시간' }, { key: 'activity', label: '활동' }, { key: 'location', label: '장소' }];
  const participantColumns = [{ key: 'name', label: '이름' }, { key: 'affiliation', label: '소속' }, { key: 'region', label: '권역' }];

  const openManualInput = (type) => {
    const config = type === 'schedule' 
      ? { onSave: (data) => console.log('manual schedule', data), columns: scheduleColumns, title: '수동 연수 일정 입력' }
      : { onSave: (data) => console.log('manual participants', data), columns: participantColumns, title: '수동 참가자 명단 입력' };
    setManualModalConfig(config);
    setManualModalOpen(true);
  }

  return (
    <>
      <div className={`min-h-screen bg-gray-50 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {loading && <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"><div className="w-16 h-16 border-8 border-dashed rounded-full animate-spin border-blue-600"></div></div>}
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">데이터 관리</h1>
              <p className="text-gray-600 mt-2">연수 일정과 참가자 명단을 통합하여 등록하고 관리하세요.</p>
            </div>
            <button onClick={() => router.push('/admin')} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">← 관리자 대시보드</button>
          </div>

          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {['schedule-register', 'schedule-manage'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  {tab === 'schedule-register' && '📋 연수 등록'}
                  {tab === 'schedule-manage' && '🗂️ 연수 관리'}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === 'schedule-register' && (
            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연수 제목</label>
                  <input type="text" value={trainingTitle} onChange={(e) => setTrainingTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="예: 2025년 하계 교원 연수" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">권역</label>
                  <select value={trainingRegion} onChange={(e) => setTrainingRegion(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    {[...Array(10)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}권역</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">연수 일정 내용</h3>
                <textarea value={scheduleInput} onChange={(e) => setScheduleInput(e.target.value)} rows="10" className="w-full p-3 border border-gray-300 rounded-md" placeholder="한글의 표의 내용을 복사후 '그대로' 붙여넣으세요. 표가 깨져도 괜찮아요." />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">연수 과제 내용</h3>
                <textarea value={assignmentInput} onChange={(e) => setAssignmentInput(e.target.value)} rows="5" className="w-full p-3 border border-gray-300 rounded-md" placeholder="과제 내용이나 관련 메모를 입력하세요." />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">참가자 명단</h3>
                <textarea value={participantInput} onChange={(e) => setParticipantInput(e.target.value)} rows="10" className="w-full p-3 border border-gray-300 rounded-md" placeholder="참가자 명단(성명, 소속, 권역)이 포함된 내용을 복사하여 붙여넣으세요." />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">비밀번호 설정</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="비밀번호 입력" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="비밀번호 다시 입력" />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t flex justify-center items-center">
                <button onClick={handleFinalizeRegistration} disabled={loading} className="w-full md:w-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-bold hover:bg-blue-700 disabled:bg-blue-300 transition-transform transform hover:scale-105">
                  🤖 AI로 분석 및 최종 등록
                </button>
              </div>
            </div>
          )}

          {activeTab === 'schedule-manage' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">저장된 연수 목록</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-2 text-left">제목</th><th className="px-4 py-2 text-left">권역</th><th className="px-4 py-2 text-left">참가자 수</th><th className="px-4 py-2 text-left">생성일</th><th className="px-4 py-2 text-left">상태</th><th className="px-4 py-2 text-left">작업</th>
                  </tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {savedSchedules.map(s => (
                      <tr key={s.id} className={s.isDeleted ? 'bg-gray-100 text-gray-400' : ''}>
                        <td className="px-4 py-2">{s.title}</td>
                        <td className="px-4 py-2">{s.region}권역</td>
                        <td className="px-4 py-2">{s.participants?.length || 0}명</td>
                        <td className="px-4 py-2">{s.createdAt?.toDate().toLocaleDateString()}</td>
                        <td className="px-4 py-2">{s.isDeleted ? '삭제됨' : '활성'}</td>
                        <td className="px-4 py-2 space-x-2">
                          <button onClick={() => toggleScheduleDeletion(s.id, s.isDeleted)} className={`px-2 py-1 text-sm rounded ${s.isDeleted ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`}>{s.isDeleted ? '복구' : '삭제'}</button>
                          {s.isDeleted && <button onClick={() => deleteSchedulePermanently(s.id)} className="px-2 py-1 text-sm rounded bg-red-600 text-white">영구 삭제</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        <ManualInputModal 
          isOpen={isManualModalOpen} 
          onClose={() => setManualModalOpen(false)} 
          onSave={manualModalConfig.onSave}
          columns={manualModalConfig.columns || []} 
          title={manualModalConfig.title || "수동 입력"}
          description="AI 분석이 어려운 데이터를 직접 입력합니다."
        />
        <ConfirmationModal 
          isOpen={!!dataToConfirm} 
          onClose={() => setDataToConfirm(null)} 
          onConfirm={handleConfirmAndSave} 
          data={dataToConfirm} 
        />
        <PasswordConfirmationModal
          isOpen={passwordModalOpen}
          onClose={() => {
            setPasswordModalOpen(false);
            setActionToConfirm(null);
          }}
          onConfirm={handlePasswordConfirm}
          message={actionToConfirm?.message}
        />
      </div>
    </>
  );
}