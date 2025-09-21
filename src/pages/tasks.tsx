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
  CheckSquare,
  Calendar,
  Clock,
  FileText,
  User,
  ArrowLeft,
  Play,
  Check,
  AlertCircle,
  Eye,
  Filter,
  SortAsc,
  Upload,
  File,
  Image,
  Paperclip,
  X,
  Download
} from "lucide-react";
import { Task, subscribeToInternTasks, updateTaskStatus, TaskSubmission } from "@/lib/firebase";

// Helper function to safely convert any date-like value to a Date object
const toDate = (date: string | Date | Timestamp | undefined): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date === 'string') return new Date(date);
  if ('toDate' in date) return date.toDate(); // Handle Firestore Timestamp
  return null;
};
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TasksPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<string>("dueDate");
  const [submissions, setSubmissions] = React.useState<TaskSubmission[]>([]);
  const [submissionText, setSubmissionText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);

  // Load intern tasks and submissions
  React.useEffect(() => {
    if (!userProfile?.uid) return;

    let unsubscribeTasks: (() => void) | null = null;
    let unsubscribeSubmissions: (() => void) | null = null;

    const setupListeners = async () => {
      try {
        setIsLoading(true);
        
        // Set up real-time task listener
        unsubscribeTasks = subscribeToInternTasks(userProfile.uid, (tasks) => {
          console.log("📋 Real-time tasks update:", tasks);
          setTasks(tasks);
          setIsLoading(false);
        });

        // Set up real-time submissions listener
        const submissionsQuery = query(
          collection(db, "taskSubmissions"),
          where("internId", "==", userProfile.uid)
        );
        
        unsubscribeSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
          const submissionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as TaskSubmission[];
          console.log("📄 Real-time submissions update:", submissionsData);
          setSubmissions(submissionsData);
        });

      } catch (error) {
        console.error("❌ Error setting up listeners:", error);
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to load tasks",
          variant: "destructive",
        });
      }
    };

    setupListeners();

    return () => {
      if (unsubscribeTasks) {
        unsubscribeTasks();
      }
      if (unsubscribeSubmissions) {
        unsubscribeSubmissions();
      }
    };
  }, [userProfile?.uid, toast]);

  const handleTaskStatusUpdate = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast({
        title: "Task Updated",
        description: `Task status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error("❌ Error updating task status:", error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

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
          description: "You can upload maximum 5 files per task submission",
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
    // In production, you'd want to use Firebase Storage or another cloud storage service
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

  const submitTask = async () => {
    if (!selectedTask || !userProfile?.uid) return;

    try {
      setIsSubmitting(true);
      console.log("📤 Starting task submission...");
      
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

      console.log("💾 Saving task submission to database...");
      // Create task submission
      const submissionDoc = await addDoc(collection(db, "taskSubmissions"), {
        taskId: selectedTask.id,
        internId: userProfile.uid,
        submissionText: submissionText.trim() || null,
        attachmentUrl: attachmentData,
        submittedAt: serverTimestamp(),
        status: 'submitted'
      });

      console.log("✅ Task submission saved with ID:", submissionDoc.id);

      // Update task status to completed
      await updateTaskStatus(selectedTask.id!, 'completed');
      console.log("✅ Task status updated to completed");

      toast({
        title: "Task Submitted",
        description: "Your task submission has been sent to your teacher",
      });

      // Reset form
      setSubmissionText("");
      setUploadedFiles([]);
      setShowSubmissionModal(false);
      
    } catch (error) {
      console.error("❌ Error submitting task:", error);
      toast({
        title: "Error",
        description: "Failed to submit task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string | Date | Timestamp | undefined): string => {
    const convertedDate = toDate(date);
    return convertedDate ? convertedDate.toLocaleDateString() : 'No date set';
  };

  const formatTime = (date: string | Date | Timestamp | undefined): string => {
    const convertedDate = toDate(date);
    return convertedDate ? convertedDate.toLocaleTimeString() : 'No time set';
  };

  const isOverdue = (dueDate: string | Date | Timestamp | undefined): boolean => {
    const convertedDate = toDate(dueDate);
    return convertedDate ? convertedDate < new Date() : false;
  };

  const getFilteredAndSortedTasks = () => {
    let filteredTasks = tasks;

    // Filter by status
    if (filterStatus !== "all") {
      filteredTasks = filteredTasks.filter(task => task.status === filterStatus);
    }

    // Sort tasks
    filteredTasks.sort((a, b) => {
      switch (sortBy) {
        case "dueDate":
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          const dateA = toDate(a.dueDate);
          const dateB = toDate(b.dueDate);
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateA.getTime() - dateB.getTime();
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case "status":
          return a.status.localeCompare(b.status);
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filteredTasks;
  };

  const openTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setShowDetailsModal(true);
  };

  const openSubmissionModal = (task: Task) => {
    setSelectedTask(task);
    setSubmissionText("");
    setUploadedFiles([]);
    setShowSubmissionModal(true);
  };

  const getTaskSubmission = (taskId: string) => {
    return submissions.find(sub => sub.taskId === taskId);
  };

  const hasSubmission = (taskId: string) => {
    return submissions.some(sub => sub.taskId === taskId);
  };

  const getTaskStats = () => {
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const overdue = tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'completed').length;

    return { completed, inProgress, pending, overdue, total: tasks.length };
  };

  const stats = getTaskStats();
  const filteredTasks = getFilteredAndSortedTasks();

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
              My Tasks
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your assigned tasks and track your progress
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm self-start sm:self-center">
          {stats.total} Total Tasks
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Tasks finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Play className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Not started</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Task List</CardTitle>
              <CardDescription>
                All tasks assigned to you by your teacher
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-lg truncate">{task.title}</h4>
                      {isOverdue(task.dueDate) && task.status !== 'completed' && (
                        <Badge variant="destructive" className="text-xs">
                          OVERDUE
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {task.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {formatDate(task.dueDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(task.dueDate)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <div className="flex gap-2">
                      <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>
                      <Badge variant="secondary" className={`text-xs ${getStatusColor(task.status)}`}>
                        {task.status === 'in-progress' ? 'In Progress' : 
                         task.status === 'completed' ? 'Completed' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Task Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {task.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleTaskStatusUpdate(task.id!, 'in-progress')}
                      className="gap-2"
                    >
                      <Play className="h-3 w-3" />
                      Start Task
                    </Button>
                  )}
                  {task.status === 'in-progress' && !hasSubmission(task.id!) && (
                    <Button
                      size="sm"
                      onClick={() => openSubmissionModal(task)}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Upload className="h-3 w-3" />
                      Submit Task
                    </Button>
                  )}
                  {hasSubmission(task.id!) && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Check className="h-3 w-3 mr-1" />
                        Submitted
                      </Badge>
                      {getTaskSubmission(task.id!)?.status === 'reviewed' && (
                        <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                          Reviewed
                        </Badge>
                      )}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openTaskDetails(task)}
                    className="gap-2"
                  >
                    <Eye className="h-3 w-3" />
                    View Details
                  </Button>
                </div>
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                {tasks.length === 0 ? (
                  <>
                    <p className="text-lg font-medium mb-2">No tasks assigned yet</p>
                    <p className="text-sm">Your teacher will assign tasks here</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">No tasks match your filter</p>
                    <p className="text-sm">Try adjusting your filter settings</p>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Task Details
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-6">
              {/* Task Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">{selectedTask.title}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={`text-xs ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)} Priority
                  </Badge>
                  <Badge variant="secondary" className={`text-xs ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status === 'in-progress' ? 'In Progress' : 
                     selectedTask.status === 'completed' ? 'Completed' : 'Pending'}
                  </Badge>
                  {isOverdue(selectedTask.dueDate) && selectedTask.status !== 'completed' && (
                    <Badge variant="destructive" className="text-xs">
                      OVERDUE
                    </Badge>
                  )}
                  {hasSubmission(selectedTask.id!) && (
                    <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      <Check className="h-3 w-3 mr-1" />
                      Submitted
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedTask.description}
                </p>
              </div>

              {/* Timing Information */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">Due Date & Time</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Due Date</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(selectedTask.dueDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Due Time</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTime(selectedTask.dueDate)}
                    </p>
                  </div>
                </div>
                {isOverdue(selectedTask.dueDate) && selectedTask.status !== 'completed' && (
                  <div className="mt-3 p-2 bg-red-50 text-red-800 rounded text-sm">
                    ⚠️ This task is overdue! Please complete it as soon as possible.
                  </div>
                )}
              </div>

              {/* Submission Information */}
              {hasSubmission(selectedTask.id!) && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">Your Submission</h3>
                  {(() => {
                    const submission = getTaskSubmission(selectedTask.id!);
                    return submission ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            Submitted: {submission.submittedAt && new Date(submission.submittedAt.toDate()).toLocaleString()}
                          </span>
                        </div>
                        {submission.submissionText && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Your Notes:</p>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {submission.submissionText}
                            </p>
                          </div>
                        )}
                        {submission.attachmentUrl && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Attachments:</p>
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <Paperclip className="h-4 w-4" />
                              Files attached
                            </div>
                          </div>
                        )}
                        {submission.feedback && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Teacher Feedback:</p>
                            <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                              {submission.feedback}
                            </p>
                          </div>
                        )}
                        {submission.grade && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Grade:</p>
                            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                              {submission.grade}/100
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Action Buttons */}
              {selectedTask.status !== 'completed' && !hasSubmission(selectedTask.id!) && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  {selectedTask.status === 'pending' && (
                    <Button 
                      onClick={() => {
                        handleTaskStatusUpdate(selectedTask.id!, 'in-progress');
                        setShowDetailsModal(false);
                      }}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Task
                    </Button>
                  )}
                  {selectedTask.status === 'in-progress' && (
                    <Button 
                      onClick={() => {
                        setShowDetailsModal(false);
                        openSubmissionModal(selectedTask);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Submit Task
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Submission Modal */}
      <Dialog open={showSubmissionModal} onOpenChange={setShowSubmissionModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Submit Task: {selectedTask?.title}
            </DialogTitle>
            <DialogDescription>
              Add your notes and upload any required files to complete this task.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Submission Text */}
            <div className="space-y-2">
              <Label htmlFor="submission-text">Your Notes (Optional)</Label>
              <Textarea
                id="submission-text"
                placeholder="Add any notes about your work, challenges faced, or explanations about your submission..."
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <Label>Attachments</Label>
              
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

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowSubmissionModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={submitTask}
                disabled={isSubmitting || (uploadedFiles.length === 0 && !submissionText.trim())}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Submit Task
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}