import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useRef } from 'react'
import toast from 'react-hot-toast'

export default function FreeTimeGallery() {
  const router = useRouter()
  const { scheduleId } = router.query
  const [user, setUser] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [description, setDescription] = useState('')
  const [dayNumber, setDayNumber] = useState(1)
  const fileInputRef = useRef(null)
  const [scheduleInfo, setScheduleInfo] = useState(null)

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
    if (scheduleId) {
      loadPhotos()
      loadScheduleInfo()
    }
  }, [scheduleId])

  const loadScheduleInfo = async () => {
    try {
      // 일정 정보를 가져오는 로직
      const response = await fetch(`/api/schedules?id=${scheduleId}`)
      const data = await response.json()
      
      if (data.success && data.schedule) {
        setScheduleInfo({
          title: data.schedule.location || data.schedule.activity || '자유시간',
          date: data.schedule.date || new Date().toLocaleDateString('ko-KR'),
          time: data.schedule.time || '',
          description: data.schedule.description || ''
        })
      } else {
        // 기본 정보 설정
        setScheduleInfo({
          title: '자유시간',
          date: new Date().toLocaleDateString('ko-KR'),
          time: '',
          description: ''
        })
      }
    } catch (error) {
      console.error('일정 정보 로드 오류:', error)
      // 기본 정보 설정
      setScheduleInfo({
        title: '자유시간',
        date: new Date().toLocaleDateString('ko-KR'),
        time: '',
        description: ''
      })
    }
  }

  const loadPhotos = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/free-time-gallery?scheduleId=${scheduleId}`)
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
      formData.append('scheduleId', scheduleId)
      formData.append('scheduleTitle', scheduleInfo?.title || '자유시간')
      formData.append('scheduleDate', scheduleInfo?.date || new Date().toISOString().split('T')[0])
      formData.append('dayNumber', dayNumber)
      formData.append('description', description)

      const response = await fetch('/api/free-time-gallery', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        toast.success('사진이 성공적으로 업로드되었습니다!')
        setSelectedFile(null)
        setDescription('')
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
      const response = await fetch(`/api/free-time-gallery?scheduleId=${scheduleId}&photoId=${photoId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('사진이 삭제되었습니다!')
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🎯 {scheduleInfo?.title || '자유시간 갤러리'}
              </h1>
              {scheduleInfo?.date && (
                <p className="text-gray-600 mt-1">
                  📆 {scheduleInfo.date}
                  {scheduleInfo?.time && ` • ⏰ ${scheduleInfo.time}`}
                </p>
              )}
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← 뒤로가기
            </button>
          </div>
          
          {scheduleInfo?.description && (
            <div className="bg-purple-50 rounded-lg p-4 mb-4">
              <p className="text-gray-700">{scheduleInfo.description}</p>
            </div>
          )}
        </div>

        {/* 사진 갤러리 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">📸 사진 갤러리</h2>
          
          {/* 사진 업로드 */}
          <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors mb-4"
              >
                📷 사진 선택
              </button>
              
              {selectedFile && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">선택된 파일: {selectedFile.name}</p>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">일차 선택:</label>
                    <select
                      value={dayNumber}
                      onChange={(e) => setDayNumber(parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(day => (
                        <option key={day} value={day}>{day}일차</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="사진 설명을 입력하세요..."
                    className="w-full p-2 border border-gray-300 rounded-lg resize-none"
                    rows="3"
                  />
                  <button
                    onClick={handleUpload}
                    disabled={uploadingPhoto}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors mt-2 disabled:opacity-50"
                  >
                    {uploadingPhoto ? '업로드 중...' : '📤 업로드'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 사진 목록 */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">사진을 불러오는 중...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {photos.map((photo, index) => (
                <div key={photo.id || index} className="bg-gray-50 rounded-lg p-4">
                  <img
                    src={photo.imageUrl}
                    alt={`자유시간 사진 ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                  
                  {photo.description && (
                    <p className="text-sm text-gray-700 mb-3">{photo.description}</p>
                  )}
                  
                  <div className="text-xs text-gray-500 mb-3">
                    {formatDate(photo.uploadedAt || photo.uploadDate)}
                    {photo.dayNumber && (
                      <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                        {photo.dayNumber}일차
                      </span>
                    )}
                  </div>

                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition-colors"
                  >
                    🗑️ 삭제
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && photos.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📸</div>
              <p className="text-gray-600">아직 업로드된 사진이 없습니다</p>
              <p className="text-gray-500 mt-2">멋진 사진을 찍어서 업로드해보세요!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
