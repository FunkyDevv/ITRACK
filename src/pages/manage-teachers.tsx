import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, doc, setDoc, deleteDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { createInternAccount } from "@/lib/firebase";
import { subscribeToAllTeacherPhones, subscribeToTeacherInternPhones, subscribeToAllTeachers, subscribeToTeacherInterns } from "@/lib/realtimeSync";
import LocationPicker from "@/components/LocationPicker";
import {
  Users,
  UserPlus,
  Eye,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Calendar,
  Building2,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  UserCheck,
  UserX,
  Archive,
  RefreshCw,
  CheckSquare,
  XSquare,
  Loader2,
  Copy,
  Settings,
  Clock
} from "lucide-react";

interface Teacher {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  school: string;
  createdAt: Date;
  createdBy: string;
}

export default function ManageTeachers() {
  const { user, userProfile, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingTeacher, setEditingTeacher] = React.useState<Teacher | null>(null);
  const [showEditForm, setShowEditForm] = React.useState(false);
  const [showInternsModal, setShowInternsModal] = React.useState(false);
  const [selectedTeacher, setSelectedTeacher] = React.useState<Teacher | null>(null);
  const [teacherInterns, setTeacherInterns] = React.useState<any[]>([]);
  const [loadingInterns, setLoadingInterns] = React.useState(false);
  const [showAddInternForm, setShowAddInternForm] = React.useState(false);
  const [isCreatingIntern, setIsCreatingIntern] = React.useState(false);
  const [internFormData, setInternFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    location: undefined as { address: string; latitude: number; longitude: number } | undefined
  });
  const [editFormData, setEditFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    school: ""
  });

  // Intern CRUD functionality states
  const [selectedInterns, setSelectedInterns] = React.useState<string[]>([]);
  const [operationLoading, setOperationLoading] = React.useState<string | null>(null);
  const [bulkActionType, setBulkActionType] = React.useState<string>("");

  console.log("🎯 ManageTeachers render - isAuthenticated:", isAuthenticated, "user:", !!user, "userProfile:", !!userProfile);

  // Fetch teachers from Firestore
  React.useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!isAuthenticated) {
          setIsLoading(false);
          return;
        }

        if (!userProfile) {
          if (!auth.currentUser) {
            setIsLoading(false);
            return;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!auth.currentUser) {
          setError("Authentication not ready. Please refresh the page.");
          setIsLoading(false);
          return;
        }

        const teachersRef = collection(db, "teachers");
        let q;
        if (userProfile?.role === "supervisor") {
          q = query(teachersRef, where('createdBy', '==', userProfile.uid), orderBy("createdAt", "desc"));
        } else {
          q = query(teachersRef, orderBy("createdAt", "desc"));
        }
        const querySnapshot = await getDocs(q);

        const teachersData: Teacher[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as any;
          console.log("📚 Teacher data from Firestore:", doc.id, data); // Debug log
          teachersData.push({
            uid: doc.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            school: data.school || "",
            createdAt: data.createdAt?.toDate() || new Date(),
            createdBy: data.createdBy || ""
          });
        });

        setTeachers(teachersData);
      } catch (err) {
        const error = err as Error;
        setError(`Database access failed: ${error.message}. You are authenticated, but Firestore permissions need to be fixed. Check the console for deployment instructions.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeachers();
  }, [userProfile, isAuthenticated]);

  // Set up real-time profile synchronization for teachers
  React.useEffect(() => {
    if (!userProfile?.uid || !isAuthenticated) return;

    console.log(`📡 Setting up real-time teacher profile sync for ${userProfile.role} ${userProfile.uid}`);
    
    const unsubscribe = subscribeToAllTeachers((updatedTeachers) => {
      console.log(`📞 Real-time teacher profile updates received:`, updatedTeachers);
      
      // Update teacher profiles in real-time
      setTeachers(prevTeachers => 
        prevTeachers.map(teacher => {
          const updatedTeacher = updatedTeachers.find(updated => updated.uid === teacher.uid);
          if (updatedTeacher) {
            console.log(`📞 Updating profile for teacher ${teacher.uid}:`, updatedTeacher);
            return { 
              ...teacher, 
              firstName: updatedTeacher.firstName || teacher.firstName,
              lastName: updatedTeacher.lastName || teacher.lastName,
              email: updatedTeacher.email || teacher.email,
              phone: updatedTeacher.phone || teacher.phone,
              school: updatedTeacher.school || teacher.school
            };
          }
          return teacher;
        })
      );
    });

    return () => {
      console.log(`📡 Cleaning up real-time teacher profile sync`);
      unsubscribe();
    };
  }, [userProfile?.uid, isAuthenticated]);

  const handleViewInterns = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setLoadingInterns(true);
    setShowInternsModal(true);

    try {
      const internsRef = collection(db, "interns");
      const q = query(internsRef, where("teacherId", "==", teacher.uid), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const internsData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setTeacherInterns(internsData);
    } catch (error) {
      setTeacherInterns([]);
    } finally {
      setLoadingInterns(false);
    }
  };

  // Set up real-time profile synchronization for teacher's interns
  React.useEffect(() => {
    if (!selectedTeacher?.uid || !showInternsModal) return;

    console.log(`📡 Setting up real-time intern profile sync for teacher ${selectedTeacher.uid}`);
    
    const unsubscribe = subscribeToTeacherInterns(selectedTeacher.uid, (updatedInterns) => {
      console.log(`📞 Real-time intern profile updates for teacher ${selectedTeacher.uid}:`, updatedInterns);
      
      // Update intern profiles in real-time
      setTeacherInterns(prevInterns => 
        prevInterns.map(intern => {
          const updatedIntern = updatedInterns.find(updated => updated.uid === intern.uid);
          if (updatedIntern) {
            console.log(`📞 Updating profile for intern ${intern.uid}:`, updatedIntern);
            return { 
              ...intern, 
              firstName: updatedIntern.firstName || intern.firstName,
              lastName: updatedIntern.lastName || intern.lastName,
              email: updatedIntern.email || intern.email,
              phone: updatedIntern.phone || intern.phone
            };
          }
          return intern;
        })
      );
    });

    return () => {
      console.log(`📡 Cleaning up real-time intern profile sync for teacher ${selectedTeacher.uid}`);
      unsubscribe();
    };
  }, [selectedTeacher?.uid, showInternsModal]);

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setEditFormData({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      school: teacher.school
    });
    setShowEditForm(true);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTeacher) return;

    try {
      const updateData = {
        ...editFormData,
        updatedAt: new Date()
      };

      // Update both collections for consistency
      await Promise.all([
        updateDoc(doc(db, "teachers", editingTeacher.uid), updateData),
        updateDoc(doc(db, "users", editingTeacher.uid), updateData)
      ]);
      console.log("✅ Teacher updated in both collections");

      setTeachers(teachers.map(teacher =>
        teacher.uid === editingTeacher.uid
          ? { ...teacher, ...editFormData }
          : teacher
      ));

      setShowEditForm(false);
      setEditingTeacher(null);
    } catch (error) {
      console.error("Error updating teacher:", error);
    }
  };

  const handleDelete = async (teacherId: string) => {
    if (!confirm("Are you sure you want to delete this teacher? This action cannot be undone.")) return;

    try {
      await deleteDoc(doc(db, "teachers", teacherId));
      setTeachers(teachers.filter(teacher => teacher.uid !== teacherId));
    } catch (error) {
      console.error("Error deleting teacher:", error);
    }
  };

  const handleCreateIntern = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTeacher || !userProfile?.uid) return;

    setIsCreatingIntern(true);

    try {
      await createInternAccount({
        ...internFormData,
        teacherId: selectedTeacher.uid
      }, userProfile.uid);

      // Wait for Firestore to propagate the new data
      await new Promise(resolve => setTimeout(resolve, 500));

      const internsRef = collection(db, "interns");
      const q = query(internsRef, where("teacherId", "==", selectedTeacher.uid), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const internsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`📱 Teacher intern ${doc.id} phone:`, data.phone);
        return {
          ...data,
          uid: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          phone: typeof data.phone === "string" ? data.phone : (data.phone ? String(data.phone) : "")
        };
      });
      console.log(`📱 Refreshed ${internsData.length} interns for teacher, phone fields:`, internsData.map(i => i.phone));
      setTeacherInterns(internsData);

      setInternFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        location: undefined
      });
      setShowAddInternForm(false);
    } catch (error) {
      console.error("Error creating intern:", error);
    } finally {
      setIsCreatingIntern(false);
    }
  };

  // 🚀 INTERN CRUD FUNCTIONS
  const handleQuickInternStatusChange = async (internId: string, newStatus: string) => {
    try {
      setOperationLoading(`status-${internId}`);
      await updateDoc(doc(db, "interns", internId), { 
        status: newStatus,
        lastActivity: new Date()
      });
      
      // Update local state
      setTeacherInterns(prev => prev.map(intern => 
        intern.uid === internId 
          ? { ...intern, status: newStatus }
          : intern
      ));
      console.log(`✅ Intern status updated to ${newStatus}`);
    } catch (error) {
      console.error("❌ Error updating intern status:", error);
      alert("Failed to update intern status. Please try again.");
    } finally {
      setOperationLoading(null);
    }
  };

  const handleArchiveIntern = async (internId: string) => {
    try {
      setOperationLoading(`archive-${internId}`);
      await updateDoc(doc(db, "interns", internId), { 
        status: 'archived',
        archivedAt: new Date(),
        lastActivity: new Date()
      });
      
      // Update local state
      setTeacherInterns(prev => prev.map(intern => 
        intern.uid === internId 
          ? { ...intern, status: 'archived' }
          : intern
      ));
      console.log("✅ Intern archived successfully");
    } catch (error) {
      console.error("❌ Error archiving intern:", error);
      alert("Failed to archive intern. Please try again.");
    } finally {
      setOperationLoading(null);
    }
  };

  const handleDeleteIntern = async (internId: string, internName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${internName}? This action cannot be undone.`)) return;
    
    try {
      setOperationLoading(`delete-${internId}`);
      await deleteDoc(doc(db, "interns", internId));
      
      // Remove from local state
      setTeacherInterns(prev => prev.filter(intern => intern.uid !== internId));
      console.log("✅ Intern deleted successfully");
    } catch (error) {
      console.error("❌ Error deleting intern:", error);
      alert("Failed to delete intern. Please try again.");
    } finally {
      setOperationLoading(null);
    }
  };

  const handleResetInternPassword = async (internId: string) => {
    if (!window.confirm("Are you sure you want to reset this intern's password? They will need to set a new password on next login.")) return;
    
    try {
      setOperationLoading(`reset-${internId}`);
      // This would typically call a cloud function to reset password
      // For now, just show a message
      alert("Password reset email will be sent to the intern's email address.");
      console.log("✅ Password reset initiated");
    } catch (error) {
      console.error("❌ Error resetting password:", error);
      alert("Failed to reset password. Please try again.");
    } finally {
      setOperationLoading(null);
    }
  };

  const handleSelectIntern = (internId: string) => {
    setSelectedInterns(prev => 
      prev.includes(internId) 
        ? prev.filter(id => id !== internId)
        : [...prev, internId]
    );
  };

  const handleSelectAllInterns = () => {
    if (selectedInterns.length === teacherInterns.length) {
      setSelectedInterns([]);
    } else {
      setSelectedInterns(teacherInterns.map(intern => intern.uid));
    }
  };

  const handleBulkInternAction = async (action: string, value?: string) => {
    if (selectedInterns.length === 0) return;
    
    const confirmMessage = action === 'delete' 
      ? `Are you sure you want to delete ${selectedInterns.length} interns?`
      : `Are you sure you want to ${action} ${selectedInterns.length} interns?`;
      
    if (!window.confirm(confirmMessage)) return;

    try {
      setBulkActionType(action);
      setOperationLoading('bulk');

      const batch = writeBatch(db);
      
      selectedInterns.forEach(internId => {
        const internRef = doc(db, "interns", internId);
        
        switch (action) {
          case 'delete':
            batch.delete(internRef);
            break;
          case 'status':
            batch.update(internRef, { 
              status: value,
              lastActivity: new Date()
            });
            break;
          case 'archive':
            batch.update(internRef, { 
              status: 'archived',
              archivedAt: new Date(),
              lastActivity: new Date()
            });
            break;
          case 'activate':
            batch.update(internRef, { 
              status: 'active',
              lastActivity: new Date()
            });
            break;
        }
      });

      await batch.commit();
      
      // Update local state
      if (action === 'delete') {
        setTeacherInterns(prev => prev.filter(intern => !selectedInterns.includes(intern.uid)));
      } else {
        setTeacherInterns(prev => prev.map(intern => {
          if (selectedInterns.includes(intern.uid)) {
            if (action === 'status') {
              return { ...intern, status: value };
            } else if (action === 'archive') {
              return { ...intern, status: 'archived' };
            } else if (action === 'activate') {
              return { ...intern, status: 'active' };
            }
          }
          return intern;
        }));
      }
      
      setSelectedInterns([]);
      console.log(`✅ Bulk ${action} completed successfully`);
    } catch (error) {
      console.error(`❌ Error in bulk ${action}:`, error);
      alert(`Failed to ${action} interns. Please try again.`);
    } finally {
      setOperationLoading(null);
      setBulkActionType("");
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      case 'archived': return 'outline';
      default: return 'default';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active': return <UserCheck className="h-4 w-4" />;
      case 'inactive': return <UserX className="h-4 w-4" />;
      case 'suspended': return <XSquare className="h-4 w-4" />;
      case 'archived': return <Archive className="h-4 w-4" />;
      default: return <UserCheck className="h-4 w-4" />;
    }
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
            <div className="text-red-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Teachers</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Teachers</h1>
            <p className="text-muted-foreground mt-2">
              View and manage all teachers in your organization
            </p>
          </div>
          <Button onClick={() => setLocation("/add-teacher")} className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Teacher
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teachers.length}</div>
              <p className="text-xs text-muted-foreground">
                Active teaching staff
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Search Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search by name, email, or school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </CardContent>
          </Card>
        </div>

        {showEditForm && editingTeacher && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Teacher</CardTitle>
              <CardDescription>Update teacher information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editFirstName">First Name *</Label>
                    <Input
                      id="editFirstName"
                      value={editFormData.firstName}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({...editFormData, firstName: e.target.value})}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="editLastName">Last Name *</Label>
                    <Input
                      id="editLastName"
                      value={editFormData.lastName}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({...editFormData, lastName: e.target.value})}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editEmail">Email Address *</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={editFormData.email}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({...editFormData, email: e.target.value})}
                      placeholder="john.doe@school.edu"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="editPhone">Phone Number *</Label>
                    <Input
                      id="editPhone"
                      value={editFormData.phone}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({...editFormData, phone: e.target.value})}
                      placeholder="+1 (555) 123-4567"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="editSchool">School *</Label>
                  <Input
                    id="editSchool"
                    value={editFormData.school}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFormData({...editFormData, school: e.target.value})}
                    placeholder="School Name"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Update Teacher</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingTeacher(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.filter(teacher => {
            if (!searchQuery) return true;
            const searchLower = searchQuery.toLowerCase();
            return (
              teacher.firstName.toLowerCase().includes(searchLower) ||
              teacher.lastName.toLowerCase().includes(searchLower) ||
              teacher.email.toLowerCase().includes(searchLower) ||
              teacher.school.toLowerCase().includes(searchLower)
            );
          }).map((teacher) => (
            <Card key={teacher.uid} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {teacher.firstName[0]}{teacher.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {teacher.firstName} {teacher.lastName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {teacher.email}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{teacher.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Joined:</span>
                    <span className="font-medium">{teacher.createdAt.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">School:</span>
                    <span className="font-medium">{teacher.school || "Not specified"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(teacher)}
                      className="gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(teacher.uid)}
                      className="gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewInterns(teacher)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Interns
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {teachers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Teachers Found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first teacher to the system.
            </p>
            <Button onClick={() => setLocation("/add-teacher")} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add First Teacher
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showInternsModal} onOpenChange={(open: boolean) => {
        setShowInternsModal(open);
        if (!open) {
          setShowAddInternForm(false);
          setInternFormData({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            password: "", // Added missing password field
            location: undefined
          });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Interns for {selectedTeacher?.firstName} {selectedTeacher?.lastName}
            </DialogTitle>
            <DialogDescription>
              View and manage interns assigned to this teacher
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingInterns ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : teacherInterns.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No Interns Found</h3>
                <p className="text-muted-foreground mb-4">
                  No interns have been assigned to this teacher yet.
                </p>
                <Button onClick={() => setShowAddInternForm(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Intern
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {teacherInterns.length} intern{teacherInterns.length !== 1 ? 's' : ''} assigned
                  </div>
                  <Button onClick={() => setShowAddInternForm(true)} size="sm" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Intern
                  </Button>
                </div>

                {/* Corrected Interns Modal */}
                <div className="space-y-4">
                  {teacherInterns.map((intern) => (
                    <div key={intern.uid} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{intern.firstName} {intern.lastName}</div>
                        <div className="text-sm text-muted-foreground">{intern.email}</div>
                        <div className="text-xs text-muted-foreground">Added {intern.createdAt?.toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">{intern.phone && intern.phone.trim() !== "" ? intern.phone : "No phone number provided"}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="destructive" onClick={() => handleDeleteIntern(intern.uid)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showAddInternForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Intern</CardTitle>
                  <CardDescription>
                    Create an intern account for {selectedTeacher?.firstName} {selectedTeacher?.lastName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateIntern} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="internFirstName">First Name *</Label>
                        <Input
                          id="internFirstName"
                          value={internFormData.firstName}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInternFormData({...internFormData, firstName: e.target.value})}
                          placeholder="John"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="internLastName">Last Name *</Label>
                        <Input
                          id="internLastName"
                          value={internFormData.lastName}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInternFormData({...internFormData, lastName: e.target.value})}
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="internEmail">Email Address *</Label>
                        <Input
                          id="internEmail"
                          type="email"
                          value={internFormData.email}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInternFormData({...internFormData, email: e.target.value})}
                          placeholder="john.doe@school.edu"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="internPhone">Phone Number *</Label>
                        <Input
                          id="internPhone"
                          value={internFormData.phone}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInternFormData({...internFormData, phone: e.target.value})}
                          placeholder="+63 (XXX) XXX-XXXX"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="internPassword">Password *</Label>
                      <Input
                        id="internPassword"
                        type="password"
                        value={internFormData.password}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInternFormData({...internFormData, password: e.target.value})}
                        placeholder="Enter a secure password"
                        required
                      />
                    </div>

                    <div>
                      <Label>Assignment Location</Label>
                      <LocationPicker
                        onLocationSelect={(location: { address: string; latitude: number; longitude: number } | undefined) => setInternFormData({...internFormData, location})}
                        initialLocation={internFormData.location}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isCreatingIntern}>
                        {isCreatingIntern ? "Creating..." : "Create Intern"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddInternForm(false);
                          setInternFormData({
                            firstName: "",
                            lastName: "",
                            email: "",
                            phone: "",
                            password: "", // Added missing password field
                            location: undefined
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
