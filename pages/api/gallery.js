import { db, storage } from '../../firebaseConfig';
import { collection, addDoc, getDocs, getDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { scheduleId } = req.query;
      
      console.log('Gallery GET request for scheduleId:', scheduleId);
      console.log('Full query params:', req.query);
      
      if (!scheduleId) {
        console.error('scheduleId가 없습니다. 전체 쿼리:', req.query);
        return res.status(400).json({ success: false, error: 'scheduleId가 필요합니다.' });
      }

      const q = query(
        collection(db, 'gallery'),
        where('scheduleId', '==', scheduleId)
      );
      
      const snapshot = await getDocs(q);
      const images = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Timestamp 객체를 문자열로 변환
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
          uploadedAt: data.uploadedAt?.toDate ? data.uploadedAt.toDate().toISOString() : data.uploadedAt
        };
      });

      // 클라이언트 측에서 정렬 (최신순)
      images.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.uploadedAt || 0);
        const dateB = new Date(b.createdAt || b.uploadedAt || 0);
        return dateB - dateA; // 최신순
      });

      console.log('Found images:', images.length);
      console.log('Images data:', images);
      res.status(200).json({ success: true, data: images });
    } catch (error) {
      console.error('갤러리 조회 오류:', error);
      res.status(500).json({ success: false, error: '갤러리 조회 중 오류가 발생했습니다.' });
    }
  } else if (req.method === 'POST') {
    try {
      const { scheduleId, date, location, activity, imageUrl, uploadedBy, emoji } = req.body;
      
      if (!scheduleId || !imageUrl || !uploadedBy) {
        return res.status(400).json({ success: false, error: '필수 정보가 누락되었습니다.' });
      }

      const imageData = {
        scheduleId,
        date,
        location,
        activity,
        imageUrl,
        uploadedBy,
        emoji: emoji || '', // 게시글 이모지 추가
        uploadedAt: new Date().toISOString(),
        likes: 0,
        comments: []
      };

      const docRef = await addDoc(collection(db, 'gallery'), imageData);
      
      res.status(200).json({ 
        success: true, 
        data: { id: docRef.id, ...imageData }
      });
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      res.status(500).json({ success: false, error: '이미지 업로드 중 오류가 발생했습니다.' });
    }
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

      const docRef = doc(db, 'gallery', id);
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
        console.log('userData 파싱 성공:', currentUser);
      } catch (parseError) {
        console.error('userData 파싱 실패:', parseError, 'userData:', userData);
        return res.status(400).json({ success: false, error: '사용자 정보 파싱에 실패했습니다.' });
      }

      console.log('삭제 요청 정보:', {
        imageId: id,
        currentUser: currentUser,
        imageData: {
          id: imageData.id,
          uploadedBy: imageData.uploadedBy,
          storagePath: imageData.storagePath
        }
      });

      // 삭제 권한 확인 (업로더 또는 '임환진'만 삭제 가능)
      const canDelete = currentUser && (
        currentUser.name === '임환진' || 
        (imageData.uploadedBy && imageData.uploadedBy.name === currentUser.name)
      );

      console.log('삭제 권한 확인:', {
        currentUser: currentUser?.name,
        currentUserName: currentUser?.name,
        currentUserType: typeof currentUser?.name,
        imageUploader: imageData.uploadedBy?.name,
        isAdminCheck: currentUser?.name === '임환진',
        isUploaderCheck: imageData.uploadedBy && imageData.uploadedBy.name === currentUser?.name,
        canDelete: canDelete
      });

      if (!canDelete) {
        console.error('삭제 권한 없음:', {
          currentUser: currentUser?.name,
          imageUploader: imageData.uploadedBy?.name
        });
        return res.status(403).json({
          success: false,
          error: '삭제 권한이 없습니다. 업로더 또는 관리자만 삭제할 수 있습니다.'
        });
      }

      console.log('Firestore 문서 삭제 시작...');
      // Firestore 문서 삭제
      await deleteDoc(docRef);
      console.log('Firestore 문서 삭제 완료');

      // Firebase Storage 파일 삭제 (storagePath가 있는 경우)
      if (imageData.storagePath) {
        try {
          console.log('Storage 파일 삭제 시작:', imageData.storagePath);
          const storageRef = ref(storage, imageData.storagePath);
          await deleteObject(storageRef);
          console.log('Storage 파일 삭제 완료');
        } catch (storageError) {
          console.warn('Storage 파일 삭제 실패:', storageError);
        }
      } else {
        console.log('Storage 경로가 없어 Storage 삭제 건너뜀');
      }
      
      console.log('이미지 삭제 완료');
      res.status(200).json({ success: true, message: '이미지가 삭제되었습니다.' });
    } catch (error) {
      console.error('이미지 삭제 오류:', error);
      res.status(500).json({ success: false, error: '이미지 삭제 중 오류가 발생했습니다.' });
    }
  } else {
    res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' });
  }
} 