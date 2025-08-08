import { db, storage } from '../../firebaseConfig';
import { collection, addDoc, getDocs, getDoc, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const getField = (fields, fieldName) => {
  const value = fields[fieldName];
  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }
  return value || null;
};

export default function handler(req, res) {
  return new Promise(async (resolve, reject) => {
    if (req.method === 'GET') {
      try {
        const { limit: limitParam = 20 } = req.query;
        const limitCount = parseInt(limitParam);
        
        console.log('Unified meals gallery GET request with limit:', limitCount);
        
        // 모든 식사 갤러리 사진들을 가져옴
        const q = query(
          collection(db, 'unified-meals-gallery'),
          orderBy('uploadedAt', 'desc'),
          limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        const images = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log('Found unified meals gallery images:', images.length);
        res.status(200).json({ success: true, photos: images });
      } catch (error) {
        console.error('통합 식사 갤러리 조회 오류:', error);
        res.status(500).json({ success: false, error: '통합 식사 갤러리 조회 중 오류가 발생했습니다.' });
      }
      resolve();
    } else if (req.method === 'POST') {
      const form = new IncomingForm({
        maxFileSize: 10 * 1024 * 1024, // 10MB로 증가
        maxFields: 20, // 필드 수 증가
        allowEmptyFiles: false,
        keepExtensions: true,
        multiples: true, // 다중 파일 지원
      });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          res.status(500).json({ success: false, error: `Form parsing error: ${err.message}` });
          return resolve();
        }

        try {
          const uploadedFile = Array.isArray(files.image) ? files.image[0] : files.image;
          if (!uploadedFile) {
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

          const userDataString = getField(fields, 'userData');
          let userData;
          try {
            userData = JSON.parse(userDataString || '{}');
          } catch (parseError) {
            console.error('[ERROR] Failed to parse userData:', parseError);
            res.status(400).json({ success: false, error: 'Invalid user data format.' });
            return resolve();
          }
          
          const mealType = getField(fields, 'mealType'); // 아침, 점심, 저녁
          const mealDate = getField(fields, 'mealDate');
          const location = getField(fields, 'location');
          
          if (!userData || !userData.id) {
            res.status(400).json({ success: false, error: 'User data not provided or invalid.' });
            return resolve();
          }
          
          const fileContent = fs.readFileSync(uploadedFile.filepath);
          const uniqueFileName = `${Date.now()}_${uploadedFile.originalFilename}`;
          const storageRef = ref(storage, `unified-meals-gallery/${uniqueFileName}`);

          await uploadBytes(storageRef, fileContent);
          const downloadURL = await getDownloadURL(storageRef);

          const newImageData = {
            mealType: mealType || '기타',
            mealDate: mealDate || new Date().toISOString().split('T')[0],
            location: location || '',
            imageUrl: downloadURL,
            fileName: uniqueFileName,
            uploadedBy: {
              id: userData.id,
              name: userData.name,
              region: userData.region,
            },
            uploadedAt: new Date().toISOString(),
            type: 'unified-meals',
            emojis: {},
            comments: [],
            description: getField(fields, 'description') || '',
          };

          const docRef = await addDoc(collection(db, "unified-meals-gallery"), newImageData);
          
          res.status(200).json({ 
            success: true, 
            message: 'Image uploaded successfully', 
            data: { id: docRef.id, ...newImageData } 
          });
          resolve();

        } catch (error) {
          console.error('Error processing file upload:', error);
          res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
          resolve();
        }
      });
    } else if (req.method === 'DELETE') {
      try {
        const { id, userData } = req.query;
        
        console.log('DELETE 요청 받음:', { id, userData: userData ? '있음' : '없음' });
        
        if (!id) {
          console.error('이미지 ID가 없습니다.');
          return res.status(400).json({ success: false, error: '이미지 ID가 필요합니다.' });
        }

        if (!userData) {
          console.error('userData가 없습니다.');
          return res.status(400).json({ success: false, error: '사용자 정보가 필요합니다.' });
        }

        const docRef = doc(db, 'unified-meals-gallery', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          console.error('이미지를 찾을 수 없습니다:', id);
          return res.status(404).json({
            success: false,
            error: '이미지를 찾을 수 없습니다.'
          });
        }

        const imageData = docSnap.data();
        let currentUser = null;

        try {
          currentUser = JSON.parse(userData);
        } catch (e) {
          console.error('userData 파싱 오류:', e);
          return res.status(400).json({ success: false, error: '사용자 정보 파싱 오류' });
        }

        // 권한 확인 (업로더 또는 관리자만 삭제 가능)
        if (imageData.uploadedBy?.id !== currentUser.id && currentUser.role !== 'admin') {
          return res.status(403).json({ success: false, error: '삭제 권한이 없습니다.' });
        }

        // Storage에서 파일 삭제
        if (imageData.fileName) {
          try {
            const storageRef = ref(storage, `unified-meals-gallery/${imageData.fileName}`);
            await deleteObject(storageRef);
            console.log('Storage 파일 삭제 완료:', imageData.fileName);
          } catch (storageError) {
            console.error('Storage 파일 삭제 실패:', storageError);
            // Storage 삭제 실패해도 Firestore는 삭제 진행
          }
        }

        // Firestore에서 문서 삭제
        await deleteDoc(docRef);
        console.log('Firestore 문서 삭제 완료:', id);

        res.status(200).json({ success: true, message: '이미지가 성공적으로 삭제되었습니다.' });
        resolve();

      } catch (error) {
        console.error('이미지 삭제 오류:', error);
        res.status(500).json({ success: false, error: '이미지 삭제 중 오류가 발생했습니다.' });
        resolve();
      }
    } else {
      res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' });
      resolve();
    }
  });
}





