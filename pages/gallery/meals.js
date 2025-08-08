import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { compressImages, formatFileSize } from '../../utils/imageCompressor';

export default function MealsGallery() {
  const router = useRouter();
  const { region, date } = router.query;
  
  const [user, setUser] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [mealSchedules, setMealSchedules] = useState([]);
  const [locationInfo, setLocationInfo] = useState(null);
  const [showLocationInfo, setShowLocationInfo] = useState(false);
  const [loadingLocationInfo, setLoadingLocationInfo] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  
  // 새로운 업로드 폼 상태
  const [uploadDate, setUploadDate] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  
  // 모달 내 상태
  const [modalPhotos, setModalPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!showPhotoModal) return;
      
      if (e.key === 'ArrowLeft') {
        handlePrevPhoto();
      } else if (e.key === 'ArrowRight') {
        handleNextPhoto();
      } else if (e.key === 'Escape') {
        setShowPhotoModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showPhotoModal, currentPhotoIndex, modalPhotos.length]);

  useEffect(() => {
    // 사용자 세션 확인
    const userSession = localStorage.getItem('userSession');
    if (!userSession) {
      router.push('/');
      return;
    }

    try {
      const userData = JSON.parse(userSession);
      setUser(userData);
    } catch (error) {
      console.error('세션 로드 오류:', error);
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (region && date) {
      loadMealsImages();
      // URL 파라미터로 온 날짜를 업로드 기본값으로 설정
      setUploadDate(date);
    }
  }, [region, date]);

  const loadMealsImages = async () => {
    try {
      setLoading(true);
      console.log('Loading meals images for region:', region);
      
      // 모든 날짜의 식사 데이터를 가져와서 그룹화된 형태로 표시
      const response = await fetch(`/api/meals-gallery?region=${region}&allDates=true`);
      const data = await response.json();
      
      console.log('API Response:', data);
      
      if (data.success) {
        setImages(data.groupedData || {});
        setMealSchedules(data.mealSchedules || []);
      } else {
        console.error('API Error:', data.error);
        setImages({});
        setMealSchedules([]);
      }
    } catch (error) {
      console.error('식사 갤러리 로드 오류:', error);
      setImages({});
      setMealSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('업로드할 파일을 선택해주세요.');
      return;
    }

    if (!uploadDate) {
      toast.error('날짜를 선택해주세요.');
      return;
    }

    if (!selectedMealType) {
      toast.error('식사 종류를 선택해주세요.');
      return;
    }

    setUploading(true);
    try {
      // 이미지 압축 처리
      toast.loading('이미지를 압축하고 있습니다...', { id: 'compressing' });
      const compressedFiles = await compressImages(selectedFiles, 4); // 4MB로 압축
      toast.dismiss('compressing');
      
      // 압축 결과 로그
      compressedFiles.forEach((file, index) => {
        const originalFile = selectedFiles[index];
        const compressionRatio = ((originalFile.size - file.size) / originalFile.size * 100).toFixed(1);
        if (file.size < originalFile.size) {
          console.log(`파일 ${file.name} 압축 완료: ${formatFileSize(originalFile.size)} → ${formatFileSize(file.size)} (${compressionRatio}% 감소)`);
          toast.success(`${file.name}: ${formatFileSize(originalFile.size)} → ${formatFileSize(file.size)} (${compressionRatio}% 압축)`);
        }
      });
      
      const formData = new FormData();
      compressedFiles.forEach(file => {
        formData.append('images', file);
      });
      formData.append('description', description);
      formData.append('region', region);
      formData.append('date', uploadDate);
      formData.append('mealType', selectedMealType);
      formData.append('type', 'meal');
      formData.append('userData', JSON.stringify(user));

      const response = await fetch('/api/gallery-upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`📸 ${selectedMealType} 사진 ${compressedFiles.length}장이 성공적으로 업로드되었습니다!`);
        setSelectedFiles([]);
        setDescription('');
        setSelectedMealType('');
        setShowUploadModal(false);
        loadMealsImages(); // 갤러리 새로고침
      } else {
        throw new Error(result.error || '업로드 실패');
      }
    } catch (error) {
      console.error('업로드 오류:', error);
      toast.error('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelection = (imageId) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) {
      toast.error('삭제할 이미지를 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedImages.length}장의 사진을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch('/api/gallery-clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageIds: selectedImages,
          type: 'meals'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('선택한 사진들이 삭제되었습니다.');
        setSelectedImages([]);
        loadMealsImages();
      } else {
        throw new Error(result.error || '삭제 실패');
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleLocationInfo = async (schedule) => {
    if (!schedule.location) {
      toast.error('장소 정보가 없습니다.');
      return;
    }

    // 같은 스케줄을 다시 클릭한 경우 토글
    if (selectedSchedule?.id === schedule.id && locationInfo && !loadingLocationInfo) {
      setShowLocationInfo(!showLocationInfo);
      return;
    }

    // 다른 스케줄을 클릭한 경우 새로운 정보 로드
    setSelectedSchedule(schedule);
    setLoadingLocationInfo(true);
    setShowLocationInfo(false);
    
    try {
      // AI를 통해 장소 소개 생성 및 DB 저장
      const response = await fetch('/api/generate-location-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: schedule.location,
          activity: schedule.activity,
          scheduleId: schedule.id,
          userRegion: user?.region
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLocationInfo({
            title: result.title,
            description: result.description,
            highlights: result.highlights,
            tips: result.tips
          });
          setShowLocationInfo(true);
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
      setLoadingLocationInfo(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // 반응 수 계산 함수
  const getReactionCount = (photo) => {
    // 이모티콘 데이터 구조에 따라 카운트 계산
    const emojiCount = Object.values(photo.emojis || {}).reduce((sum, users) => sum + users.length, 0);
    const commentCount = (photo.comments || []).length;
    return emojiCount + commentCount;
  };

  // 사진들을 반응 수 오름차순으로 정렬
  const sortPhotosByReactions = (photos) => {
    return [...photos].sort((a, b) => getReactionCount(a) - getReactionCount(b));
  };

  // 다음 사진으로 이동
  const handleNextPhoto = () => {
    if (currentPhotoIndex < modalPhotos.length - 1) {
      const nextIndex = currentPhotoIndex + 1;
      setCurrentPhotoIndex(nextIndex);
      setSelectedPhoto(modalPhotos[nextIndex]);
    }
  };

  // 이전 사진으로 이동
  const handlePrevPhoto = () => {
    if (currentPhotoIndex > 0) {
      const prevIndex = currentPhotoIndex - 1;
      setCurrentPhotoIndex(prevIndex);
      setSelectedPhoto(modalPhotos[prevIndex]);
    }
  };

  // 이모티콘 클릭 처리 (모달 내 실시간 업데이트 추가)
  const handleEmojiClick = async (photoId, emoji) => {
    try {
      const response = await fetch(`/api/gallery/${photoId}/emojis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emoji,
          userId: user.id,
          userName: user.name
        })
      });

      const result = await response.json();
      if (result.success) {
        // 성공적으로 이모티콘 추가/제거됨
        toast.success(result.added ? `${emoji} +1점!` : `${emoji} -1점!`);
        
        // 서버에서 반환된 최신 이모티콘 데이터로 업데이트
        if (selectedPhoto && selectedPhoto.id === photoId) {
          const updatedPhoto = {
            ...selectedPhoto,
            emojis: result.emojis || selectedPhoto.emojis
          };
          
          setSelectedPhoto(updatedPhoto);
          
          // modalPhotos 배열도 업데이트
          const updatedModalPhotos = modalPhotos.map(photo => 
            photo.id === photoId ? updatedPhoto : photo
          );
          setModalPhotos(updatedModalPhotos);
        }
        
        // 갤러리 새로고침 제거 - 실시간 UI 업데이트만 사용
      }
    } catch (error) {
      console.error('이모티콘 처리 오류:', error);
      toast.error('이모티콘 처리 중 오류가 발생했습니다.');
    }
  };

  // 댓글 추가 처리 (모달 내 실시간 업데이트 추가)
  const handleCommentSubmit = async (photoId) => {
    if (!newComment.trim()) return;

    setCommentSubmitting(true);
    try {
      const response = await fetch(`/api/gallery/${photoId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newComment.trim(),
          author: user.name,
          userId: user.id
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('댓글이 추가되었습니다! (+5점)');
        
        // 모달 내 selectedPhoto 상태 업데이트
        if (selectedPhoto && selectedPhoto.id === photoId) {
          const newCommentObj = {
            text: newComment.trim(),
            author: user.name,
            userId: user.id,
            createdAt: new Date().toISOString()
          };
          
          const updatedPhoto = {
            ...selectedPhoto,
            comments: [...(selectedPhoto.comments || []), newCommentObj]
          };
          
          setSelectedPhoto(updatedPhoto);
          
          // modalPhotos 배열도 업데이트
          const updatedModalPhotos = modalPhotos.map(photo => 
            photo.id === photoId ? updatedPhoto : photo
          );
          setModalPhotos(updatedModalPhotos);
        }
        
        setNewComment('');
        // 갤러리 새로고침 제거 - 실시간 UI 업데이트만 사용
      }
    } catch (error) {
      console.error('댓글 추가 오류:', error);
      toast.error('댓글 추가 중 오류가 발생했습니다.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // 사진 삭제 처리
  const handleDeletePhoto = async (photoId) => {
    if (!confirm('이 사진을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/gallery?id=${photoId}&userData=${encodeURIComponent(JSON.stringify(user))}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        toast.success('사진이 삭제되었습니다.');
        setShowPhotoModal(false);
        loadMealsImages(); // 갤러리 새로고침
      }
    } catch (error) {
      console.error('사진 삭제 오류:', error);
      toast.error('사진 삭제 중 오류가 발생했습니다.');
    }
  };

  // 조식 데이터 삭제 처리
  const handleDeleteBreakfast = async () => {
    if (!confirm('조식 관련 모든 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;

    try {
      console.log('조식 삭제 시작:', { region, date });
      
      // 현재 로드된 이미지에서 조식 관련 이미지들 찾기
      const breakfastImages = [];
      Object.keys(images).forEach(dateKey => {
        if (images[dateKey]['조식']) {
          breakfastImages.push(...images[dateKey]['조식']);
        }
      });
      
      console.log('삭제할 조식 이미지들:', breakfastImages);
      
      if (breakfastImages.length === 0) {
        toast.info('삭제할 조식 이미지가 없습니다.');
        return;
      }
      
      // 각 이미지를 개별적으로 삭제
      const deletePromises = breakfastImages.map(async (image) => {
        try {
          const response = await fetch(`/api/gallery?id=${image.id}&userData=${encodeURIComponent(JSON.stringify(user))}`, {
            method: 'DELETE'
          });
          
          const result = await response.json();
          return { success: result.success, id: image.id, error: result.error };
        } catch (error) {
          console.error(`이미지 ${image.id} 삭제 오류:`, error);
          return { success: false, id: image.id, error: error.message };
        }
      });
      
      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      console.log('삭제 결과:', { successCount, failCount, results });
      
      if (successCount > 0) {
        toast.success(`조식 데이터가 삭제되었습니다. (성공: ${successCount}개, 실패: ${failCount}개)`);
        loadMealsImages(); // 갤러리 새로고침
      } else {
        toast.error('조식 데이터 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('조식 데이터 삭제 오류:', error);
      toast.error('조식 데이터 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">식사 갤러리를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🍽️ 식사 갤러리
              </h1>
              <p className="text-sm text-gray-600">
                {formatDate(date)} - {region}권역
                {mealSchedules.length > 0 && (
                  <span className="ml-2 text-green-600">
                    • {mealSchedules.length}개 방문장소
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ← 뒤로가기
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                📷 사진 업로드
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* 방문장소 정보 */}
          {mealSchedules.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                              <div>
                <h2 className="text-xl font-bold text-gray-900">📍 AI 방문장소 가이드</h2>
                <p className="text-gray-600">AI가 분석한 상세한 장소 정보와 방문 팁을 확인해보세요</p>
              </div>

              </div>
              
              <div className="space-y-4">
                {mealSchedules.map((schedule, index) => (
                  <div key={schedule.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {schedule.activity}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {schedule.time} • {schedule.location}
                        </p>
                      </div>
                      <button
                        onClick={() => handleLocationInfo(schedule)}
                        disabled={loadingLocationInfo}
                        className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                          loadingLocationInfo 
                            ? 'bg-gray-400 text-white cursor-not-allowed' 
                            : selectedSchedule?.id === schedule.id && showLocationInfo
                            ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
                            : 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 shadow-md hover:shadow-lg'
                        }`}
                      >
                        {loadingLocationInfo ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            AI 분석 중...
                          </span>
                        ) : selectedSchedule?.id === schedule.id && showLocationInfo ? (
                          '📍 소개 숨기기'
                        ) : (
                          '📍 AI 장소 소개'
                        )}
                      </button>
                    </div>
                    
                    {showLocationInfo && locationInfo && selectedSchedule?.id === schedule.id && (
                      <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        {/* 헤더 */}
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
                          <h4 className="text-xl font-bold mb-1">
                            {locationInfo.title}
                          </h4>
                          <p className="text-blue-100 text-sm">
                            📍 {schedule.location} • ⏰ {schedule.time}
                          </p>
                        </div>
                        
                        {/* 설명 */}
                        <div className="p-4">
                          <div className="text-gray-700 whitespace-pre-line leading-relaxed mb-6">
                            {locationInfo.description}
                          </div>
                          
                          {/* 하이라이트 */}
                          {locationInfo.highlights && locationInfo.highlights.length > 0 && (
                            <div className="mb-6">
                              <h5 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                ✨ 주요 하이라이트
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {locationInfo.highlights.map((highlight, index) => (
                                  <div key={index} className="flex items-start space-x-2 p-2 bg-blue-50 rounded-lg">
                                    <span className="text-blue-600 text-sm mt-0.5">•</span>
                                    <span className="text-gray-700 text-sm">{highlight}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* 팁 */}
                          {locationInfo.tips && locationInfo.tips.length > 0 && (
                            <div>
                              <h5 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                💡 방문 팁
                              </h5>
                              <div className="space-y-2">
                                {locationInfo.tips.map((tip, index) => (
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
                ))}
              </div>
            </div>
          )}
          
          {/* 갤러리 헤더 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">🍽️ 식사 사진 갤러리</h2>
                <p className="text-gray-600">날짜별, 식사별로 정리된 사진들을 확인해보세요</p>
              </div>
              <div className="flex items-center gap-2">
                {/* 조식 전체 삭제 버튼 */}
                <button
                  onClick={handleDeleteBreakfast}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  title="조식 데이터 전체 삭제"
                >
                  🗑️ 삭제
                </button>
              </div>
            </div>
          </div>

          {/* 날짜별 식사 카드 그리드 */}
          {Object.keys(images).length > 0 ? (
            <div className="space-y-8">
              {Object.keys(images)
                .sort((a, b) => new Date(b) - new Date(a))
                .map((date) => (
                  <div key={date} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* 날짜 헤더 */}
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
                      <h3 className="text-xl font-bold">
                        📅 {formatDate(date)}
                      </h3>
                      <p className="text-orange-100">
                        {Object.keys(images[date]).length}개의 식사 • {
                          Object.values(images[date]).reduce((acc, meals) => acc + meals.length, 0)
                        }장의 사진
                      </p>
                    </div>

                    {/* 식사 종류별 그리드 */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {['조식', '중식', '석식'].map((mealType) => {
                          const mealPhotos = images[date][mealType] || [];
                          if (mealPhotos.length === 0) return null;

                          // 사람별로 그룹화
                          const photosByPerson = {};
                          mealPhotos.forEach(photo => {
                            const personName = photo.uploadedBy?.name || '익명';
                            if (!photosByPerson[personName]) {
                              photosByPerson[personName] = [];
                            }
                            photosByPerson[personName].push(photo);
                          });

                          return (
                            <div key={mealType} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                              {/* 식사 종류 헤더 */}
                              <div className="bg-white p-4 border-b">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-2xl">
                                      {mealType === '조식' && '🌅'}
                                      {mealType === '중식' && '☀️'}
                                      {mealType === '석식' && '🌙'}
                                    </span>
                                    <h4 className="text-lg font-semibold text-gray-900">{mealType}</h4>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                      {Object.keys(photosByPerson).length}명 • {mealPhotos.length}장
                                    </span>
                                    {/* 조식 삭제 버튼 */}
                                    {mealType === '조식' && mealPhotos.length > 0 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteBreakfast();
                                        }}
                                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-colors"
                                        title="조식 데이터 전체 삭제"
                                      >
                                        🗑️ 삭제
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 사람별 사진 카드들 */}
                              <div className="p-4 space-y-3">
                                {Object.entries(photosByPerson).map(([personName, personPhotos]) => {
                                  // 반응 수로 정렬 (낮은 순)
                                  const sortedPhotos = sortPhotosByReactions(personPhotos);
                                  const totalReactions = sortedPhotos.reduce((acc, photo) => acc + getReactionCount(photo), 0);

                                  return (
                                    <div 
                                      key={personName} 
                                      className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium text-gray-900">👤 {personName}</span>
                                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                            {sortedPhotos.length}장
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                                          <span>❤️ {totalReactions}</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setModalPhotos(sortedPhotos);
                                              setSelectedPhoto(sortedPhotos[0]);
                                              setCurrentPhotoIndex(0);
                                              setShowPhotoModal(true);
                                            }}
                                            className="text-orange-500 hover:text-orange-700 transition-colors"
                                          >
                                            👆 클릭하여 보기
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* 대표 사진 (반응 수가 가장 적은 사진) */}
                                      <div className="relative group">
                                        <img
                                          src={sortedPhotos[0].imageUrl}
                                          alt={`${personName}의 ${mealType} 사진`}
                                          className="w-full h-32 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                          onClick={() => {
                                            setModalPhotos(sortedPhotos);
                                            setSelectedPhoto(sortedPhotos[0]);
                                            setCurrentPhotoIndex(0);
                                            setShowPhotoModal(true);
                                          }}
                                        />
                                        
                                        {/* 추가 사진 개수 표시 */}
                                        {sortedPhotos.length > 1 && (
                                          <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg">
                                            +{sortedPhotos.length - 1}
                                          </div>
                                        )}
                                        
                                        {/* 삭제 버튼 */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('이 사진을 삭제하시겠습니까?')) {
                                              handleDeletePhoto(sortedPhotos[0].id);
                                            }
                                          }}
                                          className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                          title="사진 삭제"
                                        >
                                          🗑️
                                        </button>
                                        
                                        {/* 반응 수 표시 */}
                                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
                                          반응 {getReactionCount(sortedPhotos[0])}개
                                        </div>
                                      </div>
                                      
                                      {/* 사진 정보 */}
                                      <div className="mt-2 space-y-1">
                                        <p className="text-xs text-gray-600 truncate">
                                          {sortedPhotos[0].description || '설명 없음'}
                                        </p>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                          <span>📅 {new Date(sortedPhotos[0].uploadedAt).toLocaleDateString('ko-KR')}</span>
                                          <div className="flex items-center space-x-2">
                                            <span>❤️ {Object.values(sortedPhotos[0].emojis || {}).reduce((sum, users) => sum + users.length, 0)}</span>
                                            <span>💬 {(sortedPhotos[0].comments || []).length}</span>
                                          </div>
                                        </div>
                                      </div>
                                      

                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">아직 식사 사진이 없습니다</h3>
              <p className="text-gray-600 mb-6">첫 번째 식사 사진을 업로드해보세요!</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                📷 첫 번째 사진 업로드
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">🍽️ 식사 사진 업로드</h3>
            
            {/* 날짜 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 날짜 선택
              </label>
              <input
                type="date"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* 식사 종류 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🍽️ 식사 종류
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['조식', '중식', '석식'].map((mealType) => (
                  <button
                    key={mealType}
                    onClick={() => setSelectedMealType(mealType)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedMealType === mealType
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300'
                    }`}
                  >
                    {mealType === '조식' && '🌅'}
                    {mealType === '중식' && '☀️'}
                    {mealType === '석식' && '🌙'}
                    <br />
                    <span className="text-sm font-medium">{mealType}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📷 사진 선택 (다중선택 가능)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
              {selectedFiles.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">
                    선택된 파일 ({selectedFiles.length}개):
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                        📷 {file.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💬 설명 (선택사항)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="식사 사진에 대한 설명을 입력하세요..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows="3"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFiles([]);
                  setDescription('');
                  setSelectedMealType('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0 || !uploadDate || !selectedMealType}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? '📤 업로드 중...' : `📤 ${selectedMealType} 사진 ${selectedFiles.length}장 업로드`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사진 모달 */}
      {showPhotoModal && selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="p-6">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedPhoto.uploadedBy?.name || '익명'} - {selectedPhoto.mealType} ({currentPhotoIndex + 1}/{modalPhotos.length})
                </h3>
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* 사진 네비게이션 */}
              {modalPhotos.length > 1 && (
                <div className="mb-4">
                  <div className="flex space-x-2 overflow-x-auto">
                    {modalPhotos.map((photo, index) => (
                      <div key={photo.id} className="relative flex-shrink-0">
                        <button
                          onClick={() => {
                            setSelectedPhoto(photo);
                            setCurrentPhotoIndex(index);
                          }}
                          className={`block w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            currentPhotoIndex === index ? 'border-orange-500 shadow-lg' : 'border-gray-300 hover:border-orange-300'
                          }`}
                        >
                          <img
                            src={photo.imageUrl}
                            alt={`사진 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                        {/* 반응 수 표시 */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs text-center py-1 rounded-b-lg">
                          ❤️ {getReactionCount(photo)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 메인 사진 */}
              <div className="relative mb-6">
                {/* 이전 사진 버튼 */}
                {modalPhotos.length > 1 && currentPhotoIndex > 0 && (
                  <button
                    onClick={handlePrevPhoto}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full shadow-lg transition-all"
                    title="이전 사진"
                  >
                    ← 
                  </button>
                )}
                
                {/* 다음 사진 버튼 */}
                {modalPhotos.length > 1 && currentPhotoIndex < modalPhotos.length - 1 && (
                  <button
                    onClick={handleNextPhoto}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full shadow-lg transition-all"
                    title="다음 사진"
                  >
                    →
                  </button>
                )}

                {/* 삭제 버튼 */}
                {user && selectedPhoto.uploadedBy?.id === user.id && (
                  <button
                    onClick={() => handleDeletePhoto(selectedPhoto.id)}
                    className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full text-xs shadow-lg"
                    title="사진 삭제"
                  >
                    🗑️
                  </button>
                )}

                {/* 사진 카운터 */}
                {modalPhotos.length > 1 && (
                  <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                    {currentPhotoIndex + 1} / {modalPhotos.length}
                  </div>
                )}

                {/* 반응 수 표시 */}
                <div className="absolute bottom-2 left-2 z-10 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  반응 {getReactionCount(selectedPhoto)}개
                </div>
                
                <img
                  src={selectedPhoto.imageUrl}
                  alt="선택된 사진"
                  className="w-full max-h-96 object-contain rounded-lg"
                />
              </div>

              {/* 사진 정보 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700 mb-2">
                  {selectedPhoto.description || '설명 없음'}
                </p>
                <p className="text-sm text-gray-500">
                  📅 {formatDate(selectedPhoto.date)} • 
                  👤 {selectedPhoto.uploadedBy?.name || '익명'} • 
                  ⏰ {new Date(selectedPhoto.uploadedAt).toLocaleString('ko-KR')}
                </p>
              </div>

              {/* 이모티콘 섹션 */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">👍 이모티콘</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['❤️', '👍', '😍', '😋', '🤤', '👏'].map((emoji) => {
                    // 이모티콘 데이터 구조에 따라 카운트와 사용자 상태 확인
                    const emojiUsers = selectedPhoto.emojis?.[emoji] || [];
                    const emojiCount = emojiUsers.length;
                    const userHasEmoji = emojiUsers.includes(user?.id);
                    
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiClick(selectedPhoto.id, emoji)}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-full border transition-all ${
                          userHasEmoji 
                            ? 'border-orange-500 bg-orange-50 text-orange-700' 
                            : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="text-sm">{emojiCount}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 댓글 섹션 */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">💬 댓글 ({selectedPhoto.comments?.length || 0}개)</h4>
                
                {/* 기존 댓글 목록 */}
                {selectedPhoto.comments && selectedPhoto.comments.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {selectedPhoto.comments.map((comment, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{comment.author}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-gray-700">{comment.text}</p>
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
                    className="flex-1 p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleCommentSubmit(selectedPhoto.id)}
                    disabled={commentSubmitting || !newComment.trim()}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap font-medium"
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
  );
}
