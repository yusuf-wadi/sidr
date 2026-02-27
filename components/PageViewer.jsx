import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { getPageData, getTotalPages, getSurahName } from '../utils/quran';

const SWIPE_THRESHOLD = 50;
const BASMALLAH_TEXT = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
const LINES_PER_PAGE = 15;
const FOOTER_HEIGHT = 44;

export default function PageViewer({
  pageNumber,
  onNextPage,
  onPrevPage,
}) {
  const pageData = getPageData(pageNumber);
  const totalPages = getTotalPages();
  const isFirstPage = pageNumber === 1;
  const isLastPage = pageNumber === totalPages;
  const hasFired = useRef(false);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  // Calculate available height for the page content area.
  // Subtract estimates for top bar (~100), footer, and tab bar (~50).
  const availableHeight = windowHeight - 200;
  const lineHeight = Math.max(16, Math.floor(availableHeight / LINES_PER_PAGE));

  // Scale font sizes relative to line height
  const ayahFontSize = Math.max(12, Math.floor(lineHeight * 0.6));
  const surahFontSize = Math.max(11, Math.floor(lineHeight * 0.5));
  const surahLatinSize = Math.max(8, Math.floor(lineHeight * 0.3));
  const basmallahFontSize = Math.max(11, Math.floor(lineHeight * 0.5));

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 10,
      onPanResponderGrant: () => {
        hasFired.current = false;
      },
      onPanResponderMove: (_, gesture) => {
        if (hasFired.current) return;
        if (gesture.dx < -SWIPE_THRESHOLD && !isLastPage) {
          hasFired.current = true;
          onNextPage && onNextPage();
        } else if (gesture.dx > SWIPE_THRESHOLD && !isFirstPage) {
          hasFired.current = true;
          onPrevPage && onPrevPage();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Page Content */}
      <View style={styles.page}>
        {pageData.lines.map((line, idx) => {
          if (line.type === 'surah_name') {
            return (
              <View key={`l${idx}`} style={[styles.lineSlot, { height: lineHeight }]}>
                <View style={styles.surahBanner}>
                  <Text style={[styles.surahName, { fontSize: surahFontSize }]}>
                    {line.name}
                  </Text>
                  <Text style={[styles.surahNameLatin, { fontSize: surahLatinSize }]}>
                    {getSurahName(line.surah)}
                  </Text>
                </View>
              </View>
            );
          }
          if (line.type === 'basmallah') {
            return (
              <View key={`l${idx}`} style={[styles.lineSlot, { height: lineHeight }]}>
                <Text style={[styles.basmallahText, { fontSize: basmallahFontSize }]}>
                  {BASMALLAH_TEXT}
                </Text>
              </View>
            );
          }
          return (
            <View key={`l${idx}`} style={[styles.lineSlot, { height: lineHeight }]}>
              <Text
                style={[styles.ayahText, { fontSize: ayahFontSize, lineHeight: lineHeight }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {line.text}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { height: FOOTER_HEIGHT }]}>
        <TouchableOpacity
          style={[styles.navButton, isFirstPage && styles.navButtonDisabled]}
          onPress={onPrevPage}
          disabled={isFirstPage}
        >
          <Text style={[styles.navButtonText, isFirstPage && styles.navButtonTextDisabled]}>
            ←
          </Text>
        </TouchableOpacity>

        <Text style={styles.pageNumber}>{pageNumber}</Text>

        <TouchableOpacity
          style={[styles.navButton, isLastPage && styles.navButtonDisabled]}
          onPress={onNextPage}
          disabled={isLastPage}
        >
          <Text style={[styles.navButtonText, isLastPage && styles.navButtonTextDisabled]}>
            →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf6e3',
  },
  page: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  // Each line gets an equal-height slot
  lineSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Surah header
  surahBanner: {
    backgroundColor: '#1a5c38',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '100%',
  },
  surahName: {
    color: '#fff',
    fontWeight: '700',
  },
  surahNameLatin: {
    color: '#c8e6c9',
  },
  // Basmallah
  basmallahText: {
    color: '#1a5c38',
    fontWeight: '600',
  },
  // Ayah text
  ayahText: {
    color: '#1a1a1a',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0d5b7',
    backgroundColor: '#fdf6e3',
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a5c38',
  },
  navButton: {
    backgroundColor: '#1a5c38',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#d5cab0',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  navButtonTextDisabled: {
    color: '#a09880',
  },
});
