import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, updateDoc, doc } from "firebase/firestore";
import { FileText, Check, X, Download } from "lucide-react";
import { jsPDF } from "jspdf";

interface Report {
  id: string;
  studentName: string;
  status: "Pending" | "Approved" | "Completed";
  submittedDate: Date;
  totalHours: number;
  grade: string;
}

export default function DTRReportsPage() {
  const { userProfile } = useAuth();
  const [reports, setReports] = React.useState<Report[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch reports
  React.useEffect(() => {
    const fetchReports = async () => {
      if (!userProfile?.uid) return;

      try {
        setIsLoading(true);
        const reportsRef = collection(db, "dtrReports");
        const q = query(
          reportsRef,
          where("supervisorId", "==", userProfile.uid),
          orderBy("submittedDate", "desc")
        );
        
        const snapshot = await getDocs(q);
        const reportData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          submittedDate: doc.data().submittedDate?.toDate() || new Date(),
        })) as Report[];

        setReports(reportData);
      } catch (error) {
        console.error("Error fetching DTR reports:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [userProfile]);

  // Calculate summary statistics
  const totalReports = reports.length;
  const pendingReports = reports.filter(r => r.status === "Pending").length;
  const completedReports = reports.filter(r => r.status === "Completed").length;

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
      <h1 className="text-3xl font-bold mb-6">DTR Reports</h1>

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
              {reports.map((report) => (
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
                      {report.status === "Pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(report.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
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
              {reports.length === 0 && (
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