import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function Home() {
  const router = useRouter()
  const [loginMethod, setLoginMethod] = useState('simple') // simple 또는 email
  const [formData, setFormData] = useState({
    // 간편 로그인용
    affiliation: '',
    name: '',
    authKey: '',
    projectCode: 'PRAGUE2025',
    // 이메일 로그인용
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [availableProjects, setAvailableProjects] = useState([
    { code: 'PRAGUE2025', name: '2025 프라하 해외연수' },
    { code: 'BERLIN2025', name: '2025 베를린 문화교류' },
    { code: 'VIENNA2025', name: '2025 비엔나 예술기행' }
  ])

  useEffect(() => {
    // 이미 로그인된 경우 대시보드로 리다이렉트
    const userSession = localStorage.getItem('userSession')
    if (userSession) {
      router.push('/dashboard')
    }
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 로그인 방식에 따라 다른 데이터 전송
      const loginData = loginMethod === 'simple' 
        ? {
            affiliation: formData.affiliation,
            name: formData.name,
            authKey: formData.authKey,
            projectCode: formData.projectCode
          }
        : {
            email: formData.email,
            password: formData.password,
            projectCode: formData.projectCode
          }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...loginData,
          loginMethod: loginMethod
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        // 사용자 세션 저장
        localStorage.setItem('userSession', JSON.stringify(result.user))
        
        toast.success('로그인 성공!')
        
        // 역할에 따라 다른 페이지로 리다이렉트
        switch (result.user.role) {
          case 'guide':
            router.push('/guide')
            break
          default:
            router.push('/dashboard')
        }
      } else {
        toast.error(result.error || '로그인에 실패했습니다.')
      }
    } catch (error) {
      toast.error('로그인 중 오류가 발생했습니다.')
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            🌍 국외 연수 플랫폼
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            로그인 방식을 선택하고 정보를 입력하세요
          </p>
        </div>

        {/* 로그인 방식 선택 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setLoginMethod('simple')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                loginMethod === 'simple'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🚀 간편 로그인
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                loginMethod === 'email'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📧 이메일 로그인
            </button>
          </div>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            
            {/* 프로젝트 선택 (공통) */}
            <div>
              <label htmlFor="projectCode" className="block text-sm font-medium text-gray-700">
                연수 프로젝트
              </label>
              <select
                id="projectCode"
                name="projectCode"
                value={formData.projectCode}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {availableProjects.map((project) => (
                  <option key={project.code} value={project.code}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 간편 로그인 필드 */}
            {loginMethod === 'simple' && (
              <>
                <div>
                  <label htmlFor="affiliation" className="block text-sm font-medium text-gray-700">
                    소속
                  </label>
                  <input
                    id="affiliation"
                    name="affiliation"
                    type="text"
                    required
                    value={formData.affiliation}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="예: 한국교육대학교"
                  />
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    이름
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="참가자 성명"
                  />
                </div>

                <div>
                  <label htmlFor="authKey" className="block text-sm font-medium text-gray-700">
                    인증 키
                  </label>
                  <input
                    id="authKey"
                    name="authKey"
                    type="text"
                    required
                    value={formData.authKey}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="관리자가 제공한 인증키 입력"
                  />
                </div>
              </>
            )}

            {/* 이메일 로그인 필드 */}
            {loginMethod === 'email' && (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    이메일
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    비밀번호
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="비밀번호"
                  />
                </div>
              </>
            )}

          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white transition-all ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 hover:scale-105'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  로그인 중...
                </div>
              ) : (
                <span className="flex items-center">
                  {loginMethod === 'simple' ? '🚀' : '📧'} 로그인
                </span>
              )}
            </button>
          </div>

          {/* 로그인 방식 설명 */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-700">
              {loginMethod === 'simple' ? (
                <div>
                  <strong>💡 간편 로그인:</strong> 소속, 이름, 인증키만으로 쉽게 로그인할 수 있습니다.
                  <br />관리자가 제공한 인증키를 입력하세요.
                </div>
              ) : (
                <div>
                  <strong>💡 이메일 로그인:</strong> 등록된 이메일과 비밀번호로 로그인합니다.
                  <br />보다 안전한 인증 방식입니다.
                </div>
              )}
            </div>
          </div>
        </form>

        {/* 관리자 로그인 링크 */}
        <div className="text-center">
          <Link href="/admin/login">
            <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
              🔧 관리자 로그인
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
