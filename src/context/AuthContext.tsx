import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export interface UserData {
  uid: string;
  email: string | null;
  role: 'admin' | 'user';
  name: string;
  place?: string;
  phoneNumber?: string;
  total_contributions: number;
  avatar?: string;
  permanentAddress?: string;
  currentAddress?: string;
  father?: string;
  mother?: string;
  occupation?: string;
  jobPlace?: string;
  educationSchool?: string;
  educationSpiritual?: string;
  timePeriodUsthad?: string;
  photoUrl?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserData: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clean up previous user data listener if any
      if (unsubscribeUserData) {
        unsubscribeUserData();
        unsubscribeUserData = null;
      }

      if (firebaseUser) {
        // Query users collection by UID to find the user profile (handles both UID-keyed and phone-keyed docs)
        const q = query(collection(db, 'users'), where('uid', '==', firebaseUser.uid));
        
        unsubscribeUserData = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            setUserData(snapshot.docs[0].data() as UserData);
          } else {
            // Fallback default profile if document doesn't exist yet
            setUserData({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'user',
              name: firebaseUser.displayName || 'User',
              place: '',
              phoneNumber: '',
              total_contributions: 0,
            });
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Firestore user data listener failed: ", error);
          setIsLoading(false);
        });
      } else {
        setUserData(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserData) unsubscribeUserData();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
