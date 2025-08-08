import { db, storage } from '../../firebaseConfig';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    try {
      console.log('갤러리 전체 삭제 시작...');
      
      // 모든 갤러리 이미지 가져오기
      const galleryQuery = collection(db, 'gallery');
      const gallerySnapshot = await getDocs(galleryQuery);
      
      const images = gallerySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`삭제할 이미지 개수: ${images.length}`);
      
      // 각 이미지 삭제
      const deletePromises = images.map(async (image) => {
        try {
          // Firestore 문서 삭제
          await deleteDoc(doc(db, 'gallery', image.id));
          
          // Firebase Storage 파일 삭제 (storagePath가 있는 경우)
          if (image.storagePath) {
            try {
              const storageRef = ref(storage, image.storagePath);
              await deleteObject(storageRef);
              console.log(`Storage 파일 삭제 성공: ${image.storagePath}`);
            } catch (storageError) {
              console.warn(`Storage 파일 삭제 실패: ${image.storagePath}`, storageError);
              // Storage 삭제 실패해도 Firestore는 삭제됨
            }
          }
          
          return { success: true, id: image.id };
        } catch (error) {
          console.error(`이미지 삭제 실패: ${image.id}`, error);
          return { success: false, id: image.id, error: error.message };
        }
      });
      
      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      console.log(`갤러리 전체 삭제 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
      
      res.status(200).json({ 
        success: true, 
        message: `갤러리 전체 삭제 완료: 성공 ${successCount}개, 실패 ${failCount}개`,
        deletedCount: successCount,
        failedCount: failCount
      });
    } catch (error) {
      console.error('갤러리 전체 삭제 오류:', error);
      res.status(500).json({ success: false, error: '갤러리 전체 삭제 중 오류가 발생했습니다.' });
    }
  } else {
    res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' });
  }
} 