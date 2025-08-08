import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { announcementOperations, scheduleOperations } from '../../utils/firebaseOperations'

export default function ActivityPage() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  
  // 공지사항 상태
  const [announcements, setAnnouncements] = useState([])
  const [showAnnouncements, setShowAnnouncements] = useState(true)

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
  const [isRefining, setIsRefining] = useState(false)

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
      
      // 공지사항 로드
      loadAnnouncements(userData)
      
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

  // 공지사항 로드 함수
  const loadAnnouncements = async (userData) => {
    try {
      // Firebase에서 해당 권역의 공지사항 로드
      const result = await announcementOperations.getByRegion(userData.region)
      
      if (result.success && result.data && result.data.length > 0) {
        // 최신 3개의 공지사항만 표시
        const recentAnnouncements = result.data.slice(0, 3)
        setAnnouncements(recentAnnouncements)
      } else {
        // 공지사항이 없어도 오류 메시지 표시하지 않음
        console.log('공지사항이 없습니다.')
        setAnnouncements([])
      }
    } catch (error) {
      console.error('공지사항 로드 오류:', error)
      // Fallback to localStorage (조용히 처리)
      try {
        const allAnnouncements = JSON.parse(localStorage.getItem('allAnnouncements') || '[]')
        const recentAnnouncements = allAnnouncements.slice(0, 3)
        setAnnouncements(recentAnnouncements)
      } catch (fallbackError) {
        console.log('localStorage 공지사항도 없습니다.')
        setAnnouncements([])
      }
    }
  }

  useEffect(() => {
    if (selectedTheme && recommendationData[selectedTheme]) {
      setRecommendations(recommendationData[selectedTheme])
    }
  }, [selectedTheme])

  const loadActivityData = async (userData, activityId) => {
    console.log('Loading activity data for ID:', activityId)
    console.log('User data:', userData)
    
    let foundActivity = null

    try {
      // 1. Firebase에서 해당 권역의 일정 데이터 조회
      if (userData?.region) {
        console.log('사용자 권역:', userData.region)
        const scheduleResult = await scheduleOperations.getByRegion(userData.region)
        
        console.log('Firebase 일정 조회 결과:', scheduleResult)
        
        if (scheduleResult.success && scheduleResult.data) {
          console.log('Firebase에서 가져온 일정들:', scheduleResult.data)
          // ID로 해당 일정 찾기
          foundActivity = scheduleResult.data.find(item => item.id === activityId)
          console.log('찾은 활동:', foundActivity)
          
          if (!foundActivity) {
            // activityName이나 다른 필드로 매칭 시도
            foundActivity = scheduleResult.data.find(item => 
              item.activityName && activityId.includes(item.activityName.replace(/\s+/g, '_'))
            )
            console.log('이름으로 찾은 활동:', foundActivity)
          }
        }
      }
    } catch (error) {
      console.error('Firebase 일정 조회 오류:', error)
    }

    // 2. Firebase에서 못 찾으면 임시 테스트 데이터에서 찾기
    if (!foundActivity) {
      const tempActivities = {
        'temp1': {
          id: 'temp1',
          activityName: '프라하 성 방문',
          date: '2025-08-06',
          time: '09:00',
          description: '중세 시대부터 이어져온 프라하 성의 역사와 체코의 문화를 체험하는 시간입니다. 프라하 성은 세계에서 가장 큰 성 복합체 중 하나로, 체코 왕들의 거주지였으며 현재는 체코 대통령의 공식 거주지로 사용되고 있습니다.',
          details: ['성 내부 투어 및 역사 설명', '성 비투스 대성당 방문', '옛 왕궁과 황금소로 탐방', '전망대에서 프라하 시내 조망'],
          type: 'activity',
          region: userData?.region || '1'
        },
        'temp2': {
          id: 'temp2', 
          activityName: '카를교 도보 투어',
          date: '2025-08-06',
          time: '14:00',
          description: '프라하의 상징적인 카를교를 거닐며 현지 문화와 역사를 체험합니다. 14세기에 건설된 이 다리는 30개의 바로크 양식 조각상으로 유명하며, 블타바 강을 가로지르는 아름다운 석조 다리입니다.',
          details: ['다리 위의 바로크 조각상 감상', '거리 예술가들의 공연 관람', '전통 수공예품 구경', '강변에서의 사진 촬영'],
          type: 'activity',
          region: userData?.region || '1'
        },
        'temp3': {
          id: 'temp3',
          activityName: '프라하 교육청 방문',
          date: '2025-08-07',
          time: '10:00',
          description: '체코의 교육 시스템과 정책에 대해 알아보는 공식 방문 일정입니다. 체코의 교육 개혁과 현대적 교육 방법론에 대한 심도 있는 논의와 정보 교환이 이루어집니다.',
          details: ['체코 교육 시스템 브리핑', '교육 정책 및 개혁 방향 설명', '한국과 체코 교육 비교 토론', '교육 자료 및 사례 제공'],
          type: 'activity',
          region: userData?.region || '1'
        }
      }

      if (tempActivities[activityId]) {
        foundActivity = tempActivities[activityId]
        console.log('Found activity in temp data:', foundActivity)
      }
    }

    // 3. 사용자 프로젝트 스케줄에서 찾기 (fallback)
    if (!foundActivity && userData?.currentProject?.schedule) {
      foundActivity = userData.currentProject.schedule.find(item => item.id === activityId)
      console.log('Found activity in user schedule:', foundActivity)
    }

    // 4. 자유일정 ID 처리 (auto_free_날짜 형태)
    if (!foundActivity && activityId && activityId.startsWith('auto_free_')) {
      const date = activityId.replace('auto_free_', '')
      foundActivity = {
        id: activityId,
        activityName: '🗓️ 자유일정',
        date: date,
        time: '자유시간',
        description: '개인 또는 팀별로 자유롭게 계획할 수 있는 시간입니다.',
        details: ['개인 탐방', '맛집 방문', '쇼핑', '휴식'],
        type: 'free',
        region: userData?.region || '1'
      }
      console.log('Generated free time activity:', foundActivity)
    }
    
    if (foundActivity) {
      const isFreeTime = activityId.includes('freeTime') || 
                        activityId.includes('auto_free_') || 
                        foundActivity.type === 'free'
      
      setActivity({
        ...foundActivity,
        isFreeTime,
        gallery: foundActivity.gallery || []
      })
      
      initializeGalleryPhotos()
      console.log('Activity set successfully:', foundActivity.activityName)
    } else {
      console.log('Activity not found for ID:', activityId)
      // 기본 활동 데이터 생성
      setActivity({
        id: activityId,
        activityName: '활동 정보',
        date: new Date().toISOString().split('T')[0],
        time: '미정',
        description: '활동 정보를 불러오는 중입니다.',
        details: [],
        type: 'activity',
        isFreeTime: false,
        gallery: [],
        region: userData?.region || '1'
      })
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

  const handleAIRefine = async () => {
    if (!assignmentNotes.trim()) {
      toast.error('먼저 과제 내용을 작성해주세요!')
      return
    }

    // 기존 내용을 클립보드에 백업
    try {
      await navigator.clipboard.writeText(assignmentNotes)
      toast.info('기존 내용이 클립보드에 백업되었습니다.')
    } catch (error) {
      console.log('클립보드 백업 실패:', error)
    }

    setIsRefining(true)
    try {
      const response = await fetch('/api/parse-document-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: assignmentNotes,
          type: 'refine_assignment'
        }),
      })

      if (!response.ok) {
        throw new Error('AI 서비스에 연결할 수 없습니다.')
      }

      const data = await response.json()
      if (data.refinedText) {
        setAssignmentNotes(data.refinedText)
        toast.success('AI가 글을 다듬었습니다! 이전 내용은 클립보드에 저장되어 있습니다.')
      }
    } catch (error) {
      console.error('AI 다듬기 오류:', error)
      // Fallback: Simple text improvement
      const improvedText = assignmentNotes
        .replace(/\s+/g, ' ')
        .replace(/[.]\s*[.]/g, '.')
        .replace(/([.!?])\s*([가-힣])/g, '$1 $2')
        .trim()
      
      if (improvedText !== assignmentNotes) {
        setAssignmentNotes(improvedText)
        toast.success('텍스트 형식을 개선했습니다! 이전 내용은 클립보드에 저장되어 있습니다.')
      } else {
        toast.error('AI 서비스를 사용할 수 없어 기본 개선만 적용했습니다.')
      }
    } finally {
      setIsRefining(false)
    }
  }

  const handleCopyToClipboard = async () => {
    if (!assignmentNotes.trim()) {
      toast.error('복사할 내용이 없습니다!')
      return
    }

    try {
      await navigator.clipboard.writeText(assignmentNotes)
      toast.success('기존 내용이 클립보드에 저장되었습니다! (붙여넣기로 복원 가능)')
    } catch (error) {
      console.error('복사 오류:', error)
      toast.error('복사에 실패했습니다.')
    }
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
          {/* 공지사항 섹션 */}
          {announcements.length > 0 && showAnnouncements && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  📢 가이드 공지사항
                </h3>
                <button
                  onClick={() => setShowAnnouncements(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="bg-white rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{announcement.title}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>📅 {announcement.date}</span>
                        <span>🕐 {announcement.time}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{announcement.content}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      작성자: {announcement.createdBy} | {announcement.region}권역
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{activity.activityName}</h2>
                  <div className="flex items-center space-x-4 text-blue-100">
                    <span className="flex items-center">📅 {activity.date}</span>
                    <span className="flex items-center">🕐 {activity.time}</span>
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
                <h3 className="text-xl font-semibold text-gray-900 mb-4">📝 연수 과제</h3>
                <div className="space-y-4">
                  <textarea
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    placeholder="이번 활동의 내용을 적어주세요. AI 글 다듬기를 활용하세요. 기존의 내용은 클립보드(붙여넣기 하면 복원가능)에 저장됩니다."
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="6"
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      글자 수: {assignmentNotes.length}자
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAIRefine}
                        disabled={!assignmentNotes.trim() || isRefining}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <span>🤖</span>
                        <span>{isRefining ? 'AI 다듬는 중...' : 'AI로 글 다듬기'}</span>
                      </button>
                      <button
                        onClick={handleCopyToClipboard}
                        disabled={!assignmentNotes.trim()}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <span>📋</span>
                        <span>복사</span>
                      </button>
                      <button
                        onClick={handleAssignmentSave}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <span>💾</span>
                        <span>저장</span>
                      </button>
                    </div>
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
