// Quran data utility - uses pre-generated page map from real QPC V1 data
// Page mapping sourced from data/qpc-v1-15-lines.db via scripts/generate-pages.js

import { QURAN_PAGES } from './treeLogic';
import quranData from '../data/quran.json';
import pagesData from '../data/pages.json';

/**
 * Get page data including lines and verse IDs
 */
export function getPageData(pageNumber) {
  if (pageNumber < 1 || pageNumber > QURAN_PAGES) {
    return { page: pageNumber, lines: [], verses: [], surahStarts: [] };
  }

  const pageInfo = pagesData[pageNumber];
  if (!pageInfo) {
    return { page: pageNumber, lines: [], verses: [], surahStarts: [] };
  }

  return {
    page: pageNumber,
    lines: pageInfo.lines,
    verses: pageInfo.verses.map(([s, v]) => `${s}:${v}`),
    surahStarts: pageInfo.surahStarts,
  };
}

/**
 * Get total pages
 */
export function getTotalPages() {
  return QURAN_PAGES;
}

/**
 * Get verse ID string
 */
export function getVerseId(surahNumber, verseNumber) {
  return `${surahNumber}:${verseNumber}`;
}

/**
 * Get surah name by number
 */
export function getSurahName(surahNumber) {
  const surah = quranData.find((s) => s.id === surahNumber);
  return surah ? surah.transliteration : `Surah ${surahNumber}`;
}

/**
 * Get all surahs
 */
export function getAllSurahs() {
  return quranData.map((s) => ({
    id: s.id,
    name: s.transliteration,
    arabicName: s.name,
    verses: s.total_verses,
    type: s.type,
  }));
}
