import { useState } from 'react';

export default function SimpleLogin() {
  const [name, setName] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [region, setRegion] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/simple-login-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, affiliation, region, authKey })
      });
      const data = await res.json();
      if (data.success) {
        setResult('로그인 성공!');
      } else {
        setResult('로그인 실패');
      }
    } catch (err) {
      setResult('서버 오류');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 32, border: '1px solid #eee', borderRadius: 12, boxShadow: '0 2px 8px #eee' }}>
      <h2 style={{ textAlign: 'center' }}>간단 로그인 테스트 (DB 연동)</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 16 }}>
          <label>이름</label>
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>소속</label>
          <input value={affiliation} onChange={e => setAffiliation(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>권역</label>
          <input value={region} onChange={e => setRegion(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>인증키</label>
          <input value={authKey} onChange={e => setAuthKey(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </div>
        <button type="submit" style={{ width: '100%', padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold' }} disabled={loading}>{loading ? '확인 중...' : '로그인'}</button>
      </form>
      {result && <div style={{ marginTop: 24, textAlign: 'center', fontWeight: 'bold', color: result === '로그인 성공!' ? 'green' : 'red' }}>{result}</div>}
    </div>
  );
}