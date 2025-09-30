import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { 
  getInternAttendanceRecords, 
  getCurrentAttendanceSession,
  getPendingAttendanceSession,
  AttendanceRecord,
  submitDTR
} from "@/lib/firebase";
import { 
  Clock, 
  Download, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  MapPin,
  LogIn,
  LogOut,
  Search,
  Filter,
  TrendingUp,
  Activity,
  User,
  FileText
} from "lucide-react";
import { jsPDF } from "jspdf";

// Enhanced interface for attendance with calculated fields
interface AttendanceWithStats extends AttendanceRecord {
  totalHours: number;
  isToday: boolean;
  isThisWeek: boolean;
  isThisMonth: boolean;
}

export default function AttendanceHistoryPage() {
  const { userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [attendanceRecords, setAttendanceRecords] = React.useState<AttendanceWithStats[]>([]);
  const [filteredRecords, setFilteredRecords] = React.useState<AttendanceWithStats[]>([]);
  const [currentSession, setCurrentSession] = React.useState<AttendanceRecord | null>(null);
  const [pendingSession, setPendingSession] = React.useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [dateRange, setDateRange] = React.useState<string>("all");
  const [selectedMonth, setSelectedMonth] = React.useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // Button state for DTR submission
  const [isSubmittingDTR, setIsSubmittingDTR] = React.useState(false);
  const [dtrSubmitted, setDtrSubmitted] = React.useState(false);
  const [dtrError, setDtrError] = React.useState<string | null>(null);

  // Helper: Only allow DTR submission if there is at least one approved record in the current month
  const approvedRecordsThisMonth = React.useMemo(() => {
    const now = new Date();
    return attendanceRecords.filter((r: AttendanceWithStats) => {
      return r.status === "approved" && r.createdAt.toDate().getMonth() === now.getMonth() && r.createdAt.toDate().getFullYear() === now.getFullYear();
    });
  }, [attendanceRecords]);

  // Fetch attendance data
  React.useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!userProfile?.uid) return;

      try {
        setIsLoading(true);
        // ...existing code...
        // Ensure correct types for fetched data
        const [historyRaw, currentRaw, pendingRaw] = await Promise.all([
          getInternAttendanceRecords(userProfile.uid),
          getCurrentAttendanceSession(userProfile.uid),
          getPendingAttendanceSession(userProfile.uid)
        ]);

        const history: AttendanceRecord[] = Array.isArray(historyRaw) ? historyRaw : [];
        const current: AttendanceRecord | null = currentRaw || null;
        const pending: AttendanceRecord | null = pendingRaw || null;

        const enhancedRecords: AttendanceWithStats[] = history.map((record: AttendanceRecord) => {
          const recordDate = record.createdAt.toDate();
          const today = new Date();
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

          // Calculate total hours for completed sessions
          let totalHours = 0;
          if (record.clockIn && record.clockOut) {
            const clockInTime = record.clockIn.toDate().getTime();
            const clockOutTime = record.clockOut.toDate().getTime();
            totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
          }

          return {
            ...record,
            totalHours,
            isToday: recordDate.toDateString() === today.toDateString(),
            isThisWeek: recordDate >= weekAgo,
            isThisMonth: recordDate >= monthStart
          };
        });

        setAttendanceRecords(enhancedRecords);
  setCurrentSession(current);
  setPendingSession(pending);
      } catch (error) {
        console.error("❌ Error fetching attendance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, [userProfile]);

  // Filter records based on search and filters
  React.useEffect(() => {
    let filtered = attendanceRecords;

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      switch (dateRange) {
        case "today":
          filtered = filtered.filter(r => r.isToday);
          break;
        case "week":
          filtered = filtered.filter(r => r.isThisWeek);
          break;
        case "month":
          filtered = filtered.filter(r => r.isThisMonth);
          break;
        case "custom":
          const [year, month] = selectedMonth.split("-");
          const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
          const endDate = new Date(parseInt(year), parseInt(month), 0);
          filtered = filtered.filter(r => {
            const recordDate = r.createdAt.toDate();
            return recordDate >= startDate && recordDate <= endDate;
          });
          break;
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.createdAt.toDate().toLocaleDateString().toLowerCase().includes(search) ||
        r.status.toLowerCase().includes(search) ||
        (typeof r.location === 'string' && r.location.toLowerCase().includes(search)) ||
        (typeof r.location === 'object' && (r.location as any).address?.toLowerCase().includes(search))
      );
    }

    setFilteredRecords(filtered);
  }, [attendanceRecords, searchTerm, statusFilter, dateRange, selectedMonth]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const completedRecords = filteredRecords.filter(r => r.clockIn && r.clockOut);
    const totalHours = completedRecords.reduce((sum, r) => sum + r.totalHours, 0);
    const totalDays = new Set(
      completedRecords.map(r => r.createdAt.toDate().toDateString())
    ).size;
    
    const averageHours = totalDays > 0 ? totalHours / totalDays : 0;
    const approvedCount = filteredRecords.filter(r => r.status === 'approved').length;
    const pendingCount = filteredRecords.filter(r => r.status === 'pending').length;
    const rejectedCount = filteredRecords.filter(r => r.status === 'rejected').length;

    return {
      totalHours,
      totalDays,
      averageHours,
      approvedCount,
      pendingCount,
      rejectedCount
    };
  }, [filteredRecords]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("Attendance History Report", 20, 20);
    
    // User info
    doc.setFontSize(12);
    doc.text(`Intern: ${userProfile?.firstName} ${userProfile?.lastName}`, 20, 35);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
    
    // Summary
    doc.setFontSize(14);
    doc.text("Summary Statistics", 20, 65);
    doc.setFontSize(10);
    doc.text(`Total Days: ${stats.totalDays}`, 25, 75);
    doc.text(`Total Hours: ${stats.totalHours.toFixed(2)}`, 25, 85);
    doc.text(`Average Hours/Day: ${stats.averageHours.toFixed(2)}`, 25, 95);
    doc.text(`Approved: ${stats.approvedCount}`, 25, 105);
    doc.text(`Pending: ${stats.pendingCount}`, 25, 115);
    
    // Records
    doc.setFontSize(12);
    doc.text("Attendance Records", 20, 135);
    
    let y = 145;
    doc.setFontSize(8);
    filteredRecords.forEach((record, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const date = record.createdAt.toDate().toLocaleDateString();
      const timeIn = record.clockIn ? record.clockIn.toDate().toLocaleTimeString() : 'N/A';
      const timeOut = record.clockOut ? record.clockOut.toDate().toLocaleTimeString() : 'N/A';
      const hours = record.totalHours.toFixed(2);
      
      doc.text(`${date} | ${timeIn} - ${timeOut} | ${hours}h | ${record.status}`, 25, y);
      y += 10;
    });
    
    doc.save(`attendance_history_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Add a button for submitting DTR reports
  const handleSubmitDTR = async () => {
    if (!userProfile) {
      console.error("User profile is null. Cannot submit DTR.");
      return;
    }

    try {
      const response = await submitDTR(userProfile); // Pass userProfile dynamically
      console.log("DTR submitted successfully", response);
    } catch (error) {
      console.error("Error submitting DTR", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Attendance History</h1>
          <p className="text-muted-foreground">Your recent time-in/out records and approval status</p>
        </div>
        <Button onClick={handleExportPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>
      {/* Current Status Alert */}
      {(currentSession || pendingSession) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {currentSession ? 'You are currently clocked in' : 'You have a pending session awaiting approval'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDays}</div>
            <p className="text-xs text-muted-foreground">Days attended</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Hours worked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Hours</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Hours per day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approvedCount}</div>
            <p className="text-xs text-muted-foreground">Sessions approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Records</CardTitle>
          <CardDescription>Search and filter your attendance history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by date, status, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              
              {dateRange === "custom" && (
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-40"
                />
              )}
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Attendance Records ({filteredRecords.length})
          </CardTitle>
          <CardDescription>
            Detailed view of your time-in/out records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <div key={record.id} className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {record.createdAt.toDate().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h4>
                    {getStatusBadge(record.status)}
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Time In */}
                    <div className="flex items-center gap-2">
                      <LogIn className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="text-sm font-medium">Time In</div>
                        <div className="text-sm text-muted-foreground">
                          {record.clockIn ? record.clockIn.toDate().toLocaleTimeString() : 'Not recorded'}
                        </div>
                      </div>
                    </div>

                    {/* Time Out */}
                    <div className="flex items-center gap-2">
                      <LogOut className="h-4 w-4 text-red-600" />
                      <div>
                        <div className="text-sm font-medium">Time Out</div>
                        <div className="text-sm text-muted-foreground">
                          {record.clockOut ? record.clockOut.toDate().toLocaleTimeString() : 'Not recorded'}
                        </div>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="text-sm font-medium">Duration</div>
                        <div className="text-sm text-muted-foreground">
                          {record.totalHours > 0 ? `${record.totalHours.toFixed(2)} hours` : 'Incomplete'}
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-purple-600" />
                      <div>
                        <div className="text-sm font-medium">Location</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {typeof record.location === 'string' 
                            ? record.location 
                            : (record.location as any)?.address || 'Unknown location'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(record.photoUrl || record.isEarly) && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        {record.photoUrl && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Photo captured</span>
                            <img
                              src={record.photoUrl}
                              alt="Attendance photo"
                              className="w-8 h-8 rounded object-cover border"
                            />
                          </div>
                        )}
                        {record.isEarly && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            Early Departure
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredRecords.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No attendance records found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || dateRange !== "all" 
                    ? "Try adjusting your filters to see more records"
                    : "Start clocking in to track your attendance"
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Submit DTR Report Button */}
      <div className="mt-6 flex flex-col items-center">
        <Button
          variant={dtrSubmitted ? "outline" : "default"}
          disabled={isSubmittingDTR || (userProfile?.role === "intern" && (approvedRecordsThisMonth.length === 0 || dtrSubmitted))}
          onClick={async () => {
            // Dynamic behavior based on user role
            if (userProfile?.role === "supervisor") {
              // Navigate to DTR reports page for supervisors
              setLocation("/dtr-reports");
              return;
            }
            
            // Submit DTR for interns
            setIsSubmittingDTR(true);
            setDtrError(null);
            try {
              await handleSubmitDTR();
              setDtrSubmitted(true);
            } catch (err) {
              setDtrError("Failed to submit DTR. Please try again.");
            } finally {
              setIsSubmittingDTR(false);
            }
          }}
          className="gap-2 px-6 py-2 text-base font-semibold"
        >
          {isSubmittingDTR ? (
            <>
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              Submitting...
            </>
          ) : dtrSubmitted ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              Submitted!
            </>
          ) : userProfile?.role === "supervisor" ? (
            <>
              <FileText className="h-5 w-5" />
              View DTR Reports
            </>
          ) : (
            <>
              <FileText className="h-5 w-5" />
              Submit DTR Report
            </>
          )}
        </Button>
        {userProfile?.role === "intern" && approvedRecordsThisMonth.length === 0 && !dtrSubmitted && (
          <span className="text-sm text-muted-foreground mt-2">You need at least one approved attendance record this month to submit a DTR.</span>
        )}
        {dtrError && (
          <span className="text-sm text-red-600 mt-2">{dtrError}</span>
        )}
      </div>
    </div>
  );
}