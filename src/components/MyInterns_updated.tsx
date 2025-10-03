import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToTeacherInterns, InternProfile } from "@/lib/firebase";
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
  Loader2,
  X,
} from "lucide-react";

export default function MyInterns() {
  const { userProfile } = useAuth();
  const [interns, setInterns] = React.useState<InternProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedIntern, setSelectedIntern] = React.useState<InternProfile | null>(null);
  const [showViewModal, setShowViewModal] = React.useState(false);

  React.useEffect(() => {
    if (!userProfile?.uid) return;
    
    console.log("🔄 Setting up real-time subscription for teacher interns:", userProfile.uid);
    setIsLoading(true);
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToTeacherInterns(
      userProfile.uid,
      (teacherInterns) => {
        console.log("📱 Real-time update - received interns:", teacherInterns);
        
        // Debug log each intern's data
        teacherInterns.forEach((intern, index) => {
          console.log(`👤 Real-time Intern ${index + 1}:`, {
            name: `${intern.firstName} ${intern.lastName}`,
            email: intern.email,
            phone: intern.phone,
            location: intern.location,
            createdAt: intern.createdAt,
            allFields: Object.keys(intern)
          });
        });
        
        setInterns(teacherInterns);
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      console.log("🔄 Cleaning up teacher interns subscription");
      unsubscribe();
    };
  }, [userProfile?.uid]);

  const handleViewIntern = (intern: InternProfile) => {
    setSelectedIntern(intern);
    setShowViewModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading your interns...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Interns</h1>
          <p className="text-muted-foreground">Manage and monitor your assigned interns</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {interns.length} Intern{interns.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interns</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interns.length}</div>
            <p className="text-xs text-muted-foreground">Assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Checked in today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Sessions completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Interns List */}
      <Card>
        <CardHeader>
          <CardTitle>Interns List</CardTitle>
          <CardDescription>View and manage all interns assigned to you</CardDescription>
        </CardHeader>
        <CardContent>
          {interns.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No interns assigned</h3>
              <p className="text-gray-600">You don't have any interns assigned to you yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interns.map((intern) => (
                  <TableRow key={intern.id}>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{intern.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {intern.phone && intern.phone.trim() !== "" ? (
                            <a 
                              href={`tel:${intern.phone}`}
                              className="hover:text-primary hover:underline transition-colors"
                            >
                              {intern.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Not provided</span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Not set</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {(() => {
                            if (!intern.createdAt) return 'Not available';
                            try {
                              const date = intern.createdAt instanceof Date ? intern.createdAt : new Date(intern.createdAt);
                              return isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
                            } catch {
                              return 'Not available';
                            }
                          })()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewIntern(intern)}
                        className="hover:bg-primary/10"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Intern Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Intern Details</span>
            </DialogTitle>
            <DialogDescription>
              View detailed information about this intern
            </DialogDescription>
          </DialogHeader>
          
          {selectedIntern && (
            <div className="space-y-4">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
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
                      <a 
                        href={`mailto:${selectedIntern.email}`}
                        className="hover:text-primary hover:underline transition-colors"
                      >
                        {selectedIntern.email}
                      </a>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Phone Number</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {selectedIntern.phone && selectedIntern.phone.trim() !== "" ? (
                        <a 
                          href={`tel:${selectedIntern.phone}`}
                          className="hover:text-primary hover:underline transition-colors"
                        >
                          {selectedIntern.phone}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Join Date</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {(() => {
                        if (!selectedIntern.createdAt) return 'Not available';
                        try {
                          const date = selectedIntern.createdAt instanceof Date ? selectedIntern.createdAt : new Date(selectedIntern.createdAt);
                          return isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
                        } catch {
                          return 'Not available';
                        }
                      })()}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Assignment Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Assignment Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Supervisor</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {userProfile?.firstName} {userProfile?.lastName} (You)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Work Location</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {selectedIntern.location || 'Not set'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Schedule</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {selectedIntern.scheduledTimeIn || '08:00'} - {selectedIntern.scheduledTimeOut || '17:00'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowViewModal(false)}
                  className="flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Close</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
