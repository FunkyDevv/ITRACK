import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/useAuth";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Target,
  User,
  FileText
} from "lucide-react";
import { Task } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface InternCalendarTask extends Task {
  assignedDate: string;
  dueDate?: Date;
}

export default function InternCalendarPage() {
  const { userProfile } = useAuth();
  
  // State management
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [tasks, setTasks] = React.useState<InternCalendarTask[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Debug log
  React.useEffect(() => {
    console.log("🔍 InternCalendar - User Profile:", userProfile);
  }, [userProfile]);

  // Get tasks assigned to this intern
  React.useEffect(() => {
    if (!userProfile?.uid) return;

    setLoading(true);
    
    try {
      const unsubscribe = onSnapshot(
        query(
          collection(db, "tasks"),
          where("assignedTo", "array-contains", userProfile.uid)
        ),
        (snapshot) => {
          try {
            const taskData = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                assignedDate: data.createdAt?.toDate ? 
                  data.createdAt.toDate().toISOString().split('T')[0] : 
                  new Date().toISOString().split('T')[0],
                dueDate: data.dueDate?.toDate ? 
                  data.dueDate.toDate() : 
                  (data.dueDate instanceof Date ? data.dueDate : null)
              };
            }) as InternCalendarTask[];
            
            console.log("📋 Loaded intern tasks:", taskData.length);
            setTasks(taskData);
            setLoading(false);
          } catch (dataError) {
            console.error("❌ Error processing task data:", dataError);
            setTasks([]);
            setLoading(false);
          }
        },
        (error) => {
          console.error("❌ Error fetching intern tasks:", error);
          setTasks([]);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (queryError) {
      console.error("❌ Error setting up query:", queryError);
      setLoading(false);
    }
  }, [userProfile]);

  // Get tasks for selected date
  const getTasksForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return tasks.filter(task => {
      const taskDate = task.assignedDate;
      return taskDate === dateString;
    });
  };

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  if (!userProfile) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading user profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your schedule...</p>
            <p className="text-xs text-muted-foreground mt-2">
              User: {userProfile?.firstName} {userProfile?.lastName}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Schedule</h1>
          <p className="text-muted-foreground">
            View your assigned tasks and schedule
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border">
          <User className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            {userProfile?.firstName} {userProfile?.lastName}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Calendar View
            </CardTitle>
            <CardDescription>
              Select a date to view your assigned tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border w-full"
              modifiers={{
                hasTask: (date) => {
                  const dateString = date.toISOString().split('T')[0];
                  return tasks.some(task => task.assignedDate === dateString);
                }
              }}
              modifiersStyles={{
                hasTask: {
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgb(34, 197, 94)',
                  borderRadius: '4px'
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Selected Date Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {selectedDate ? selectedDate.toLocaleDateString() : "Select a Date"}
            </CardTitle>
            <CardDescription>
              {selectedDateTasks.length} task(s) assigned
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDateTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tasks assigned for this date</p>
                <p className="text-sm mt-1">Select another date to see your tasks</p>
              </div>
            ) : (
              selectedDateTasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge 
                          variant={
                            task.priority === "high" ? "destructive" : 
                            task.priority === "medium" ? "default" : 
                            "secondary"
                          }
                          className="text-xs"
                        >
                          {task.priority} priority
                        </Badge>
                        <Badge 
                          variant={
                            task.status === "completed" ? "default" : 
                            task.status === "in-progress" ? "secondary" : 
                            "outline"
                          }
                          className="text-xs"
                        >
                          {task.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {task.status === "in-progress" && <Clock className="h-3 w-3 mr-1" />}
                          {task.status === "assigned" && <AlertCircle className="h-3 w-3 mr-1" />}
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {tasks.filter(t => t.status === "completed").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {tasks.filter(t => t.status === "in-progress").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {tasks.filter(t => t.status === "assigned").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Tasks
          </CardTitle>
          <CardDescription>
            Tasks scheduled for the next 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No tasks assigned</p>
              <p className="text-sm mt-1">Check back later for new assignments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h5 className="font-medium">{task.title}</h5>
                    <p className="text-sm text-muted-foreground">
                      Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        task.priority === "high" ? "destructive" : 
                        task.priority === "medium" ? "default" : 
                        "secondary"
                      }
                      className="text-xs"
                    >
                      {task.priority}
                    </Badge>
                    <Badge 
                      variant={
                        task.status === "completed" ? "default" : 
                        task.status === "in-progress" ? "secondary" : 
                        "outline"
                      }
                      className="text-xs"
                    >
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}