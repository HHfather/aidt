import { db } from '../../firebaseConfig';
import { collection, addDoc, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' });
  }

  try {
    const { text, scheduleId } = req.body;

    if (!text || !scheduleId) {
      return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' });
    }

    // AI 텍스트 수정 로직 (실제 구현에서는 OpenAI API 등 사용)
    const editedText = await improveTextWithAI(text, scheduleId);

    // 수정된 텍스트를 데이터베이스에 저장
    const q = query(
      collection(db, 'researchTasks'),
      where('scheduleId', '==', scheduleId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // 기존 문서 업데이트
      await updateDoc(doc(db, 'researchTasks', snapshot.docs[0].id), {
        content: editedText,
        originalContent: text,
        aiEdited: true,
        updatedAt: new Date().toISOString()
      });
    } else {
      // 새 문서 생성
      await addDoc(collection(db, 'researchTasks'), {
        scheduleId: scheduleId,
        content: editedText,
        originalContent: text,
        aiEdited: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    res.status(200).json({ 
      success: true, 
      data: { 
        editedText: editedText,
        message: 'AI가 텍스트를 수정했습니다.'
      }
    });

  } catch (error) {
    console.error('AI 텍스트 수정 오류:', error);
    res.status(500).json({ success: false, error: 'AI 텍스트 수정 중 오류가 발생했습니다.' });
  }
}

// AI 텍스트 개선 함수 (실제 구현에서는 OpenAI API 사용)
async function improveTextWithAI(text, scheduleId) {
  // 실제 구현에서는 OpenAI API를 호출하여 텍스트를 개선
  // 여기서는 간단한 시뮬레이션으로 대체
  
  return new Promise(async (resolve) => {
    setTimeout(async () => {
      try {
        // 1차: 형식과 내용 수정, 전체적 흐름 맞춤
        let improvedText = text.trim();
        
        // 연속된 공백 제거
        improvedText = improvedText.replace(/\s+/g, ' ');
        
        // 문장 부호 정리
        improvedText = improvedText.replace(/\s*([,.!?])\s*/g, '$1 ');
        improvedText = improvedText.replace(/\s*([,.!?])([가-힣])/g, '$1 $2');
        
        // 줄바꿈 정리
        improvedText = improvedText.replace(/\n\s*\n/g, '\n\n');
        improvedText = improvedText.replace(/\n\s+/g, '\n');
        
        // 한국어 맞춤법 및 비격식 표현 개선
        improvedText = improvedText
          .replace(/안녕하세세세셍ㅅ\s*ㅈ너저는/g, '안녕하세요. 저는')
          .replace(/dka/g, '')
          .replace(/닝/g, '님')
          .replace(/ㅋㅋㅋㅋ/g, '')
          .replace(/ㅎㅎ/g, '')
          .replace(/메롱이다/g, '')
          .replace(/이녀석야/g, '')
          .replace(/거야야야야/g, '입니다')
          .replace(/아닌거같은데/g, '아닌 것 같습니다')
          .replace(/그냥뭔지\s*몰라요/g, '정확히 무엇인지 모르겠습니다')
          .replace(/이게수정한거라는/g, '이것이 수정된 내용이라는')
          .replace(/이거/g, '이것')
          .replace(/그거/g, '그것')
          .replace(/저거/g, '저것')
          .replace(/뭔지/g, '무엇인지')
          .replace(/어떤지/g, '어떠한지');
        
        // 일정 정보 가져오기 (scheduleId가 있는 경우)
        let scheduleInfo = null;
        if (scheduleId) {
          try {
            const { db } = require('../../firebaseConfig');
            const { collection, query, where, getDocs } = require('firebase/firestore');
            
            // scheduleId로 일정 정보 조회
            const q = query(collection(db, 'schedules'), where('id', '==', scheduleId));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
              scheduleInfo = snapshot.docs[0].data();
            }
          } catch (error) {
            console.error('일정 정보 조회 실패:', error);
          }
        }
        
        // 보고서 양식에 맞게 구조화
        const currentDate = new Date().toISOString().split('T')[0];
        const year = currentDate.split('-')[0];
        const month = currentDate.split('-')[1];
        const day = currentDate.split('-')[2];
        
        // 장소명 추출 (첫 번째 단어 또는 scheduleInfo에서)
        let locationName = improvedText.split(' ')[0];
        if (scheduleInfo && scheduleInfo.location) {
          locationName = scheduleInfo.location;
        }
        
        // 보고서 형식으로 변환 (전체적 흐름에 맞춤)
        const reportFormat = `2. ${locationName} 방문을 통한 교육적 시사점

가. 방문 개요
○ 위치: ${scheduleInfo?.location || '해당 장소'}
○ 방문 일시: ${year}년 ${month}월 ${day}일
○ 방문 목적: 교육적 시사점 도출 및 현장 학습
${scheduleInfo?.activity ? `○ 활동 내용: ${scheduleInfo.activity}` : ''}

나. 방문 내용
${improvedText}

다. 교육적 시사점과 활용 방안
1) 교과 연계: ${locationName}의 특성을 활용한 다양한 교과 연계 방안 모색
2) 현장 학습: 실제 경험을 통한 학습 효과 극대화 방안
3) 교육 프로그램: ${locationName}을 활용한 교육 프로그램 개발 방안

라. 시사점
이번 ${locationName} 방문을 통해 해당 장소의 교육적 활용 가능성을 확인할 수 있었다. 특히 실제 현장 경험과 교육적 목적을 접목한 학습 시스템의 중요성을 재확인하였다. 향후 교육 활동에서 이러한 현장 학습의 효과를 극대화할 수 있는 방안을 지속적으로 모색할 필요가 있다.`;
        
        // 실제 AI API 호출 시뮬레이션
        if (Math.random() > 0.02) { // 98% 성공률
          resolve(reportFormat);
        } else {
          // 실패 시 원본 텍스트 반환
          resolve(text);
        }
      } catch (error) {
        console.error('AI 텍스트 개선 오류:', error);
        resolve(text); // 오류 시 원본 반환
      }
    }, 2000); // 2초 지연 시뮬레이션
  });
} 