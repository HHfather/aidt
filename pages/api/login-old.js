// 로그인 API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const { loginMethod, affiliation, name, authKey, email, password, projectCode } = req.body

  try {
    // 간편 로그인 처리
    if (loginMethod === 'simple') {
      // 테스트용 간단한 인증
      if (authKey === 'admin123') {
        return res.status(200).json({
          success: true,
          message: '관리자 로그인 성공',
          user: {
            id: 'admin',
            name: name || '관리자',
            role: 'admin',
            affiliation: affiliation || '관리자',
            projectCode,
            team: 'A팀',
            currentProject: {
              id: projectCode,
              name: projectCode === 'PRAGUE2025' ? '2025 프라하 해외연수' : 
                    projectCode === 'BERLIN2025' ? '2025 베를린 문화교류' : 
                    '2025 비엔나 예술기행',
              code: projectCode
            }
          },
          token: 'admin-token-' + Date.now()
        })
      } else if (authKey === 'user123') {
        return res.status(200).json({
          success: true,
          message: '사용자 로그인 성공',
          user: {
            id: 'user_' + Date.now(),
            name: name || '사용자',
            role: 'participant',
            affiliation: affiliation || '참가자',
            projectCode,
            team: 'A팀',
            currentProject: {
              id: projectCode,
              name: projectCode === 'PRAGUE2025' ? '2025 프라하 해외연수' : 
                    projectCode === 'BERLIN2025' ? '2025 베를린 문화교류' : 
                    '2025 비엔나 예술기행',
              code: projectCode
            }
          },
          token: 'user-token-' + Date.now()
        })
      } else {
        return res.status(401).json({
          success: false,
          message: '인증키가 올바르지 않습니다. 테스트용: admin123 (관리자) 또는 user123 (참가자)'
        })
      }
    }

    // 이메일 로그인 처리
    if (loginMethod === 'email') {
      if (email === 'admin@test.com' && password === 'admin123') {
        return res.status(200).json({
          success: true,
          message: '관리자 로그인 성공',
          user: {
            id: 'admin',
            name: '관리자',
            role: 'admin',
            email: email,
            projectCode,
            team: 'A팀',
            currentProject: {
              id: projectCode,
              name: projectCode === 'PRAGUE2025' ? '2025 프라하 해외연수' : 
                    projectCode === 'BERLIN2025' ? '2025 베를린 문화교류' : 
                    '2025 비엔나 예술기행',
              code: projectCode
            }
          },
          token: 'admin-token-' + Date.now()
        })
      } else if (email === 'user@test.com' && password === 'user123') {
        return res.status(200).json({
          success: true,
          message: '사용자 로그인 성공',
          user: {
            id: 'user_' + Date.now(),
            name: '테스트 사용자',
            role: 'participant',
            email: email,
            projectCode,
            team: 'A팀',
            currentProject: {
              id: projectCode,
              name: projectCode === 'PRAGUE2025' ? '2025 프라하 해외연수' : 
                    projectCode === 'BERLIN2025' ? '2025 베를린 문화교류' : 
                    '2025 비엔나 예술기행',
              code: projectCode
            }
          },
          token: 'user-token-' + Date.now()
        })
      } else {
        return res.status(401).json({
          success: false,
          message: '이메일 또는 비밀번호가 올바르지 않습니다. 테스트용: admin@test.com/admin123 또는 user@test.com/user123'
        })
      }
    }

    return res.status(400).json({
      success: false,
      message: '잘못된 로그인 방식입니다.'
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    })
  }
}
