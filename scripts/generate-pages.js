/**
 * Generate pages.json from the QPC V1 SQLite database.
 *
 * Reads data/qpc-v1-15-lines.db (page/line/word-id mapping) and
 * data/quran.json (verse texts with word counts) to produce a compact
 * data/pages.json that maps each Quran page (1-604) to its verses and
 * surah starts.
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

// ---------------------------------------------------------------------------
// 1. Build a word-id → verse lookup from quran.json
// ---------------------------------------------------------------------------
const quranData = JSON.parse(fs.readFileSync(QURAN_PATH, 'utf8'));

// wordId is a 1-based running counter across the entire Quran.
// Each verse occupies (number-of-space-separated-tokens + 1) word IDs,
// where the +1 accounts for the verse-end marker glyph.
const wordToVerse = []; // wordToVerse[wordId] = { surah, verse }
let nextWordId = 1;

for (const surah of quranData) {
  for (const verse of surah.verses) {
    const wordCount = verse.text.split(/\s+/).length + 1; // +1 end marker
    for (let w = 0; w < wordCount; w++) {
      wordToVerse[nextWordId + w] = { surah: surah.id, verse: verse.id };
    }
    nextWordId += wordCount;
  }
}

console.log(`Total word IDs mapped: ${nextWordId - 1}`);

// ---------------------------------------------------------------------------
// 2. Read the pages table from the database
// ---------------------------------------------------------------------------
const db = new Database(DB_PATH, { readonly: true });
const rows = db.prepare('SELECT * FROM pages ORDER BY page_number, line_number').all();
db.close();

// ---------------------------------------------------------------------------
// 3. Build pages array
// ---------------------------------------------------------------------------
// pages[0] is unused (pages are 1-indexed).
// Each entry: { verses: [[surah, verse], ...], surahStarts: [surahNum, ...] }
const pages = [null]; // index 0 placeholder

let currentPage = null;
let currentVerses = [];       // Set-like via string keys
let currentSurahStarts = [];
let verseSeen = new Set();

function flushPage() {
  if (currentPage !== null) {
    // Deduplicate and sort verses by surah then verse number
    const verseList = Array.from(verseSeen).map(k => k.split(':').map(Number));
    verseList.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    pages.push({
      verses: verseList,
      surahStarts: currentSurahStarts,
    });
  }
}

for (const row of rows) {
  if (row.page_number !== currentPage) {
    flushPage();
    currentPage = row.page_number;
    verseSeen = new Set();
    currentSurahStarts = [];
  }

  // Track surah starts
  if (row.line_type === 'surah_name' && row.surah_number) {
    currentSurahStarts.push(row.surah_number);
  }

  // Map word IDs to verses
  if (row.first_word_id && row.last_word_id) {
    const first = Number(row.first_word_id);
    const last = Number(row.last_word_id);
    for (let wid = first; wid <= last; wid++) {
      const v = wordToVerse[wid];
      if (v) {
        verseSeen.add(`${v.surah}:${v.verse}`);
      }
    }
  }
}
flushPage(); // flush last page

console.log(`Generated ${pages.length - 1} pages`);

// Quick sanity checks
const p1 = pages[1];
console.log(`Page 1: ${p1.verses.length} verses, surahStarts: [${p1.surahStarts}]`);
const p2 = pages[2];
console.log(`Page 2: ${p2.verses.length} verses, surahStarts: [${p2.surahStarts}]`);
const p604 = pages[604];
console.log(`Page 604: ${p604.verses.length} verses, surahStarts: [${p604.surahStarts}]`);

// ---------------------------------------------------------------------------
// 4. Write output
// ---------------------------------------------------------------------------
fs.writeFileSync(OUT_PATH, JSON.stringify(pages));
console.log(`Wrote ${OUT_PATH}`);
