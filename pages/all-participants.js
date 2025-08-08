import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

export default function AllParticipants() {
  const router = useRouter();
  const [participants, setParticipants] = useState([]);
  const [participantsByRegion, setParticipantsByRegion] = useState({});
  const [participantsByAffiliation, setParticipantsByAffiliation] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'byRegion', 'byAffiliation'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAllParticipants();
  }, []);

  const loadAllParticipants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/all-participants');
      const result = await response.json();

      if (result.success) {
        setParticipants(result.participants);
        setParticipantsByRegion(result.participantsByRegion);
        setParticipantsByAffiliation(result.participantsByAffiliation);
        toast.success(`${result.totalParticipants}명의 참가자를 불러왔습니다.`);
      } else {
        toast.error('참가자 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('참가자 로드 오류:', error);
      toast.error('참가자 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getPositionIcon = (position) => {
    if (position?.includes('교장')) return '👨‍🏫';
    if (position?.includes('교감')) return '👩‍🏫';
    if (position?.includes('교사')) return '📚';
    if (position?.includes('관리자')) return '⚙️';
    return '👤';
  };

  const getRegionColor = (region) => {
    const colors = {
      '1': 'bg-blue-100 text-blue-800',
      '2': 'bg-green-100 text-green-800',
      '3': 'bg-yellow-100 text-yellow-800',
      '4': 'bg-purple-100 text-purple-800',
      '5': 'bg-pink-100 text-pink-800',
      '6': 'bg-indigo-100 text-indigo-800',
      '7': 'bg-red-100 text-red-800',
      '8': 'bg-gray-100 text-gray-800',
      '9': 'bg-orange-100 text-orange-800',
      '10': 'bg-teal-100 text-teal-800'
    };
    return colors[region] || 'bg-gray-100 text-gray-800';
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    // 전화번호 형식 변환 (010-1234-5678)
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    return phone;
  };

  const filterParticipants = (participantList) => {
    if (!searchTerm) return participantList;
    
    return participantList.filter(participant => 
      participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.affiliation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const renderParticipantCard = (participant) => (
    <div key={participant.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-400">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">
              {getPositionIcon(participant.position)}
            </span>
            <h3 className="font-semibold text-gray-800">{participant.name}</h3>
            <span className={`text-sm px-2 py-1 rounded ${getRegionColor(participant.region)}`}>
              {participant.region}권역
            </span>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            <span className="font-medium">🏫 {participant.affiliation}</span>
            {participant.position && (
              <span className="ml-4 font-medium">💼 {participant.position}</span>
            )}
          </div>
          {participant.phone && (
            <div className="text-sm text-gray-600 mb-1">
              <span className="font-medium">📞 {formatPhone(participant.phone)}</span>
            </div>
          )}
          {participant.email && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">📧 {participant.email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAllParticipants = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filterParticipants(participants).map(participant => renderParticipantCard(participant))}
    </div>
  );

  const renderByRegion = () => (
    <div className="space-y-8">
      {Object.keys(participantsByRegion).sort().map(region => {
        const regionParticipants = filterParticipants(participantsByRegion[region]);
        if (regionParticipants.length === 0) return null;
        
        return (
          <div key={region} className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
              🏢 {region}권역 참가자 ({regionParticipants.length}명)
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {regionParticipants.map(participant => renderParticipantCard(participant))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderByAffiliation = () => (
    <div className="space-y-8">
      {Object.keys(participantsByAffiliation).sort().map(affiliation => {
        const affiliationParticipants = filterParticipants(participantsByAffiliation[affiliation]);
        if (affiliationParticipants.length === 0) return null;
        
        return (
          <div key={affiliation} className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
              🏫 {affiliation} ({affiliationParticipants.length}명)
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {affiliationParticipants.map(participant => renderParticipantCard(participant))}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">전체 참가자 목록을 불러오는 중...</p>
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
                👥 함께하시는 분들
              </h1>
              <p className="text-gray-600">
                총 {participants.length}명, {Object.keys(participantsByRegion).length}개 권역
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
                onClick={loadAllParticipants}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                🔄 새로고침
              </button>
            </div>
          </div>
        </div>

        {/* 검색 및 뷰 모드 선택 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* 검색 */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="이름, 소속, 직책으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* 뷰 모드 선택 */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'all' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                👥 전체 목록
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
                onClick={() => setViewMode('byAffiliation')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'byAffiliation' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🏫 소속별 보기
              </button>
            </div>
          </div>
        </div>

        {/* 참가자 목록 표시 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {viewMode === 'all' && renderAllParticipants()}
          {viewMode === 'byRegion' && renderByRegion()}
          {viewMode === 'byAffiliation' && renderByAffiliation()}
        </div>
      </div>
    </div>
  );
} 