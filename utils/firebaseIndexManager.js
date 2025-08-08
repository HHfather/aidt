import { db } from '../firebaseConfig';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

// Firebase 인덱스가 필요한 쿼리들을 테스트하는 함수
export const testFirebaseIndexes = async () => {
  const indexTests = [
    {
      name: 'scheduledMessages - region + scheduledAt',
      test: async () => {
        try {
          const q = query(
            collection(db, 'scheduledMessages'),
            where('region', '==', '1'),
            orderBy('scheduledAt', 'asc'),
            limit(1)
          );
          await getDocs(q);
          return { success: true, message: '인덱스 정상' };
        } catch (error) {
          return { 
            success: false, 
            message: '인덱스 필요', 
            error: error.message,
            indexConfig: {
              collection: 'scheduledMessages',
              fields: ['region', 'scheduledAt'],
              queryScope: 'COLLECTION'
            }
          };
        }
      }
    },
    {
      name: 'gallery - region + date',
      test: async () => {
        try {
          const q = query(
            collection(db, 'gallery'),
            where('region', '==', '1'),
            orderBy('date', 'asc'),
            limit(1)
          );
          await getDocs(q);
          return { success: true, message: '인덱스 정상' };
        } catch (error) {
          return { 
            success: false, 
            message: '인덱스 필요', 
            error: error.message,
            indexConfig: {
              collection: 'gallery',
              fields: ['region', 'date'],
              queryScope: 'COLLECTION'
            }
          };
        }
      }
    },
    {
      name: 'researchTasks - region + createdAt',
      test: async () => {
        try {
          const q = query(
            collection(db, 'researchTasks'),
            where('region', '==', '1'),
            orderBy('createdAt', 'asc'),
            limit(1)
          );
          await getDocs(q);
          return { success: true, message: '인덱스 정상' };
        } catch (error) {
          return { 
            success: false, 
            message: '인덱스 필요', 
            error: error.message,
            indexConfig: {
              collection: 'researchTasks',
              fields: ['region', 'createdAt'],
              queryScope: 'COLLECTION'
            }
          };
        }
      }
    }
  ];

  const results = [];
  for (const test of indexTests) {
    try {
      const result = await test.test();
      results.push({
        name: test.name,
        ...result
      });
    } catch (error) {
      results.push({
        name: test.name,
        success: false,
        message: '테스트 실패',
        error: error.message
      });
    }
  }

  return results;
};

// 필요한 인덱스 정보를 반환하는 함수
export const getRequiredIndexes = () => {
  return [
    {
      collection: 'scheduledMessages',
      fields: ['region', 'scheduledAt'],
      queryScope: 'COLLECTION',
      description: '예약 메시지 권역별 시간순 정렬'
    },
    {
      collection: 'gallery',
      fields: ['region', 'date'],
      queryScope: 'COLLECTION',
      description: '갤러리 권역별 날짜순 정렬'
    },
    {
      collection: 'researchTasks',
      fields: ['region', 'createdAt'],
      queryScope: 'COLLECTION',
      description: '연구과제 권역별 생성일순 정렬'
    }
  ];
};

// 인덱스 생성 가이드 HTML을 생성하는 함수
export const generateIndexGuideHTML = () => {
  const indexes = getRequiredIndexes();
  
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1>Firebase 인덱스 설정 가이드</h1>
      <p>다음 인덱스들을 Firebase Console에서 생성해주세요:</p>
      
      <div style="margin: 20px 0;">
        <h2>1. Firebase Console 접속</h2>
        <p><a href="https://console.firebase.google.com" target="_blank">https://console.firebase.google.com</a></p>
      </div>
      
      <div style="margin: 20px 0;">
        <h2>2. 프로젝트 선택</h2>
        <p>해당 프로젝트를 선택하세요.</p>
      </div>
      
      <div style="margin: 20px 0;">
        <h2>3. Firestore Database → 인덱스 탭</h2>
        <p>왼쪽 메뉴에서 "Firestore Database" → "인덱스" 탭으로 이동하세요.</p>
      </div>
      
      <div style="margin: 20px 0;">
        <h2>4. 다음 인덱스들 생성:</h2>
  `;

  indexes.forEach((index, i) => {
    html += `
        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
          <h3>인덱스 ${i + 1}: ${index.description}</h3>
          <ul>
            <li><strong>컬렉션:</strong> ${index.collection}</li>
            <li><strong>필드:</strong> ${index.fields.join(', ')}</li>
            <li><strong>쿼리 범위:</strong> ${index.queryScope}</li>
          </ul>
        </div>
    `;
  });

  html += `
        <div style="margin: 20px 0;">
          <h2>5. 인덱스 생성 후</h2>
          <p>인덱스가 생성되면 자동으로 빌드됩니다. 빌드가 완료되면 오류가 해결됩니다.</p>
        </div>
        
        <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>💡 팁</h3>
          <ul>
            <li>인덱스 빌드는 몇 분에서 몇 시간이 걸릴 수 있습니다.</li>
            <li>빌드 중에는 해당 쿼리가 느려질 수 있습니다.</li>
            <li>인덱스가 완료되면 성능이 크게 향상됩니다.</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  return html;
}; 