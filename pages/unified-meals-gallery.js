import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useRef } from 'react'
import toast from 'react-hot-toast'

export default function UnifiedMealsGallery() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [description, setDescription] = useState('')
  const [mealType, setMealType] = useState('기타')
  const [mealDate, setMealDate] = useState('')
  const [location, setLocation] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    // 사용자 세션 확인
    const userSession = localStorage.getItem('userSession')
    if (!userSession) {
      router.push('/')
      return
    }

    try {
      const userData = JSON.parse(userSession)
      setUser(userData)
    } catch (error) {
      console.error('세션 로드 오류:', error)
      router.push('/')
    }
  }, [router])

  useEffect(() => {
    loadPhotos()
    // 오늘 날짜를 기본값으로 설정
    setMealDate(new Date().toISOString().split('T')[0])
  }, [])

  const loadPhotos = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/unified-meals-gallery')
      const data = await response.json()
      
      if (data.success) {
        setPhotos(data.photos || [])
      }
    } catch (error) {
      console.error('사진 로드 오류:', error)
      toast.error('사진을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB 제한
        toast.error('파일 크기는 10MB 이하여야 합니다.')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('업로드할 파일을 선택해주세요.')
      return
    }

    try {
      setUploadingPhoto(true)
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('userData', JSON.stringify(user))
      formData.append('mealType', mealType)
      formData.append('mealDate', mealDate)
      formData.append('location', location)
      formData.append('description', description)

      const response = await fetch('/api/unified-meals-gallery', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        toast.success('사진이 성공적으로 업로드되었습니다!')
        setSelectedFile(null)
        setDescription('')
        setLocation('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        loadPhotos() // 사진 목록 새로고침
      } else {
        toast.error(data.error || '업로드 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('업로드 오류:', error)
      toast.error('업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDelete = async (photoId) => {
    if (!confirm('정말로 이 사진을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/unified-meals-gallery?id=${photoId}&userData=${JSON.stringify(user)}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('사진이 삭제되었습니다.')
        loadPhotos() // 사진 목록 새로고침
      } else {
        toast.error(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('삭제 오류:', error)
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 식사 타입별로 사진 그룹화
  const photosByMealType = photos.reduce((acc, photo) => {
    const type = photo.mealType || '기타'
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(photo)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg">갤러리를 불러오는 중...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                🍽️ 통합 식사 갤러리
              </h1>
              <p className="text-gray-600">
                모든 식사 사진을 한 곳에서 관리 • {photos.length}개의 사진
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← 뒤로가기
            </button>
          </div>
        </div>

        {/* 업로드 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📸 사진 업로드</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사진 선택
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                식사 타입
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="아침">아침</option>
                <option value="점심">점심</option>
                <option value="저녁">저녁</option>
                <option value="간식">간식</option>
                <option value="기타">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                식사 날짜
              </label>
              <input
                type="date"
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                장소 (선택사항)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="식사한 장소를 입력하세요..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명 (선택사항)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="사진에 대한 설명을 입력하세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
          <div className="mt-4">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploadingPhoto}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
            >
              {uploadingPhoto ? '업로드 중...' : '📤 업로드'}
            </button>
          </div>
        </div>

        {/* 사진 그리드 - 식사 타입별로 그룹화 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📷 업로드된 사진들</h2>
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🍽️</div>
              <p className="text-gray-600 text-lg">아직 업로드된 사진이 없습니다</p>
              <p className="text-gray-500 mt-2">맛있는 식사 사진을 찍어서 업로드해보세요!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.keys(photosByMealType).sort().map(mealType => (
                <div key={mealType}>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {mealType === '아침' ? '🌅' : mealType === '점심' ? '☀️' : mealType === '저녁' ? '🌙' : mealType === '간식' ? '🍪' : '🍽️'} {mealType}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {photosByMealType[mealType].map((photo) => (
                      <div key={photo.id} className="bg-gray-50 rounded-lg p-4 border">
                        <div className="relative mb-3">
                          <img
                            src={photo.imageUrl}
                            alt="식사 사진"
                            className="w-full h-48 object-cover rounded-lg"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NzM4NyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfkqE8L3RleHQ+PC9zdmc+'
                            }}
                          />
                          {(user?.id === photo.uploadedBy?.id || user?.role === 'admin') && (
                            <button
                              onClick={() => handleDelete(photo.id)}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full text-xs"
                              title="삭제"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {photo.uploadedBy?.name || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(photo.uploadedAt)}
                            </span>
                          </div>
                          {photo.location && (
                            <p className="text-xs text-gray-500">
                              📍 {photo.location}
                            </p>
                          )}
                          {photo.description && (
                            <p className="text-sm text-gray-700">
                              {photo.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



