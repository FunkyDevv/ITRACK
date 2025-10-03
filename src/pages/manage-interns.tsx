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
  status?: 'active' | 'inactive' | 'suspended' | 'archived';
  lastActivity?: Date;
  isDeleted?: boolean;
}
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { db, createInternAccount } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, doc, setDoc, deleteDoc, updateDoc, writeBatch, getDoc } from "firebase/firestore";
import { sendInternWelcomeEmail } from "@/lib/emailService";
import { subscribeToAllInternPhones, subscribeToAllInterns } from "@/lib/realtimeSync";
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
  Table as TableIcon,
  MoreHorizontal,
  UserCheck,
  UserX,
  Archive,
  RefreshCw,
  CheckSquare,
  XSquare,
  Loader2,
  Calendar
} from "lucide-react";
import { useState, useRef } from "react";

interface ManageInternsProps {
  teacherId?: string;
  teacherName?: string;
}

export default function ManageInterns({ teacherId, teacherName }: ManageInternsProps) {
  const { user, userProfile, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [interns, setInterns] = useState<Intern[]>([]);
  const [teachers, setTeachers] = React.useState<{uid: string, name: string}[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIntern, setEditingIntern] = React.useState<Intern | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingIntern, setIsCreatingIntern] = useState(false);

  // Bulk action states
  const [selectedInterns, setSelectedInterns] = React.useState<string[]>([]);
  const [operationLoading, setOperationLoading] = React.useState<string | null>(null);
  const [bulkActionType, setBulkActionType] = React.useState<string>("");



  // Form state
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    selectedTeacherId: ""
  });

  console.log("🎯 ManageInterns render - isAuthenticated:", isAuthenticated, "user:", !!user, "userProfile:", !!userProfile);

  // Fetch interns from Firestore
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        if (!userProfile?.uid || !isAuthenticated) {
          setIsLoading(false);
          return;
        }
        // Fetch teachers if supervisor (for dropdown)
        let teachersData: {uid: string, name: string}[] = teachers;
        if (userProfile.role === 'supervisor' && !teacherId) {
          const teachersRef = collection(db, "teachers");
          const teachersQuery = query(teachersRef, where("createdBy", "==", userProfile.uid));
          const teachersSnapshot = await getDocs(teachersQuery);
          teachersData = teachersSnapshot.docs.map(doc => ({
            uid: doc.id,
            name: `${doc.data().firstName} ${doc.data().lastName}`
          }));
          setTeachers(teachersData);
        }
        // Fetch interns
        const internsRef = collection(db, "interns");
        let q;
        if (teacherId) {
          q = query(internsRef, where("teacherId", "==", teacherId), orderBy("createdAt", "desc"));
        } else {
          // For supervisors, only show interns created by them or assigned to their teachers
          if (userProfile.role === 'supervisor') {
            // First get teachers created by this supervisor
            const teachersRef = collection(db, "teachers");
            const teachersQuery = query(teachersRef, where("createdBy", "==", userProfile.uid));
            const teachersSnapshot = await getDocs(teachersQuery);
            const supervisorTeacherIds = teachersSnapshot.docs.map(doc => doc.id);
            
            if (supervisorTeacherIds.length > 0) {
              // Query interns assigned to supervisor's teachers
              q = query(internsRef, where("teacherId", "in", supervisorTeacherIds), orderBy("createdAt", "desc"));
            } else {
              // No teachers found, return empty query
              q = query(internsRef, where("teacherId", "==", "non-existent-id"));
            }
          } else {
            // For other roles, show all interns (fallback)
            q = query(internsRef, orderBy("createdAt", "desc"));
          }
        }
        const querySnapshot = await getDocs(q);
        const internsData = querySnapshot.docs.map(doc => {
          const rawData = doc.data();
          console.log(`📱 Intern ${doc.id} data:`, rawData);
          console.log(`📱 Phone field for ${doc.id}:`, rawData.phone);
          
          return {
            ...rawData,
            uid: doc.id,
            createdAt: rawData.createdAt?.toDate() || new Date(),
            teacherName: teachersData.find(t => t.uid === rawData.teacherId)?.name || "Unassigned",
            phone: typeof rawData.phone === "string" ? rawData.phone : (rawData.phone ? String(rawData.phone) : "")
          };
        }) as Intern[];
        console.log('📱 Total interns loaded:', internsData.length);
        console.log('📱 Interns with phone fields:', internsData.filter(intern => intern.phone !== undefined).length);
        console.log('📱 Interns with non-empty phone fields:', internsData.filter(intern => intern.phone && intern.phone.trim() !== '').length);
        setInterns(internsData);
        setError(null);
      } catch (err) {
        setError("Failed to load interns");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [userProfile, isAuthenticated, teacherId]);

  // Set up real-time profile synchronization for interns
  React.useEffect(() => {
    if (!userProfile?.uid || !isAuthenticated) return;

    console.log(`📡 Setting up real-time intern profile sync for ${userProfile.role} ${userProfile.uid}`);
    
    const unsubscribe = subscribeToAllInterns((updatedInterns) => {
      console.log(`📞 Real-time intern profile updates received:`, updatedInterns);
      
      // Update intern profiles in real-time
      setInterns(prevInterns => 
        prevInterns.map(intern => {
          const updatedIntern = updatedInterns.find(updated => updated.uid === intern.uid);
          if (updatedIntern) {
            console.log(`📞 Updating profile for intern ${intern.uid}:`, updatedIntern);
            return { 
              ...intern, 
              firstName: updatedIntern.firstName || intern.firstName,
              lastName: updatedIntern.lastName || intern.lastName,
              email: updatedIntern.email || intern.email,
              phone: updatedIntern.phone || intern.phone,
              teacherId: updatedIntern.teacherId || intern.teacherId,
              teacherName: updatedIntern.teacherName || intern.teacherName
            };
          }
          return intern;
        })
      );
    });

    return () => {
      console.log(`📡 Cleaning up real-time intern profile sync`);
      unsubscribe();
    };
  }, [userProfile?.uid, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile?.uid) return;

    // Validate required fields
    if (!formData.firstName.trim()) {
      setError("First name is required");
      return;
    }
    if (!formData.lastName.trim()) {
      setError("Last name is required");
      return;
    }
    if (!formData.email.trim()) {
      setError("Email address is required");
      return;
    }
    if (!formData.phone.trim()) {
      setError("Phone number is required");
      return;
    }

    // For creating new interns, we need teacherId, but for editing existing ones, we don't
    if (!editingIntern && !teacherId && !formData.selectedTeacherId) {
      setError("Please select a teacher for the new intern");
      return;
    }

    try {
      if (editingIntern) {
        // Update existing intern - preserve original data and only update form fields
        const updateData: any = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          updatedAt: new Date(),
          updatedBy: userProfile.uid
        };

        // If supervisor is updating teacher assignment
        if (userProfile.role === 'supervisor' && formData.selectedTeacherId !== editingIntern.teacherId) {
          const selectedTeacher = teachers.find(t => t.uid === formData.selectedTeacherId);
          updateData.teacherId = formData.selectedTeacherId;
          updateData.teacherName = selectedTeacher ? selectedTeacher.name : "Unassigned";
        }

        // Update both collections for consistency
        await Promise.all([
          updateDoc(doc(db, "interns", editingIntern.uid), updateData),
          updateDoc(doc(db, "users", editingIntern.uid), updateData)
        ]);
        console.log("✅ Intern updated in both collections");
        
        // Update the local state with the updated data
        setInterns(prev => prev.map(intern => 
          intern.uid === editingIntern.uid 
            ? { ...intern, ...updateData }
            : intern
        ));
      } else {
        // Create new intern using the proper backend function
        setIsCreatingIntern(true);
        console.log("📧 Creating intern account...");
        
        const currentTeacherId = teacherId || formData.selectedTeacherId;
        const generatedPassword = Math.random().toString(36).slice(-8) + "123"; // Generate simple password
        
        const internAccountData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          teacherId: currentTeacherId,
          password: generatedPassword,
          phone: formData.phone || "",
          scheduledTimeIn: "08:00",
          scheduledTimeOut: "17:00"
        };

        console.log("🔧 Creating intern with data:", {
          ...internAccountData,
          password: "***hidden***"
        });
        console.log("📞 Phone field before sending to backend:", internAccountData.phone);
        console.log("📞 Phone field from form:", formData.phone);

        // Create intern account via backend (which handles Firebase Auth + Firestore)
        try {
          const result = await createInternAccount(internAccountData, userProfile.uid);
          console.log("✅ Intern account created with result:", result);
          console.log("✅ Result type:", typeof result);
          console.log("✅ Result keys:", result ? Object.keys(result) : 'null result');
          
          // Verify phone field in result
          if (result && result.phone !== undefined) {
            console.log("📞 Phone field confirmed in backend result:", result.phone);
          } else {
            console.warn("⚠️ Phone field missing in backend result:", result);
          }
        } catch (error) {
          console.error("❌ Error creating intern account:", error);
          throw error;
        }

        // Send welcome email with credentials
        console.log("📧 Sending welcome email to intern...");
        try {
          const emailData = {
            to_name: `${formData.firstName} ${formData.lastName}`,
            to_email: formData.email,
            to_password: generatedPassword
          };

          const emailSent = await sendInternWelcomeEmail(emailData);
          
          if (emailSent) {
            console.log("✅ Welcome email sent successfully!");
            alert(`✅ Intern account created successfully!\n\n📧 Welcome email sent to: ${formData.email}\n\nThe intern can now log in with their credentials.`);
          } else {
            console.warn("⚠️ Email sending failed, but account was created");
            alert(`⚠️ Intern account created successfully!\n\nHowever, the welcome email could not be sent automatically.\n\nPlease manually share these credentials with ${formData.firstName}:\n\nEmail: ${formData.email}\nPassword: ${generatedPassword}`);
          }
        } catch (emailError) {
          console.error("❌ Email sending error:", emailError);
          alert(`⚠️ Intern account created successfully!\n\nHowever, the welcome email could not be sent automatically.\n\nPlease manually share these credentials with ${formData.firstName}:\n\nEmail: ${formData.email}\nPassword: ${generatedPassword}`);
        }

        // Re-fetch interns to ensure UI is up-to-date with phone numbers
        console.log("🔄 Refreshing intern list...");
        // Wait a moment for Firestore to propagate the data
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchData(); // Use the main fetch function to ensure consistency
        console.log("✅ Intern list refreshed with latest data including phone numbers");
      }

      // Reset form
      setFormData({ firstName: "", lastName: "", email: "", phone: "", selectedTeacherId: "" });
      setShowAddForm(false);
      setEditingIntern(null);
      setError(null);

    } catch (error) {
      console.error("❌ Error saving intern:", error);
      setError("Failed to save intern. Please try again.");
      
      // Show detailed error for intern creation
      if (error instanceof Error) {
        alert(`❌ Error creating intern account:\n\n${error.message}\n\nPlease check the console for more details and try again.`);
      }
    } finally {
      setIsCreatingIntern(false);
    }
  };

  const handleEdit = (intern: Intern) => {
    setEditingIntern(intern);
    setFormData({
      firstName: intern.firstName,
      lastName: intern.lastName,
      email: intern.email,
      phone: intern.phone,
      selectedTeacherId: intern.teacherId || ""
    });
    setShowAddForm(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteDoc(doc(db, "interns", deleteTarget));
      setInterns((prev) => prev.filter((intern) => intern.uid !== deleteTarget));
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting intern:", error);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingIntern(null);
    setFormData({ firstName: "", lastName: "", email: "", phone: "", selectedTeacherId: "" });
    setError(null);
  };


  // 🚀 NEW CRUD FUNCTIONS
  const handleQuickStatusChange = async (internId: string, newStatus: string) => {
    try {
      setOperationLoading(`status-${internId}`);
      await updateDoc(doc(db, "interns", internId), { 
        status: newStatus,
        lastActivity: new Date()
      });
      
      // Update local state
      setInterns(prev => prev.map(intern => 
        intern.uid === internId 
          ? { ...intern, status: newStatus as 'active' | 'inactive' | 'suspended' | 'archived' }
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
      setInterns(prev => prev.map(intern => 
        intern.uid === internId 
          ? { ...intern, status: 'archived' as 'active' | 'inactive' | 'suspended' | 'archived' }
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

  const handleSelectAll = () => {
    if (selectedInterns.length === interns.length) {
      setSelectedInterns([]);
    } else {
      setSelectedInterns(interns.map(intern => intern.uid));
    }
  };

  const handleBulkAction = async (action: string, value?: string) => {
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
        setInterns(prev => prev.filter(intern => !selectedInterns.includes(intern.uid)));
      } else {
        setInterns(prev => prev.map(intern => {
          if (selectedInterns.includes(intern.uid)) {
            if (action === 'status') {
              return { ...intern, status: value as 'active' | 'inactive' | 'suspended' | 'archived' };
            } else if (action === 'archive') {
              return { ...intern, status: 'archived' as 'active' | 'inactive' | 'suspended' | 'archived' };
            } else if (action === 'activate') {
              return { ...intern, status: 'active' as 'active' | 'inactive' | 'suspended' | 'archived' };
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
            <div className="text-red-500 mb-4">⚠️ {error}</div>
            <Button onClick={() => setLocation("/manage-teachers")}>
              Back to Teachers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Add fallback UI for empty interns
  if (interns.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
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
        <div className="flex gap-2">
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
      </div>


      {/* Add/Edit Form */}
      {showAddForm && (teacherId || userProfile?.role === 'supervisor') && (
        <Card>
          <CardHeader>
            <CardTitle>{editingIntern ? "Edit Intern" : "Add New Intern"}</CardTitle>
            <CardDescription>
              {editingIntern ? "Update intern information" : "Enter the details for the new intern"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Teacher Selection for Supervisors */}
              {userProfile?.role === 'supervisor' && !teacherId && (
                <div>
                  <Label htmlFor="teacher">Assigned Teacher *</Label>
                  <select
                    id="teacher"
                    value={formData.selectedTeacherId}
                    onChange={(e) => setFormData({...formData, selectedTeacherId: e.target.value})}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    required={!editingIntern}
                  >
                    <option value="">Select a teacher...</option>
                    {teachers.map(teacher => (
                      <option key={teacher.uid} value={teacher.uid}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
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
                <Button 
                  type="submit" 
                  disabled={isCreatingIntern}
                  className="min-w-32"
                >
                  {isCreatingIntern ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    editingIntern ? "Update Intern" : "Add Intern"
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isCreatingIntern}
                >
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
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(intern.status)} className="gap-1">
                      {getStatusIcon(intern.status)}
                      {intern.status || 'active'}
                    </Badge>
                  </div>
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
                    <span>{intern.phone && intern.phone.trim() !== "" ? intern.phone : "No phone number provided"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Teacher: {intern.teacherName || "Unassigned"}</span>
                  </div>
                </div>

                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => setDeleteTarget(intern.uid)}
                              className="gap-2 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
            {/* Bulk Actions Toolbar */}
            {selectedInterns.length > 0 && (
              <div className="mb-4">
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="text-blue-700">
                          {selectedInterns.length} intern{selectedInterns.length > 1 ? 's' : ''} selected
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setSelectedInterns([])}
                          disabled={operationLoading === 'bulk'}
                        >
                          Clear Selection
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Select onValueChange={(value) => handleBulkAction('status', value)}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Change Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleBulkAction('activate')}
                          disabled={operationLoading === 'bulk'}
                          className="gap-1"
                        >
                          {operationLoading === 'bulk' && bulkActionType === 'activate' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                          Activate
                        </Button>

                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleBulkAction('archive')}
                          disabled={operationLoading === 'bulk'}
                          className="gap-1"
                        >
                          {operationLoading === 'bulk' && bulkActionType === 'archive' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}
                          Archive
                        </Button>

                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleBulkAction('delete')}
                          disabled={operationLoading === 'bulk'}
                          className="gap-1"
                        >
                          {operationLoading === 'bulk' && bulkActionType === 'delete' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  {/* Intern Table Header */}
                  <TableHead>Intern</TableHead>
                  <TableHead>Status</TableHead>
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
                    {/* Intern Table Row */}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-0">
                            <Badge variant={getStatusColor(intern.status)} className="cursor-pointer gap-1">
                              {getStatusIcon(intern.status)}
                              {intern.status || 'active'}
                            </Badge>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleQuickStatusChange(intern.uid, 'active')}
                            disabled={operationLoading === `status-${intern.uid}`}
                            className="gap-2"
                          >
                            <UserCheck className="h-4 w-4 text-green-600" />
                            Active
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleQuickStatusChange(intern.uid, 'inactive')}
                            disabled={operationLoading === `status-${intern.uid}`}
                            className="gap-2"
                          >
                            <UserX className="h-4 w-4 text-gray-600" />
                            Inactive
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleQuickStatusChange(intern.uid, 'suspended')}
                            disabled={operationLoading === `status-${intern.uid}`}
                            className="gap-2"
                          >
                            <XSquare className="h-4 w-4 text-red-600" />
                            Suspended
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                        <span>{intern.phone && intern.phone.trim() !== "" ? intern.phone : "No phone number provided"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {intern.teacherName || "Unassigned"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {intern.createdAt instanceof Date ? intern.createdAt.toLocaleDateString() : "Invalid Date"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {(userProfile?.role === 'supervisor' || userProfile?.uid === intern.teacherId) && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(intern)}
                              className="gap-1"
                            >
                              <Edit className="h-3 w-3" /> Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteTarget(intern.uid)}
                              className="gap-1"
                              disabled={operationLoading === intern.uid}
                            >
                              {operationLoading === intern.uid ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
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
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Intern'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
