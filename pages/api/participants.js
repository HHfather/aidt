import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

async function getScheduleDocRef(region) {
    const regionFormats = [
        String(region),
        Number(region),
        `${region}권역`,
        `region_${region}`
    ];
    
    for (const format of regionFormats) {
        const q = query(collection(db, 'schedules'), where('region', '==', format));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return snapshot.docs[0].ref;
        }
    }
    return null;
}

export default async function handler(req, res) {
    const { region } = req.query;

    if (!region) {
        return res.status(400).json({ success: false, error: 'Region is required.' });
    }

    if (req.method === 'GET') {
        try {
            const scheduleDocRef = await getScheduleDocRef(region);
            if (!scheduleDocRef) {
                return res.status(404).json({ success: false, error: 'Schedule for the region not found.' });
            }
            const scheduleDoc = await getDocs(query(collection(db, 'schedules'), where('__name__', '==', scheduleDocRef.id)));
            const scheduleData = scheduleDoc.docs[0].data();

            return res.status(200).json({ success: true, data: scheduleData.participants || [] });
        } catch (error) {
            console.error("Error fetching participants:", error);
            return res.status(500).json({ success: false, error: 'Failed to fetch participants.' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { userId, userName, affiliation, phone } = req.body;
            if (!userId || !phone) {
                return res.status(400).json({ success: false, error: 'User ID and phone number are required.' });
            }

            const scheduleDocRef = await getScheduleDocRef(region);
            if (!scheduleDocRef) {
                return res.status(404).json({ success: false, error: 'Schedule for the region not found.' });
            }
            const scheduleDoc = await getDocs(query(collection(db, 'schedules'), where('__name__', '==', scheduleDocRef.id)));
            const participants = scheduleDoc.docs[0].data().participants || [];

            // 기존 참여자 정보 찾기
            const oldParticipant = participants.find(p => p.id === userId);
            
            if (oldParticipant) {
                // 기존 정보가 있으면 먼저 제거
                await updateDoc(scheduleDocRef, {
                    participants: arrayRemove(oldParticipant)
                });
            }

            // 새 정보 추가 (이름, 소속은 기존 값 유지 또는 새로 받은 값 사용)
            const newParticipant = {
                id: userId,
                name: oldParticipant?.name || userName,
                affiliation: oldParticipant?.affiliation || affiliation,
                phone: phone // 새 핸드폰 번호
            };
            
            await updateDoc(scheduleDocRef, {
                participants: arrayUnion(newParticipant)
            });

            return res.status(200).json({ success: true, message: 'Phone number updated successfully.' });

        } catch (error) {
            console.error("Error updating phone number:", error);
            return res.status(500).json({ success: false, error: 'Failed to update phone number.' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
