import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { Toaster, toast } from 'react-hot-toast'
import { db, storage } from '../../firebaseConfig'
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { compressImages, formatFileSize } from '../../utils/imageCompressor'


export default function ScheduleGallery() {
  const router = useRouter()
  const { scheduleId } = router.query
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState(null)
  const [images, setImages] = useState([])
  

  const [userData, setUserData] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [showComments, setShowComments] = useState({})
  const [showEmojiPicker, setShowEmojiPicker] = useState({})
  const [researchTasks, setResearchTasks] = useState('')
  const [aiEditing, setAiEditing] = useState(false)
  const [imageEmojis, setImageEmojis] = useState({})
  const [locationInfo, setLocationInfo] = useState('')
  const [showLocationInfo, setShowLocationInfo] = useState(false)
  const [loadingLocationInfo, setLoadingLocationInfo] = useState(false)

  const [highlightedImage, setHighlightedImage] = useState(null)
  const [isLocationSectionVisible, setIsLocationSectionVisible] = useState(false)
  


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

    if (scheduleId) {
      console.log('scheduleId 변경됨:', scheduleId)
      const userData = checkAuth()
      if (userData) {
        // userData가 설정된 후에 loadScheduleData 호출
        timeoutId = setTimeout(() => {
          loadScheduleData(userData)
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

    // Cleanup function to clear timeout
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [scheduleId, router])






  const loadScheduleData = async (userDataParam = userData) => {
    try {
      setLoading(true)
      
      if (!userDataParam?.region) {
        throw new Error('사용자 권역 정보가 없습니다.')
      }
      
      console.log('Loading schedule data for region:', userDataParam.region, 'scheduleId:', scheduleId)
      
      // 일정 정보 로드
      const response = await fetch(`/api/schedule-management?region=${userDataParam.region.replace(/[^0-9]/g, '')}`)
      const result = await response.json()
      
      console.log('Schedule API response:', result)
      
      if (result.success && result.data && result.data.activities) {
        // scheduleId로 일정 찾기
        let foundSchedule = null
        
        // free-schedule 형태의 scheduleId 처리
        if (scheduleId.startsWith('free-schedule-')) {
          const regionNumber = scheduleId.replace('free-schedule-', '')
          foundSchedule = {
            id: scheduleId,
            date: '2025-08-05', // 기본 날짜
            time: '자유 시간',
            activity: '🗓️ 자유 일정 - 개인 탐방',
            location: '엘시티 레지던스',
            description: '개인 또는 팀별로 자유롭게 계획할 수 있는 시간입니다. 주변 관광지, 맛집, 쇼핑 등을 자유롭게 탐방하세요.',
            details: ['개인 탐방 및 관광', '현지 맛집 방문', '쇼핑 및 문화체험', '휴식 및 사진 촬영']
          }
        } else {
          // 기존 로직: scheduleId 형식이 "date_index"인지 확인
          const scheduleIdParts = scheduleId.split('_')
          if (scheduleIdParts.length === 2) {
            const [date, indexStr] = scheduleIdParts
            const index = parseInt(indexStr)
            
            if (result.data.activities[date] && Array.isArray(result.data.activities[date])) {
              const activity = result.data.activities[date][index]
              if (activity) {
                foundSchedule = {
                  id: scheduleId,
                  date: date,
                  time: activity.time,
                  activity: activity.activity,
                  location: activity.location || '',
                  description: activity.description || '',
                  details: activity.details || []
                }
              }
            }
          } else {
            // scheduleId가 다른 형식일 경우, 모든 활동을 순회하며 찾기
            Object.entries(result.data.activities).forEach(([date, activities]) => {
              if (Array.isArray(activities)) {
                activities.forEach((activity, index) => {
                  const currentId = `${date}_${index}`
                  if (currentId === scheduleId) {
                    foundSchedule = {
                      id: scheduleId,
                      date: date,
                      time: activity.time,
                      activity: activity.activity,
                      location: activity.location || '',
                      description: activity.description || '',
                      details: activity.details || []
                    }
                  }
                })
              }
            })
          }
        }
        
        if (foundSchedule) {
          console.log('Found schedule:', foundSchedule)
          setSchedule(foundSchedule)
          await loadGalleryImages()
          await loadResearchTasks()
        } else {
          console.log('Schedule not found for ID:', scheduleId)
          console.log('Available activities:', result.data.activities)
          // 일정을 찾지 못한 경우 사용자에게 알림
          toast.error('해당 일정을 찾을 수 없습니다.')
          router.push('/dashboard')
          return
        }
      } else {
        console.log('API response failed:', result)
        // API 응답이 실패한 경우
        toast.error('일정 정보를 불러올 수 없습니다.')
        router.push('/dashboard')
        return
      }
    } catch (error) {
      console.error('일정 데이터 로드 오류:', error)
      toast.error('일정 정보 로드 중 오류가 발생했습니다.')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadGalleryImages = async () => {
    try {
      console.log('갤러리 이미지 로드 시작 - scheduleId:', scheduleId)
      
      if (!scheduleId) {
        console.error('scheduleId가 없습니다.')
        return
      }
      
      const response = await fetch(`/api/gallery?scheduleId=${scheduleId}`)
      console.log('갤러리 API 응답 상태:', response.status, response.statusText)
      
      const result = await response.json()
      console.log('갤러리 API 응답 데이터:', result)
      
      if (result.success) {
        console.log('🔍 갤러리 API 결과 분석:')
        console.log('- result.success:', result.success)
        console.log('- result.data 타입:', typeof result.data)
        console.log('- result.data 길이:', result.data?.length)
        console.log('- result.data 첫 번째 항목:', result.data?.[0])
        console.log('- 전체 result 객체:', result)
        
        setImages(result.data || [])
        console.log('✅ setImages 호출 완료 - 설정된 길이:', (result.data || []).length)
        
        // 이미지별 이모지 상태 로드
        const emojiStates = {};
        result.data.forEach(image => {
          if (image.emojis) {
            emojiStates[image.id] = image.emojis;
          }
        });
        setImageEmojis(emojiStates);
        
        // 이미지 URL 검증
        result.data.forEach(image => {
          console.log('이미지 정보:', {
            id: image.id,
            imageUrl: image.imageUrl,
            fileName: image.fileName,
            uploadedAt: image.uploadedAt
          });
          if (!image.imageUrl || image.imageUrl.startsWith('blob:')) {
            console.warn('잘못된 이미지 URL:', image.imageUrl);
          }
        });
        
        console.log('갤러리 상태 업데이트 완료')
      } else {
        console.error('갤러리 API 실패:', result.error)
        toast.error('갤러리 이미지를 불러올 수 없습니다.')
      }
    } catch (error) {
      console.error('갤러리 이미지 로드 오류:', error)
      toast.error('갤러리 이미지 로드 중 오류가 발생했습니다.')
    }
  }

  const loadResearchTasks = async () => {
    try {
      // 연구 과제 데이터 로드 (새로운 컬렉션 사용)
      const q = query(
        collection(db, 'researchTasks'),
        where('scheduleId', '==', scheduleId)
      )
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        const taskData = snapshot.docs[0].data()
        setResearchTasks(taskData.content || '')
      }
    } catch (error) {
      console.error('연구 과제 로드 오류:', error)
    }
  }

  const handleImageUpload = async (files) => {
    if (!userData) {
        toast.error("사용자 정보가 없습니다. 다시 로그인해주세요.");
        return;
    }
    if (!files || files.length === 0) return
    
    console.log('파일 업로드 시작:', {
      fileCount: files.length,
      files: Array.from(files).map(f => ({ name: f.name, size: f.size, type: f.type }))
    })
    
    // 파일 크기 검증 (2GB 제한)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    const oversizedFiles = Array.from(files).filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      toast.error(`${oversizedFiles.length}개 파일이 2GB를 초과합니다.`);
      return;
    }
    
    // 큰 파일 경고 (100MB 이상)
    const warningSize = 100 * 1024 * 1024; // 100MB
    const largeFiles = Array.from(files).filter(file => file.size > warningSize);
    if (largeFiles.length > 0) {
      console.warn(`${largeFiles.length}개 파일이 100MB를 초과합니다. 업로드에 시간이 걸릴 수 있습니다.`);
      toast.warning(`${largeFiles.length}개 파일이 100MB를 초과합니다. 업로드에 시간이 걸릴 수 있습니다.`);
    }
    
    try {
      setUploading(true)
      
      // 이미지 압축 처리
      toast.loading('이미지를 압축하고 있습니다...', { id: 'compressing' });
      const compressedFiles = await compressImages(Array.from(files), 4); // 4MB로 압축
      toast.dismiss('compressing');
      
      // 압축 결과 로그
      compressedFiles.forEach((file, index) => {
        const originalFile = Array.from(files)[index];
        const compressionRatio = ((originalFile.size - file.size) / originalFile.size * 100).toFixed(1);
        if (file.size < originalFile.size) {
          console.log(`파일 ${file.name} 압축 완료: ${formatFileSize(originalFile.size)} → ${formatFileSize(file.size)} (${compressionRatio}% 감소)`);
          toast.success(`${file.name}: ${formatFileSize(originalFile.size)} → ${formatFileSize(file.size)} (${compressionRatio}% 압축)`);
        }
      });
      
      const uploadPromises = compressedFiles.map(async (file, index) => {
        console.log(`파일 ${index + 1} 업로드 시작:`, file.name, `크기: ${formatFileSize(file.size)}`)
        
        try {
          // Firebase Storage에 직접 업로드
          const storageRef = ref(storage, `schedule-gallery/${scheduleId}/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          
          console.log(`파일 ${file.name} Storage 업로드 완료:`, downloadURL);
          
          // Firestore에 메타데이터 저장
          const imageData = {
            imageUrl: downloadURL,
            fileName: file.name,
            uploadedBy: {
              id: userData.id,
              name: userData.name,
              affiliation: userData.affiliation
            },
            uploadedAt: new Date().toISOString(),
            scheduleId: scheduleId,
            date: schedule?.date || '',
            location: schedule?.location || '',
            activity: schedule?.activity || '',
            type: 'schedule',
            comments: [],
            emojis: {},
          };
          
          const docRef = await addDoc(collection(db, 'gallery'), imageData);
          console.log(`파일 ${file.name} Firestore 저장 완료:`, docRef.id);
          
          return {
            success: true,
            data: {
              id: docRef.id,
              ...imageData
            }
          };
          
        } catch (error) {
          console.error(`파일 ${file.name} 업로드 실패:`, error);
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }
      });
      
      const results = await Promise.all(uploadPromises);
      console.log('모든 파일 업로드 완료:', results)
      toast.success(`${compressedFiles.length}장의 사진이 업로드되었습니다.`);
      
      // 업로드된 이미지들을 즉시 상태에 추가 (안전한 처리)
      const newImages = results
        .filter(result => result && result.success && result.data)
        .map(result => {
          console.log('업로드 결과 데이터:', result.data);
          return {
            id: result.data.id || `temp_${Date.now()}_${Math.random()}`,
            imageUrl: result.data.imageUrl || result.url,
            fileName: result.data.fileName || 'unknown',
            uploadedBy: result.data.uploadedBy || userData,
            uploadedAt: result.data.uploadedAt || new Date().toISOString(),
            scheduleId: result.data.scheduleId || scheduleId,
            date: result.data.date || schedule?.date || '',
            location: result.data.location || schedule?.location || '',
            activity: result.data.activity || schedule?.activity || ''
          };
        });
      
      console.log('새로 추가할 이미지들:', newImages);
      
      if (newImages.length > 0) {
        setImages(prevImages => {
          const updatedImages = [...newImages, ...prevImages];
          console.log('업데이트된 이미지 목록:', updatedImages);
          return updatedImages;
        });
      }
      
      // 즉시 갤러리 새로고침
      console.log('갤러리 새로고침 시작...');
      await loadGalleryImages();
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      toast.error(`사진 업로드에 실패했습니다: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  const handleAddComment = async (imageId) => {
    if (!newComment.trim()) {
      toast.error('댓글을 입력해주세요.');
      return;
    }

    if (commentSubmitting) {
      toast.error('댓글 등록 중입니다.');
      return;
    }

    setCommentSubmitting(true);

    try {
      const response = await fetch(`/api/gallery/${imageId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newComment.trim(),
          author: userData?.name || userData?.participantName || '익명',
          userId: userData?.id || 'unknown'
        })
      });

      if (response.ok) {
        setNewComment('');
        setShowEmojiPicker(prev => ({...prev, [imageId]: false}));
        await loadGalleryImages();
        toast.success('댓글이 등록되었습니다!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || '댓글 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 등록 오류:', error);
      toast.error('댓글 등록 중 오류가 발생했습니다.');
    } finally {
      setCommentSubmitting(false);
    }
  }

  const handleAddEmoji = (emoji) => {
    setNewComment(prev => prev + emoji);
  }

    const handleImageEmoji = async (imageId, emoji) => {
        if (!userData || !userData.id) {
            toast.error('로그인이 필요합니다.');
            return;
        }

        try {
            // Optimistic UI update
            const currentEmojis = imageEmojis[imageId] || {};
            const emojiUsers = currentEmojis[emoji] || [];
            const userHasReacted = emojiUsers.includes(userData.id);

            const newEmojiUsers = userHasReacted 
                ? emojiUsers.filter(id => id !== userData.id)
                : [...emojiUsers, userData.id];

            setImageEmojis(prev => ({
                ...prev,
                [imageId]: {
                    ...prev[imageId],
                    [emoji]: newEmojiUsers,
                },
            }));

            const response = await fetch(`/api/gallery/${imageId}/emojis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emoji,
                    userId: userData.id,
                }),
            });

            if (!response.ok) {
                // Revert UI on failure
                setImageEmojis(prev => ({
                    ...prev,
                    [imageId]: currentEmojis,
                }));
                toast.error('이모지 업데이트에 실패했습니다.');
            } else {
                const result = await response.json();
                console.log('Emoji API result:', result);
                
                // 서버에서 반환된 최신 이모지 데이터로 state 업데이트
                if (result.success && result.emojis) {
                    setImageEmojis(prev => ({
                        ...prev,
                        [imageId]: result.emojis,
                    }));
                }
                
                if (result.bonus && result.bonus.message) {
                    toast.success(result.bonus.message);
                }
                if (result.uploaderBonus && result.uploaderBonus.message) {
                    toast.success(result.uploaderBonus.message);
                }
                
                console.log('이모지 업데이트 완료');
            }
        } catch (error) {
            console.error('이모지 업데이트 오류:', error);
            toast.error('이모지 업데이트 중 오류가 발생했습니다.');
        }
    };

  const toggleEmojiPicker = (imageId) => {
    setShowEmojiPicker(prev => ({...prev, [imageId]: !prev[imageId]}));
  }

  const handleImageSelection = (imageId) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  }

  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) {
      toast.error('삭제할 사진을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedImages.length}장의 사진을 삭제하시겠습니까?`)) {
      return;
    }

    // userData 확인
    if (!userData) {
      console.error('userData가 없습니다. 세션을 확인해주세요.')
      toast.error('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.')
      return
    }

    try {
      console.log('일괄 삭제 요청 시작:', {
        selectedImages: selectedImages,
        userData: userData,
        userName: userData.name,
        userRegion: userData.region,
        isAdmin: userData.name === '임환진'
      })

      // userData에서 필수 정보만 추출 (헤더 크기 제한 해결)
      const essentialUserData = {
        name: userData.name,
        region: userData.region,
        affiliation: userData.affiliation,
        team: userData.team,
        isUser: userData.isUser,
        isGuide: userData.isGuide
      }
      
      const userDataParam = encodeURIComponent(JSON.stringify(essentialUserData))
      
      const deletePromises = selectedImages.map(async (imageId) => {
        const url = `/api/gallery?scheduleId=${scheduleId}&userData=${userDataParam}`
        console.log('일괄 삭제 URL:', url)
        
        const response = await fetch(url, { method: 'DELETE' })
        const responseData = await response.json()
        
        console.log(`이미지 ${imageId} 삭제 응답:`, response.status, responseData)
        
        if (!response.ok || !responseData.success) {
          throw new Error(`이미지 ${imageId} 삭제 실패: ${responseData.error}`)
        }
        
        return responseData
      });
      
      await Promise.all(deletePromises);
      setSelectedImages([]);
      
      console.log('일괄 삭제 완료, 갤러리 새로고침 시작...')
      await loadGalleryImages();
      toast.success(`${selectedImages.length}장의 사진이 삭제되었습니다.`);
    } catch (error) {
      console.error('일괄 삭제 오류:', error);
      toast.error(`삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  const handleDeleteImage = async (imageId) => {
    if (!confirm('이 사진을 삭제하시겠습니까?')) return
    
    // userData 확인
    if (!userData) {
      console.error('userData가 없습니다. 세션을 확인해주세요.')
      toast.error('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.')
      return
    }
    
    try {
      console.log('삭제 요청 시작:', {
        imageId: imageId,
        userData: userData,
        userDataString: JSON.stringify(userData)
      })
      
      // userData에서 필수 정보만 추출 (헤더 크기 제한 해결)
      const essentialUserData = {
        name: userData.name,
        region: userData.region,
        affiliation: userData.affiliation,
        team: userData.team,
        isUser: userData.isUser,
        isGuide: userData.isGuide
      }
      
      const userDataParam = encodeURIComponent(JSON.stringify(essentialUserData))
      const url = `/api/gallery?id=${imageId}&userData=${userDataParam}`
      
      console.log('필수 userData:', essentialUserData)
      console.log('삭제 URL:', url)
      console.log('userDataParam 길이:', userDataParam.length)
      
      const response = await fetch(url, {
        method: 'DELETE'
      })
      
      console.log('삭제 응답 상태:', response.status, response.statusText)
      
      const responseData = await response.json()
      console.log('삭제 응답 데이터:', responseData)
      
      if (response.ok && responseData.success) {
        toast.success('사진이 삭제되었습니다.')
        console.log('갤러리 새로고침 시작...')
        
        // 강제 새로고침을 위해 약간의 지연 후 실행
        setTimeout(async () => {
          try {
            await loadGalleryImages()
            console.log('갤러리 새로고침 완료')
          } catch (refreshError) {
            console.error('갤러리 새로고침 실패:', refreshError)
            // 새로고침 실패 시 페이지 전체 새로고침
            window.location.reload()
          }
        }, 500)
      } else {
        const errorMessage = responseData.error || '알 수 없는 오류'
        console.error('삭제 실패:', errorMessage)
        toast.error(`삭제 실패: ${errorMessage}`)
      }
    } catch (error) {
      console.error('이미지 삭제 오류:', error)
      toast.error('사진 삭제에 실패했습니다.')
    }
  }

  const handleAiTextEdit = async () => {
    if (!researchTasks.trim()) {
      toast.error('수정할 내용을 입력해주세요.');
      return;
    }

    setAiEditing(true);
    const loadingToast = toast.loading('AI가 텍스트를 수정하고 있습니다...');
    
    try {
      // 기존 내용을 복사 (클립보드에 저장)
      await navigator.clipboard.writeText(researchTasks);
      toast.success('기존 내용이 클립보드에 복사되었습니다.');

      // AI 수정 요청
      const aiResponse = await fetch('/api/ai-text-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: researchTasks,
          scheduleId: scheduleId
        })
      });

      if (aiResponse.ok) {
        const result = await aiResponse.json();
        if (result.success) {
          // 기존 내용을 삭제하고 새로운 내용으로 교체
          setResearchTasks(result.data.editedText);
          toast.success('AI가 내용을 수정했습니다. 기존 내용은 클립보드에 복사되어 있습니다.', { id: loadingToast });
        } else {
          toast.error(result.error || 'AI 수정에 실패했습니다.', { id: loadingToast });
        }
      } else {
        const errorData = await aiResponse.json();
        toast.error(errorData.error || 'AI 수정 요청에 실패했습니다.', { id: loadingToast });
      }
    } catch (error) {
      console.error('AI 수정 오류:', error);
      toast.error('AI 수정 중 오류가 발생했습니다.', { id: loadingToast });
    } finally {
      setAiEditing(false);
    }
  }

  const saveResearchTasks = async () => {
    try {
      // 연구 과제 저장
      const q = query(
        collection(db, 'researchTasks'),
        where('scheduleId', '==', scheduleId)
      )
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        // 기존 문서 업데이트
        await updateDoc(doc(db, 'researchTasks', snapshot.docs[0].id), {
          content: researchTasks,
          updatedAt: new Date().toISOString()
        });
      } else {
        // 새 문서 생성
        await addDoc(collection(db, 'researchTasks'), {
          scheduleId: scheduleId,
          content: researchTasks,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      toast.success('연구 과제가 저장되었습니다.');
    } catch (error) {
      console.error('연구 과제 저장 오류:', error);
      toast.error('저장에 실패했습니다.');
    }
  }

  const handleLocationInfo = async () => {
    if (!schedule.location) {
      toast.error('장소 정보가 없습니다.')
      return
    }

    if (locationInfo && !loadingLocationInfo) {
      setShowLocationInfo(!showLocationInfo)
      return
    }

    setLoadingLocationInfo(true)
    try {
      // AI를 통해 장소 정보 분석 및 DB 저장
      const response = await fetch('/api/parse-location-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: schedule.location,
          activity: schedule.activity,
          scheduleId: scheduleId,
          userRegion: userData?.region
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setLocationInfo(result.analyzedInfo)
          setShowLocationInfo(true)
          toast.success('AI가 분석한 장소 정보를 저장했습니다.')
        } else {
          throw new Error(result.error || 'AI 분석 실패')
        }
      } else {
        throw new Error('장소 정보 분석 실패')
      }
    } catch (error) {
      console.error('장소 정보 분석 오류:', error)
      // 임시로 더미 데이터 사용
      const dummyInfo = `${schedule.location}에 대한 AI 분석 정보입니다.\n\n이 장소는 연수 활동에 적합한 환경을 제공하며, 다양한 교육 시설과 편의시설을 갖추고 있습니다. 방문자들에게 만족스러운 경험을 제공하는 것으로 알려져 있으며, 교육 목적으로 자주 활용되는 장소입니다.\n\nAI 분석 결과, 이 장소는 교육적 가치가 높고 접근성이 좋으며, 연수 참가자들의 학습 효과를 극대화할 수 있는 최적의 환경을 제공합니다.`
      setLocationInfo(dummyInfo)
      setShowLocationInfo(true)
      toast.success('장소 정보를 분석했습니다.')
    } finally {
      setLoadingLocationInfo(false)
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      const month = date.getMonth() + 1
      const day = date.getDate()
      const weekdays = ['일', '월', '화', '수', '목', '금', '토']
      const weekday = weekdays[date.getDay()]
      return `${month}월 ${day}일 (${weekday})`
    } catch (error) {
      return dateString
    }
  }

  const formatDescription = (description) => {
    if (!description) return '';
    
    // 기호와 문장부호를 보기 좋게 정리
    let formatted = description
      // 연속된 공백 제거
      .replace(/\s+/g, ' ')
      // 문장 부호 정리
      .replace(/\s*([,.!?])\s*/g, '$1 ')
      .replace(/\s*([,.!?])([가-힣])/g, '$1 $2')
      // 기호 정리
      .replace(/\s*▶\s*/g, '\n▶ ')
      .replace(/\s*•\s*/g, '\n• ')
      .replace(/\s*-\s*/g, '\n- ')
      .replace(/\s*○\s*/g, '\n○ ')
      // 괄호 정리
      .replace(/\s*\(\s*/g, ' (')
      .replace(/\s*\)\s*/g, ') ')
      // 줄바꿈 정리
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/\n\s+/g, '\n')
      .trim();
    
    return formatted;
  }

  // 숙소 정보 로드 (독립 저장)
useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (window.google?.maps) {
        setIsMapLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsMapLoaded(true);
      script.onerror = () => toast.error('Google Maps를 불러올 수 없습니다.');
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, []);

  const getDefaultTemplate = () => {
    const currentDate = schedule?.date ? formatDate(schedule.date) : '해당 일시'
    const location = schedule?.location || '해당 장소'
    const activity = schedule?.activity || '해당 활동'
    
    return `2. ${location} 방문을 통한 교육적 시사점

가. 방문 개요
○ 위치: ${location}
○ 방문 일시: ${currentDate}
○ 방문 목적: 교육적 시사점 도출 및 현장 학습
○ 활동 내용: ${activity}

나. 방문 내용
${location}에서의 방문을 통해 다음과 같은 내용을 확인할 수 있었다.

1) ${location} 현장 탐방
- 시설 및 환경 소개
- 운영 방식 및 특징
- 교육적 활용 방안

2) 주요 학습 내용
- 현장에서 직접 체험한 내용
- 교육적 시사점
- 향후 활용 가능성

다. 교육적 시사점과 활용 방안
1) 교과 연계: ${location}의 특성을 활용한 다양한 교과 연계 방안
2) 현장 학습: 실제 경험을 통한 학습 효과 극대화 방안
3) 교육 프로그램: ${location}을 활용한 교육 프로그램 개발 방안

라. 시사점
이번 ${location} 방문을 통해 해당 장소의 교육적 활용 가능성을 확인할 수 있었다. 특히 실제 현장 경험과 교육적 목적을 접목한 학습 시스템의 중요성을 재확인하였다. 향후 교육 활동에서 이러한 현장 학습의 효과를 극대화할 수 있는 방안을 지속적으로 모색할 필요가 있다.

라. 방문 사진
(업로드된 사진들을 통해 방문 현장의 모습을 기록하고, 교육적 활용 방안을 시각적으로 제시할 수 있다.)`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">일정을 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-4">해당 일정 정보를 불러올 수 없습니다.</p>
          <button
            onClick={() => {
              try {
                router.push('/dashboard')
              } catch (error) {
                console.error('대시보드 이동 오류:', error)
                toast.error('대시보드 이동 중 오류가 발생했습니다.')
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📷 {schedule.location}
              </h1>
              <p className="text-gray-600 text-lg">
                {formatDate(schedule.date)} • {schedule.time}
              </p>
            </div>
            <button
              onClick={() => {
                try {
                  router.push('/dashboard')
                } catch (error) {
                  console.error('대시보드 이동 오류:', error)
                  toast.error('대시보드 이동 중 오류가 발생했습니다.')
                }
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              ← 대시보드로
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 일정 정보 카드 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 text-white p-3 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  {schedule.activity}
                  <button
                    onClick={handleLocationInfo}
                    className="ml-4 p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors flex items-center text-sm"
                    title="장소 정보 보기"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    정보 보기
                  </button>
                </h1>
                <p className="text-lg text-gray-600 mt-1">{schedule.location}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">일시</p>
                <p className="text-lg font-semibold text-blue-600">{schedule.time}</p>
              </div>
            </div>
          </div>
          
          {schedule.details && schedule.details.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📋</span>
                상세 일정
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedule.details.map((detail, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-blue-500 font-bold">{index + 1}</span>
                    <span className="text-gray-700">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* 장소 정보 섹션 */}
          {showLocationInfo && locationInfo && (
            <div className="mt-6 bg-white rounded-lg p-6 shadow-sm border-l-4 border-purple-500">
              <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center">
                <span className="mr-2">📍</span>
                장소 상세 정보
              </h3>
              <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                {locationInfo}
              </div>
            </div>
          )}
        </div>

        {/* 방문장소 정보 섹션 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-blue-500 text-white p-3 rounded-full mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">📍 방문장소 정보</h3>
                <p className="text-gray-600">연수 일정의 주요 방문 장소 정보</p>
              </div>
            </div>
            <button
              onClick={handleLocationInfo}
              disabled={loadingLocationInfo}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loadingLocationInfo ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>분석 중...</span>
                </>
              ) : (
                <>
                  <span>🤖</span>
                  <span>AI 장소 분석</span>
                </>
              )}
            </button>
          </div>

          {/* 방문장소 정보 카드 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 기본 일정 정보 */}
              <div className="lg:col-span-1">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">📅 일정 정보</h4>
                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center mb-2">
                      <span className="text-blue-600 mr-2">📆</span>
                      <span className="font-medium text-gray-900">날짜</span>
                    </div>
                    <span className="text-gray-700">{formatDate(schedule?.date)}</span>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center mb-2">
                      <span className="text-green-600 mr-2">⏰</span>
                      <span className="font-medium text-gray-900">시간</span>
                    </div>
                    <span className="text-gray-700">{schedule?.time || '미정'}</span>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center mb-2">
                      <span className="text-purple-600 mr-2">📍</span>
                      <span className="font-medium text-gray-900">장소</span>
                    </div>
                    <span className="text-gray-700">{schedule?.location || '미정'}</span>
                  </div>
                </div>
              </div>

              {/* 활동 내용 */}
              <div className="lg:col-span-2">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">📝 활동 내용</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed">
                    {formatDescription(schedule?.description)}
                  </p>
                </div>
                
                {schedule?.details && schedule.details.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-800 mb-2">📋 상세 일정</h5>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <ul className="space-y-2">
                        {schedule.details.map((detail, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-yellow-600 mr-2 mt-1">•</span>
                            <span className="text-gray-700 text-sm">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI 분석된 장소 정보 */}
            {locationInfo && showLocationInfo && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">🤖 AI 분석 결과</h4>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    AI 분석 완료
                  </span>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {locationInfo}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>



        {/* 갤러리 카드 */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-purple-500 text-white p-3 rounded-full mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">📷 갤러리</h3>
                <p className="text-gray-600">{images.length}장의 사진</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {selectedImages.length > 0 && (
                <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm">
                  <span className="text-sm text-gray-700 font-medium">
                    {selectedImages.length}장 선택됨
                  </span>
                  <button
                    onClick={() => {
                      try {
                        handleBulkDelete()
                      } catch (error) {
                        console.error('일괄 삭제 오류:', error)
                        toast.error('일괄 삭제 중 오류가 발생했습니다.')
                      }
                    }}
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
                  try {
                    if (e.target.files.length > 0) {
                      handleImageUpload(e.target.files)
                    }
                  } catch (error) {
                    console.error('이미지 업로드 오류:', error)
                    toast.error('이미지 업로드 중 오류가 발생했습니다.')
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
          
          {uploading && (
            <div className="flex items-center space-x-2 text-blue-600 mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>업로드 중...</span>
            </div>
          )}
          
          <div>
            <p>총 {images.length}개의 이미지가 있습니다.</p>
            {images && images.length > 0 && (
              <div className="mb-6">
                <h3>첫 번째 이미지 정보:</h3>
                <p>ID: {images[0].id}</p>
                <p>imageUrl: {images[0].imageUrl ? '있음' : '없음'}</p>
                <p>url: {images[0].url ? '있음' : '없음'}</p>
                {(images[0].imageUrl || images[0].url) && (
                  <img 
                    src={images[0].imageUrl || images[0].url} 
                    alt="테스트 이미지" 
                    style={{width: '200px', height: '200px', objectFit: 'cover'}} 
                  />
                )}
              </div>
            )}
            {images && images.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {images.map((image, index) => (
                <div key={image.id} className={`relative group bg-gray-50 rounded-lg p-2 ${
                  highlightedImage === image.id ? 'ring-4 ring-yellow-400 ring-opacity-75 shadow-lg' : ''
                }`}>
                  {/* 하이라이트 배지 */}
                  {highlightedImage === image.id && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        👑 킹오브킹
                      </div>
                    </div>
                  )}
                  
                  {/* 선택 체크박스 */}
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedImages.includes(image.id)}
                      onChange={() => {
                        try {
                          handleImageSelection(image.id)
                        } catch (error) {
                          console.error('이미지 선택 오류:', error)
                          toast.error('이미지 선택 처리 중 오류가 발생했습니다.')
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>

                  {/* 개별 삭제 버튼 (본인이 업로드한 사진만) */}
                  {userData && image.uploadedBy?.id === userData.id && (
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image.id);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-full text-xs opacity-80 hover:opacity-100 transition-all"
                        title="사진 삭제"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                  
                                      <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                    {(image.imageUrl || image.url) ? (
                      <img
                        src={image.imageUrl || image.url}
                        alt={`사진 ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          try {
                            console.error('이미지 로드 실패:', image.imageUrl);
                            // DOM 조작 대신 React state로 처리
                            setImages(prevImages => 
                              prevImages.map(img => 
                                img.id === image.id 
                                  ? { ...img, loadError: true }
                                  : img
                              )
                            );
                          } catch (error) {
                            console.error('이미지 에러 처리 오류:', error);
                            // 에러 처리 중 오류가 발생하면 기본적으로 에러 상태로 설정
                            setImages(prevImages => 
                              prevImages.map(img => 
                                img.id === image.id 
                                  ? { ...img, loadError: true }
                                  : img
                              )
                            );
                          }
                        }}
                        onLoad={(e) => {
                          try {
                            console.log('이미지 로드 성공:', image.imageUrl);
                            // 로드 성공 시 에러 상태 제거
                            setImages(prevImages => 
                              prevImages.map(img => 
                                img.id === image.id 
                                  ? { ...img, loadError: false }
                                  : img
                              )
                            );
                          } catch (error) {
                            console.error('이미지 로드 성공 처리 오류:', error);
                            // 로드 성공 처리 중 오류가 발생해도 에러 상태는 제거
                            setImages(prevImages => 
                              prevImages.map(img => 
                                img.id === image.id 
                                  ? { ...img, loadError: false }
                                  : img
                              )
                            );
                          }
                        }}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    
                    {/* 이미지 로드 에러 또는 이미지가 없는 경우 */}
                    {(!image.imageUrl || image.loadError) && (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                        <div className="text-center">
                          <div className="text-2xl mb-2">📷</div>
                          <p>이미지를 불러올 수 없습니다</p>
                          {image.imageUrl?.startsWith('blob:') ? (
                            <p className="text-xs mt-1 text-red-500">임시 URL - 업로드 필요</p>
                          ) : (
                            <div className="text-xs mt-1">
                              <p>URL: {image.imageUrl?.substring(0, 50)}...</p>
                              <button 
                                onClick={() => {
                                  try {
                                    window.open(image.imageUrl, '_blank')
                                  } catch (error) {
                                    console.error('URL 열기 오류:', error)
                                    toast.error('URL 열기 중 오류가 발생했습니다.')
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800 mt-1"
                              >
                                🔗 URL 직접 열기
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 이미지 정보 */}
                  <div className="mt-2 space-y-2">
                    <div className="text-xs text-gray-500">
                      {image.uploadedBy?.name || '익명'} • {image.uploadedAt ? new Date(image.uploadedAt).toLocaleDateString() : '날짜 정보 없음'}
                    </div>
                    
                    {/* 이미지 이모티콘 */}
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-1">
                        {['👍', '❤️', '😊', '🎉', '🔥'].map((emoji) => {
                          const emojiUsers = imageEmojis[image.id]?.[emoji] || [];
                          const count = emojiUsers.length;
                          const userHasReacted = userData && emojiUsers.includes(userData.id);

                          return (
                            <button
                              key={emoji}
                              onClick={() => handleImageEmoji(image.id, emoji)}
                              className={`text-sm px-2 py-1 rounded transition-colors ${
                                userHasReacted ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                              }`}
                              title={`${emoji} ${count}`}
                            >
                              {emoji} {count > 0 ? count : ''}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => {
                            try {
                              setShowEmojiPicker(prev => ({ ...prev, [image.id]: !prev[image.id] }))
                            } catch (error) {
                              console.error('이모티콘 선택기 토글 오류:', error)
                              toast.error('이모티콘 선택기 표시 중 오류가 발생했습니다.')
                            }
                          }}
                          className="text-sm px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          title="더 많은 이모티콘"
                        >
                          ➕
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          try {
                            handleDeleteImage(image.id)
                          } catch (error) {
                            console.error('이미지 삭제 오류:', error)
                            toast.error('이미지 삭제 중 오류가 발생했습니다.')
                          }
                        }}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                    
                    {/* 댓글 수 표시 */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          try {
                            setShowComments(prev => ({...prev, [image.id]: !prev[image.id]}))
                          } catch (error) {
                            console.error('댓글 토글 오류:', error)
                            toast.error('댓글 표시 처리 중 오류가 발생했습니다.')
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        💬 {image.comments?.length || 0}개 댓글
                      </button>
                    </div>
                    
                    {/* 댓글 섹션 */}
                    {showComments[image.id] && (
                      <div className="border-t pt-2 mt-2">
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {image.comments?.map((comment, idx) => (
                            <div key={idx} className="text-xs bg-white p-2 rounded">
                              <div className="font-medium text-gray-800">{comment.author}</div>
                              <div className="text-gray-600">{comment.text}</div>
                              <div className="text-gray-400 text-xs">
                                {new Date(comment.time).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* 댓글 입력 */}
                        <div className="flex space-x-2 mt-2">
                          <div className="flex-1 flex space-x-1">
                            <input
                              type="text"
                              value={newComment}
                              onChange={(e) => {
                                try {
                                  setNewComment(e.target.value || '')
                                } catch (error) {
                                  console.error('댓글 입력 오류:', error)
                                  toast.error('댓글 입력 중 오류가 발생했습니다.')
                                }
                              }}
                              onKeyPress={(e) => {
                                try {
                                  if (e.key === 'Enter') {
                                    handleAddComment(image.id);
                                  }
                                } catch (error) {
                                  console.error('댓글 입력 키 오류:', error)
                                  toast.error('댓글 입력 중 오류가 발생했습니다.')
                                }
                              }}
                              placeholder="댓글을 입력하세요..."
                              className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => {
                                try {
                                  toggleEmojiPicker(image.id)
                                } catch (error) {
                                  console.error('이모티콘 선택기 토글 오류:', error)
                                  toast.error('이모티콘 선택기 처리 중 오류가 발생했습니다.')
                                }
                              }}
                              className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300"
                              title="이모티콘"
                            >
                              😊
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              try {
                                handleAddComment(image.id)
                              } catch (error) {
                                console.error('댓글 등록 오류:', error)
                                toast.error('댓글 등록 중 오류가 발생했습니다.')
                              }
                            }}
                            disabled={commentSubmitting}
                            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:bg-gray-400"
                          >
                            {commentSubmitting ? '등록중...' : '등록'}
                          </button>
                        </div>
                        
                        {/* 이모티콘 선택기 */}
                        {showEmojiPicker[image.id] && (
                          <div className="mt-2 p-2 bg-white border border-gray-300 rounded-lg shadow-lg">
                            <div className="grid grid-cols-8 gap-1">
                              {['😊', '😂', '🥰', '😍', '🤔', '👍', '👏', '🎉', '❤️', '🔥', '⭐', '💯', '😎', '🤩', '😭', '😱', '🤗', '😴', '🤤', '😋', '🥳', '🤠', '👻', '🤖', '🐱', '🐶', '🦄', '🌈', '🍕', '☕', '🍺', '🎵'].map((emoji, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    try {
                                      handleImageEmoji(image.id, emoji)
                                      setShowEmojiPicker(prev => ({ ...prev, [image.id]: false }))
                                    } catch (error) {
                                      console.error('이모티콘 선택 오류:', error)
                                      toast.error('이모티콘 선택 중 오류가 발생했습니다.')
                                    }
                                  }}
                                  className="text-lg hover:bg-gray-100 rounded p-1 transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📷</div>
                <p className="text-gray-500 text-lg">아직 업로드된 사진이 없습니다.</p>
                <p className="text-gray-400 text-sm mt-2">첫 번째 사진을 업로드해보세요!</p>
              </div>
            )}
          </div>
        </div>

        {/* 연수 내용 (하단으로 이동) */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📝 연수 내용</h3>
          <div className="space-y-4">
            <textarea
              value={researchTasks || ''}
              onChange={(e) => {
                try {
                  setResearchTasks(e.target.value || '')
                } catch (error) {
                  console.error('텍스트 입력 오류:', error)
                  toast.error('텍스트 입력 중 오류가 발생했습니다.')
                }
              }}
              placeholder="연수 내용을 입력하세요..."
              className="w-full min-h-64 border-2 border-gray-300 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg resize-y"
            />
            <div className="text-sm text-gray-600 mb-4">
              AI 글 수정을 누르면 자동으로 AI가 글의 내용을 수정해주며 기존의 내용을 복사한 후 새로운 내용이 생성됩니다. 일시나 장소 정보는 일정표에서 자동으로 가져옵니다.
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  try {
                    saveResearchTasks()
                  } catch (error) {
                    console.error('연수 내용 저장 오류:', error)
                    toast.error('연수 내용 저장 중 오류가 발생했습니다.')
                  }
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg font-semibold transition-colors text-sm md:text-base"
              >
                💾 저장
              </button>
              <button
                onClick={() => {
                  try {
                    setResearchTasks(getDefaultTemplate())
                  } catch (error) {
                    console.error('기본 양식 설정 오류:', error)
                    toast.error('기본 양식 설정 중 오류가 발생했습니다.')
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold transition-colors text-sm md:text-base"
              >
                📋 기본 양식
              </button>

              <button
                onClick={() => {
                  try {
                    handleAiTextEdit()
                  } catch (error) {
                    console.error('AI 글 수정 오류:', error)
                    toast.error('AI 글 수정 중 오류가 발생했습니다.')
                  }
                }}
                disabled={aiEditing || !researchTasks.trim()}
                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm md:text-base"
              >
                {aiEditing ? '🤖 AI 수정 중...' : '🤖 AI 글 수정'}
              </button>
            </div>
            

          </div>
        </div>


      </main>
    </div>
  )
} 