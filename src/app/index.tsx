import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Text, Platform, ActivityIndicator, TextInput, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, collection, onSnapshot, runTransaction } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Spacing } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';


export default function HomeScreen() {
  const { user, userData } = useAuth();
  const [activeSection, setActiveSection] = useState<'dashboard' | 'nariya' | 'members'>('dashboard');
  
  // Nariya Swalath States
  const [campaign, setCampaign] = useState<any>(null);
  const [personalCount, setPersonalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Members List States
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const campaignId = 'default_campaign';

  // 1. Subscribe to Global Campaign
  useEffect(() => {
    const unsubCampaign = onSnapshot(doc(db, 'campaigns', campaignId), (docSnap) => {
      if (docSnap.exists()) {
        setCampaign(docSnap.data());
      } else {
        setCampaign({
          target_count: 1000,
          current_count: 0,
          status: 'active'
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Campaign subscription failed:", error);
      Alert.alert("Database Error", "Failed to load campaign data. Please check your Firestore rules.");
      setLoading(false);
    });

    return () => unsubCampaign();
  }, []);

  // 2. Subscribe to Personal Count
  useEffect(() => {
    if (!user) return;
    const userCountKey = userData?.phoneNumber || user.uid;
    const unsubPersonal = onSnapshot(
      doc(db, 'campaigns', campaignId, 'user_counts', userCountKey),
      (docSnap) => {
        if (docSnap.exists()) {
          setPersonalCount(docSnap.data().count_contributed || 0);
        } else {
          setPersonalCount(0);
        }
      },
      (error) => {
        console.error("Personal count subscription failed:", error);
      }
    );

    return () => unsubPersonal();
  }, [user, userData?.phoneNumber]);

  // 3. Subscribe to all Members list
  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMembers(list);
    }, (error) => {
      console.error("Members subscription failed:", error);
    });
    return () => unsubMembers();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const handleCount = async () => {
    if (!user || !campaign || campaign.current_count >= campaign.target_count) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const campaignRef = doc(db, 'campaigns', campaignId);
    const userCountKey = userData?.phoneNumber || user.uid;
    const userCountRef = doc(db, 'campaigns', campaignId, 'user_counts', userCountKey);

    try {
      await runTransaction(db, async (transaction) => {
        const campaignDoc = await transaction.get(campaignRef);
        const userCountDoc = await transaction.get(userCountRef);

        const currentGlobalCount = campaignDoc.exists() ? campaignDoc.data().current_count : 0;
        const targetCount = campaignDoc.exists() ? campaignDoc.data().target_count : 1000;

        if (currentGlobalCount >= targetCount) {
          throw new Error("Target reached");
        }

        const newUserCount = userCountDoc.exists() ? userCountDoc.data().count_contributed + 1 : 1;

        if (!campaignDoc.exists()) {
          transaction.set(campaignRef, { target_count: 1000, current_count: 1, status: 'active' });
        } else {
          transaction.update(campaignRef, { current_count: currentGlobalCount + 1 });
        }

        if (!userCountDoc.exists()) {
          transaction.set(userCountRef, { 
            uid: user.uid, 
            count_contributed: 1, 
            name: userData?.name || user.email || 'Anonymous',
            place: userData?.place || 'Unknown'
          });
        } else {
          transaction.update(userCountRef, { 
            count_contributed: newUserCount,
            name: userData?.name || user.email || 'Anonymous',
            place: userData?.place || 'Unknown',
            uid: user.uid
          });
        }
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
    }
  };

  const filteredMembers = members.filter((member) => {
    const queryStr = searchQuery.toLowerCase();
    return (
      (member.name || '').toLowerCase().includes(queryStr) ||
      (member.place || '').toLowerCase().includes(queryStr) ||
      (member.occupation || '').toLowerCase().includes(queryStr)
    );
  });

  if (loading) {
    return (
      <LinearGradient colors={['#022c22', '#064e3b']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fbbf24" />
      </LinearGradient>
    );
  }

  const remaining = Math.max((campaign?.target_count || 1000) - (campaign?.current_count || 0), 0);
  const isComplete = campaign && campaign.current_count >= campaign.target_count;

  return (
    <LinearGradient
      colors={['#022c22', '#064e3b', '#022c22']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        
        {/* ==================== DASHBOARD VIEW ==================== */}
        {activeSection === 'dashboard' && (
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.dashboardHeader}>
              <View>
                <Text style={styles.appTitle}>Isha's Diary</Text>
                <Text style={styles.appSubtitle}>Welcome, {userData?.name || 'User'}</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton} activeOpacity={0.7}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>

            {/* Portal Card 1: Nariya Swalath */}
            <TouchableOpacity 
              style={styles.portalCard} 
              activeOpacity={0.9}
              onPress={() => setActiveSection('nariya')}
            >
              <LinearGradient
                colors={['rgba(251, 191, 36, 0.12)', 'rgba(6, 78, 59, 0.4)']}
                style={styles.portalGradient}
              >
                <View style={styles.portalContent}>
                  <View style={styles.portalIconCircle}>
                    <Ionicons name="finger-print-outline" size={32} color="#fbbf24" />
                  </View>
                  <View style={styles.portalTextSection}>
                    <Text style={styles.portalTitle}>Nariya Swalath</Text>
                    <Text style={styles.portalDesc}>Count daily swalath. Target aim is set by the admin.</Text>
                    <View style={styles.portalStatsRow}>
                      <Text style={styles.portalStatLabel}>Aim: <Text style={styles.portalStatVal}>{campaign?.target_count || 1000}</Text></Text>
                      <Text style={styles.portalStatLabel}>Current: <Text style={styles.portalStatVal}>{campaign?.current_count || 0}</Text></Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={24} color="rgba(255,255,255,0.4)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Portal Card 2: Members Directory */}
            <TouchableOpacity 
              style={styles.portalCard} 
              activeOpacity={0.9}
              onPress={() => setActiveSection('members')}
            >
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.12)', 'rgba(6, 78, 59, 0.4)']}
                style={styles.portalGradient}
              >
                <View style={styles.portalContent}>
                  <View style={styles.portalIconCircle}>
                    <Ionicons name="people-outline" size={32} color="#10b981" />
                  </View>
                  <View style={styles.portalTextSection}>
                    <Text style={styles.portalTitle}>Members List</Text>
                    <Text style={styles.portalDesc}>View detailed profiles of registered community members.</Text>
                    <Text style={styles.portalStatLabel}>Registered Members: <Text style={styles.portalStatVal}>{members.length}</Text></Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={24} color="rgba(255,255,255,0.4)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Islamic Remembrance Box */}
            <View style={styles.remembranceBox}>
              <Ionicons name="sparkles-outline" size={24} color="#fbbf24" style={{ marginBottom: 6 }} />
              <Text style={styles.remembranceText}>
                "Verily, in the remembrance of Allah do hearts find rest."
              </Text>
              <Text style={styles.remembranceAuthor}>Surah Ar-Ra'd [13:28]</Text>
            </View>
          </ScrollView>
        )}

        {/* ==================== NARIYA SWALATH VIEW ==================== */}
        {activeSection === 'nariya' && (
          <View style={{ flex: 1 }}>
            {/* Header Block */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setActiveSection('dashboard')} style={styles.backButton}>
                <Ionicons name="arrow-back-outline" size={20} color="#fbbf24" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.title}>Nariya Swalath</Text>
                {campaign?.end_date ? (
                  <Text style={styles.subtitle}>End: {campaign.end_date}</Text>
                ) : null}
              </View>
            </View>

            {/* Real-time Global Stats section */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>AIM</Text>
                <Text style={styles.statValue}>{campaign?.target_count || 1000}</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxCenter]}>
                <Text style={styles.statLabelCenter}>COMPLETED</Text>
                <Text style={styles.statValueCenter}>{campaign?.current_count || 0}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>REMAINING</Text>
                <Text style={styles.statValue}>{remaining}</Text>
              </View>
            </View>

            {/* Personal Counter Circle */}
            <View style={styles.counterSection}>
              <TouchableOpacity
                style={styles.circleContainer}
                activeOpacity={0.85}
                onPress={handleCount}
                disabled={isComplete}
              >
                <LinearGradient
                  colors={isComplete ? ['rgba(16, 185, 129, 0.4)', 'rgba(4, 120, 87, 0.6)'] : ['#064e3b', '#022c22']}
                  style={styles.circleInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.circleLabel}>MY SWALATH</Text>
                  <Text style={styles.circleValue}>{personalCount}</Text>
                  <Text style={styles.tapText}>{isComplete ? "COMPLETED" : "TAP TO COUNT"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Bottom info section */}
            <View style={styles.bottomSection}>
              {isComplete ? (
                <View style={styles.successBox}>
                  <Text style={styles.successTitle}>Masha Allah! 🎉</Text>
                  <Text style={styles.successSub}>The Swalath campaign target has been successfully completed!</Text>
                </View>
              ) : (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    Press the golden counter button to contribute your swalath. Counts update globally in real time.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ==================== MEMBERS LIST VIEW ==================== */}
        {activeSection === 'members' && (
          <View style={{ flex: 1, paddingHorizontal: Spacing.four }}>
            
            {/* Header Block */}
            <View style={[styles.header, { paddingHorizontal: 0 }]}>
              <TouchableOpacity onPress={() => setActiveSection('dashboard')} style={styles.backButton}>
                <Ionicons name="arrow-back-outline" size={20} color="#10b981" />
                <Text style={[styles.backText, { color: '#10b981' }]}>Back</Text>
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={[styles.title, { color: '#10b981' }]}>Members</Text>
                <Text style={styles.subtitle}>Community Directory ({filteredMembers.length})</Text>
              </View>
            </View>

            {/* Search Input */}
            <View style={styles.searchBarContainer}>
              <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchBar}
                placeholder="Search by Name, Place, or Job..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Members Directory List */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {filteredMembers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color="rgba(255,255,255,0.15)" />
                  <Text style={styles.emptyText}>No members found</Text>
                </View>
              ) : (
                filteredMembers.map((member) => {
                  const isExpanded = expandedMemberId === member.id;
                  
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.memberCard, isExpanded && styles.expandedMemberCard]}
                      activeOpacity={0.9}
                      onPress={() => setExpandedMemberId(isExpanded ? null : member.id)}
                    >
                      <View style={styles.memberCardHeader}>
                        <View style={[styles.memberAvatarCircle, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                          {member.photoUrl ? (
                            <Image 
                              source={{ uri: member.photoUrl }} 
                              style={{ width: '100%', height: '100%', borderRadius: 18 }} 
                            />
                          ) : (
                            <Ionicons name="person-outline" size={18} color="rgba(255, 255, 255, 0.4)" />
                          )}
                        </View>
                        <View style={styles.memberMeta}>
                          <Text style={styles.memberName}>{member.name || 'Name not set'}</Text>
                          <Text style={styles.memberPlace}>{member.place || 'Place not set'}</Text>
                        </View>
                        <Ionicons 
                          name={isExpanded ? "chevron-up" : "chevron-down"} 
                          size={18} 
                          color="rgba(255,255,255,0.3)" 
                        />
                      </View>

                      {/* Expandable Details Block */}
                      {isExpanded && (
                        <View style={styles.memberDetailsBlock}>
                          <View style={styles.divider} />
                          
                          <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Father:</Text>
                            <Text style={styles.detailsValue}>{member.father || 'Not specified'}</Text>
                          </View>
                          <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Mother:</Text>
                            <Text style={styles.detailsValue}>{member.mother || 'Not specified'}</Text>
                          </View>
                          
                          <View style={styles.divider} />

                          <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Occupation:</Text>
                            <Text style={styles.detailsValue}>
                              {member.occupation ? `${member.occupation} ${member.jobPlace ? `@ ${member.jobPlace}` : ''}` : 'Not specified'}
                            </Text>
                          </View>
                          
                          <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>School Educ:</Text>
                            <Text style={styles.detailsValue}>{member.educationSchool || 'Not specified'}</Text>
                          </View>
                          <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Spiritual Educ:</Text>
                            <Text style={styles.detailsValue}>{member.educationSpiritual || 'Not specified'}</Text>
                          </View>

                          <View style={styles.divider} />

                          <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Time under Usthad:</Text>
                            <Text style={styles.detailsValue}>{member.timePeriodUsthad || 'Not specified'}</Text>
                          </View>

                          <View style={styles.divider} />

                          <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Permanent Address:</Text>
                            <Text style={styles.detailsValue}>{member.permanentAddress || 'Not specified'}</Text>
                          </View>
                          <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Current Address:</Text>
                            <Text style={styles.detailsValue}>{member.currentAddress || 'Same as permanent'}</Text>
                          </View>

                          <View style={styles.divider} />

                          <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Contact Phone:</Text>
                            <Text style={[styles.detailsValue, { color: '#fbbf24', fontWeight: 'bold' }]}>{member.phoneNumber || 'Not set'}</Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
              <View style={{ height: 40 }} />
            </ScrollView>

          </View>
        )}

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: '#fbbf24',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600' as const,
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  logoutText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '800' as const,
  },
  portalCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
    overflow: 'hidden',
  },
  portalGradient: {
    padding: Spacing.four,
  },
  portalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  portalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  portalTextSection: {
    flex: 1,
    gap: 4,
  },
  portalTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#ffffff',
  },
  portalDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 16,
  },
  portalStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  portalStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600' as const,
  },
  portalStatVal: {
    color: '#fbbf24',
    fontWeight: '700' as const,
  },
  remembranceBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.06)',
    padding: Spacing.four,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  remembranceText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
  remembranceAuthor: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 6,
  },
  
  // Nariya Section Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.two,
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
  },
  backText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '800' as const,
  },
  headerTextContainer: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 20,
    fontWeight: '900' as const,
    color: '#fbbf24',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    marginHorizontal: Spacing.four,
    justifyContent: 'space-around',
    marginTop: Spacing.three,
  },
  statBox: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statBoxCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statLabelCenter: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#fbbf24',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#ffffff',
  },
  statValueCenter: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: '#fbbf24',
  },
  counterSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  circleContainer: {
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 4,
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  circleInner: {
    flex: 1,
    width: '100%',
    borderRadius: 115,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  circleLabel: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1.5,
  },
  circleValue: {
    fontSize: 56,
    fontWeight: '900' as const,
    color: '#fbbf24',
    marginVertical: Spacing.one,
  },
  tapText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#ffffff',
    letterSpacing: 1.5,
    opacity: 0.8,
  },
  bottomSection: {
    alignItems: 'center',
    marginBottom: Spacing.four,
    width: '100%',
  },
  successBox: {
    width: '90%',
    alignItems: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 20,
  },
  successTitle: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '900' as const,
  },
  successSub: {
    color: '#e2e8f0',
    fontSize: 13,
    marginTop: Spacing.one,
    textAlign: 'center',
  },
  infoBox: {
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500' as const,
    lineHeight: 16,
  },

  // Members Screen Styles
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  searchBar: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  memberCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  expandedMemberCard: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  memberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  memberMeta: {
    flex: 1,
    marginLeft: Spacing.two,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#ffffff',
  },
  memberPlace: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  memberDetailsBlock: {
    marginTop: Spacing.two,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: Spacing.two,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  detailsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600' as const,
  },
  detailsValue: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '500' as const,
    textAlign: 'right',
    maxWidth: '70%',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
