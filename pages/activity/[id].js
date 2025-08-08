import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useRef } from 'react'
import toast from 'react-hot-toast'

export default function ActivityPage() {
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState(null)
  const [locationInfo, setLocationInfo] = useState(null)
  const [showLocationDetails, setShowLocationDetails] = useState(false)
  const [photos, setPhotos] = useState([])
  const [newComment, setNewComment] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [imageEmojis, setImageEmojis] = useState({})
  const [report, setReport] = useState('')
  const [exampleContent, setExampleContent] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [description, setDescription] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [aiLocationInfo, setAiLocationInfo] = useState(null)
  const [showAiLocationInfo, setShowAiLocationInfo] = useState(false)
  const [loadingAiLocationInfo, setLoadingAiLocationInfo] = useState(false)
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
    if (id) {
      loadLocationInfo()
      loadPhotos()
    }
  }, [id])

  const loadLocationInfo = async () => {
    try {
      const response = await fetch(`/api/location-info?id=${id}`)
      const data = await response.json()
      
      if (data.success) {
        setLocationInfo(data.locationInfo)
      }
    } catch (error) {
      console.error('방문장소 정보 로드 오류:', error)
    }
  }

  const loadPhotos = async () => {
    try {
      console.log('🔍 Activity 페이지에서 사진 로드 시작 - ID:', id)
      const response = await fetch(`/api/gallery?scheduleId=${id}`)
      const data = await response.json()
      
      console.log('🔍 Activity API 응답:', data)
      console.log('- data.success:', data.success)
      console.log('- data.data 길이:', data.data?.length)
      console.log('- data.photos 길이:', data.photos?.length)
      
      if (data.success) {
        const photoData = data.data || data.photos || []
        setPhotos(photoData)
        console.log('✅ Activity 페이지 setPhotos 완료 - 설정된 길이:', photoData.length)
      }
    } catch (error) {
      console.error('사진 로드 오류:', error)
    }
  }

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files)
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB 제한
        toast.error(`${file.name}: 파일 크기는 10MB 이하여야 합니다.`)
        return false
      }
      return true
    })
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
  }

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('업로드할 파일을 선택해주세요.')
      return
    }

    try {
      setUploadingPhoto(true)
      
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('images', file) // 'images' 필드명으로 통일
        formData.append('userData', JSON.stringify(user))
        formData.append('scheduleId', id)
        formData.append('type', 'schedule') // 필수 필드 추가
        formData.append('description', description)

        const response = await fetch('/api/gallery-upload', {
          method: 'POST',
          body: formData
        })

        const data = await response.json()

        if (!data.success) {
          toast.error(`${file.name}: ${data.error || '업로드 중 오류가 발생했습니다.'}`)
        }
      }

      toast.success('사진들이 성공적으로 업로드되었습니다!')
      setSelectedFiles([])
      setDescription('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      loadPhotos() // 사진 목록 새로고침
    } catch (error) {
      console.error('업로드 오류:', error)
      toast.error('업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleCommentSubmit = async (imageId) => {
    if (!newComment.trim()) {
      toast.error('댓글을 입력해주세요.')
      return
    }

    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    try {
      setCommentSubmitting(true)
      console.log('댓글 제출 데이터:', {
        text: newComment,
        author: user.name,
        userId: user.id
      })
      
      const response = await fetch(`/api/gallery/${imageId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newComment,
          author: user.name,
          userId: user.id
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('댓글이 등록되었습니다! (+5점)')
        setNewComment('')
        loadPhotos() // 댓글 목록 새로고침
        
        // 모달에 표시된 사진도 업데이트
        if (selectedPhoto && selectedPhoto.id === imageId) {
          setSelectedPhoto(prev => ({ 
            ...prev, 
            comments: [...(prev.comments || []), data.comment] 
          }))
        }
      } else {
        toast.error(data.error || '댓글 등록 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('댓글 등록 오류:', error)
      toast.error('댓글 등록 중 오류가 발생했습니다.')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleEmojiClick = async (imageId, emoji) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    // 현재 이모티콘 상태 확인
    const currentPhoto = photos.find(p => p.id === imageId)
    const currentEmojiUsers = currentPhoto?.emojis?.[emoji] || []
    const isCurrentlyLiked = currentEmojiUsers.includes(user.id)
    
    // 낙관적 업데이트 (즉시 UI 반영)
    const optimisticEmojis = { ...currentPhoto?.emojis }
    if (isCurrentlyLiked) {
      // 제거
      optimisticEmojis[emoji] = currentEmojiUsers.filter(id => id !== user.id)
      if (optimisticEmojis[emoji].length === 0) {
        delete optimisticEmojis[emoji]
      }
      toast.success(`${emoji} 이모티콘을 제거했습니다! (-1점)`)
    } else {
      // 추가
      optimisticEmojis[emoji] = [...currentEmojiUsers, user.id]
      toast.success(`${emoji} 이모티콘을 추가했습니다! (+1점)`)
    }

    // UI 즉시 업데이트
    setPhotos(prevPhotos => 
      prevPhotos.map(photo => 
        photo.id === imageId 
          ? { ...photo, emojis: optimisticEmojis }
          : photo
      )
    )
    
    // 모달에 표시된 사진도 즉시 업데이트
    if (selectedPhoto && selectedPhoto.id === imageId) {
      setSelectedPhoto(prev => ({ ...prev, emojis: optimisticEmojis }))
    }

    try {
      console.log('이모티콘 클릭 데이터:', {
        emoji: emoji,
        userId: user.id,
        userName: user.name
      })
      
      const response = await fetch(`/api/gallery/${imageId}/emojis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emoji: emoji,
          userId: user.id,
          userName: user.name
        })
      })

      const data = await response.json()

      if (data.success) {
        console.log('이모티콘 API 응답:', data)
        
        // 서버 응답으로 최종 업데이트 (서버와 동기화)
        setPhotos(prevPhotos => 
          prevPhotos.map(photo => 
            photo.id === imageId 
              ? { ...photo, emojis: data.emojis }
              : photo
          )
        )
        
        // 모달에 표시된 사진도 최종 업데이트
        if (selectedPhoto && selectedPhoto.id === imageId) {
          setSelectedPhoto(prev => ({ ...prev, emojis: data.emojis }))
        }
      } else {
        // 실패 시 원상복구
        setPhotos(prevPhotos => 
          prevPhotos.map(photo => 
            photo.id === imageId 
              ? { ...photo, emojis: currentPhoto?.emojis || {} }
              : photo
          )
        )
        
        if (selectedPhoto && selectedPhoto.id === imageId) {
          setSelectedPhoto(prev => ({ ...prev, emojis: currentPhoto?.emojis || {} }))
        }
        
        toast.error(data.error || '이모티콘 처리 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('이모티콘 처리 오류:', error)
      
      // 오류 시 원상복구
      setPhotos(prevPhotos => 
        prevPhotos.map(photo => 
          photo.id === imageId 
            ? { ...photo, emojis: currentPhoto?.emojis || {} }
            : photo
        )
      )
      
      if (selectedPhoto && selectedPhoto.id === imageId) {
        setSelectedPhoto(prev => ({ ...prev, emojis: currentPhoto?.emojis || {} }))
      }
      
      toast.error('이모티콘 처리 중 오류가 발생했습니다.')
    }
  }

  const handleDeletePhoto = async (photoId) => {
    if (!confirm('이 사진을 삭제하시겠습니까?')) {
      return;
    }

    try {
      console.log('사진 삭제 시도:', photoId);
      
      const response = await fetch(`/api/gallery?id=${photoId}&userData=${encodeURIComponent(JSON.stringify(user))}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      console.log('삭제 응답:', data);

      if (data.success) {
        toast.success('사진이 삭제되었습니다.');
        
        // 모달이 열려있다면 닫기
        if (showPhotoModal) {
          setShowPhotoModal(false);
          setSelectedPhoto(null);
        }
        
        // 사진 목록에서 삭제된 사진 제거
        setPhotos(prevPhotos => prevPhotos.filter(photo => photo.id !== photoId));
        
        // 추가로 서버에서 최신 데이터 가져오기
        setTimeout(() => {
          loadPhotos();
        }, 500);
      } else {
        toast.error(data.error || '사진 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('사진 삭제 오류:', error);
      toast.error('사진 삭제 중 오류가 발생했습니다.');
    }
  }

  const handleAiLocationInfo = async () => {
    console.log('AI 장소 소개 버튼 클릭됨', { locationInfo });
    
    if (!locationInfo?.location && !locationInfo?.name) {
      toast.error('장소 정보가 없습니다. 먼저 상세정보를 확인해주세요.');
      return;
    }

    // 이미 로드된 경우 토글
    if (aiLocationInfo && !loadingAiLocationInfo) {
      setShowAiLocationInfo(!showAiLocationInfo);
      return;
    }

    setLoadingAiLocationInfo(true);
    setShowAiLocationInfo(false);
    
    try {
      // AI를 통해 장소 소개 생성 및 DB 저장
      const response = await fetch('/api/generate-location-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: locationInfo.location || locationInfo.name || '방문 장소',
          activity: locationInfo.activity || '연수 활동',
          scheduleId: id,
          userRegion: user?.region
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAiLocationInfo({
            title: result.title,
            description: result.description,
            highlights: result.highlights,
            tips: result.tips
          });
          setShowAiLocationInfo(true);
          toast.success('AI가 생성한 장소 소개를 불러왔습니다.');
        } else {
          throw new Error(result.error || 'AI 소개 생성 실패');
        }
      } else {
        throw new Error('장소 소개 생성 실패');
      }
    } catch (error) {
      console.error('장소 소개 생성 오류:', error);
      toast.error('장소 소개 생성 중 오류가 발생했습니다.');
    } finally {
      setLoadingAiLocationInfo(false);
    }
  }

    const showExample = async () => {
    try {
      const response = await fetch(`/api/save-example?activityId=${id}`)
      const data = await response.json()
      
      if (data.success && data.example) {
        setExampleContent(data.example.content)
        toast.success('예시자료를 불러왔습니다!')
      } else {
        // 제공된 예시자료 사용
        const defaultExample = `1. 종합중고등학교 방문을 통한 교육적 시사점
  (Josephine-Baker-Gesamtschule Frankfurt)
  가. 방문 개요
    ○ 위치: Gräfin-Dönhoff-Str. 11, 60438 Frankfurt
    ○ 방문 일시: 2025년 2월 3일 10:00~12:00
    ○ 홈페이지: https://www.josephine-baker-gesamtschule.org/ 
   나. 방문 내용
     독일의 종합중고등학교를 방문하여 교육 방식, 학습 환경, 디지털 교육 도입 현황을 탐색하고 한국 교육에 적용할 수 있는 시사점 및 AIDT와의 연계를 통한 미래 교육의 방향성을 모색하고자 하였다.
     1) 포용적 교육 체계
       학생을 성적으로 구분하지 않고 모든 학생을 받아들이며, 학습 수준에 따라 반을 나누지 않고, 한 반에서 다양한 수준의 학생이 함께 학습한다. 개별 맞춤형 교육을 제공하며, 별도의 속성반을 운영하지 않는다. 단, 독일어 구사가 어려운 학생을 위하여 별도의 학습 프로그램을 제공하고 있다.
     2) 교사 협업 중심 운영
      개별 교사가 아닌 팀 단위로 운영하며, 교사 간 협력을 통해 모든 학생을 포괄하는 교육 시스템을 구축하고 있다. 교사의 수업 자율권을 보장하여 창의적인 수업 운영이 가능하며, 학생과 학부모가 자연스럽게 교사와 학교의 권위를 인정하여 학사 운영이 원활히 진행되고 있었다.
     3) 수업 방식
       프로젝트 중심 학습(예: "내가 먹는 밥은 어디에서 오는가?")으로 교육이 진행되며, 필수 과목은 심화 학습, 그 외 과목은 자유로운 탐구 학습을 제공한다. 학년을 초월한 협업 학습(7~9학년이 함께 프로젝트 수행 등)도 진행하며, 대부분 교과서 없이 교사가 직접 수업 자료를 구성하여 학습 조력자의 역할을 수행한다.
     4) 디지털 교육 및 환경
       전자기기(맥북)를 학교 차원에서 실험적으로 도입하여 일부 교사들이 사용하고 있었다. 다만, 학생들의 전자기기 사용에 대해서는 학생들의 온전한 학습 몰입을 위해 학교 내 인터넷 사용을 물리적으로 차단하고 있었다. 전통적인 평가 방식을 최소화하고 프로젝트 및 수행 평가를 강화하며, 디지털 중심의 교육이라기보다 디지털 도구는 교육 달성의 하나의 도구로써 작용하는 부분이 크다.
     5) 외국어 교육 및 창의적 활동
       3학년부터 영어를 필수로 배우며, 5학년부터 제2외국어(프랑스어 등)를 학습하여, 모든 학생이 최소 2개 국어를 배운다. 또한, 테크닉(기술)과 창의적 활동이 교육과정에서 중요하게 다루어지며, 실습과 탐구 중심의 학습이 강조되고 있다.
     6) 학생 복지 및 정서적 지원
       학교 내 강아지를 배치하여 학생들의 정서 안정을 유도하고 있다. 특수 교육을 받은 강아지만 허용하며, 학생들의 사회성을 증진하는 도구로 활용하고 있다. 학생들은 이를 통해 감정 조절 및 협업 능력을 기를 수 있다고 한다.
     7) 학교 일정 및 시간표
       학교에서의 수업은 오전 8시 15분부터 진행되며, 가장 늦게 끝나는 수업이 오후 4시에 종료된다. 7시 30분부터는 학교에서 돌봄을 진행하며, 학생들에게 아침 식사를 제공한다. 돌봄 관련 업무는 시청에서 파견된 직원이 모두 전담하고 있으며, 교사는 수업 준비, 수업, 평가만 수행하고, 관련 행정 업무는 행정 직원이 담당하고 있다. 수업, 행정, 돌봄 등의 역할과 권한이 철저하게 분리되어 있다. 수업은 80~90분 정도 블록 형태의 수업으로 진행되며, 모겐 크라이스(Morgenkreis)라는 활동을 통해 하루 수업과 일정에 대해 학생들과 함께 이야기하고 공유하며 토론하는 시간을 가진다. 프로젝트 중심의 수업이 많이 이루어지기 때문에, 수업 시간 중 학교 내 복도나 홀 등 공유 공간을 학생들이 자유롭게 활용할 수 있도록 하고 있으며, 점심 및 쉬는 시간을 활용한 개별 학습 공간도 제공하고 있었다.
     8) AI 활용 교육에 대한 관점
       독일의 학교는 중앙 정부가 아닌 주 정부의 정책 및 학교에 따라 다르게 운영된다. 현재 독일에서는 전반적으로 AI 활용 교육에 대한 검증이 이루어지지 않았다고 한다. AI가 대학 미만의 교육 현장에서 활용되기 위해서는 관련 법이 제정되어야 하는데, 아직 법적 기반이 마련되지 않은 상태라고 한다. 관련 데이터나 연구가 부족하여 일부 학교에서는 실험적으로 AI를 활용하고 있지만, 전반적으로는 아직 논쟁이 진행 중이라고 한다. 학교장은 ChatGPT와 같은 인공지능 도구의 교육 활용을 반대하는 것은 아니고 필요하다고 생각한다고 하였다. 오히려 이러한 도구의 사용법이나 이것을 어떻게 학생에게 지원할 수 있는 방법으로 활용할 수 있는지 공부해야 한다고 의견을 주었다. 다만, 인공지능 도구가 교사의 역할을 완전히 대체할 수는 없다고 하였다. 그는 교사들에게 항상 "AI는 교사의 일자리를 빼앗는 것이 아니라 오히려 보조하기 때문에 교사의 역할이 중요해질 것이다."라고 이야기한다고 한다. 즉, 학교장의 관점에서 정리해보면 AI는 교육 보조 도구로 활용될 수 있으나, 궁극적으로는 교사의 역할을 보완하는 방향으로 적용해야 한다는 점이 강조되었다.
    다. 교육적 시사점과 활용 방안
     1) 포용적 교육 관점 도입 필요
      학생을 학습 성과로 구분하기보다는 다양한 수준의 학생들이 함께 학습하도록 하며 동시에 개별 맞춤형 학습 지원 체계 도입이 필요하다.
     2) 교사 협업 및 자율성 확대
      교사 간 협력 체계를 강화하여 개별 교사가 아닌 팀 단위의 교육을 학생들에게 제공하며, 교사의 자율성을 높여 창의적인 교육을 실현할 수 있도록 환경을 조성할 필요가 있다. 또한, 교사의 역할과 책임을 포괄적으로 도입하기보다 수업, 행정, 돌봄 등을 명확히 분리하여 교사가 양질의 수업을 제공할 수 있도록 지원이 필요하다.
    3) 학년 구분을 초월한 협력 학습 강화
      다양한 학년이 함께 학습할 수 있는 프로젝트 기반 학습을 확대하고 교과목을 융합한 교육과정 개발이 필요하다.
    4) 정서적 안정 및 학생 복지 강화
      학생들의 정서적 지원을 강화할 수 있는 프로그램 도입 검토가 필요하며, 학교 내에서 학생들이 자유롭게 탐구할 수 있는 학교 환경 제공이 필요하다.
    5) AIDT와의 연계 방안
      이 학교는 디지털 교육이 정착되지 않은 환경에서 학습을 운영하고 있었지만, 프로젝트 중심 학습과 협력적인 교사 운영 방식은 AI 및 디지털 교과서 도입 시 중요한 요소로 작용할 수 있을 것이다. 또한, 교사의 자율성을 보장하는 시스템을 유지하면서도 디지털 도구를 활용하여 협력적이고 프로젝트 중심의 수업 설계를 지원할 수 있는 방안을 마련할 필요가 있어 보인다. 디지털 교육 환경 구축에 있어 학생들이 학습 도구를 자유롭게 사용할 수 있는 공간을 제공하는 것도 고려해야 할 요소이다. AI를 기반으로 한 프로젝트 기반 학습(PBL) 모델을 도입하여 실생활 문제 해결 중심의 융합 학습을 강화하는 방향으로도 응용할 수 있을 것이다.
    라. 연수 사진`
        
        setExampleContent(defaultExample)
        toast.success('예시자료를 불러왔습니다!')
      }
    } catch (error) {
      console.error('예시자료 로드 오류:', error)
      toast.error('예시자료를 불러오는 중 오류가 발생했습니다.')
    }
  }

  const applyTemplate = async () => {
    try {
      setIsSaving(true)
      
      // 먼저 예시자료를 가져옴
      const exampleResponse = await fetch(`/api/save-example?activityId=${id}`)
      const exampleData = await exampleResponse.json()
      
      let contentToAnalyze = ''
      if (exampleData.success && exampleData.example) {
        contentToAnalyze = exampleData.example.content
      } else {
        // 기본 예시자료 사용
        contentToAnalyze = `1. 종합중고등학교 방문을 통한 교육적 시사점
  (Josephine-Baker-Gesamtschule Frankfurt)
  가. 방문 개요
    ○ 위치: Gräfin-Dönhoff-Str. 11, 60438 Frankfurt
    ○ 방문 일시: 2025년 2월 3일 10:00~12:00
    ○ 홈페이지: https://www.josephine-baker-gesamtschule.org/ 
   나. 방문 내용
     독일의 종합중고등학교를 방문하여 교육 방식, 학습 환경, 디지털 교육 도입 현황을 탐색하고 한국 교육에 적용할 수 있는 시사점 및 AIDT와의 연계를 통한 미래 교육의 방향성을 모색하고자 하였다.
     1) 포용적 교육 체계
       학생을 성적으로 구분하지 않고 모든 학생을 받아들이며, 학습 수준에 따라 반을 나누지 않고, 한 반에서 다양한 수준의 학생이 함께 학습한다. 개별 맞춤형 교육을 제공하며, 별도의 속성반을 운영하지 않는다. 단, 독일어 구사가 어려운 학생을 위하여 별도의 학습 프로그램을 제공하고 있다.
     2) 교사 협업 중심 운영
      개별 교사가 아닌 팀 단위로 운영하며, 교사 간 협력을 통해 모든 학생을 포괄하는 교육 시스템을 구축하고 있다. 교사의 수업 자율권을 보장하여 창의적인 수업 운영이 가능하며, 학생과 학부모가 자연스럽게 교사와 학교의 권위를 인정하여 학사 운영이 원활히 진행되고 있었다.
     3) 수업 방식
       프로젝트 중심 학습(예: "내가 먹는 밥은 어디에서 오는가?")으로 교육이 진행되며, 필수 과목은 심화 학습, 그 외 과목은 자유로운 탐구 학습을 제공한다. 학년을 초월한 협업 학습(7~9학년이 함께 프로젝트 수행 등)도 진행하며, 대부분 교과서 없이 교사가 직접 수업 자료를 구성하여 학습 조력자의 역할을 수행한다.
     4) 디지털 교육 및 환경
       전자기기(맥북)를 학교 차원에서 실험적으로 도입하여 일부 교사들이 사용하고 있었다. 다만, 학생들의 전자기기 사용에 대해서는 학생들의 온전한 학습 몰입을 위해 학교 내 인터넷 사용을 물리적으로 차단하고 있었다. 전통적인 평가 방식을 최소화하고 프로젝트 및 수행 평가를 강화하며, 디지털 중심의 교육이라기보다 디지털 도구는 교육 달성의 하나의 도구로써 작용하는 부분이 크다.
     5) 외국어 교육 및 창의적 활동
       3학년부터 영어를 필수로 배우며, 5학년부터 제2외국어(프랑스어 등)를 학습하여, 모든 학생이 최소 2개 국어를 배운다. 또한, 테크닉(기술)과 창의적 활동이 교육과정에서 중요하게 다루어지며, 실습과 탐구 중심의 학습이 강조되고 있다.
     6) 학생 복지 및 정서적 지원
       학교 내 강아지를 배치하여 학생들의 정서 안정을 유도하고 있다. 특수 교육을 받은 강아지만 허용하며, 학생들의 사회성을 증진하는 도구로 활용하고 있다. 학생들은 이를 통해 감정 조절 및 협업 능력을 기를 수 있다고 한다.
     7) 학교 일정 및 시간표
       학교에서의 수업은 오전 8시 15분부터 진행되며, 가장 늦게 끝나는 수업이 오후 4시에 종료된다. 7시 30분부터는 학교에서 돌봄을 진행하며, 학생들에게 아침 식사를 제공한다. 돌봄 관련 업무는 시청에서 파견된 직원이 모두 전담하고 있으며, 교사는 수업 준비, 수업, 평가만 수행하고, 관련 행정 업무는 행정 직원이 담당하고 있다. 수업, 행정, 돌봄 등의 역할과 권한이 철저하게 분리되어 있다. 수업은 80~90분 정도 블록 형태의 수업으로 진행되며, 모겐 크라이스(Morgenkreis)라는 활동을 통해 하루 수업과 일정에 대해 학생들과 함께 이야기하고 공유하며 토론하는 시간을 가진다. 프로젝트 중심의 수업이 많이 이루어지기 때문에, 수업 시간 중 학교 내 복도나 홀 등 공유 공간을 학생들이 자유롭게 활용할 수 있도록 하고 있으며, 점심 및 쉬는 시간을 활용한 개별 학습 공간도 제공하고 있었다.
     8) AI 활용 교육에 대한 관점
       독일의 학교는 중앙 정부가 아닌 주 정부의 정책 및 학교에 따라 다르게 운영된다. 현재 독일에서는 전반적으로 AI 활용 교육에 대한 검증이 이루어지지 않았다고 한다. AI가 대학 미만의 교육 현장에서 활용되기 위해서는 관련 법이 제정되어야 하는데, 아직 법적 기반이 마련되지 않은 상태라고 한다. 관련 데이터나 연구가 부족하여 일부 학교에서는 실험적으로 AI를 활용하고 있지만, 전반적으로는 아직 논쟁이 진행 중이라고 한다. 학교장은 ChatGPT와 같은 인공지능 도구의 교육 활용을 반대하는 것은 아니고 필요하다고 생각한다고 하였다. 오히려 이러한 도구의 사용법이나 이것을 어떻게 학생에게 지원할 수 있는 방법으로 활용할 수 있는지 공부해야 한다고 의견을 주었다. 다만, 인공지능 도구가 교사의 역할을 완전히 대체할 수는 없다고 하였다. 그는 교사들에게 항상 "AI는 교사의 일자리를 빼앗는 것이 아니라 오히려 보조하기 때문에 교사의 역할이 중요해질 것이다."라고 이야기한다고 한다. 즉, 학교장의 관점에서 정리해보면 AI는 교육 보조 도구로 활용될 수 있으나, 궁극적으로는 교사의 역할을 보완하는 방향으로 적용해야 한다는 점이 강조되었다.
    다. 교육적 시사점과 활용 방안
     1) 포용적 교육 관점 도입 필요
      학생을 학습 성과로 구분하기보다는 다양한 수준의 학생들이 함께 학습하도록 하며 동시에 개별 맞춤형 학습 지원 체계 도입이 필요하다.
     2) 교사 협업 및 자율성 확대
      교사 간 협력 체계를 강화하여 개별 교사가 아닌 팀 단위의 교육을 학생들에게 제공하며, 교사의 자율성을 높여 창의적인 교육을 실현할 수 있도록 환경을 조성할 필요가 있다. 또한, 교사의 역할과 책임을 포괄적으로 도입하기보다 수업, 행정, 돌봄 등을 명확히 분리하여 교사가 양질의 수업을 제공할 수 있도록 지원이 필요하다.
    3) 학년 구분을 초월한 협력 학습 강화
      다양한 학년이 함께 학습할 수 있는 프로젝트 기반 학습을 확대하고 교과목을 융합한 교육과정 개발이 필요하다.
    4) 정서적 안정 및 학생 복지 강화
      학생들의 정서적 지원을 강화할 수 있는 프로그램 도입 검토가 필요하며, 학교 내에서 학생들이 자유롭게 탐구할 수 있는 학교 환경 제공이 필요하다.
    5) AIDT와의 연계 방안
      이 학교는 디지털 교육이 정착되지 않은 환경에서 학습을 운영하고 있었지만, 프로젝트 중심 학습과 협력적인 교사 운영 방식은 AI 및 디지털 교과서 도입 시 중요한 요소로 작용할 수 있을 것이다. 또한, 교사의 자율성을 보장하는 시스템을 유지하면서도 디지털 도구를 활용하여 협력적이고 프로젝트 중심의 수업 설계를 지원할 수 있는 방안을 마련할 필요가 있어 보인다. 디지털 교육 환경 구축에 있어 학생들이 학습 도구를 자유롭게 사용할 수 있는 공간을 제공하는 것도 고려해야 할 요소이다. AI를 기반으로 한 프로젝트 기반 학습(PBL) 모델을 도입하여 실생활 문제 해결 중심의 융합 학습을 강화하는 방향으로도 응용할 수 있을 것이다.
    라. 연수 사진`
      }
      
      const response = await fetch('/api/apply-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: contentToAnalyze,
          activityId: id
        })
      })

      const data = await response.json()

      if (data.success && data.template) {
        setReport(data.template.format)
        toast.success('양식이 적용되었습니다!')
      } else {
        toast.error(data.error || '양식 적용 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('양식 적용 오류:', error)
      toast.error('양식 적용 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const aiTextEdit = async () => {
    if (!report.trim()) {
      toast.error('수정할 내용을 입력해주세요.')
      return
    }

    try {
      // 현재 내용을 클립보드에 복사
      await navigator.clipboard.writeText(report)
      toast.success('내용이 클립보드에 복사되었습니다!')
      
      // 기존 내용을 지우고 AI 수정된 내용으로 교체
      setIsSaving(true)
      const response = await fetch('/api/ai-text-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: report,
          activityId: id
        })
      })

      const data = await response.json()

      if (data.success) {
        setReport(data.improvedContent)
        toast.success('AI가 내용을 개선했습니다!')
      } else {
        toast.error(data.error || 'AI 수정 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('AI 수정 오류:', error)
      toast.error('AI 수정 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
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
            <h1 className="text-2xl font-bold text-gray-900">📋 방문장소</h1>
            <button
              onClick={() => router.back()}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← 뒤로가기
            </button>
          </div>
          
          {/* 방문장소 정보 */}
          {locationInfo && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">📍 {locationInfo.name}</h2>
                  {locationInfo.source && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      locationInfo.source === 'ai_analysis' 
                        ? 'bg-green-100 text-green-800' 
                        : locationInfo.source === 'default_data'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {locationInfo.source === 'ai_analysis' ? '🤖 AI 분석' : 
                       locationInfo.source === 'default_data' ? '📚 기본 데이터' : '📋 기본값'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowLocationDetails(!showLocationDetails)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showLocationDetails ? '📁 접기' : '📂 상세정보 보기'}
                </button>
              </div>
              
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">📅 방문 정보</h3>
                  <p className="text-sm text-gray-700">📆 방문 날짜: {locationInfo.visitDate || '날짜 정보 없음'}</p>
                  {locationInfo.hours && <p className="text-sm text-gray-700">⏰ 운영 시간: {locationInfo.hours}</p>}
                  {locationInfo.admission && <p className="text-sm text-gray-700">💰 입장료: {locationInfo.admission}</p>}
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">📞 연락처</h3>
                  {locationInfo.phone && <p className="text-sm text-gray-700">📞 전화: {locationInfo.phone}</p>}
                  {locationInfo.website && (
                    <p className="text-sm text-gray-700">
                      🌐 웹사이트: <a href={locationInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{locationInfo.website}</a>
                    </p>
                  )}
                </div>
              </div>
              
              {showLocationDetails && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                  {/* 설명 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">📖 장소 소개</h3>
                      <button
                        onClick={handleAiLocationInfo}
                        disabled={loadingAiLocationInfo}
                        className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                          loadingAiLocationInfo 
                            ? 'bg-gray-400 text-white cursor-not-allowed' 
                            : showAiLocationInfo
                            ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
                            : 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 shadow-md hover:shadow-lg'
                        }`}
                      >
                        {loadingAiLocationInfo ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            AI 분석 중...
                          </span>
                        ) : showAiLocationInfo ? (
                          '📍 AI 소개 숨기기'
                        ) : (
                          '🤖 AI 상세 소개'
                        )}
                      </button>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      {locationInfo.description}
                    </p>
                    
                    {/* AI 장소 소개 */}
                    {showAiLocationInfo && aiLocationInfo && (
                      <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        {/* 헤더 */}
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
                          <h4 className="text-xl font-bold mb-1">
                            🤖 {aiLocationInfo.title}
                          </h4>
                          <p className="text-blue-100 text-sm">
                            AI가 분석한 상세 정보
                          </p>
                        </div>
                        
                        {/* 설명 */}
                        <div className="p-4">
                          <div className="text-gray-700 whitespace-pre-line leading-relaxed mb-6">
                            {aiLocationInfo.description}
                          </div>
                          
                          {/* 하이라이트 */}
                          {aiLocationInfo.highlights && aiLocationInfo.highlights.length > 0 && (
                            <div className="mb-6">
                              <h5 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                ✨ 주요 하이라이트
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {aiLocationInfo.highlights.map((highlight, index) => (
                                  <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded-lg">
                                    <span className="text-blue-600 text-sm mt-0.5">•</span>
                                    <span className="text-gray-700 text-sm">{highlight}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* 팁 */}
                          {aiLocationInfo.tips && aiLocationInfo.tips.length > 0 && (
                            <div>
                              <h5 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                💡 방문 팁
                              </h5>
                              <div className="space-y-2">
                                {aiLocationInfo.tips.map((tip, index) => (
                                  <div key={index} className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                                    <span className="text-yellow-600 text-sm mt-0.5">💡</span>
                                    <span className="text-gray-700 text-sm">{tip}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 주소 */}
                  {locationInfo.address && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">📍 주소</h3>
                      <p className="text-gray-700">{locationInfo.address}</p>
                    </div>
                  )}
                  
                  {/* 교통 정보 */}
                  {locationInfo.transportation && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">🚇 교통 정보</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {locationInfo.transportation.subway && (
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-900">🚇 지하철</p>
                            <p className="text-sm text-gray-600">{locationInfo.transportation.subway}</p>
                          </div>
                        )}
                        {locationInfo.transportation.bus && (
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-900">🚌 버스</p>
                            <p className="text-sm text-gray-600">{locationInfo.transportation.bus}</p>
                          </div>
                        )}
                        {locationInfo.transportation.tram && (
                          <div className="bg-white rounded p-3">
                            <p className="text-sm font-medium text-gray-900">🚊 트램</p>
                            <p className="text-sm text-gray-600">{locationInfo.transportation.tram}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* 주변 장소 */}
                  {locationInfo.nearby && locationInfo.nearby.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">🏛️ 주변 관광지</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {locationInfo.nearby.map((place, index) => (
                          <div key={index} className="bg-white rounded p-3 border-l-4 border-blue-500">
                            <p className="text-sm font-medium text-gray-900">{place.name}</p>
                            <p className="text-xs text-gray-600">{place.distance} • {place.type}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 방문 팁 */}
                  {locationInfo.tips && locationInfo.tips.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">💡 방문 팁</h3>
                      <div className="space-y-2">
                        {locationInfo.tips.map((tip, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <span className="text-yellow-500 mt-1">💡</span>
                            <p className="text-sm text-gray-700">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* AI 분석 결과 */}
                  {locationInfo.analysis && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">🤖 AI 분석 결과</h3>
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border-l-4 border-purple-500">
                        <p className="text-sm text-gray-700 leading-relaxed">{locationInfo.analysis}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 사진 갤러리 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">📸 사진 갤러리</h2>
          
          {/* 사진 업로드 */}
          <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors mb-4"
              >
                📷 사진 선택 (다중선택 가능)
              </button>
              
              {selectedFiles.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">선택된 파일들:</p>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                        <span className="text-sm">{file.name}</span>
                        <button
                          onClick={() => removeSelectedFile(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="사진 설명을 입력하세요... (모든 사진에 적용됩니다)"
                    className="w-full p-2 border border-gray-300 rounded-lg resize-none mt-3"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo, index) => (
              <div key={photo.id || index} className="bg-gray-50 rounded-lg p-4 relative">
                {/* 삭제 버튼 (본인이 업로드한 사진만) */}
                {user && (
                  (photo.uploadedBy?.id === user.id || 
                   photo.userId === user.id || 
                   photo.uploadedBy?.name === user.name ||
                   user.name === '임환진') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(photo.id);
                      }}
                      className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white p-3 rounded-full text-sm opacity-90 hover:opacity-100 transition-all shadow-lg"
                      title="사진 삭제"
                    >
                      🗑️
                    </button>
                  )
                )}
                
                <img
                  src={photo.imageUrl}
                  alt={`활동 사진 ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg mb-3 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    setSelectedPhoto(photo);
                    setShowPhotoModal(true);
                  }}
                />
                
                {photo.description && (
                  <p className="text-sm text-gray-700 mb-3">{photo.description}</p>
                )}
                
                <div className="text-xs text-gray-500 mb-3">
                  업로드: {photo.uploadedAt || photo.createdAt ? 
                    new Date(photo.uploadedAt || photo.createdAt).toLocaleString('ko-KR') : 
                    '날짜 정보 없음'
                  }
                </div>

                {/* 이모티콘 */}
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">😊 이모티콘</h4>
                  <div className="flex flex-wrap gap-2">
                    {['😊', '👍', '❤️', '🎉', '🔥', '👏'].map((emoji) => {
                      const emojiUsers = photo.emojis?.[emoji] || [];
                      const count = emojiUsers.length;
                      const isUserLiked = user && emojiUsers.includes(user.id);
                      
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleEmojiClick(photo.id, emoji)}
                          className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-sm transition-all ${
                            isUserLiked 
                              ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300' 
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          <span className="text-lg">{emoji}</span>
                          {count > 0 && <span className="font-medium">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 댓글 */}
                {photo.comments && photo.comments.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">💬 댓글</h4>
                    <div className="space-y-2">
                      {photo.comments.map((comment, commentIndex) => (
                        <div key={commentIndex} className="bg-white rounded p-2 text-xs">
                          <div className="font-medium text-gray-900">{comment.author}</div>
                          <div className="text-gray-700">{comment.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 새 댓글 입력 */}
                <div className="mb-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="댓글을 입력하세요..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !commentSubmitting) {
                          handleCommentSubmit(photo.id);
                        }
                      }}
                      className="flex-1 p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleCommentSubmit(photo.id)}
                      disabled={commentSubmitting || !newComment.trim()}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                    >
                      {commentSubmitting ? '등록 중...' : '등록'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {photos.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📸</div>
              <p className="text-gray-600">아직 업로드된 사진이 없습니다</p>
              <p className="text-gray-500 mt-2">멋진 사진을 찍어서 업로드해보세요!</p>
            </div>
          )}
        </div>

        {/* 활동 보고서 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">📝 활동 보고서</h2>
          
          <div className="mb-4 flex space-x-2">
            <button
              onClick={showExample}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              📋 예시보기
            </button>
            <button
              onClick={applyTemplate}
              disabled={isSaving}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              📄 양식 반영
            </button>
            <button
              onClick={aiTextEdit}
              disabled={isSaving}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              🤖 AI 내용 수정
            </button>
          </div>

          {/* 예시 상자 */}
          {exampleContent && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">📋 예시자료</h3>
              <div className="text-sm text-yellow-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                {exampleContent}
              </div>
            </div>
          )}

          <textarea
            value={report}
            onChange={(e) => setReport(e.target.value)}
            placeholder="활동 보고서를 작성하세요..."
            className="w-full min-h-[400px] p-4 border border-gray-300 rounded-lg resize-y"
            style={{ minHeight: '400px', maxHeight: '800px' }}
          />

          <div className="mt-4 text-sm text-gray-600">
            <p>💡 <strong>예시보기</strong>: 미리 저장된 예시자료를 불러옵니다.</p>
            <p>💡 <strong>양식 반영</strong>: 예시자료의 내용을 AI가 양식을 그대로 정리해서 상자에 반영합니다.</p>
            <p>💡 <strong>AI 내용 수정</strong>: 현재 내용을 클립보드에 복사하고 AI가 개선된 내용으로 교체합니다.</p>
          </div>
        </div>
      </div>

      {/* 사진 상세 모달 */}
      {showPhotoModal && selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              {/* 모달 헤더 */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">사진 상세보기</h3>
                <div className="flex items-center space-x-2">
                  {user && (selectedPhoto.uploadedBy?.id === user.id || selectedPhoto.userId === user.id) && (
                    <button
                      onClick={() => handleDeletePhoto(selectedPhoto.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    >
                      🗑️ 삭제
                    </button>
                  )}
                  <button
                    onClick={() => setShowPhotoModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 사진 */}
              <div className="mb-4">
                <img
                  src={selectedPhoto.imageUrl}
                  alt="상세 사진"
                  className="w-full max-h-96 object-contain rounded-lg"
                />
              </div>

              {/* 사진 정보 */}
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  업로드: {selectedPhoto.uploadedBy?.name} ({selectedPhoto.uploadedBy?.affiliation})
                </p>
                <p className="text-sm text-gray-600">
                  날짜: {selectedPhoto.uploadedAt || selectedPhoto.createdAt ? 
                    new Date(selectedPhoto.uploadedAt || selectedPhoto.createdAt).toLocaleString('ko-KR') : 
                    '날짜 정보 없음'
                  }
                </p>
                {selectedPhoto.description && (
                  <p className="text-sm text-gray-700 mt-2">{selectedPhoto.description}</p>
                )}
              </div>

              {/* 이모티콘 (모달 버전) */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">😊 이모티콘</h4>
                <div className="flex flex-wrap gap-2">
                  {['😊', '👍', '❤️', '🎉', '🔥', '👏'].map((emoji) => {
                    const emojiUsers = selectedPhoto.emojis?.[emoji] || [];
                    const count = emojiUsers.length;
                    const isUserLiked = user && emojiUsers.includes(user.id);
                    
                    return (
                      <button
                        key={emoji}
                        onClick={() => {
                          handleEmojiClick(selectedPhoto.id, emoji);
                          // 모달의 selectedPhoto도 업데이트 (실시간 반영)
                        }}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-base transition-all ${
                          isUserLiked 
                            ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <span className="text-xl">{emoji}</span>
                        {count > 0 && <span className="font-medium">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 댓글 (모달 버전) */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">💬 댓글</h4>
                
                {/* 기존 댓글 */}
                {selectedPhoto.comments && selectedPhoto.comments.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {selectedPhoto.comments.map((comment, commentIndex) => (
                      <div key={commentIndex} className="bg-gray-50 rounded p-3">
                        <div className="font-medium text-gray-900 text-sm">{comment.author}</div>
                        <div className="text-gray-700">{comment.text}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 새 댓글 입력 */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="댓글을 입력하세요..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !commentSubmitting) {
                        handleCommentSubmit(selectedPhoto.id);
                      }
                    }}
                    className="flex-1 p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleCommentSubmit(selectedPhoto.id)}
                    disabled={commentSubmitting || !newComment.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap font-medium"
                  >
                    {commentSubmitting ? '등록 중...' : '💬 등록'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
