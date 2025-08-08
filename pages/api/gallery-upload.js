import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../firebaseConfig';
import { collection, addDoc, doc, getDocs, query, where, runTransaction, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
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

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('--- Gallery Upload API ---');
    console.log('Request body keys:', Object.keys(req.body));
    
    const { 
      type, 
      userData: userDataString, 
      scheduleId, 
      date, 
      location, 
      activity, 
      description,
      region,
      mealType,
      fileName,
      fileSize,
      imageData // Base64 인코딩된 이미지 데이터
    } = req.body;

    // 필수 필드 검증
    if (!type || !userDataString || !imageData) {
      console.error('[ERROR] Missing required fields:', { type, userData: !!userDataString, imageData: !!imageData });
      return res.status(400).json({ success: false, error: 'Type, userData, and imageData are required.' });
    }

    // userData 파싱
    let userData;
    try {
      userData = JSON.parse(userDataString);
    } catch (parseError) {
      console.error('[ERROR] Failed to parse userData:', parseError);
      return res.status(400).json({ success: false, error: 'Invalid user data format.' });
    }

    if (!userData || !userData.id) {
      console.error('[ERROR] User ID is missing in userData:', { userData });
      return res.status(403).json({ success: false, error: 'User ID is required.' });
    }

    console.log(`Step 1: Parsed userData for user ID ${userData.id}`);

    // Base64 이미지 데이터를 Buffer로 변환
    let imageBuffer;
    try {
      // Base64 데이터에서 헤더 제거 (data:image/jpeg;base64, 부분)
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      console.error('[ERROR] Failed to decode base64 image:', error);
      return res.status(400).json({ success: false, error: 'Invalid image data format.' });
    }

    // 파일 크기 검증 (10MB 제한)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (imageBuffer.length > maxFileSize) {
      console.error('[ERROR] File too large:', { size: imageBuffer.length, maxSize: maxFileSize });
      return res.status(413).json({ success: false, error: 'File too large. Maximum size is 10MB.' });
    }

    console.log('Step 2: Image buffer created successfully, size:', imageBuffer.length);

    // --- Firebase Storage에 업로드 ---
    const storage = getStorage();
    const fileExtension = fileName ? fileName.split('.').pop() : 'jpg';
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const storageRef = ref(storage, `${type}-gallery/${uniqueFileName}`);
    
    await uploadBytes(storageRef, imageBuffer, {
      contentType: `image/${fileExtension}`,
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
      createdAt: serverTimestamp(),
      comments: [],
      emojis: {},
    };
    
    let targetCollection;
    let scheduleIdForQuery;

    if (type === 'meal') {
      targetCollection = 'gallery';
      
      if (!date || !region || !mealType) {
        return res.status(400).json({ success: false, error: 'Date, region, and mealType are required for meal uploads.' });
      }

      scheduleIdForQuery = `${date}-${region}-${mealType}`;
      
      docData = {
          ...docData,
          date,
          region,
          mealType,
          type: 'meal',
          scheduleId: scheduleIdForQuery,
          description: description || ''
      };
      
      console.log('--- Meal Upload Data ---');
      console.log('Date:', date);
      console.log('Region:', region);
      console.log('MealType:', mealType);
      console.log('Type:', 'meal');
      console.log('ScheduleId:', scheduleIdForQuery);

    } else if (type === 'schedule') {
      targetCollection = 'gallery';
      if (!scheduleId) {
        return res.status(400).json({ success: false, error: 'scheduleId is required for schedule uploads.' });
      }
      scheduleIdForQuery = scheduleId;
      docData = {
        ...docData,
        scheduleId: scheduleIdForQuery,
        description: description || '',
        date: date || '',
        location: location || '',
        activity: activity || ''
      };
    } else {
      return res.status(400).json({ success: false, error: 'Invalid upload type.' });
    }

    // --- 트랜잭션을 사용하여 점수 계산 및 데이터 저장 ---
    let bonusResult = { points: 0, message: null };
    let newImageId = null;
    
    await runTransaction(db, async (transaction) => {
      // 1. 첫 업로드인지 확인
      const collectionRef = collection(db, targetCollection);
      const q = query(collectionRef, where("scheduleId", "==", scheduleIdForQuery), where("uploadedBy.id", "==", userData.id));
      const userUploadsSnapshot = await getDocs(q);

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
        fileName: fileName || 'unknown',
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
}
