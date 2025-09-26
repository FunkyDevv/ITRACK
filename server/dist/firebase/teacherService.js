import { adminAuth, adminDb } from './admin';
export const createTeacherAccount = async (teacherData, supervisorUid) => {
    try {
        // Create Firebase Auth account for teacher with provided password
        const userRecord = await adminAuth.createUser({
            email: teacherData.email,
            password: teacherData.password,
            displayName: `${teacherData.firstName} ${teacherData.lastName}`,
        });
        // Create teacher profile in Firestore
        const teacherProfile = {
            ...teacherData,
            uid: userRecord.uid,
            createdAt: new Date(),
            createdBy: supervisorUid,
        };
        // Store in teachers collection
        await adminDb.collection('teachers').doc(userRecord.uid).set(teacherProfile);
        // Also create a user profile
        const userProfile = {
            uid: userRecord.uid,
            email: teacherData.email,
            firstName: teacherData.firstName,
            lastName: teacherData.lastName,
            role: "teacher",
            company: teacherData.school || "Education",
            teacherId: userRecord.uid,
            phone: teacherData.phone
        };
        await adminDb.collection('users').doc(userRecord.uid).set(userProfile);
        // Return the teacher profile (without the password)
        return teacherProfile;
    }
    catch (error) {
        console.error('Error creating teacher account:', error);
        throw new Error('Failed to create teacher account');
    }
};
export const getTeacherStats = async () => {
    try {
        const teachersSnapshot = await adminDb.collection('teachers').get();
        const totalTeachers = teachersSnapshot.size;
        // Get departments
        const departments = new Set();
        teachersSnapshot.forEach(doc => {
            departments.add(doc.data().department);
        });
        // Get this month's additions
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const thisMonthQuery = await adminDb.collection('teachers')
            .where('createdAt', '>=', oneMonthAgo)
            .get();
        // Get recent additions
        const recentQuery = await adminDb.collection('teachers')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        const recentTeachers = recentQuery.docs.map(doc => doc.data());
        return {
            totalTeachers,
            activeDepartments: departments.size,
            thisMonth: thisMonthQuery.size,
            pendingApprovals: 0, // Could be implemented later
            recentAdditions: recentTeachers
        };
    }
    catch (error) {
        console.error('Error fetching teacher stats:', error);
        return {
            totalTeachers: 0,
            activeDepartments: 0,
            thisMonth: 0,
            pendingApprovals: 0,
            recentAdditions: []
        };
    }
};
