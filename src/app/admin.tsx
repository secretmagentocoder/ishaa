import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminScreen() {
  const { userData } = useAuth();
  const [targetCount, setTargetCount] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const campaignId = 'default_campaign';

  useEffect(() => {
    const fetchCurrent = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'campaigns', campaignId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTargetCount(data.target_count?.toString() || '');
          setEndDate(data.end_date || '');
        }
      } catch (err) {
        console.error("Failed to fetch campaign: ", err);
      } finally {
        setFetching(false);
      }
    };
    fetchCurrent();
  }, []);

  const handleUpdate = async () => {
    const newTarget = parseInt(targetCount, 10);
    if (isNaN(newTarget) || newTarget <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid target count number.");
      return;
    }
    if (!endDate.trim()) {
      Alert.alert("Invalid Input", "Please enter a target end date.");
      return;
    }

    setLoading(true);
    try {
      await setDoc(doc(db, 'campaigns', campaignId), {
        target_count: newTarget,
        end_date: endDate.trim(),
        status: 'active'
      }, { merge: true });
      
      Alert.alert("Success", "Campaign target and date updated successfully!");
    } catch (err) {
      Alert.alert("Error", "Failed to update campaign details.");
    } finally {
      setLoading(false);
    }
  };

  if (userData?.role !== 'admin') {
    return (
      <LinearGradient colors={['#022c22', '#064e3b']} style={styles.centerContainer}>
        <Text style={styles.errorText}>You do not have admin access.</Text>
        <Text style={styles.errorSub}>To become an admin, edit your user record in the Firestore Console.</Text>
      </LinearGradient>
    );
  }

  if (fetching) {
    return (
      <LinearGradient colors={['#022c22', '#064e3b']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fbbf24" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#022c22', '#064e3b', '#022c22']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>Configure swalath goals & dates</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Campaign Details</Text>

          <Text style={styles.label}>Target Count (Aim)</Text>
          <TextInput
            style={styles.input}
            value={targetCount}
            onChangeText={setTargetCount}
            keyboardType="numeric"
            placeholder="e.g. 100000"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />

          <Text style={styles.label}>End Date / Description</Text>
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="e.g. 31-12-2026 or 12th Rabi'ul Awwal"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleUpdate}
            disabled={loading}
          >
            <LinearGradient
              colors={['#fbbf24', '#d97706']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>UPDATE CAMPAIGN</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  errorText: {
    color: '#f87171',
    fontSize: 18,
    fontWeight: '800' as const,
    textAlign: 'center',
  },
  errorSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.three,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    marginBottom: Spacing.four,
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
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
    padding: Spacing.four,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fbbf24',
    marginBottom: Spacing.three,
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
  actionButton: {
    height: 48,
    borderRadius: 10,
    marginTop: Spacing.two,
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
});
