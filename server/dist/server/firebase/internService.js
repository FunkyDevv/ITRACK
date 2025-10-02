import { adminAuth, adminDb } from './admin.js';
import { FieldValue } from 'firebase-admin/firestore';
export const createInternAccount = async (internData, supervisorUid) => {
    try {
        console.log('🔍 Backend received internData:', internData);
        console.log('🔍 Backend received supervisorUid:', supervisorUid);
        console.log('🎯 TeacherId from internData:', internData.teacherId);
        console.log('📞 InternService - Phone field:', internData.phone);
        console.log('📞 InternService - Phone field type:', typeof internData.phone);
        // Create Firebase Auth account for intern with provided password
        const userRecord = await adminAuth.createUser({
            email: internData.email,
            password: internData.password,
            displayName: `${internData.firstName} ${internData.lastName}`,
        });
        // Create intern profile in Firestore
        const internProfile = {
            uid: userRecord.uid,
            firstName: internData.firstName,
            lastName: internData.lastName,
            email: internData.email,
            phone: internData.phone || "", // ✅ Save phone number
            role: 'intern',
            teacherId: internData.teacherId,
            scheduledTimeIn: internData.scheduledTimeIn || '08:00',
            scheduledTimeOut: internData.scheduledTimeOut || '17:00',
            createdBy: supervisorUid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };
        // Attempt to denormalize teacher name onto the intern document for faster reads
        try {
            if (internProfile.teacherId) {
                const teacherDoc = await adminDb.collection('teachers').doc(internProfile.teacherId).get();
                if (teacherDoc.exists) {
                    const t = teacherDoc.data();
                    internProfile.teacherName = `${t.firstName || ''} ${t.lastName || ''}`.trim();
                }
            }
        }
        catch (err) {
            console.warn('Could not denormalize teacher name for intern:', err);
        }
        console.log('💾 About to save internProfile:', internProfile);
        console.log('📞 Profile phone field specifically:', internProfile.phone);
        console.log('📞 Profile phone field type:', typeof internProfile.phone);
        // Save to Firestore
        await adminDb.collection('users').doc(userRecord.uid).set(internProfile);
        await adminDb.collection('interns').doc(userRecord.uid).set(internProfile);
        // Return the intern profile
        return internProfile;
    }
    catch (error) {
        console.error('Error creating intern account:', error);
        throw new Error('Failed to create intern account');
    }
};
export const getInternStats = async (supervisorUid) => {
    try {
        console.log('🔍 Fetching intern stats for supervisor:', supervisorUid);
        // First get teachers created by this supervisor
        const teachersQuery = await adminDb.collection('teachers')
            .where('createdBy', '==', supervisorUid)
            .get();
        const teacherIds = teachersQuery.docs.map(doc => doc.id);
        console.log('🧑‍🏫 Found teacher IDs for supervisor:', teacherIds);
        if (teacherIds.length === 0) {
            console.log('⚠️ No teachers found for supervisor, returning empty stats');
            return {
                totalInterns: 0,
                thisMonth: 0,
                recentAdditions: []
            };
        }
        // Get all interns assigned to supervisor's teachers (batch query for >10 teachers)
        let allInterns = [];
        const batchSize = 10;
        for (let i = 0; i < teacherIds.length; i += batchSize) {
            const batch = teacherIds.slice(i, i + batchSize);
            const internsQuery = await adminDb.collection('interns')
                .where('teacherId', 'in', batch)
                .get();
            allInterns.push(...internsQuery.docs);
        }
        const totalInterns = allInterns.length;
        // Get this month's additions
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        let thisMonthCount = 0;
        let recentAdditions = [];
        // Process all interns to get monthly and recent stats
        const internData = allInterns.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate() || new Date(0);
            // Count this month's additions
            if (createdAt >= oneMonthAgo) {
                thisMonthCount++;
            }
            return { id: doc.id, ...data, createdAt };
        });
        // Get 5 most recent additions
        recentAdditions = internData
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 5)
            .map(intern => ({ ...intern, createdAt: intern.createdAt }));
        console.log('✅ Supervisor intern stats:', { totalInterns, thisMonth: thisMonthCount, recentCount: recentAdditions.length });
        return {
            totalInterns,
            thisMonth: thisMonthCount,
            recentAdditions
        };
    }
    catch (error) {
        console.error('❌ Error fetching intern stats for supervisor:', error);
        return {
            totalInterns: 0,
            thisMonth: 0,
            recentAdditions: []
        };
    }
};
