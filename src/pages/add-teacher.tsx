import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { createTeacherAccount, getTeacherStats } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { 
  UserPlus, 
  Mail, 
  Phone, 
  User, 
  CheckCircle,
  AlertCircle,
  Plus
} from "lucide-react";

const teacherSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  school: z.string().optional(),
});

type TeacherData = z.infer<typeof teacherSchema>;

export default function AddTeacher() {
  const { userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  // Fetch dynamic stats
  const { data: teacherStats, refetch } = useQuery({
    queryKey: ["teacherStats", userProfile?.uid],
    queryFn: async () => {
      if (!userProfile?.uid) return { totalInterns: 0, totalAttendance: 0 };
      return await getTeacherStats(userProfile.uid);
    },
  });

  const form = useForm<TeacherData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      school: "",
    },
  });

  const onSubmit = async (data: TeacherData) => {
    if (!userProfile?.uid) return;
    
    setIsSubmitting(true);
    
    try {
  await createTeacherAccount(data, userProfile.uid);
      setShowSuccess(true);
      form.reset();
      refetch(); // Refresh stats
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error creating teacher account:", error);
      // You could add error handling here
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-add-teacher-title">
            Add New Teacher
          </h1>
          <p className="text-muted-foreground" data-testid="text-add-teacher-subtitle">
            Register a new teacher to join your educational team
          </p>
        </div>
        <Badge variant="default" className="text-sm">
          Supervisor Only
        </Badge>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Teacher has been successfully registered!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card data-testid="card-teacher-form">
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="w-5 h-5 mr-2" />
                Teacher Information
              </CardTitle>
              <CardDescription>
                Please fill in all required information for the new teacher
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Personal Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        {...form.register("firstName")}
                        data-testid="input-teacher-firstName"
                      />
                      {form.formState.errors.firstName && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        {...form.register("lastName")}
                        data-testid="input-teacher-lastName"
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="john.doe@school.edu"
                          className="pl-10"
                          {...form.register("email")}
                          data-testid="input-teacher-email"
                        />
                      </div>
                      {form.formState.errors.email && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          placeholder="+1 (555) 123-4567"
                          className="pl-10"
                          {...form.register("phone")}
                          data-testid="input-teacher-phone"
                        />
                      </div>
                      {form.formState.errors.phone && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="school">School</Label>
                    <Input
                      id="school"
                      placeholder="e.g., Lincoln High School"
                      {...form.register("school")}
                      data-testid="input-teacher-school"
                    />
                    {form.formState.errors.school && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.school.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter a secure password"
                      {...form.register("password")}
                      data-testid="input-teacher-password"
                    />
                    {form.formState.errors.password && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => form.reset()}
                    data-testid="button-reset-form"
                  >
                    Reset Form
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    data-testid="button-submit-teacher"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Teacher
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Guidelines Card */}
          <Card data-testid="card-guidelines">
            <CardHeader>
              <CardTitle className="text-lg">Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Ensure all required fields are completed before submission
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Teacher will receive an email invitation after registration
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Profile can be edited later from the management panel
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Statistics section removed per change request */}
        </div>
      </div>
    </div>
  );
}