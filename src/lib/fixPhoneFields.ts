// Fix intern records that are missing phone fields
import { db } from './firebase';
import { doc, updateDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

// Fix specific intern record
export const fixMissingPhoneFields = async (internUid: string) => {
  console.log(`🔧 Fixing missing phone field for intern: ${internUid}`);
  
  try {
    // Update interns collection
    const internRef = doc(db, 'interns', internUid);
    const internDoc = await getDoc(internRef);
    
    if (internDoc.exists()) {
      const data = internDoc.data();
      if (!data.phone || data.phone === undefined || data.phone === null) {
        await updateDoc(internRef, { phone: "" });
        console.log(`✅ Added phone field to intern ${internUid}`);
      } else {
        console.log(`ℹ️ Intern ${internUid} already has phone field: "${data.phone}"`);
      }
    }
    
    // Update users collection
    const userRef = doc(db, 'users', internUid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (!data.phone || data.phone === undefined || data.phone === null) {
        await updateDoc(userRef, { phone: "" });
        console.log(`✅ Added phone field to user ${internUid}`);
      } else {
        console.log(`ℹ️ User ${internUid} already has phone field: "${data.phone}"`);
      }
    }
    
    return { success: true, message: `Phone field fixed for ${internUid}` };
    
  } catch (error) {
    console.error(`❌ Error fixing phone field for ${internUid}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Fix all interns missing phone fields
export const fixAllMissingPhoneFields = async () => {
  console.log('🔧 Starting bulk fix for all interns missing phone fields...');
  
  try {
    // Get all interns
    const internsQuery = query(collection(db, 'interns'));
    const internsSnapshot = await getDocs(internsQuery);
    
    let fixedCount = 0;
    let totalCount = internsSnapshot.size;
    
    for (const internDoc of internsSnapshot.docs) {
      const data = internDoc.data();
      const internUid = internDoc.id;
      
      // Check if phone field is missing or empty
      if (!data.phone || data.phone === undefined || data.phone === null) {
        console.log(`📞 Found intern without phone: ${data.firstName} ${data.lastName} (${internUid})`);
        
        // Fix this intern
        await fixMissingPhoneFields(internUid);
        fixedCount++;
      }
    }
    
    console.log(`✅ Bulk fix completed: ${fixedCount}/${totalCount} interns updated`);
    return { 
      success: true, 
      message: `Fixed ${fixedCount} out of ${totalCount} intern records`,
      fixedCount,
      totalCount 
    };
    
  } catch (error) {
    console.error('❌ Error during bulk phone field fix:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Update specific intern's phone number
export const updateInternPhoneNumber = async (internUid: string, phoneNumber: string) => {
  console.log(`📞 Updating phone number for intern: ${internUid} to: ${phoneNumber}`);
  
  try {
    // Update interns collection
    const internRef = doc(db, 'interns', internUid);
    await updateDoc(internRef, { 
      phone: phoneNumber,
      updatedAt: new Date()
    });
    
    // Update users collection
    const userRef = doc(db, 'users', internUid);
    await updateDoc(userRef, { 
      phone: phoneNumber,
      updatedAt: new Date()
    });
    
    console.log(`✅ Phone number updated for ${internUid}`);
    return { success: true, message: 'Phone number updated successfully' };
    
  } catch (error) {
    console.error(`❌ Error updating phone number for ${internUid}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};