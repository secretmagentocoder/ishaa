import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyBQiqRWTKnCa6CWxUhNWnJQ3eBIQF8OwK0",
  authDomain: "nariya-app.firebaseapp.com",
  projectId: "nariya-app",
  storageBucket: "nariya-app.firebasestorage.app",
  messagingSenderId: "247762933075",
  appId: "1:247762933075:web:4469928436e80feacf7da6",
  measurementId: "G-59FCFR3J1J"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let authInstance;
if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (e) {
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;
export const db = getFirestore(app);
export const storage = getStorage(app);
