import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { Toaster, toast } from 'react-hot-toast'
import { db } from '../firebaseConfig'
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, updateDoc } from 'firebase/firestore'
import { compressImages, formatFileSize } from '../utils/imageCompressor'

export default function FreeSchedule() {
  const router = useRouter()
  const { date, time } = router.query
  const [selectedTheme, setSelectedTheme] = useState('맛집')
  const [selectedDate, setSelectedDate] = useState(date || '')
  const [selectedTime, setSelectedTime] = useState(time || '')
  const [hotelName, setHotelName] = useState('')
  const [userRegion, setUserRegion] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [map, setMap] = useState(null)
  const [galleryImages, setGalleryImages] = useState([])
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [showFullscreenMap, setShowFullscreenMap] = useState(false)
  const [highlightedImage, setHighlightedImage] = useState(null)
  const [showHotelEdit, setShowHotelEdit] = useState(false)
  const [customHotelName, setCustomHotelName] = useState('')
  const [selectedImages, setSelectedImages] = useState([])
  const [imageEmojis, setImageEmojis] = useState({})
  const [showComments, setShowComments] = useState({})
  const [newComment, setNewComment] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState({})
  const [selectedImage, setSelectedImage] = useState(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [galleryFilter, setGalleryFilter] = useState('all') // all, today, recent
  const mapRef = useRef(null)
  const isMountedRef = useRef(true)

  const themes = ['맛집', '카페', '관광지', '쇼핑', '문화체험']

  // 추천 장소 데이터
  const recommendations = {
    '맛집': [
      { name: '프라하 전통 레스토랑', description: '굴라쉬와 맥주가 일품', rating: 4.5, location: 'Prague, Czech Republic' },
      { name: '비엔나 슈니첼 하우스', description: '바삭한 비엔나 슈니첼의 정석', rating: 4.7, location: 'Prague, Czech Republic' },
      { name: '체코 맥주 하우스', description: '세계 최고의 맥주를 맛볼 수 있는 곳', rating: 4.6, location: 'Prague, Czech Republic' }
    ],
    '카페': [
      { name: '카프카 박물관 카페', description: '분위기 좋은 전통 카페', rating: 4.3, location: 'Prague, Czech Republic' },
      { name: '자허 토르테', description: '비엔나 커피와 함께 즐기는 달콤한 휴식', rating: 4.7, location: 'Prague, Czech Republic' },
      { name: '프라하 루프트 카페', description: '아름다운 전망을 감상할 수 있는 카페', rating: 4.4, location: 'Prague, Czech Republic' }
    ],
    '관광지': [
      { name: '바츨라프 광장', description: '프라하의 중심가, 야경 감상', rating: 4.8, location: 'Prague, Czech Republic' },
      { name: '프라하 성', description: '천년의 역사가 살아있는 체코의 상징', rating: 4.8, location: 'Prague, Czech Republic' },
      { name: '카를교', description: '블타바강을 가로지르는 아름다운 다리', rating: 4.9, location: 'Prague, Czech Republic' }
    ],
    '쇼핑': [
      { name: '구시가 쇼핑거리', description: '전통 공예품과 기념품 쇼핑', rating: 4.4, location: 'Prague, Czech Republic' },
      { name: '바츨라프 광장 쇼핑몰', description: '현대적인 쇼핑과 문화 공간', rating: 4.3, location: 'Prague, Czech Republic' },
      { name: '파리즈카 거리', description: '명품 쇼핑과 고급 레스토랑', rating: 4.5, location: 'Prague, Czech Republic' }
    ],
    '문화체험': [
      { name: '구시가 광장', description: '천문시계와 고딕 건축물 감상', rating: 4.8, location: 'Prague, Czech Republic' },
      { name: '유대인 묘지', description: '역사적인 유대인 문화 유산', rating: 4.6, location: 'Prague, Czech Republic' },
      { name: '국립 박물관', description: '체코의 역사와 문화를 한눈에', rating: 4.7, location: 'Prague, Czech Republic' }
    ]
  }

  // 숙소 정보 가져오기
  const loadHotelInfo = async (region) => {
    try {
      const response = await fetch(`/api/schedule-management?region=${region}`)
      const result = await response.json()
      
      if (result.success && result.data && result.data.activities) {
        let hotelInfo = null
        let lastActivityOfDay = null
        
        // 선택된 날짜의 일정들 찾기
        const currentDate = selectedDate || new Date().toISOString().split('T')[0]
        const dayActivities = result.data.activities[currentDate] || []
        
        // 해당 날짜의 마지막 일정 찾기
        if (dayActivities.length > 0) {
          lastActivityOfDay = dayActivities[dayActivities.length - 1]
        }
        
        // 모든 일정을 날짜순으로 정렬하여 전체 숙소 정보 찾기
        const allActivities = []
        Object.entries(result.data.activities).forEach(([date, activities]) => {
          if (Array.isArray(activities)) {
            activities.forEach((activity) => {
              allActivities.push({
                ...activity,
                date: date
              })
            })
          }
        })
        
        // 날짜순으로 정렬
        allActivities.sort((a, b) => new Date(a.date) - new Date(b.date))
        
        // 숙소 정보 찾기
        for (const activity of allActivities) {
          if (activity.location && (
            activity.location.includes('호텔') || 
            activity.location.includes('숙소') || 
            activity.location.includes('Hotel') ||
            activity.location.includes('hotel')
          )) {
            hotelInfo = {
              name: activity.location,
              date: activity.date,
              time: activity.time
            }
            break
          }
        }
        
        if (hotelInfo && hotelInfo.name && hotelInfo.name !== '호텔' && !hotelInfo.name.includes('호텔')) {
          setHotelName(hotelInfo.name)
        } else {
          // 숙소 정보가 없거나 정확하지 않으면 해당 날짜의 마지막 일정 위치를 사용
          if (lastActivityOfDay && lastActivityOfDay.location) {
            setHotelName(`참고 위치: ${lastActivityOfDay.location} (${currentDate} 마지막 일정: ${lastActivityOfDay.activityName || lastActivityOfDay.activity})`)
          } else {
            // 해당 날짜에 일정이 없으면 전체 마지막 일정 사용
            const lastActivity = allActivities[allActivities.length - 1]
            if (lastActivity && lastActivity.location) {
              setHotelName(`참고 위치: ${lastActivity.location} (전체 마지막 일정: ${lastActivity.activityName || lastActivity.activity})`)
            } else {
              setHotelName('숙소 정보 없음')
            }
          }
        }
      } else {
        setHotelName('일정 정보를 불러올 수 없습니다')
      }
      
        // 커스텀 숙소 데이터가 있으면 사용 (날짜별로 구분)
        const currentDate = selectedDate || new Date().toISOString().split('T')[0]
        const savedHotelData = localStorage.getItem(`customHotelData_${region}_${currentDate}`)
        if (savedHotelData) {
          try {
            const hotelData = JSON.parse(savedHotelData)
            setCustomHotelName(hotelData.name || '')
            // 주소와 전화번호 필드에 값 설정
            setTimeout(() => {
              const addressField = document.getElementById('hotel-address')
              const phoneField = document.getElementById('hotel-phone')
              if (addressField && hotelData.address) {
                addressField.value = hotelData.address
              }
              if (phoneField && hotelData.phone) {
                phoneField.value = hotelData.phone
              }
            }, 100)
          } catch (error) {
            console.error('저장된 숙소 데이터 파싱 오류:', error)
          }
        }
    } catch (error) {
      console.error('숙소 정보 로드 오류:', error)
      setHotelName('숙소 정보 로드 실패')
    }
  }

  // 구글 맵스로 이동하는 함수
  const openInGoogleMaps = (placeName) => {
    const searchQuery = encodeURIComponent(`${placeName} Prague`)
    window.open(`https://www.google.com/maps/search/${searchQuery}`, '_blank')
  }

  // 구글 맵스 스크립트 로드
  const loadGoogleMapsScript = () => {
    if (window.google && window.google.maps) {
      setIsMapLoaded(true)
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg&libraries=places`
      script.async = true
      script.defer = true
      
      script.onload = () => {
        if (isMountedRef.current) {
          setIsMapLoaded(true)
          resolve()
        }
      }
      
      script.onerror = () => {
        if (isMountedRef.current) {
          reject(new Error('Google Maps 로드 실패'))
        }
      }
      
      document.head.appendChild(script)
    })
  }

  // 지도 초기화
  const initMap = async () => {
    if (!isMapLoaded || !mapRef.current) return

    try {
      const geocoder = new window.google.maps.Geocoder()
      
      // 커스텀 숙소 데이터 확인
      const currentDate = selectedDate || new Date().toISOString().split('T')[0]
      const regionNumber = userRegion?.replace(/[^0-9]/g, '') || '2'
      const savedHotelData = localStorage.getItem(`customHotelData_${regionNumber}_${currentDate}`)
      
      let searchAddress = customHotelName || hotelName
      let hotelTitle = customHotelName || hotelName
      
      if (savedHotelData) {
        try {
          const hotelData = JSON.parse(savedHotelData)
          if (hotelData.name) {
            searchAddress = hotelData.name
            hotelTitle = hotelData.name
          }
          if (hotelData.address) {
            searchAddress = hotelData.address
          }
        } catch (error) {
          console.error('저장된 숙소 데이터 파싱 오류:', error)
        }
      } else if (!customHotelName && hotelName.includes('참고 위치:')) {
        const locationMatch = hotelName.match(/참고 위치: (.+?) \(/)
        if (locationMatch) {
          searchAddress = locationMatch[1]
        }
      }
      
      // 검색 주소가 없으면 기본값 사용
      if (!searchAddress || searchAddress === '숙소 정보 없음') {
        searchAddress = 'Prague, Czech Republic'
        hotelTitle = '프라하 (기본 위치)'
      }
      
      geocoder.geocode({ address: searchAddress }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location
          
          const mapInstance = new window.google.maps.Map(mapRef.current, {
            center: location,
            zoom: 15,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          })

          new window.google.maps.Marker({
            position: location,
            map: mapInstance,
            title: hotelTitle,
            icon: {
              url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new window.google.maps.Size(32, 32)
            }
          })

          setMap(mapInstance)
        } else {
          console.error('지오코딩 실패:', status)
          // 실패 시 기본 프라하 위치로 설정
          const defaultLocation = { lat: 50.0755, lng: 14.4378 }
          const mapInstance = new window.google.maps.Map(mapRef.current, {
            center: defaultLocation,
            zoom: 12,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          })

          new window.google.maps.Marker({
            position: defaultLocation,
            map: mapInstance,
            title: '프라하 (기본 위치)',
            icon: {
              url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new window.google.maps.Size(32, 32)
            }
          })

          setMap(mapInstance)
        }
      })
    } catch (error) {
      console.error('지도 초기화 오류:', error)
    }
  }

  // 갤러리 이미지 로드
  const loadGalleryImages = async () => {
    try {
      const currentDate = selectedDate || new Date().toISOString().split('T')[0]
      const regionNumber = userRegion?.replace(/[^0-9]/g, '') || '2'
      
      console.log('자유일정 갤러리 로드 시작:', {
        currentDate: currentDate,
        regionNumber: regionNumber
      })
      
      const response = await fetch(`/api/free-schedule-gallery?region=${regionNumber}&date=${currentDate}`)
      console.log('자유일정 갤러리 API 응답 상태:', response.status, response.statusText)
      
      const result = await response.json()
      console.log('자유일정 갤러리 API 응답 데이터:', result)
      
      if (result.success) {
        console.log('자유일정 갤러리 이미지 데이터 로드 성공:', result.data.length, '개')
        setGalleryImages(result.data)
        
        // 이미지별 이모지 상태 로드
        const emojiStates = {};
        result.data.forEach(image => {
          if (image.emojis) {
            emojiStates[image.id] = image.emojis;
          }
        });
        setImageEmojis(emojiStates);
        
        console.log('자유일정 갤러리 상태 업데이트 완료')
      } else {
        console.error('자유일정 갤러리 API 실패:', result.error)
      }
    } catch (error) {
      console.error('자유일정 갤러리 로드 오류:', error)
    }
  }

  // 이미지 업로드 처리
  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return
    
    // 파일 크기 검증 (2GB 제한)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    const oversizedFiles = Array.from(files).filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      toast.error(`${oversizedFiles.length}개 파일이 2GB를 초과합니다.`);
      return;
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
      
      const uploadPromises = compressedFiles.map(async (file) => {
        const formData = new FormData()
        formData.append('image', file)
        const regionNumber = userRegion?.replace(/[^0-9]/g, '') || '2'
        formData.append('region', regionNumber)
        formData.append('date', selectedDate || new Date().toISOString().split('T')[0])
        formData.append('uploadedBy', JSON.stringify(userData || {}))
        
        const response = await fetch('/api/free-schedule-gallery', {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(`Failed to upload ${file.name}: ${errorData.error || response.statusText}`);
        }
        
        return response.json();
      });
      
      await Promise.all(uploadPromises);
      toast.success(`${compressedFiles.length}장의 사진이 업로드되었습니다.`);
      await loadGalleryImages();
      setShowImageUpload(false);
      setSelectedFiles([]);
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      toast.error('사진 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  // 파일 선택 처리
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  }

  const handleDeleteImage = async (imageId) => {
    if (!confirm('이 사진을 삭제하시겠습니까?')) return
    
    // userData 확인
    const currentUserData = userData
    if (!currentUserData) {
      console.error('userData가 없습니다. 세션을 확인해주세요.')
      toast.error('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.')
      return
    }
    
    try {
      console.log('자유일정 삭제 요청 시작:', {
        imageId: imageId,
        userData: currentUserData,
        userDataString: JSON.stringify(currentUserData)
      })
      
      const userDataParam = encodeURIComponent(JSON.stringify(currentUserData))
      const url = `/api/free-schedule-gallery?id=${imageId}&userData=${userDataParam}`
      
      console.log('자유일정 삭제 URL:', url)
      
      const response = await fetch(url, {
        method: 'DELETE'
      })
      
      console.log('자유일정 삭제 응답 상태:', response.status, response.statusText)
      
      const responseData = await response.json()
      console.log('자유일정 삭제 응답 데이터:', responseData)
      
      if (response.ok && responseData.success) {
        toast.success('사진이 삭제되었습니다.')
        console.log('자유일정 갤러리 새로고침 시작...')
        
        // 강제 새로고침을 위해 약간의 지연 후 실행
        setTimeout(async () => {
          try {
            await loadGalleryImages()
            console.log('자유일정 갤러리 새로고침 완료')
          } catch (refreshError) {
            console.error('자유일정 갤러리 새로고침 실패:', refreshError)
            // 새로고침 실패 시 페이지 전체 새로고침
            window.location.reload()
          }
        }, 500)
      } else {
        const errorMessage = responseData.error || '알 수 없는 오류'
        console.error('자유일정 삭제 실패:', errorMessage)
        toast.error(`삭제 실패: ${errorMessage}`)
      }
    } catch (error) {
      console.error('이미지 삭제 오류:', error)
      toast.error('사진 삭제에 실패했습니다.')
    }
  }

  // 이미지 선택 처리
  const handleImageSelection = (imageId) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    )
  }

  // 일괄 삭제 처리
  const handleBulkDelete = async () => {
    if (!confirm(`선택된 ${selectedImages.length}장의 사진을 삭제하시겠습니까?`)) return
    
    const currentUserData = userData
    if (!currentUserData) {
      toast.error('사용자 정보를 찾을 수 없습니다.')
      return
    }
    
    try {
      const deletePromises = selectedImages.map(imageId => 
        fetch(`/api/free-schedule-gallery?id=${imageId}&userData=${encodeURIComponent(JSON.stringify(currentUserData))}`, {
          method: 'DELETE'
        })
      )
      
      await Promise.all(deletePromises)
      toast.success(`${selectedImages.length}장의 사진이 삭제되었습니다.`)
      setSelectedImages([])
      await loadGalleryImages()
    } catch (error) {
      console.error('일괄 삭제 오류:', error)
      toast.error('일괄 삭제에 실패했습니다.')
    }
  }

  // 이미지 이모티콘 처리
  const handleImageEmoji = async (imageId, emoji) => {
    try {
      const currentUserData = userData
      if (!currentUserData) {
        toast.error('사용자 정보를 찾을 수 없습니다.')
        return
      }
      
      const response = await fetch(`/api/free-schedule-gallery/${imageId}/emojis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emoji,
          userData: currentUserData
        })
      })
      
      if (response.ok) {
        await loadGalleryImages()
      }
    } catch (error) {
      console.error('이모티콘 처리 오류:', error)
    }
  }

  // 댓글 추가 처리
  const handleAddComment = async (imageId) => {
    if (!newComment.trim()) return
    
    try {
      const currentUserData = userData
      if (!currentUserData) {
        toast.error('사용자 정보를 찾을 수 없습니다.')
        return
      }
      
      const response = await fetch(`/api/free-schedule-gallery/${imageId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newComment,
          userData: currentUserData
        })
      })
      
      if (response.ok) {
        setNewComment('')
        await loadGalleryImages()
      }
    } catch (error) {
      console.error('댓글 추가 오류:', error)
      toast.error('댓글 추가에 실패했습니다.')
    }
  }

  // 이모티콘 선택기 토글
  const toggleEmojiPicker = (imageId) => {
    setShowEmojiPicker(prev => ({...prev, [imageId]: !prev[imageId]}))
  }

  // 컴포넌트 마운트 시
  useEffect(() => {
    const loadData = async () => {
      try {
        const session = localStorage.getItem('userSession')
        if (!session) {
          router.push('/')
          return
        }

        const userData = JSON.parse(session)
        setUserData(userData)
        setUserRegion(userData.region)
        
        // URL 파라미터에서 날짜, 시간, 하이라이트 이미지 ID 확인
        const urlParams = new URLSearchParams(window.location.search)
        const urlDate = urlParams.get('date')
        const urlTime = urlParams.get('time')
        const highlightId = urlParams.get('highlight')
        
        // URL에서 받은 날짜/시간이 있으면 설정
        if (urlDate) {
          setSelectedDate(urlDate)
        }
        if (urlTime) {
          setSelectedTime(urlTime)
        }
        
        if (highlightId) {
          setHighlightedImage(highlightId)
          console.log('하이라이트 이미지 ID:', highlightId)
        }
        
        // 권역에서 숫자 추출
        const regionNumber = userData.region.replace(/[^0-9]/g, '')
        
        // 숙소 정보 로드
        await loadHotelInfo(regionNumber)
        
        // 갤러리 이미지 로드 (selectedDate가 설정된 후)
        setTimeout(() => {
          loadGalleryImages()
        }, 100)
        
        // 구글 맵스 스크립트 로드 (별도로 처리)
        loadGoogleMapsScript().catch(error => {
          console.warn('Google Maps 로드 실패:', error)
        })
        

        
        setLoading(false)
      } catch (error) {
        console.error('데이터 로드 오류:', error)
        setLoading(false)
      }
    }

    loadData()

    return () => {
      isMountedRef.current = false
    }
  }, [router])

  // 지도 초기화
  useEffect(() => {
    if (isMapLoaded && hotelName) {
      setTimeout(() => {
        initMap()
      }, 100)
    }
  }, [isMapLoaded, hotelName])

  // selectedDate 변경 시 갤러리 다시 로드
  useEffect(() => {
    if (selectedDate && userRegion) {
      loadGalleryImages()
    }
  }, [selectedDate, userRegion])

  // 전체화면 지도 초기화
  useEffect(() => {
    if (showFullscreenMap && isMapLoaded && hotelName) {
      setTimeout(() => {
        const fullscreenMapElement = document.getElementById('fullscreen-map')
        if (fullscreenMapElement) {
          const geocoder = new window.google.maps.Geocoder()
          
          // 숙소 정보가 없으면 참고 위치 사용
          let searchAddress = hotelName
          if (hotelName.includes('참고 위치:')) {
            const locationMatch = hotelName.match(/참고 위치: (.+?) \(/)
            if (locationMatch) {
              searchAddress = locationMatch[1]
            }
          }
          
          geocoder.geocode({ address: `${searchAddress} Prague` }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const location = results[0].geometry.location
              
              const fullscreenMap = new window.google.maps.Map(fullscreenMapElement, {
                center: location,
                zoom: 15,
                fullscreenControl: true,
                streetViewControl: true,
                mapTypeControl: true,
                styles: [
                  {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                  }
                ]
              })

              new window.google.maps.Marker({
                position: location,
                map: fullscreenMap,
                title: searchAddress
              })
            }
          })
        }
      }, 100)
    }
  }, [showFullscreenMap, isMapLoaded, hotelName])

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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🎯 자유 일정
              </h1>
              <p className="text-gray-600">
                {selectedDate} {selectedTime && `• ${selectedTime}`}
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              뒤로 가기
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 숙소 정보 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🏨 숙소 정보
            </h2>
            
            {hotelName.includes('숙소 정보 없음') ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-4">🏨</div>
                <p className="text-gray-600 mb-2">숙소 정보가 입력되지 않았습니다.</p>
                {hotelName.includes('마지막 일정:') ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-yellow-800 text-sm font-medium mb-2">📅 마지막 일정 정보:</p>
                    <p className="text-yellow-700 text-sm">{hotelName.split(' - ')[1]}</p>
                  </div>
                ) : null}
                <p className="text-sm text-gray-500 mb-4">관리자에게 문의해서 숙소 정보를 입력해주세요.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-xs">
                    💡 <strong>관리자 안내:</strong> 자유일정 계획을 위해 숙소 위치 정보가 필요합니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 숙소 정보 */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">📍 숙소 위치</h3>
                  <div className="space-y-2">
                    <p className="text-blue-800 font-medium">
                      {customHotelName || hotelName}
                    </p>
                    
                    {/* 저장된 숙소 데이터가 있으면 추가 정보 표시 */}
                    {(() => {
                      const currentDate = selectedDate || new Date().toISOString().split('T')[0]
                      const savedHotelData = localStorage.getItem(`customHotelData_${userRegion}_${currentDate}`)
                      if (savedHotelData) {
                        try {
                          const hotelData = JSON.parse(savedHotelData)
                          return (
                            <div className="text-sm text-gray-600 space-y-1">
                              {hotelData.address && (
                                <p>📍 {hotelData.address}</p>
                              )}
                              {hotelData.phone && (
                                <p>📞 {hotelData.phone}</p>
                              )}
                              {hotelData.updatedAt && (
                                <p className="text-xs text-gray-500">
                                  마지막 수정: {new Date(hotelData.updatedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          )
                        } catch (error) {
                          return null
                        }
                      }
                      return null
                    })()}
                  </div>
                  
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-700 text-xs">
                      ✅ 숙소 정보가 정상적으로 로드되었습니다.
                    </p>
                  </div>
                </div>
                
                {/* 숙소 정보 수정 버튼 */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-blue-800">🏨 숙소 위치 관리</h3>
                    <button
                      onClick={() => setShowHotelEdit(!showHotelEdit)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                      {showHotelEdit ? '✕ 취소' : '📍 숙소 위치 수정'}
                    </button>
                  </div>
                  <p className="text-xs text-blue-600 mb-2">
                    정확한 숙소 위치를 설정하여 지도에 표시됩니다
                  </p>
                  
                  {/* 숙소 정보 수정 폼 */}
                  {showHotelEdit && (
                    <div className="mt-3 p-3 bg-white border border-blue-200 rounded-lg">
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          🏨 숙소 이름
                        </label>
                        <input
                          type="text"
                          value={customHotelName}
                          onChange={(e) => setCustomHotelName(e.target.value)}
                          placeholder="예: 프라하 그랜드 호텔, 체코 프라하"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          정확한 숙소 이름을 입력하면 지도에서 정확한 위치를 찾을 수 있습니다
                        </p>
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          📍 숙소 주소 (선택사항)
                        </label>
                        <input
                          type="text"
                          placeholder="예: Václavské nám. 1, 110 00 Praha 1, Czech Republic"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          id="hotel-address"
                          name="hotel-address"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          정확한 주소를 입력하면 더 정확한 위치를 표시할 수 있습니다
                        </p>
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          📞 연락처 (선택사항)
                        </label>
                        <input
                          type="text"
                          placeholder="예: +420 123 456 789"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          id="hotel-phone"
                          name="hotel-phone"
                        />
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            if (customHotelName.trim()) {
                              const currentDate = selectedDate || new Date().toISOString().split('T')[0]
                              const hotelData = {
                                name: customHotelName.trim(),
                                address: document.getElementById('hotel-address')?.value || '',
                                phone: document.getElementById('hotel-phone')?.value || '',
                                updatedAt: new Date().toISOString()
                              }
                              localStorage.setItem(`customHotelData_${userRegion}_${currentDate}`, JSON.stringify(hotelData))
                              toast.success('숙소 정보가 저장되었습니다! 지도에 반영됩니다.')
                              setShowHotelEdit(false)
                              // 지도 즉시 새로고침
                              setTimeout(() => {
                                if (mapRef.current) {
                                  initMap()
                                }
                              }, 500)
                            } else {
                              toast.error('숙소 이름을 입력해주세요')
                            }
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          💾 저장 및 지도 반영
                        </button>
                        <button
                          onClick={() => {
                            const currentDate = selectedDate || new Date().toISOString().split('T')[0]
                            localStorage.removeItem(`customHotelData_${userRegion}_${currentDate}`)
                            setCustomHotelName('')
                            const hotelAddress = document.getElementById('hotel-address')
                            const hotelPhone = document.getElementById('hotel-phone')
                            if (hotelAddress) hotelAddress.value = ''
                            if (hotelPhone) hotelPhone.value = ''
                            toast.success('기본 숙소 정보로 복원되었습니다')
                            setShowHotelEdit(false)
                            // 지도 새로고침
                            setTimeout(() => {
                              if (mapRef.current) {
                                initMap()
                              }
                            }, 100)
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          🔄 기본값으로 복원
                        </button>
                        <button
                          onClick={() => {
                            const address = document.getElementById('hotel-address')?.value
                            if (address) {
                              window.open(`https://www.google.com/maps/search/${encodeURIComponent(address)}`, '_blank')
                            } else if (customHotelName) {
                              window.open(`https://www.google.com/maps/search/${encodeURIComponent(customHotelName)}`, '_blank')
                            } else {
                              toast.error('검색할 숙소 정보가 없습니다')
                            }
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          🔍 구글맵에서 검색
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 추천 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              💡 추천 장소
            </h2>
            
            {/* 테마 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                테마 선택
              </label>
              <div className="flex flex-wrap gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setSelectedTheme(theme)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedTheme === theme
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            {/* 추천 장소 목록 */}
            <div className="space-y-3">
              {recommendations[selectedTheme]?.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {selectedTheme}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">⭐ {item.rating}</span>
                      <button
                        onClick={() => openInGoogleMaps(item.name)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        지도에서 보기 →
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                  <div className="text-xs text-gray-500">
                    위치: {item.location}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 지도 섹션 */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            🗺️ 숙소 위치 지도
          </h2>
          
          {hotelName.includes('숙소 정보 없음') ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-4">🗺️</div>
              <p className="text-gray-500 mb-4">숙소 정보가 없어 지도를 표시할 수 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div 
                ref={mapRef}
                className="w-full h-64 bg-gray-200 rounded-lg cursor-pointer"
                style={{ minHeight: '256px' }}
                onClick={() => setShowFullscreenMap(true)}
                title="클릭하여 전체화면으로 보기"
              >
                {!isMapLoaded && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-gray-600">지도 로딩 중...</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-center space-x-2">
                <button
                  onClick={() => setShowFullscreenMap(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  🔍 전체화면으로 보기
                </button>
                <button
                  onClick={() => openInGoogleMaps(hotelName.includes('참고 위치:') ? hotelName.match(/참고 위치: (.+?) \(/)?.[1] || hotelName : hotelName)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  🗺️ Google Maps에서 보기
                </button>
              </div>
              {hotelName.includes('참고 위치:') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ <strong>관리자 안내:</strong> 정확한 숙소 정보가 필요합니다. 
                    현재는 마지막 일정의 위치를 참고로 표시하고 있습니다. 
                    정확한 숙소 정보를 입력해주세요.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

                {/* 갤러리 */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              📷 갤러리 ({galleryImages.length}장)
            </h2>
            <div className="flex items-center space-x-2">
              {/* 갤러리 관리 */}
              <button
                onClick={() => {
                  if (galleryImages.length > 0) {
                    if (confirm('모든 사진을 삭제하시겠습니까?')) {
                      // 모든 이미지 삭제 로직
                      const deletePromises = galleryImages.map(image => {
                        if (image.id) {
                          return fetch(`/api/gallery/${image.id}`, {
                            method: 'DELETE'
                          }).catch(error => {
                            console.error('이미지 삭제 실패:', error)
                            return null
                          })
                        }
                        return Promise.resolve()
                      })
                      
                      Promise.all(deletePromises).then(() => {
                        setGalleryImages([])
                        toast.success('모든 사진이 삭제되었습니다')
                      })
                    }
                  } else {
                    toast.error('삭제할 사진이 없습니다')
                  }
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                🗑️ 전체 삭제
              </button>
              {selectedImages.length > 0 && (
                <>
                  <span className="text-sm text-gray-600">
                    {selectedImages.length}장 선택됨
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                  >
                    선택 삭제
                  </button>
                </>
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
                className={`px-4 py-2 rounded-lg font-semibold cursor-pointer transition-colors text-sm ${
                  uploading 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
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
          
          {/* 갤러리 이미지 표시 */}
          <div className="space-y-4">
            {galleryImages.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-4">📷</div>
                <p className="text-gray-500 mb-4">아직 업로드된 사진이 없습니다.</p>
                <p className="text-sm text-gray-400">위의 "사진 업로드" 버튼을 눌러 사진을 업로드해보세요!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {galleryImages.map((image, index) => (
                  <div key={image.id || index} className={`relative group bg-gray-50 rounded-lg p-2 ${
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
                        onChange={() => handleImageSelection(image.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    
                    <div 
                      className="aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => {
                        setSelectedImage(image)
                        setShowImageModal(true)
                      }}
                    >
                      <img
                        src={image.imageUrl}
                        alt={`자유일정 사진 ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          console.error('이미지 로드 실패:', image.imageUrl);
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = 'flex';
                          }
                        }}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                      <div 
                        className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm"
                        style={{ display: 'none' }}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">📷</div>
                          <p>이미지를 불러올 수 없습니다</p>
                          {image.imageUrl?.startsWith('blob:') ? (
                            <p className="text-xs mt-1 text-red-500">임시 URL - 업로드 필요</p>
                          ) : (
                            <div className="text-xs mt-1">
                              <p>URL: {image.imageUrl?.substring(0, 50)}...</p>
                              <button
                                onClick={() => window.open(image.imageUrl, '_blank')}
                                className="text-blue-600 hover:text-blue-800 mt-1"
                              >
                                🔗 URL 직접 열기
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
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
                            const count = imageEmojis[image.id]?.[emoji] || 0;
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleImageEmoji(image.id, emoji)}
                                className={`text-sm px-2 py-1 rounded transition-colors ${
                                  count > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                                }`}
                                title={`${emoji} ${count}`}
                              >
                                {emoji} {count > 0 ? count : ''}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => handleDeleteImage(image.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          삭제
                        </button>
                      </div>
                      
                      {/* 댓글 수 표시 */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setShowComments(prev => ({...prev, [image.id]: !prev[image.id]}))}
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
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddComment(image.id);
                                  }
                                }}
                                placeholder="댓글을 입력하세요..."
                                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => toggleEmojiPicker(image.id)}
                                className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-300"
                                title="이모티콘"
                              >
                                😊
                              </button>
                            </div>
                            <button
                              onClick={() => handleAddComment(image.id)}
                              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                            >
                              댓글
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

      {/* 이미지 모달 */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                📷 자유일정 사진
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* 이미지 */}
                <div className="flex-1">
                  <img
                    src={selectedImage.imageUrl}
                    alt="자유일정 사진"
                    className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                  <div 
                    className="w-full h-64 flex items-center justify-center bg-gray-100 text-gray-500"
                    style={{ display: 'none' }}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-4">📷</div>
                      <p>이미지를 불러올 수 없습니다</p>
                    </div>
                  </div>
                </div>
                
                {/* 이미지 정보 */}
                <div className="lg:w-80 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">📋 이미지 정보</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">업로드 날짜:</span>
                        <span className="font-medium">
                          {selectedImage.uploadDate 
                            ? new Date(selectedImage.uploadDate).toLocaleString() 
                            : selectedImage.uploadedAt 
                            ? new Date(selectedImage.uploadedAt).toLocaleString()
                            : '날짜 정보 없음'
                          }
                        </span>
                      </div>
                      {selectedImage.uploadedBy && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">업로더:</span>
                          <span className="font-medium">{selectedImage.uploadedBy.name || '익명'}</span>
                        </div>
                      )}
                      {selectedImage.fileName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">파일명:</span>
                          <span className="font-medium text-xs">{selectedImage.fileName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-3">🔗 공유하기</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedImage.imageUrl)
                          toast.success('이미지 URL이 클립보드에 복사되었습니다!')
                        }}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm transition-colors"
                      >
                        📋 URL 복사하기
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = selectedImage.imageUrl
                          link.download = selectedImage.fileName || '자유일정_사진.jpg'
                          link.click()
                        }}
                        className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm transition-colors"
                      >
                        💾 이미지 다운로드
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-900 mb-3">🗺️ 위치 정보</h4>
                    <p className="text-sm text-yellow-800 mb-3">
                      이 사진은 자유일정에서 촬영되었습니다.
                    </p>
                    <button
                      onClick={() => {
                        setShowImageModal(false)
                        // 지도 섹션으로 스크롤
                        document.querySelector('[ref="mapRef"]')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded text-sm transition-colors"
                    >
                      🗺️ 숙소 위치 지도 보기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 전체화면 지도 모달 */}
      {showFullscreenMap && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="relative w-full h-full">
            <button
              onClick={() => setShowFullscreenMap(false)}
              className="absolute top-4 right-4 z-10 bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded-lg shadow-lg transition-colors"
            >
              ✕ 닫기
            </button>
            <div 
              className="w-full h-full"
              style={{ minHeight: '100vh' }}
            >
              {isMapLoaded && map && (
                <div className="w-full h-full">
                  {/* 지도가 이미 로드되어 있으면 전체화면으로 표시 */}
                  <div className="w-full h-full">
                    {map && (
                      <div 
                        className="w-full h-full"
                        style={{ minHeight: '100vh' }}
                      >
                        {/* 지도를 전체화면으로 재생성 */}
                        <div 
                          id="fullscreen-map"
                          className="w-full h-full"
                          style={{ minHeight: '100vh' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!isMapLoaded && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
                    <p>지도 로딩 중...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 