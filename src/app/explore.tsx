import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function ExploreScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const campaignId = 'default_campaign';

  useEffect(() => {
    const q = query(
      collection(db, 'campaigns', campaignId, 'user_counts'),
      orderBy('count_contributed', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push(doc.data());
      });
      setUsers(data);
      setLoading(false);
    }, (error) => {
      console.error("Leaderboard subscription failed:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <LinearGradient colors={['#022c22', '#064e3b']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fbbf24" />
      </LinearGradient>
    );
  }

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isTop3 = index < 3;
    const rankColors: readonly [string, string][] = [
      ['#fbbf24', '#d97706'], // Gold
      ['#e2e8f0', '#94a3b8'], // Silver
      ['#b45309', '#78350f'], // Bronze
    ];

    return (
      <View style={styles.rowCard}>
        {isTop3 ? (
          <LinearGradient
            colors={rankColors[index]}
            style={styles.rankBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.rankTextTop}>{index + 1}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.rankBadgeNormal}>
            <Text style={styles.rankTextNormal}>#{index + 1}</Text>
          </View>
        )}

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name || 'Anonymous'}</Text>
          <Text style={styles.userPlace}>{item.place || 'Unknown Location'}</Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countValue}>{item.count_contributed}</Text>
          <Text style={styles.countLabel}>times</Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#022c22', '#064e3b', '#022c22']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.subtitle}>Top Contributor Standings</Text>
        </View>

        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No contributions yet.</Text>
              <Text style={styles.emptySubText}>Be the first to count!</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.2)',
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
  listContainer: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  rankTextTop: {
    color: '#ffffff',
    fontWeight: '900' as const,
    fontSize: 16,
  },
  rankBadgeNormal: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  rankTextNormal: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '700' as const,
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#ffffff',
  },
  userPlace: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500' as const,
    marginTop: 2,
  },
  countBadge: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  countValue: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#fbbf24',
  },
  countLabel: {
    fontSize: 9,
    color: '#fbbf24',
    fontWeight: '700' as const,
    textTransform: 'uppercase',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.six,
    padding: Spacing.five,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptySubText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: Spacing.one,
  },
});
