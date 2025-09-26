import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  writeBatch,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { deleteFromBytescale, extractFileIdFromUrl } from "./bytescale";

const firebaseConfig = {
  apiKey: "AIzaSyB6O45ISBuhi9wBE2PNVrNPV05W8w57j2U",
  authDomain: "ipack-ddfcd.firebaseapp.com",
  projectId: "ipack-ddfcd",
  storageBucket: "ipack-ddfcd.firebasestorage.app",
  messagingSenderId: "234216750391",
  appId: "1:234216750391:web:050a919265d6ac248deeb2",
  measurementId: "G-36HL01Z0TS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
// Firebase Storage available as fallback when Bytescale fails

// User types
export interface UserData {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "supervisor" | "teacher" | "intern";
  teacherId?: string;
  password?: string;
  company?: string;
  acceptedTerms?: boolean;
  // Scheduled work hours for interns
  scheduledTimeIn?: string; // e.g., "09:00"
  scheduledTimeOut?: string; // e.g., "17:00"
  phone?: string; // Phone number field
}

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "supervisor" | "teacher" | "intern";
  teacherId?: string;
  company?: string;
  phone?: string;
  acceptedTerms?: boolean;
  scheduledTimeIn?: string;
  scheduledTimeOut?: string;
}

export interface AttendanceRecord {
  id?: string;
  internId: string;
  teacherId: string;
  clockIn: Timestamp;
  clockOut?: Timestamp;
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  photoUrl: string;
  timeOutPhotoUrl?: string; // Photo taken during time-out
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  // Scheduled times set by supervisor
  scheduledTimeIn?: string; // e.g., "09:00"
  scheduledTimeOut?: string; // e.g., "17:00"
  isLate?: boolean; // calculated field
  isEarly?: boolean; // calculated field for early time-out
}

// Authentication functions
export const registerUser = async (userData: Omit<UserData, 'uid'>) => {
  // Store current user to restore later
  const currentUser = auth.currentUser;
  
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    userData.email,
    userData.password || "defaultPassword123"
  );
  const user = userCredential.user;

  const userDocData = {
    uid: user.uid,
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: userData.role,
    ...(userData.teacherId && { teacherId: userData.teacherId }),
  };

  await setDoc(doc(db, "users", user.uid), userDocData);
  
  // Sign out the newly created user and restore the original user
  await signOut(auth);
  
  // If there was a current user, sign them back in
  if (currentUser && currentUser.email) {
    // Note: This is a workaround. In a real app, you'd use Firebase Admin SDK on the server
    console.log("🔄 Restoring original user session...");
    // The user will need to be signed back in manually or we need to implement server-side user creation
  }
  
  return { user, userData: userDocData };
};

export const loginUser = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const loginWithEmailAndPassword = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmailAndPassword = async (email: string, password: string, userData: { firstName: string; lastName: string; role: "supervisor" | "teacher" | "intern"; teacherId?: string; company?: string }) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const userDocData = {
    uid: user.uid,
    email: email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: userData.role,
    ...(userData.teacherId && { teacherId: userData.teacherId }),
    ...(userData.company && { company: userData.company }),
  };

  await setDoc(doc(db, "users", user.uid), userDocData);
  return { user, userData: userDocData };
};

export const logoutUser = async () => {
  return await signOut(auth);
};

export const getUserData = async (uid: string): Promise<UserData | null> => {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data() as UserData;
  }
  return null;
};

export const getUserProfile = async (firebaseUser: User): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      return {
        uid: userData.uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        teacherId: userData.teacherId,
        company: userData.company || "Demo Company",
        acceptedTerms: (userData as any).acceptedTerms || false,
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

export const setAcceptedTerms = async (uid: string, accepted: boolean) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      acceptedTerms: accepted,
      updatedAt: serverTimestamp(),
    } as any);
    return true;
  } catch (error) {
    console.error("Error setting acceptedTerms:", error);
    return false;
  }
};

export const onAuthStateChange = (callback: (user: User | null) => void): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};

// Get users by role
export const getUsersByRole = async (role: "supervisor" | "teacher" | "intern"): Promise<UserProfile[]> => {
  try {
    const usersQuery = query(
      collection(db, "users"),
      where("role", "==", role)
    );
    
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      email: doc.data().email,
      firstName: doc.data().firstName,
      lastName: doc.data().lastName,
      role: doc.data().role,
      teacherId: doc.data().teacherId,
      company: doc.data().company
    } as UserProfile));
  } catch (error) {
    console.error("❌ Error getting users by role:", error);
    throw error;
  }
};

// Get teachers
export const getTeachers = async () => {
  const teachersQuery = query(
    collection(db, "users"),
    where("role", "==", "teacher")
  );
  const snapshot = await getDocs(teachersQuery);
  return snapshot.docs.map(docSnapshot => ({
    id: docSnapshot.id,
    ...docSnapshot.data()
  })) as (UserData & { id: string })[];
};

