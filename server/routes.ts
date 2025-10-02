import type { Express } from "express";
import { createServer, type Server } from "http";
import { createTeacherAccount, getTeacherStats, type TeacherData } from "./firebase/teacherService.js";
import { createInternAccount, getInternStats, type InternData } from "./firebase/internService.js";
import { adminDb } from "./firebase/admin.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Firebase handles authentication on the client side
  // Simple health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running with Firebase' });
  });

  // Teacher creation endpoint
  app.post('/api/teachers', async (req, res) => {
    try {
      const { teacherData, supervisorUid }: { teacherData: TeacherData; supervisorUid: string } = req.body;

      if (!teacherData || !supervisorUid) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const teacherProfile = await createTeacherAccount(teacherData, supervisorUid);

      res.status(201).json({
        message: 'Teacher account created successfully',
        teacher: teacherProfile
      });
    } catch (error) {
      console.error('Error creating teacher:', error);
      res.status(500).json({ message: 'Failed to create teacher account' });
    }
  });

  // Get teacher statistics
  app.get('/api/teachers/stats', async (req, res) => {
    try {
      const stats = await getTeacherStats();
      res.json(stats);
    } catch (error) {
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

      if (!internData || !supervisorUid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: internData and supervisorUid' 
        });
      }

      const { 
        firstName, 
        lastName, 
        email, 
        phone,             // ✅ Added phone
        password, 
        teacherId, 
        scheduledTimeIn, 
        scheduledTimeOut 
      } = internData;

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

    } catch (error: any) {
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

  // Get all interns for a supervisor (filtered by supervisor)
  app.get('/api/interns', async (req, res) => {
    try {
      const { supervisorUid } = req.query;
      
      if (!supervisorUid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required parameter: supervisorUid' 
        });
      }
      
      // First get teachers created by this supervisor
      const teachersQuery = await adminDb.collection('teachers')
        .where('createdBy', '==', supervisorUid)
        .get();
      
      const teacherIds = teachersQuery.docs.map(doc => doc.id);
      
      if (teacherIds.length === 0) {
        return res.json({
          success: true,
          interns: []
        });
      }

      // Get all interns assigned to supervisor's teachers (batch query for >10 teachers)
      let allInterns: any[] = [];
      const batchSize = 10;
      
      for (let i = 0; i < teacherIds.length; i += batchSize) {
        const batch = teacherIds.slice(i, i + batchSize);
        const internsQuery = await adminDb.collection('interns')
          .where('teacherId', 'in', batch)
          .orderBy('createdAt', 'desc')
          .get();
        allInterns.push(...internsQuery.docs);
      }

      const interns = allInterns.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.json({
        success: true,
        interns
      });
    } catch (error) {
      console.error('Error fetching interns for supervisor:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch interns' 
      });
    }
  });

  // Get intern statistics (filtered by supervisor)
  app.get('/api/interns/stats', async (req, res) => {
    try {
      const { supervisorUid } = req.query;
      
      if (!supervisorUid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required parameter: supervisorUid' 
        });
      }
      
      const stats = await getInternStats(supervisorUid as string);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching intern stats:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch intern statistics' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
