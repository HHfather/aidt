import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { Loader } from '@googlemaps/js-api-loader'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function MapPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mapLoading, setMapLoading] = useState(true)
  const mapRef = useRef(null)
  const googleMapRef = useRef(null)

  // 🗺️ 연수 지역별 명소 데이터
  const tourSpots = [
    {
      id: 'prague_castle',
      name: '프라하 성',
      type: 'attraction',
      position: { lat: 50.0909, lng: 14.4009 },
      description: '체코 프라하의 대표적인 관광지',
      category: '문화유산',
      rating: 4.8,
      icon: '🏰'
    },
    {
      id: 'charles_bridge',
      name: '카를교',
      type: 'attraction', 
      position: { lat: 50.0865, lng: 14.4114 },
      description: '프라하를 대표하는 역사적인 다리',
      category: '문화유산',
      rating: 4.7,
      icon: '🌉'
    },
    {
      id: 'restaurant_1',
      name: 'U Fleků 맥주집',
      type: 'restaurant',
      position: { lat: 50.0794, lng: 14.4173 },
      description: '체코 전통 맥주와 음식을 즐길 수 있는 곳',
      category: '맛집',
      rating: 4.5,
      icon: '🍺'
    },
    {
      id: 'schonbrunn',
      name: '쇤브룬 궁전',
      type: 'attraction',
      position: { lat: 48.1847, lng: 16.3124 },
      description: '오스트리아 비엔나의 대표 궁전',
      category: '문화유산', 
      rating: 4.9,
      icon: '🏛️'
    },
    {
      id: 'cafe_central',
      name: '카페 첸트랄',
      type: 'restaurant',
      position: { lat: 48.2103, lng: 16.3661 },
      description: '비엔나 전통 커피하우스',
      category: '카페',
      rating: 4.6,
      icon: '☕'
    }
  ]

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSpot, setSelectedSpot] = useState(null)

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
      setProject(userData.currentProject)
      setLoading(false)
      
      // 구글 맵 초기화
      initializeMap()
    } catch (error) {
      console.error('세션 로드 오류:', error)
      router.push('/')
    }
  }, []) // router 의존성 제거

  const initializeMap = async () => {
    try {
      // 구글 맵 API 키가 없으면 정적 지도 표시
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg'
      
      if (!apiKey || apiKey === 'DEMO_KEY_FOR_DEVELOPMENT') {
        // API 키가 없으면 정적 지도 이미지로 대체
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div class="w-full h-96 bg-gradient-to-br from-blue-400 to-green-400 flex items-center justify-center text-white">
              <div class="text-center">
                <div class="text-6xl mb-4">🗺️</div>
                <h3 class="text-xl font-bold mb-2">연수 지역 지도</h3>
                <p class="text-sm opacity-90">프라하 ↔ 비엔나 연수 경로</p>
                <div class="mt-4 space-y-2 text-sm">
                  <div>🏰 프라하 성 - 체코</div>
                  <div>🌉 카를교 - 체코</div>
                  <div>🏛️ 쇤브룬 궁전 - 오스트리아</div>
                  <div>☕ 전통 카페들</div>
                </div>
                <p class="mt-4 text-xs opacity-75">* 실제 구글 맵 연동을 위해서는 API 키가 필요합니다</p>
              </div>
            </div>
          `
        }
        setMapLoading(false)
        return
      }

      const loader = new Loader({
        apiKey: apiKey,
        version: 'weekly',
        libraries: ['places']
      })

      const google = await loader.load()
      
      if (mapRef.current) {
        // 프라하를 중심으로 지도 초기화
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 50.0755, lng: 14.4378 }, // 프라하 중심
          zoom: 8,
          mapTypeId: 'roadmap',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'simplified' }]
            }
          ]
        })

        googleMapRef.current = map

        // 명소 마커 추가
        addMarkersToMap(google, map)
        setMapLoading(false)
      }
    } catch (error) {
      console.error('구글 맵 로드 오류:', error)
      toast.error('지도를 불러오는 중 오류가 발생했습니다.')
      setMapLoading(false)
    }
  }

  const addMarkersToMap = (google, map) => {
    const infoWindow = new google.maps.InfoWindow()

    tourSpots.forEach(spot => {
      const marker = new google.maps.Marker({
        position: spot.position,
        map: map,
        title: spot.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="${spot.type === 'restaurant' ? '#10B981' : '#3B82F6'}" stroke="white" stroke-width="2"/>
              <text x="20" y="25" text-anchor="middle" font-size="16">${spot.icon}</text>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(40, 40)
        }
      })

      marker.addListener('click', () => {
        setSelectedSpot(spot)
        
        const content = `
          <div style="max-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${spot.icon} ${spot.name}</h3>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${spot.description}</p>
            <div style="margin: 4px 0;">
              <span style="background: #F3F4F6; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${spot.category}</span>
            </div>
            <div style="margin: 4px 0; color: #F59E0B;">
              ⭐ ${spot.rating}/5.0
            </div>
          </div>
        `
        
        infoWindow.setContent(content)
        infoWindow.open(map, marker)
      })
    })
  }

  const filterSpots = (category) => {
    setSelectedCategory(category)
    if (category === 'all') {
      return tourSpots
    }
    return tourSpots.filter(spot => spot.type === category)
  }

  const focusOnSpot = (spot) => {
    if (googleMapRef.current) {
      googleMapRef.current.setCenter(spot.position)
      googleMapRef.current.setZoom(15)
      setSelectedSpot(spot)
    }
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
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  🗺️ 연수 지역 지도
                </h1>
                <p className="text-sm text-gray-600">
                  명소와 맛집을 확인해보세요
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* 필터 버튼 */}
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-3">🔍 카테고리별 보기</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🌟 전체
                </button>
                <button
                  onClick={() => setSelectedCategory('attraction')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === 'attraction'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🏛️ 명소
                </button>
                <button
                  onClick={() => setSelectedCategory('restaurant')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === 'restaurant'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🍽️ 맛집
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 지도 영역 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">🗺️ 인터랙티브 지도</h2>
                  <p className="text-sm text-gray-600">마커를 클릭하면 상세 정보를 볼 수 있습니다</p>
                </div>
                <div className="relative">
                  {mapLoading && (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-gray-600">지도 로딩 중...</p>
                      </div>
                    </div>
                  )}
                  <div ref={mapRef} className="w-full h-96"></div>
                </div>
              </div>
            </div>

            {/* 장소 목록 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">📍 장소 목록</h2>
                  <p className="text-sm text-gray-600">클릭하면 지도에서 확인할 수 있습니다</p>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {filterSpots(selectedCategory).map(spot => (
                    <div
                      key={spot.id}
                      onClick={() => focusOnSpot(spot)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedSpot?.id === spot.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{spot.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{spot.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{spot.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                              {spot.category}
                            </span>
                            <span className="text-yellow-500 text-sm">
                              ⭐ {spot.rating}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 선택된 장소 상세 정보 */}
              {selectedSpot && (
                <div className="mt-6 bg-white rounded-lg shadow-md">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold">🔍 상세 정보</h2>
                  </div>
                  <div className="p-4">
                    <div className="text-center">
                      <span className="text-4xl">{selectedSpot.icon}</span>
                      <h3 className="text-xl font-bold mt-2">{selectedSpot.name}</h3>
                      <p className="text-gray-600 mt-1">{selectedSpot.description}</p>
                      
                      <div className="flex items-center justify-center space-x-4 mt-4">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                          {selectedSpot.category}
                        </span>
                        <span className="text-yellow-500">
                          ⭐ {selectedSpot.rating}/5.0
                        </span>
                      </div>

                      <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                        📱 길찾기
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
