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
 * Get all verses for a single surah.
 * Returns [{id: verseNum, text: 'Arabic text'}, ...]
 */
export function getSurahVerses(surahId) {
  const surah = quranData.find((s) => s.id === surahId);
  return surah ? surah.verses : [];
}

/**
 * Get pages (with augmented line data) for a single surah, for use in the
 * memorisation screen.  Each ayah-type line is annotated with `primaryVerse`
 * — the verse number whose text starts (or continues) on that line.
 *
 * Returns [{pageNum: N, lines: [{...lineData, primaryVerse: N|null}]}]
 */
export function getSurahPages(surahId) {
  const surah = quranData.find(s => s.id === surahId);
  if (!surah) return [];
  const totalVerses = surah.total_verses;

  const AD = { '٠':0,'١':1,'٢':2,'٣':3,'٤':4,'٥':5,'٦':6,'٧':7,'٨':8,'٩':9 };
  function arabicToInt(s) {
    return parseInt(String(s).replace(/[٠-٩]/g, d => AD[d] ?? d));
  }

  // Collect page numbers that contain at least one verse of this surah
  const pageNums = [];
  for (let p = 1; p < pagesData.length; p++) {
    const pg = pagesData[p];
    if (pg && pg.verses.some(([s]) => s === surahId)) pageNums.push(p);
  }

  const result = [];
  let carryVerse = null; // verse whose text is continuing across lines

  for (const pageNum of pageNums) {
    const pg = pagesData[pageNum];
    let inTarget = false;

    if (pg.surahStarts && pg.surahStarts.includes(surahId)) {
      // Surah begins on this page — we'll enter it at the surah_name line
      inTarget = false;
      carryVerse = 1;
    } else if (carryVerse === null) {
      // Surah continues from a previous page; find the minimum verse here
      const minV = Math.min(...pg.verses.filter(([s]) => s === surahId).map(([,v]) => v));
      carryVerse = isFinite(minV) ? minV : 1;
      inTarget = true;
    } else {
      inTarget = true;
    }

    const augLines = [];
    for (const line of pg.lines) {
      if (line.type === 'surah_name') {
        if (line.surah === surahId) { inTarget = true; carryVerse = 1; }
        else                        { inTarget = false; }
        augLines.push({ ...line, primaryVerse: null });
        continue;
      }
      if (line.type === 'basmallah') {
        augLines.push({ ...line, primaryVerse: null });
        continue;
      }

      // ayah line
      if (!inTarget || carryVerse === null || carryVerse > totalVerses) {
        augLines.push({ ...line, primaryVerse: null });
        continue;
      }

      // Find the last verse-end marker on this line that belongs to this surah
      const re = /\u06DD([٠-٩]+)/g;
      let m, lastV = null;
      while ((m = re.exec(line.text)) !== null) {
        const v = arabicToInt(m[1]);
        if (v >= 1 && v <= totalVerses) lastV = v;
      }

      augLines.push({ ...line, primaryVerse: carryVerse });

      if (lastV !== null) carryVerse = lastV + 1;
      // else verse continues to next line — carryVerse unchanged
    }

    result.push({ pageNum, lines: augLines });
  }

  return result;
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
