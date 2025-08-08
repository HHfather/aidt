import { db } from '../../firebaseConfig';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      console.log('전체 참가자 목록 조회 요청');

      // 모든 권역의 참가자를 가져오기 (인덱스 오류 방지를 위해 단순 쿼리 사용)
      const participantsQuery = query(collection(db, 'participants'));
      
      const participantsSnapshot = await getDocs(participantsQuery);
      const allParticipants = participantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 권역별로 그룹화
      const participantsByRegion = {};
      const processedParticipants = [];

      allParticipants.forEach(participant => {
        // 삭제된 참가자 제외
        if (participant.isDeleted) return;

        const region = participant.region;
        if (!participantsByRegion[region]) {
          participantsByRegion[region] = [];
        }

        const participantData = {
          id: participant.id,
          region: region,
          name: participant.name,
          affiliation: participant.affiliation || participant.school || '',
          position: participant.position || '',
          phone: participant.phone || '',
          email: participant.email || '',
          role: participant.role || 'participant',
          createdAt: participant.createdAt,
          updatedAt: participant.updatedAt
        };

        participantsByRegion[region].push(participantData);
        processedParticipants.push(participantData);
      });

      // 각 권역의 참가자를 이름순으로 정렬
      Object.keys(participantsByRegion).forEach(region => {
        participantsByRegion[region].sort((a, b) => 
          a.name.localeCompare(b.name, 'ko')
        );
      });

      // 전체 참가자를 이름순으로 정렬
      processedParticipants.sort((a, b) => 
        a.name.localeCompare(b.name, 'ko')
      );

      // 소속별로 그룹화
      const participantsByAffiliation = {};
      processedParticipants.forEach(participant => {
        const affiliation = participant.affiliation || '소속 정보 없음';
        if (!participantsByAffiliation[affiliation]) {
          participantsByAffiliation[affiliation] = [];
        }
        participantsByAffiliation[affiliation].push(participant);
      });

      // 소속별로 정렬
      Object.keys(participantsByAffiliation).forEach(affiliation => {
        participantsByAffiliation[affiliation].sort((a, b) => 
          a.name.localeCompare(b.name, 'ko')
        );
      });

      console.log(`전체 참가자 조회 완료: ${processedParticipants.length}명, ${Object.keys(participantsByRegion).length}개 권역`);

      res.status(200).json({ 
        success: true, 
        totalParticipants: processedParticipants.length,
        totalRegions: Object.keys(participantsByRegion).length,
        participants: processedParticipants,
        participantsByRegion: participantsByRegion,
        participantsByAffiliation: participantsByAffiliation
      });
    } catch (error) {
      console.error('전체 참가자 조회 오류:', error);
      res.status(500).json({ success: false, error: '전체 참가자 조회 중 오류가 발생했습니다.' });
    }
  } else {
    res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' });
  }
} 