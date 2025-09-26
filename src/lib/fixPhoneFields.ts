// Fix specific intern records that are missing phone fields
import { db } from './firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export const fixMissingPhoneFields = async (internUid: string) => {
  console.log(`🔧 Fixing missing phone field for intern: ${internUid}`);
  
  try {
    // Update interns collection
    const internRef = doc(db, 'interns', internUid);
    const internDoc = await getDoc(internRef);
    
    if (internDoc.exists()) {
      const data = internDoc.data();
      if (!data.phone) {
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
      if (!data.phone) {
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