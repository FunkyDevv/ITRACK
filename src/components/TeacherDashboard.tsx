import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Users,
  GraduationCap,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  MapPin,
  Activity,
  Search,
  Loader2,
  Plus,
  User,
  Calendar,
  BarChart3,
  FileText
} from "lucide-react";
import { UserData, getInternsForTeacher } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import TeacherAttendanceApprovals from "./TeacherAttendanceApprovals";

// Interface for teacher-specific intern view
interface TeacherIntern extends UserData {
  id: string;
}

export default function TeacherDashboard() {
  const { userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [interns, setInterns] = React.useState<TeacherIntern[]>([]);
  const [filteredInterns, setFilteredInterns] = React.useState<TeacherIntern[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Fetch teacher's assigned interns
  React.useEffect(() => {
    const fetchInterns = async () => {
      if (!userProfile?.uid) return;
      
      try {
        console.log("👨‍🏫 Fetching interns for teacher:", userProfile.uid);
        const teacherInterns = await getInternsForTeacher(userProfile.uid);
        console.log("📚 Found teacher interns:", teacherInterns);
        setInterns(teacherInterns);
      } catch (error) {
        console.error("Error fetching teacher interns:", error);
        toast({
          title: "Error",
          description: "Failed to load your assigned interns.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterns();
  }, [userProfile?.uid, toast]);

  // Filter interns based on search term
  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredInterns(interns);
    } else {
      const filtered = interns.filter(intern =>
        `${intern.firstName} ${intern.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        intern.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInterns(filtered);
    }
  }, [interns, searchTerm]);

  const totalInterns = interns.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading teacher dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {userProfile?.firstName}!
          </h1>
          <p className="text-gray-600">
            Manage your assigned interns and approve their attendance from your teacher dashboard.
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          Teacher
        </Badge>
      </div>

      {/* Attendance Approvals Section - Main Feature */}
      <TeacherAttendanceApprovals />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Interns</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInterns}</div>
            <p className="text-xs text-muted-foreground">
              Interns assigned to your supervision
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Attendance History</CardTitle>
          <CardDescription>
            View recently processed attendance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Mock attendance record */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Intern 01</p>
                  <p className="text-sm text-muted-foreground">
                    9:00 AM - 11:00 AM • 9 Mahogany Street, Santa Cruz, Bagong Bayani Day Care
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Approved</Badge>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            </div>
            {/* Add more attendance records as needed */}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>
            Essential tasks for managing your interns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="h-16 flex-col space-y-2"
              onClick={() => setLocation("/my-interns")}
            >
              <Users className="h-5 w-5" />
              <span className="text-sm">View All Interns</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-16 flex-col space-y-2"
              onClick={() => setLocation("/add-task")}
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm">Add Tasks</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My Interns Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Assigned Interns</CardTitle>
              <CardDescription>
                Overview of all interns assigned to your supervision
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search interns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Interns List */}
          <div className="space-y-3">
            {filteredInterns.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm.trim() ? "No interns found" : "No interns assigned"}
                </h3>
                <p className="text-gray-600">
                  {searchTerm.trim() 
                    ? "Try adjusting your search criteria" 
                    : "You don't have any interns assigned to you yet"
                  }
                </p>
              </div>
            ) : (
              filteredInterns.map((intern) => (
                <Card key={intern.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">
                            {intern.firstName} {intern.lastName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {intern.email}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant="default">Active</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}