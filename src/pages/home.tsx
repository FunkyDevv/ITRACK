import * as React from "react";
import { useEffect, useState } from "react";
import { getInternsForSupervisor, getUserData } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLocation } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, Calendar, TrendingUp, BarChart3, PieChart, LineChart, Menu, X, GraduationCap, AlertCircle } from "lucide-react";
import Analytics from "./analytics";
import AddTeacher from "./add-teacher";
import AddTask from "./add-task";
import TasksPage from "./tasks";
import ReportsPage from "./reports";
import DTRReportsPage from "./dtr-reports";
import InternReportsPage from "./intern-reports";
import InternCalendarPage from "./intern-calendar";
import SettingsPage from "./settings";
import ManageTeachers from "./manage-teachers";
import ManageInterns from "./manage-interns";
import TeacherDashboard from "@/components/TeacherDashboard";
import InternDashboard from "@/components/InternDashboard";
import MyInterns from "@/components/MyInterns";
import ViewTasksPage from "./view-tasks";
import AttendanceHistoryPage from "./attendance-history";

export default function Home() {
  const { userProfile, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [teacherId, setTeacherId] = React.useState<string | undefined>();
  const [teacherName, setTeacherName] = React.useState<string | undefined>();

  // Parse current location to determine page and extract teacher info
  React.useEffect(() => {
    if (location.startsWith("/manage-teachers/") && location.includes("/interns/")) {
      const parts = location.split("/");
      if (parts.length >= 5 && parts[3] === "interns") {
        setTeacherId(parts[2]);
        setTeacherName(decodeURIComponent(parts[4]));
        return;
      }
    }
    setTeacherId(undefined);
    setTeacherName(undefined);
  }, [location]);

  const handleNavigate = (href: string) => {
    setLocation(href);
    setIsMobileMenuOpen(false); // Close mobile menu when navigating
  };

  // Interns list state and search
  const [interns, setInterns] = useState<(any & { id: string; teacherName?: string })[]>([]);
  const [search, setSearch] = useState("");
  const [totalInternsCount, setTotalInternsCount] = useState<number | null>(null);
  const [totalTeachersCount, setTotalTeachersCount] = useState<number | null>(null);
  const [pendingReportsCount, setPendingReportsCount] = useState<number | null>(null);

  // Load interns when userProfile is available and role is supervisor
  useEffect(() => {
    let mounted = true;
    const loadInterns = async () => {
      if (!userProfile || userProfile.role !== 'supervisor') return;
      const supUid = userProfile.uid;
      const fetched = await getInternsForSupervisor(supUid);

      // Resolve teacher names for each intern
  const teacherIds = Array.from(new Set(fetched.map((i: any) => i.teacherId).filter(Boolean)));
      const teacherMap: Record<string, string> = {};
      try {
        // Attempt to fetch teacher user profiles
        for (const tId of teacherIds) {
          const t = await getUserData(tId as string);
          if (t) {
            teacherMap[tId as string] = `${t.firstName} ${t.lastName}`;
          }
        }
      } catch (err) {
        console.error('Error resolving teacher names:', err);
      }

  const withNames = fetched.map((f: any) => ({ id: f.id, ...f, teacherName: f.teacherId ? teacherMap[f.teacherId] : undefined }));
      if (mounted) setInterns(withNames);
    };

    loadInterns();
  // Set up real-time counts for supervisor
    let unsubscribeTeachers: (() => void) | null = null;
    let unsubscribeInterns: (() => void) | null = null;
    let unsubscribeReports: (() => void) | null = null;

    const setupCounts = async (supUidParam: string) => {
      try {
        const teachersQueryRef = query(collection(db, 'teachers'), where('createdBy', '==', supUidParam));
        unsubscribeTeachers = onSnapshot(teachersQueryRef, (snap) => {
          setTotalTeachersCount(snap.size);
          const teacherIds = snap.docs.map((d: any) => d.id);

          // Interns count for these teacherIds (batched if needed)
          if (teacherIds.length === 0) {
            setTotalInternsCount(0);
            setPendingReportsCount(0);
            return;
          }

          // For simplicity handle only up to 10 teacherIds in a single 'in' query.
          const batch = teacherIds.slice(0, 10);
          const internsQueryRef = query(collection(db, 'interns'), where('teacherId', 'in', batch));
          if (unsubscribeInterns) unsubscribeInterns();
          unsubscribeInterns = onSnapshot(internsQueryRef, (internSnap: any) => {
            setTotalInternsCount(internSnap.size);
          });

          const reportsQueryRef = query(collection(db, 'reports'), where('status', '==', 'submitted'), where('teacherId', 'in', batch));
          if (unsubscribeReports) unsubscribeReports();
          unsubscribeReports = onSnapshot(reportsQueryRef, (repSnap: any) => {
            setPendingReportsCount(repSnap.size);
          });
        });
      } catch (err) {
        console.error('Error setting up supervisor counts listeners', err);
      }
    };

    if (userProfile && userProfile.role === 'supervisor') {
      setupCounts(userProfile.uid);
    }

    return () => {
      mounted = false;
      if (unsubscribeTeachers) unsubscribeTeachers();
      if (unsubscribeInterns) unsubscribeInterns();
      if (unsubscribeReports) unsubscribeReports();
    };
  }, [userProfile]);

  const internsFiltered = interns.filter(i => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const internName = `${i.firstName || ''} ${i.lastName || ''}`.toLowerCase();
    const teacherName = (i.teacherName || '').toLowerCase();
    return internName.includes(q) || teacherName.includes(q);
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const isSupervisor = userProfile?.role === "supervisor";
  const isTeacher = userProfile?.role === "teacher";
  const isIntern = userProfile?.role === "intern";

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-xl transform transition-transform duration-300 ease-in-out md:hidden ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar 
          collapsed={false} 
          onToggle={() => setIsMobileMenuOpen(false)}
          onNavigate={handleNavigate}
          currentPage={location}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
      </div>

      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar 
            collapsed={sidebarCollapsed} 
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            onNavigate={handleNavigate}
            currentPage={location}
            onMobileClose={() => setIsMobileMenuOpen(false)}
          />
        </div>
        
        <main className="flex-1 overflow-auto">
          {/* Mobile Header */}
          <div className="md:hidden bg-card border-b border-border p-4 flex items-center justify-between">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm">
                I
              </div>
              <span className="text-lg font-bold text-foreground">I-TRACK</span>
            </div>
            <div className="w-6" /> {/* Spacer for centering */}
          </div>

          {location === "/" && (
            <>
              {isSupervisor && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-dashboard-title">
                        Welcome back, {userProfile?.firstName}!
                      </h1>
                      <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
                        Manage your team and track progress from your supervisor dashboard.
                      </p>
                    </div>
                    <Badge variant="default" className="text-sm" data-testid="badge-user-role">
                      Supervisor
                    </Badge>
                  </div>
                </div>

                {/* Analytics Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-foreground">Analytics Overview</h2>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      data-testid="button-view-full-analytics"
                      onClick={() => handleNavigate("/analytics")}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Full Analytics
                    </Button>
                  </div>
                  
                  {/* Removed performance/efficiency/growth cards per change request */}
                </div>

                {/* Dashboard Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <Card data-testid="card-total-interns">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Interns</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">12</div>
                      <p className="text-xs text-muted-foreground">+2 from last month</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-total-teachers">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">3</div>
                      <p className="text-xs text-muted-foreground">+1 from last month</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-pending-reports">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">4</div>
                      <p className="text-xs text-muted-foreground">Reports awaiting review</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-quick-actions">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common supervisor tasks and actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline" 
                    data-testid="button-add-intern"
                    onClick={() => handleNavigate("/manage-teachers")}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Add New Intern
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline" 
                    data-testid="button-add-teacher"
                    onClick={() => handleNavigate("/add-teacher")}
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Add New Teacher
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity removed per change request (Option A) */}
                </div>
                </div>
              )}
            </>
          )}
          {location === "/analytics" && <Analytics />}
          {location === "/add-teacher" && <AddTeacher />}
          {location === "/settings" && <SettingsPage />}
          {location === "/dtr-reports" && userProfile?.role === "supervisor" && <DTRReportsPage />}
          {(location === "/manage-teachers" || (location.startsWith("/manage-teachers/") && !location.includes("/interns/"))) && <ManageTeachers />}
          {location.includes("/interns/") && (
            <ManageInterns teacherId={teacherId} teacherName={teacherName} />
          )}
          {location === "/manage-interns" && userProfile?.role === "supervisor" && <ManageInterns />}
          {location === "/my-interns" && <MyInterns />}
          {location === "/add-task" && <AddTask />}
          {location === "/tasks" && <TasksPage />}
          {location === "/view-tasks" && <ViewTasksPage />}
          {location === "/attendance-history" && <AttendanceHistoryPage />}
          {location === "/reports" && <ReportsPage />}
          {location === "/intern-reports" && <InternReportsPage />}
          {/* Default to dashboard for any other route */}
          {!location.includes("/analytics") && 
           !location.includes("/add-teacher") && 
           !location.includes("/settings") &&
           !location.includes("/dtr-reports") &&
           !location.includes("/manage-teachers") && 
           !location.includes("/interns/") && 
           location !== "/manage-interns" &&
           location !== "/my-interns" && 
           location !== "/add-task" && 
           location !== "/tasks" && 
           location !== "/view-tasks" && 
           location !== "/attendance-history" && 
           location !== "/reports" && 
           location !== "/intern-reports" && (
            <>
              {isSupervisor && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  {/* Welcome Section */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-dashboard-title">
                          Welcome back, {userProfile?.firstName}!
                        </h1>
                        <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
                          Manage your team and track progress from your supervisor dashboard.
                        </p>
                      </div>
                      <Badge variant="default" className="text-sm" data-testid="badge-user-role">
                        Supervisor
                      </Badge>
                    </div>
                  </div>

                  {/* Interns Section (view-only) */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">Interns</h2>
                        <p className="text-sm text-muted-foreground">Overview of interns enrolled under your supervision</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-sm text-muted-foreground">Total interns:</div>
                        <div className="text-xl font-bold">{internsFiltered.length}</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search interns or teachers..."
                        className="form-input w-full md:w-1/2 rounded px-3 py-2 bg-input text-foreground placeholder:opacity-60"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        data-testid="input-search-interns"
                        aria-label="Search interns or teachers"
                      />
                    </div>

                    <div className="bg-card rounded shadow overflow-hidden">
                      <table className="min-w-full text-left">
                        <thead className="bg-muted px-2 py-3">
                          <tr>
                            <th className="px-4 py-3 text-sm font-medium">Intern Name</th>
                            <th className="px-4 py-3 text-sm font-medium">Assigned Cooperating Teacher</th>
                          </tr>
                        </thead>
                        <tbody>
                          {internsFiltered.map((intern) => (
                            <tr key={intern.id} className="border-t">
                              <td className="px-4 py-3">{intern.firstName} {intern.lastName}</td>
                              <td className="px-4 py-3">{intern.teacherName || 'Unassigned'}</td>
                            </tr>
                          ))}
                          {internsFiltered.length === 0 && (
                            <tr>
                              <td colSpan={2} className="px-4 py-6 text-center text-sm text-muted-foreground">No interns found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card data-testid="card-quick-actions">
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>
                          Common supervisor tasks and actions
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button 
                          className="w-full justify-start" 
                          variant="outline" 
                          data-testid="button-add-intern"
                          onClick={() => handleNavigate("/manage-teachers")}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Add New Intern
                        </Button>
                        <Button 
                          className="w-full justify-start" 
                          variant="outline" 
                          data-testid="button-add-teacher"
                          onClick={() => handleNavigate("/add-teacher")}
                        >
                          <Activity className="mr-2 h-4 w-4" />
                          Add New Teacher
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Recent Activity removed per change request (Option A) */}
                  </div>
                </div>
              )}
              {isTeacher && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <TeacherDashboard />
                </div>
              )}
              {isIntern && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <InternDashboard />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
