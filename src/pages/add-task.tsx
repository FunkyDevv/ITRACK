import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckSquare,
  Users,
  User,
  Calendar,
  Clock,
  FileText,
  Plus,
  X,
  Save,
  Eye,
  ArrowLeft,
} from "lucide-react";

interface Intern {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // Add phone field
}

export default function AddTask() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = React.useState(false);
  const [interns, setInterns] = React.useState<Intern[]>([]);
  const [isLoadingInterns, setIsLoadingInterns] = React.useState(true);
  const [selectedInterns, setSelectedInterns] = React.useState<string[]>([]);
  const [showPreview, setShowPreview] = React.useState(false);

  const [taskData, setTaskData] = React.useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as 'low' | 'medium' | 'high',
  });

  // Load teacher's interns
  React.useEffect(() => {
    const loadInterns = async () => {
      if (!userProfile?.uid) return;

      try {
        setIsLoadingInterns(true);
        const { getTeacherInterns } = await import('@/lib/firebase');
        const teacherInterns = await getTeacherInterns(userProfile.uid);
        setInterns(teacherInterns);
        console.log("👥 Teacher interns loaded for task assignment:", teacherInterns);
      } catch (error) {
        console.error("❌ Error loading interns:", error);
        toast({
          title: "Error",
          description: "Failed to load interns",
          variant: "destructive",
        });
      } finally {
        setIsLoadingInterns(false);
      }
    };

    loadInterns();
  }, [userProfile?.uid, toast]);

  const handleInputChange = (field: string, value: string) => {
    setTaskData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInternSelection = (internId: string) => {
    setSelectedInterns(prev => {
      if (prev.includes(internId)) {
        return prev.filter(id => id !== internId);
      } else {
        return [...prev, internId];
      }
    });
  };

  const selectAllInterns = () => {
    setSelectedInterns(interns.map(intern => intern.id));
  };

  const clearAllInterns = () => {
    setSelectedInterns([]);
  };

  const handleSubmit = async () => {
    if (!userProfile?.uid) {
      toast({
        title: "Error",
        description: "User profile not found",
        variant: "destructive",
      });
      return;
    }

    if (!taskData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    if (!taskData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Task description is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedInterns.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one intern",
        variant: "destructive",
      });
      return;
    }

    if (!taskData.dueDate) {
      toast({
        title: "Validation Error",
        description: "Due date is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create task object
      const task = {
        title: taskData.title.trim(),
        description: taskData.description.trim(),
        assignedTo: selectedInterns,
        assignedBy: userProfile.uid,
        dueDate: taskData.dueDate,
        priority: taskData.priority,
        status: 'pending' as const,
      };

      // Create the task using Firebase
      const { createTask } = await import('@/lib/firebase');
      const taskId = await createTask(task);
      
      console.log("📝 Task created successfully:", taskId);
      
      toast({
        title: "Task Created",
        description: `Task "${taskData.title}" has been assigned to ${selectedInterns.length} intern(s)`,
      });

      // Reset form
      setTaskData({
        title: "",
        description: "",
        dueDate: "",
        priority: "medium",
      });
      setSelectedInterns([]);

    } catch (error) {
      console.error("❌ Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  const getSelectedInternsNames = () => {
    return selectedInterns.map(id => {
      const intern = interns.find(i => i.id === id);
      return intern ? `${intern.firstName} ${intern.lastName}` : 'Unknown';
    });
  };

  if (isLoadingInterns) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
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
              Add New Task
            </h1>
            <p className="text-muted-foreground mt-2">
              Create and assign tasks to your interns
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm self-start sm:self-center">
          Task Management
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Task Details
              </CardTitle>
              <CardDescription>
                Fill in the task information and requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter task title..."
                  value={taskData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Task Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the task, requirements, and expected deliverables..."
                  value={taskData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="min-h-[120px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={taskData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={taskData.priority}
                    onValueChange={(value) => handleInputChange('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Intern Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Assign to Interns
              </CardTitle>
              <CardDescription>
                Select which interns should receive this task
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllInterns}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Select All ({interns.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllInterns}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear All
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {interns.map((intern) => (
                  <div
                    key={intern.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedInterns.includes(intern.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleInternSelection(intern.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {intern.firstName} {intern.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {intern.email}
                          </p>
                        </div>
                      </div>
                      {selectedInterns.includes(intern.id) && (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {interns.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No interns assigned to you yet</p>
                </div>
              )}

              {selectedInterns.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-2">
                    Selected Interns ({selectedInterns.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {getSelectedInternsNames().map((name, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview & Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Task Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Task Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">TITLE</Label>
                <p className="font-medium">
                  {taskData.title || "Task title will appear here"}
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">DESCRIPTION</Label>
                <p className="text-sm text-muted-foreground">
                  {taskData.description || "Task description will appear here"}
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">PRIORITY</Label>
                <Badge className={`text-xs ${getPriorityColor(taskData.priority)}`}>
                  {taskData.priority.charAt(0).toUpperCase() + taskData.priority.slice(1)} Priority
                </Badge>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">DUE DATE</Label>
                <p className="text-sm flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {taskData.dueDate
                    ? new Date(taskData.dueDate).toLocaleDateString() + ' ' + 
                      new Date(taskData.dueDate).toLocaleTimeString()
                    : "No due date set"
                  }
                </p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">ASSIGNED TO</Label>
                <p className="text-sm flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {selectedInterns.length} intern(s)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !taskData.title || !taskData.description || selectedInterns.length === 0}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating Task...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Task
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setLocation('/')}
                className="w-full gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Task will be sent to selected interns</p>
                <p>• Interns will receive notifications</p>
                <p>• You can track progress in analytics</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}