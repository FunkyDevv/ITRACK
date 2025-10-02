import { adminAuth, adminDb } from './admin';
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
            phone: internData.phone || "",                        // ✅ Save phone number
            role: 'intern',
            teacherId: internData.teacherId,         
            scheduledTimeIn: internData.scheduledTimeIn || '08:00',
            scheduledTimeOut: internData.scheduledTimeOut || '17:00',
            createdBy: supervisorUid,     
            createdAt: new Date(),
            updatedAt: new Date(),
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
        console.log('✅ Final teacherId being saved:', internProfile.teacherId);
        // Ensure phone field is always present, even if empty
        if (!internProfile.phone) {
            internProfile.phone = "";
        }
        // Triple check that phone field is never missing
        console.log('📞 Final check for phone field before saving:', internProfile.phone);
        if (internProfile.phone === undefined || internProfile.phone === null) {
            console.warn('⚠️ Phone field was still missing at final save checkpoint! Setting to empty string.');
            internProfile.phone = '';
        }
        // Store in interns collection
        await adminDb.collection('interns').doc(userRecord.uid).set(internProfile);
        // Also create a user profile
        const userProfile = {
            uid: userRecord.uid,
            email: internData.email,
            firstName: internData.firstName,
            lastName: internData.lastName,
            role: "intern",
            company: "Education",
            teacherId: internData.teacherId,
            scheduledTimeIn: internData.scheduledTimeIn,
            scheduledTimeOut: internData.scheduledTimeOut,
            phone: internData.phone
        };
        // Ensure phone field is always present in user profile too, even if empty
        if (!userProfile.phone) {
            userProfile.phone = "";
        }
        // Persist user profile and include teacherName if available
        if (internProfile.teacherId && internProfile.teacherName) {
            userProfile.teacherName = internProfile.teacherName;
        }
        await adminDb.collection('users').doc(userRecord.uid).set(userProfile);
        // Return the intern profile (without the password)
        console.log('📞 FINAL: Returning internProfile with phone:', internProfile.phone);
        console.log('📞 FINAL: Full internProfile keys:', Object.keys(internProfile));
        return internProfile;
    }
    catch (error) {
        console.error('Error creating intern account:', error);
        throw new Error('Failed to create intern account');
    }
};
export const getInternStats = async () => {
    try {
        const internsSnapshot = await adminDb.collection('interns').get();
        const totalInterns = internsSnapshot.size;
        // Get this month's additions
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const thisMonthQuery = await adminDb.collection('interns')
            .where('createdAt', '>=', oneMonthAgo)
            .get();
        // Get recent additions
        const recentQuery = await adminDb.collection('interns')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        const recentAdditions = recentQuery.docs.map(doc => doc.data());
        return {
            totalInterns,
            thisMonth: thisMonthQuery.size,
            recentAdditions
        };
    }
    catch (error) {
        console.error('Error fetching intern stats:', error);
        return {
            totalInterns: 0,
            thisMonth: 0,
            recentAdditions: []
        };
    }
};
