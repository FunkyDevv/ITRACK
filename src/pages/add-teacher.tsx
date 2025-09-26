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
import { sendTeacherWelcomeEmail, sendTestEmail } from "@/lib/emailService";
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
  phone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[\+]?[\d\s\-\(\)]+$/, "Please enter a valid phone number")
    .refine((phone) => {
      const cleaned = phone.replace(/\D/g, '');
      return cleaned.length >= 10 && cleaned.length <= 15;
    }, "Phone number must be between 10-15 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  school: z.string().optional(),
});

type TeacherData = z.infer<typeof teacherSchema>;

export default function AddTeacher() {
  const { userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [emailWarning, setEmailWarning] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [testingEmail, setTestingEmail] = React.useState(false);

  // Test function for debugging EmailJS
  const handleTestEmail = async () => {
    const testEmail = prompt("Enter email address to test EmailJS:");
    if (!testEmail) return;
    
    setTestingEmail(true);
    console.log("🧪 Testing EmailJS with email:", testEmail);
    
    try {
      await sendTestEmail(testEmail);
      alert("Test email sent! Check console for details.");
    } catch (error) {
      console.error("Test email failed:", error);
      alert("Test email failed. Check console for details.");
    }
    
    setTestingEmail(false);
  };

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
    
    console.log("📝 Submitting teacher data:", data); // Debug log
    setIsSubmitting(true);
    setErrorMessage(null); // Clear previous errors
    
    // Add timeout to prevent infinite loading - increased to 2 minutes
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      setErrorMessage("Request timeout - The server is taking too long to respond. Please try again.");
      console.error("⏰ Teacher creation timeout - taking too long");
    }, 120000); // 2 minutes (120 seconds) timeout
    
    try {
      // Create teacher account first
      await createTeacherAccount(data, userProfile.uid);
      clearTimeout(timeoutId); // Clear timeout on success
      
      // Send welcome email with credentials
      console.log("📧 Attempting to send welcome email...");
      console.log("📧 Email data:", {
        to_name: `${data.firstName} ${data.lastName}`,
        to_email: data.email,
        password_length: data.password.length
      });
      
      const emailSent = await sendTeacherWelcomeEmail({
        to_name: `${data.firstName} ${data.lastName}`,
        to_email: data.email,
        to_password: data.password,
      });
      
      console.log("📧 Email send result:", emailSent);
      
      if (emailSent) {
        console.log("✅ Welcome email sent successfully");
        setShowSuccess(true);
        setEmailWarning(false);
      } else {
        console.warn("⚠️ Teacher account created but email failed to send");
        setEmailWarning(true);
        setShowSuccess(false);
      }
      
      form.reset();
      refetch(); // Refresh stats
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setEmailWarning(false);
      }, 5000);
    } catch (error) {
      clearTimeout(timeoutId); // Clear timeout on error
      console.error("Error creating teacher account:", error);
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : "Failed to create teacher account. Please try again."
      );
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
            Teacher has been successfully registered and welcome email has been sent with login credentials!
          </AlertDescription>
        </Alert>
      )}

      {/* Email Warning Alert */}
      {emailWarning && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            Teacher account created successfully, but the welcome email failed to send. Please manually provide the login credentials to the teacher.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            {errorMessage}
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
                        Creating account and sending email... (may take up to 2 minutes)
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
                  Teacher will automatically receive an email with their login credentials
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Profile can be edited later from the management panel
                </p>
              </div>
              
              {/* Debug Test Email Button */}
              <div className="pt-4 border-t">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="w-full"
                >
                  {testingEmail ? "Testing..." : "🧪 Test Email (Debug)"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Use this to test if EmailJS is working
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