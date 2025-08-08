/**
 * 이미지 압축 유틸리티
 * 클라이언트 사이드에서 이미지를 4MB 이하로 압축하는 기능
 */

// 이미지 압축 함수
export const compressImage = (file, maxSizeMB = 4, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    // 파일이 이미지가 아닌 경우 원본 반환
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const maxSize = maxSizeMB * 1024 * 1024; // 4MB in bytes
    
    // 파일이 이미 4MB 이하인 경우 압축하지 않음
    if (file.size <= maxSize) {
      resolve(file);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 원본 크기 유지하면서 품질 조정
      canvas.width = img.width;
      canvas.height = img.height;
      
      // 이미지 그리기
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // 압축된 이미지 생성
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('이미지 압축에 실패했습니다.'));
          return;
        }

        // 압축된 파일이 여전히 크다면 더 강하게 압축
        if (blob.size > maxSize) {
          compressImageWithReducedQuality(file, maxSize, quality * 0.7)
            .then(resolve)
            .catch(reject);
        } else {
          // 압축된 파일 생성
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }
      }, file.type, quality);
    };

    img.onerror = () => {
      reject(new Error('이미지 로드에 실패했습니다.'));
    };

    img.src = URL.createObjectURL(file);
  });
};

// 더 강한 압축이 필요한 경우 사용하는 함수
const compressImageWithReducedQuality = (file, maxSize, quality) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      
      // 크기를 점진적으로 줄이면서 압축
      let currentQuality = quality;
      let attempts = 0;
      const maxAttempts = 5;

      const tryCompress = () => {
        // 캔버스 크기 조정
        canvas.width = width;
        canvas.height = height;
        
        // 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('이미지 압축에 실패했습니다.'));
            return;
          }

          if (blob.size <= maxSize || attempts >= maxAttempts) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            // 더 강한 압축 시도
            attempts++;
            currentQuality *= 0.8;
            width *= 0.9;
            height *= 0.9;
            tryCompress();
          }
        }, file.type, currentQuality);
      };

      tryCompress();
    };

    img.onerror = () => {
      reject(new Error('이미지 로드에 실패했습니다.'));
    };

    img.src = URL.createObjectURL(file);
  });
};

// 여러 파일을 압축하는 함수
export const compressImages = async (files, maxSizeMB = 4) => {
  const compressedFiles = [];
  
  for (const file of files) {
    try {
      const compressedFile = await compressImage(file, maxSizeMB);
      compressedFiles.push(compressedFile);
    } catch (error) {
      console.error(`파일 ${file.name} 압축 실패:`, error);
      // 압축 실패 시 원본 파일 사용
      compressedFiles.push(file);
    }
  }
  
  return compressedFiles;
};

// 파일 크기를 사람이 읽기 쉬운 형태로 변환
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
