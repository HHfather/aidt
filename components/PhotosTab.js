import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function PhotosTab({ user }) {
  const router = useRouter()
  const [hallOfFame, setHallOfFame] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHallOfFame()
  }, [])

  const loadHallOfFame = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/hall-of-fame?region=1') // 기본 region
      const data = await response.json()
      
      if (data.success) {
        setHallOfFame(data.data)
      }
    } catch (error) {
      console.log('명예의 전당 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 킹오브킹 (1일 명예의 전당에서 가장 높은 점수)
  const getKingOfKings = () => {
    if (hallOfFame.length === 0) return null;
    return hallOfFame.reduce((king, image) => 
      image.totalScore > king.totalScore ? image : king
    );
  }

  const getDayNumber = (dateString) => {
    const today = new Date();
    const imageDate = new Date(dateString);
    const diffTime = Math.abs(today - imageDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">🏆 베스트 포토</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg">베스트 포토를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">🏆 베스트 포토</h2>

      </div>

      {/* 킹오브킹 섹션 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">👑 킹오브킹</h3>
        {getKingOfKings() ? (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">👑</div>
              <h4 className="text-xl font-bold text-yellow-800">킹오브킹</h4>
              <p className="text-sm text-yellow-700">1일 명예의 전당에서 가장 높은 점수를 받은 사진</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-md">
              <div className="relative mb-3">
                <img
                  src={getKingOfKings().imageUrl}
                  alt="킹오브킹"
                  className="w-full h-64 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NzM4NyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfkqE8L3RleHQ+PC9zdmc+'
                  }}
                />
                <div className="absolute top-2 right-2 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                  👑 킹오브킹
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-yellow-800">
                      {getKingOfKings().uploadedBy?.name || '익명'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(getKingOfKings().uploadDate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-600">
                      {getKingOfKings().totalScore}점
                    </div>
                    <div className="text-xs text-gray-500">
                      최고 점수
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>💬 {getKingOfKings().commentCount || 0}개 댓글</span>
                  <span>😊 {getKingOfKings().emojiCount || 0}개 이모티콘</span>
                </div>
                
                {getKingOfKings().description && (
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {getKingOfKings().description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <div className="text-6xl mb-4">👑</div>
            <p className="text-gray-600 text-lg">킹오브킹이 아직 선정되지 않았습니다</p>
            <p className="text-gray-500 mt-2">멋진 사진을 찍어서 킹오브킹이 되어보세요!</p>
            <div className="mt-6 p-4 bg-yellow-100 rounded-lg">
              <p className="text-sm text-yellow-800">
                💡 킹오브킹은 1일 명예의 전당에서 가장 높은 점수를 받은 사진입니다.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 1일 명예의 전당 섹션 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 1일 명예의 전당</h3>
        {hallOfFame.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hallOfFame.map((image, index) => (
              <div key={image.id} className="bg-gray-50 rounded-lg p-4 border">
                <div className="relative mb-3">
                  <img
                    src={image.imageUrl}
                    alt={`명예의 전당 ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NzM4NyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfkqE8L3RleHQ+PC9zdmc+'
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    🏆 {index + 1}위
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        👤 {image.uploadedBy?.name || '익명'}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {getDayNumber(image.uploadDate)}일 전
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {image.totalScore}점
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {formatDate(image.uploadDate)}
                    </span>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>💬 {image.commentCount}</span>
                      <span>😊 {image.emojiCount}</span>
                    </div>
                  </div>
                  {image.description && (
                    <p className="text-sm text-gray-700 mt-2">
                      {image.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🏆</div>
            <p className="text-gray-600 text-lg">아직 명예의 전당에 등록된 사진이 없습니다</p>
            <p className="text-gray-500 mt-2">멋진 사진을 찍어서 명예의 전당에 올려보세요!</p>
          </div>
        )}
      </div>
    </div>
  )
} 