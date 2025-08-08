import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

export default function GuideLogin() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    region: '2', // 2권역 기본값
    authKey: ''
  });
  const [loading, setLoading] = useState(false);

  // 기존 세션 확인
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const guideSession = localStorage.getItem('guideSession');
    if (guideSession) {
      try {
        const guideData = JSON.parse(guideSession);
        console.log('기존 가이드 세션 발견:', guideData);
        toast.success(`이미 로그인된 ${guideData.region}권역 가이드님입니다!`);
        router.push('/guide/dashboard');
      } catch (error) {
        console.error('기존 세션 오류:', error);
        localStorage.removeItem('guideSession');
      }
    }
  }, [router]);

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.region || !formData.authKey) {
      toast.error('권역과 인증키를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/guide-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          region: formData.region,
          authKey: formData.authKey
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 가이드 세션 저장
        const guideData = {
          id: result.guide.id,
          name: result.guide.name,
          region: result.guide.region,
          isGuide: true,
          project: result.guide.project
        };
        
        localStorage.setItem('guideSession', JSON.stringify(guideData));
        toast.success(`${result.guide.name} 가이드님, 환영합니다!`);
        router.push('/guide/dashboard');
      } else {
        toast.error(result.message || '로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('가이드 로그인 오류:', error);
      toast.error('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            가이드 로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            연수 프로그램 가이드 전용 로그인
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-2">
                권역 선택
              </label>
              <select
                id="region"
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                required
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}권역
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="authKey" className="block text-sm font-medium text-gray-700 mb-2">
                가이드 인증키
              </label>
              <input
                id="authKey"
                name="authKey"
                type="password"
                value={formData.authKey}
                onChange={handleInputChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="가이드 인증키를 입력하세요"
                required
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              메인 페이지로 돌아가기
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>곡성중앙초 임환진</p>
          <p>Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
}
