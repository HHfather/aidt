import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const CATEGORY_OPTIONS = ['기능개선', '버그신고', '문의', '칭찬/응원'];
const PRIORITY_OPTIONS = ['보통', '높음', '긴급'];

export default function FeedbackTab() {
  const [category, setCategory] = useState('기능개선');
  const [priority, setPriority] = useState('보통');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [region, setRegion] = useState('');
  const [projectId, setProjectId] = useState('');
  const [senderId, setSenderId] = useState('');

  useEffect(() => {
    const userSession = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
    if (userSession) {
      try {
        const u = JSON.parse(userSession);
        setRegion((u.region || '').toString().replace(/[^0-9]/g, ''));
        setProjectId(u.currentProject?.id || '');
        setSenderId(u.id || '');
        setContact(u.name ? `${u.name} (${u.affiliation || ''})` : '');
      } catch (e) {}
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('내용을 입력하세요.');
      return;
    }
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, content, contact, region, projectId, senderId, priority })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success('피드백이 전송되었습니다. 감사합니다!');
        setContent('');
      } else {
        toast.error(result.error || '전송 실패');
      }
    } catch (err) {
      toast.error('전송 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">📝 피드백 보내기</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">분류</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border px-3 py-2 rounded-md">
              {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full border px-3 py-2 rounded-md">
              {PRIORITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연락처(선택)</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)} className="w-full border px-3 py-2 rounded-md" placeholder="이름/연락처" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} className="w-full border px-3 py-2 rounded-md" placeholder="개선이 필요하거나 버그, 문의 내용을 적어주세요." />
        </div>
        <div className="text-right">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">보내기</button>
        </div>
      </form>
    </div>
  );
}


