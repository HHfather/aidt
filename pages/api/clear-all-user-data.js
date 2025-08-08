import { db, storage } from '../../firebaseConfig';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject, listAll } from 'firebase/storage';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    try {
      console.log('사용자 데이터 전체 삭제 시작...');
      
      const deletedData = {
        gallery: 0,
        mealsGallery: 0,
        freeScheduleGallery: 0,
        researchTasks: 0,
        storageFiles: 0,
        errors: []
      };

      // 1. gallery 컬렉션 삭제
      try {
        const galleryQuery = collection(db, 'gallery');
        const gallerySnapshot = await getDocs(galleryQuery);
        
        const galleryDeletePromises = gallerySnapshot.docs.map(async (doc) => {
          try {
            await deleteDoc(doc.ref);
            return { success: true, id: doc.id };
          } catch (error) {
            return { success: false, id: doc.id, error: error.message };
          }
        });
        
        const galleryResults = await Promise.all(galleryDeletePromises);
        deletedData.gallery = galleryResults.filter(r => r.success).length;
        deletedData.errors.push(...galleryResults.filter(r => !r.success).map(r => `Gallery ${r.id}: ${r.error}`));
        
        console.log(`Gallery 삭제 완료: ${deletedData.gallery}개`);
      } catch (error) {
        console.error('Gallery 삭제 오류:', error);
        deletedData.errors.push(`Gallery: ${error.message}`);
      }

      // 2. meals-gallery 컬렉션 삭제
      try {
        const mealsGalleryQuery = collection(db, 'meals-gallery');
        const mealsGallerySnapshot = await getDocs(mealsGalleryQuery);
        
        const mealsGalleryDeletePromises = mealsGallerySnapshot.docs.map(async (doc) => {
          try {
            await deleteDoc(doc.ref);
            return { success: true, id: doc.id };
          } catch (error) {
            return { success: false, id: doc.id, error: error.message };
          }
        });
        
        const mealsGalleryResults = await Promise.all(mealsGalleryDeletePromises);
        deletedData.mealsGallery = mealsGalleryResults.filter(r => r.success).length;
        deletedData.errors.push(...mealsGalleryResults.filter(r => !r.success).map(r => `Meals Gallery ${r.id}: ${r.error}`));
        
        console.log(`Meals Gallery 삭제 완료: ${deletedData.mealsGallery}개`);
      } catch (error) {
        console.error('Meals Gallery 삭제 오류:', error);
        deletedData.errors.push(`Meals Gallery: ${error.message}`);
      }

      // 3. free-schedule-gallery 컬렉션 삭제
      try {
        const freeScheduleGalleryQuery = collection(db, 'free-schedule-gallery');
        const freeScheduleGallerySnapshot = await getDocs(freeScheduleGalleryQuery);
        
        const freeScheduleGalleryDeletePromises = freeScheduleGallerySnapshot.docs.map(async (doc) => {
          try {
            await deleteDoc(doc.ref);
            return { success: true, id: doc.id };
          } catch (error) {
            return { success: false, id: doc.id, error: error.message };
          }
        });
        
        const freeScheduleGalleryResults = await Promise.all(freeScheduleGalleryDeletePromises);
        deletedData.freeScheduleGallery = freeScheduleGalleryResults.filter(r => r.success).length;
        deletedData.errors.push(...freeScheduleGalleryResults.filter(r => !r.success).map(r => `Free Schedule Gallery ${r.id}: ${r.error}`));
        
        console.log(`Free Schedule Gallery 삭제 완료: ${deletedData.freeScheduleGallery}개`);
      } catch (error) {
        console.error('Free Schedule Gallery 삭제 오류:', error);
        deletedData.errors.push(`Free Schedule Gallery: ${error.message}`);
      }

      // 4. researchTasks 컬렉션 삭제
      try {
        const researchTasksQuery = collection(db, 'researchTasks');
        const researchTasksSnapshot = await getDocs(researchTasksQuery);
        
        const researchTasksDeletePromises = researchTasksSnapshot.docs.map(async (doc) => {
          try {
            await deleteDoc(doc.ref);
            return { success: true, id: doc.id };
          } catch (error) {
            return { success: false, id: doc.id, error: error.message };
          }
        });
        
        const researchTasksResults = await Promise.all(researchTasksDeletePromises);
        deletedData.researchTasks = researchTasksResults.filter(r => r.success).length;
        deletedData.errors.push(...researchTasksResults.filter(r => !r.success).map(r => `Research Tasks ${r.id}: ${r.error}`));
        
        console.log(`Research Tasks 삭제 완료: ${deletedData.researchTasks}개`);
      } catch (error) {
        console.error('Research Tasks 삭제 오류:', error);
        deletedData.errors.push(`Research Tasks: ${error.message}`);
      }

      // 5. Firebase Storage 파일들 삭제
      try {
        // 갤러리 관련 폴더들 삭제
        const storageFolders = ['gallery', 'meals-gallery', 'free-schedule-gallery'];
        
        for (const folder of storageFolders) {
          try {
            const folderRef = ref(storage, folder);
            const folderItems = await listAll(folderRef);
            
            const fileDeletePromises = folderItems.items.map(async (item) => {
              try {
                await deleteObject(item);
                return { success: true, path: item.fullPath };
              } catch (error) {
                return { success: false, path: item.fullPath, error: error.message };
              }
            });
            
            const fileResults = await Promise.all(fileDeletePromises);
            deletedData.storageFiles += fileResults.filter(r => r.success).length;
            deletedData.errors.push(...fileResults.filter(r => !r.success).map(r => `Storage ${r.path}: ${r.error}`));
            
            console.log(`${folder} Storage 파일 삭제 완료: ${fileResults.filter(r => r.success).length}개`);
          } catch (folderError) {
            console.error(`${folder} Storage 폴더 삭제 오류:`, folderError);
            deletedData.errors.push(`Storage ${folder}: ${folderError.message}`);
          }
        }
      } catch (error) {
        console.error('Storage 삭제 오류:', error);
        deletedData.errors.push(`Storage: ${error.message}`);
      }

      const totalDeleted = deletedData.gallery + deletedData.mealsGallery + deletedData.freeScheduleGallery + deletedData.researchTasks + deletedData.storageFiles;
      
      console.log('사용자 데이터 삭제 완료:', {
        totalDeleted,
        details: deletedData
      });

      res.status(200).json({
        success: true,
        message: '사용자 데이터 삭제 완료',
        data: {
          totalDeleted,
          details: deletedData
        }
      });

    } catch (error) {
      console.error('사용자 데이터 삭제 중 오류:', error);
      res.status(500).json({
        success: false,
        error: '사용자 데이터 삭제 중 오류가 발생했습니다.',
        details: error.message
      });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 