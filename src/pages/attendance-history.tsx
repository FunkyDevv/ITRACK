import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { Clock, Download, FileText } from "lucide-react";
import { jsPDF } from "jspdf";

interface Attendance {
  id: string;
  date: Date;
  timeIn: Date;
  timeOut: Date;
  totalHours: number;
  status: "pending" | "approved";
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
}

export default function AttendanceHistoryPage() {
  const { userProfile } = useAuth();
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedMonth, setSelectedMonth] = React.useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // Fetch attendance records
  React.useEffect(() => {
    const fetchAttendance = async () => {
      if (!userProfile?.uid) return;

      try {
        setIsLoading(true);
        const attendanceRef = collection(db, "attendance");
        const [year, month] = selectedMonth.split("-");
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);

        const q = query(
          attendanceRef,
          where("internId", "==", userProfile.uid),
          where("date", ">=", startDate),
          where("date", "<=", endDate),
          orderBy("date", "desc")
        );
        
        const snapshot = await getDocs(q);
        const attendanceData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate() || new Date(),
          timeIn: doc.data().timeIn?.toDate() || new Date(),
          timeOut: doc.data().timeOut?.toDate() || new Date(),
        })) as Attendance[];

        setAttendance(attendanceData);
      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [userProfile, selectedMonth]);

  // Calculate summary statistics
  const totalHours = attendance.reduce((sum, record) => sum + record.totalHours, 0);
  const totalDays = new Set(attendance.map(record => 
    record.date.toISOString().split("T")[0]
  )).size;

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Add header
    doc.setFontSize(20);
    doc.text("Attendance Report", 20, 20);
    
    // Add summary
    doc.setFontSize(12);
    doc.text(`Month: ${new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}`, 20, 40);
    doc.text(`Total Days: ${totalDays}`, 20, 50);
    doc.text(`Total Hours: ${totalHours.toFixed(2)}`, 20, 60);
    
    // Add attendance records
    doc.text("Attendance Records:", 20, 80);
    let y = 90;
    attendance.forEach((record, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${record.date.toLocaleDateString()} - ${record.totalHours.toFixed(2)} hours`, 30, y);
      y += 10;
    });
    
    doc.save(`attendance_report_${selectedMonth}.pdf`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Attendance History</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Days</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDays}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Actions */}
      <div className="flex items-center justify-between mb-6">
        <Select
          value={selectedMonth}
          onValueChange={setSelectedMonth}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              const value = date.toISOString().slice(0, 7);
              return (
                <SelectItem key={value} value={value}>
                  {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button onClick={handleDownloadPDF}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.date.toLocaleDateString()}</TableCell>
                  <TableCell>{record.timeIn.toLocaleTimeString()}</TableCell>
                  <TableCell>{record.timeOut.toLocaleTimeString()}</TableCell>
                  <TableCell>{record.totalHours.toFixed(2)} hrs</TableCell>
                  <TableCell>
                    <Badge 
                      variant={record.status === "approved" ? "outline" : "secondary"}
                    >
                      {record.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {attendance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No attendance records found for the selected month
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}