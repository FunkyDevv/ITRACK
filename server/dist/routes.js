import { createServer } from "http";
import { createTeacherAccount, getTeacherStats } from "./firebase/teacherService";
import { createInternAccount, getInternStats } from "./firebase/internService";
export async function registerRoutes(app) {
    // Firebase handles authentication on the client side
    // Simple health check endpoint
    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', message: 'Server is running with Firebase' });
    });
    // Teacher creation endpoint
    app.post('/api/teachers', async (req, res) => {
        try {
            const { teacherData, supervisorUid } = req.body;
            if (!teacherData || !supervisorUid) {
                return res.status(400).json({ message: 'Missing required fields' });
            }
            const teacherProfile = await createTeacherAccount(teacherData, supervisorUid);
            res.status(201).json({
                message: 'Teacher account created successfully',
                teacher: teacherProfile
            });
        }
        catch (error) {
            console.error('Error creating teacher:', error);
            res.status(500).json({ message: 'Failed to create teacher account' });
        }
    });
    // Get teacher statistics
    app.get('/api/teachers/stats', async (req, res) => {
        try {
            const stats = await getTeacherStats();
            res.json(stats);
        }
        catch (error) {
            console.error('Error fetching teacher stats:', error);
            res.status(500).json({ message: 'Failed to fetch teacher statistics' });
        }
    });
    // Create intern account endpoint
    app.post('/api/interns', async (req, res) => {
        try {
            const { internData, supervisorUid } = req.body;
            console.log('🔍 Backend received internData:', internData);
            console.log('🔍 Backend received supervisorUid:', supervisorUid);
            console.log('🎯 TeacherId from internData:', internData.teacherId);
            console.log('📞 Phone field from frontend:', internData.phone);
            console.log('📞 Phone field type:', typeof internData.phone);
            console.log('📞 Phone field length:', internData.phone ? internData.phone.length : 0);
            console.log('🕐 Timestamp:', new Date().toISOString());
            if (!internData || !supervisorUid) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: internData and supervisorUid'
                });
            }
            const { firstName, lastName, email, phone, // ✅ Added phone
            password, teacherId, scheduledTimeIn, scheduledTimeOut } = internData;
            if (!firstName || !lastName || !email || !password || !teacherId) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required intern fields (firstName, lastName, email, password, teacherId)'
                });
            }
            const internProfile = await createInternAccount(internData, supervisorUid);
            res.status(201).json({
                success: true,
                message: 'Intern account created successfully',
                intern: internProfile
            });
        }
        catch (error) {
            console.error('Error creating intern:', error);
            if (error.code === 'auth/email-already-exists') {
                return res.status(400).json({
                    success: false,
                    message: 'A user with this email already exists'
                });
            }
            res.status(500).json({
                success: false,
                message: 'Failed to create intern account',
                error: error.message
            });
        }
    });
    // Get intern statistics
    app.get('/api/interns/stats', async (req, res) => {
        try {
            const stats = await getInternStats();
            res.json(stats);
        }
        catch (error) {
            console.error('Error fetching intern stats:', error);
            res.status(500).json({ message: 'Failed to fetch intern statistics' });
        }
    });
    const httpServer = createServer(app);
    return httpServer;
}
