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
  FileText,
  Calendar,
  Clock,
  ArrowLeft,
  Eye,
  Filter,
  SortAsc,
  MessageSquare,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Paperclip,
  Download,
  Search,
  Users,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Report interface (same as in reports.tsx)
interface Report {
  id?: string;
  title: string;
  description: string;
  content: string;
  type: 'daily' | 'weekly' | 'monthly' | 'incident' | 'project' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected';
  internId: string;
  teacherId: string;
  attachmentUrl?: string;
  submittedAt?: Timestamp;
  reviewedAt?: Timestamp;
  feedback?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Intern profile for displaying names
interface InternProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function InternReportsPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [reports, setReports] = React.useState<Report[]>([]);
  const [interns, setInterns] = React.useState<InternProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<Report | null>(null);
  const [isReviewing, setIsReviewing] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [filterIntern, setFilterIntern] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("submittedAt");
  const [searchTerm, setSearchTerm] = React.useState("");
  
  // Review form state
  const [reviewFeedback, setReviewFeedback] = React.useState("");
  const [reviewAction, setReviewAction] = React.useState<'approve' | 'reject' | null>(null);

  // Load reports and interns
  React.useEffect(() => {
    if (!userProfile?.uid) return;

    let unsubscribeReports: (() => void) | null = null;
    let unsubscribeInterns: (() => void) | null = null;

    const setupListeners = async () => {
      try {
        setIsLoading(true);
        
        // Set up real-time reports listener
        const reportsQuery = query(
          collection(db, "reports"),
          where("teacherId", "==", userProfile.uid),
          where("status", "in", ["submitted", "reviewed", "approved", "rejected"]),
          orderBy("submittedAt", "desc")
        );
        
        unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
          const reportsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Report[];
          console.log("📋 Real-time reports update:", reportsData);
          setReports(reportsData);
          setIsLoading(false);
        });

        // Set up real-time interns listener
        const internsQuery = query(
          collection(db, "users"),
          where("teacherId", "==", userProfile.uid),
          where("role", "==", "intern")
        );
        
        unsubscribeInterns = onSnapshot(internsQuery, (snapshot) => {
          const internsData = snapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
          })) as InternProfile[];
          console.log("👥 Real-time interns update:", internsData);
          setInterns(internsData);
        });

      } catch (error) {
        console.error("❌ Error setting up listeners:", error);
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to load reports",
          variant: "destructive",
        });
      }
    };

    setupListeners();

    return () => {
      if (unsubscribeReports) {
        unsubscribeReports();
      }
      if (unsubscribeInterns) {
        unsubscribeInterns();
      }
    };
  }, [userProfile?.uid, toast]);

  const getInternName = (internId: string) => {
    const intern = interns.find(i => i.uid === internId);
    return intern ? `${intern.firstName} ${intern.lastName}` : "Unknown Intern";
  };

  const submitReview = async (status: 'approved' | 'rejected') => {
    if (!selectedReport?.id) return;

    try {
      setIsReviewing(true);
      
      await updateDoc(doc(db, "reports", selectedReport.id), {
        status: status,
        feedback: reviewFeedback.trim() || null,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Review Submitted",
        description: `Report has been ${status}`,
      });

      // Reset form and close modal
      setReviewFeedback("");
      setReviewAction(null);
      setShowDetailsModal(false);
      
    } catch (error) {
      console.error("❌ Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'weekly':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'monthly':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'incident':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'project':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'reviewed':
        return 'bg-purple-100 text-purple-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilteredAndSortedReports = () => {
    let filteredReports = reports;

    // Filter by search term
    if (searchTerm.trim()) {
      filteredReports = filteredReports.filter(report =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getInternName(report.internId).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      filteredReports = filteredReports.filter(report => report.status === filterStatus);
    }

    // Filter by type
    if (filterType !== "all") {
      filteredReports = filteredReports.filter(report => report.type === filterType);
    }

    // Filter by intern
    if (filterIntern !== "all") {
      filteredReports = filteredReports.filter(report => report.internId === filterIntern);
    }

    // Sort reports
    filteredReports.sort((a, b) => {
      switch (sortBy) {
        case "submittedAt":
          const aDate = a.submittedAt ? a.submittedAt.toDate().getTime() : 0;
          const bDate = b.submittedAt ? b.submittedAt.toDate().getTime() : 0;
          return bDate - aDate;
        case "title":
          return a.title.localeCompare(b.title);
        case "intern":
          return getInternName(a.internId).localeCompare(getInternName(b.internId));
        case "type":
          return a.type.localeCompare(b.type);
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filteredReports;
  };

  const openReportDetails = (report: Report) => {
    setSelectedReport(report);
    setReviewFeedback(report.feedback || "");
    setReviewAction(null);
    setShowDetailsModal(true);
  };

  const getReportStats = () => {
    const submitted = reports.filter(r => r.status === 'submitted').length;
    const approved = reports.filter(r => r.status === 'approved').length;
    const reviewed = reports.filter(r => r.status === 'reviewed').length;
    const rejected = reports.filter(r => r.status === 'rejected').length;

    return { submitted, approved, reviewed, rejected, total: reports.length };
  };

  const stats = getReportStats();
  const filteredReports = getFilteredAndSortedReports();

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
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation('/')}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Intern Reports
            </h1>
            <p className="text-muted-foreground mt-2">
              Review and manage reports submitted by your interns
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {interns.length} Interns
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {stats.total} Reports
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.submitted}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Accepted reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            <Eye className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.reviewed}</div>
            <p className="text-xs text-muted-foreground">With feedback</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Need revision</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle>Reports Management</CardTitle>
              <CardDescription>
                Review and provide feedback on intern reports
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-[200px]"
                />
              </div>
              
              {/* Filters */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[120px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterIntern} onValueChange={setFilterIntern}>
                <SelectTrigger className="w-[150px]">
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Intern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Interns</SelectItem>
                  {interns.map((intern) => (
                    <SelectItem key={intern.uid} value={intern.uid}>
                      {intern.firstName} {intern.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[120px]">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submittedAt">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-lg truncate">{report.title}</h4>
                      {report.status === 'submitted' && (
                        <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                          NEW
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {getInternName(report.internId)}
                      </span>
                    </div>
                    {report.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {report.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {report.submittedAt ? 
                          new Date(report.submittedAt.toDate()).toLocaleDateString() : 
                          'Not submitted'
                        }
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {report.submittedAt ? 
                          new Date(report.submittedAt.toDate()).toLocaleTimeString() : 
                          ''
                        }
                      </span>
                      {report.attachmentUrl && (
                        <span className="flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />
                          Attachments
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <div className="flex gap-2">
                      <Badge className={`text-xs ${getTypeColor(report.type)}`}>
                        {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                      </Badge>
                      <Badge className={`text-xs ${getPriorityColor(report.priority)}`}>
                        {report.priority.charAt(0).toUpperCase() + report.priority.slice(1)}
                      </Badge>
                      <Badge variant="secondary" className={`text-xs ${getStatusColor(report.status)}`}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Report Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openReportDetails(report)}
                    className="gap-2"
                  >
                    <Eye className="h-3 w-3" />
                    Review Report
                  </Button>
                  {report.feedback && (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Feedback Given
                    </Badge>
                  )}
                  {report.status === 'submitted' && (
                    <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Needs Review
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {filteredReports.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                {reports.length === 0 ? (
                  <>
                    <p className="text-lg font-medium mb-2">No reports submitted yet</p>
                    <p className="text-sm">Your interns haven't submitted any reports</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">No reports match your filters</p>
                    <p className="text-sm">Try adjusting your search or filter settings</p>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Details and Review Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Review Report: {selectedReport?.title}
            </DialogTitle>
            <DialogDescription>
              Review and provide feedback on this intern's report
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-6">
              {/* Report Header */}
              <div className="border rounded-lg p-4">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{selectedReport.title}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{getInternName(selectedReport.internId)}</span>
                    </div>
                    {selectedReport.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {selectedReport.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Badge className={`text-xs ${getTypeColor(selectedReport.type)}`}>
                        {selectedReport.type.charAt(0).toUpperCase() + selectedReport.type.slice(1)} Report
                      </Badge>
                      <Badge className={`text-xs ${getPriorityColor(selectedReport.priority)}`}>
                        {selectedReport.priority.charAt(0).toUpperCase() + selectedReport.priority.slice(1)} Priority
                      </Badge>
                    </div>
                    <Badge variant="secondary" className={`text-xs ${getStatusColor(selectedReport.status)}`}>
                      {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Report Content */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Report Content</h3>
                <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
                  {selectedReport.content}
                </div>
              </div>

              {/* Report Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Report Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Submitted</p>
                    <p className="font-medium flex items-center gap-1">
                      <Send className="h-4 w-4" />
                      {selectedReport.submittedAt ? 
                        new Date(selectedReport.submittedAt.toDate()).toLocaleString() : 
                        'Not submitted'
                      }
                    </p>
                  </div>
                  {selectedReport.reviewedAt && (
                    <div>
                      <p className="text-sm text-gray-600">Reviewed</p>
                      <p className="font-medium flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {new Date(selectedReport.reviewedAt.toDate()).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedReport.attachmentUrl && (
                    <div>
                      <p className="text-sm text-gray-600">Attachments</p>
                      <p className="font-medium flex items-center gap-1">
                        <Paperclip className="h-4 w-4" />
                        Files attached
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Previous Feedback */}
              {selectedReport.feedback && selectedReport.status !== 'submitted' && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">Previous Feedback</h3>
                  <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
                    <p className="text-sm text-yellow-700">
                      {selectedReport.feedback}
                    </p>
                  </div>
                </div>
              )}

              {/* Review Section */}
              {(selectedReport.status === 'submitted' || selectedReport.status === 'reviewed') && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">Review Report</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="feedback">Feedback</Label>
                      <Textarea
                        id="feedback"
                        placeholder="Provide feedback to the intern..."
                        value={reviewFeedback}
                        onChange={(e) => setReviewFeedback(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => submitReview('rejected')}
                        disabled={isReviewing}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        {isReviewing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject Report
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => submitReview('approved')}
                        disabled={isReviewing}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isReviewing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Report
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}