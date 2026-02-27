import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import { getAllSurahs } from '../utils/quran';

const SURAHS = getAllSurahs();

export default function MemoScreen() {
  const { state, memoStart, memoVerse, memoUnverse, memoReview, memoRemove } = useAppContext();
  const [selectedSurah, setSelectedSurah] = useState(null);
  const { width: windowWidth } = useWindowDimensions();

  if (!state._loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1a5c38" />
      </View>
    );
  }

  // Surah detail view
  if (selectedSurah) {
    const surah = SURAHS.find(s => s.id === selectedSurah);
    const entry = state.memo[selectedSurah];
    const memorized = entry ? entry.versesMemorized : [];
    const progress = surah ? memorized.length / surah.verses : 0;

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedSurah(null)}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.surahTitle}>{surah.arabicName}</Text>
        <Text style={styles.surahSubtitle}>{surah.name}</Text>
        <Text style={styles.surahMeta}>
          {surah.verses} verses | {memorized.length} memorized | {entry?.status || 'not started'}
        </Text>

        {/* Progress bar */}
        <View style={styles.progressBarOuter}>
          <View style={[styles.progressBarInner, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{(progress * 100).toFixed(0)}%</Text>

        {/* Decay warning */}
        {entry?.status === 'decayed' && (
          <View style={styles.decayWarning}>
            <Text style={styles.decayText}>
              Not reviewed in 7+ days. Memorization has decayed. Restart or review to restore.
            </Text>
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => memoReview(selectedSurah)}
            >
              <Text style={styles.reviewBtnText}>Mark Reviewed</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Start button if not started */}
        {!entry && (
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => memoStart(selectedSurah)}
          >
            <Text style={styles.startBtnText}>Begin Memorizing</Text>
          </TouchableOpacity>
        )}

        {/* Verse grid */}
        {entry && entry.status !== 'decayed' && (
          <View style={styles.verseGrid}>
            {Array.from({ length: surah.verses }, (_, i) => i + 1).map(v => {
              const isDone = memorized.includes(v);
              return (
                <TouchableOpacity
                  key={v}
                  style={[styles.verseCell, isDone && styles.verseCellDone]}
                  onPress={() => {
                    if (isDone) {
                      memoUnverse(selectedSurah, v);
                    } else {
                      memoVerse(selectedSurah, v, surah.verses);
                    }
                  }}
                >
                  <Text style={[styles.verseNum, isDone && styles.verseNumDone]}>{v}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Actions */}
        {entry && (
          <View style={styles.actions}>
            {entry.status === 'complete' && (
              <TouchableOpacity
                style={styles.reviewBtn}
                onPress={() => memoReview(selectedSurah)}
              >
                <Text style={styles.reviewBtnText}>Mark Reviewed</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => {
                memoRemove(selectedSurah);
                setSelectedSurah(null);
              }}
            >
              <Text style={styles.removeBtnText}>Remove from Memo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  // Surah grid view
  const cols = windowWidth > 500 ? 6 : 4;
  const cellSize = Math.floor((windowWidth - 40 - (cols - 1) * 8) / cols);

  // Counts
  const activeMemo = Object.values(state.memo).filter(e => e.status === 'active').length;
  const completeMemo = Object.values(state.memo).filter(e => e.status === 'complete').length;
  const decayedMemo = Object.values(state.memo).filter(e => e.status === 'decayed').length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Memorization</Text>
      <Text style={styles.subtitle}>
        {activeMemo} active | {completeMemo} complete{decayedMemo > 0 ? ` | ${decayedMemo} decayed` : ''}
      </Text>

      <View style={styles.surahGrid}>
        {SURAHS.map(surah => {
          const entry = state.memo[surah.id];
          const status = entry?.status;
          const progress = entry
            ? entry.versesMemorized.length / surah.verses
            : 0;

          let cellStyle = styles.surahCell;
          if (status === 'complete') cellStyle = styles.surahCellComplete;
          else if (status === 'decayed') cellStyle = styles.surahCellDecayed;
          else if (status === 'active') cellStyle = styles.surahCellActive;

          return (
            <TouchableOpacity
              key={surah.id}
              style={[cellStyle, { width: cellSize, height: cellSize }]}
              onPress={() => setSelectedSurah(surah.id)}
            >
              <Text style={styles.surahCellNum}>{surah.id}</Text>
              <Text style={styles.surahCellName} numberOfLines={1}>{surah.name}</Text>
              {entry && status !== 'decayed' && (
                <View style={styles.miniProgress}>
                  <View style={[styles.miniProgressFill, { width: `${progress * 100}%` }]} />
                </View>
              )}
              {status === 'complete' && <Text style={styles.completeMark}>✓</Text>}
              {status === 'decayed' && <Text style={styles.decayMark}>!</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: {
    flexGrow: 1,
    backgroundColor: '#f0faf4',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a5c38',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Surah grid
  surahGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  surahCell: {
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  surahCellActive: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderWidth: 1.5,
    borderColor: '#4caf50',
  },
  surahCellComplete: {
    backgroundColor: '#c8e6c9',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderWidth: 1.5,
    borderColor: '#2e7d32',
  },
  surahCellDecayed: {
    backgroundColor: '#ffebee',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderWidth: 1.5,
    borderColor: '#e53935',
  },
  surahCellNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a5c38',
  },
  surahCellName: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
    marginTop: 1,
  },
  miniProgress: {
    width: '80%',
    height: 3,
    backgroundColor: '#ddd',
    borderRadius: 2,
    marginTop: 3,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: 3,
    backgroundColor: '#4caf50',
    borderRadius: 2,
  },
  completeMark: {
    position: 'absolute',
    top: 2,
    right: 4,
    fontSize: 10,
    color: '#2e7d32',
    fontWeight: '800',
  },
  decayMark: {
    position: 'absolute',
    top: 2,
    right: 4,
    fontSize: 10,
    color: '#e53935',
    fontWeight: '800',
  },

  // Detail view
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
  },
  backText: { fontSize: 14, color: '#333', fontWeight: '600' },
  surahTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a5c38',
    textAlign: 'center',
  },
  surahSubtitle: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 4,
  },
  surahMeta: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBarOuter: {
    width: '100%',
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarInner: {
    height: 8,
    backgroundColor: '#4caf50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#4caf50',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Verse grid
  verseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 20,
  },
  verseCell: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  verseCellDone: {
    backgroundColor: '#4caf50',
    borderColor: '#2e7d32',
  },
  verseNum: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  verseNumDone: {
    color: '#fff',
  },

  // Warnings and actions
  decayWarning: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffcc02',
  },
  decayText: {
    fontSize: 13,
    color: '#e65100',
    marginBottom: 8,
  },
  startBtn: {
    backgroundColor: '#1a5c38',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 16,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  reviewBtn: {
    backgroundColor: '#1a5c38',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  reviewBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeBtn: {
    backgroundColor: '#ffebee',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  removeBtnText: {
    color: '#e53935',
    fontSize: 14,
    fontWeight: '600',
  },
});
