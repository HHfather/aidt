import { createContext, useContext, useState, useEffect } from 'react'
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth'
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc 
} from 'firebase/firestore'
import { auth, db } from '../firebaseConfig'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Firestore에서 사용자 추가 정보 가져오기
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userDoc.data()
            })
          }
        } catch (error) {
          console.error('사용자 정보 로드 실패:', error)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  // 일반 참여자/가이드 로그인
  const login = async (affiliation, name, authKey) => {
    try {
      // Firestore에서 사용자 정보 확인
      const usersRef = collection(db, 'users')
      const q = query(
        usersRef, 
        where('affiliation', '==', affiliation),
        where('name', '==', name)
      )
      
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        return {
          success: false,
          error: '등록되지 않은 사용자입니다.'
        }
      }

      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()

      // 프로젝트 인증키 확인
      const projectsRef = collection(db, 'projects')
      const projectQuery = query(projectsRef, where('authKey', '==', authKey))
      const projectSnapshot = await getDocs(projectQuery)

      if (projectSnapshot.empty) {
        return {
          success: false,
          error: '올바르지 않은 연수 비밀번호입니다.'
        }
      }

      const projectData = projectSnapshot.docs[0].data()

      // 로그인 성공 시 사용자 정보 설정
      setUser({
        uid: userDoc.id,
        ...userData,
        currentProject: {
          id: projectSnapshot.docs[0].id,
          ...projectData
        }
      })

      return {
        success: true,
        user: {
          ...userData,
          currentProject: {
            id: projectSnapshot.docs[0].id,
            ...projectData
          }
        }
      }

    } catch (error) {
      console.error('로그인 오류:', error)
      return {
        success: false,
        error: '로그인 중 오류가 발생했습니다.'
      }
    }
  }

  // 관리자 로그인 (Firebase Auth 사용)
  const adminLogin = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      return { success: true, user: result.user }
    } catch (error) {
      return {
        success: false,
        error: '관리자 로그인에 실패했습니다.'
      }
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      setUser(null)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: '로그아웃에 실패했습니다.'
      }
    }
  }

  const value = {
    user,
    loading,
    login,
    adminLogin,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
