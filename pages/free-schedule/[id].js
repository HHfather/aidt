import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { Toaster, toast } from 'react-hot-toast'
import { db } from '../../firebaseConfig'
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, updateDoc } from 'firebase/firestore'

export default function FreeScheduleGallery() {
  const router = useRouter()
  const { id } = router.query
  const [loading, setLoading] = useState(true)
  const [freeSchedule, setFreeSchedule] = useState(null)
  const [images, setImages] = useState([])
  const [userData, setUserData] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [showComments, setShowComments] = useState({})
  const [showEmojiPicker, setShowEmojiPicker] = useState({})
  const [imageEmojis, setImageEmojis] = useState({})
  const [highlightedImage, setHighlightedImage] = useState(null)

  useEffect(() => {
    const checkAuth = () => {
      const session = localStorage.getItem('userSession')
      if (!session) {
        router.push('/')
        return
      }

      try {
        const userData = JSON.parse(session)
        setUserData(userData)
        console.log('사용자 데이터 설정됨:', userData)
        return userData
      } catch (error) {
        console.error('세션 파싱 오류:', error)
        localStorage.removeItem('userSession')
        router.push('/')
        return null
      }
    }

    let timeoutId = null

    if (id) {
      console.log('free-schedule ID 변경됨:', id)
      const userData = checkAuth()
      if (userData) {
        timeoutId = setTimeout(() => {
          loadFreeScheduleData(userData)
        }, 100)
      }
    }

    // URL 파라미터에서 하이라이트 이미지 ID 확인
    const urlParams = new URLSearchParams(window.location.search)
    const highlightId = urlParams.get('highlight')
    if (highlightId) {
      setHighlightedImage(highlightId)
      console.log('하이라이트 이미지 ID:', highlightId)
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [id, router])

  const loadFreeScheduleData = async (userDataParam = userData) => {
    try {
      setLoading(true)
      
      if (!userDataParam?.region) {
        throw new Error('사용자 권역 정보가 없습니다.')
      }
      
      console.log('Loading free schedule data for region:', userDataParam.region, 'ID:', id)
      
      // 자유일정 정보 설정
      const freeScheduleData = {
        id: id,
        date: '2025-08-05', // 기본 날짜
        time: '자유 시간',
        activity: '🗓️ 자유 일정 - 개인 탐방',
        location: '엘시티 레지던스',
        description: '개인 또는 팀별로 자유롭게 계획할 수 있는 시간입니다. 주변 관광지, 맛집, 쇼핑 등을 자유롭게 탐방하세요.',
        details: ['개인 탐방 및 관광', '현지 맛집 방문', '쇼핑 및 문화체험', '휴식 및 사진 촬영']
      }
      
      setFreeSchedule(freeScheduleData)
      await loadGalleryImages()
      
    } catch (error) {
      console.error('자유일정 데이터 로드 오류:', error)
      toast.error('자유일정 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadGalleryImages = async () => {
    try {
      const imagesRef = collection(db, 'free-schedule-gallery')
      const q = query(imagesRef, where('scheduleId', '==', id), orderBy('uploadTime', 'desc'))
      const querySnapshot = await getDocs(q)
      
      const imagesData = []
      querySnapshot.forEach((doc) => {
        imagesData.push({
          id: doc.id,
          ...doc.data()
        })
      })
      
      setImages(imagesData)
      console.log('자유일정 갤러리 이미지 로드됨:', imagesData.length)
    } catch (error) {
      console.error('갤러리 이미지 로드 오류:', error)
      toast.error('갤러리 이미지를 불러오는 중 오류가 발생했습니다.')
    }
  }

  const handleImageUpload = async (files) => {
    if (!userData) {
      toast.error('사용자 정보가 없습니다.')
      return
    }

    setUploading(true)
    const uploadPromises = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} 파일이 너무 큽니다. (최대 10MB)`)
        continue
      }

      const uploadPromise = new Promise(async (resolve, reject) => {
        try {
          const timestamp = Date.now()
          const fileName = `${timestamp}_${file.name}`
          const storageRef = ref(storage, `free-schedule-gallery/${id}/${fileName}`)
          
          const snapshot = await uploadBytes(storageRef, file)
          const downloadURL = await getDownloadURL(snapshot.ref)
          
          const imageData = {
            scheduleId: id,
            fileName: fileName,
            originalName: file.name,
            downloadURL: downloadURL,
            uploadTime: new Date(),
            uploadedBy: userData.name || userData.email,
            userRegion: userData.region,
            comments: [],
            emojis: {}
          }
          
          const docRef = await addDoc(collection(db, 'free-schedule-gallery'), imageData)
          imageData.id = docRef.id
          
          resolve(imageData)
        } catch (error) {
          reject(error)
        }
      })
      
      uploadPromises.push(uploadPromise)
    }

    try {
      const uploadedImages = await Promise.all(uploadPromises)
      setImages(prev => [...uploadedImages, ...prev])
      toast.success(`${uploadedImages.length}장의 사진이 업로드되었습니다.`)
    } catch (error) {
      console.error('이미지 업로드 오류:', error)
      toast.error('이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleAddComment = async (imageId) => {
    if (!newComment.trim() || !userData) return

    setCommentSubmitting(true)
    try {
      const commentData = {
        text: newComment,
        author: userData.name || userData.email,
        timestamp: new Date(),
        userRegion: userData.region
      }

      const imageRef = doc(db, 'free-schedule-gallery', imageId)
      const imageDoc = await getDoc(imageRef)
      
      if (imageDoc.exists()) {
        const currentComments = imageDoc.data().comments || []
        const updatedComments = [...currentComments, commentData]
        
        await updateDoc(imageRef, { comments: updatedComments })
        
        setImages(prev => prev.map(img => 
          img.id === imageId 
            ? { ...img, comments: updatedComments }
            : img
        ))
        
        setNewComment('')
        toast.success('댓글이 추가되었습니다.')
      }
    } catch (error) {
      console.error('댓글 추가 오류:', error)
      toast.error('댓글 추가 중 오류가 발생했습니다.')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleAddEmoji = (emoji) => {
    if (!userData) return

    const handleImageEmoji = async (imageId, emoji) => {
      try {
        const imageRef = doc(db, 'free-schedule-gallery', imageId)
        const imageDoc = await getDoc(imageRef)
        
        if (imageDoc.exists()) {
          const currentEmojis = imageDoc.data().emojis || {}
          const userKey = userData.email || userData.name
          
          if (currentEmojis[emoji]) {
            if (currentEmojis[emoji].includes(userKey)) {
              // 이미 반응한 경우 제거
              currentEmojis[emoji] = currentEmojis[emoji].filter(user => user !== userKey)
              if (currentEmojis[emoji].length === 0) {
                delete currentEmojis[emoji]
              }
            } else {
              // 새로운 반응 추가
              currentEmojis[emoji] = [...currentEmojis[emoji], userKey]
            }
          } else {
            // 새로운 이모지 반응 생성
            currentEmojis[emoji] = [userKey]
          }
          
          await updateDoc(imageRef, { emojis: currentEmojis })
          
          setImages(prev => prev.map(img => 
            img.id === imageId 
              ? { ...img, emojis: currentEmojis }
              : img
          ))
        }
      } catch (error) {
        console.error('이모지 반응 오류:', error)
        toast.error('반응 추가 중 오류가 발생했습니다.')
      }
    }

    if (selectedImages.length > 0) {
      // 선택된 이미지들에 일괄 적용
      selectedImages.forEach(imageId => {
        handleImageEmoji(imageId, emoji)
      })
      setSelectedImages([])
    }
  }

  const toggleEmojiPicker = (imageId) => {
    setShowEmojiPicker(prev => ({
      ...prev,
      [imageId]: !prev[imageId]
    }))
  }

  const handleImageSelection = (imageId) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    )
  }

  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) return

    if (!confirm(`선택된 ${selectedImages.length}장의 사진을 삭제하시겠습니까?`)) return

    try {
      const deletePromises = selectedImages.map(imageId => 
        deleteDoc(doc(db, 'free-schedule-gallery', imageId))
      )
      
      await Promise.all(deletePromises)
      
      setImages(prev => prev.filter(img => !selectedImages.includes(img.id)))
      setSelectedImages([])
      toast.success(`${selectedImages.length}장의 사진이 삭제되었습니다.`)
    } catch (error) {
      console.error('일괄 삭제 오류:', error)
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteImage = async (imageId) => {
    if (!confirm('이 사진을 삭제하시겠습니까?')) return

    try {
      await deleteDoc(doc(db, 'free-schedule-gallery', imageId))
      setImages(prev => prev.filter(img => img.id !== imageId))
      toast.success('사진이 삭제되었습니다.')
    } catch (error) {
      console.error('이미지 삭제 오류:', error)
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDescription = (description) => {
    if (!description) return ''
    return description.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < description.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">자유일정 갤러리를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-center" />
      
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🗓️ 자유일정 갤러리</h1>
                <p className="text-sm text-gray-600">{userData?.name}님 ({userData?.region})</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {selectedImages.length > 0 && (
                <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm border">
                  <span className="text-sm text-gray-700 font-medium">
                    {selectedImages.length}장 선택됨
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors font-medium"
                  >
                    선택 삭제
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files.length > 0) {
                    handleImageUpload(e.target.files)
                  }
                }}
                className="hidden"
                id="image-upload"
                disabled={uploading}
              />
              <label
                htmlFor="image-upload"
                className={`px-6 py-3 rounded-lg font-semibold cursor-pointer transition-all duration-200 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${
                  uploading 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                }`}
              >
                {uploading ? '업로드 중...' : '📷 사진 업로드'}
              </label>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* 자유일정 정보 카드 */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-purple-500 text-white p-3 rounded-full mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🗓️ 자유 일정 - 개인 탐방</h2>
              <p className="text-gray-600">개인 또는 팀별로 자유롭게 계획할 수 있는 시간입니다</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">📅 일정 정보</h4>
              <div className="space-y-2 text-gray-700">
                <div className="flex items-center">
                  <span className="font-medium w-20">날짜:</span>
                  <span>{formatDate(freeSchedule?.date)}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium w-20">시간:</span>
                  <span>{freeSchedule?.time || '자유 시간'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium w-20">장소:</span>
                  <span>{freeSchedule?.location || '엘시티 레지던스'}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">📝 활동 내용</h4>
              <div className="text-gray-600 leading-relaxed">
                {formatDescription(freeSchedule?.description)}
              </div>
            </div>
          </div>
          
          {freeSchedule?.details && freeSchedule.details.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">📋 상세 일정</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="space-y-2">
                  {freeSchedule.details.map((detail, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span className="text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 갤러리 카드 */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-purple-500 text-white p-3 rounded-full mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">📷 갤러리</h3>
                <p className="text-gray-600">{images.length}장의 사진</p>
              </div>
            </div>
          </div>
          
          {uploading && (
            <div className="flex items-center space-x-2 text-purple-600 mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <span>사진을 업로드하는 중...</span>
            </div>
          )}

          {images.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📷</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">아직 업로드된 사진이 없습니다</h3>
              <p className="text-gray-600 mb-6">자유일정 동안 찍은 사진들을 업로드해보세요!</p>
              <label
                htmlFor="image-upload"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold cursor-pointer hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                📷 첫 번째 사진 업로드
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={`relative group bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                    highlightedImage === image.id ? 'ring-4 ring-blue-500' : ''
                  } ${selectedImages.includes(image.id) ? 'ring-2 ring-purple-500' : ''}`}
                  onClick={() => handleImageSelection(image.id)}
                >
                  {/* 선택 체크박스 */}
                  <div className={`absolute top-2 left-2 z-10 ${
                    selectedImages.includes(image.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  } transition-opacity duration-200`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedImages.includes(image.id) 
                        ? 'bg-purple-500 border-purple-500' 
                        : 'bg-white border-gray-300'
                    }`}>
                      {selectedImages.includes(image.id) && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* 이미지 */}
                  <img
                    src={image.downloadURL}
                    alt={image.originalName}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />

                  {/* 이미지 정보 오버레이 */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-end">
                    <div className="w-full p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center justify-between text-sm">
                        <span>{image.uploadedBy}</span>
                        <span>{formatDate(image.uploadTime)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleEmojiPicker(image.id)
                      }}
                      className="bg-white bg-opacity-90 p-1 rounded-full text-gray-600 hover:text-purple-600 transition-colors"
                    >
                      😊
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteImage(image.id)
                      }}
                      className="bg-white bg-opacity-90 p-1 rounded-full text-gray-600 hover:text-red-600 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* 이모지 반응 */}
                  {image.emojis && Object.keys(image.emojis).length > 0 && (
                    <div className="absolute bottom-2 left-2 flex space-x-1">
                      {Object.entries(image.emojis).map(([emoji, users]) => (
                        <div
                          key={emoji}
                          className="bg-white bg-opacity-90 px-2 py-1 rounded-full text-xs flex items-center space-x-1"
                        >
                          <span>{emoji}</span>
                          <span className="text-gray-600">{users.length}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 이모지 피커 */}
                  {showEmojiPicker[image.id] && (
                    <div className="absolute bottom-12 left-2 bg-white rounded-lg shadow-lg p-2 z-20">
                      <div className="grid grid-cols-4 gap-1">
                        {['😊', '👍', '❤️', '🎉', '😍', '🔥', '👏', '💯'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddEmoji(emoji)
                              toggleEmojiPicker(image.id)
                            }}
                            className="p-1 hover:bg-gray-100 rounded text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 