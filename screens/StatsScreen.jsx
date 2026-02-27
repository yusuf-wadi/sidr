import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import ProgressBar from '../components/ProgressBar';
import { QURAN_PAGES, getTreeStage, TREE_STAGES } from '../utils/treeLogic';

const BADGES = [
  { id: 'first_page', icon: '🌱', label: 'First Step', description: 'Read your first page', requirement: (s) => s.totalPages >= 1 },
  { id: 'ten_pages', icon: '📄', label: 'Ten Pages', description: 'Read 10 pages total', requirement: (s) => s.totalPages >= 10 },
  { id: 'twenty_pages', icon: '🌿', label: 'Sprout', description: 'Read 20 pages — tree sprouted!', requirement: (s) => s.totalPages >= 20 },
  { id: 'first_hour', icon: '⏰', label: 'First Hour', description: 'Spend 60 minutes reading', requirement: (s) => s.totalMinutes >= 60 },
  { id: 'week_streak', icon: '🔥', label: 'Week Warrior', description: 'Maintain a 7-day streak', requirement: (s) => s.dayStreak >= 7 },
  { id: 'hundred_pages', icon: '🌳', label: 'Young Tree', description: 'Read 100 pages total', requirement: (s) => s.totalPages >= 100 },
  { id: 'first_khatm', icon: '🏆', label: 'First Khatm', description: 'Complete the Quran once', requirement: (s) => s.khatms >= 1 },
  { id: 'three_khatms', icon: '🌸', label: 'Full Bloom', description: 'Complete the Quran 3 times', requirement: (s) => s.khatms >= 3 },
  { id: 'ten_khatms', icon: '🌲', label: 'Ancient Tree', description: 'Complete the Quran 10 times', requirement: (s) => s.khatms >= 10 },
];

export default function StatsScreen() {
  const { state, resetProgress } = useAppContext();
  const [confirmingReset, setConfirmingReset] = React.useState(false);
  const treeStage = getTreeStage(state.totalPages, state.khatms);
  const khatmPage = state.khatmPage || 1;
  const pagesInCurrentKhatm = khatmPage - 1;

  function confirmReset() {
    if (!confirmingReset) {
      setConfirmingReset(true);
    } else {
      resetProgress();
      setConfirmingReset(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📊 Your Stats</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overall Progress</Text>
        <StatRow icon="📖" label="Total Pages" value={state.totalPages} />
        <StatRow icon="⏱️" label="Total Minutes" value={state.totalMinutes} />
        <StatRow icon="🔥" label="Day Streak" value={state.dayStreak} />
        <StatRow icon="🏆" label="Khatms Completed" value={state.khatms} />
        <StatRow icon="🌿" label="Tree Stage" value={treeStage.label} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Khatm Progress</Text>
        <ProgressBar
          label={`Pages in current Khatm`}
          value={pagesInCurrentKhatm}
          max={QURAN_PAGES}
          unit=" pages"
        />
        <Text style={styles.hint}>
          {QURAN_PAGES - pagesInCurrentKhatm} pages remaining to complete the Quran
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏅 Badges</Text>
        <View style={styles.badgesGrid}>
          {BADGES.map((badge) => {
            const unlocked = badge.requirement(state);
            return (
              <View
                key={badge.id}
                style={[styles.badge, !unlocked && styles.badgeLocked]}
              >
                <Text style={styles.badgeIcon}>{unlocked ? badge.icon : '🔒'}</Text>
                <Text style={[styles.badgeLabel, !unlocked && styles.badgeLabelLocked]}>
                  {badge.label}
                </Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tree Milestones</Text>
        {TREE_STAGES.map((stage) => {
          const reached = state.totalPages >= stage.minPages && state.khatms >= stage.minKhatms;
          return (
            <View key={stage.stage} style={styles.milestoneRow}>
              <Text style={styles.milestoneEmoji}>{stage.emoji}</Text>
              <View style={styles.milestoneInfo}>
                <Text style={[styles.milestoneName, reached && styles.milestoneReached]}>
                  {stage.label}
                </Text>
                <Text style={styles.milestoneReq}>{stage.description}</Text>
              </View>
              {reached && <Text style={styles.checkMark}>✅</Text>}
            </View>
          );
        })}
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={confirmReset}>
        <Text style={styles.resetButtonText}>
          {confirmingReset ? 'Tap again to confirm reset' : 'Reset Progress'}
        </Text>
      </TouchableOpacity>
      {confirmingReset && (
        <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmingReset(false)}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function StatRow({ icon, label, value }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statRowIcon}>{icon}</Text>
      <Text style={styles.statRowLabel}>{label}</Text>
      <Text style={styles.statRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f0faf4',
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a5c38',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a5c38',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  statRowIcon: {
    fontSize: 18,
    width: 30,
  },
  statRowLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  statRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a5c38',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
    textAlign: 'center',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badge: {
    width: '30%',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f0faf4',
  },
  badgeLocked: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  badgeIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a5c38',
    textAlign: 'center',
  },
  badgeLabelLocked: {
    color: '#aaa',
  },
  badgeDesc: {
    fontSize: 9,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  sessionDate: {
    fontSize: 13,
    color: '#555',
  },
  sessionDetail: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a5c38',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  milestoneEmoji: {
    fontSize: 24,
    width: 36,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  milestoneReached: {
    color: '#1a5c38',
  },
  milestoneReq: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 1,
  },
  checkMark: {
    fontSize: 18,
  },
  resetButton: {
    backgroundColor: '#fdecea',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    color: '#c0392b',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
});
