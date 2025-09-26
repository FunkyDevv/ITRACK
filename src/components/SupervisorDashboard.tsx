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
import { UserData, subscribeToSupervisorInterns } from "@/lib/firebase";
import { Input } from "@/components/ui/input";

// Interface for supervisor dashboard
interface SupervisorIntern extends UserData {
  id: string;
  teacherName?: string;
  phone?: string; // Add phone field
}

export default function SupervisorDashboard() {
  const { userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [interns, setInterns] = React.useState<SupervisorIntern[]>([]);
  const [filteredInterns, setFilteredInterns] = React.useState<SupervisorIntern[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Set up real-time subscription for supervisor's interns
  React.useEffect(() => {
    if (!userProfile?.uid) return;
    
    console.log("🔄 Setting up supervisor dashboard for:", userProfile.uid);
    
    const unsubscribe = subscribeToSupervisorInterns(
      userProfile.uid,
      (supervisorInterns) => {
        console.log("📊 Received intern updates:", supervisorInterns);
        setInterns(supervisorInterns);
        setIsLoading(false);
      }
    );
    
    return () => {
      console.log("🔄 Cleaning up supervisor subscription");
      unsubscribe();
    };
  }, [userProfile?.uid]);

  // Filter interns based on search term
  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredInterns(interns);
    } else {
      const filtered = interns.filter(intern =>
        `${intern.firstName} ${intern.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        intern.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        intern.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInterns(filtered);
    }
  }, [interns, searchTerm]);

  const handleAddIntern = () => {
    setLocation("/add-intern");
  };

  const handleAddTeacher = () => {
    setLocation("/add-teacher");
  };

  const handleManageInterns = () => {
    setLocation("/manage-interns");
  };

  const handleManageTeachers = () => {
    setLocation("/manage-teachers");
  };

  const getStatusBadge = (intern: SupervisorIntern) => {
    if (!intern.teacherName || intern.teacherName === 'No Teacher Assigned') {
      return <Badge variant="destructive">No Teacher</Badge>;
    }
    if (intern.teacherName === 'Unknown Teacher') {
      return <Badge variant="secondary">Unknown Teacher</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const totalInterns = interns.length;
  const internsWithTeacher = interns.filter(intern => 
    intern.teacherName && intern.teacherName !== 'No Teacher Assigned' && intern.teacherName !== 'Unknown Teacher'
  ).length;
  const internsWithoutTeacher = totalInterns - internsWithTeacher;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading supervisor dashboard...</span>
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common supervisor tasks and actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={handleAddIntern}
              className="flex items-center space-x-2 h-auto p-4"
              variant="outline"
            >
              <Plus className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Add New Intern</div>
                <div className="text-sm text-muted-foreground">Create intern account</div>
              </div>
            </Button>

            <Button
              onClick={handleAddTeacher}
              className="flex items-center space-x-2 h-auto p-4"
              variant="outline"
            >
              <GraduationCap className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Add New Teacher</div>
                <div className="text-sm text-muted-foreground">Create teacher account</div>
              </div>
            </Button>

            <Button
              onClick={handleManageInterns}
              className="flex items-center space-x-2 h-auto p-4"
              variant="outline"
            >
              <Users className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Manage Interns</div>
                <div className="text-sm text-muted-foreground">View and edit interns</div>
              </div>
            </Button>

            <Button
              onClick={handleManageTeachers}
              className="flex items-center space-x-2 h-auto p-4"
              variant="outline"
            >
              <Activity className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Manage Teachers</div>
                <div className="text-sm text-muted-foreground">View and edit teachers</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

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
              {!searchTerm && (
                <div className="mt-6">
                  <Button onClick={handleAddIntern}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Intern
                  </Button>
                </div>
              )}
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
                      Phone
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
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                {/* Fixed Interns Table */}
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
                        <div className="text-sm">
                          {intern.phone ? (
                            <a 
                              href={`tel:${intern.phone}`}
                              className="hover:text-primary hover:underline transition-colors"
                            >
                              {intern.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Not provided</span>
                          )}
                        </div>
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
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Button onClick={() => console.log('Edit intern:', intern)}>Edit</Button>
                          <Button variant="destructive" onClick={() => console.log('Delete intern:', intern)}>Delete</Button>
                        </div>
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