import { db, storage } from '../../firebaseConfig';
import { collection, addDoc, getDocs, getDoc, deleteDoc, doc, query, where, orderBy, limit } from 'firebase/firestore';
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
        const { scheduleId, limit: limitParam = 20 } = req.query;
        const limitCount = parseInt(limitParam);
        
        console.log('Schedule gallery GET request for scheduleId:', scheduleId);
        
        if (!scheduleId) {
          return res.status(400).json({ success: false, error: 'scheduleId가 필요합니다.' });
        }

        const q = query(
          collection(db, 'schedule-gallery'),
          where('scheduleId', '==', scheduleId),
          orderBy('uploadedAt', 'desc'),
          limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        const images = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log('Found schedule gallery images:', images.length);
        res.status(200).json({ success: true, photos: images });
      } catch (error) {
        console.error('일정 갤러리 조회 오류:', error);
        res.status(500).json({ success: false, error: '일정 갤러리 조회 중 오류가 발생했습니다.' });
      }
      resolve();
    } else if (req.method === 'POST') {
      const form = new IncomingForm();

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          res.status(500).json({ success: false, error: 'Form parsing error' });
          return resolve();
        }

        try {
          const uploadedFile = Array.isArray(files.image) ? files.image[0] : files.image;
          if (!uploadedFile) {
            res.status(400).json({ success: false, error: 'File not provided.' });
            return resolve();
          }

          const userData = JSON.parse(getField(fields, 'userData') || '{}');
          const scheduleId = getField(fields, 'scheduleId');
          const scheduleTitle = getField(fields, 'scheduleTitle');
          const scheduleDate = getField(fields, 'scheduleDate');
          
          if (!userData || !userData.id) {
            res.status(400).json({ success: false, error: 'User data not provided or invalid.' });
            return resolve();
          }

          if (!scheduleId) {
            res.status(400).json({ success: false, error: 'Schedule ID not provided.' });
            return resolve();
          }
          
          const fileContent = fs.readFileSync(uploadedFile.filepath);
          const uniqueFileName = `${Date.now()}_${uploadedFile.originalFilename}`;
          const storageRef = ref(storage, `schedule-gallery/${uniqueFileName}`);

          await uploadBytes(storageRef, fileContent);
          const downloadURL = await getDownloadURL(storageRef);

          const newImageData = {
            scheduleId,
            scheduleTitle,
            scheduleDate,
            imageUrl: downloadURL,
            fileName: uniqueFileName,
            uploadedBy: {
              id: userData.id,
              name: userData.name,
              region: userData.region,
            },
            uploadedAt: new Date().toISOString(),
            type: 'schedule',
            emojis: {},
            comments: [],
            description: getField(fields, 'description') || '',
          };

          const docRef = await addDoc(collection(db, "schedule-gallery"), newImageData);
          
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

        const docRef = doc(db, 'schedule-gallery', id);
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
            const storageRef = ref(storage, `schedule-gallery/${imageData.fileName}`);
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



