import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import TreeScene from '../components/TreeScene';
import { getTreeStage } from '../utils/treeLogic';

function Slider({ value, onValueChange, min = 0, max = 1, step = 0.01 }) {
  if (Platform.OS === 'web') {
    return (
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValueChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#1a5c38' }}
      />
    );
  }
  // Native: use a basic View-based slider or import from community
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <View style={{ width: '100%', height: 40, justifyContent: 'center' }}>
      <View style={{ height: 4, backgroundColor: '#ccc', borderRadius: 2 }}>
        <View style={{ width: `${pct}%`, height: 4, backgroundColor: '#1a5c38', borderRadius: 2 }} />
      </View>
    </View>
  );
}

function formatHour(h) {
  const hrs = Math.floor(h) % 24;
  const mins = Math.round((h % 1) * 60);
  const ampm = hrs < 12 ? 'AM' : 'PM';
  const h12 = hrs % 12 || 12;
  return `${h12}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

export default function HomeScreen({ navigation }) {
  const { state } = useAppContext();
  const [devMode, setDevMode] = useState(false);
  const [devGrowth, setDevGrowth] = useState(0.5);
  const [devTime, setDevTime] = useState(12);

  const overrideGrowth = useMemo(() => {
    if (!devMode) return null;
    const g = devGrowth;
    return {
      growth: g,
      trunkLength: 0.3 + g * 2.2,
      trunkRadius: 0.02 + g * 0.28,
      levels: g * 4,
      childrenPerNode: 1.5 + g * 2.5,
      branchAngle: 0.5 + g * 0.3,
      lengthFalloff: 0.55 + g * 0.1,
      radiusFalloff: 0.45 + g * 0.1,
      taper: 0.6 + g * 0.25,
      gnarliness: 0.03 + (1 - g) * 0.04,
      twist: 0.15 + g * 0.15,
      leafDensity: g,
      leafSize: 0.06 + g * 0.12,
      vibrancy: 0.3 + g * 0.7,
      hasBloom: g > 0.3,
      bloomIntensity: Math.max(0, (g - 0.3) / 0.7),
      seed: Math.floor(g * 10000),
    };
  }, [devMode, devGrowth]);

  if (!state._loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1a5c38" />
      </View>
    );
  }

  const stage = devMode
    ? getStageLabel(devGrowth)
    : getTreeStage(state.totalPages, state.khatms).label;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sidr</Text>
      <Text style={styles.subtitle}>Your Spiritual Garden</Text>

      <TreeScene state={state} overrideGrowth={overrideGrowth} timeOverride={devMode ? devTime : null} />
      <Text style={styles.stageLabel}>{stage}</Text>

      {devMode && (
        <View style={styles.devPanel}>
          <Text style={styles.devTitle}>Dev Mode</Text>
          <Text style={styles.devValue}>Growth: {(devGrowth * 100).toFixed(0)}%</Text>
          <Slider value={devGrowth} onValueChange={setDevGrowth} min={0} max={1} step={0.01} />
          <View style={styles.devPresets}>
            {[
              ['Seed', 0],
              ['Sprout', 0.01],
              ['Young', 0.35],
              ['Mature', 0.65],
              ['Ancient', 1.0],
            ].map(([label, val]) => (
              <TouchableOpacity
                key={label}
                style={styles.presetBtn}
                onPress={() => setDevGrowth(val)}
              >
                <Text style={styles.presetText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.devDivider} />
          <Text style={styles.devValue}>Time: {formatHour(devTime)}</Text>
          <Slider value={devTime} onValueChange={setDevTime} min={0} max={24} step={0.25} />
          <View style={styles.devPresets}>
            {[
              ['Fajr', 5.25],
              ['Sunrise', 6.5],
              ['Dhuhr', 12],
              ['Maghrib', 19],
              ['Isha', 20.5],
            ].map(([label, val]) => (
              <TouchableOpacity
                key={label}
                style={styles.presetBtn}
                onPress={() => setDevTime(val)}
              >
                <Text style={styles.presetText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.devToggle}
        onPress={() => {
          if (!devMode) {
            const now = new Date();
            setDevTime(now.getHours() + now.getMinutes() / 60);
          }
          setDevMode(!devMode);
        }}
      >
        <Text style={styles.devToggleText}>
          {devMode ? 'Exit Dev Mode' : 'Dev Mode'}
        </Text>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <StatCard icon="📖" value={state.totalPages} label="Pages Read" />
        <StatCard icon="⏱️" value={state.todayMinutes} label="Min Today" />
        <StatCard icon="🔥" value={state.dayStreak} label="Day Streak" />
        <StatCard icon="🏆" value={state.khatms} label="Khatms" />
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('KhatmTab')}
      >
        <Text style={styles.primaryButtonText}>Continue Khatm</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('ExploreTab')}
      >
        <Text style={styles.secondaryButtonText}>Explore</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function getStageLabel(growth) {
  if (growth < 0.01) return 'Seed';
  if (growth < 0.2) return 'Sprout';
  if (growth < 0.5) return 'Young Tree';
  if (growth < 0.8) return 'Mature Tree';
  return 'Ancient Tree';
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
    marginBottom: 16,
  },
  stageLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a5c38',
    marginBottom: 4,
  },
  devToggle: {
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#e8e8e8',
  },
  devToggleText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  devPanel: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  devTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  devDivider: {
    height: 1,
    backgroundColor: '#e8e8e8',
    marginVertical: 10,
  },
  devValue: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  devPresets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  presetBtn: {
    backgroundColor: '#d4edda',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1a5c38',
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
