import { db } from '../../../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { password, region } = req.body;

  if (!password || !region) {
    return res.status(400).json({ 
      success: false, 
      error: '비밀번호와 권역을 모두 입력해주세요.' 
    });
  }

  try {
    // 환경변수에서 비밀번호 가져오기 (기본값: 12311!!)
    const expectedPassword = process.env.ADMIN_PASSWORD || '12311!!';

    if (password.trim() === expectedPassword.trim()) {
      const adminInfo = {
        id: 'admin',
        region: region || '1', // 권역이 없으면 기본값 1
        role: 'admin',
        name: '관리자'
      };

      return res.status(200).json({ 
        success: true, 
        message: '관리자 로그인 성공',
        admin: adminInfo,
        region: region || '1'
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        error: '비밀번호가 올바르지 않습니다.' 
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
  }
}
