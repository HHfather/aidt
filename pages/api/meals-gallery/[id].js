import { db, storage } from '../../../firebaseConfig';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      // 사용자 인증 정보 확인
      const userDataHeader = req.headers['x-user-data'];
      if (!userDataHeader) {
        return res.status(401).json({ success: false, error: '사용자 인증이 필요합니다.' });
      }

      let userData;
      try {
        userData = JSON.parse(decodeURIComponent(userDataHeader));
      } catch (e) {
        return res.status(400).json({ success: false, error: '잘못된 사용자 데이터입니다.' });
      }

      console.log('DELETE 요청 받음:', { id, userData: '있음' });

      // 이미지 문서 조회
      const imageRef = doc(db, 'meals-gallery', id);
      const imageDoc = await getDoc(imageRef);

      if (!imageDoc.exists()) {
        return res.status(404).json({ success: false, error: '이미지를 찾을 수 없습니다.' });
      }

      const imageData = imageDoc.data();
      console.log('이미지 데이터:', {
        id: imageDoc.id,
        uploadedBy: imageData.uploadedBy,
        storagePath: imageData.storagePath
      });

      // 삭제 권한 확인
      const canDelete = userData.isAdmin || 
                       userData.id === imageData.uploadedBy?.id ||
                       userData.name === imageData.uploadedBy?.name;

      console.log('삭제 권한 확인:', {
        currentUser: userData.name,
        currentUserType: typeof userData.name,
        imageUploader: imageData.uploadedBy?.name,
        isAdminCheck: userData.isAdmin,
        isUploaderCheck: userData.id === imageData.uploadedBy?.id || userData.name === imageData.uploadedBy?.name,
        canDelete
      });

      if (!canDelete) {
        return res.status(403).json({ success: false, error: '삭제 권한이 없습니다.' });
      }

      // Firestore에서 문서 삭제
      console.log('Firestore 문서 삭제 시작...');
      await deleteDoc(imageRef);
      console.log('Firestore 문서 삭제 완료');

      // Storage에서 파일 삭제 (storagePath가 있는 경우)
      if (imageData.storagePath) {
        try {
          console.log('Storage 파일 삭제 시작:', imageData.storagePath);
          const storageRef = ref(storage, imageData.storagePath);
          await deleteObject(storageRef);
          console.log('Storage 파일 삭제 완료');
        } catch (storageError) {
          console.warn('Storage 파일 삭제 실패 (파일이 이미 없을 수 있음):', storageError);
          // Storage 삭제 실패는 치명적이지 않으므로 계속 진행
        }
      } else {
        console.log('Storage 경로가 없어 Storage 삭제 건너뜀');
      }

      console.log('이미지 삭제 완료');
      res.status(200).json({ success: true, message: '이미지가 삭제되었습니다.' });

    } catch (error) {
      console.error('이미지 삭제 중 오류:', error);
      res.status(500).json({ success: false, error: '삭제 중 오류가 발생했습니다.' });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}