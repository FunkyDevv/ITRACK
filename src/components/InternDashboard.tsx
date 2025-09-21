import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  createAttendanceRecord,
  updateAttendanceTimeOut,
  getInternAttendanceRecords,
  getCurrentAttendanceSession,
  getPendingAttendanceSession,
  getInternProfile,
  migrateAttendanceRecords,
  fixInternTeacherIds,
  debugGetAllAttendanceRecords,
  AttendanceRecord,
  InternProfile
} from "@/lib/firebase";
import { onSnapshot, collection, query, where, orderBy, Timestamp, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as Bytescale from "@bytescale/upload-widget";
import { useRef, useState } from "react";
import {
  Clock,
  Camera,
  MapPin,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  LogIn,
  LogOut,
  Activity,
  Upload,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function InternDashboard() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [internProfile, setInternProfile] = React.useState<InternProfile | null>(null);
  const [currentAttendance, setCurrentAttendance] = React.useState<AttendanceRecord | null>(null);
  const [pendingAttendance, setPendingAttendance] = React.useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = React.useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const [isCheckingOut, setIsCheckingOut] = React.useState(false);
  const [currentLocation, setCurrentLocation] = React.useState<{
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);

  // Request location permission and get current location
  React.useEffect(() => {
    const requestLocation = async () => {
      if (!navigator.geolocation) {
        toast({
          title: "Location Not Supported",
          description: "Your browser doesn't support location services",
          variant: "destructive",
        });
        return;
      }

      // Request permission first
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
        if (permission.state === 'denied') {
          toast({
            title: "Location Permission Denied",
            description: "Please enable location access in your browser settings for attendance tracking",
            variant: "destructive",
          });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
              );
              const data = await response.json();
              const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

              setCurrentLocation({
                address,
                latitude,
                longitude
              });

              console.log("📍 Location acquired:", { address, latitude, longitude });
            } catch (error) {
              console.error('Error getting address:', error);
              setCurrentLocation({
                address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                latitude,
                longitude
              });
            }
          },
          (error) => {
            console.error('Error getting location:', error);
            toast({
              title: "Location Access Required",
              description: "Please allow location access to use attendance tracking",
              variant: "destructive",
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      } catch (error) {
        console.error('Error checking permissions:', error);
        // Fallback for browsers that don't support permissions API
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentLocation({
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              latitude,
              longitude
            });
          },
          (error) => {
            console.error('Error getting location:', error);
            toast({
              title: "Location Required",
              description: "Location access is needed for attendance tracking",
              variant: "destructive",
            });
          }
        );
      }
    };

    requestLocation();
  }, [toast]);

  // Load intern profile and attendance data
  React.useEffect(() => {
    const loadData = async () => {
      if (!userProfile?.uid) return;

      try {
        setIsLoading(true);

        // Get intern profile first
        const profile = await getInternProfile(userProfile.uid);
        if (!profile) {
          toast({
            title: "Error",
            description: "Intern profile not found",
            variant: "destructive",
          });
          return;
        }
        
        console.log("🧑‍🎓 Intern profile loaded:", profile);
        console.log("👨‍🏫 TeacherId from profile:", profile.teacherId);
        
        if (!profile.teacherId) {
          toast({
            title: "Error", 
            description: "Teacher assignment not found",
            variant: "destructive",
          });
          return;
        }
        
        setInternProfile({
          ...profile,
          id: userProfile.uid
        } as InternProfile);

        // Get current attendance session (approved and active)
        const currentSession = await getCurrentAttendanceSession(userProfile.uid);
        setCurrentAttendance(currentSession);

        // Get pending attendance session
        const pendingSession = await getPendingAttendanceSession(userProfile.uid);
        setPendingAttendance(pendingSession);

        // Get attendance history (approved sessions only)
        const history = await getInternAttendanceRecords(userProfile.uid);
        setAttendanceHistory(history);

        console.log("📊 Loaded intern data:", { profile, currentSession, pendingSession, history });
      } catch (error) {
        console.error("❌ Error loading intern data:", error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Run migration once to fix existing records
    const runMigration = async () => {
      try {
        const [migrated, fixed] = await Promise.all([
          migrateAttendanceRecords(),
          fixInternTeacherIds()
        ]);
        
        if (migrated || fixed) {
          console.log(`🔄 Migration completed, reloading data...`);
          // Reload data after migration
          setTimeout(loadData, 1000);
        }
      } catch (error) {
        console.error("❌ Migration failed:", error);
      }
    };
    
    runMigration();

    // Set up real-time listener for attendance updates
    if (userProfile?.uid) {
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("internId", "==", userProfile.uid),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(attendanceQuery, async (snapshot) => {
        console.log("📡 Real-time attendance update received - documents changed:", snapshot.docs.length);
        
        // Force reload - check current and pending sessions using queries
        try {
          console.log("🔄 REAL-TIME UPDATE - Refreshing all attendance data...");
          
          // Debug: Get ALL attendance records first
          await debugGetAllAttendanceRecords(userProfile.uid);
          
          // Get current approved session without clockOut
          const currentSession = await getCurrentAttendanceSession(userProfile.uid);
          console.log("🎯 CURRENT SESSION (approved, no clockOut):", currentSession);
          
          // Get pending session
          const pendingSession = await getPendingAttendanceSession(userProfile.uid);
          console.log("⏳ PENDING SESSION:", pendingSession);
          
          // Update states
          setCurrentAttendance(currentSession);
          setPendingAttendance(pendingSession);

          // Update history - this should now show ALL records, not replace them
          const history = await getInternAttendanceRecords(userProfile.uid);
          console.log("📜 HISTORY UPDATE - Total records:", history.length);
          setAttendanceHistory(history);

          console.log("✅ REAL-TIME UPDATE COMPLETE - Current:", !!currentSession, "Pending:", !!pendingSession);
        } catch (error) {
          console.error("❌ Error in real-time update:", error);
        }
      });

      return () => {
        console.log("🔄 Cleaning up real-time listener");
        unsubscribe();
      };
    }
  }, [userProfile?.uid, toast]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const openCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to take a photo.",
        variant: "destructive",
      });
      setIsCameraOpen(false);
    }
  };

  const closeCamera = () => {
    setIsCameraOpen(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      setPhotoUrl(dataUrl);
      toast({
        title: "Photo Captured",
        description: "Your photo has been captured successfully!",
      });
      closeCamera();
    }
    setIsCapturing(false);
  };

  const handleTimeIn = async () => {
    if (!currentLocation) {
      toast({
        title: "Location Required",
        description: "Please allow location access for time-in",
        variant: "destructive",
      });
      return;
    }

    if (!userProfile?.uid) {
      toast({
        title: "Error",
        description: "User profile not found",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingIn(true);

    try {
      // Check if intern has already completed attendance for today
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const todayCompletedSessions = attendanceHistory.filter(record => {
        const recordDate = record.clockIn?.toDate();
        return recordDate && 
               recordDate >= todayStart && 
               recordDate < todayEnd && 
               record.clockOut && // Has both clock in and clock out
               record.status === 'approved';
      });

      if (todayCompletedSessions.length > 0) {
        toast({
          title: "Attendance Complete",
          description: "You have already completed your attendance for today. You cannot check in again.",
          variant: "destructive",
        });
        setIsCheckingIn(false);
        return;
      }

      // Photo is now mandatory
      if (!photoUrl) {
        toast({
          title: "Photo Required",
          description: "Please upload a photo before checking in",
          variant: "destructive",
        });
        setIsCheckingIn(false);
        return;
      }

      if (!internProfile?.teacherId) {
        toast({
          title: "Error",
          description: "Teacher assignment not found",
          variant: "destructive",
        });
        return;
      }

      // Check if intern is late
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const scheduledTimeIn = internProfile.scheduledTimeIn;
      
      let isLate = false;
      if (scheduledTimeIn) {
        // Convert both times to minutes for proper comparison
        const [currentHour, currentMin] = currentTime.split(':').map(Number);
        const [scheduledHour, scheduledMin] = scheduledTimeIn.split(':').map(Number);
        
        const currentTotalMinutes = currentHour * 60 + currentMin;
        const scheduledTotalMinutes = scheduledHour * 60 + scheduledMin;
        
        isLate = currentTotalMinutes > scheduledTotalMinutes;
        
        console.log("⏰ Late check:", {
          current: currentTime,
          scheduled: scheduledTimeIn,
          currentMinutes: currentTotalMinutes,
          scheduledMinutes: scheduledTotalMinutes,
          isLate
        });
      }

      const newAttendance = await createAttendanceRecord({
        internId: userProfile.uid,
        teacherId: internProfile.teacherId,
        clockIn: Timestamp.fromDate(new Date()),
        location: currentLocation.address,
        coordinates: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        },
        photoUrl: photoUrl,
        status: "pending",
        isLate: isLate || false
      });

      // Set as pending attendance, not current
      setPendingAttendance({
        id: newAttendance,
        internId: userProfile.uid,
        teacherId: internProfile.teacherId,
        clockIn: Timestamp.fromDate(new Date()),
        location: currentLocation.address,
        coordinates: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        },
        photoUrl: photoUrl,
        status: "pending",
        createdAt: Timestamp.fromDate(new Date()),
        clockOut: undefined
      } as AttendanceRecord);
      
      // Clear photo after successful submission
      setPhotoUrl(null);

      toast({
        title: "Time-In Successful",
        description: "Your attendance has been recorded and is pending approval",
      });

    } catch (error) {
      console.error("❌ Error during time-in:", error);
      toast({
        title: "Time-In Failed",
        description: "Failed to record your time-in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleTimeOut = async () => {
    if (!currentAttendance || !userProfile?.uid) {
      toast({
        title: "Error",
        description: "No active session found",
        variant: "destructive",
      });
      return;
    }

    // Check if intern is timing out early
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const scheduledTimeOut = internProfile?.scheduledTimeOut;
    
    let isEarly = false;
    if (scheduledTimeOut) {
      // Convert both times to minutes for proper comparison
      const [currentHour, currentMin] = currentTime.split(':').map(Number);
      const [scheduledHour, scheduledMin] = scheduledTimeOut.split(':').map(Number);
      
      const currentTotalMinutes = currentHour * 60 + currentMin;
      const scheduledTotalMinutes = scheduledHour * 60 + scheduledMin;
      
      isEarly = currentTotalMinutes < scheduledTotalMinutes;
      
      console.log("⏰ Early checkout check:", {
        current: currentTime,
        scheduled: scheduledTimeOut,
        currentMinutes: currentTotalMinutes,
        scheduledMinutes: scheduledTotalMinutes,
        isEarly
      });
    }
    
    if (isEarly) {
      toast({
        title: "Early Time-Out Warning",
        description: `You are timing out before your scheduled time (${scheduledTimeOut}). You can still proceed.`,
        variant: "destructive",
      });
    }

    setIsCheckingOut(true);

    try {
      await updateAttendanceTimeOut(currentAttendance.id!, new Date(), isEarly || false);
      
      console.log("🔄 Time out complete, clearing current session");
      setCurrentAttendance(null);
      
      // Refresh history immediately after timeout
      console.log("📜 Refreshing attendance history after timeout...");
      const updatedHistory = await getInternAttendanceRecords(userProfile.uid);
      console.log("📜 Updated history after timeout (should include all records):", updatedHistory.length, "records");
      setAttendanceHistory(updatedHistory);

      toast({
        title: "Time-Out Successful",
        description: "Your time-out has been recorded",
      });

    } catch (error) {
      console.error("❌ Error during time-out:", error);
      toast({
        title: "Time-Out Failed",
        description: "Failed to record your time-out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {userProfile?.firstName}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your attendance and stay connected with your teacher
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Intern Dashboard
        </Badge>
      </div>

      {/* Scheduled Work Hours */}

      {/* Current Session */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance</CardTitle>
          <CardDescription>
            Time in and out with photo verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentAttendance ? (
            // Currently Checked In (Approved Session)
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-medium">Currently Checked In</h3>
                    <p className="text-sm text-muted-foreground">
                      Time In: {currentAttendance.clockIn?.toDate().toLocaleTimeString()}
                    </p>
                    {currentAttendance.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {typeof currentAttendance.location === 'string' 
                          ? currentAttendance.location 
                          : (currentAttendance.location as any).address || 'Location unavailable'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button
                    onClick={handleTimeOut}
                    disabled={isCheckingOut}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isCheckingOut ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Checking Out...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Time Out
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : pendingAttendance ? (
            // Pending Approval
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div>
                    <h3 className="font-medium">Pending Approval</h3>
                    <p className="text-sm text-muted-foreground">
                      Submitted: {pendingAttendance.clockIn?.toDate().toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-yellow-700">
                      Waiting for teacher approval
                    </p>
                    {pendingAttendance.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {typeof pendingAttendance.location === 'string' 
                          ? pendingAttendance.location 
                          : (pendingAttendance.location as any).address || 'Location unavailable'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Pending
                  </Badge>
                  {(() => {
                    console.log("🔍 Pending attendance data:", pendingAttendance);
                    console.log("🔍 isLate value:", pendingAttendance.isLate);
                    return null;
                  })()}
                </div>
              </div>

              {pendingAttendance.photoUrl && (
                <div className="flex justify-center">
                  <img
                    src={pendingAttendance.photoUrl}
                    alt="Submitted photo"
                    className="w-24 h-24 rounded-lg object-cover border"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Ready to start your day?</h3>
              <p className="text-muted-foreground mb-6">
                Take a photo and check in to begin tracking your attendance
              </p>

              {currentLocation && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Current Location: {currentLocation.address}
                  </p>
                </div>
              )}

              {(() => {
                // Check if intern has already completed attendance for today
                const today = new Date();
                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
                
                const todayCompletedSessions = attendanceHistory.filter(record => {
                  const recordDate = record.clockIn?.toDate();
                  return recordDate && 
                         recordDate >= todayStart && 
                         recordDate < todayEnd && 
                         record.clockOut && // Has both clock in and clock out
                         record.status === 'approved';
                });

                const hasCompletedToday = todayCompletedSessions.length > 0;

                if (hasCompletedToday) {
                  return (
                    <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 text-red-800 mb-2">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Attendance Complete</span>
                      </div>
                      <p className="text-sm text-red-700">
                        You have already completed your attendance for today. You cannot check in again until tomorrow.
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* Photo Upload - Required */}
                    <div className="mb-6 space-y-3">
                      <label className="block text-sm font-medium text-foreground">
                        Upload Photo (Required) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-col items-center gap-3">
                        {photoUrl && (
                          <div className="mb-3">
                            <img 
                              src={photoUrl} 
                              alt="Uploaded photo" 
                              className="w-24 h-24 rounded-lg object-cover border-2 border-green-200"
                            />
                          </div>
                        )}
                        <Button
                          type="button"
                          variant={photoUrl ? "outline" : "default"}
                          onClick={openCamera}
                          disabled={isCameraOpen}
                          className="gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          {photoUrl ? 'Change Photo' : 'Take Photo'}
                        </Button>
                        {photoUrl && (
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Photo uploaded and ready
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={handleTimeIn}
                      disabled={isCheckingIn || !currentLocation || !photoUrl}
                      size="lg"
                      className="gap-2"
                    >
                      {isCheckingIn ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Checking In...
                        </>
                      ) : (
                        <>
                          <LogIn className="h-5 w-5" />
                          Time In
                        </>
                      )}
                    </Button>
                    
                    {(!currentLocation || !photoUrl) && (
                      <p className="text-sm text-muted-foreground mt-2 text-center">
                        {!currentLocation && "📍 Waiting for location access..."}
                        {currentLocation && !photoUrl && "📷 Photo required before check-in"}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>
            Your recent time-in/out records and approval status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {attendanceHistory.map((record) => (
              <div key={record.id} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {record.createdAt.toDate().toLocaleDateString()}
                  </h4>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <tbody>
                      {record.clockIn && (
                        <tr className="border-b">
                          <td className="px-4 py-3 font-medium text-sm w-24">
                            <div className="flex items-center gap-2">
                              <LogIn className="h-4 w-4 text-green-600" />
                              Time In
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {record.clockIn.toDate().toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {/* Status badges removed */}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {record.photoUrl && record.status !== 'approved' && (
                              <img
                                src={record.photoUrl}
                                alt="Time-in photo"
                                className="w-8 h-8 rounded object-cover border ml-auto"
                              />
                            )}
                          </td>
                        </tr>
                      )}
                      
                      {record.clockOut && (
                        <tr className="border-b">
                          <td className="px-4 py-3 font-medium text-sm w-24">
                            <div className="flex items-center gap-2">
                              <LogOut className="h-4 w-4 text-red-600" />
                              Time Out
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {record.clockOut.toDate().toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {record.isEarly && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                EARLY
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3"></td>
                        </tr>
                      )}
                      
                      {record.location && (
                        <tr className="border-b">
                          <td className="px-4 py-3 font-medium text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-blue-600" />
                              Location
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm" colSpan={2}>
                            <span className="text-muted-foreground">
                              {typeof record.location === 'string' 
                                ? record.location 
                                : (record.location as any).address || 'Location unavailable'}
                            </span>
                          </td>
                          <td className="px-4 py-3"></td>
                        </tr>
                      )}
                      
                      <tr>
                        <td className="px-4 py-3 font-medium text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                            Status
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm" colSpan={3}>
                          {getStatusBadge(record.status)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {attendanceHistory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No attendance records yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceHistory.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Approved sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingAttendance ? 1 : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceHistory
                .filter(r => r.clockIn && r.clockOut)
                .reduce((total, r) => {
                  const hours = (r.clockOut!.toDate().getTime() - r.clockIn!.toDate().getTime()) / (1000 * 60 * 60);
                  return total + hours;
                }, 0)
                .toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Hours worked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Camera Modal */}
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Take Photo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 bg-black rounded-lg object-cover"
                onError={(e) => {
                  console.error("Video error:", e);
                  toast({
                    title: "Camera Error",
                    description: "Failed to display camera feed. Please try again.",
                    variant: "destructive",
                  });
                  closeCamera();
                }}
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={capturePhoto}
                disabled={isCapturing}
                className="gap-2"
              >
                {isCapturing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Capturing...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Capture Photo
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={closeCamera}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
