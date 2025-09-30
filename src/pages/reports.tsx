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
  Send,
  ArrowLeft,
  Plus,
  Eye,
  Filter,
  SortAsc,
  Upload,
  File,
  Image,
  Paperclip,
  X,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  User,
  Download
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
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Report interface
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

export default function ReportsPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [reports, setReports] = React.useState<Report[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<Report | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("createdAt");

  // Form state
  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    content: "",
    type: "daily" as Report['type'],
    priority: "medium" as Report['priority']
  });
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);

  // Load reports
  React.useEffect(() => {
    if (!userProfile?.uid) return;

    let unsubscribeReports: (() => void) | null = null;

    const setupReportsListener = async () => {
      try {
        setIsLoading(true);
        
        // Set up real-time reports listener
        const reportsQuery = query(
          collection(db, "reports"),
          where("internId", "==", userProfile.uid),
          orderBy("createdAt", "desc")
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

      } catch (error) {
        console.error("❌ Error setting up reports listener:", error);
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to load reports",
          variant: "destructive",
        });
      }
    };

    setupReportsListener();

    return () => {
      if (unsubscribeReports) {
        unsubscribeReports();
      }
    };
  }, [userProfile?.uid, toast]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      
      // Check file sizes (max 5MB each)
      const oversizedFiles = newFiles.filter(file => file.size > 5 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast({
          title: "File Too Large",
          description: `Some files are larger than 5MB: ${oversizedFiles.map(f => f.name).join(', ')}`,
          variant: "destructive",
        });
        return;
      }
      
      // Check total number of files (max 5 files)
      if (uploadedFiles.length + newFiles.length > 5) {
        toast({
          title: "Too Many Files",
          description: "You can upload maximum 5 files per report",
          variant: "destructive",
        });
        return;
      }
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFileToStorage = async (file: File): Promise<string> => {
    // For now, we'll use a simple base64 approach
    // In production, you'd want to use Firebase Storage
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = () => {
          reject(new Error(`Failed to read file: ${file.name}`));
        };
        reader.readAsDataURL(file);
      } catch (error) {
        reject(error);
      }
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      content: "",
      type: "daily",
      priority: "medium"
    });
    setUploadedFiles([]);
  };

  const submitReport = async () => {
    if (!userProfile?.uid || !userProfile?.teacherId) {
      toast({
        title: "Error",
        description: "User profile or teacher information not found",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in the title and content",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("📤 Starting report submission...");
      
      let attachmentData = null;
      if (uploadedFiles.length > 0) {
        console.log(`📎 Processing ${uploadedFiles.length} files...`);
        try {
          // Upload files and create attachment data
          const filePromises = uploadedFiles.map(async (file) => {
            console.log(`📄 Processing file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
            const data = await uploadFileToStorage(file);
            return {
              name: file.name,
              type: file.type,
              size: file.size,
              data: data
            };
          });
          
          const fileData = await Promise.all(filePromises);
          attachmentData = JSON.stringify(fileData);
          console.log("✅ Files processed successfully");
        } catch (fileError) {
          console.error("❌ File processing error:", fileError);
          toast({
            title: "File Upload Error",
            description: "Failed to process uploaded files. Please try again with smaller files.",
            variant: "destructive",
          });
          return;
        }
      }

      console.log("💾 Saving report to database...");
      // Create report
      const reportDoc = await addDoc(collection(db, "reports"), {
        title: formData.title.trim(),
        description: formData.description.trim(),
        content: formData.content.trim(),
        type: formData.type,
        priority: formData.priority,
        status: 'submitted',
        internId: userProfile.uid,
        teacherId: userProfile.teacherId,
        attachmentUrl: attachmentData,
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log("✅ Report saved with ID:", reportDoc.id);

      toast({
        title: "Report Submitted",
        description: "Your report has been submitted to your teacher",
      });

      resetForm();
      setShowCreateModal(false);
      
    } catch (error) {
      console.error("❌ Error submitting report:", error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDraft = async () => {
    if (!userProfile?.uid || !userProfile?.teacherId) {
      toast({
        title: "Error",
        description: "User profile or teacher information not found",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please add a title to save draft",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await addDoc(collection(db, "reports"), {
        title: formData.title.trim(),
        description: formData.description.trim(),
        content: formData.content.trim(),
        type: formData.type,
        priority: formData.priority,
        status: 'draft',
        internId: userProfile.uid,
        teacherId: userProfile.teacherId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Draft Saved",
        description: "Your report draft has been saved",
      });

      resetForm();
      setShowCreateModal(false);
      
    } catch (error) {
      console.error("❌ Error saving draft:", error);
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilteredAndSortedReports = () => {
    let filteredReports = reports;

    // Filter by status
    if (filterStatus !== "all") {
      filteredReports = filteredReports.filter(report => report.status === filterStatus);
    }

    // Filter by type
    if (filterType !== "all") {
      filteredReports = filteredReports.filter(report => report.type === filterType);
    }

    // Sort reports
    filteredReports.sort((a, b) => {
      switch (sortBy) {
        case "createdAt":
          const aDate = a.createdAt ? a.createdAt.toDate().getTime() : 0;
          const bDate = b.createdAt ? b.createdAt.toDate().getTime() : 0;
          return bDate - aDate;
        case "title":
          return a.title.localeCompare(b.title);
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
    setShowDetailsModal(true);
  };

  const getReportStats = () => {
    const submitted = reports.filter(r => r.status === 'submitted').length;
    const approved = reports.filter(r => r.status === 'approved').length;
    const reviewed = reports.filter(r => r.status === 'reviewed').length;
    const drafts = reports.filter(r => r.status === 'draft').length;

    return { submitted, approved, reviewed, drafts, total: reports.length };
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
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
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
              My Reports
            </h1>
            <p className="text-muted-foreground mt-2">
              Submit daily, weekly, and project reports to your teacher
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <Send className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
            <p className="text-xs text-muted-foreground">Pending review</p>
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
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <File className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.drafts}</div>
            <p className="text-xs text-muted-foreground">Saved drafts</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Reports List</CardTitle>
              <CardDescription>
                All your submitted reports and drafts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
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

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[120px]">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
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
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-lg truncate">{report.title}</h4>
                    </div>
                    {report.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {report.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {report.createdAt ? new Date(report.createdAt.toDate()).toLocaleDateString() : 'Unknown date'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {report.createdAt ? new Date(report.createdAt.toDate()).toLocaleTimeString() : 'Unknown time'}
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
                    View Details
                  </Button>
                  {report.feedback && (
                    <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Has Feedback
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
                    <p className="text-lg font-medium mb-2">No reports yet</p>
                    <p className="text-sm mb-4">Start by creating your first report</p>
                    <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Report
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">No reports match your filter</p>
                    <p className="text-sm">Try adjusting your filter settings</p>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Report Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Report
            </DialogTitle>
            <DialogDescription>
              Submit a report to your teacher with details about your work or any incidents.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Report Type and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-type">Report Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as Report['type'] }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily Report</SelectItem>
                    <SelectItem value="weekly">Weekly Report</SelectItem>
                    <SelectItem value="monthly">Monthly Report</SelectItem>
                    <SelectItem value="project">Project Report</SelectItem>
                    <SelectItem value="incident">Incident Report</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="report-priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as Report['priority'] }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="report-title">Title *</Label>
              <Input
                id="report-title"
                placeholder="Enter report title..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="report-description">Summary (Optional)</Label>
              <Textarea
                id="report-description"
                placeholder="Brief summary of the report..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="report-content">Report Content *</Label>
              <Textarea
                id="report-content"
                placeholder="Enter detailed report content..."
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={8}
                className="resize-none"
              />
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <Label>Attachments (Optional)</Label>
              
              {/* File Upload Button */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">
                      Click to upload files
                    </p>
                    <p className="text-xs text-gray-500">
                      Images, PDFs, Documents (Max 5MB each, 5 files total)
                    </p>
                  </div>
                </label>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Selected Files:</p>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          {file.type.startsWith('image/') ? (
                            <Image className="h-4 w-4 text-blue-600" />
                          ) : (
                            <File className="h-4 w-4 text-gray-600" />
                          )}
                          <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={saveDraft}
                disabled={isSubmitting || !formData.title.trim()}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <File className="h-4 w-4 mr-2" />
                    Save Draft
                  </>
                )}
              </Button>
              <Button
                onClick={submitReport}
                disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Details
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-6">
              {/* Report Header */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">{selectedReport.title}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={`text-xs ${getTypeColor(selectedReport.type)}`}>
                    {selectedReport.type.charAt(0).toUpperCase() + selectedReport.type.slice(1)} Report
                  </Badge>
                  <Badge className={`text-xs ${getPriorityColor(selectedReport.priority)}`}>
                    {selectedReport.priority.charAt(0).toUpperCase() + selectedReport.priority.slice(1)} Priority
                  </Badge>
                  <Badge variant="secondary" className={`text-xs ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                  </Badge>
                </div>
                {selectedReport.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.description}
                  </p>
                )}
              </div>

              {/* Report Content */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Report Content</h3>
                <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded">
                  {selectedReport.content}
                </div>
              </div>

              {/* Timing Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Report Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {selectedReport.createdAt ? new Date(selectedReport.createdAt.toDate()).toLocaleString() : 'Unknown date'}
                    </p>
                  </div>
                  {selectedReport.submittedAt && (
                    <div>
                      <p className="text-sm text-gray-600">Submitted</p>
                      <p className="font-medium flex items-center gap-1">
                        <Send className="h-4 w-4" />
                        {new Date(selectedReport.submittedAt.toDate()).toLocaleString()}
                      </p>
                    </div>
                  )}
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

              {/* Teacher Feedback */}
              {selectedReport.feedback && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">Teacher Feedback</h3>
                  <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Your Teacher</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          {selectedReport.feedback}
                        </p>
                      </div>
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