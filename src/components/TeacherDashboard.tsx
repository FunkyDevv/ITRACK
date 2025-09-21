import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Camera,
  MapPin,
  Activity,
  Eye,
  X
} from "lucide-react";
import { AttendanceRecord, subscribeToTeacherAttendance } from "@/lib/firebase";

// Extended interface for teacher dashboard
interface EnrichedAttendanceRecord extends AttendanceRecord {
  internName: string;
}

export default function TeacherDashboard() {
  const { userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [attendanceRecords, setAttendanceRecords] = React.useState<EnrichedAttendanceRecord[]>([]);
  const [interns, setInterns] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedRecord, setSelectedRecord] = React.useState<EnrichedAttendanceRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);

  // Fetch real interns assigned to this teacher
  React.useEffect(() => {
    if (!userProfile?.uid) return;

    let unsubscribe: (() => void) | null = null;
    
    const setupRealtimeData = async () => {
      try {
        // Import the functions dynamically to avoid circular imports
        const { getTeacherInterns, getUserData } = await import('@/lib/firebase');
        
        // Fetch interns first
        const teacherInterns = await getTeacherInterns(userProfile.uid);
        setInterns(teacherInterns);
        console.log("👥 Teacher interns loaded:", teacherInterns);
        
        // Set up real-time attendance listener
        unsubscribe = subscribeToTeacherAttendance(userProfile.uid, async (records) => {
          console.log("📊 Real-time attendance update:", records);
          
          // Enrich records with intern names
          const enrichedRecords = await Promise.all(
            records.map(async (record) => {
              const internData = await getUserData(record.internId);
              return {
                ...record,
                internName: internData ? `${internData.firstName} ${internData.lastName}` : 'Unknown Intern'
              };
            })
          );
          
          setAttendanceRecords(enrichedRecords as any);
        });
        
      } catch (error) {
        console.error("❌ Error setting up real-time data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    setupRealtimeData();
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userProfile?.uid]);

  const handleApproveAttendance = async (recordId: string) => {
    try {
      const { updateAttendanceStatus } = await import('@/lib/firebase');
      await updateAttendanceStatus(recordId, 'approved');
      
      setAttendanceRecords(records =>
        records.map(record =>
          record.id === recordId
            ? { ...record, status: 'approved' as const }
            : record
        )
      );
    } catch (error) {
      console.error("❌ Error approving attendance:", error);
    }
  };

  const handleRejectAttendance = async (recordId: string) => {
    try {
      const { updateAttendanceStatus } = await import('@/lib/firebase');
      await updateAttendanceStatus(recordId, 'rejected');
      
      setAttendanceRecords(records =>
        records.map(record =>
          record.id === recordId
            ? { ...record, status: 'rejected' as const }
            : record
        )
      );
    } catch (error) {
      console.error("❌ Error rejecting attendance:", error);
    }
  };

  const openDetailsModal = (record: any) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handleApproveReject = async (recordId: string, status: 'approved' | 'rejected') => {
    try {
      if (status === 'approved') {
        await handleApproveAttendance(recordId);
      } else {
        await handleRejectAttendance(recordId);
      }
      setShowDetailsModal(false);
      
      toast({
        title: "Status Updated",
        description: `Attendance has been ${status}.`,
      });
    } catch (error) {
      console.error('Error updating attendance status:', error);
      toast({
        title: "Error",
        description: "Failed to update attendance status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const pendingCount = attendanceRecords.filter(r => r.status === 'pending').length;
  const approvedCount = attendanceRecords.filter(r => r.status === 'approved').length;
  const totalInterns = interns.length; // Real data from Firebase

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome back, {userProfile?.firstName}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your interns' attendance and track their progress
          </p>
        </div>
        <Badge variant="secondary" className="text-sm self-start sm:self-center">
          Teacher Dashboard
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interns</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInterns}</div>
            <p className="text-xs text-muted-foreground">
              Assigned to you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              Need your approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">
              Attendance approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount + pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              Interns checked in
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Attendance Management */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Attendance Approvals</CardTitle>
          <CardDescription>
            Review and approve your interns' pending time-in/out records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {attendanceRecords
              .filter(record => record.status === 'pending')
              .map((record) => (
              <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Camera className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium truncate">{record.internName}</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {record.clockIn?.toDate().toLocaleTimeString()}
                          {record.clockOut && ` - ${record.clockOut.toDate().toLocaleTimeString()}`}
                        </span>
                      </span>
                      {record.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{record.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Badge variant="secondary">
                      {record.status}
                    </Badge>
                    {record.isLate && (
                      <Badge variant="destructive" className="text-xs">
                        LATE
                      </Badge>
                    )}
                    {record.isEarly && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                        EARLY
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRecord(record);
                        setShowDetailsModal(true);
                      }}
                      className="gap-1 flex-1 sm:flex-none"
                    >
                      <Eye className="h-3 w-3" />
                      <span className="hidden sm:inline">View</span>
                    </Button>

                    <div className="flex gap-2 flex-1 sm:flex-none">
                      <Button
                        size="sm"
                        onClick={() => handleApproveAttendance(record.id!)}
                        className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                      >
                        <CheckCircle className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectAttendance(record.id!)}
                        className="border-red-300 text-red-600 hover:bg-red-50 flex-1 sm:flex-none"
                      >
                        <AlertCircle className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Reject</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {attendanceRecords.filter(record => record.status === 'pending').length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending attendance records</p>
                <p className="text-sm">All records have been reviewed</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance History</CardTitle>
          <CardDescription>
            View recently processed attendance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {attendanceRecords
              .filter(record => record.status !== 'pending')
              .slice(0, 10) // Show only last 10 processed records
              .map((record) => (
              <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4 opacity-75">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Camera className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium truncate">{record.internName}</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {record.clockIn?.toDate().toLocaleTimeString()}
                          {record.clockOut && ` - ${record.clockOut.toDate().toLocaleTimeString()}`}
                        </span>
                      </span>
                      {record.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{record.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Badge
                      variant={
                        record.status === 'approved' ? 'default' :
                        record.status === 'rejected' ? 'destructive' : 'secondary'
                      }
                    >
                      {record.status}
                    </Badge>
                    {record.isLate && (
                      <Badge variant="destructive" className="text-xs">
                        LATE
                      </Badge>
                    )}
                    {record.isEarly && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                        EARLY
                      </Badge>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedRecord(record);
                      setShowDetailsModal(true);
                    }}
                    className="gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    <span className="hidden sm:inline">View</span>
                  </Button>
                </div>
              </div>
            ))}

            {attendanceRecords.filter(record => record.status !== 'pending').length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No processed records yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing your interns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-16 sm:h-20 flex-col gap-2"
              onClick={() => setLocation('/manage-interns')}
            >
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-sm sm:text-base">View All Interns</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 sm:h-20 flex-col gap-2"
              onClick={() => setLocation('/analytics')}
            >
              <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-sm sm:text-base">View Analytics</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 sm:h-20 flex-col gap-2 sm:col-span-2 lg:col-span-1"
              onClick={() => setLocation('/calendar')}
            >
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-sm sm:text-base">Schedule Overview</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              {/* Intern Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Intern Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{selectedRecord.internName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          selectedRecord.status === 'approved' ? 'default' : 
                          selectedRecord.status === 'rejected' ? 'destructive' : 
                          'secondary'
                        }
                      >
                        {selectedRecord.status.charAt(0).toUpperCase() + selectedRecord.status.slice(1)}
                      </Badge>
                      {selectedRecord.isLate && (
                        <Badge variant="destructive" className="text-xs">
                          LATE ARRIVAL
                        </Badge>
                      )}
                      {selectedRecord.isEarly && (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                          EARLY DEPARTURE
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timing Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Timing</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Time In</p>
                    <p className="font-medium">
                      {selectedRecord.clockIn ? selectedRecord.clockIn.toDate().toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Time Out</p>
                    <p className="font-medium">
                      {selectedRecord.clockOut ? selectedRecord.clockOut.toDate().toLocaleString() : 'Not yet'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Photo */}
              {selectedRecord.photoUrl && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">Photo Verification</h3>
                  <div className="flex justify-center">
                    <img 
                      src={selectedRecord.photoUrl} 
                      alt="Attendance photo" 
                      className="max-w-full max-h-64 rounded-lg shadow-md"
                      style={{ maxHeight: '256px', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}

              {/* Location Information */}
              {selectedRecord.location && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">Location Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium">
                        {selectedRecord.location || 'Address not available'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Latitude</p>
                        <p className="font-medium">{selectedRecord.coordinates?.latitude?.toFixed(6) || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Longitude</p>
                        <p className="font-medium">{selectedRecord.coordinates?.longitude?.toFixed(6) || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {/* Map and Actions */}
                    {selectedRecord.coordinates?.latitude && selectedRecord.coordinates?.longitude && (
                      <div className="space-y-3">
                        {/* Embedded OpenStreetMap */}
                        <div className="rounded-lg overflow-hidden border">
                          <iframe
                            width="100%"
                            height="200"
                            frameBorder="0"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedRecord.coordinates.longitude-0.01},${selectedRecord.coordinates.latitude-0.01},${selectedRecord.coordinates.longitude+0.01},${selectedRecord.coordinates.latitude+0.01}&layer=mapnik&marker=${selectedRecord.coordinates.latitude},${selectedRecord.coordinates.longitude}`}
                            allowFullScreen
                          ></iframe>
                        </div>
                        

                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedRecord.status === 'pending' && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => handleApproveReject(selectedRecord.id!, 'rejected')}
                  >
                    Reject
                  </Button>
                  <Button 
                    onClick={() => handleApproveReject(selectedRecord.id!, 'approved')}
                  >
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
