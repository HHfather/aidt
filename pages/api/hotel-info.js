import { db } from '../../firebaseConfig'
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { region, date, hotelName, hotelAddress, lat, lng } = req.body

      if (!region || !date || !hotelName || !hotelAddress) {
        return res.status(400).json({
          success: false,
          error: '필수 정보가 누락되었습니다.'
        })
      }

      // 숙소 정보 저장
      const hotelRef = doc(db, 'hotelInfo', `${region}_${date}`)
      await setDoc(hotelRef, {
        region,
        date,
        hotelName,
        hotelAddress,
        lat,
        lng,
        updatedAt: new Date().toISOString()
      })

      res.status(200).json({
        success: true,
        message: '숙소 정보가 저장되었습니다.'
      })
    } catch (error) {
      console.error('숙소 정보 저장 오류:', error)
      res.status(500).json({
        success: false,
        error: '숙소 정보 저장 중 오류가 발생했습니다.'
      })
    }
  } else if (req.method === 'GET') {
    try {
      const { region, date } = req.query

      if (!region || !date) {
        return res.status(400).json({
          success: false,
          error: '필수 정보가 누락되었습니다.'
        })
      }

      // 숙소 정보 조회
      const hotelRef = doc(db, 'hotelInfo', `${region}_${date}`)
      const hotelDoc = await getDoc(hotelRef)

      if (hotelDoc.exists()) {
        res.status(200).json({
          success: true,
          data: hotelDoc.data()
        })
      } else {
        res.status(200).json({
          success: false,
          data: null,
          message: '숙소 정보를 찾을 수 없습니다.'
        })
      }
    } catch (error) {
      console.error('숙소 정보 조회 오류:', error)
      res.status(500).json({
        success: false,
        error: '숙소 정보 조회 중 오류가 발생했습니다.'
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { region, date } = req.query;

      if (!region || !date) {
        return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' });
      }

      const hotelRef = doc(db, 'hotelInfo', `${region}_${date}`);
      await deleteDoc(hotelRef);

      res.status(200).json({ success: true, message: '숙소 정보가 삭제되었습니다.' });
    } catch (error) {
      console.error('숙소 정보 삭제 오류:', error);
      res.status(500).json({ success: false, error: '숙소 정보 삭제 중 오류가 발생했습니다.' });
    }
  } else {
    res.status(405).json({
      success: false,
      error: '허용되지 않는 메서드입니다.'
    })
  }
} 