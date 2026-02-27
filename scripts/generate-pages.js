/**
 * Generate pages.json from the QPC V1 SQLite database.
 *
 * Produces line-level data for each of the 604 pages (15 lines per page),
 * with pre-computed Arabic text and verse-end markers (۝) embedded inline.
 *
 * Usage:  node scripts/generate-pages.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data', 'qpc-v1-15-lines.db');
const QURAN_PATH = path.join(ROOT, 'data', 'quran.json');
const OUT_PATH = path.join(ROOT, 'data', 'pages.json');

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function toArabicNum(n) {
  return String(n).replace(/[0-9]/g, (d) => ARABIC_DIGITS[d]);
}

// ---------------------------------------------------------------------------
// 1. Build word-id → verse+position lookup from quran.json
// ---------------------------------------------------------------------------
const quranData = JSON.parse(fs.readFileSync(QURAN_PATH, 'utf8'));

// Each entry: { surah, verse, wordPos, wordCount }
// wordPos is 0-indexed; the last position (wordCount-1) is the verse-end marker.
const wordInfo = [];
let nextWordId = 1;

// Also build a quick lookup for verse text words
// verseWords[surah][verse] = [word0, word1, ...]
const verseWords = {};

for (const surah of quranData) {
  verseWords[surah.id] = {};
  for (const verse of surah.verses) {
    const words = verse.text.split(/\s+/);
    verseWords[surah.id][verse.id] = words;
    const wordCount = words.length + 1; // +1 for end marker
    for (let w = 0; w < wordCount; w++) {
      wordInfo[nextWordId + w] = {
        surah: surah.id,
        verse: verse.id,
        wordPos: w,
        wordCount,
      };
    }
    nextWordId += wordCount;
  }
}

console.log(`Total word IDs mapped: ${nextWordId - 1}`);

// Surah name lookup
const surahNames = {};
for (const s of quranData) {
  surahNames[s.id] = s.name; // Arabic name
}

// ---------------------------------------------------------------------------
// 2. Read the pages table from the database
// ---------------------------------------------------------------------------
const db = new Database(DB_PATH, { readonly: true });
const rows = db.prepare('SELECT * FROM pages ORDER BY page_number, line_number').all();
db.close();

// ---------------------------------------------------------------------------
// 3. Build pages array with line-level data
// ---------------------------------------------------------------------------
const pages = [null]; // index 0 placeholder (pages are 1-indexed)

let currentPageNum = null;
let currentLines = [];
let currentVerses = new Set();
let currentSurahStarts = [];

function buildLineText(firstWid, lastWid) {
  const parts = [];
  for (let wid = firstWid; wid <= lastWid; wid++) {
    const info = wordInfo[wid];
    if (!info) continue;
    if (info.wordPos === info.wordCount - 1) {
      // Verse-end marker
      parts.push('\u06DD' + toArabicNum(info.verse));
    } else {
      // Regular word from verse text
      const words = verseWords[info.surah][info.verse];
      if (words && words[info.wordPos] !== undefined) {
        parts.push(words[info.wordPos]);
      }
    }
    currentVerses.add(`${info.surah}:${info.verse}`);
  }
  return parts.join(' ');
}

function flushPage() {
  if (currentPageNum === null) return;
  const verseList = Array.from(currentVerses).map((k) => k.split(':').map(Number));
  verseList.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  pages.push({
    lines: currentLines,
    verses: verseList,
    surahStarts: currentSurahStarts,
  });
}

for (const row of rows) {
  if (row.page_number !== currentPageNum) {
    flushPage();
    currentPageNum = row.page_number;
    currentLines = [];
    currentVerses = new Set();
    currentSurahStarts = [];
  }

  if (row.line_type === 'surah_name') {
    currentSurahStarts.push(row.surah_number);
    currentLines.push({
      type: 'surah_name',
      surah: row.surah_number,
      name: surahNames[row.surah_number] || '',
    });
  } else if (row.line_type === 'basmallah') {
    currentLines.push({ type: 'basmallah' });
  } else if (row.first_word_id && row.last_word_id) {
    const text = buildLineText(Number(row.first_word_id), Number(row.last_word_id));
    currentLines.push({
      type: 'ayah',
      text,
      centered: row.is_centered === 1,
    });
  }
}
flushPage();

console.log(`Generated ${pages.length - 1} pages`);

// Sanity checks
const p1 = pages[1];
console.log(`Page 1: ${p1.lines.length} lines, ${p1.verses.length} verses`);
console.log(`  Line 1: ${JSON.stringify(p1.lines[0])}`);
console.log(`  Line 2: ${p1.lines[1]?.text?.substring(0, 60)}...`);
const p2 = pages[2];
console.log(`Page 2: ${p2.lines.length} lines, surahStarts: [${p2.surahStarts}]`);
console.log(`  Line 1: ${JSON.stringify(p2.lines[0])}`);
const p604 = pages[604];
console.log(`Page 604: ${p604.lines.length} lines, surahStarts: [${p604.surahStarts}]`);

// ---------------------------------------------------------------------------
// 4. Write output
// ---------------------------------------------------------------------------
fs.writeFileSync(OUT_PATH, JSON.stringify(pages));
const sizeMB = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(2);
console.log(`Wrote ${OUT_PATH} (${sizeMB} MB)`);
