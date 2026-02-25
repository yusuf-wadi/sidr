// Quran data utility - uses pre-generated page map from real QPC V1 data
// Page mapping sourced from data/qpc-v1-15-lines.db via scripts/generate-pages.js

import { QURAN_PAGES } from './treeLogic';
import quranData from '../data/quran.json';
import pagesData from '../data/pages.json';

/**
 * Get verses for a specific page
 */
export function getPageVerses(pageNumber) {
  if (pageNumber < 1 || pageNumber > QURAN_PAGES) {
    return { page: pageNumber, verses: [], surahStarts: [] };
  }

  const pageInfo = pagesData[pageNumber];
  if (!pageInfo) {
    return { page: pageNumber, verses: [], surahStarts: [] };
  }

  const verses = [];
  for (const [surahNum, verseNum] of pageInfo.verses) {
    const surah = quranData[surahNum - 1]; // quranData is 0-indexed
    if (!surah) continue;
    const verse = surah.verses.find((v) => v.id === verseNum);
    if (!verse) continue;
    verses.push({
      id: `${surahNum}:${verseNum}`,
      surahNumber: surahNum,
      verseNumber: verseNum,
      text: verse.text,
      transliteration: surah.transliteration,
    });
  }

  return {
    page: pageNumber,
    verses,
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
