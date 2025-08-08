import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function Home() {
  const router = useRouter()
  const [loginMethod, setLoginMethod] = useState('participant') // participant, email
  const [formData, setFormData] = useState({
    // 참가자 로그인용
    region: '',
    school: '',
    name: '',
    authKey: '',
    teamCode: '',
    // 이메일 로그인용
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [availableTeams, setAvailableTeams] = useState([
    { code: 'PRAGUE2025', name: '2025 프라하 해외연수' },
    { code: 'BERLIN2025', name: '2025 베를린 문화교류' },
    { code: 'VIENNA2025', name: '2025 비엔나 예술기행' }
  ])
  const [regions] = useState([
    '수도권', '강원권', '충청권', '전라권', '경상권', '제주권'
  ])

  useEffect(() => {
    // 이미 로그인된 경우 대시보드로 리다이렉트
    const userSession = localStorage.getItem('userSession')
    if (userSession) {
      router.push('/dashboard')
    }
  }, [router])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 로그인 방식에 따라 다른 데이터 전송
      const loginData = loginMethod === 'participant' 
        ? {
            region: formData.region,
            school: formData.school,
            name: formData.name,
            authKey: formData.authKey,
            teamCode: formData.teamCode,
            loginType: 'participant'
          }
        : {
            email: formData.email,
            password: formData.password,
            teamCode: formData.teamCode,
            loginType: 'email'
          }

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...loginData,
          loginMethod
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 로그인 성공
        localStorage.setItem('userSession', JSON.stringify(data.user))
        toast.success('로그인 성공!')
        router.push('/dashboard')
      } else {
        // 로그인 실패
        toast.error(data.message || '로그인에 실패했습니다.')
      }
    } catch (error) {
      console.error('로그인 오류:', error)
      toast.error('로그인 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                🌏 국외연수 플랫폼
              </h1>
            </div>
            <Link
              href="/admin/login"
              className="text-sm text-gray-600 hover:text-blue-600 underline"
            >
              관리자 접속
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto pt-8 pb-16 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인</h2>
            <p className="text-gray-600">연수 프로그램에 참여하세요</p>
          </div>

          {/* Login Method Toggle */}
          <div className="mb-6">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setLoginMethod('participant')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'participant'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                참가자 로그인
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'email'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                이메일 로그인
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Team Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                참여 팀 / 프로젝트
              </label>
              <select
                name="teamCode"
                value={formData.teamCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">팀을 선택하세요</option>
                {availableTeams.map(team => (
                  <option key={team.code} value={team.code}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Participant Login Fields */}
            {loginMethod === 'participant' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    권역
                  </label>
                  <select
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">권역을 선택하세요</option>
                    {regions.map(region => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    소속 학교 (예: 서울청, 부산초, 대구고 등)
                  </label>
                  <input
                    type="text"
                    name="school"
                    value={formData.school}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 서울교육청, 부산초등학교, 대구고등학교"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이름
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="성명을 입력하세요"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    인증키
                  </label>
                  <input
                    type="password"
                    name="authKey"
                    value={formData.authKey}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="관리자로부터 받은 인증키를 입력하세요"
                    required
                  />
                </div>
              </>
            )}

            {/* Email Login Fields */}
            {loginMethod === 'email' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이메일
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="이메일을 입력하세요"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="비밀번호를 입력하세요"
                    required
                  />
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  로그인 중...
                </div>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              문제가 있으신가요?{' '}
              <button className="text-blue-600 hover:underline">
                관리자에게 문의
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-600 text-sm">
              © 2025 국외연수 플랫폼. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