// Get interns for a teacher
export const getInternsForTeacher = async (teacherId: string): Promise<InternProfile[]> => {
  console.log('🔍 Fetching interns for teacher:', teacherId);
  
  // Try querying from interns collection first (more efficient with your indexes)
  try {
    const internsQuery = query(
      collection(db, "interns"),
      where("teacherId", "==", teacherId)
    );
    const snapshot = await getDocs(internsQuery);
    console.log('📊 Query snapshot size:', snapshot.size);
    
    const interns = snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      console.log('👤 Intern document:', docSnapshot.id, data);
      return {
        id: docSnapshot.id,
        uid: data.uid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "intern" as const,
        teacherId: data.teacherId,
        phone: data.phone,
        scheduledTimeIn: data.scheduledTimeIn,
        scheduledTimeOut: data.scheduledTimeOut,
        location: data.location,
        createdAt: data.createdAt ? (
          data.createdAt.toDate ? data.createdAt.toDate() : 
          data.createdAt instanceof Date ? data.createdAt :
          new Date(data.createdAt)
        ) : undefined
      };
    }) as InternProfile[];
    
    console.log('✅ Found', interns.length, 'interns in interns collection');
    return interns;
  } catch (error) {
    console.log('❌ Error querying interns collection, falling back to users collection:', error);
    
    // Fallback to users collection
    const usersQuery = query(
      collection(db, "users"),
      where("role", "==", "intern"),
      where("teacherId", "==", teacherId)
    );
    const snapshot = await getDocs(usersQuery);
    const interns = snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        uid: data.uid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "intern" as const,
        teacherId: data.teacherId,
        phone: data.phone,
        scheduledTimeIn: data.scheduledTimeIn,
        scheduledTimeOut: data.scheduledTimeOut,
        location: data.location,
        createdAt: data.createdAt ? (
          data.createdAt.toDate ? data.createdAt.toDate() : 
          data.createdAt instanceof Date ? data.createdAt :
          new Date(data.createdAt)
        ) : undefined
      };
    }) as InternProfile[];
    
    console.log('✅ Found', interns.length, 'interns in users collection (fallback)');
    return interns;
  }
};

// Create attendance record with UNIQUE ID (not deterministic)
export const createAttendanceRecord = async (attendanceData: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date();

  const attendanceRecord: Omit<AttendanceRecord, 'id'> = {
    ...attendanceData,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now)
  };

  console.log("📝 Creating NEW attendance record (unique ID):", attendanceRecord);
  
  // Use addDoc to create a UNIQUE document ID every time
  const docRef = await addDoc(collection(db, "attendance"), attendanceRecord);
  
  console.log("✅ Created attendance record with unique ID:", docRef.id);
  return docRef.id;
};

// Delete photo from Bytescale given its URL
export const deletePhotoFromStorage = async (photoUrl: string) => {
  try {
    // Extract file ID from Bytescale URL
    const fileId = extractFileIdFromUrl(photoUrl);
    if (!fileId) {
      console.warn("⚠️ Could not extract file ID from URL:", photoUrl);
      return;
    }
    
    await deleteFromBytescale(fileId);
    console.log("✅ Photo deleted from Bytescale:", photoUrl);
  } catch (error) {
    console.error("❌ Error deleting photo from Bytescale:", error);
  }
};

// Update attendance time out
export const updateAttendanceTimeOut = async (
  attendanceId: string, 
  clockOut: Date, 
  timeOutPhotoUrl: string | null, 
  isEarly?: boolean
) => {
  console.log("🕐 Updating time out for attendance:", attendanceId, "clockOut:", clockOut, "photo:", timeOutPhotoUrl, "isEarly:", isEarly);
  
  const attendanceRef = doc(db, "attendance", attendanceId);
  const updateData: any = {
    clockOut: Timestamp.fromDate(clockOut),
    status: "pending", // Reset to pending for supervisor approval
    updatedAt: Timestamp.fromDate(new Date())
  };

  // Only add photo URL if it exists
  if (timeOutPhotoUrl) {
    updateData.timeOutPhotoUrl = timeOutPhotoUrl;
  }
  
  if (isEarly !== undefined) {
    updateData.isEarly = isEarly;
  }
  
  console.log("📝 Update data:", updateData);
  await updateDoc(attendanceRef, updateData);
  console.log("✅ Time out updated successfully, status reset to pending for approval");
};

