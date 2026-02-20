import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import TreeView from '../components/TreeView';

export default function HomeScreen({ navigation }) {
  const { state } = useAppContext();

  if (state.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1a5c38" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🌿 Sidr</Text>
      <Text style={styles.subtitle}>Your Spiritual Garden</Text>

      <TreeView totalPages={state.totalPages} khatms={state.khatms} />

      <View style={styles.statsRow}>
        <StatCard icon="📖" value={state.totalPages} label="Pages Read" />
        <StatCard icon="⏱️" value={state.todayMinutes} label="Min Today" />
        <StatCard icon="🔥" value={state.dayStreak} label="Day Streak" />
        <StatCard icon="🏆" value={state.khatms} label="Khatms" />
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Reading')}
      >
        <Text style={styles.primaryButtonText}>📖 Start Reading</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Stats')}
      >
        <Text style={styles.secondaryButtonText}>📊 View Stats</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#f0faf4',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a5c38',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    minWidth: 72,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a5c38',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#1a5c38',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#d4edda',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1a5c38',
    fontSize: 16,
    fontWeight: '600',
  },
});
