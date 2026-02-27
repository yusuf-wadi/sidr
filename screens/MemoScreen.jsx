import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import { getAllSurahs, getSurahVerses } from '../utils/quran';

const SURAHS = getAllSurahs();

const BASMALLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
const AYAH_MARK = '\u06DD'; // ۝

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function toArabicNum(n) {
  return String(n).replace(/[0-9]/g, d => ARABIC_DIGITS[d]);
}

// ── Confidence config ─────────────────────────────────────────────────────────

const CONFIDENCE = {
  difficult: {
    label: 'Hard',
    highlight: 'rgba(229,57,53,0.13)',
    highlightStrong: 'rgba(229,57,53,0.25)',
    border: '#e57373',
    btnBg: '#ffcdd2',
    btnBorder: '#c62828',
    textColor: '#b71c1c',
    barColor: '#ef9a9a',
  },
  shaky: {
    label: 'Shaky',
    highlight: 'rgba(251,192,45,0.18)',
    highlightStrong: 'rgba(251,192,45,0.35)',
    border: '#ffd54f',
    btnBg: '#fff9c4',
    btnBorder: '#f9a825',
    textColor: '#e65100',
    barColor: '#ffe082',
  },
  good: {
    label: 'Good',
    highlight: 'rgba(67,160,71,0.13)',
    highlightStrong: 'rgba(67,160,71,0.25)',
    border: '#81c784',
    btnBg: '#c8e6c9',
    btnBorder: '#2e7d32',
    textColor: '#1b5e20',
    barColor: '#a5d6a7',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEntryGoodCount(entry) {
  if (!entry) return 0;
  if (entry.verseConfidence)
    return Object.values(entry.verseConfidence).filter(c => c === 'good').length;
  return entry.versesMemorized ? entry.versesMemorized.length : 0;
}

function getVerseConf(entry, verseNum) {
  if (!entry) return null;
  if (entry.verseConfidence) return entry.verseConfidence[verseNum] || null;
  if (entry.versesMemorized?.includes(verseNum)) return 'good';
  return null;
}

// ── SurahDetail ───────────────────────────────────────────────────────────────

function SurahDetail({ surahId, onBack }) {
  const { state, memoStart, memoVerseConfidence, memoMarkComplete, memoRemove } = useAppContext();
  const [mode, setMode]              = useState('review');
  const [selectedVerse, setSelected] = useState(null);
  const { height: windowHeight }     = useWindowDimensions();

  const surah  = useMemo(() => SURAHS.find(s => s.id === surahId), [surahId]);
  const verses = useMemo(() => getSurahVerses(surahId), [surahId]);

  const [revealedVerses, setRevealedVerses] = useState(
    () => new Set(verses.map(v => v.id))  // review = all visible by default
  );

  const entry          = state.memo[surahId];
  const totalV         = surah?.verses ?? 0;
  const goodCount      = getEntryGoodCount(entry);
  const difficultCount = entry?.verseConfidence
    ? Object.values(entry.verseConfidence).filter(c => c === 'difficult').length : 0;
  const shakyCount     = entry?.verseConfidence
    ? Object.values(entry.verseConfidence).filter(c => c === 'shaky').length : 0;
  const unratedCount   = totalV - difficultCount - shakyCount - goodCount;

  const showBasmallah = surahId !== 1 && surahId !== 9;

  // Font sizing relative to screen
  const ayahFontSize = Math.max(16, Math.floor(windowHeight * 0.024));

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setSelected(null);
    setRevealedVerses(newMode === 'review'
      ? new Set(verses.map(v => v.id))
      : new Set()
    );
  }, [verses]);

  const handleVersePress = useCallback((verseNum) => {
    const isCurrentlyVisible = revealedVerses.has(verseNum);
    setRevealedVerses(prev => {
      const next = new Set(prev);
      if (next.has(verseNum)) next.delete(verseNum);
      else next.add(verseNum);
      return next;
    });
    // Confidence panel opens only when revealing; closes when hiding
    setSelected(isCurrentlyVisible ? null : verseNum);
  }, [revealedVerses]);

  const handleRate = useCallback((confidence) => {
    if (selectedVerse === null || !surah) return;
    memoVerseConfidence(surahId, selectedVerse, confidence, surah.verses);
    setSelected(null);
  }, [selectedVerse, surah, surahId, memoVerseConfidence]);

  const handleMarkAll = useCallback(() => {
    if (!surah) return;
    Alert.alert(
      'Mark Entire Chapter Memorized',
      `Mark all ${surah.verses} verses of ${surah.name} as fully memorized?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Memorized', onPress: () => { memoMarkComplete(surahId, surah.verses); setSelected(null); } },
      ]
    );
  }, [surah, surahId, memoMarkComplete]);

  const handleRemove = useCallback(() => {
    Alert.alert('Remove from Memorization', `Remove ${surah?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { memoRemove(surahId); onBack(); } },
    ]);
  }, [surah, surahId, memoRemove, onBack]);

  if (!surah) return null;

  // Panel only opens for visible verses after memorization has started
  const isPanelOpen = selectedVerse !== null && !!entry;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.detailRoot}>

      {/* ── Fixed header ── */}
      <View style={styles.detailHeader}>
        <View style={styles.detailHeaderRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'review' && styles.modeBtnActive]}
              onPress={() => handleModeChange('review')}
            >
              <Text style={[styles.modeBtnText, mode === 'review' && styles.modeBtnTextActive]}>Review</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'test' && styles.modeBtnActive]}
              onPress={() => handleModeChange('test')}
            >
              <Text style={[styles.modeBtnText, mode === 'test' && styles.modeBtnTextActive]}>Test</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.headerArabic}>{surah.arabicName}</Text>
        <Text style={styles.headerLatin}>{surah.name} · {totalV} verses</Text>

        {entry && (
          <>
            <View style={styles.progressOuter}>
              <View style={[styles.progressSeg, { flex: difficultCount, backgroundColor: '#e53935' }]} />
              <View style={[styles.progressSeg, { flex: shakyCount,     backgroundColor: '#fbc02d' }]} />
              <View style={[styles.progressSeg, { flex: goodCount,      backgroundColor: '#43a047' }]} />
              <View style={[styles.progressSeg, { flex: unratedCount,   backgroundColor: '#d6c9a8' }]} />
            </View>
            <Text style={styles.progressLabel}>
              {goodCount}/{totalV} memorized
              {difficultCount > 0 ? `  ·  ${difficultCount} hard` : ''}
              {shakyCount > 0 ? `  ·  ${shakyCount} shaky` : ''}
            </Text>
          </>
        )}
        {entry?.status === 'decayed' && (
          <Text style={styles.decayLabel}>Not reviewed in 7+ days</Text>
        )}
      </View>

      {/* ── Verse content — one verse box per row ── */}
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={[styles.pageContent, isPanelOpen && { paddingBottom: 180 }]}
      >
        {/* Surah name banner */}
        <View style={styles.surahBannerBlock}>
          <Text style={[styles.surahBannerArabic, { fontSize: ayahFontSize * 0.9 }]}>
            {surah.arabicName}
          </Text>
          <Text style={[styles.surahBannerLatin, { fontSize: ayahFontSize * 0.45 }]}>
            {surah.name}
          </Text>
        </View>

        {/* Basmallah */}
        {showBasmallah && (
          <Text style={[styles.basmallahText, { fontSize: ayahFontSize * 0.8 }]}>
            {BASMALLAH}
          </Text>
        )}

        {/* Begin memorizing — shown before surah is started */}
        {!entry && (
          <TouchableOpacity style={styles.startBtn} onPress={() => memoStart(surahId)}>
            <Text style={styles.startBtnText}>Begin Memorizing</Text>
          </TouchableOpacity>
        )}

        {/* ── Verse boxes ── */}
        {entry && verses.map(verse => {
          const conf      = getVerseConf(entry, verse.id);
          const cfg       = conf ? CONFIDENCE[conf] : null;
          const isOccluded = !revealedVerses.has(verse.id);
          const isSel     = selectedVerse === verse.id;
          const marker    = AYAH_MARK + toArabicNum(verse.id);

          return (
            <TouchableOpacity
              key={verse.id}
              style={[
                styles.verseBox,
                verse.id > 1 && styles.verseBoxBorder,
                !isOccluded && cfg && {
                  backgroundColor: isSel ? cfg.highlightStrong : cfg.highlight,
                },
                isSel && !isOccluded && !cfg && { backgroundColor: 'rgba(26,92,56,0.07)' },
                isSel && !isOccluded && styles.verseBoxSelected,
              ]}
              onPress={() => handleVersePress(verse.id)}
              activeOpacity={0.8}
            >
              {isOccluded ? (
                /* ── Hidden verse: bar + marker visible at the end ── */
                <View style={[styles.occlusionRow, cfg && { backgroundColor: cfg.barColor }]}>
                  <View style={styles.occlusionFill} />
                  <Text style={[styles.occlusionMarker, cfg && { color: cfg.textColor }]}>
                    {marker}
                  </Text>
                </View>
              ) : (
                /* ── Visible verse: full Arabic text + marker ── */
                <Text
                  style={[styles.ayahText, { fontSize: ayahFontSize, lineHeight: ayahFontSize * 1.8 }]}
                  textBreakStrategy="simple"
                >
                  {verse.text}
                  {'  '}
                  <Text style={[styles.ayahMarker, { fontSize: ayahFontSize * 0.78 }]}>
                    {marker}
                  </Text>
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* ── Bottom actions ── */}
        {entry && (
          <View style={styles.detailActions}>
            {entry.status !== 'complete' ? (
              <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAll}>
                <Text style={styles.markAllText}>Mark Entire Chapter Memorized</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.completeBadge}>
                <Text style={styles.completeBadgeText}>✓ Fully Memorized</Text>
              </View>
            )}
            <TouchableOpacity onPress={handleRemove}>
              <Text style={styles.removeBtnText}>Remove from List</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Confidence panel (fixed bottom sheet, visible text only) ── */}
      {isPanelOpen && (
        <View style={styles.confidencePanel}>
          <View style={styles.confidencePanelHeader}>
            <Text style={styles.confidencePanelTitle}>
              Verse {selectedVerse}
              {getVerseConf(entry, selectedVerse)
                ? `  ·  ${CONFIDENCE[getVerseConf(entry, selectedVerse)].label}`
                : ''}
            </Text>
            <TouchableOpacity
              onPress={() => setSelected(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.confidenceDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.confidencePanelSub}>How well do you know this verse?</Text>
          <View style={styles.confidenceButtons}>
            {Object.entries(CONFIDENCE).map(([key, cfg]) => {
              const isActive = getVerseConf(entry, selectedVerse) === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.confidenceBtn,
                    { backgroundColor: cfg.btnBg, borderColor: cfg.btnBorder },
                    isActive && styles.confidenceBtnActive,
                  ]}
                  onPress={() => handleRate(key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.confidenceBtnText, { color: cfg.textColor }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Surah grid ────────────────────────────────────────────────────────────────

export default function MemoScreen() {
  const { state } = useAppContext();
  const [selectedSurah, setSelectedSurah] = useState(null);
  const { width: windowWidth } = useWindowDimensions();

  if (!state._loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1a5c38" />
      </View>
    );
  }

  if (selectedSurah !== null) {
    return <SurahDetail surahId={selectedSurah} onBack={() => setSelectedSurah(null)} />;
  }

  const entries      = Object.values(state.memo);
  const activeMemo   = entries.filter(e => e.status === 'active').length;
  const completeMemo = entries.filter(e => e.status === 'complete').length;
  const decayedMemo  = entries.filter(e => e.status === 'decayed').length;

  const cols     = windowWidth > 500 ? 6 : 4;
  const cellSize = Math.floor((windowWidth - 40 - (cols - 1) * 8) / cols);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Memorization</Text>
      <Text style={styles.subtitle}>
        {activeMemo} active · {completeMemo} complete
        {decayedMemo > 0 ? ` · ${decayedMemo} decayed` : ''}
      </Text>

      <View style={styles.surahGrid}>
        {SURAHS.map(surah => {
          const entry    = state.memo[surah.id];
          const status   = entry?.status;
          const good     = getEntryGoodCount(entry);
          const pct      = good / surah.verses;

          return (
            <TouchableOpacity
              key={surah.id}
              style={[
                styles.surahCell,
                { width: cellSize, height: cellSize },
                status === 'active'   && styles.surahCellActive,
                status === 'complete' && styles.surahCellComplete,
                status === 'decayed'  && styles.surahCellDecayed,
              ]}
              onPress={() => setSelectedSurah(surah.id)}
            >
              <Text style={styles.surahCellNum}>{surah.id}</Text>
              <Text style={styles.surahCellName} numberOfLines={1}>{surah.name}</Text>
              {entry && status !== 'decayed' && (
                <View style={styles.miniProgress}>
                  <View style={[styles.miniProgressFill, { width: `${pct * 100}%` }]} />
                </View>
              )}
              {status === 'complete' && <Text style={styles.completeMark}>✓</Text>}
              {status === 'decayed'  && <Text style={styles.decayMark}>!</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Grid ──
  container: {
    flexGrow: 1, backgroundColor: '#f0faf4',
    paddingVertical: 32, paddingHorizontal: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#1a5c38', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  surahGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  surahCell: {
    backgroundColor: '#fff', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', padding: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  surahCellActive: {
    backgroundColor: '#e8f5e9', borderWidth: 1.5, borderColor: '#4caf50',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center', padding: 4,
  },
  surahCellComplete: {
    backgroundColor: '#c8e6c9', borderWidth: 1.5, borderColor: '#2e7d32',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center', padding: 4,
  },
  surahCellDecayed: {
    backgroundColor: '#ffebee', borderWidth: 1.5, borderColor: '#e53935',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center', padding: 4,
  },
  surahCellNum:  { fontSize: 14, fontWeight: '700', color: '#1a5c38' },
  surahCellName: { fontSize: 8,  color: '#666', textAlign: 'center', marginTop: 1 },
  miniProgress: { width: '80%', height: 3, backgroundColor: '#ddd', borderRadius: 2, marginTop: 3, overflow: 'hidden' },
  miniProgressFill: { height: 3, backgroundColor: '#4caf50', borderRadius: 2 },
  completeMark: { position: 'absolute', top: 2, right: 4, fontSize: 10, color: '#2e7d32', fontWeight: '800' },
  decayMark:    { position: 'absolute', top: 2, right: 4, fontSize: 10, color: '#e53935', fontWeight: '800' },

  // ── Detail header ──
  detailRoot:   { flex: 1, backgroundColor: '#fdf6e3' },
  detailHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0d5b7',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  backBtn: {
    paddingVertical: 5, paddingHorizontal: 10,
    backgroundColor: '#e0ede5', borderRadius: 8,
  },
  backText: { fontSize: 14, color: '#1a5c38', fontWeight: '600' },

  // Mode toggle (Review | Test)
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#1a5c38',
    overflow: 'hidden',
  },
  modeBtn: {
    paddingVertical: 5, paddingHorizontal: 14,
    backgroundColor: 'transparent',
  },
  modeBtnActive: { backgroundColor: '#1a5c38' },
  modeBtnText: { fontSize: 13, fontWeight: '700', color: '#1a5c38' },
  modeBtnTextActive: { color: '#fff' },

  headerArabic: { fontSize: 22, fontWeight: '700', color: '#1a5c38', textAlign: 'center' },
  headerLatin:  { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 8 },

  // Progress bar
  progressOuter: {
    width: '100%', height: 7, borderRadius: 4,
    overflow: 'hidden', flexDirection: 'row', marginBottom: 4,
  },
  progressSeg: { height: 7 },
  progressLabel: { fontSize: 11, color: '#777', textAlign: 'center' },
  decayLabel: { fontSize: 12, color: '#e65100', textAlign: 'center', marginTop: 4, fontStyle: 'italic' },

  // ── Verse content scroll ──
  pageScroll:  { flex: 1, backgroundColor: '#fdf6e3' },
  pageContent: { paddingHorizontal: 14, paddingVertical: 10, paddingBottom: 40 },

  // Surah name banner
  surahBannerBlock: {
    backgroundColor: '#1a5c38',
    borderRadius: 6,
    paddingVertical: 6, paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 4,
  },
  surahBannerArabic: { color: '#fff', fontWeight: '700' },
  surahBannerLatin:  { color: '#c8e6c9' },

  // Basmallah
  basmallahText: {
    color: '#1a5c38', fontWeight: '600',
    textAlign: 'center', paddingVertical: 6,
  },

  // Begin memorizing button
  startBtn: {
    backgroundColor: '#1a5c38', paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 12, alignSelf: 'center', marginTop: 24,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ── Individual verse box ──
  verseBox: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  verseBoxBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d6c9a8',
  },
  verseBoxSelected: {
    borderWidth: 1.5,
    borderColor: '#1a5c38',
    borderRadius: 6,
  },

  // Arabic verse text
  ayahText: {
    color: '#1a1a1a',
    textAlign: 'center',
    fontWeight: '500',
    writingDirection: 'rtl',
  },
  ayahMarker: { color: '#1a5c38', fontWeight: '700' },

  // Occlusion bar — fills the verse box, marker still visible at the end
  occlusionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 5,
    backgroundColor: '#d6c9a8',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  occlusionFill: { flex: 1 },
  occlusionMarker: {
    fontSize: 15, fontWeight: '700', color: '#8a7a5a',
    marginLeft: 6,
  },

  // Bottom actions
  detailActions: { alignItems: 'center', gap: 12, marginTop: 28, marginBottom: 8 },
  markAllBtn: {
    backgroundColor: '#1a5c38', paddingVertical: 13, paddingHorizontal: 28, borderRadius: 12,
  },
  markAllText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  completeBadge: {
    backgroundColor: '#c8e6c9', paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#2e7d32',
  },
  completeBadgeText: { color: '#1b5e20', fontSize: 15, fontWeight: '700' },
  removeBtnText: { color: '#c62828', fontSize: 13, fontWeight: '600', paddingVertical: 8 },

  // Confidence panel
  confidencePanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 16, paddingBottom: 30, paddingHorizontal: 20,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 14, elevation: 10,
  },
  confidencePanelHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  confidencePanelTitle: { fontSize: 16, fontWeight: '700', color: '#1a5c38' },
  confidenceDismiss:    { fontSize: 18, color: '#999', fontWeight: '600' },
  confidencePanelSub:   { fontSize: 13, color: '#888', marginBottom: 14 },
  confidenceButtons:    { flexDirection: 'row', gap: 10 },
  confidenceBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'center',
  },
  confidenceBtnActive: {
    borderWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  confidenceBtnText: { fontSize: 15, fontWeight: '700' },
});