// Get intern attendance records
export const getInternAttendanceRecords = async (internId: string): Promise<AttendanceRecord[]> => {
  console.log("📜 Getting attendance records for intern:", internId);
  
  const attendanceQuery = query(
    collection(db, "attendance"),
    where("internId", "==", internId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(attendanceQuery);
  
  const records = snapshot.docs.map(docSnapshot => ({
    id: docSnapshot.id,
    ...docSnapshot.data()
  })) as AttendanceRecord[];
  
  console.log("📜 Found", records.length, "total attendance records");
  console.log("📜 Records:", records);
  
  return records;
};

// Get current attendance session (for time out)
export const getCurrentAttendanceSession = async (internId: string): Promise<AttendanceRecord | null> => {
  try {
    console.log("🔍 Getting current attendance session for intern:", internId);
    
    // Start with simplest query - just get all intern's records and filter in code
    const allQuery = query(
      collection(db, "attendance"),
      where("internId", "==", internId)
    );
    const snapshot = await getDocs(allQuery);
    
    console.log("📊 Total attendance records for intern:", snapshot.docs.length);
    
    // Filter for approved sessions without clockOut
    const approvedWithoutClockOut = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AttendanceRecord))
      .filter(record => {
        const isApproved = record.status === "approved";
        const noClockOut = !record.clockOut;
        console.log(`� Record ${record.id}: status=${record.status}, clockOut=${!!record.clockOut}, isApproved=${isApproved}, noClockOut=${noClockOut}`);
        return isApproved && noClockOut;
      })
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
    
    console.log("📊 Found", approvedWithoutClockOut.length, "approved sessions without clockOut");
    
    if (approvedWithoutClockOut.length > 0) {
      console.log("✅ Current session found:", approvedWithoutClockOut[0]);
      return approvedWithoutClockOut[0];
    }
    
    console.log("❌ No current session found");
    return null;
  } catch (error) {
    console.error("❌ Error getting current session:", error);
    return null;
  }
};

// Get pending attendance session by querying for pending status
export const getPendingAttendanceSession = async (internId: string): Promise<AttendanceRecord | null> => {
  try {
    console.log("🔍 Looking for pending attendance for intern:", internId);
    
    const pendingQuery = query(
      collection(db, "attendance"),
      where("internId", "==", internId),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(pendingQuery);
    
    if (!snapshot.empty) {
      const pendingDoc = snapshot.docs[0]; // Get most recent pending
      const recordData = pendingDoc.data() as AttendanceRecord;
      
      console.log("📄 Found pending attendance record:", recordData);
      
      return {
        id: pendingDoc.id,
        ...recordData
      };
    } else {
      console.log("� No pending attendance records found");
      return null;
    }
  } catch (error) {
    console.error("❌ Error getting pending attendance:", error);
    return null;
  }
};

// Debug function to get ALL attendance records for an intern
export const debugGetAllAttendanceRecords = async (internId: string) => {
  try {
    console.log("🐛 DEBUG: Getting ALL attendance records for intern:", internId);
    
    const allQuery = query(
      collection(db, "attendance"),
      where("internId", "==", internId)
    );
    
    const snapshot = await getDocs(allQuery);
    console.log("🐛 DEBUG: Total attendance records found:", snapshot.docs.length);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`🐛 DEBUG Record ${index + 1}:`, {
        id: doc.id,
        status: data.status,
        clockIn: data.clockIn,
        clockOut: data.clockOut,
        createdAt: data.createdAt?.toDate?.(),
        updatedAt: data.updatedAt?.toDate?.()
      });
    });
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("🐛 DEBUG: Error getting all attendance records:", error);
    return [];
  }
};

// Get intern profile
export const getInternProfile = async (internId: string): Promise<UserData | null> => {
  try {
    console.log("🔍 Getting intern profile for ID:", internId);
    const userDocRef = doc(db, "users", internId);
    const userSnapshot = await getDoc(userDocRef);
    
    if (userSnapshot.exists()) {
      const userData = userSnapshot.data() as UserData;
      console.log("📋 Intern profile found:", userData);
      console.log("👨‍🏫 Teacher ID:", userData.teacherId);
      return userData;
    }
    
    console.log("❌ No intern profile found for ID:", internId);
    return null;
  } catch (error) {
    console.error("Error getting intern profile:", error);
    return null;
  }
};

// Real-time listener for intern attendance records
export const subscribeToInternAttendance = (
  internId: string,
  callback: (records: AttendanceRecord[]) => void
): Unsubscribe => {
  const attendanceQuery = query(
    collection(db, "attendance"),
    where("internId", "==", internId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(attendanceQuery, (snapshot) => {
    const records = snapshot.docs.map(docSnapshot => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    })) as AttendanceRecord[];
    callback(records);
  });
};

// Real-time listener for teacher's interns attendance
export const subscribeToTeacherAttendance = (
  teacherId: string,
  callback: (records: AttendanceRecord[]) => void
): Unsubscribe => {
  const attendanceQuery = query(
    collection(db, "attendance"),
    where("teacherId", "==", teacherId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(attendanceQuery, (snapshot) => {
    const records = snapshot.docs.map(docSnapshot => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    })) as AttendanceRecord[];
    callback(records);
  });
};

