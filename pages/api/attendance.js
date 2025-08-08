import { db } from '../../firebaseConfig';
import { doc, runTransaction, getDoc, setDoc } from 'firebase/firestore';

const ATTENDANCE_SCORE = 10;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { userId, date } = req.query;
    if (!userId || !date) {
      return res.status(400).json({ success: false, error: 'User ID and date are required.' });
    }

    try {
      const attendanceRef = doc(db, 'attendance', `${userId}_${date}`);
      const attendanceDoc = await getDoc(attendanceRef);

      if (attendanceDoc.exists()) {
        res.status(200).json({ success: true, attended: true });
      } else {
        res.status(200).json({ success: true, attended: false });
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }

  } else if (req.method === 'POST') {
    const { userId, date, userData } = req.body;
    if (!userId || !date || !userData) {
      return res.status(400).json({ success: false, error: 'User ID, date, and userData are required.' });
    }

    try {
      await runTransaction(db, async (transaction) => {
        const attendanceRef = doc(db, 'attendance', `${userId}_${date}`);
        const rankingRef = doc(db, 'rankings', userId);

        const attendanceDoc = await transaction.get(attendanceRef);
        if (attendanceDoc.exists()) {
          throw new Error('Already attended.');
        }

        const rankingDoc = await transaction.get(rankingRef);
        const currentData = rankingDoc.data() || {};

        transaction.set(attendanceRef, {
          userId,
          date,
          attendedAt: new Date().toISOString(),
        });

        transaction.set(rankingRef, {
            ...currentData,
            totalScore: (currentData.totalScore || 0) + ATTENDANCE_SCORE,
            attendance: (currentData.attendance || 0) + 1,
            name: currentData.name || userData.name,
            region: currentData.region || userData.region,
            affiliation: currentData.affiliation || userData.affiliation,
        }, { merge: true });
      });

      res.status(200).json({ success: true, message: 'Attendance recorded successfully.' });
    } catch (error) {
      console.error('Error recording attendance:', error);
      if (error.message === 'Already attended.') {
        return res.status(409).json({ success: false, error: 'Already attended today.' });
      }
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
