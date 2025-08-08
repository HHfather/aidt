import { useState } from 'react'
import { useRouter } from 'next/router'

export default function FreeScheduleComplete() {
  const router = useRouter()
  const [selectedTheme, setSelectedTheme] = useState('맛집')
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [gallery, setGallery] = useState([
    { id: 1, url: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?q=80&w=400', uploader: '김철수', comments: ['야경이 정말 멋져요!'], reactions: { '👍': 2, '❤️': 1 } },
    { id: 2, url: 'https://images.unsplash.com/photo-1502602898657-3e91760c0337?q=80&w=400', uploader: '박영희', comments: [], reactions: { '👍': 5 } },
    { id: 3, url: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?q=80&w=400', uploader: '홍길동 (나)', comments: [], reactions: {} }
  ])
  const [previews, setPreviews] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  const themes = ['맛집', '카페', '관광지', '쇼핑', '문화체험']

  const recommendations = {
    '맛집': [
      { id: 1, name: '프라하 전통 레스토랑', description: '굴라쉬와 맥주가 일품인 곳', rating: 4.5, visits: 25, googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=프라하+전통+레스토랑' },
      { id: 2, name: '비엔나 슈니첼 하우스', description: '바삭한 비엔나 슈니첼의 정석', rating: 4.8, visits: 42, googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=비엔나+슈니첼+하우스' },
    ],
    '카페': [
      { id: 3, name: '카프카 박물관 카페', description: '카프카의 생가 근처, 분위기 좋은 카페', rating: 4.3, visits: 18, googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=카프카+박물관+카페' },
      { id: 4, name: '자허 토르테', description: '비엔나 커피와 함께 즐기는 달콤한 휴식', rating: 4.7, visits: 35, googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=자허+토르테' },
    ],
    '관광지': [
      { id: 5, name: '체스키 크룸로프', description: '동화 같은 마을 전체가 유네스코 세계문화유산', rating: 4.9, visits: 50, googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=체스키+크룸로프' },
    ],
    '쇼핑': [
      { id: 6, name: '바츨라프 광장', description: '프라하의 중심가, 쇼핑과 문화의 거리', rating: 4.4, visits: 30, googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=바츨라프+광장' },
    ],
    '문화체험': [
      { id: 7, name: '프라하 성', description: '천년의 역사가 살아있는 체코의 상징', rating: 4.8, visits: 65, googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=프라하+성' },
    ]
  }

  const handleGenerateRecommendations = async () => {
    setIsLoading(true)
    try {
      // 시뮬레이션: 실제 API 호출 대신
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert(`${selectedTheme} 테마의 새로운 AI 추천이 생성되었습니다! (실제 API 연결 예정)`)
    } catch (error) {
      alert('AI 추천 생성에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files)
    if (files.length === 0) return

    const oversizedFiles = files.filter(file => file.size > 20 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      alert(`${oversizedFiles.map(f => f.name).join(', ')} 파일이 20MB를 초과합니다.`)
      return
    }

    const newPreviews = files.map(file => {
      const reader = new FileReader()
      return new Promise(resolve => {
        reader.onload = (e) => resolve({
          id: `preview-${Date.now()}-${Math.random()}`,
          url: e.target.result,
          file: file
        })
        reader.readAsDataURL(file)
      })
    })
    
    Promise.all(newPreviews).then(results => {
      setPreviews(p => [...p, ...results])
    })
  }
  
  const handleConfirmUpload = () => {
    const newPhotos = previews.map(p => ({
      id: `gallery-${Date.now()}-${Math.random()}`,
      url: p.url,
      uploader: '홍길동 (나)',
      comments: [],
      reactions: {}
    }))
    setGallery(g => [...g, ...newPhotos])
    setPreviews([])
  }

  const handleDeletePreview = (id) => {
    setPreviews(p => p.filter(item => item.id !== id))
  }

  const handleDeletePhoto = (id) => {
    if (confirm('정말 이 사진을 삭제하시겠습니까?')) {
      setGallery(g => g.filter(item => item.id !== id))
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'Arial, sans-serif' }}>
      {/* 헤더 */}
      <header style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', margin: 0 }}>
          🗓️ 자유일정 플래너 (완전판)
        </h1>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          대시보드로 돌아가기
        </button>
      </header>

      {/* 메인 컨텐츠 */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* 왼쪽: AI 추천 섹션 */}
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#333', marginBottom: '1.5rem' }}>
              🤖 AI 추천 장소
            </h2>
            
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button 
                  onClick={() => setDropdownOpen(!isDropdownOpen)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    minWidth: '180px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{selectedTheme}</span>
                  <span style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    ▼
                  </span>
                </button>
                
                {isDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
                    zIndex: 10,
                    minWidth: '180px',
                    marginTop: '0.25rem'
                  }}>
                    {themes.map(theme => (
                      <button
                        key={theme}
                        onClick={() => {
                          setSelectedTheme(theme)
                          setDropdownOpen(false)
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: 'none',
                          backgroundColor: selectedTheme === theme ? '#f3f4f6' : 'transparent',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '1rem'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = selectedTheme === theme ? '#f3f4f6' : 'transparent'}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={handleGenerateRecommendations}
                disabled={isLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: isLoading ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                {isLoading ? '🔄 AI가 추천 중...' : '🤖 새로운 장소 추천받기'}
              </button>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '1.5rem' 
            }}>
              {recommendations[selectedTheme]?.map(place => (
                <div key={place.id} style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  border: '1px solid #e9ecef',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onClick={() => window.open(place.googleMapsUrl, '_blank')}
                >
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#333' }}>
                    {place.name}
                  </h3>
                  <p style={{ color: '#6c757d', marginBottom: '1rem', lineHeight: '1.5' }}>
                    {place.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ color: '#ffc107' }}>⭐</span>
                      <span style={{ fontWeight: '600' }}>{place.rating}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6c757d' }}>
                      <span>👥</span>
                      <span>방문 {place.visits}회</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6366f1' }}>
                    📍 구글 맵에서 보기 (클릭)
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 오른쪽: 구글 맵 영역 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            padding: '2rem',
            height: 'fit-content'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#333', marginBottom: '1rem' }}>
              🗺️ 숙소 중심 맵
            </h2>
            <div style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              height: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed #dee2e6',
              color: '#6c757d'
            }}>
              🗺️ 구글 맵 API<br/>연동 예정
            </div>
          </div>
        </div>
        
        {/* 갤러리 섹션 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          padding: '2rem',
          marginTop: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#333', marginBottom: '1.5rem' }}>
            📸 우리들의 갤러리
          </h2>
          
          {/* 업로드 영역 */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              width: '100%',
              padding: '1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              border: 'none',
              marginBottom: '1rem'
            }}>
              ➕ 사진 추가하기 (PC/모바일, 다중 선택 가능)
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload} 
              />
            </label>
            <p style={{ textAlign: 'center', color: '#6c757d', fontSize: '0.875rem' }}>
              사진은 한 장당 20MB까지 업로드할 수 있습니다.
            </p>
            
            {/* 미리보기 영역 */}
            {previews.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>업로드 대기 중인 사진들:</h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  {previews.map(preview => (
                    <div key={preview.id} style={{ position: 'relative' }}>
                      <img 
                        src={preview.url} 
                        alt="미리보기"
                        style={{
                          width: '100%',
                          height: '150px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '2px solid #e5e7eb'
                        }}
                      />
                      <button
                        onClick={() => handleDeletePreview(preview.id)}
                        style={{
                          position: 'absolute',
                          top: '5px',
                          right: '5px',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={handleConfirmUpload}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600',
                      marginRight: '1rem'
                    }}
                  >
                    ✅ 갤러리에 추가하기
                  </button>
                  <button
                    onClick={() => setPreviews([])}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600'
                    }}
                  >
                    ❌ 모두 취소
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* 갤러리 그리드 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {gallery.map(photo => (
              <div key={photo.id} style={{
                position: 'relative',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                border: '1px solid #e9ecef'
              }}
              onClick={() => setSelectedPhoto(photo)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <img 
                  src={photo.url} 
                  alt="갤러리 사진"
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6c757d', marginBottom: '0.5rem' }}>
                    📸 {photo.uploader}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {Object.entries(photo.reactions).map(([emoji, count]) => (
                      <span key={emoji} style={{ 
                        fontSize: '0.75rem', 
                        backgroundColor: '#e5e7eb', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '12px' 
                      }}>
                        {emoji} {count}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* 업로드한 사람만 삭제 가능 */}
                {photo.uploader.includes('(나)') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePhoto(photo.id)
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* 사진 모달 */}
        {selectedPhoto && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
          onClick={() => setSelectedPhoto(null)}
          >
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '90%',
              maxHeight: '90%',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  zIndex: 1001
                }}
              >
                ✕
              </button>
              
              <img 
                src={selectedPhoto.url} 
                alt="확대된 사진"
                style={{
                  width: '100%',
                  maxHeight: '60vh',
                  objectFit: 'contain'
                }}
              />
              
              <div style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '1rem', color: '#333', marginBottom: '1rem' }}>
                  📸 {selectedPhoto.uploader}
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>반응:</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['👍', '❤️', '😊', '👏', '🔥'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          const newGallery = gallery.map(photo => 
                            photo.id === selectedPhoto.id 
                              ? { ...photo, reactions: { ...photo.reactions, [emoji]: (photo.reactions[emoji] || 0) + 1 } }
                              : photo
                          )
                          setGallery(newGallery)
                          setSelectedPhoto(newGallery.find(p => p.id === selectedPhoto.id))
                        }}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '1.2rem'
                        }}
                      >
                        {emoji} {selectedPhoto.reactions[emoji] || 0}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>댓글:</h4>
                  {selectedPhoto.comments.length > 0 ? (
                    selectedPhoto.comments.map((comment, index) => (
                      <div key={index} style={{
                        backgroundColor: '#f8f9fa',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem'
                      }}>
                        {comment}
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#6c757d', fontSize: '0.875rem' }}>아직 댓글이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