// Approve or reject attendance
export const updateAttendanceStatus = async (
  attendanceId: string,
  status: "approved" | "rejected"
) => {
  const attendanceRef = doc(db, "attendance", attendanceId);
  await updateDoc(attendanceRef, {
    status,
    updatedAt: Timestamp.fromDate(new Date())
  });
};

// Get all pending attendance records for supervisor approval
export const getPendingAttendanceForSupervisor = async (supervisorUid: string): Promise<AttendanceRecord[]> => {
  try {
    console.log("📋 Fetching pending attendance for supervisor:", supervisorUid);
    
    // First, get all interns under this supervisor
    const internsQuery = query(
      collection(db, "interns"),
      where("createdBy", "==", supervisorUid)
    );
    const internsSnapshot = await getDocs(internsQuery);
    const internIds = internsSnapshot.docs.map(doc => doc.id);
    
    if (internIds.length === 0) {
      console.log("📄 No interns found for supervisor");
      return [];
    }
    
    // Get pending attendance records for these interns (batched if needed)
    const pendingRecords: AttendanceRecord[] = [];
    
    // Firebase 'in' queries are limited to 10 items, so batch if necessary
    const batches = [];
    for (let i = 0; i < internIds.length; i += 10) {
      batches.push(internIds.slice(i, i + 10));
    }
    
    for (const batch of batches) {
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("internId", "in", batch),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(attendanceQuery);
      const batchRecords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceRecord[];
      
      pendingRecords.push(...batchRecords);
    }
    
    console.log(`✅ Found ${pendingRecords.length} pending attendance records`);
    return pendingRecords;
  } catch (error) {
    console.error("❌ Error getting pending attendance for supervisor:", error);
    throw error;
  }
};

// Subscribe to pending attendance records for supervisor
export const subscribeToPendingAttendance = (
  supervisorUid: string,
  callback: (records: AttendanceRecord[]) => void
): (() => void) => {
  const unsubscribes: (() => void)[] = [];
  
  // First get interns, then set up listeners
  const setupListeners = async () => {
    try {
      const internsQuery = query(
        collection(db, "interns"),
        where("createdBy", "==", supervisorUid)
      );
      const internsSnapshot = await getDocs(internsQuery);
      const internIds = internsSnapshot.docs.map(doc => doc.id);
      
      if (internIds.length === 0) {
        callback([]);
        return;
      }
      
      // Set up real-time listeners for pending attendance
      const batches = [];
      for (let i = 0; i < internIds.length; i += 10) {
        batches.push(internIds.slice(i, i + 10));
      }
      
      const allRecords: AttendanceRecord[] = [];
      let completedBatches = 0;
      
      batches.forEach((batch, index) => {
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("internId", "in", batch),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc")
        );
        
        const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
          const batchRecords = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as AttendanceRecord[];
          
          // Replace this batch's records in the main array
          const startIndex = index * 10;
          const endIndex = startIndex + 10;
          allRecords.splice(startIndex, endIndex - startIndex, ...batchRecords);
          
          completedBatches++;
          if (completedBatches === batches.length) {
            callback(allRecords.filter(Boolean)); // Filter out any undefined entries
          }
        });
        
        unsubscribes.push(unsubscribe);
      });
    } catch (error) {
      console.error("❌ Error setting up pending attendance listeners:", error);
      callback([]);
    }
  };
  
  setupListeners();
  
  return () => {
    unsubscribes.forEach(unsubscribe => unsubscribe());
  };
};

