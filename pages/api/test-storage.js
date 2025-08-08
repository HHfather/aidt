import { storage } from '../../firebaseConfig'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '허용되지 않는 메서드입니다.' })
  }

  try {
    // 테스트용 작은 파일 생성
    const testData = 'Hello Firebase Storage Test'
    const testBuffer = Buffer.from(testData, 'utf8')
    
    // 테스트 파일 경로
    const testFileName = `test-${Date.now()}.txt`
    const storageRef = ref(storage, `test/${testFileName}`)
    
    console.log('Firebase Storage 테스트 시작...')
    
    // 1. 업로드 테스트
    console.log('1. 업로드 테스트...')
    const uploadResult = await uploadBytes(storageRef, testBuffer, {
      contentType: 'text/plain',
      customMetadata: {
        'test': 'true',
        'timestamp': new Date().toISOString()
      }
    })
    console.log('업로드 성공:', uploadResult.metadata.name)
    
    // 2. 다운로드 URL 테스트
    console.log('2. 다운로드 URL 테스트...')
    const downloadURL = await getDownloadURL(storageRef)
    console.log('다운로드 URL 생성 성공:', downloadURL)
    
    // 3. 파일 삭제 테스트
    console.log('3. 파일 삭제 테스트...')
    await deleteObject(storageRef)
    console.log('파일 삭제 성공')
    
    return res.status(200).json({
      success: true,
      message: 'Firebase Storage 권한 테스트 성공',
      data: {
        uploadedFile: uploadResult.metadata.name,
        downloadURL: downloadURL,
        deleted: true
      }
    })
    
  } catch (error) {
    console.error('Firebase Storage 테스트 오류:', error)
    console.error('오류 상세 정보:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    let errorMessage = 'Firebase Storage 테스트 실패'
    
    if (error.code === 'storage/unauthorized') {
      errorMessage = 'Firebase Storage 권한이 없습니다. Firebase Console에서 Storage 규칙을 확인해주세요.'
    } else if (error.code === 'storage/quota-exceeded') {
      errorMessage = 'Firebase Storage 용량이 초과되었습니다.'
    } else if (error.code === 'storage/bucket-not-found') {
      errorMessage = 'Firebase Storage 버킷을 찾을 수 없습니다. Firebase 설정을 확인해주세요.'
    } else if (error.code === 'storage/project-not-found') {
      errorMessage = 'Firebase 프로젝트를 찾을 수 없습니다. Firebase 설정을 확인해주세요.'
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: {
        code: error.code,
        message: error.message,
        stack: error.stack
      }
    })
  }
} 