import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Users,
  GraduationCap,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  MapPin,
  Activity,
  Eye,
  Search,
  Loader2,
  Plus
} from "lucide-react";
import { UserData, getInternsForTeacher } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import TeacherAttendanceApprovals from "./TeacherAttendanceApprovals";

// Interface for teacher-specific intern view
interface TeacherIntern extends UserData {
  id: string;
}

export default function TeacherDashboard() {
  const { userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [interns, setInterns] = React.useState<TeacherIntern[]>([]);
  const [filteredInterns, setFilteredInterns] = React.useState<TeacherIntern[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Fetch teacher's assigned interns
  React.useEffect(() => {
    const fetchInterns = async () => {
      if (!userProfile?.uid) return;
      
      try {
        console.log("👨‍🏫 Fetching interns for teacher:", userProfile.uid);
        const teacherInterns = await getInternsForTeacher(userProfile.uid);
        console.log("📚 Found teacher interns:", teacherInterns);
        setInterns(teacherInterns);
      } catch (error) {
        console.error("Error fetching teacher interns:", error);
        toast({
          title: "Error",
          description: "Failed to load your assigned interns.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterns();
  }, [userProfile?.uid, toast]);

  // Filter interns based on search term
  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredInterns(interns);
    } else {
      const filtered = interns.filter(intern =>
        `${intern.firstName} ${intern.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        intern.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInterns(filtered);
    }
  }, [interns, searchTerm]);

  const totalInterns = interns.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading teacher dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {userProfile?.firstName}!
          </h1>
          <p className="text-gray-600">
            Manage your team and track progress from your supervisor dashboard.
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          Supervisor
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interns</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInterns}</div>
            <p className="text-xs text-muted-foreground">
              Overview of interns enrolled under your supervision
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned to Teachers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{internsWithTeacher}</div>
            <p className="text-xs text-muted-foreground">
              Interns with assigned cooperating teachers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{internsWithoutTeacher}</div>
            <p className="text-xs text-muted-foreground">
              Interns needing teacher assignment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interns Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Interns</CardTitle>
              <CardDescription>
                Overview of interns enrolled under your supervision
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search interns or teachers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInterns.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No interns found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? "No interns match your search criteria." : "Get started by adding your first intern."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Intern Name
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Assigned Cooperating Teacher
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Schedule
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInterns.map((intern) => (
                    <tr key={intern.id} className="border-b hover:bg-muted/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-primary/10 rounded-full p-2">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {intern.firstName} {intern.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {intern.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">{intern.email}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {intern.teacherName || 'No Teacher Assigned'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-muted-foreground">
                          {intern.scheduledTimeIn && intern.scheduledTimeOut ? (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{intern.scheduledTimeIn} - {intern.scheduledTimeOut}</span>
                            </div>
                          ) : (
                            <span>No schedule set</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(intern)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
