import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { useReadingTimer } from '../hooks/useReadingTimer';
import PageViewer from '../components/PageViewer';
import { getTotalPages } from '../utils/quran';

export default function KhatmScreen() {
  const { state, addPage, setKhatmPage } = useAppContext();
  const [currentPage, setLocalPage] = useState(state.khatmPage || 1);
  const totalPages = getTotalPages();

  // Passive time tracking while this tab is focused
  useReadingTimer();

  // Sync with persisted khatm page on load
  useEffect(() => {
    if (state._loaded && state.khatmPage && state.khatmPage !== currentPage) {
      setLocalPage(state.khatmPage);
    }
  }, [state._loaded]);

  function goToNextPage() {
    let newPage;
    if (currentPage < totalPages) {
      newPage = currentPage + 1;
    } else {
      newPage = 1; // wrap for new khatm
    }
    setLocalPage(newPage);
    setKhatmPage(newPage);
    addPage(); // immediately counts toward stats
  }

  function goToPrevPage() {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setLocalPage(newPage);
      setKhatmPage(newPage);
    }
  }

  const khatmProgress = Math.round((currentPage / totalPages) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Khatm</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${khatmProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{khatmProgress}%</Text>
        </View>
      </View>

      <PageViewer
        pageNumber={currentPage}
        onNextPage={goToNextPage}
        onPrevPage={goToPrevPage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf6e3',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a5c38',
    textAlign: 'center',
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#1a5c38',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a5c38',
    width: 36,
    textAlign: 'right',
  },
});