// Get all attendance records for a teacher
export const getTeacherAttendanceRecords = async (teacherId: string): Promise<AttendanceRecord[]> => {
  const attendanceQuery = query(
    collection(db, "attendance"),
    where("teacherId", "==", teacherId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(attendanceQuery);
  return snapshot.docs.map(docSnapshot => ({
    id: docSnapshot.id,
    ...docSnapshot.data()
  })) as AttendanceRecord[];
};

// Teacher management functions (using Firebase client SDK)
export const createTeacherAccount = async (teacherData: { firstName: string; lastName: string; email: string; phone: string; password: string; school?: string }, supervisorUid: string) => {
  try {
    console.log("🚀 Creating teacher account, starting API call...");
    // Use your deployed backend URL
    const backendUrl = 'https://backenditrack-1.onrender.com';
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error("❌ Backend API timeout - taking too long");
    }, 25000); // 25 second timeout for backend
    
    const response = await fetch(`${backendUrl}/api/teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        teacherData,
        supervisorUid
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId); // Clear timeout on response
    console.log("📡 Backend API response received");

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create teacher account');
    }

    if (!result.success) {
      throw new Error(result.message || 'Failed to create teacher account');
    }

    console.log("✅ Teacher created successfully via backend");

    // Simplified school field update - don't wait for it to complete
    if (result.teacher && result.teacher.uid && teacherData.school) {
      // Run in background without blocking the UI
      setTimeout(async () => {
        try {
          console.log("🏫 Background update: Adding school field:", teacherData.school);
          const teacherRef = doc(db, "teachers", result.teacher.uid);
          await updateDoc(teacherRef, {
            school: teacherData.school,
            updatedAt: Timestamp.fromDate(new Date())
          });
          console.log("✅ School field updated in background");
        } catch (updateError) {
          console.error("❌ Background school update failed:", updateError);
          // Don't throw error as main operation succeeded
        }
      }, 100); // Small delay to not block UI
    }

    return result.teacher;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    console.error('Error creating teacher account:', error);
    throw new Error(error.message || 'Failed to create teacher account');
  }
};


export const getTeacherStats = async (teacherId: string) => {
  const internsQuery = query(
    collection(db, "users"),
    where("role", "==", "intern"),
    where("teacherId", "==", teacherId)
  );
  const internsSnapshot = await getDocs(internsQuery);
  
  const attendanceQuery = query(
    collection(db, "attendance"),
    where("teacherId", "==", teacherId)
  );
  const attendanceSnapshot = await getDocs(attendanceQuery);
  
  return {
    totalInterns: internsSnapshot.size,
    totalAttendance: attendanceSnapshot.size
  };
};

// Intern management functions (using server-side Firebase Admin)
export const createInternAccount = async (internData: { firstName: string; lastName: string; email: string; teacherId: string; password?: string; scheduledTimeIn?: string; scheduledTimeOut?: string; phone?: string }, teacherUid: string) => {
  try {
    // Use your deployed backend URL
    const backendUrl = 'https://backenditrack-1.onrender.com';
    
    console.log('📞 Client-side phone field check:', internData.phone);
    
    const response = await fetch(`${backendUrl}/api/interns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        internData: {
          firstName: internData.firstName,
          lastName: internData.lastName,
          email: internData.email,
          password: internData.password || "defaultPassword123",
          teacherId: internData.teacherId,  // Include the teacherId from internData
          scheduledTimeIn: internData.scheduledTimeIn || "08:00",
          scheduledTimeOut: internData.scheduledTimeOut || "17:00",
          phone: internData.phone || "" // Ensure phone field is always included
        },
        supervisorUid: teacherUid  // Rename to match backend expectation
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to create intern account');
    }

    if (!result.success) {
      throw new Error(result.message || 'Failed to create intern account');
    }

    return result.intern;
  } catch (error: any) {
    console.error('Error creating intern account:', error);
    throw new Error(error.message || 'Failed to create intern account');
  }
};

export const getTeacherInterns = async (teacherId: string): Promise<InternProfile[]> => {
  return await getInternsForTeacher(teacherId);
};

export interface InternProfile {
  id: string;
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: "intern";
  teacherId: string;
  phone: string; // Make phone required
  scheduledTimeIn?: string;
  scheduledTimeOut?: string;
  location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  createdAt?: Date;
};

// Fix intern records missing teacherId
export const fixInternTeacherIds = async (): Promise<boolean> => {
  try {
    console.log("🔧 Fixing intern teacher IDs...");
    
    // Get all interns from the interns collection (server-side created)
    const internsQuery = query(collection(db, "interns"));
    const internsSnapshot = await getDocs(internsQuery);
    
    const batch = writeBatch(db);
    let fixCount = 0;
    
    for (const internDoc of internsSnapshot.docs) {
      const internData = internDoc.data();
      const internId = internDoc.id;
      
      console.log(`🔍 Checking intern ${internId}:`, internData);
      
      if (internData.teacherId) {
        // Check if user record has teacherId
        const userDoc = await getDoc(doc(db, "users", internId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (!userData.teacherId) {
            console.log(`🔧 Fixing user record for intern ${internId}, adding teacherId: ${internData.teacherId}`);
            batch.update(doc(db, "users", internId), { teacherId: internData.teacherId });
            fixCount++;
          }
        }
      }
    }
    
    if (fixCount > 0) {
      await batch.commit();
      console.log(`✅ Fixed ${fixCount} intern records`);
    } else {
      console.log("ℹ️ No intern records needed fixing");
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error fixing intern teacher IDs:", error);
    return false;
  }
};

// Migrate attendance records to use deterministic IDs
export const migrateAttendanceRecords = async (): Promise<boolean> => {
  try {
    console.log("🔄 Starting attendance records migration...");
    
    // Get all attendance records
    const attendanceQuery = query(collection(db, "attendance"));
    const snapshot = await getDocs(attendanceQuery);
    
    const batch = writeBatch(db);
    let migrationCount = 0;
    
    snapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data() as AttendanceRecord;
      const currentId = docSnapshot.id;
      
      // Check if this is already using the new format (internId_date)
      const expectedPattern = /^[a-zA-Z0-9]+_\d{4}-\d{2}-\d{2}$/;
      if (expectedPattern.test(currentId)) {
        console.log("⏭️ Skipping already migrated record:", currentId);
        return;
      }
      
      // Create new deterministic ID
      const createdDate = data.createdAt?.toDate() || new Date();
      const dateString = createdDate.toISOString().split('T')[0];
      const newId = `${data.internId}_${dateString}`;
      
      console.log(`📋 Migrating: ${currentId} → ${newId}`);
      
      // Create new document with deterministic ID
      const newDocRef = doc(db, "attendance", newId);
      batch.set(newDocRef, data);
      
      // Delete old document
      const oldDocRef = doc(db, "attendance", currentId);
      batch.delete(oldDocRef);
      
      migrationCount++;
    });
    
    if (migrationCount > 0) {
      await batch.commit();
      console.log(`✅ Migration completed! Migrated ${migrationCount} records.`);
    } else {
      console.log("ℹ️ No records needed migration.");
    }
    
    return true;
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return false;
  }
};

