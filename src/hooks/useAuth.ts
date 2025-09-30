import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { onAuthStateChange, getUserProfile, UserProfile } from "@/lib/firebase";
import { setAcceptedTerms } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [mustAcceptTerms, setMustAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log("🔥 Auth state changed:", firebaseUser ? `User: ${firebaseUser.email}` : "No user");
      setIsLoading(true);

      if (firebaseUser) {
        console.log("📋 Fetching user profile for authenticated user");
        try {
          const profile = await getUserProfile(firebaseUser);
          console.log("✅ User profile fetched successfully:", profile);
          setUserProfile(profile);
          setMustAcceptTerms(!!(profile && profile.role === 'intern' && !profile.acceptedTerms));
        } catch (error) {
          console.error("❌ Error fetching user profile:", error);
          // Create a basic profile if there's an error
          const fallbackProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            firstName: firebaseUser.email?.split('@')[0] || 'User',
            lastName: '',
            role: 'intern',
            company: undefined,
            acceptedTerms: false,
          };
          console.log("🔄 Using fallback profile:", fallbackProfile);
          setUserProfile(fallbackProfile);
        }
      } else {
        console.log("🚪 No authenticated user, clearing profile");
        setUserProfile(null);
      }

      setUser(firebaseUser);
      setIsLoading(false);
      console.log("🏁 Auth loading complete, user:", !!firebaseUser, "userProfile:", !!userProfile, "isAuthenticated:", !!firebaseUser);
    });

    return () => unsubscribe();
  }, []);

  console.log("🔄 useAuth hook returning - user:", !!user, "userProfile:", !!userProfile, "isLoading:", isLoading);

  return {
    user,
    userProfile,
    isLoading,
    isAuthenticated: !!user, // Only require Firebase Auth user, not Firestore profile
    mustAcceptTerms,
    acceptTerms: async () => {
      if (!user) return false;
      const res = await setAcceptedTerms(user.uid, true);
      if (res) setMustAcceptTerms(false);
      // refresh profile
      try {
        const profile = await getUserProfile(user);
        setUserProfile(profile);
      } catch (e) {
        console.error('Error refreshing profile after accepting terms', e);
      }
      return res;
    }
  };
}
