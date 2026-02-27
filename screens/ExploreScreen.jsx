import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useReadingTimer } from '../hooks/useReadingTimer';
import PageViewer from '../components/PageViewer';
import { getTotalPages } from '../utils/quran';

export default function ExploreScreen() {
  // Track time spent reading (no page counting)
  useReadingTimer();
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpInput, setJumpInput] = useState('');
  const [showJump, setShowJump] = useState(false);
  const totalPages = getTotalPages();

  function goToNextPage() {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  }

  function goToPrevPage() {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  }

  function handleJump() {
    const page = parseInt(jumpInput, 10);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setShowJump(false);
      setJumpInput('');
    }
  }

  return (
    <View style={styles.container}>
      {/* Jump-to-page bar */}
      <View style={styles.topBar}>
        <Text style={styles.modeLabel}>Explore</Text>
        {showJump ? (
          <View style={styles.jumpRow}>
            <TextInput
              style={styles.jumpInput}
              placeholder="Page #"
              keyboardType="number-pad"
              value={jumpInput}
              onChangeText={setJumpInput}
              onSubmitEditing={handleJump}
              autoFocus
            />
            <TouchableOpacity style={styles.jumpButton} onPress={handleJump}>
              <Text style={styles.jumpButtonText}>Go</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowJump(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setShowJump(true)}>
            <Text style={styles.jumpLink}>Jump to page</Text>
          </TouchableOpacity>
        )}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a5c38',
  },
  jumpLink: {
    fontSize: 13,
    color: '#1a5c38',
    fontWeight: '600',
  },
  jumpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jumpInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 70,
    fontSize: 14,
    textAlign: 'center',
  },
  jumpButton: {
    backgroundColor: '#1a5c38',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  jumpButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelText: {
    color: '#888',
    fontSize: 13,
  },
});
