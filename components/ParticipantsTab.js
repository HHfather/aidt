import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function ParticipantsTab({ participants: initialParticipants }) {
  const [participants, setParticipants] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]);
  const [participantsByRegion, setParticipantsByRegion] = useState({});
  const [participantsByAffiliation, setParticipantsByAffiliation] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'byRegion', 'byAffiliation'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedAffiliation, setSelectedAffiliation] = useState('all');

  useEffect(() => {
    loadAllParticipants();
  }, []);

  const loadAllParticipants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/all-participants');
      const result = await response.json();

      if (result.success) {
        setAllParticipants(result.participants);
        setParticipantsByRegion(result.participantsByRegion);
        setParticipantsByAffiliation(result.participantsByAffiliation);
        setParticipants(result.participants);
        toast.success(`${result.totalParticipants}명의 참가자를 불러왔습니다.`);
      } else {
        toast.error('참가자 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('참가자 로드 오류:', error);
      toast.error('참가자 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getPositionIcon = (position) => {
    if (position?.includes('교장') || position?.includes('원장')) return '👑';
    if (position?.includes('교감') || position?.includes('부장')) return '⭐';
    if (position?.includes('교사') || position?.includes('선생님')) return '📚';
    if (position?.includes('행정') || position?.includes('직원')) return '💼';
    return '👤';
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

  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    return phone;
  };

  const filterParticipants = (participants) => {
    return participants.filter(participant => {
      const matchesSearch = !searchTerm || 
        participant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.affiliation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.position?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRegion = selectedRegion === 'all' || participant.region === selectedRegion;
      const matchesAffiliation = selectedAffiliation === 'all' || participant.affiliation === selectedAffiliation;
      
      return matchesSearch && matchesRegion && matchesAffiliation;
    });
  };

  const renderAllParticipants = () => {
    const filteredParticipants = filterParticipants(allParticipants);
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredParticipants.map((participant) => (
          <div key={participant.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getPositionIcon(participant.position)}</span>
                  <h3 className="font-semibold text-gray-900 text-lg">{participant.name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-1">{participant.position || ''}</p>
                <p className="text-sm text-gray-600 mb-2">{participant.affiliation}</p>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getRegionColor(participant.region)}`}>
                  {participant.region}권역
                </span>
              </div>
            </div>
            {participant.phone && (
              <div className="text-xs text-gray-500">
                📞 {formatPhone(participant.phone)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderByRegion = () => {
    return (
      <div className="space-y-6">
        {Object.keys(participantsByRegion).sort().map(region => {
          const regionParticipants = filterParticipants(participantsByRegion[region]);
          if (regionParticipants.length === 0) return null;
          
          return (
            <div key={region} className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
                🏢 {region}권역 ({regionParticipants.length}명)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regionParticipants.map((participant) => (
                  <div key={participant.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{getPositionIcon(participant.position)}</span>
                          <h4 className="font-semibold text-gray-900">{participant.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{participant.position || ''}</p>
                        <p className="text-sm text-gray-600">{participant.affiliation}</p>
                      </div>
                    </div>
                    {participant.phone && (
                      <div className="text-xs text-gray-500">
                        📞 {formatPhone(participant.phone)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderByAffiliation = () => {
    return (
      <div className="space-y-6">
        {Object.keys(participantsByAffiliation).sort().map(affiliation => {
          const affiliationParticipants = filterParticipants(participantsByAffiliation[affiliation]);
          if (affiliationParticipants.length === 0) return null;
          
          return (
            <div key={affiliation} className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
                🏫 {affiliation} ({affiliationParticipants.length}명)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {affiliationParticipants.map((participant) => (
                  <div key={participant.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{getPositionIcon(participant.position)}</span>
                          <h4 className="font-semibold text-gray-900">{participant.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{participant.position || ''}</p>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getRegionColor(participant.region)}`}>
                          {participant.region}권역
                        </span>
                      </div>
                    </div>
                    {participant.phone && (
                      <div className="text-xs text-gray-500">
                        📞 {formatPhone(participant.phone)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">참가자 정보를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">👥 참가자</h2>
          <p className="text-gray-600 mt-1">
            총 {allParticipants.length}명의 참가자, {participantsByRegion ? Object.keys(participantsByRegion).length : 0}개 권역
          </p>
        </div>

      </div>

      {/* 검색 및 필터 */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="이름, 소속, 직책으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 권역</option>
            {[...Array(10)].map((_, i) => (
              <option key={i + 1} value={(i + 1).toString()}>{i + 1}권역</option>
            ))}
          </select>
          <select
            value={selectedAffiliation}
            onChange={(e) => setSelectedAffiliation(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 소속</option>
            {participantsByAffiliation && Object.keys(participantsByAffiliation).sort().map(affiliation => (
              <option key={affiliation} value={affiliation}>{affiliation}</option>
            ))}
          </select>
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
            👥 전체 보기
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

      {/* 참가자 목록 */}
      <div>
        {viewMode === 'all' && renderAllParticipants()}
        {viewMode === 'byRegion' && renderByRegion()}
        {viewMode === 'byAffiliation' && renderByAffiliation()}
      </div>

      {allParticipants && filterParticipants(allParticipants).length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">👥</div>
          <p className="text-gray-600">검색 조건에 맞는 참가자가 없습니다.</p>
        </div>
      )}
    </div>
  );
} 