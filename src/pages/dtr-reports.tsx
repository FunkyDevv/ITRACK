import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, updateDoc, doc, onSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";
import { FileText, Check, X, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { useState } from "react";

// Updated Report interface to include "Rejected" status
interface Report {
  id: string;
  studentName: string;
  status: "Pending" | "Approved" | "Completed" | "Rejected" | "submitted";
  submittedDate: Date;
  totalHours: number;
  grade: string;
}

export default function DTRReportsPage() {
  const { userProfile } = useAuth();
  const [reports, setReports] = React.useState<Report[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filter, setFilter] = useState("Pending");
  const [debugMode, setDebugMode] = React.useState(false);
  const [allReports, setAllReports] = React.useState<Report[]>([]);

  // Real-time subscribe to DTR reports for supervisor
  React.useEffect(() => {
    if (!userProfile?.uid) return;
    setIsLoading(true);
    console.log("🔍 Setting up DTR reports subscription for supervisor:", userProfile.uid);

    const reportsRef = collection(db, "dtrReports");
    const q = query(
      reportsRef,
      where("supervisorId", "==", userProfile.uid)
    );

    console.log("📋 Query created for supervisorId:", userProfile.uid);

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      console.log("📊 DTR reports snapshot received, docs count:", snapshot.docs.length);
      const reportData = snapshot.docs.map((doc: DocumentData) => {
        const data = doc.data();
        console.log("📄 DTR report:", doc.id, "data:", data);
        return {
          id: doc.id,
          ...data,
          submittedDate: data.submittedAt?.toDate() || data.submittedDate?.toDate() || new Date(),
          totalHours: data.totalHours || 0,
          grade: data.grade || "",
        };
      }) as Report[];
      setReports(reportData);
      setIsLoading(false);
    }, (error: any) => {
      console.error("❌ Error fetching DTR reports:", error);
      // If filtering by supervisorId fails, try to get all reports for debugging
      console.log("🔄 Trying to fetch all DTR reports for debugging...");
      const allReportsQuery = query(collection(db, "dtrReports"));
      getDocs(allReportsQuery).then(allSnapshot => {
        console.log("🔧 All DTR reports in database:", allSnapshot.docs.length);
        allSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log("🔧 DTR:", doc.id, "supervisorId:", data.supervisorId, "status:", data.status, "studentName:", data.studentName);
        });
      });
      setIsLoading(false);
    });

    // Also fetch ALL DTR reports for debugging
    const debugUnsubscribe = onSnapshot(collection(db, "dtrReports"), (allSnapshot) => {
      console.log("🔧 DEBUG: All DTR reports in database:", allSnapshot.docs.length);
      const allReportData = allSnapshot.docs.map((doc: DocumentData) => ({
        id: doc.id,
        ...doc.data(),
        submittedDate: doc.data().submittedAt?.toDate() || doc.data().submittedDate?.toDate() || new Date(),
        totalHours: doc.data().totalHours || 0,
        grade: doc.data().grade || "",
      })) as Report[];
      setAllReports(allReportData);
      allSnapshot.docs.forEach((doc) => {
        console.log("🔧 DEBUG DTR:", doc.id, "supervisorId:", doc.data().supervisorId, "status:", doc.data().status);
      });
    });

    return () => {
      unsubscribe();
      debugUnsubscribe();
    };
  }, [userProfile?.uid]);

  // Calculate summary statistics
  const displayReports = debugMode ? allReports : reports;
  const totalReports = displayReports.length;
  // Treat 'submitted' and 'Pending' as pending for supervisor
  const pendingReports = displayReports.filter(r => r.status === "Pending" || r.status === "submitted").length;
  const completedReports = displayReports.filter(r => r.status === "Completed" || r.status === "Approved").length;

  const filteredReports = (debugMode ? allReports : reports).filter((report) => {
    if (filter === "Pending") return report.status === "Pending" || report.status === "submitted";
    if (filter === "Completed") return report.status === "Completed" || report.status === "Approved";
    return true; // Total Reports
  });

  // Handle report approval
  const handleApprove = async (reportId: string) => {
    try {
      await updateDoc(doc(db, "dtrReports", reportId), {
        status: "Approved"
      });
      
      setReports(reports.map(report => 
        report.id === reportId 
          ? { ...report, status: "Approved" } 
          : report
      ));
    } catch (error) {
      console.error("Error approving report:", error);
    }
  };

  const handleReject = async (reportId: string) => {
    try {
      await updateDoc(doc(db, "dtrReports", reportId), {
        status: "Rejected"
      });
      
      setReports(reports.map(report => 
        report.id === reportId 
          ? { ...report, status: "Rejected" } 
          : report
      ));
    } catch (error) {
      console.error("Error rejecting report:", error);
    }
  };

  // Generate and download PDF report
  const handleDownloadPDF = (report: Report) => {
    const pdf = new jsPDF();
    
    // Add header
    pdf.setFontSize(20);
    pdf.text("Student DTR Report", 20, 20);
    
    // Add report details
    pdf.setFontSize(12);
    pdf.text(`Student Name: ${report.studentName}`, 20, 40);
    pdf.text(`Status: ${report.status}`, 20, 50);
    pdf.text(`Submitted Date: ${report.submittedDate.toLocaleDateString()}`, 20, 60);
    pdf.text(`Total Hours: ${report.totalHours}`, 20, 70);
    pdf.text(`Grade: ${report.grade}`, 20, 80);
    
    // Save the PDF
    pdf.save(`${report.studentName.replace(" ", "_")}_DTR_Report.pdf`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">DTR Reports</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setDebugMode(!debugMode)}
          className="text-xs"
        >
          {debugMode ? "Show Filtered" : "Debug: Show All"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReports}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Badge variant="secondary">{pendingReports}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReports}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Reports</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedReports}</div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex justify-end p-4">
            <Button 
              variant={filter === "Pending" ? "default" : "outline"} 
              onClick={() => setFilter("Pending")}
              className="mr-2"
            >
              Pending
            </Button>
            <Button 
              variant={filter === "Completed" ? "default" : "outline"} 
              onClick={() => setFilter("Completed")}
              className="mr-2"
            >
              Completed
            </Button>
            <Button 
              variant={filter === "Total Reports" ? "default" : "outline"} 
              onClick={() => setFilter("Total Reports")}
            >
              Total Reports
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{report.studentName}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        report.status === "Approved" ? "outline" :
                        report.status === "Pending" ? "secondary" : "default"
                      }
                    >
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{report.submittedDate.toLocaleDateString()}</TableCell>
                  <TableCell>{report.totalHours} hrs</TableCell>
                  <TableCell>{report.grade}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {(report.status === "Pending" || report.status === "submitted") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(report.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      {(report.status === "Pending" || report.status === "submitted") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(report.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPDF(report)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredReports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No DTR reports found
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