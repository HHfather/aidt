import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Loader } from '@googlemaps/js-api-loader'
import { 
  collection, 
  doc,
  getDoc,
  query, 
  where, 
  getDocs, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../firebaseConfig'
import toast from 'react-hot-toast'

export default function AfternoonActivityPage() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [activity, setActivity] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [selectedPhotoComments, setSelectedPhotoComments] = useState({})
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [reactionSubmitting, setReactionSubmitting] = useState(false)
  const [userReactions, setUserReactions] = useState({})
  
  // 지도 관련
  const mapRef = useRef(null)
  const googleMapRef = useRef(null)
  const [mapLoading, setMapLoading] = useState(true)

  // 숙소 정보
  const accommodationInfo = {
    name: '프라하 센트럴 호텔',
    address: '프라하 1구, 바츨라프 광장 근처',
    position: { lat: 50.0813, lng: 14.4242 },
    description: '시내 중심가에 위치한 편리한 숙소',
    amenities: ['무료 WiFi', '조식 포함', '24시간 프론트', '관광지 도보 접근']
  }

  // 추천 장소들
  const recommendedPlaces = [
    {
      id: 'rest1',
      name: '카페 루브르',
      type: 'cafe',
      distance: '도보 5분',
      position: { lat: 50.0820, lng: 14.4195 },
      description: '아인슈타인이 자주 찾았던 역사적인 카페',
      rating: 4.6,
      icon: '☕'
    },
    {
      id: 'rest2', 
      name: '체코 전통 레스토랑',
      type: 'restaurant',
      distance: '도보 3분',
      position: { lat: 50.0801, lng: 14.4231 },
      description: '굴라시와 체코 맥주의 맛집',
      rating: 4.8,
      icon: '🍺'
    },
    {
      id: 'shop1',
      name: '바츨라프 광장 쇼핑가',
      type: 'shopping',
      distance: '도보 2분',
      position: { lat: 50.0818, lng: 14.4258 },
      description: '기념품과 현지 브랜드 쇼핑',
      rating: 4.4,
      icon: '🛍️'
    },
    {
      id: 'tour1',
      name: '국립박물관',
      type: 'museum',
      distance: '도보 8분',
      position: { lat: 50.0796, lng: 14.4314 },
      description: '체코의 역사와 문화를 한눈에',
      rating: 4.7,
      icon: '🏛️'
    }
  ]

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
      
      if (id) {
        loadActivityData(id)
        initializeMap()
      }
    } catch (error) {
      console.error('세션 로드 오류:', error)
      router.push('/')
    }
  }, [router, id])

  const loadActivityData = async (activityId) => {
    try {
      // 오후 활동 정보 설정
      const afternoonActivity = {
        id: activityId,
        date: '2025-08-06',
        time: '14:00 - 18:00',
        activityName: '프라하 자유시간 & 숙소 주변 탐방',
        location: '프라하 센트럴 호텔 주변',
        type: 'afternoon',
        description: '숙소 체크인 후 주변 명소 및 맛집 탐방'
      }

      setActivity(afternoonActivity)

      // 사진 데이터 로드
      const samplePhotos = [
        {
          id: 'afternoon1',
          imageUrl: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=400',
          uploaderId: 'user1',
          uploaderName: '김영희',
          team: 'A팀',
          uploadedAt: '2025-07-29T15:30:00Z',
          likes: 5,
          comments: [
            { id: 1, author: '박철수', text: '숙소 뷰가 정말 좋네요! 🏨', time: '2025-07-29T15:35:00Z' }
          ]
        },
        {
          id: 'afternoon2',
          imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400',
          uploaderId: 'user2',
          uploaderName: '홍길동',
          team: 'A팀',
          uploadedAt: '2025-07-29T16:15:00Z',
          likes: 8,
          comments: [
            { id: 1, author: '김영희', text: '카페 분위기 최고예요 ☕', time: '2025-07-29T16:20:00Z' }
          ]
        }
      ]

      setPhotos(samplePhotos)
      setLoading(false)
    } catch (error) {
      console.error('활동 데이터 로드 오류:', error)
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const initializeMap = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg'
      
      if (!apiKey || apiKey === 'DEMO_KEY_FOR_DEVELOPMENT') {
        // API 키가 없으면 정적 지도로 대체
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div class="w-full h-64 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white rounded-lg">
              <div class="text-center">
                <div class="text-4xl mb-3">🏨</div>
                <h3 class="text-lg font-bold mb-2">${accommodationInfo.name}</h3>
                <p class="text-sm opacity-90">${accommodationInfo.address}</p>
                <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>☕ 카페 루브르 - 도보 5분</div>
                  <div>🍺 체코 레스토랑 - 도보 3분</div>
                  <div>🛍️ 바츨라프 광장 - 도보 2분</div>
                  <div>🏛️ 국립박물관 - 도보 8분</div>
                </div>
              </div>
            </div>
          `
        }
        setMapLoading(false)
        return
      }

      // 구글 맵 로드
      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly'
      })

      const google = await loader.load()
      
      if (mapRef.current) {
        const map = new google.maps.Map(mapRef.current, {
          center: accommodationInfo.position,
          zoom: 16,
          mapTypeId: 'roadmap'
        })

        googleMapRef.current = map

        // 숙소 마커
        new google.maps.Marker({
          position: accommodationInfo.position,
          map: map,
          title: accommodationInfo.name,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#DC2626" stroke="white" stroke-width="2"/>
                <text x="20" y="25" text-anchor="middle" font-size="16">🏨</text>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(40, 40)
          }
        })

        // 추천 장소 마커들
        recommendedPlaces.forEach(place => {
          new google.maps.Marker({
            position: place.position,
            map: map,
            title: place.name,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg width="35" height="35" viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="17.5" cy="17.5" r="15" fill="#10B981" stroke="white" stroke-width="2"/>
                  <text x="17.5" y="22" text-anchor="middle" font-size="14">${place.icon}</text>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(35, 35)
            }
          })
        })

        setMapLoading(false)
      }
    } catch (error) {
      console.error('지도 로드 오류:', error)
      setMapLoading(false)
    }
  }

  // 댓글 및 반응 함수들 (기존과 동일)
  const handleAddComment = async (photoId) => {
    if (!newComment.trim()) {
      toast.error('댓글을 입력해주세요.')
      return
    }

    if (commentSubmitting) {
      toast.error('댓글 등록 중입니다. 잠시만 기다려주세요.')
      return
    }

    setCommentSubmitting(true)

    try {
      const newCommentData = {
        photoId: photoId,
        author: user.name || user.participantName,
        text: newComment.trim(),
        time: new Date().toISOString(),
        userId: user.id
      }

      setPhotos(prevPhotos => 
        prevPhotos.map(photo => {
          if (photo.id === photoId) {
            const updatedComments = photo.comments ? [...photo.comments] : []
            updatedComments.push({
              id: Date.now(),
              ...newCommentData
            })
            
            return {
              ...photo,
              comments: updatedComments
            }
          }
          return photo
        })
      )

      setNewComment('')
      toast.success('댓글이 등록되었습니다! 💬')

    } catch (error) {
      console.error('댓글 등록 오류:', error)
      toast.error('댓글 등록 중 오류가 발생했습니다.')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleReaction = async (photoId, emoji) => {
    if (reactionSubmitting) {
      toast.error('처리 중입니다. 잠시만 기다려주세요.')
      return
    }

    setReactionSubmitting(true)

    try {
      const reactionKey = `${photoId}_${emoji}`
      const hasReacted = userReactions[reactionKey]

      setPhotos(prevPhotos => 
        prevPhotos.map(photo => {
          if (photo.id === photoId) {
            const reactions = photo.reactions || {}
            
            if (hasReacted) {
              reactions[emoji] = Math.max((reactions[emoji] || 0) - 1, 0)
              if (reactions[emoji] === 0) {
                delete reactions[emoji]
              }
            } else {
              reactions[emoji] = (reactions[emoji] || 0) + 1
            }
            
            return {
              ...photo,
              reactions: reactions
            }
          }
          return photo
        })
      )

      setUserReactions(prev => ({
        ...prev,
        [reactionKey]: !hasReacted
      }))

      toast.success(hasReacted ? `${emoji} 반응 취소!` : `${emoji}`)

    } catch (error) {
      console.error('반응 오류:', error)
    } finally {
      setReactionSubmitting(false)
    }
  }

  const handlePhotoUpload = async (event) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadingPhoto(true)
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const storageRef = ref(storage, `photos/afternoon/${Date.now()}_${file.name}`)
        const snapshot = await uploadBytes(storageRef, file)
        const downloadURL = await getDownloadURL(snapshot.ref)

        return {
          id: `afternoon_${Date.now()}`,
          imageUrl: downloadURL,
          uploaderId: user.id,
          uploaderName: user.name,
          team: user.team,
          uploadedAt: new Date().toISOString(),
          likes: 0,
          comments: []
        }
      })

      const newPhotos = await Promise.all(uploadPromises)
      setPhotos(prev => [...newPhotos, ...prev])
      toast.success(`${files.length}장의 사진이 업로드되었습니다!`)
      
    } catch (error) {
      console.error('사진 업로드 오류:', error)
      toast.error('사진 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const toggleComments = (photoId) => {
    setSelectedPhotoComments(prev => ({
      ...prev,
      [photoId]: !prev[photoId]
    }))
  }

  const formatTime = (timeString) => {
    const date = new Date(timeString)
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">데이터 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <button className="text-gray-600 hover:text-gray-900">
                  ← 대시보드
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {activity?.activityName}
                </h1>
                <p className="text-sm text-gray-600">
                  {activity?.date} | {activity?.time}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* 🏨 숙소 정보 및 지도 */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                🏨 숙소 위치 및 정보
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 지도 */}
                <div>
                  <div className="relative">
                    {mapLoading && (
                      <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10 rounded-lg">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-gray-600">지도 로딩 중...</p>
                        </div>
                      </div>
                    )}
                    <div ref={mapRef} className="w-full h-64 rounded-lg"></div>
                  </div>
                </div>

                {/* 숙소 정보 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{accommodationInfo.name}</h3>
                  <p className="text-gray-600 mb-4">{accommodationInfo.description}</p>
                  <p className="text-sm text-gray-500 mb-4">📍 {accommodationInfo.address}</p>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">🎯 편의시설</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {accommodationInfo.amenities.map((amenity, index) => (
                        <div key={index} className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-sm">
                          ✓ {amenity}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 🍽️ 주변 추천 장소 */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                🍽️ 숙소 주변 추천 장소
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedPlaces.map((place) => (
                  <div key={place.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{place.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{place.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{place.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            🚶 {place.distance}
                          </span>
                          <span className="text-yellow-500 text-sm">
                            ⭐ {place.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 📸 사진 업로드 섹션 */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                📸 오후 활동 사진 업로드
              </h2>
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                uploadingPhoto 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="hidden"
                  id="photo-upload"
                />
                
                {uploadingPhoto ? (
                  <div className="animate-pulse">
                    <div className="flex justify-center mb-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                    <p className="text-blue-600 font-medium">📤 사진 업로드 중...</p>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="photo-upload"
                      className="cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-all hover:scale-105"
                    >
                      📷 오후 활동 사진 선택하기
                    </label>
                    <p className="mt-2 text-sm text-gray-600">
                      숙소, 카페, 맛집 사진을 공유해주세요!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 🖼️ 사진 갤러리 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              🖼️ 오후 활동 갤러리 ({photos.length}장)
            </h2>
            
            {photos.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600">아직 업로드된 사진이 없습니다.</p>
                <p className="text-sm text-gray-500 mt-2">첫 번째 오후 활동 사진을 업로드해보세요! 📸</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.map((photo, index) => (
                  <div 
                    key={photo.id} 
                    className="bg-white rounded-lg shadow-md overflow-hidden photo-hover animate-float-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <img
                      src={photo.imageUrl}
                      alt="오후 활동 사진"
                      className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                    />
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-600">
                          {photo.uploaderName} ({photo.team})
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(photo.uploadedAt)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-4">
                          <button 
                            onClick={() => {}}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-800 transition-all hover:scale-110"
                          >
                            <span className="text-lg">❤️</span>
                            <span className="text-sm font-semibold">{photo.likes}</span>
                          </button>
                          <button 
                            onClick={() => toggleComments(photo.id)}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                          >
                            <span>💬</span>
                            <span className="text-sm">{photo.comments?.length || 0}</span>
                          </button>
                        </div>
                        
                        {/* 이모티콘 반응 버튼들 */}
                        <div className="flex space-x-2">
                          {['👍', '😍', '🎉', '😂', '😮'].map((emoji) => {
                            const reactionKey = `${photo.id}_${emoji}`
                            const hasReacted = userReactions[reactionKey]
                            
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(photo.id, emoji)}
                                disabled={reactionSubmitting}
                                className={`text-lg transition-all active:scale-95 ${
                                  hasReacted 
                                    ? 'scale-125 opacity-100' 
                                    : 'hover:scale-125 opacity-70 hover:opacity-100'
                                }`}
                              >
                                {emoji}
                                {photo.reactions?.[emoji] && (
                                  <span className="text-xs text-gray-600 ml-1">
                                    {photo.reactions[emoji]}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* 반응 현황 표시 */}
                      {photo.reactions && Object.keys(photo.reactions).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(photo.reactions).map(([emoji, count]) => (
                            <span key={emoji} className="bg-gray-100 rounded-full px-2 py-1 text-sm">
                              {emoji} {count}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 댓글 섹션 */}
                      {selectedPhotoComments[photo.id] && photo.comments && (
                        <div className="mt-4 border-t pt-4">
                          <div className="space-y-2 mb-3">
                            {photo.comments.map((comment) => (
                              <div key={comment.id} className="bg-gray-50 rounded p-2">
                                <div className="flex justify-between items-start">
                                  <div className="text-sm font-medium text-gray-900">
                                    {comment.author}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatTime(comment.time)}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-700 mt-1">
                                  {comment.text}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddComment(photo.id)
                                }
                              }}
                              placeholder="댓글을 입력하세요..."
                              className="flex-1 text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button 
                              onClick={() => handleAddComment(photo.id)}
                              disabled={commentSubmitting}
                              className={`text-sm px-3 py-2 rounded transition-all ${
                                commentSubmitting
                                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {commentSubmitting ? '등록중...' : '등록'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
