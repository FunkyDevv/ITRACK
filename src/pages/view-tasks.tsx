import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { Download, Eye, FileText } from "lucide-react";

interface Task {
  id: string;
  internName: string;
  title: string;
  description: string;
  submittedDate: Date;
  status: "pending" | "completed";
  attachmentUrl?: string;
}

export default function ViewTasksPage() {
  const { userProfile } = useAuth();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch tasks
  React.useEffect(() => {
    const fetchTasks = async () => {
      if (!userProfile?.uid) return;

      try {
        setIsLoading(true);
        const tasksRef = collection(db, "tasks");
        const q = query(
          tasksRef,
          where("teacherId", "==", userProfile.uid),
          orderBy("submittedDate", "desc")
        );
        
        const snapshot = await getDocs(q);
        const taskData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          submittedDate: doc.data().submittedDate?.toDate() || new Date(),
        })) as Task[];

        setTasks(taskData);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [userProfile]);

  const handleDownload = (attachmentUrl: string) => {
    window.open(attachmentUrl, "_blank");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Task Submissions</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submitted Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intern Name</TableHead>
                <TableHead>Task Title</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.internName}</TableCell>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{task.submittedDate.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={task.status === "completed" ? "outline" : "secondary"}
                    >
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {task.attachmentUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(task.attachmentUrl!)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {/* TODO: Implement view details */}}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No task submissions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );