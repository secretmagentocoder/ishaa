import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';


export default function ProfileScreen() {
  const { user, userData } = useAuth();
  
  // State for all profile properties
  const [name, setName] = useState(userData?.name || '');
  const [place, setPlace] = useState(userData?.place || '');
  const [email, setEmail] = useState(userData?.email || '');
  
  const [permanentAddress, setPermanentAddress] = useState(userData?.permanentAddress || '');
  const [currentAddress, setCurrentAddress] = useState(userData?.currentAddress || '');
  const [father, setFather] = useState(userData?.father || '');
  const [mother, setMother] = useState(userData?.mother || '');
  const [occupation, setOccupation] = useState(userData?.occupation || '');
  const [jobPlace, setJobPlace] = useState(userData?.jobPlace || '');
  const [educationSchool, setEducationSchool] = useState(userData?.educationSchool || '');
  const [educationSpiritual, setEducationSpiritual] = useState(userData?.educationSpiritual || '');
  const [timePeriodUsthad, setTimePeriodUsthad] = useState(userData?.timePeriodUsthad || '');

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You must grant camera roll access to upload a profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert("Error picking image", e.message);
    }
  };

  const uploadProfileImage = async (uri: string) => {
    if (!user || !userData?.phoneNumber) {
      Alert.alert("Error", "Please save your profile first or complete registration.");
      return;
    }
    setIsUploadingImage(true);
    try {
      // Convert local URI to blob using XMLHttpRequest (required for React Native local file URLs)
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          reject(new TypeError("Local file load failed"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
      });
      
      // Upload to Firebase Storage
      const fileRef = ref(storage, `profile_pictures/${userData.phoneNumber}.jpg`);
      await uploadBytes(fileRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(fileRef);
      
      // Update Firestore user document
      const userRef = doc(db, 'users', userData.phoneNumber);
      await updateDoc(userRef, {
        photoUrl: downloadURL
      });
      
      Alert.alert("Success", "Profile picture updated successfully!");
    } catch (error: any) {
      console.error("Image upload failed full error:", error);
      if (error.serverResponse) {
        console.error("Firebase Storage Server Response:", error.serverResponse);
      }
      Alert.alert(
        "Upload Failed",
        `Error: ${error.message}\n\nTroubleshooting:\n1. Make sure you have clicked "Get Started" in the Storage tab of your Firebase Console.\n2. Ensure your Firebase Storage rules are published.`
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name || !place) {
      setProfileMessage('Name and Place cannot be empty.');
      return;
    }
    if (!user) return;

    try {
      setProfileMessage('');
      setIsUpdatingProfile(true);
      
      // Update by phone number (since it's the document key in Firestore)
      const userRef = doc(db, 'users', userData?.phoneNumber || user.uid);
      
      await updateDoc(userRef, {
        name,
        place,
        email,
        permanentAddress,
        currentAddress,
        father,
        mother,
        occupation,
        jobPlace,
        educationSchool,
        educationSpiritual,
        timePeriodUsthad
      });
      
      setProfileMessage('Profile updated successfully!');
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (error: any) {
      setProfileMessage(`Error: ${error.message}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setPasswordMessage('Password fields cannot be empty.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match.');
      return;
    }
    if (!auth.currentUser) return;

    try {
      setPasswordMessage('');
      setIsUpdatingPassword(true);
      await updatePassword(auth.currentUser, newPassword);
      setPasswordMessage('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(''), 3000);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setPasswordMessage('Please log out and log back in to change password.');
      } else {
        setPasswordMessage(`Error: ${error.message}`);
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <LinearGradient
      colors={['#022c22', '#064e3b', '#022c22']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text style={styles.title}>My Profile</Text>
            <Text style={styles.subtitle}>Manage your diary account settings</Text>
          </View>

          {/* Profile Picture Card */}
          <View style={styles.profilePicCard}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.85} style={styles.profilePicCircle}>
              {isUploadingImage ? (
                <ActivityIndicator size="large" color="#fbbf24" />
              ) : userData?.photoUrl ? (
                <Image source={{ uri: userData.photoUrl }} style={styles.profilePicImage} />
              ) : (
                <View style={styles.profilePicPlaceholder}>
                  <Ionicons name="person-outline" size={44} color="rgba(255,255,255,0.4)" />
                </View>
              )}
              <View style={styles.cameraIconBadge}>
                <Ionicons name="camera" size={16} color="#022c22" />
              </View>
            </TouchableOpacity>
            <Text style={styles.uploadTip}>Tap above to upload profile picture</Text>
          </View>


          {/* Personal & Family Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal & Family</Text>
            
            <Text style={styles.label}>Phone Number (Registered ID)</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={userData?.phoneNumber || ''}
              editable={false}
            />

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. name@domain.com"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Place / City</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Malappuram"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={place}
              onChangeText={setPlace}
            />

            <Text style={styles.label}>Father's Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Father's Name"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={father}
              onChangeText={setFather}
            />

            <Text style={styles.label}>Mother's Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Mother's Name"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={mother}
              onChangeText={setMother}
            />
          </View>

          {/* Education & Occupation */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Education & Profession</Text>

            <Text style={styles.label}>Occupation / Job</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Teacher, Business"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={occupation}
              onChangeText={setOccupation}
            />

            <Text style={styles.label}>Job Place / Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dubai, Calicut"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={jobPlace}
              onChangeText={setJobPlace}
            />

            <Text style={styles.label}>Education (General / School)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. BCom, SSLC, Engineering"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={educationSchool}
              onChangeText={setEducationSchool}
            />

            <Text style={styles.label}>Education (Spiritual / Madrassa)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dars, Islamic Course"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={educationSpiritual}
              onChangeText={setEducationSpiritual}
            />

            <Text style={styles.label}>Time Period under Thangal Usthad</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5 Years, Since 2020"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={timePeriodUsthad}
              onChangeText={setTimePeriodUsthad}
            />
          </View>

          {/* Addresses Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Address Details</Text>

            <Text style={styles.label}>Permanent Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter permanent address..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={permanentAddress}
              onChangeText={setPermanentAddress}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Current Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter current address (if different)..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={currentAddress}
              onChangeText={setCurrentAddress}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Save Button for profile updates */}
          <View style={{ marginBottom: Spacing.one }}>
            {profileMessage ? (
              <Text style={profileMessage.includes('successfully') ? styles.successText : styles.errorText}>
                {profileMessage}
              </Text>
            ) : null}

            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleUpdateProfile}
              disabled={isUpdatingProfile}
            >
              <LinearGradient
                colors={['#fbbf24', '#d97706']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isUpdatingProfile ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>SAVE PROFILE DETAILS</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Password Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Change Password</Text>

            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Min 6 characters"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            {passwordMessage ? (
              <Text style={passwordMessage.includes('successfully') ? styles.successText : styles.errorText}>
                {passwordMessage}
              </Text>
            ) : null}

            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleChangePassword}
              disabled={isUpdatingPassword}
            >
              <LinearGradient
                colors={['#fbbf24', '#d97706']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isUpdatingPassword ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>UPDATE PASSWORD</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#fbbf24',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500' as const,
    marginTop: Spacing.half,
  },
  profilePicCard: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.1)',
  },
  profilePicCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
    overflow: 'visible',
  },
  profilePicImage: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
  },
  profilePicPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 47,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fbbf24',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#022c22',
  },
  uploadTip: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500' as const,
    marginTop: Spacing.two,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
    padding: Spacing.four,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fbbf24',
    marginBottom: Spacing.three,
  },
  avatarsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedAvatar: {
    borderColor: '#fbbf24',
    borderWidth: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    fontSize: 15,
    color: '#ffffff',
    marginBottom: Spacing.three,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  disabledInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    color: 'rgba(255, 255, 255, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    height: 48,
    borderRadius: 10,
    marginTop: Spacing.one,
  },
  buttonGradient: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  successText: {
    color: '#10b981',
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: Spacing.two,
    fontSize: 14,
  },
  errorText: {
    color: '#f87171',
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: Spacing.two,
    fontSize: 14,
  },
});
