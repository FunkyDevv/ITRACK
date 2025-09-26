import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  subscribeToTeacherPendingAttendance,
  updateAttendanceStatusWithDetails,
  getUserData,
  AttendanceRecord
} from "@/lib/firebase";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  User,
  LogIn,
  LogOut,
  Search,
  Camera,
  AlertTriangle,
  Activity
} from "lucide-react";

interface PendingAttendanceWithIntern extends AttendanceRecord {
  internName: string;
  internEmail: string;
  type: string; // "time-in" or "time-out" or "complete"
}

export default function TeacherAttendanceApprovals() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [pendingRecords, setPendingRecords] = React.useState<PendingAttendanceWithIntern[]>([]);
  const [filteredRecords, setFilteredRecords] = React.useState<PendingAttendanceWithIntern[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [processingApproval, setProcessingApproval] = React.useState<string | null>(null);

  // Subscribe to pending attendance records for teacher's interns
  React.useEffect(() => {
    if (!userProfile?.uid) return;

    console.log("🔔 Setting up pending attendance subscription for teacher:", userProfile.uid);
    
    const unsubscribe = subscribeToTeacherPendingAttendance(
      userProfile.uid,
      async (records: AttendanceRecord[]) => {
        console.log("📋 Received pending attendance records:", records);
        
        const enrichedRecords = await Promise.all(
          records.map(async (record) => {
            try {
              const internData = await getUserData(record.internId);
              
              // Determine type based on clockIn/clockOut
              let type = "complete";
              if (!record.clockOut) {
                type = "time-in";
              } else {
                type = "time-out";
              }
              
              return {
                ...record,
                internName: internData ? `${internData.firstName} ${internData.lastName}` : 'Unknown Intern',
                internEmail: internData?.email || 'Unknown Email',
                type: type
              } as PendingAttendanceWithIntern;
            } catch (error) {
              console.error("Error fetching intern data:", error);
              return {
                ...record,
                internName: 'Unknown Intern',
                internEmail: 'Unknown Email',
                type: record.clockOut ? "time-out" : "time-in"
              } as PendingAttendanceWithIntern;
            }
          })
        );

        setPendingRecords(enrichedRecords);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [userProfile]);

  // Filter records based on search term
  React.useEffect(() => {
    let filtered = pendingRecords;
    
    if (searchTerm.trim()) {
      filtered = pendingRecords.filter(record =>
        record.internName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.internEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredRecords(filtered);
  }, [pendingRecords, searchTerm]);

  const handleApproval = async (recordId: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      setProcessingApproval(recordId);
      
      await updateAttendanceStatusWithDetails(recordId, {
        status,
        approvalReason: reason,
        approvedAt: new Date(),
        approvedBy: userProfile?.uid
      });

      toast({
        title: status === 'approved' ? "Record Approved" : "Record Rejected",
        description: `Attendance record has been ${status} successfully.`,
        variant: status === 'approved' ? "default" : "destructive"
      });

      console.log(`✅ Attendance record ${status}:`, recordId);
    } catch (error) {
      console.error("Error updating attendance status:", error);
      toast({
        title: "Error",
        description: "Failed to update attendance record. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessingApproval(null);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'time-in':
        return <LogIn className="h-4 w-4 text-green-600" />;
      case 'time-out':
        return <LogOut className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'time-in':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'time-out':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Attendance Approvals
          </CardTitle>
          <CardDescription>
            Review and approve attendance records from your interns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Attendance Approvals
            </CardTitle>
            <CardDescription>
              Review and approve attendance records from your interns
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {pendingRecords.length} Pending
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by intern name, email, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Approval Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {pendingRecords.length}
              </div>
              <div className="text-sm text-orange-700">Total Pending</div>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {pendingRecords.filter(r => r.type === 'time-in').length}
              </div>
              <div className="text-sm text-blue-700">Time-in Only</div>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {pendingRecords.filter(r => r.type === 'time-out').length}
              </div>
              <div className="text-sm text-green-700">Complete Sessions</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Records */}
        <div className="space-y-4">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-600">
                {searchTerm.trim() 
                  ? "No attendance records match your search criteria"
                  : "There are no pending attendance records from your interns requiring approval"
                }
              </p>
            </div>
          ) : (
            filteredRecords.map((record) => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(record.type)}
                        <Badge className={`border ${getTypeBadgeColor(record.type)}`}>
                          {record.type}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <h4 className="font-semibold text-lg">{record.internName}</h4>
                          <p className="text-sm text-muted-foreground">{record.internEmail}</p>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(record.clockIn.toDate())}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTime(record.clockIn.toDate())}
                          </div>
                          {record.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span className="truncate max-w-48" title={record.location}>
                                {record.location.length > 30 ? record.location.substring(0, 30) + '...' : record.location}
                              </span>
                            </div>
                          )}
                        </div>

                        {record.photoUrl && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Camera className="h-4 w-4" />
                            <span>Photo attached</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            disabled={processingApproval === record.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Attendance Record</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to reject this {record.type} record for {record.internName}?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleApproval(record.id!, 'rejected')}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Reject Record
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      
                      <Button 
                        onClick={() => handleApproval(record.id!, 'approved')}
                        disabled={processingApproval === record.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingApproval === record.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                    </div>
                  </div>

                  {record.photoUrl && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Attached Photo:</p>
                      <img 
                        src={record.photoUrl} 
                        alt="Attendance photo"
                        className="max-w-48 max-h-48 rounded-lg border shadow-sm object-cover cursor-pointer"
                        onClick={() => window.open(record.photoUrl, '_blank')}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}