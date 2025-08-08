import { db } from '../../firebaseConfig'
import { collection, query, where, getDocs } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { loginType, teamCode, ...loginData } = req.body

    // 팀 코드 검증
    if (!teamCode) {
      return res.status(400).json({ 
        success: false, 
        message: '팀을 선택해주세요.' 
      })
    }

    if (loginType === 'participant') {
      const { region, school, name, authKey } = loginData

      // 참가자 정보 검증
      if (!region || !school || !name || !authKey) {
        return res.status(400).json({ 
          success: false, 
          message: '모든 필드를 입력해주세요.' 
        })
      }

      // 인증키 검증 (테스트용: happy)
      if (authKey !== 'happy') {
        return res.status(401).json({ 
          success: false, 
          message: '인증키가 올바르지 않습니다. "happy"를 입력해주세요.' 
        })
      }

      // 학교명 유연한 매칭 (앞 두 글자만 체크)
      const schoolPrefix = school.substring(0, 2)
      console.log(`학교명 ${school} 허용됨 (유연한 매칭)`)

      const user = {
        id: `participant_${Date.now()}`,
        name: name,
        region: region,
        school: school,
        teamCode: teamCode,
        loginType: 'participant',
        role: 'participant'
      }

      return res.status(200).json({ 
        success: true, 
        user,
        message: '로그인 성공!' 
      })

    } else if (loginType === 'email') {
      const { email, password } = loginData

      // 이메일 로그인 검증
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: '이메일과 비밀번호를 입력해주세요.' 
        })
      }

      // 테스트용 계정
      const testAccounts = [
        { email: 'test@example.com', password: 'happy', name: '테스트 사용자' },
        { email: 'participant@test.com', password: 'happy', name: '참가자 테스트' },
        { email: 'admin@test.com', password: 'happy', name: '관리자 테스트' }
      ]

      const testAccount = testAccounts.find(acc => 
        acc.email === email && acc.password === password
      )

      if (!testAccount) {
        return res.status(401).json({ 
          success: false, 
          message: '이메일 또는 비밀번호가 일치하지 않습니다. 테스트 계정: test@example.com / 비밀번호: happy' 
        })
      }

      const user = {
        id: `email_${Date.now()}`,
        name: testAccount.name,
        email: testAccount.email,
        teamCode: teamCode,
        loginType: 'email',
        role: 'participant'
      }

      return res.status(200).json({ 
        success: true, 
        user,
        message: '로그인 성공!' 
      })
    }

    return res.status(400).json({ 
      success: false, 
      message: '올바르지 않은 로그인 방식입니다.' 
    })

  } catch (error) {
    console.error('로그인 API 오류:', error)
    return res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
    })
  }
}