// Task Management Interfaces and Functions
export interface Task {
  id?: string;
  title: string;
  description?: string;
  assignedTo: string[]; // Array of intern IDs
  assignedBy: string; // Teacher ID
  // Legacy field names for backward compatibility
  internId?: string; // Single intern ID (for backward compatibility)
  teacherId?: string; // Teacher ID (for backward compatibility)
  dueDate?: Date | Timestamp | string;
  priority: 'low' | 'medium' | 'high';
  status: 'assigned' | 'pending' | 'in-progress' | 'completed';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  isDeleted?: boolean;
}

export interface TaskSubmission {
  id?: string;
  taskId: string;
  internId: string;
  submissionText?: string;
  attachmentUrl?: string;
  submittedAt: Timestamp;
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected';
}

// Create a new task
export const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "tasks"), {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log("✅ Task created with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error creating task:", error);
    throw error;
  }
};

// Get tasks assigned by a teacher
export const getTeacherTasks = async (teacherId: string): Promise<Task[]> => {
  try {
    const tasksQuery = query(
      collection(db, "tasks"),
      where("assignedBy", "==", teacherId),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(tasksQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  } catch (error) {
    console.error("❌ Error getting teacher tasks:", error);
    throw error;
  }
};

// Get tasks assigned to an intern
export const getInternTasks = async (internId: string): Promise<Task[]> => {
  try {
    const tasksQuery = query(
      collection(db, "tasks"),
      where("assignedTo", "array-contains", internId),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(tasksQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  } catch (error) {
    console.error("❌ Error getting intern tasks:", error);
    throw error;
  }
};

// Update task status
export const updateTaskStatus = async (taskId: string, status: Task['status']): Promise<void> => {
  try {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      status,
      updatedAt: serverTimestamp(),
    });
    
    console.log("✅ Task status updated:", taskId, status);
  } catch (error) {
    console.error("❌ Error updating task status:", error);
    throw error;
  }
};

// Update entire task
export const updateTask = async (taskId: string, taskData: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      ...taskData,
      updatedAt: serverTimestamp()
    });
    console.log("✅ Task updated:", taskId);
  } catch (error) {
    console.error("❌ Error updating task:", error);
    throw error;
  }
};

// Delete task (soft delete)
export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      isDeleted: true,
      updatedAt: serverTimestamp()
    });
    console.log("✅ Task deleted:", taskId);
  } catch (error) {
    console.error("❌ Error deleting task:", error);
    throw error;
  }
};

// Alias for createTask to match calendar.tsx imports
export const addTask = createTask;

// Alias for getTeacherTasks to match calendar.tsx imports
export const getTasksByTeacher = getTeacherTasks;

// Submit task completion
export const submitTask = async (submissionData: Omit<TaskSubmission, 'id' | 'submittedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "taskSubmissions"), {
      ...submissionData,
      submittedAt: serverTimestamp(),
    });
    
    console.log("✅ Task submitted with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error submitting task:", error);
    throw error;
  }
};

// Get task submissions for a specific task
export const getTaskSubmissions = async (taskId: string): Promise<TaskSubmission[]> => {
  try {
    const submissionsQuery = query(
      collection(db, "taskSubmissions"),
      where("taskId", "==", taskId),
      orderBy("submittedAt", "desc")
    );
    
    const snapshot = await getDocs(submissionsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TaskSubmission));
  } catch (error) {
    console.error("❌ Error getting task submissions:", error);
    throw error;
  }
};

