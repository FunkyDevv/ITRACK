import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { getTeacherInterns, InternProfile } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Eye,
  User,
  X,
} from "lucide-react";

export default function MyInterns() {
  const { userProfile } = useAuth();
  const [interns, setInterns] = React.useState<InternProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedIntern, setSelectedIntern] = React.useState<InternProfile | null>(null);
  const [showViewModal, setShowViewModal] = React.useState(false);

  React.useEffect(() => {
    const fetchInterns = async () => {
      if (!userProfile?.uid) return;
      
      try {
        const teacherInterns = await getTeacherInterns(userProfile.uid);
        setInterns(teacherInterns);
        console.log("📚 My interns loaded:", teacherInterns);
      } catch (error) {
        console.error("❌ Error loading interns:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterns();
  }, [userProfile?.uid]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            My Interns
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor your assigned interns
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {interns.length} Intern{interns.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interns</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interns.length}</div>
            <p className="text-xs text-muted-foreground">
              Assigned to you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Checked in today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Sessions completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Interns List</CardTitle>
          <CardDescription>
            View and manage all interns assigned to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          {interns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interns.map((intern) => (
                  <TableRow key={intern.uid}>
                    <TableCell className="font-medium">
                      {intern.firstName} {intern.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {intern.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {intern.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {intern.location ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-32" title={intern.location.address}>
                            {intern.location.address}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {intern.createdAt ? new Date(intern.createdAt).toLocaleDateString() : 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1"
                          onClick={() => {
                            setSelectedIntern(intern);
                            setShowViewModal(true);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No Interns Assigned</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any interns assigned to you yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Contact your supervisor to get interns assigned to your guidance.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Intern Details Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Intern Details
            </DialogTitle>
            <DialogDescription>
              Complete information about {selectedIntern?.firstName} {selectedIntern?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedIntern && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Full Name</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {selectedIntern.firstName} {selectedIntern.lastName}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Email Address</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {selectedIntern.email}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Phone Number</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {selectedIntern.phone}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Join Date</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {selectedIntern.createdAt ? new Date(selectedIntern.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Assignment Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Assignment Information</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Assignment Location</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {selectedIntern.location?.address || 'Not set'}
                    </p>
                    {selectedIntern.location && (
                      <div className="ml-6 text-xs text-muted-foreground">
                        Coordinates: {selectedIntern.location.latitude.toFixed(6)}, {selectedIntern.location.longitude.toFixed(6)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Account Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">User ID</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6 font-mono">
                      {selectedIntern.uid}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Teacher ID</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6 font-mono">
                      {selectedIntern.teacherId}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
