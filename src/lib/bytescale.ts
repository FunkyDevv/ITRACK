// Bytescale file upload utility

export const BYTESCALE_API_KEY = 'public_kW2K8ZM7UN9TepPPppiGxNupAcab';
export const BYTESCALE_ACCOUNT_ID = 'kW2K8ZM7UN9TepPPppiGxNupAcab';

export interface BytescaleUploadResponse {
  fileUrl: string;
  fileName: string;
  fileId: string;
  originalFileName: string;
  size: number;
  mime: string;
}

/**
 * Upload a file to Bytescale using the direct API (with fallback for CORS issues)
 */
export const uploadToBytescale = async (
  file: File | Blob,
  fileName: string = `photo-${Date.now()}.jpg`
): Promise<BytescaleUploadResponse> => {
  console.log(`📤 Starting Bytescale upload for ${fileName}`);
  
  try {
    // Convert Blob to File if needed
    const fileToUpload = file instanceof File 
      ? file 
      : new File([file], fileName, { type: file.type || 'image/jpeg' });

    // First, try the Bytescale upload API
    try {
      // Create FormData for the upload
      const formData = new FormData();
      formData.append('file', fileToUpload);

      // Try multiple Bytescale endpoints
      const endpoints = [
        // Try the simpler upload endpoint first
        `https://upcdn.io/${BYTESCALE_ACCOUNT_ID}/raw`,
        // Then try the form data endpoints
        `https://upcdn.io/${BYTESCALE_ACCOUNT_ID}/uploads/form_data`,
        `https://api.bytescale.com/v2/accounts/${BYTESCALE_ACCOUNT_ID}/uploads/form_data`,
        // Alternative endpoints
        `https://api.bytescale.com/v2/accounts/${BYTESCALE_ACCOUNT_ID}/uploads/binary`
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying endpoint: ${endpoint}`);
          
          let requestConfig: RequestInit;
          
          if (endpoint.includes('/raw')) {
            // For raw endpoint, send the file directly
            requestConfig = {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${BYTESCALE_API_KEY}`,
                'Content-Type': fileToUpload.type,
              },
              body: fileToUpload,
            };
          } else {
            // For form data endpoints, use FormData
            requestConfig = {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${BYTESCALE_API_KEY}`,
              },
              body: formData,
            };
          }
          
          const response = await fetch(endpoint, requestConfig);

          if (response.ok) {
            const result = await response.json();
            console.log(`✅ Bytescale upload successful via ${endpoint}:`, result);

            // Handle different response formats
            let fileUrl = result.fileUrl;
            
            if (!fileUrl) {
              if (result.filePath) {
                fileUrl = `https://upcdn.io/${BYTESCALE_ACCOUNT_ID}/raw${result.filePath}`;
              } else if (result.url) {
                fileUrl = result.url;
              } else {
                // Try to construct URL from the endpoint pattern
                const pathSegment = result.id || result.fileName || fileName;
                fileUrl = `https://upcdn.io/${BYTESCALE_ACCOUNT_ID}/raw/${pathSegment}`;
              }
            }
            
            return {
              fileUrl: fileUrl,
              fileName: result.fileName || fileName,
              fileId: result.filePath || result.fileId || result.id,
              originalFileName: result.originalFileName || fileName,
              size: result.size || fileToUpload.size,
              mime: result.mime || fileToUpload.type,
            };
          }
        } catch (endpointError) {
          console.warn(`⚠️ Endpoint ${endpoint} failed:`, endpointError);
          continue;
        }
      }
      
      throw new Error('All Bytescale endpoints failed');
      
    } catch (bytescaleError) {
      console.warn('⚠️ All Bytescale upload endpoints failed, trying Firebase Storage fallback:', bytescaleError);
      
      try {
        // Fallback to Firebase Storage
        const { uploadToFirebaseStorage } = await import('./firebaseStorage');
        const firebaseResult = await uploadToFirebaseStorage(fileToUpload, fileName, 'attendance-photos');
        
        console.log('✅ Firebase Storage fallback successful:', firebaseResult.fileUrl);
        
        return {
          fileUrl: firebaseResult.fileUrl,
          fileName: firebaseResult.fileName,
          fileId: firebaseResult.fileId,
          originalFileName: firebaseResult.originalFileName,
          size: firebaseResult.size,
          mime: firebaseResult.mime,
        };
        
      } catch (firebaseError) {
        console.warn('⚠️ Firebase Storage fallback also failed, using development placeholder:', firebaseError);

        // For development: Convert file to base64 data URL
        const base64DataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(fileToUpload);
        });

        console.log('🔄 Using base64 data URL for development');

        return {
          fileUrl: base64DataUrl,
          fileName: fileName,
          fileId: `dev_${Date.now()}`,
          originalFileName: fileName,
          size: fileToUpload.size,
          mime: fileToUpload.type,
        };
      }
    }

  } catch (error) {
    console.error('❌ Upload completely failed:', error);
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Compress an image to reduce file size
 */
const compressImage = async (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      const newWidth = img.width * ratio;
      const newHeight = img.height * ratio;
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log(`🗜️ Image compressed: ${file.size} → ${compressedFile.size} bytes`);
            resolve(compressedFile);
          } else {
            // Fallback to original file if compression fails
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => {
      // Fallback to original file if image processing fails
      resolve(file);
    };
    
    // Start the image loading process
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Upload a data URL (base64) to Bytescale
 */
export const uploadDataUrlToBytescale = async (
  dataUrl: string,
  fileName: string = `photo-${Date.now()}.jpg`
): Promise<BytescaleUploadResponse> => {
  // Convert data URL to File
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  let file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
  
  // Compress the image if it's larger than 500KB
  if (file.size > 500 * 1024) {
    console.log(`📷 Image is ${Math.round(file.size / 1024)}KB, compressing...`);
    file = await compressImage(file);
  }
  
  return uploadToBytescale(file, fileName);
};

/**
 * Delete a file from Bytescale
 */
export const deleteFromBytescale = async (fileId: string): Promise<void> => {
  const response = await fetch(`https://api.bytescale.com/v2/accounts/kW2K8ZM7UN9TepPPppiGxNupAcab/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${BYTESCALE_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bytescale delete failed: ${response.status} - ${errorText}`);
  }
};

/**
 * Extract file ID from Bytescale URL
 */
export const extractFileIdFromUrl = (bytescaleUrl: string): string | null => {
  try {
    const url = new URL(bytescaleUrl);
    const pathParts = url.pathname.split('/');
    // Bytescale URLs are typically in format: https://upcdn.io/kW2K8ZM7UN9TepPPppiGxNupAcab/raw/{fileId}
    return pathParts[pathParts.length - 1] || null;
  } catch {
    return null;
  }
};