// Subscribe to real-time task updates for a teacher
export const subscribeToTeacherTasks = (
  teacherId: string,
  callback: (tasks: Task[]) => void
): Unsubscribe => {
  const tasksQuery = query(
    collection(db, "tasks"),
    where("assignedBy", "==", teacherId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(tasksQuery, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
    
    callback(tasks);
  });
};

// Subscribe to real-time task updates for an intern
export const subscribeToInternTasks = (
  internId: string,
  callback: (tasks: Task[]) => void
): Unsubscribe => {
  const tasksQuery = query(
    collection(db, "tasks"),
    where("assignedTo", "array-contains", internId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(tasksQuery, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
    
    callback(tasks);
  });
};

// Get interns for a supervisor (all interns assigned to teachers created by this supervisor)
export const getInternsForSupervisor = async (supervisorUid: string) => {
  console.log('🔍 Fetching interns for supervisor:', supervisorUid);
  try {
    // First get teachers created by this supervisor from 'teachers' collection if present
    const teachersBySupervisorQuery = query(
      collection(db, 'teachers'),
      where('createdBy', '==', supervisorUid)
    );
    const teachersSnapshot = await getDocs(teachersBySupervisorQuery);

    let teacherIds: string[] = [];
    if (teachersSnapshot.size > 0) {
      teacherIds = teachersSnapshot.docs.map(d => d.id);
    } else {
      // Fallback: look in users collection for teachers with createdBy field
      const usersTeachersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'teacher'),
        where('createdBy', '==', supervisorUid)
      );
      const usersTeachersSnapshot = await getDocs(usersTeachersQuery);
      teacherIds = usersTeachersSnapshot.docs.map(d => d.id);
    }

    console.log('🧑‍🏫 Teacher IDs for supervisor:', teacherIds);

    if (teacherIds.length === 0) {
      console.log('⚠️ No teachers found for supervisor, returning empty intern list');
      return [] as (UserData & { id: string })[];
    }

    // Query interns where teacherId in teacherIds. Firestore doesn't support 'in' with more than 10 items
    // so we'll batch if needed
    const interns: (UserData & { id: string })[] = [];
    const batchSize = 10;
    for (let i = 0; i < teacherIds.length; i += batchSize) {
      const batch = teacherIds.slice(i, i + batchSize);
      try {
        const internsQuery = query(
          collection(db, 'interns'),
          where('teacherId', 'in', batch)
        );
        const snapshot = await getDocs(internsQuery);
        interns.push(...snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as (UserData & { id: string })[]);
      } catch (err) {
        console.log('❌ Error querying interns collection with batch, falling back to users collection for this batch', err);
        const usersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'intern'),
          where('teacherId', 'in', batch)
        );
        const usersSnapshot = await getDocs(usersQuery);
        interns.push(...usersSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as (UserData & { id: string })[]);
      }
    }

    console.log('✅ Found', interns.length, 'interns for supervisor');
    return interns;
  } catch (error) {
    console.error('❌ Error getting interns for supervisor:', error);
    return [] as (UserData & { id: string })[];
  }
};

// Subscribe to real-time updates for all interns under a supervisor
export const subscribeToSupervisorInterns = (
  supervisorUid: string,
  callback: (interns: (UserData & { id: string; teacherName?: string })[]) => void
): Unsubscribe => {
  console.log('🔄 Setting up real-time subscription for supervisor interns:', supervisorUid);

  // Create a function to fetch and enrich intern data
  const fetchAndEnrichInterns = async () => {
    try {
      // Get all interns for this supervisor
      const interns = await getInternsForSupervisor(supervisorUid);
      
      // Enrich with teacher names
      const enrichedInterns = await Promise.all(
        interns.map(async (intern) => {
          if (intern.teacherId) {
            try {
              const teacherData = await getUserData(intern.teacherId);
              return {
                ...intern,
                teacherName: teacherData ? `${teacherData.firstName} ${teacherData.lastName}` : 'Unknown Teacher'
              };
            } catch (error) {
              console.warn('Could not fetch teacher data for:', intern.teacherId);
              return { ...intern, teacherName: 'Unknown Teacher' };
            }
          }
          return { ...intern, teacherName: 'No Teacher Assigned' };
        })
      );

      callback(enrichedInterns);
    } catch (error) {
      console.error('❌ Error in real-time subscription:', error);
      callback([]);
    }
  };

  // Set up real-time listener on interns collection
  const unsubscribe = onSnapshot(
    collection(db, 'interns'),
    async (snapshot) => {
      console.log('🔄 Interns collection changed, refetching data...');
      await fetchAndEnrichInterns();
    },
    (error) => {
      console.error('❌ Error in interns subscription:', error);
      callback([]);
    }
  );

  // Initial fetch
  fetchAndEnrichInterns();

  return unsubscribe;
};

