import { db } from '../../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  const { name, affiliation, region, authKey } = req.body;
  if (!name || !affiliation || !region || !authKey) {
    return res.status(400).json({ success: false, error: '모든 필드를 입력해주세요.' });
  }
  try {
    const schedulesCol = collection(db, 'schedules');
    const schedulesSnapshot = await getDocs(schedulesCol);
    let foundUser = null;
    schedulesSnapshot.forEach((doc) => {
      const data = doc.data();
      Object.values(data).forEach((item) => {
        if (Array.isArray(item)) {
          item.forEach((person) => {
            const dbName = (person.name || '').trim().toLowerCase();
            const dbAff = (person.affiliation || '').trim().toLowerCase();
            const dbRegion = (person.region || '').trim().replace(/[^0-9]/g, '');
            const inputName = name.trim().toLowerCase();
            const inputAff = affiliation.trim().toLowerCase();
            const inputRegion = region.trim().replace(/[^0-9]/g, '');
            const inputKey = authKey.trim();
            if (
              dbName === inputName &&
              dbAff === inputAff &&
              dbRegion === inputRegion &&
              inputKey === 'happy'
            ) {
              foundUser = person;
            }
          });
        }
      });
    });
    if (foundUser) {
      return res.status(200).json({
        success: true,
        user: {
          id: `${foundUser.region}_${Date.now()}_${foundUser.name}`,
          name: foundUser.name,
          affiliation: foundUser.affiliation,
          region: foundUser.region,
          team: '기본팀',
          isUser: true,
          currentProject: {
            participantAuthKey: authKey,
            assignments: '',
            createdBy: 'admin',
            schedule: [],
            guideAuthKey: 'lucky',
            isDeleted: false,
            projectName: `${foundUser.region} 연수`,
            id: `${foundUser.region}_${Date.now()}`,
            region: foundUser.region?.replace(/[^0-9]/g, '') || '1',
            title: `${foundUser.region} 연수`,
            participants: [
              { name: foundUser.name, region: '', affiliation: foundUser.affiliation }
            ]
          },
          loginTime: new Date().toISOString()
        }
      });
    } else {
      return res.status(401).json({ success: false, error: '입력하신 정보가 연수 참여자 명단과 일치하지 않거나 인증키가 올바르지 않습니다.' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: '서버 오류' });
  }
}