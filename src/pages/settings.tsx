import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Clock,
  Save,
  Database,
  Users,
  RefreshCw,
  Download,
  Key,
  Target
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getFirestore, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { updatePhoneNumberRealtime, subscribeToPhoneUpdates, subscribeToProfileUpdates } from "@/lib/realtimeSync";
import { db } from "@/lib/firebase";

export default function SettingsPage() {
  const { userProfile, isLoading } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { toast } = useToast();

  // System monitoring states
  const [activeUsers, setActiveUsers] = React.useState(0);
  const [systemUptime, setSystemUptime] = React.useState(99.9);
  const [lastBackup, setLastBackup] = React.useState<Date | null>(null);

  // Fetch real-time system stats
  React.useEffect(() => {
    if (userProfile?.role !== 'supervisor') return;

    const db = getFirestore();
    
    // Listen for active users
    const unsubscribeUsers = onSnapshot(doc(db, 'systemStats', 'activeUsers'), 
      (doc) => {
        if (doc.exists()) {
          setActiveUsers(doc.data().count || 0);
        }
    });

    // Listen for system uptime
    const unsubscribeUptime = onSnapshot(doc(db, 'systemStats', 'uptime'), 
      (doc) => {
        if (doc.exists()) {
          setSystemUptime(doc.data().percentage || 99.9);
        }
    });

    // Listen for last backup timestamp
    const unsubscribeBackup = onSnapshot(doc(db, 'systemStats', 'backup'), 
      (doc) => {
        if (doc.exists() && doc.data().lastBackup) {
          setLastBackup(doc.data().lastBackup.toDate());
        }
    });

    return () => {
      unsubscribeUsers();
      unsubscribeUptime();
      unsubscribeBackup();
    };
  }, [userProfile?.role]);

  // State for profile editing with proper initialization from userProfile
  const [firstName, setFirstName] = React.useState(userProfile?.firstName ?? "");
  const [lastName, setLastName] = React.useState(userProfile?.lastName ?? "");
  const [email, setEmail] = React.useState(userProfile?.email ?? "");
  const [company, setCompany] = React.useState(userProfile?.company ?? "");
  const [phone, setPhone] = React.useState(userProfile?.phone ?? "");
  const [scheduledTimeIn, setScheduledTimeIn] = React.useState(userProfile?.scheduledTimeIn ?? "09:00");
  const [scheduledTimeOut, setScheduledTimeOut] = React.useState(userProfile?.scheduledTimeOut ?? "17:00");
  
  // Settings state
  const [notifications, setNotifications] = React.useState(true);
  const [emailAlerts, setEmailAlerts] = React.useState(true);
  const [locationTracking, setLocationTracking] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Role states
  const isSupervisor = userProfile?.role === "supervisor";
  const isTeacher = userProfile?.role === "teacher";
  const isIntern = userProfile?.role === "intern";

  React.useEffect(() => {
    if (userProfile && !isLoading) {
      setFirstName(userProfile.firstName ?? "");
      setLastName(userProfile.lastName ?? "");
      setEmail(userProfile.email ?? "");
      setCompany(userProfile.company ?? "");
      setPhone(userProfile.phone ?? "");
      setScheduledTimeIn(userProfile.scheduledTimeIn ?? "09:00");
      setScheduledTimeOut(userProfile.scheduledTimeOut ?? "17:00");
    }
  }, [userProfile, isLoading]);

  // Set up real-time profile synchronization for all fields
  React.useEffect(() => {
    if (!userProfile?.uid || !userProfile?.role) return;

    console.log(`📡 Setting up real-time profile sync for ${userProfile.role} ${userProfile.uid}`);
    
    const unsubscribe = subscribeToProfileUpdates(
      userProfile.uid,
      userProfile.role as 'supervisor' | 'teacher' | 'intern',
      (updatedProfile) => {
        console.log(`📞 Real-time profile update received:`, updatedProfile);
        
        // Update all form fields with the new data
        if (updatedProfile.firstName !== undefined) setFirstName(updatedProfile.firstName || "");
        if (updatedProfile.lastName !== undefined) setLastName(updatedProfile.lastName || "");
        if (updatedProfile.email !== undefined) setEmail(updatedProfile.email || "");
        if (updatedProfile.phone !== undefined) setPhone(updatedProfile.phone || "");
        if (updatedProfile.company !== undefined) setCompany(updatedProfile.company || "");
        if (updatedProfile.scheduledTimeIn !== undefined) setScheduledTimeIn(updatedProfile.scheduledTimeIn || "09:00");
        if (updatedProfile.scheduledTimeOut !== undefined) setScheduledTimeOut(updatedProfile.scheduledTimeOut || "17:00");
      }
    );

    return () => {
      console.log(`📡 Cleaning up real-time profile sync for ${userProfile.role} ${userProfile.uid}`);
      unsubscribe();
    };
  }, [userProfile?.uid, userProfile?.role]);

  // Early return with loading state if loading or no profile
  if (isLoading || !userProfile) {
    return (
      <div className="flex-1 h-screen bg-background overflow-auto">
        <div className="container mx-auto py-6 px-4 md:px-8 max-w-6xl">
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    if (!userProfile) return;
    
    setSaving(true);
    try {
      console.log(`💾 Saving profile for ${userProfile.role} ${userProfile.uid}`);
      
      // Update profile data in Firestore
      const updateData = {
        firstName,
        lastName,
        email,
        company,
        phone,
        scheduledTimeIn,
        scheduledTimeOut,
        updatedAt: new Date()
      };

      // Update the appropriate collection based on user role
      const collectionName = userProfile.role === 'supervisor' ? 'users' : 
                            userProfile.role === 'teacher' ? 'teachers' : 'interns';
      
      await updateDoc(doc(db, collectionName, userProfile.uid), updateData);
      
      // Also update users collection for consistency
      if (userProfile.role !== 'supervisor') {
        await updateDoc(doc(db, 'users', userProfile.uid), updateData);
      }
      
      console.log(`✅ Profile updated successfully for ${userProfile.role} ${userProfile.uid}`);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
      });
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 h-screen bg-background overflow-auto">
      <div className="container mx-auto py-6 px-4 md:px-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings</h2>
        </div>
        <div className="grid gap-6">
        {/* Profile Settings */}
        <Card className="border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Manage your personal information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-background dark:bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-background dark:bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background dark:bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(123) 456-7890"
                  className="bg-background dark:bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company/School</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-background dark:bg-card"
                />
              </div>
            </div>

            {isIntern && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Work Schedule
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeIn">Scheduled Time In</Label>
                    <Input
                      id="timeIn"
                      type="time"
                      value={scheduledTimeIn}
                      onChange={(e) => setScheduledTimeIn(e.target.value)}
                      className="bg-background dark:bg-card"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeOut">Scheduled Time Out</Label>
                    <Input
                      id="timeOut"
                      type="time"
                      value={scheduledTimeOut}
                      onChange={(e) => setScheduledTimeOut(e.target.value)}
                      className="bg-background dark:bg-card"
                    />
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full md:w-auto"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications Settings */}
        <Card className="border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications about important updates
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailAlerts">Email Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive important updates via email
                </p>
              </div>
              <Switch
                id="emailAlerts"
                checked={emailAlerts}
                onCheckedChange={setEmailAlerts}
              />
            </div>
            {isIntern && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="locationTracking">Location Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow location tracking for attendance
                  </p>
                </div>
                <Switch
                  id="locationTracking"
                  checked={locationTracking}
                  onCheckedChange={setLocationTracking}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="darkMode">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle between light and dark theme
                </p>
              </div>
              <Switch
                id="darkMode"
                checked={isDarkMode}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Supervisor-specific settings */}
        {isSupervisor && (
          <Card className="border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Supervisor Settings
              </CardTitle>
              <CardDescription>
                System administration and oversight controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">System Monitoring</h4>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground/90">Active Users:</span>
                    <span className="font-medium text-foreground">{activeUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground/90">System Uptime:</span>
                    <span className="font-medium text-foreground">{systemUptime}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground/90">Last Backup:</span>
                    <span className="font-medium text-foreground">
                      {lastBackup 
                        ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
                            -Math.round((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60)), 
                            'hours'
                          )
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Storage & Integration Tests</h4>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      try {
                        const { testBytescaleUpload } = await import("@/lib/migration");
                        const result = await testBytescaleUpload();
                        if (result.success) {
                          toast({
                            title: "Bytescale Test Successful",
                            description: `File uploaded successfully: ${result.result?.fileUrl}`,
                          });
                        } else {
                          throw result.error;
                        }
                      } catch (error) {
                        toast({
                          title: "Bytescale Test Failed",
                          description: error instanceof Error ? error.message : "Unknown error",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Test Bytescale Upload
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      try {
                        const { migrateUsersToIncludePhone } = await import("@/lib/migration");
                        const result = await migrateUsersToIncludePhone();
                        if (result.success) {
                          toast({
                            title: "Phone Migration Successful",
                            description: `Updated ${result.updatedCount} user records with phone fields`,
                          });
                        } else {
                          throw result.error;
                        }
                      } catch (error) {
                        toast({
                          title: "Phone Migration Failed",
                          description: error instanceof Error ? error.message : "Unknown error",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Migrate Phone Numbers
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Change Password Settings */}
        <Card className="border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your account password securely
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Change Password</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>Enter your new password below.</DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const newPassword = (form.querySelector('#newPassword') as HTMLInputElement)?.value;
                    try {
                      const { getAuth, updatePassword } = await import("firebase/auth");
                      const auth = getAuth();
                      if (auth.currentUser) {
                        await updatePassword(auth.currentUser, newPassword);
                        toast({ title: "Password updated successfully!" });
                      } else {
                        toast({ title: "No authenticated user found.", variant: "destructive" });
                      }
                    } catch (err) {
                      toast({ title: "Failed to update password.", variant: "destructive" });
                    }
                  }}
                >
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" name="newPassword" type="password" required className="mb-4" />
                  <Button type="submit" variant="secondary">Update Password</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

      </div>
      </div>
    </div>
  );
}