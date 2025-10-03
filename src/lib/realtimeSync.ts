import { db } from './firebase';
import { doc, updateDoc, onSnapshot, Unsubscribe, collection, query, where } from 'firebase/firestore';

/**
 * Real-time phone number synchronization utility
 * Updates phone numbers across all collections when changed
 */

export interface PhoneUpdateResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Update phone number across all relevant collections
 * This ensures consistency across the entire application
 */
export const updatePhoneNumberRealtime = async (
  userId: string, 
  newPhone: string, 
  userRole: 'supervisor' | 'teacher' | 'intern'
): Promise<PhoneUpdateResult> => {
  console.log(`📞 Updating phone number for ${userRole} ${userId} to: ${newPhone}`);
  
  try {
    const updateData = {
      phone: newPhone,
      updatedAt: new Date()
    };

    // Update based on user role
    switch (userRole) {
      case 'supervisor':
        // Supervisors are stored in users collection
        await updateDoc(doc(db, 'users', userId), updateData);
        break;
        
      case 'teacher':
        // Teachers are stored in both users and teachers collections
        await Promise.all([
          updateDoc(doc(db, 'users', userId), updateData),
          updateDoc(doc(db, 'teachers', userId), updateData)
        ]);
        break;
        
      case 'intern':
        // Interns are stored in both users and interns collections
        await Promise.all([
          updateDoc(doc(db, 'users', userId), updateData),
          updateDoc(doc(db, 'interns', userId), updateData)
        ]);
        break;
    }
    
    console.log(`✅ Phone number updated successfully for ${userRole} ${userId}`);
    return { 
      success: true, 
      message: 'Phone number updated successfully' 
    };
    
  } catch (error) {
    console.error(`❌ Error updating phone number for ${userRole} ${userId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Subscribe to real-time profile updates for a specific user
 * This allows all pages to stay in sync when any profile field changes
 */
export const subscribeToProfileUpdates = (
  userId: string,
  userRole: 'supervisor' | 'teacher' | 'intern',
  onUpdate: (profileData: any) => void
): Unsubscribe => {
  console.log(`📡 Setting up real-time profile subscription for ${userRole} ${userId}`);
  
  // Determine which collection to listen to based on role
  const collectionName = userRole === 'supervisor' ? 'users' : 
                        userRole === 'teacher' ? 'teachers' : 'interns';
  
  const userRef = doc(db, collectionName, userId);
  
  const unsubscribe = onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      console.log(`📞 Real-time profile update for ${userRole} ${userId}:`, data);
      onUpdate(data);
    }
  }, (error) => {
    console.error(`❌ Error in profile subscription for ${userRole} ${userId}:`, error);
  });
  
  return unsubscribe;
};

/**
 * Subscribe to real-time phone number updates for a specific user (legacy)
 * This allows all pages to stay in sync when phone numbers change
 */
export const subscribeToPhoneUpdates = (
  userId: string,
  userRole: 'supervisor' | 'teacher' | 'intern',
  onUpdate: (phone: string) => void
): Unsubscribe => {
  console.log(`📡 Setting up real-time phone subscription for ${userRole} ${userId}`);
  
  // Determine which collection to listen to based on role
  const collectionName = userRole === 'supervisor' ? 'users' : 
                        userRole === 'teacher' ? 'teachers' : 'interns';
  
  const userRef = doc(db, collectionName, userId);
  
  const unsubscribe = onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const phone = data.phone || '';
      console.log(`📞 Real-time phone update for ${userRole} ${userId}: ${phone}`);
      onUpdate(phone);
    }
  }, (error) => {
    console.error(`❌ Error in phone subscription for ${userRole} ${userId}:`, error);
  });
  
  return unsubscribe;
};

/**
 * Subscribe to real-time updates for all interns assigned to a teacher
 * This keeps the teacher's intern list in sync with all profile fields
 */
export const subscribeToTeacherInterns = (
  teacherId: string,
  onUpdate: (interns: Array<{uid: string, [key: string]: any}>) => void
): Unsubscribe => {
  console.log(`📡 Setting up real-time intern subscription for teacher ${teacherId}`);
  
  const internsRef = collection(db, 'interns');
  const q = query(internsRef, where('teacherId', '==', teacherId));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const interns = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        ...data
      };
    });
    
    console.log(`📞 Real-time intern updates for teacher ${teacherId}:`, interns);
    onUpdate(interns);
  }, (error) => {
    console.error(`❌ Error in intern subscription for teacher ${teacherId}:`, error);
  });
  
  return unsubscribe;
};

/**
 * Subscribe to real-time updates for all interns assigned to a teacher (legacy - phone only)
 * This keeps the teacher's intern list in sync
 */
export const subscribeToTeacherInternPhones = (
  teacherId: string,
  onUpdate: (interns: Array<{uid: string, phone: string}>) => void
): Unsubscribe => {
  console.log(`📡 Setting up real-time intern phone subscription for teacher ${teacherId}`);
  
  const internsRef = collection(db, 'interns');
  const q = query(internsRef, where('teacherId', '==', teacherId));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const interns = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        phone: data.phone || ''
      };
    });
    
    console.log(`📞 Real-time intern phone updates for teacher ${teacherId}:`, interns);
    onUpdate(interns);
  }, (error) => {
    console.error(`❌ Error in intern phone subscription for teacher ${teacherId}:`, error);
  });
  
  return unsubscribe;
};

/**
 * Subscribe to real-time updates for all interns in the system (supervisor view)
 * This keeps the supervisor's intern overview in sync with all profile fields
 */
export const subscribeToAllInterns = (
  onUpdate: (interns: Array<{uid: string, [key: string]: any}>) => void
): Unsubscribe => {
  console.log(`📡 Setting up real-time all intern subscription`);
  
  const internsRef = collection(db, 'interns');
  const q = query(internsRef);
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const interns = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        ...data
      };
    });
    
    console.log(`📞 Real-time all intern updates:`, interns);
    onUpdate(interns);
  }, (error) => {
    console.error(`❌ Error in all intern subscription:`, error);
  });
  
  return unsubscribe;
};

/**
 * Subscribe to real-time updates for all interns in the system (supervisor view) - legacy phone only
 * This keeps the supervisor's intern overview in sync
 */
export const subscribeToAllInternPhones = (
  onUpdate: (interns: Array<{uid: string, phone: string, teacherId: string}>) => void
): Unsubscribe => {
  console.log(`📡 Setting up real-time all intern phone subscription`);
  
  const internsRef = collection(db, 'interns');
  const q = query(internsRef);
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const interns = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        phone: data.phone || '',
        teacherId: data.teacherId || ''
      };
    });
    
    console.log(`📞 Real-time all intern phone updates:`, interns);
    onUpdate(interns);
  }, (error) => {
    console.error(`❌ Error in all intern phone subscription:`, error);
  });
  
  return unsubscribe;
};

/**
 * Subscribe to real-time updates for all teachers (supervisor view)
 * This keeps the supervisor's teacher list in sync with all profile fields
 */
export const subscribeToAllTeachers = (
  onUpdate: (teachers: Array<{uid: string, [key: string]: any}>) => void
): Unsubscribe => {
  console.log(`📡 Setting up real-time all teacher subscription`);
  
  const teachersRef = collection(db, 'teachers');
  const q = query(teachersRef);
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const teachers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        ...data
      };
    });
    
    console.log(`📞 Real-time all teacher updates:`, teachers);
    onUpdate(teachers);
  }, (error) => {
    console.error(`❌ Error in all teacher subscription:`, error);
  });
  
  return unsubscribe;
};

/**
 * Subscribe to real-time updates for all teachers (supervisor view) - legacy phone only
 * This keeps the supervisor's teacher list in sync
 */
export const subscribeToAllTeacherPhones = (
  onUpdate: (teachers: Array<{uid: string, phone: string}>) => void
): Unsubscribe => {
  console.log(`📡 Setting up real-time all teacher phone subscription`);
  
  const teachersRef = collection(db, 'teachers');
  const q = query(teachersRef);
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const teachers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        phone: data.phone || ''
      };
    });
    
    console.log(`📞 Real-time all teacher phone updates:`, teachers);
    onUpdate(teachers);
  }, (error) => {
    console.error(`❌ Error in all teacher phone subscription:`, error);
  });
  
  return unsubscribe;
};
