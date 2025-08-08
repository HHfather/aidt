import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'

// 구글 맵 스크립트 동적 로드
const loadGoogleMapsScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve(window.google)
      return
    }
    
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg'}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function FreeScheduleNew() {
  const router = useRouter()
  const { date, time } = router.query
  const [selectedTheme, setSelectedTheme] = useState('맛집')
  const [selectedDate, setSelectedDate] = useState(date || '')
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const [map, setMap] = useState(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [hotelLocation, setHotelLocation] = useState(null)
  const [hotelName, setHotelName] = useState('')
  const [userRegion, setUserRegion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [galleryImages, setGalleryImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const mapRef = useRef(null)

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
        
        Object.entries(result.data.activities).forEach(([date, activities]) => {
          if (Array.isArray(activities)) {
            activities.forEach((activity) => {
              if (activity.location && activity.location.includes('호텔')) {
                hotelInfo = {
                  name: activity.location,
                  date: date,
                  time: activity.time
                }
              }
            })
          }
        })
        
        if (hotelInfo) {
          setHotelName(hotelInfo.name)
          // 지도에 숙소 위치 표시
          if (map && window.google) {
            const geocoder = new window.google.maps.Geocoder()
            geocoder.geocode({ address: hotelInfo.name }, (results, status) => {
              if (status === 'OK') {
                const location = results[0].geometry.location
                setHotelLocation(location)
                
                // 지도 중심을 숙소로 이동
                map.setCenter(location)
                map.setZoom(15)
                
                // 숙소 마커 추가
                new window.google.maps.Marker({
                  position: location,
                  map: map,
                  title: hotelInfo.name,
                  icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                  }
                })
              }
            })
          }
        } else {
          setHotelName('숙소 정보 없음')
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

  // 지도 초기화
  const initMap = async () => {
    try {
      const google = await loadGoogleMapsScript()
      
      if (mapRef.current && !map) {
        const newMap = new google.maps.Map(mapRef.current, {
          center: { lat: 50.0813, lng: 14.4242 }, // 프라하 중심
          zoom: 14,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        })
        
        setMap(newMap)
        setIsMapLoaded(true)
      }
    } catch (error) {
      console.error('지도 로드 오류:', error)
      setIsMapLoaded(true)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const session = localStorage.getItem('userSession')
        if (!session) {
          router.push('/')
          return
        }

        const userData = JSON.parse(session)
        setUserRegion(userData.region)
        
        // 권역에서 숫자 추출
        const regionNumber = userData.region.replace(/[^0-9]/g, '')
        
        // 숙소 정보 로드
        await loadHotelInfo(regionNumber)
        
        setLoading(false)
      } catch (error) {
        console.error('데이터 로드 오류:', error)
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  useEffect(() => {
    if (!loading) {
      initMap()
    }
  }, [loading])

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
                🎯 자유 일정 갤러리
              </h1>
              <p className="text-gray-600">
                {selectedDate} {time && `• ${time}`} • {userRegion}
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
          {/* 지도 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🗺️ 숙소 위치
            </h2>
            
            {hotelName === '숙소 정보 없음' ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-4">🏨</div>
                <p className="text-gray-600 mb-2">숙소 정보가 입력되지 않았습니다.</p>
                <p className="text-sm text-gray-500">관리자에게 문의해서 숙소 정보를 입력해주세요.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>숙소:</strong> {hotelName}
                  </p>
                </div>
                <div 
                  ref={mapRef} 
                  className="w-full h-64 rounded-lg border-2 border-gray-200"
                >
                  {!isMapLoaded && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <p className="text-gray-500">지도를 불러오는 중...</p>
                    </div>
                  )}
                </div>
              </>
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

        {/* 갤러리 섹션 */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📷 자유 일정 갤러리
          </h2>
          
          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.url}
                    alt={`자유 일정 사진 ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <button className="opacity-0 group-hover:opacity-100 text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-sm transition-all duration-200">
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-3xl mb-4">📷</div>
              <p className="text-gray-500 mb-4">아직 업로드된 사진이 없습니다.</p>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                사진 업로드
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 