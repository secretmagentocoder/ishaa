import React, { useState } from 'react';
import { StyleSheet, TextInput, View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { Spacing } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    const formattedPhone = phoneNumber.trim().replace(/[^0-9+]/g, '');

    if (!formattedPhone || !password) {
      setError('Please enter your Phone Number and Password.');
      return;
    }

    if (formattedPhone.length < 8) {
      setError('Please enter a valid Phone Number.');
      return;
    }

    if (!isLogin && (!name || !place)) {
      setError('Please fill in all fields (Name and Place).');
      return;
    }

    // Convert phone number to a virtual email for Firebase Auth
    const virtualEmail = `${formattedPhone}@nariya.app`;

    try {
      setError('');
      setIsLoading(true);

      if (isLogin) {
        await signInWithEmailAndPassword(auth, virtualEmail, password);
      } else {
        // Attempt to create Auth account. If they are already in Auth, this will throw "auth/email-already-in-use".
        // If it succeeds, it means they are new or the admin deleted their auth record to reset password.
        const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, password);
        const user = userCredential.user;
        
        // Check if user profile already exists in Firestore under this phone number
        const userDocRef = doc(db, 'users', formattedPhone);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          // If it exists (e.g. admin deleted their login to reset password),
          // update the UID to the new one and preserve all details (role, place, etc.)
          await setDoc(userDocRef, {
            uid: user.uid,
          }, { merge: true });
        } else {
          // If it doesn't exist, create a fresh profile
          await setDoc(userDocRef, {
            uid: user.uid,
            email: null,
            role: 'user', // Default role
            name,
            place,
            phoneNumber: formattedPhone,
            total_contributions: 0,
          });
        }
      }
    } catch (err: any) {
      let friendlyError = err.message;
      if (err.code === 'auth/email-already-in-use') {
        friendlyError = 'This phone number is already registered!';
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = 'Invalid phone number format.';
      } else if (err.code === 'auth/weak-password') {
        friendlyError = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        friendlyError = 'Incorrect phone number or password.';
      }
      setError(friendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#022c22', '#064e3b', '#022c22']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoBorder}>
              <LinearGradient
                colors={['#fbbf24', '#d97706']}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.logoText}>🕌</Text>
              </LinearGradient>
            </View>
            <Text style={styles.title}>Isha's Diary</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Sign in with your phone number' : 'Create a new account'}
            </Text>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Place / City"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={place}
                  onChangeText={setPlace}
                />
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {isLogin && (
              <TouchableOpacity 
                style={styles.forgotButton} 
                onPress={() => Alert.alert(
                  "Forgot Password?",
                  "For security, password resets are processed by the administrator.\n\nPlease contact the administrator at +91 98765 43210 or admin@nariya.app to verify your details and reset your password.",
                  [{ text: "OK" }]
                )}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity 
              style={styles.authButton} 
              onPress={handleAuth} 
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#fbbf24', '#d97706']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.authButtonText}>
                  {isLoading ? 'PROCESSING...' : isLogin ? 'LOG IN' : 'SIGN UP'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.switchButton} 
              onPress={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <Text style={styles.switchHighlight}>{isLogin ? 'Sign Up' : 'Log In'}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  logoBorder: {
    padding: 3,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#fbbf24',
    marginBottom: Spacing.three,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fbbf24',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  form: {
    width: '100%',
    gap: Spacing.three,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    fontSize: 16,
    color: '#ffffff',
  },
  authButton: {
    height: 52,
    borderRadius: 12,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginTop: Spacing.two,
  },
  buttonGradient: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
  switchButton: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  switchText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  switchHighlight: {
    color: '#fbbf24',
    fontWeight: '800',
  },
  error: {
    color: '#f87171',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    marginTop: Spacing.one,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.one,
    paddingVertical: Spacing.one,
  },
  forgotText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
