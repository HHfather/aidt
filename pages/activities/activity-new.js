import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function ActivityPage() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // 상태 관리
  const [selectedTheme, setSelectedTheme] = useState('restaurant')
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const [galleryPhotos, setGalleryPhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [photoReactions, setPhotoReactions] = useState({})
  const [commentReactions, setCommentReactions] = useState({})

  const themes = [
    { id: 'restaurant', name: '맛집', icon: '🍽️' },
    { id: 'cafe', name: '카페', icon: '☕' },
    { id: 'shopping', name: '쇼핑', icon: '🛍️' },
    { id: 'culture', name: '문화', icon: '🏛️' },
    { id: 'nature', name: '자연', icon: '🌳' },
    { id: 'photo', name: '포토스팟', icon: '📸' }
  ]

  const emojiTypes = [
    { id: 'like', emoji: '👍', name: '좋아요' },
    { id: 'love', emoji: '❤️', name: '사랑해요' },
    { id: 'wow', emoji: '😮', name: '와우' },
    { id: 'haha', emoji: '😂', name: '웃겨요' }
  ]

  const recommendationData = {
    'restaurant': [
      { 
        id: 1, 
        name: '로칼 체코 레스토랑', 
        description: '정통 굴라시와 체코 맥주를 맛볼 수 있는 현지인들이 자주 찾는 레스토랑입니다.',
        rating: 4.5, 
        visits: 23
      },
      { 
        id: 2, 
        name: '프라하 브루어리', 
        description: '체코의 맥주 문화를 직접 체험할 수 있는 현지 양조장입니다.',
        rating: 4.7, 
        visits: 18
      }
    ],
    'cafe': [
      { 
        id: 4, 
        name: '코지 카페 프라하', 
        description: '아늑한 분위기의 작은 카페로, 직접 로스팅한 원두와 수제 디저트가 유명합니다.',
        rating: 4.6, 
        visits: 27
      }
    ],
    'shopping': [
      { 
        id: 7, 
        name: '구시가 아트샵', 
        description: '현지 작가들의 수공예품과 독특한 기념품을 판매하는 아트샵입니다.',
        rating: 4.4, 
        visits: 15
      }
    ],
    'culture': [
      { 
        id: 10, 
        name: '프라하 국립박물관', 
        description: '체코의 역사와 문화를 한눈에 볼 수 있는 국립박물관입니다.',
        rating: 4.8, 
        visits: 42
      }
    ],
    'nature': [
      { 
        id: 13, 
        name: '페트린 힐', 
        description: '프라하 시내가 한눈에 내려다보이는 언덕으로, 산책과 피크닉을 즐기기에 완벽한 장소입니다.',
        rating: 4.9, 
        visits: 38
      }
    ],
    'photo': [
      { 
        id: 16, 
        name: '찰스 브리지 일출 포인트', 
        description: '찰스 브리지의 아름다운 일출과 프라하 성의 실루엣을 촬영할 수 있는 최고의 포토스팟입니다.',
        rating: 4.7, 
        visits: 29
      }
    ]
  }

  const getAIRecommendations = async (theme) => {
    setLoadingRecommendations(true);
    try {
      const existingNames = recommendations.map(r => r.name);
      const response = await fetch('/api/generate-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: themes.find(t => t.id === theme)?.name, existingRecommendations: existingNames }),
      });

      if (!response.ok) {
        throw new Error('AI 추천을 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
      toast.success(`${themes.find(t => t.id === theme)?.name} 테마의 새로운 장소를 추천해드렸어요!`);
    } catch (error) {
      console.error(error);
      toast.error(error.message);
      // Fallback to static data if AI fails
      setRecommendations(recommendationData[theme] || []);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  useEffect(() => {
    const userSession = localStorage.getItem('userSession')
    if (!userSession) {
      router.push('/')
      return
    }

    try {
      const userData = JSON.parse(userSession)
      setUser(userData)
      loadActivityData(userData, id)
      
      const savedAssignment = localStorage.getItem(`assignment_${id}`)
      if (savedAssignment) {
        setAssignmentNotes(savedAssignment)
      }
    } catch (error) {
      console.error('세션 로드 오류:', error)
      router.push('/')
    }
  }, [router, id])

  useEffect(() => {
    if (selectedTheme && recommendationData[selectedTheme]) {
      setRecommendations(recommendationData[selectedTheme])
    }
  }, [selectedTheme])

  const loadActivityData = (userData, activityId) => {
    if (!userData?.currentProject?.schedule) {
      setLoading(false)
      return
    }

    const foundActivity = userData.currentProject.schedule.find(item => item.id === activityId)
    
    if (foundActivity) {
      const isFreeTime = activityId.includes('freeTime') || foundActivity.type === 'free'
      
      setActivity({
        ...foundActivity,
        isFreeTime,
        gallery: foundActivity.gallery || []
      })
      
      initializeGalleryPhotos()
    }
    
    setLoading(false)
  }

  const initializeGalleryPhotos = () => {
    setGalleryPhotos([])
  }

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId)
    setThemeDropdownOpen(false)
    getAIRecommendations(themeId);
  }

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files)
    if (files.length === 0) return

    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);

    if (oversizedFiles.length > 0) {
      toast.error(`다음 파일의 용량이 너무 큽니다 (최대 20MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setUploadingPhotos(true)
    
    Promise.all(
      files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            resolve({
              id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              url: e.target.result,
              caption: `새 사진 - ${file.name}`,
              userName: user?.name || '연수생',
              timestamp: new Date().toLocaleString('ko-KR'),
              uploadedBy: user?.id,
              comments: []
            })
          }
          reader.readAsDataURL(file)
        })
      })
    ).then((newPhotos) => {
      setGalleryPhotos(prev => [...prev, ...newPhotos])
      setUploadingPhotos(false)
      toast.success(`${newPhotos.length}장의 사진이 업로드되었습니다!`)
    })
  }

  const handlePhotoDelete = (photoId) => {
    const photo = galleryPhotos.find(p => p.id === photoId)
    if (photo && photo.uploadedBy === user?.id) {
      if (confirm('이 사진을 삭제하시겠습니까?')) {
        setGalleryPhotos(prev => prev.filter(p => p.id !== photoId))
        toast.success('사진이 삭제되었습니다.')
      }
    } else {
      toast.error('본인이 업로드한 사진만 삭제할 수 있습니다.')
    }
  }

  const handleAssignmentSave = () => {
    localStorage.setItem(`assignment_${id}`, assignmentNotes)
    toast.success('과제 내용이 저장되었습니다!')
  }

  const handlePhotoReaction = (photoId, emojiId) => {
    setPhotoReactions(prev => {
      const photoReactions = prev[photoId] || {}
      const emojiReactions = photoReactions[emojiId] || []
      
      const hasReacted = emojiReactions.includes(user.id)
      const newEmojiReactions = hasReacted
        ? emojiReactions.filter(userId => userId !== user.id)
        : [...emojiReactions, user.id]
      
      return {
        ...prev,
        [photoId]: {
          ...photoReactions,
          [emojiId]: newEmojiReactions
        }
      }
    })
  }

  const handleCommentReaction = (commentId, emojiId) => {
    setCommentReactions(prev => {
      const commentReactions = prev[commentId] || {}
      const emojiReactions = commentReactions[emojiId] || []
      
      const hasReacted = emojiReactions.includes(user.id)
      const newEmojiReactions = hasReacted
        ? emojiReactions.filter(userId => userId !== user.id)
        : [...emojiReactions, user.id]
      
      return {
        ...prev,
        [commentId]: {
          ...commentReactions,
          [emojiId]: newEmojiReactions
        }
      }
    })
  }

  const handleAddPhotoComment = (photoId, commentText) => {
    const newComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: commentText,
      userName: user?.name || '연수생',
      timestamp: new Date().toLocaleString('ko-KR')
    }

    setGalleryPhotos(prev => 
      prev.map(photo => 
        photo.id === photoId 
          ? { ...photo, comments: [...photo.comments, newComment] }
          : photo
      )
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📱</div>
          <div className="text-xl font-semibold text-gray-700">로딩 중...</div>
        </div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl font-semibold text-gray-700 mb-4">활동을 찾을 수 없습니다</div>
          <Link href="/dashboard" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 transition-colors">
                ← 대시보드
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">
                {activity.isFreeTime ? '🗓️ 자유일정' : '📸 연수활동'}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-gray-600">👤 {user?.name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{activity.activityName}</h2>
                  <div className="flex items-center space-x-4 text-blue-100">
                    <span className="flex items-center">📅 {activity.date}</span>
                    <span className="flex items-center">🕐 {activity.time}</span>
                    <span className="flex items-center">📍 {activity.location}</span>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  activity.isFreeTime ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                }`}>
                  {activity.isFreeTime ? '🗓️ 자유시간' : '📸 연수활동'}
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 text-lg leading-relaxed mb-6">{activity.description}</p>
              
              {activity.details && activity.details.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">📋 주요 활동</h3>
                  <ul className="space-y-2">
                    {activity.details.map((detail, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-gray-700">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activity.adminNotes && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                  <p className="text-blue-800"><strong>💡 안내사항:</strong> {activity.adminNotes}</p>
                </div>
              )}
            </div>
          </div>

          {activity.isFreeTime && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">🎯 관심 테마 선택</h3>
                <div className="relative">
                  <button
                    onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{themes.find(t => t.id === selectedTheme)?.icon}</span>
                      <span className="font-medium">{themes.find(t => t.id === selectedTheme)?.name}</span>
                    </div>
                    <span className={`transform transition-transform ${themeDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  
                  {themeDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg">
                      {themes.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => handleThemeSelect(theme.id)}
                          className={`w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-gray-50 transition-colors ${
                            selectedTheme === theme.id ? 'bg-blue-50 text-blue-600' : ''
                          }`}
                        >
                          <span className="text-2xl">{theme.icon}</span>
                          <span className="font-medium">{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">📍 {themes.find(t => t.id === selectedTheme)?.name} 추천 장소</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-100 rounded-lg h-80 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🗺️</div>
                      <p className="text-gray-600">지도가 여기에 표시됩니다</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {loadingRecommendations ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="text-4xl animate-spin mb-4">🤖</div>
                          <p className="text-gray-600">AI가 추천 장소를 찾고 있어요...</p>
                        </div>
                      </div>
                    ) : recommendations.map((place) => (
                      <div key={place.id || place.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{place.name}</h4>
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <span>⭐</span>
                            <span>{place.rating}</span>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{place.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-600">👥 {place.visits}명이 방문했어요</span>
                          <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                            길찾기
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!activity.isFreeTime && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">🗺️ 활동 위치</h3>
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📍</div>
                    <p className="text-gray-600">{activity.location}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">📝 연수 과제</h3>
                <div className="space-y-4">
                  <textarea
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    placeholder="이번 활동에서 배운 점, 느낀 점, 개선사항 등을 자유롭게 작성해주세요..."
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="6"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAssignmentSave}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      💾 과제 저장
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">📷 활동 갤러리</h3>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer flex items-center space-x-2 ${
                    uploadingPhotos ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span>📸</span>
                  <span>{uploadingPhotos ? '업로드 중...' : '사진 추가'}</span>
                </label>
              </div>
            </div>

            {galleryPhotos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {galleryPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <div
                      className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      {photo.url ? (
                        <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl">📸</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{photo.caption}</p>
                      <p className="text-xs text-gray-500">by {photo.userName}</p>
                    </div>

                    {photo.uploadedBy === user?.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePhotoDelete(photo.id)
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    )}

                    {photo.comments.length > 0 && (
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                        💬 {photo.comments.length}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <div className="text-4xl mb-4">📸</div>
                <p className="text-gray-600 font-medium">아직 업로드된 사진이 없습니다</p>
                <p className="text-sm text-gray-500 mt-2">활동 중 촬영한 사진을 업로드해서 추억을 공유해보세요!</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedPhoto && (
        <PhotoDetailModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          user={user}
          emojiTypes={emojiTypes}
          photoReactions={photoReactions}
          commentReactions={commentReactions}
          onPhotoReaction={handlePhotoReaction}
          onCommentReaction={handleCommentReaction}
          onAddComment={handleAddPhotoComment}
        />
      )}
    </div>
  )
}

function PhotoDetailModal({ photo, onClose, user, emojiTypes, photoReactions, commentReactions, onPhotoReaction, onCommentReaction, onAddComment }) {
  const [newComment, setNewComment] = useState('')

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(photo.id, newComment.trim())
      setNewComment('')
      toast.success('댓글이 추가되었습니다!')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto w-full">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">사진 상세보기</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6">
          <div className="h-64 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
            {photo.url && photo.url.startsWith('data:') ? (
              <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl">📸</span>
            )}
          </div>
          
          <div className="mb-4">
            <h4 className="text-lg font-semibold mb-2">{photo.caption}</h4>
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>by {photo.userName}</span>
              <span>{photo.timestamp}</span>
            </div>
          </div>

          <div className="mb-6">
            <h5 className="font-medium mb-3">반응</h5>
            <div className="flex flex-wrap gap-2">
              {emojiTypes.map((emoji) => {
                const reactionCount = photoReactions[photo.id]?.[emoji.id]?.length || 0
                const hasReacted = photoReactions[photo.id]?.[emoji.id]?.includes(user.id)
                return (
                  <button
                    key={emoji.id}
                    onClick={() => onPhotoReaction(photo.id, emoji.id)}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-full text-sm transition-colors ${
                      hasReacted ? 'bg-blue-100 text-blue-600 border-2 border-blue-300' : 'bg-gray-100 hover:bg-gray-200 border-2 border-transparent'
                    }`}
                  >
                    <span className="text-base">{emoji.emoji}</span>
                    <span className="font-medium">{emoji.name}</span>
                    {reactionCount > 0 && <span className="bg-white px-1 rounded">({reactionCount})</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h5 className="font-medium mb-3">댓글 ({photo.comments.length})</h5>
            
            <div className="mb-4">
              <div className="flex space-x-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="이 사진에 댓글을 달아보세요..."
                  className="flex-1 p-3 border rounded-lg resize-none text-sm"
                  rows="2"
                />
              </div>
              <button
                onClick={handleAddComment}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                댓글 작성
              </button>
            </div>

            <div className="space-y-4 max-h-64 overflow-y-auto">
              {photo.comments.map((comment) => (
                <div key={comment.id} className="border-l-4 border-blue-200 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{comment.userName}</span>
                    <span className="text-xs text-gray-500">{comment.timestamp}</span>
                  </div>
                  <p className="text-gray-700 mb-3 text-sm">{comment.text}</p>
                  
                  <div className="flex space-x-1">
                    {emojiTypes.slice(0, 3).map((emoji) => {
                      const reactionCount = commentReactions[comment.id]?.[emoji.id]?.length || 0
                      const hasReacted = commentReactions[comment.id]?.[emoji.id]?.includes(user.id)
                      return (
                        <button
                          key={emoji.id}
                          onClick={() => onCommentReaction(comment.id, emoji.id)}
                          className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
                            hasReacted ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          <span>{emoji.emoji}</span>
                          {reactionCount > 0 && <span>{reactionCount}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
