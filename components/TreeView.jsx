import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTreeStage, getProgressToNextStage, TREE_STAGES } from '../utils/treeLogic';

/**
 * TreeView displays the current tree emoji and stage information,
 * along with a small progress strip toward the next stage.
 */
export default function TreeView({ totalPages, khatms }) {
  const stage = getTreeStage(totalPages, khatms);
  const progress = getProgressToNextStage(totalPages, khatms);
  const stageIndex = TREE_STAGES.findIndex((s) => s.stage === stage.stage);
  const isMaxStage = stageIndex === TREE_STAGES.length - 1;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{stage.emoji}</Text>
      <Text style={styles.label}>{stage.label}</Text>
      <Text style={styles.description}>{stage.description}</Text>

      {!isMaxStage && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>
            Progress to {TREE_STAGES[stageIndex + 1].label}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
        </View>
      )}

      {isMaxStage && (
        <Text style={styles.maxLabel}>✨ Fully Grown</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 8,
  },
  label: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a5c38',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 6,
  },
  progressTrack: {
    width: '80%',
    height: 10,
    backgroundColor: '#d4edda',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1a5c38',
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 11,
    color: '#1a5c38',
    marginTop: 4,
    fontWeight: '600',
  },
  maxLabel: {
    fontSize: 14,
    color: '#b8860b',
    fontWeight: '600',
    marginTop: 8,
  },
});
