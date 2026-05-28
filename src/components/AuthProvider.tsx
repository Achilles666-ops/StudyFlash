import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, handleRedirectResult, db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const AuthContext = createContext<{
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  isLoggingOut: boolean;
  logoutError: string | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  profile: null,
  loading: true,
  authError: null,
  isLoggingOut: false,
  logoutError: null,
  updateProfile: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    // Correctly catch standard sign-in redirect result on mount
    handleRedirectResult().catch((error) => {
      console.error('Redirect sign-in handler error:', error);
    });

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setAuthError(null);
        setUser(currentUser);

        // Listen in real-time to User document in users collection
        const docRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfile = onSnapshot(docRef, async (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            // Setup a default schema matching profile definition in firebase-blueprint.json
            const initialProfile: UserProfile = {
              name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Authorized Scholar',
              email: currentUser.email || '',
              university: 'StudyFlash Academy', // Beautiful default placeholder
              fieldOfStudy: 'Intelligent Systems', // Default placeholder
              plan: 'free', // Default seed plan
              uploadCount: 0,
              createdAt: serverTimestamp()
            };
            try {
              await setDoc(docRef, initialProfile);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore user snapshot listener error: ", error);
          setLoading(false);
        });

      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error("No active credentials.");
    const docRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(docRef, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Error in signOut operations:', err);
      setLogoutError(err?.message || 'Failure during cloud session revocation.');
      throw err;
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-teal border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-gray-400 select-none">Verifying secure academic credentials...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      authError, 
      isLoggingOut, 
      logoutError, 
      updateProfile, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
