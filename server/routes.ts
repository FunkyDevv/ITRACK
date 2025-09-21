import type { Express } from "express";
import { createServer, type Server } from "http";
import { createTeacherAccount, getTeacherStats, type TeacherData } from "./firebase/teacherService";
import { createInternAccount, getInternStats, type InternData } from "./firebase/internService";

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

  // Intern creation endpoint
  app.post('/api/interns', async (req, res) => {
    try {
      const { internData, supervisorUid }: { internData: InternData; supervisorUid: string } = req.body;

      if (!internData || !supervisorUid) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const internProfile = await createInternAccount(internData, supervisorUid);

      res.status(201).json({
        message: 'Intern account created successfully',
        intern: internProfile
      });
    } catch (error) {
      console.error('Error creating intern:', error);
      res.status(500).json({ message: 'Failed to create intern account' });
    }
  });

  // Get intern statistics
  app.get('/api/interns/stats', async (req, res) => {
    try {
      const stats = await getInternStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching intern stats:', error);
      res.status(500).json({ message: 'Failed to fetch intern statistics' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