// Subscribe to pending attendance records for teacher's interns
export const subscribeToTeacherPendingAttendance = (
  teacherUid: string,
  callback: (records: AttendanceRecord[]) => void
): (() => void) => {
  const unsubscribes: (() => void)[] = [];
  
  // First get interns assigned to this teacher, then set up listeners
  const setupListeners = async () => {
    try {
      const internsQuery = query(
        collection(db, "interns"),
        where("teacherId", "==", teacherUid)
      );
      const internsSnapshot = await getDocs(internsQuery);
      const internIds = internsSnapshot.docs.map(doc => doc.id);
      
      if (internIds.length === 0) {
        callback([]);
        return;
      }

      console.log(`📡 Setting up attendance listener for ${internIds.length} interns under teacher:`, teacherUid);

      // Create batches of intern IDs (max 10 per query due to Firestore limit)
      const batchSize = 10;
      const batches: string[][] = [];
      for (let i = 0; i < internIds.length; i += batchSize) {
        batches.push(internIds.slice(i, i + batchSize));
      }

      batches.forEach(batch => {
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("internId", "in", batch),
          where("status", "==", "pending")
        );
        
        const unsubscribe = onSnapshot(
          attendanceQuery,
          (snapshot) => {
            const allRecords: AttendanceRecord[] = [];
            
            // Collect records from all batches
            batches.forEach(batchIds => {
              const batchQuery = query(
                collection(db, "attendance"),
                where("internId", "in", batchIds),
                where("status", "==", "pending")
              );
              
              getDocs(batchQuery).then(batchSnapshot => {
                const batchRecords = batchSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                })) as AttendanceRecord[];
                
                allRecords.push(...batchRecords);
                callback(allRecords);
              });
            });
          },
          (error) => {
            console.error("Error listening to teacher attendance:", error);
            callback([]);
          }
        );
        
        unsubscribes.push(unsubscribe);
      });
    } catch (error) {
      console.error("Error setting up teacher attendance listeners:", error);
      callback([]);
    }
  };

  setupListeners();

  // Return cleanup function
  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
};

// Enhanced updateAttendanceStatus for more detailed updates
export const updateAttendanceStatusWithDetails = async (
  attendanceId: string,
  updates: {
    status: "approved" | "rejected";
    approvalReason?: string;
    approvedAt?: Date;
    approvedBy?: string;
  }
) => {
  const attendanceRef = doc(db, "attendance", attendanceId);
  
  // Build update object, excluding undefined values
  const updateData: any = {
    status: updates.status,
    updatedAt: Timestamp.fromDate(new Date())
  };

  // Only add fields if they have values
  if (updates.approvalReason !== undefined) {
    updateData.approvalReason = updates.approvalReason;
  }
  
  if (updates.approvedAt !== undefined) {
    updateData.approvedAt = Timestamp.fromDate(updates.approvedAt);
  }
  
  if (updates.approvedBy !== undefined) {
    updateData.approvedBy = updates.approvedBy;
  }

  await updateDoc(attendanceRef, updateData);
};

// Fixed the error by using getUserProfile to fetch the intern's profile
// Refactored submitDTR function to resolve errors
export const submitDTR = async (userProfile: UserProfile): Promise<string> => {
  try {
    if (!userProfile) {
      throw new Error("User profile not found");
    }

    console.log("🔍 Submitting DTR for intern:", userProfile.uid, "Name:", `${userProfile.firstName} ${userProfile.lastName}`);

    // Get supervisorId from teacherId if present
    let supervisorId = null;
    if (userProfile.teacherId) {
      console.log("👨‍🏫 Looking up teacher:", userProfile.teacherId);
      const teacherDoc = await getDoc(doc(db, "users", userProfile.teacherId));
      if (teacherDoc.exists()) {
        supervisorId = teacherDoc.data().createdBy || null;
        console.log("✅ Found supervisorId from teacher:", supervisorId);
      } else {
        console.log("❌ Teacher document not found in users collection");
      }
    } else {
      console.log("⚠️ No teacherId found on intern profile");
    }

    // Fallback: try to get supervisorId from intern profile
    if (!supervisorId && (userProfile as any).createdBy) {
      supervisorId = (userProfile as any).createdBy;
      console.log("✅ Found supervisorId from intern profile:", supervisorId);
    }

    if (!supervisorId) {
      console.warn("❌ No supervisorId found for DTR submission! Intern UID:", userProfile.uid, "TeacherId:", userProfile.teacherId);
      // Try to find any supervisor in the system as a last resort
      try {
        const supervisorsQuery = query(collection(db, "users"), where("role", "==", "supervisor"));
        const supervisorsSnapshot = await getDocs(supervisorsQuery);
        if (!supervisorsSnapshot.empty) {
          supervisorId = supervisorsSnapshot.docs[0].id;
          console.log("🔄 Using fallback supervisorId:", supervisorId);
        }
      } catch (error) {
        console.error("❌ Error finding fallback supervisor:", error);
      }
    }

    const dtrData = {
      internId: userProfile.uid,
      supervisorId,
      studentName: `${userProfile.firstName} ${userProfile.lastName}`,
      submittedAt: serverTimestamp(),
      status: "submitted",
      totalHours: 0, // Default value - can be updated later
      grade: "", // Default value - can be updated later
    };

    console.log("📝 Creating DTR with data:", dtrData);

    const docRef = await addDoc(collection(db, "dtrReports"), dtrData);
    console.log("✅ DTR submitted with ID:", docRef.id, "SupervisorId:", supervisorId);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error submitting DTR:", error);
    throw error;
  }
};