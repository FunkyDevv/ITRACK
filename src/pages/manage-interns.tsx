import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { auth } from "@/lib/firebase";
import {
  Users,
  UserPlus,
  Eye,
  Mail,
  Phone,
  Edit,
  Trash2,
  Plus,
  ArrowLeft,
  Table as TableIcon
} from "lucide-react";

interface Intern {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  teacherId: string;
  teacherName: string;
  createdAt: Date;
  createdBy: string;
}

interface ManageInternsProps {
  teacherId?: string;
  teacherName?: string;
}

export default function ManageInterns({ teacherId, teacherName }: ManageInternsProps) {
  const { user, userProfile, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [interns, setInterns] = React.useState<Intern[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingIntern, setEditingIntern] = React.useState<Intern | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Intern | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });

  console.log("🎯 ManageInterns render - isAuthenticated:", isAuthenticated, "user:", !!user, "userProfile:", !!userProfile);

  // Fetch interns from Firestore
  React.useEffect(() => {
    const fetchInterns = async () => {
      if (!userProfile?.uid || !isAuthenticated) {
        console.log("❌ Not authenticated or no user profile");
        setIsLoading(false);
        return;
      }

      try {
        console.log("📊 Fetching interns from Firestore");
        const internsRef = collection(db, "interns");

        let q;
        if (teacherId) {
          // Fetch interns for specific teacher
          q = query(internsRef, where("teacherId", "==", teacherId), orderBy("createdAt", "desc"));
        } else {
          // Fetch all interns (for supervisors)
          q = query(internsRef, orderBy("createdAt", "desc"));
        }

        const querySnapshot = await getDocs(q);
        const internsData = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          uid: doc.id,
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as Intern[];

        console.log("✅ Interns fetched:", internsData.length);
        setInterns(internsData);
        setError(null);
      } catch (err) {
        console.error("❌ Error fetching interns:", err);
        setError("Failed to load interns");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterns();
  }, [userProfile, isAuthenticated, teacherId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile?.uid || !teacherId) return;

    try {
      const internData = {
        ...formData,
        teacherId,
        teacherName: teacherName || "Unknown Teacher",
        createdAt: new Date(),
        createdBy: userProfile.uid
      };

      if (editingIntern) {
        // Update existing intern
        await updateDoc(doc(db, "interns", editingIntern.uid), {
          ...formData
        });
        console.log("✅ Intern updated");
      } else {
        // Create new intern
        const docRef = doc(collection(db, "interns"));
        await setDoc(docRef, internData);
        console.log("✅ Intern created");
      }

      // Reset form and refresh data
      setFormData({ firstName: "", lastName: "", email: "", phone: "" });
      setShowAddForm(false);
      setEditingIntern(null);

      // Refresh interns list
      const internsRef = collection(db, "interns");
      const q = query(internsRef, where("teacherId", "==", teacherId), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const internsData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Intern[];
      setInterns(internsData);

    } catch (error) {
      console.error("❌ Error saving intern:", error);
    }
  };

  const handleEdit = (intern: Intern) => {
    setEditingIntern(intern);
    setFormData({
      firstName: intern.firstName,
      lastName: intern.lastName,
      email: intern.email,
      phone: intern.phone
    });
    setShowAddForm(true);
  };

  const handleDelete = async (internId: string) => {
    // open confirmation dialog for the selected intern
    const target = interns.find(i => i.uid === internId) || null;
    setDeleteTarget(target);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "interns", deleteTarget.uid));
      setInterns(prev => prev.filter(intern => intern.uid !== deleteTarget.uid));
      console.log("✅ Intern deleted");
    } catch (error) {
      console.error("❌ Error deleting intern:", error);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingIntern(null);
    setFormData({ firstName: "", lastName: "", email: "", phone: "" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="text-red-500 mb-4">⚠️ {error}</div>
            <Button onClick={() => setLocation("/manage-teachers")}>
              Back to Teachers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/manage-teachers")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Teachers
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {teacherName ? `Interns for ${teacherName}` : "Manage All Interns"}
            </h1>
            <p className="text-muted-foreground">
              {teacherName 
                ? `Manage interns assigned to ${teacherName}` 
                : "View all interns in the system with their assigned teachers"
              }
            </p>
          </div>
        </div>
        {teacherId && (
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {showAddForm ? "Cancel" : "Add Intern"}
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && teacherId && (
        <Card>
          <CardHeader>
            <CardTitle>{editingIntern ? "Edit Intern" : "Add New Intern"}</CardTitle>
            <CardDescription>
              {editingIntern ? "Update intern information" : "Enter the details for the new intern"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john.doe@school.edu"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingIntern ? "Update Intern" : "Add Intern"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Interns List */}
      {teacherId ? (
        // Card layout for specific teacher
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {interns.map((intern) => (
            <Card key={intern.uid} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {intern.firstName[0]}{intern.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {intern.firstName} {intern.lastName}
                      </CardTitle>
                      <CardDescription>Intern</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">Intern</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{intern.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{intern.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Teacher: {intern.teacherName}</span>
                  </div>
                </div>

                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <div className="text-sm text-muted-foreground">
                    Added {intern.createdAt.toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    {(userProfile?.role === 'supervisor' || userProfile?.uid === intern.teacherId) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(intern)}
                          className="gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(intern.uid)}
                          className="gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Table layout for supervisors (all interns)
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5" />
              All Interns Overview
            </CardTitle>
            <CardDescription>
              View all interns in the system with their assigned teachers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Intern</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interns.map((intern) => (
                  <TableRow key={intern.uid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {intern.firstName[0]}{intern.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {intern.firstName} {intern.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">Intern</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {intern.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {intern.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {intern.teacherName || "Unassigned"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {intern.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {(userProfile?.role === 'supervisor' || userProfile?.uid === intern.teacherId) && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(intern)}
                              className="gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(intern.uid)}
                              className="gap-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {interns.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No Interns Found</h3>
          <p className="text-muted-foreground mb-4">
            {teacherId 
              ? `No interns have been assigned to ${teacherName} yet.` 
              : "No interns found in the system."
            }
          </p>
          {teacherId && (
            <Button onClick={() => setShowAddForm(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add First Intern
            </Button>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Intern</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this intern? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Intern'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
