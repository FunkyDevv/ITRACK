import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { db, Task, subscribeToTeacherTasks } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Calendar, 
  Users, 
  Clock,
  CheckCircle,
  AlertCircle,
  Filter
} from "lucide-react";
import { useLocation } from "wouter";

interface TaskWithInterns extends Task {
  internNames: string[];
  overdueCount: number;
  completedCount: number;
  inProgressCount: number;
}

export default function ViewTasksPage() {
  const { userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [tasks, setTasks] = React.useState<TaskWithInterns[]>([]);
  const [filteredTasks, setFilteredTasks] = React.useState<TaskWithInterns[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");

  // Set up real-time subscription for teacher's tasks
  React.useEffect(() => {
    if (!userProfile?.uid) return;
    
    console.log("🎯 Setting up tasks subscription for teacher:", userProfile.uid);
    
    const unsubscribe = subscribeToTeacherTasks(
      userProfile.uid,
      async (teacherTasks) => {
        console.log("📋 Received task updates:", teacherTasks);
        
        // Enrich tasks with intern information
        const enrichedTasks = await Promise.all(
          teacherTasks.map(async (task) => {
            try {
              // Get intern names for assigned interns
              const internNames: string[] = [];
              if (task.assignedTo && task.assignedTo.length > 0) {
                const internsRef = collection(db, "interns");
                const internsQuery = query(internsRef, where("__name__", "in", task.assignedTo.slice(0, 10))); // Firestore limit
                const internsSnapshot = await getDocs(internsQuery);
                
                internsSnapshot.docs.forEach(doc => {
                  const internData = doc.data();
                  internNames.push(`${internData.firstName} ${internData.lastName}`);
                });
              }

              // Calculate progress stats (mock data for now - would need task submissions collection)
              const totalInterns = task.assignedTo?.length || 0;
              const completedCount = Math.floor(totalInterns * 0.3); // 30% completion rate
              const inProgressCount = Math.floor(totalInterns * 0.4); // 40% in progress
              const overdueCount = totalInterns - completedCount - inProgressCount;

              return {
                ...task,
                internNames,
                overdueCount: Math.max(0, overdueCount),
                completedCount,
                inProgressCount
              } as TaskWithInterns;
            } catch (error) {
              console.error("Error enriching task:", error);
              return {
                ...task,
                internNames: [],
                overdueCount: 0,
                completedCount: 0,
                inProgressCount: 0
              } as TaskWithInterns;
            }
          })
        );
        
        setTasks(enrichedTasks);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [userProfile]);

  // Filter tasks based on search and filters
  React.useEffect(() => {
    let filtered = tasks;

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.internNames.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    setFilteredTasks(filtered);
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  const handleEditTask = (taskId: string) => {
    setLocation(`/add-task?edit=${taskId}`);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      console.log("✅ Task deleted successfully");
    } catch (error) {
      console.error("❌ Error deleting task:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in-progress": return "secondary";
      case "assigned": return "outline";
      default: return "outline";
    }
  };

  // Helper function to safely convert different date types to Date object
  const safeToDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    
    // If it's already a Date object
    if (dateValue instanceof Date) return dateValue;
    
    // If it's a Firestore Timestamp
    if (dateValue && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    
    // If it's a string or number, try to convert to Date
    try {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  const isOverdue = (dueDate: any) => {
    const due = safeToDate(dueDate);
    if (!due) return false;
    return due < new Date();
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
          <h1 className="text-3xl font-bold mb-2">View Tasks</h1>
          <p className="text-muted-foreground">Manage and monitor tasks assigned to your interns</p>
        </div>
        <Button onClick={() => setLocation("/add-task")} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </div>
 view modal with bulk actions toolbar an
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
            <p className="text-xs text-muted-foreground">Tasks created by you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {tasks.filter(t => t.status === 'in-progress').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently being worked on</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter & Search Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks, descriptions, or intern names..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Tasks ({filteredTasks.length})
          </CardTitle>
          <CardDescription>
            Manage and monitor all tasks you have assigned to interns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Title</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.id} className={isOverdue(task.dueDate) && task.status !== 'completed' ? 'bg-red-50' : ''}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {task.internNames.length > 0 ? (
                        <div>
                          {task.internNames.slice(0, 2).map(name => (
                            <div key={name} className="truncate">{name}</div>
                          ))}
                          {task.internNames.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{task.internNames.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No interns assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(task.status)}>
                      {task.status.replace('-', ' ')}
                    </Badge>
                    {isOverdue(task.dueDate) && task.status !== 'completed' && (
                      <div className="text-xs text-red-600 mt-1">Overdue</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.dueDate ? (
                      <div className="text-sm">
                        {safeToDate(task.dueDate)?.toLocaleDateString() || "Invalid date"}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No due date</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-green-600">Completed: {task.completedCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">In Progress: {task.inProgressCount}</span>
                      </div>
                      {task.overdueCount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-red-600">Overdue: {task.overdueCount}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTask(task.id!)}
                        className="gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTask(task.id!)}
                        className="gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <div className="text-lg font-medium">No tasks found</div>
                      <p className="text-muted-foreground">
                        {searchTerm || statusFilter !== "all" || priorityFilter !== "all" 
                          ? "Try adjusting your filters to see more tasks"
                          : "Create your first task to get started"
                        }
                      </p>
                      {!searchTerm && statusFilter === "all" && priorityFilter === "all" && (
                        <Button onClick={() => setLocation("/add-task")} className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Task
                        </Button>
                      )}
                    </div>
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