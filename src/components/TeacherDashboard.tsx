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
  FileText,
  Eye,
  X
} from "lucide-react";
import { UserData, getInternsForTeacher, subscribeToTeacherAttendance, AttendanceRecord } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  
  // Attendance tracking states
  const [recentAttendance, setRecentAttendance] = React.useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = React.useState(true);
  const [selectedAttendance, setSelectedAttendance] = React.useState<AttendanceRecord | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = React.useState(false);

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

  // Subscribe to attendance records for teacher's interns
  React.useEffect(() => {
    if (!userProfile?.uid) return;

    console.log("📡 Setting up attendance subscription for teacher:", userProfile.uid);
    setLoadingAttendance(true);
    
    const unsubscribe = subscribeToTeacherAttendance(
      userProfile.uid,
      (attendanceRecords) => {
        console.log("📊 Received attendance records:", attendanceRecords);
        // Get the most recent 5 approved records
        const approvedRecords = attendanceRecords
          .filter(record => record.status === 'approved')
          .slice(0, 5);
        setRecentAttendance(approvedRecords);
        setLoadingAttendance(false);
      }
    );

    return () => {
      console.log("🔄 Cleaning up attendance subscription");
      unsubscribe();
    };
  }, [userProfile?.uid]);

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

  // Helper function to format attendance time
  const formatAttendanceTime = (timeIn: any, timeOut: any) => {
    if (!timeIn) return "No time recorded";
    
    const formatTime = (timestamp: any) => {
      if (!timestamp) return null;
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    };

    const timeInFormatted = formatTime(timeIn);
    const timeOutFormatted = timeOut ? formatTime(timeOut) : "Still active";
    
    return `${timeInFormatted} - ${timeOutFormatted}`;
  };

  // Helper function to get intern name from attendance record
  const getInternName = (attendanceRecord: AttendanceRecord) => {
    const intern = interns.find(i => i.id === attendanceRecord.internId || i.uid === attendanceRecord.internId);
    if (intern) {
      return `${intern.firstName} ${intern.lastName}`;
    }
    return attendanceRecord.internName || `Intern ${attendanceRecord.internId?.substring(0, 8)}...`;
  };

  // Handler for viewing attendance details
  const handleViewAttendance = (record: AttendanceRecord) => {
    setSelectedAttendance(record);
    setShowAttendanceModal(true);
  };

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
            {loadingAttendance ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground">Loading attendance records...</span>
                </div>
              </div>
            ) : recentAttendance.length > 0 ? (
              recentAttendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{getInternName(record)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatAttendanceTime(record.timeIn, record.timeOut)} • {record.location?.address || "Location not recorded"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewAttendance(record)}
                      className="hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-medium mb-1">No attendance records yet</h3>
                <p className="text-sm text-muted-foreground">
                  Approved attendance records from your interns will appear here
                </p>
              </div>
            )}
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

      {/* Attendance Approvals Section */}
      <div className="mt-8">
        <TeacherAttendanceApprovals />
      </div>

      {/* Attendance Details Modal */}
      <Dialog open={showAttendanceModal} onOpenChange={setShowAttendanceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Attendance Details</span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedAttendance && (
            <div className="space-y-4">
              {/* Intern Information */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Intern Information
                </h4>
                <p><strong>Name:</strong> {getInternName(selectedAttendance)}</p>
                <p><strong>Date:</strong> {selectedAttendance.timeIn 
                  ? new Date(selectedAttendance.timeIn.toDate ? selectedAttendance.timeIn.toDate() : selectedAttendance.timeIn).toLocaleDateString()
                  : "Not recorded"
                }</p>
              </div>

              {/* Time Information */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Time Information
                </h4>
                <p><strong>Time In:</strong> {selectedAttendance.timeIn 
                  ? new Date(selectedAttendance.timeIn.toDate ? selectedAttendance.timeIn.toDate() : selectedAttendance.timeIn).toLocaleTimeString()
                  : "Not recorded"
                }</p>
                <p><strong>Time Out:</strong> {selectedAttendance.timeOut
                  ? new Date(selectedAttendance.timeOut.toDate ? selectedAttendance.timeOut.toDate() : selectedAttendance.timeOut).toLocaleTimeString()
                  : "Still active"
                }</p>
                <p><strong>Duration:</strong> {
                  selectedAttendance.timeIn && selectedAttendance.timeOut 
                    ? (() => {
                        const timeIn = selectedAttendance.timeIn.toDate ? selectedAttendance.timeIn.toDate() : new Date(selectedAttendance.timeIn);
                        const timeOut = selectedAttendance.timeOut.toDate ? selectedAttendance.timeOut.toDate() : new Date(selectedAttendance.timeOut);
                        const diff = timeOut.getTime() - timeIn.getTime();
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        return `${hours}h ${minutes}m`;
                      })()
                    : "Ongoing"
                }</p>
              </div>

              {/* Location Information */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Location Information
                </h4>
                <p><strong>Address:</strong> {selectedAttendance.location?.address || "Not recorded"}</p>
                {selectedAttendance.location?.latitude && selectedAttendance.location?.longitude && (
                  <p><strong>Coordinates:</strong> {selectedAttendance.location.latitude.toFixed(6)}, {selectedAttendance.location.longitude.toFixed(6)}</p>
                )}
              </div>

              {/* Status Information */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Status Information
                </h4>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {selectedAttendance.status?.charAt(0).toUpperCase() + selectedAttendance.status?.slice(1) || "Pending"}
                  </Badge>
                </div>
                {selectedAttendance.approvedAt && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Approved on {new Date(selectedAttendance.approvedAt.toDate ? selectedAttendance.approvedAt.toDate() : selectedAttendance.approvedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAttendanceModal(false)}
                  className="flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Close</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}