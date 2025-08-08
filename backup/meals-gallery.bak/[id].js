import { db, storage } from '../../../firebaseConfig';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid or missing image ID.' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // 요청 헤더에서 사용자 정보 파싱 (URL 디코딩 추가)
    const encodedData = req.headers['x-user-data'];
    const userData = JSON.parse(decodeURIComponent(encodedData || '{}'));
    
    if (!userData || !userData.name) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User not logged in.' });
    }

    const docRef = doc(db, 'meals-gallery', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Image not found.' });
    }

    const image = docSnap.data();

    // 권한 확인: 관리자이거나 본인이 업로드한 사진인지 확인 (ID 기준)
    const isAdmin = userData.name === '임환진';
    const isOwner = image.uploadedBy?.id === userData.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to delete this image.' });
    }

    // Firebase Storage에서 파일 삭제
    if (image.storagePath) {
      try {
        const storageRef = ref(storage, image.storagePath);
        await deleteObject(storageRef);
      } catch (storageError) {
        // Storage에 파일이 없더라도 DB 삭제는 진행되도록 경고만 로깅
        console.warn(`Could not delete file from Storage, but proceeding with DB deletion: ${storageError.message}`);
      }
    }

    // Firestore에서 문서 삭제
    await deleteDoc(docRef);
    
    return res.status(200).json({ success: true, message: 'Image deleted successfully.' });

  } catch (error) {
    console.error('Error deleting image:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete image.' });
  }
}
