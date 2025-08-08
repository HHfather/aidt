import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

export default function Login() {
  const router = useRouter();
  const [loginType, setLoginType] = useState('trainee'); // trainee, admin, guide
  const [isLoading, setIsLoading] = useState(false);

  // Common fields
  const [region, setRegion] = useState('1');
  const [authKey, setAuthKey] = useState('');

  // Trainee fields
  const [affiliation, setAffiliation] = useState('');
  const [name, setName] = useState('');

  // Admin fields
  const [password, setPassword] = useState('');

  useEffect(() => {
    // 관리자의 마지막 선택 권역을 불러옴
    if (loginType === 'admin') {
      const lastAdminRegion = localStorage.getItem('lastAdminRegion');
      if (lastAdminRegion) {
        setRegion(lastAdminRegion);
      }
    }
  }, [loginType]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    toast.loading('로그인 중...');

    let payload;
    let apiEndpoint;
    let sessionData;
    let redirectUrl;

    try {
        if (loginType === 'trainee') {
            if (!affiliation || !name || !authKey) {
              toast.dismiss();
              toast.error('모든 필드를 입력해주세요.');
              setIsLoading(false);
              return;
            }
            apiEndpoint = '/api/auth/trainee-login';
            payload = { region: `${region}권역`, affiliation, name, authKey };
            
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            toast.dismiss();

            if (result.success) {
                sessionData = { isUser: true, ...result.user, loginTime: new Date().toISOString() };
                localStorage.setItem('userSession', JSON.stringify(sessionData));
                sessionStorage.setItem('userSession', JSON.stringify(sessionData));
                toast.success(`${result.user.name}님, 환영합니다!`);
                redirectUrl = '/dashboard';
                router.push(redirectUrl);
            } else {
                toast.error(result.error || '로그인에 실패했습니다.');
            }

        } else if (loginType === 'admin') {
            if (!password || !region) {
              toast.dismiss();
              toast.error('권역과 비밀번호를 모두 입력해주세요.');
              setIsLoading(false);
              return;
            }
            
            apiEndpoint = '/api/admin/login';
            payload = { password, region };

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            toast.dismiss();

            if (result.success) {
                sessionData = { 
                    isAdmin: true, 
                    name: '관리자',
                    affiliation: '관리자',
                    region: result.region, 
                    id: 'admin',
                    loginTime: new Date().toISOString() 
                };
                // 저장 위치 통일: 관리자 세션 키 추가
                localStorage.setItem('adminSession', JSON.stringify(sessionData));
                sessionStorage.setItem('adminSession', JSON.stringify(sessionData));
                localStorage.setItem('userSession', JSON.stringify(sessionData));
                localStorage.setItem('lastAdminRegion', region);
                toast.success('관리자님, 환영합니다!');
                redirectUrl = '/admin'; // 관리자 페이지로 이동
                router.push(redirectUrl);
            } else {
                toast.error(result.error || '로그인에 실패했습니다.');
            }

        } else if (loginType === 'guide') {
            if (!region || !authKey) {
              toast.dismiss();
              toast.error('권역과 인증키를 모두 입력해주세요.');
              setIsLoading(false);
              return;
            }
            
            const expectedAuthKey = region === '2' ? 'lucky' : `guide_${region}`;
            
            if (authKey === expectedAuthKey) {
              const guideSession = { 
                isGuide: true, 
                id: `guide_${region}`, 
                region: `${region}권역`,
                name: `${region}권역 가이드`,
                affiliation: '가이드',
                loginTime: new Date().toISOString() 
              };
              localStorage.setItem('guideSession', JSON.stringify(guideSession));
              toast.success('가이드님, 환영합니다!');
              router.push('/guide/dashboard');
            } else {
              toast.error('인증키가 올바르지 않습니다.');
            }
        }
    } catch (error) {
      toast.dismiss();
      toast.error('로그인 중 오류가 발생했습니다.');
      console.error(`${loginType} login error:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderForm = () => {
    switch (loginType) {
      case 'admin':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">권역</label>
              <select 
                value={region} 
                onChange={(e) => setRegion(e.target.value)} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                required
              >
                <option value="">권역을 선택하세요</option>
                {[...Array(10)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}권역</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="관리자 비밀번호"
                required
                lang="en"
                inputMode="text"
                autoComplete="current-password"
              />
            </div>
          </>
        );
      case 'guide':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">권역</label>
              <select 
                value={region} 
                onChange={(e) => setRegion(e.target.value)} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                required
              >
                <option value="">권역을 선택하세요</option>
                {[...Array(10)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}권역</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">인증키</label>
              <input
                type="password"
                value={authKey}
                onChange={(e) => setAuthKey(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="가이드 인증키"
                required
              />
            </div>
          </>
        );
      case 'trainee':
      default:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">권역</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md">
                {[...Array(10)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}권역</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">소속 기관</label>
              <input
                type="text"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="예: OO초, OO청"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">성명</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="성명"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">인증키</label>
              <input
                type="text"
                value={authKey}
                onChange={(e) => setAuthKey(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="연수 참여자 인증키"
                required
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">로그인</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            연수 프로그램에 참여하세요.
          </p>
        </div>

        <div className="flex justify-center rounded-md shadow-sm">
          <button
            onClick={() => setLoginType('trainee')}
            className={`px-4 py-2 text-sm font-medium ${loginType === 'trainee' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} rounded-l-md border border-gray-300 hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-blue-500`}
          >
            연수 참여자
          </button>
          <button
            onClick={() => setLoginType('guide')}
            className={`px-4 py-2 text-sm font-medium ${loginType === 'guide' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} border-t border-b border-gray-300 hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-blue-500`}
          >
            가이드
          </button>
          <button
            onClick={() => setLoginType('admin')}
            className={`px-4 py-2 text-sm font-medium ${loginType === 'admin' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} rounded-r-md border border-gray-300 hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-blue-500`}
          >
            관리자
          </button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {renderForm()}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>

        {/* 개발자 정보 및 버전 */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            곡성중앙초 임환진
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Version 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}

