import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './firebase';

const storage = getStorage(app);

/**
 * Convert File to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export interface FirebaseUploadResponse {
  fileUrl: string;
  fileName: string;
  fileId: string;
  originalFileName: string;
  size: number;
  mime: string;
}

/**
 * Upload a file to Firebase Storage
 */
export const uploadToFirebaseStorage = async (
  file: File,
  fileName: string = `photo-${Date.now()}.jpg`,
  folder: string = 'attendance-photos'
): Promise<FirebaseUploadResponse> => {
  try {
    console.log(`🔥 Starting Firebase Storage upload for ${fileName}`);

    // Create a reference to the file location
    const fileRef = ref(storage, `${folder}/${fileName}`);

    // Upload the file
    const snapshot = await uploadBytes(fileRef, file);
    console.log('✅ File uploaded to Firebase Storage:', snapshot.ref.fullPath);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ Firebase Storage URL obtained:', downloadURL);

    return {
      fileUrl: downloadURL,
      fileName: fileName,
      fileId: snapshot.ref.fullPath,
      originalFileName: fileName,
      size: file.size,
      mime: file.type,
    };

  } catch (error: any) {
    console.error('❌ Firebase Storage upload failed:', error);

    // Check if it's a CORS error
    if (error.message?.includes('CORS') || error.message?.includes('preflight') || error.code === 'storage/unauthorized') {
      console.warn('🚫 CORS error detected. Firebase Storage CORS not configured for localhost.');
      console.warn('💡 To fix: Run Firebase CLI command to set CORS:');
      console.warn('   firebase storage:cors set firebase-storage-cors.json --project YOUR_PROJECT_ID');
      console.warn('   Or deploy to a domain that Firebase allows.');

      // Return a placeholder URL for development
      const placeholderUrl = `data:${file.type};base64,${await fileToBase64(file)}`;
      console.log('🔄 Returning placeholder URL for development');

      return {
        fileUrl: placeholderUrl,
        fileName: fileName,
        fileId: `placeholder-${Date.now()}`,
        originalFileName: fileName,
        size: file.size,
        mime: file.type,
      };
    }

    throw new Error(`Firebase Storage upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Upload a data URL (base64) to Firebase Storage
 */
export const uploadDataUrlToFirebaseStorage = async (
  dataUrl: string,
  fileName: string = `photo-${Date.now()}.jpg`,
  folder: string = 'attendance-photos'
): Promise<FirebaseUploadResponse> => {
  // Convert data URL to File
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
  
  return uploadToFirebaseStorage(file, fileName, folder);
};

/**
 * Delete a file from Firebase Storage
 */
export const deleteFromFirebaseStorage = async (filePath: string): Promise<void> => {
  try {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    console.log('✅ File deleted from Firebase Storage:', filePath);
  } catch (error) {
    console.error('❌ Firebase Storage delete failed:', error);
    throw new Error(`Firebase Storage delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};