import * as React from "react";
import { Modal, ModalHeader, ModalContent } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, loginSchema, type SignupData, type LoginData } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { loginWithEmailAndPassword, registerWithEmailAndPassword, getUserProfile, logoutUser } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Info } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = "login" | "signup";

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = React.useState<AuthMode>("login");
  const { toast } = useToast();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      role: undefined,
    },
  });

  const signupForm = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const userCredential = await loginWithEmailAndPassword(data.email, data.password);
      return userCredential;
    },
    onSuccess: async (userCredential) => {
      try {
        const selectedRole = loginForm.getValues("role");
        const profile = await getUserProfile(userCredential.user);
        if (profile && profile.role !== selectedRole) {
          // Role selected at login does not match stored role — prevent access
          await logoutUser();
          toast({
            title: "Role Mismatch",
            description: `Your account is registered as ${profile.role}. Please select the correct role when signing in.`,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Login Successful",
          description: "Welcome back to your dashboard!",
        });
        onClose();
        // Router will automatically show the dashboard
      } catch (err: any) {
        console.error('Error validating role after login', err);
        toast({
          title: 'Login Error',
          description: err?.message || 'An error occurred during login validation',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupData) => {
      const userCredential = await registerWithEmailAndPassword(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        role: "supervisor",
        company: data.company,
        phone: data.phone,
      });
      return userCredential;
    },
    onSuccess: () => {
      toast({
        title: "Account Created",
        description: "Your supervisor account has been created successfully! Welcome to your dashboard!",
      });
      onClose();
      // Router will automatically show the dashboard
    },
    onError: (error: any) => {
      toast({
        title: "Signup Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    onClose();
    setMode("login");
    loginForm.reset();
    signupForm.reset();
  };

  const onLoginSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onSignupSubmit = (data: SignupData) => {
    signupMutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalHeader onClose={handleClose}>
        <h2 className="text-2xl font-bold text-foreground">
          {mode === "login" ? "Welcome Back" : "Create Supervisor Account"}
        </h2>
      </ModalHeader>

      <ModalContent>
        {mode === "login" ? (
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email Address</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  {...loginForm.register("email")}
                  data-testid="input-login-email"
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  {...loginForm.register("password")}
                  data-testid="input-login-password"
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="login-role">Login As</Label>
                <Select 
                  onValueChange={(value) => loginForm.setValue("role", value as "supervisor" | "teacher" | "intern")}
                  value={loginForm.watch("role")}
                >
                  <SelectTrigger data-testid="select-login-role">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
                {loginForm.formState.errors.role && (
                  <p className="text-sm text-destructive mt-1">
                    {loginForm.formState.errors.role.message}
                  </p>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="button-login-submit"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-primary hover:underline font-medium"
                  data-testid="button-show-signup"
                >
                  Sign up as Supervisor
                </button>
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> Only supervisors can create new accounts. Interns will receive access from their supervisors.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signup-firstName">First Name</Label>
                  <Input
                    id="signup-firstName"
                    type="text"
                    placeholder="John"
                    {...signupForm.register("firstName")}
                    data-testid="input-signup-firstName"
                  />
                  {signupForm.formState.errors.firstName && (
                    <p className="text-sm text-destructive mt-1">
                      {signupForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="signup-lastName">Last Name</Label>
                  <Input
                    id="signup-lastName"
                    type="text"
                    placeholder="Doe"
                    {...signupForm.register("lastName")}
                    data-testid="input-signup-lastName"
                  />
                  {signupForm.formState.errors.lastName && (
                    <p className="text-sm text-destructive mt-1">
                      {signupForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="signup-email">Email Address</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="john.doe@company.com"
                  {...signupForm.register("email")}
                  data-testid="input-signup-email"
                />
                {signupForm.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {signupForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="signup-company">School</Label>
                <Input
                  id="signup-company"
                  type="text"
                  placeholder="Your school name"
                  {...signupForm.register("company")}
                  data-testid="input-signup-company"
                />
                {signupForm.formState.errors.company && (
                  <p className="text-sm text-destructive mt-1">
                    {signupForm.formState.errors.company.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="signup-phone">Phone</Label>
                <Input
                  id="signup-phone"
                  type="tel"
                  placeholder="09XXXXXXXXX"
                  {...signupForm.register("phone")}
                  data-testid="input-signup-phone"
                />
                {signupForm.formState.errors.phone && (
                  <p className="text-sm text-destructive mt-1">
                    {signupForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a strong password"
                  {...signupForm.register("password")}
                  data-testid="input-signup-password"
                />
                {signupForm.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {signupForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="signup-confirmPassword">Confirm Password</Label>
                <Input
                  id="signup-confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  {...signupForm.register("confirmPassword")}
                  data-testid="input-signup-confirmPassword"
                />
                {signupForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive mt-1">
                    {signupForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={signupMutation.isPending}
              data-testid="button-signup-submit"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {signupMutation.isPending ? "Creating Account..." : "Create Supervisor Account"}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-primary hover:underline font-medium"
                  data-testid="button-show-login"
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
