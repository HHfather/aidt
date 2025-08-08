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

    let userQuery
    let userSnapshot

    if (loginType === 'participant') {
      const { region, school, name, authKey } = loginData

      // 참가자 정보 검증
      if (!region || !school || !name || !authKey) {
        return res.status(400).json({ 
          success: false, 
          message: '모든 필드를 입력해주세요.' 
        })
      }

      // 팀별 참가자 컬렉션에서 검색
      const participantsRef = collection(db, `teams_${teamCode}_participants`)
      userQuery = query(
        participantsRef,
        where('region', '==', region),
        where('school', '==', school),
        where('name', '==', name),
        where('authKey', '==', authKey)
      )

      userSnapshot = await getDocs(userQuery)

      if (userSnapshot.empty) {
        return res.status(401).json({ 
          success: false, 
          message: '참가자 정보가 일치하지 않습니다. 권역, 학교명, 이름, 인증키를 확인해주세요.' 
        })
      }

      const userData = userSnapshot.docs[0].data()
      const user = {
        id: userSnapshot.docs[0].id,
        name: userData.name,
        region: userData.region,
        school: userData.school,
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

      // 팀별 사용자 컬렉션에서 검색
      const usersRef = collection(db, `teams_${teamCode}_users`)
      userQuery = query(
        usersRef,
        where('email', '==', email),
        where('password', '==', password) // 실제로는 해시된 비밀번호와 비교해야 함
      )

      userSnapshot = await getDocs(userQuery)

      if (userSnapshot.empty) {
        return res.status(401).json({ 
          success: false, 
          message: '이메일 또는 비밀번호가 일치하지 않습니다.' 
        })
      }

      const userData = userSnapshot.docs[0].data()
      const user = {
        id: userSnapshot.docs[0].id,
        name: userData.name,
        email: userData.email,
        teamCode: teamCode,
        loginType: 'email',
        role: userData.role || 'participant'
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
