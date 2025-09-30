// Migration script to add phone numbers to existing user profiles
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export const migrateUsersToIncludePhone = async () => {
  console.log('🔄 Starting phone number migration...');
  
  try {
    // Get all users from both users and interns collections
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const internsSnapshot = await getDocs(collection(db, 'interns'));
    const teachersSnapshot = await getDocs(collection(db, 'teachers'));
    
    let updatedCount = 0;
    
    // Update users collection
    for (const docSnapshot of usersSnapshot.docs) {
      const userData = docSnapshot.data();
      if (!userData.phone) {
        await updateDoc(doc(db, 'users', docSnapshot.id), {
          phone: '' // Default empty phone number
        });
        updatedCount++;
        console.log(`📱 Updated user ${docSnapshot.id} with empty phone field`);
      }
    }
    
    // Update interns collection 
    for (const docSnapshot of internsSnapshot.docs) {
      const internData = docSnapshot.data();
      if (!internData.phone) {
        await updateDoc(doc(db, 'interns', docSnapshot.id), {
          phone: '' // Default empty phone number
        });
        updatedCount++;
        console.log(`📱 Updated intern ${docSnapshot.id} with empty phone field`);
      }
    }
    
    // Update teachers collection
    for (const docSnapshot of teachersSnapshot.docs) {
      const teacherData = docSnapshot.data();
      if (!teacherData.phone) {
        await updateDoc(doc(db, 'teachers', docSnapshot.id), {
          phone: '' // Default empty phone number  
        });
        updatedCount++;
        console.log(`📱 Updated teacher ${docSnapshot.id} with empty phone field`);
      }
    }
    
    console.log(`✅ Migration completed! Updated ${updatedCount} documents`);
    return { success: true, updatedCount };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error };
  }
};

// Function to validate Bytescale integration
export const testBytescaleUpload = async () => {
  console.log('🧪 Testing Bytescale integration...');
  
  try {
    // Create a simple test blob
    const testContent = 'This is a test file for Bytescale integration';
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    
    const { uploadToBytescale } = await import('./bytescale');
    
    const result = await uploadToBytescale(testBlob, 'test-file.txt');
    
    console.log('✅ Bytescale upload test successful:', result);
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ Bytescale upload test failed:', error);
    return { success: false, error };
  }
};