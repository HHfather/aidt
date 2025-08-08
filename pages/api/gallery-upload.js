import { IncomingForm } from 'formidable';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../firebaseConfig';
import { collection, addDoc, doc, getDocs, query, where, runTransaction, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
    maxDuration: 60,
  },
};

const SCORE_WEIGHTS = {
  photoUpload: 5,
};

const calculateBonus = (isFirst) => {
    if (isFirst) {
      return { points: 5, message: "첫 사진 업로드! +5점 보너스! 📸" };
    }
  
    const random = Math.random();
    if (random < 0.1) { // 10% 확률
      return { points: 10, message: "인생샷 등극! +10점! 🏆" };
    }
    if (random < 0.3) { // 20% 확률 (누적 30%)
      return { points: 5, message: "멋진 사진이에요! +5점! ✨" };
    }
  
    return { points: 0, message: null };
};

// formidable 필드를 안전하게 가져오는 헬퍼 함수
const getField = (fields, fieldName) => {
    const value = fields[fieldName];
    if (Array.isArray(value) && value.length > 0) {
        return value[0];
    }
    return value || null;
};

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const form = new IncomingForm({
    maxFileSize: 10 * 1024 * 1024, // 10MB로 증가
    maxFields: 20, // 필드 수 증가
    allowEmptyFiles: false,
    keepExtensions: true,
    multiples: true, // 다중 파일 지원
  });

  // Promise로 감싸서 처리
  return new Promise((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        res.status(500).json({ success: false, error: `Form parsing error: ${err.message}` });
        return resolve();
      }

      try {
          console.log('--- Gallery Upload API ---');
          console.log('Received fields keys:', Object.keys(fields));
          console.log('Received files keys:', Object.keys(files));
          
          // --- 데이터 유효성 검사 및 추출 ---
          // 다양한 필드명 지원 (images, file, image)
          const uploadedFiles = files.images || files.file || files.image;
          if (!uploadedFiles) {
              console.error('[ERROR] No files provided:', { files, availableKeys: Object.keys(files) });
              res.status(400).json({ success: false, error: 'File not provided.' });
              return resolve();
          }

          // 단일 파일 또는 다중 파일 처리
          const fileArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
          
          if (fileArray.length === 0) {
              console.error('[ERROR] No valid files found:', { files });
              res.status(400).json({ success: false, error: 'No valid files provided.' });
              return resolve();
          }

          // 첫 번째 파일만 처리 (다중 파일 업로드는 나중에 구현)
          const uploadedFile = fileArray[0];
          
          if (!uploadedFile || !uploadedFile.filepath) {
              console.error('[ERROR] File not provided or invalid:', { uploadedFile, fileKeys: Object.keys(uploadedFile || {}) });
              res.status(400).json({ success: false, error: 'File not provided.' });
              return resolve();
          }
          
          // 파일 크기 검증 (10MB 제한)
          const maxFileSize = 10 * 1024 * 1024; // 10MB
          if (uploadedFile.size > maxFileSize) {
              console.error('[ERROR] File too large:', { size: uploadedFile.size, maxSize: maxFileSize });
              res.status(413).json({ success: false, error: 'File too large. Maximum size is 10MB.' });
              return resolve();
          }
          
          console.log('Step 1: Extracted uploadedFile successfully.', { originalFilename: uploadedFile.originalFilename, size: uploadedFile.size });

          const type = getField(fields, 'type');
          const userDataString = getField(fields, 'userData');

          if (!type || !userDataString) {
              console.error('[ERROR] Type or userData is missing.', { type, userDataString: !!userDataString });
              res.status(400).json({ success: false, error: 'Type and user data are required.' });
              return resolve();
          }
          
          let userData;
          try {
              userData = JSON.parse(userDataString);
          } catch (parseError) {
              console.error('[ERROR] Failed to parse userData:', parseError);
              res.status(400).json({ success: false, error: 'Invalid user data format.' });
              return resolve();
          }
          
          if (!userData || !userData.id) {
              console.error('[ERROR] User ID is missing in userData.', { userData });
              res.status(403).json({ success: false, error: 'User ID is required.' });
              return resolve();
          }
          
          console.log(`Step 2: Parsed userData for user ID ${userData.id}`);

          // --- Firebase Storage에 업로드 ---
        const storage = getStorage();
        const storageRef = ref(storage, `${type}-gallery/${uuidv4()}-${uploadedFile.originalFilename}`);
        const fileBuffer = require('fs').readFileSync(uploadedFile.filepath);
        
        await uploadBytes(storageRef, fileBuffer, {
          contentType: uploadedFile.mimetype,
        });
        const downloadURL = await getDownloadURL(storageRef);
        console.log(`Step 3: File uploaded to Storage. URL: ${downloadURL}`);
        
        // --- Firestore에 저장할 데이터 준비 ---
        let docData = {
          imageUrl: downloadURL,
          uploadedBy: {
              id: userData.id,
              name: userData.name,
              affiliation: userData.affiliation
          },
          createdAt: serverTimestamp(), // 서버 시간 사용
          comments: [],
          emojis: {},
        };
        
        let targetCollection;
        let scheduleIdForQuery;

        if (type === 'meal') {
          targetCollection = 'gallery'; // meals-gallery가 아닌 gallery 컬렉션 사용
          const date = getField(fields, 'date');
          const region = getField(fields, 'region');
          const mealType = getField(fields, 'mealType');
          
          if (!date || !region || !mealType) {
              res.status(400).json({ success: false, error: 'Date, region, and mealType are required for meal uploads.' });
              return resolve();
          }

          scheduleIdForQuery = `${date}-${region}-${mealType}`;
          
          docData = {
              ...docData,
              date,
              region,
              mealType,
              type: 'meal', // 타입 명시
              scheduleId: scheduleIdForQuery,
              description: getField(fields, 'description') || ''
          };
          
          console.log('--- Meal Upload Data ---');
          console.log('Date:', date);
          console.log('Region:', region);
          console.log('MealType:', mealType);
          console.log('Type:', 'meal');
          console.log('ScheduleId:', scheduleIdForQuery);

        } else if (type === 'schedule') {
          targetCollection = 'gallery';
          scheduleIdForQuery = getField(fields, 'scheduleId');
          if (!scheduleIdForQuery) {
              res.status(400).json({ success: false, error: 'scheduleId is required for schedule uploads.' });
              return resolve();
          }
          docData = {
            ...docData,
            scheduleId: scheduleIdForQuery,
            description: getField(fields, 'description') || '',
            date: getField(fields, 'date') || '',
            location: getField(fields, 'location') || '',
            activity: getField(fields, 'activity') || ''
          };
        } else {
          res.status(400).json({ success: false, error: 'Invalid upload type.' });
          return resolve();
        }

        // --- 트랜잭션을 사용하여 점수 계산 및 데이터 저장 ---
        let bonusResult = { points: 0, message: null };
        let newImageId = null;
        
        await runTransaction(db, async (transaction) => {
          // 1. 첫 업로드인지 확인 (트랜잭션 내에서는 getDocs 대신 transaction.get 사용)
          const collectionRef = collection(db, targetCollection);
          const q = query(collectionRef, where("scheduleId", "==", scheduleIdForQuery), where("uploadedBy.id", "==", userData.id));
          const userUploadsSnapshot = await getDocs(q); // 트랜잭션 외부에서 실행해야 함

          const isFirstUploadForUser = userUploadsSnapshot.empty;
          bonusResult = calculateBonus(isFirstUploadForUser);
          
          // 2. 랭킹 점수 업데이트
          const rankingRef = doc(db, 'rankings', userData.id);
          const rankingDoc = await transaction.get(rankingRef);
          
          if (rankingDoc.exists()) {
            const basePoints = SCORE_WEIGHTS.photoUpload;
            const bonusPoints = bonusResult.points;
            const totalPointsToAdd = basePoints + bonusPoints;

            transaction.update(rankingRef, {
              baseScore: (rankingDoc.data().baseScore || 0) + basePoints,
              bonusScore: (rankingDoc.data().bonusScore || 0) + bonusPoints,
              totalScore: (rankingDoc.data().totalScore || 0) + totalPointsToAdd,
              photoUploads: (rankingDoc.data().photoUploads || 0) + 1,
            });
          }
          
          // 3. 이미지 메타데이터 저장
          const newImageRef = doc(collection(db, targetCollection));
          newImageId = newImageRef.id;
          transaction.set(newImageRef, docData);
        });

        res.status(200).json({ 
          success: true, 
          url: downloadURL, 
          data: {
            id: newImageId,
            imageUrl: downloadURL,
            fileName: getField(fields, 'fileName') || 'unknown',
            uploadedBy: docData.uploadedBy,
            uploadedAt: new Date().toISOString(),
            scheduleId: scheduleIdForQuery,
            date: docData.date || '',
            location: docData.location || '',
            activity: docData.activity || ''
          },
          bonus: bonusResult 
        });

      } catch (error) {
        console.error('Upload API Error:', error);
        res.status(500).json({ success: false, error: 'Upload failed', details: error.message });
      }
      
      resolve();
    });
  });
}
