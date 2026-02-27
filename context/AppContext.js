import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getKhatmCount } from '../utils/treeLogic';

const STORAGE_KEY = '@sidr_state_v4';

const initialState = {
  totalPages: 0,
  totalMinutes: 0,
  todayMinutes: 0,
  todayDate: new Date().toDateString(),
  dayStreak: 0,
  lastReadDate: null,
  khatms: 0,
  khatmPage: 1,

  // Memorization: { [surahId]: { versesMemorized: [verseNum, ...], lastReviewDate, status } }
  // status: 'active' | 'complete' | 'decayed'
  memo: {},
};

function ensureToday(state) {
  const today = new Date().toDateString();
  if (state.todayDate === today) return state;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const keptStreak = state.lastReadDate === yesterday.toDateString();

  // Check memo decay on day change
  const memo = checkMemoDecay({ ...state.memo }, today);

  return {
    ...state,
    todayDate: today,
    todayMinutes: 0,
    dayStreak: keptStreak ? state.dayStreak : 0,
    memo,
  };
}

// Decay: if a completed surah hasn't been reviewed in 7 days, it decays
const DECAY_DAYS = 7;

function checkMemoDecay(memo, todayStr) {
  const today = new Date(todayStr);
  for (const surahId of Object.keys(memo)) {
    const entry = memo[surahId];
    if (!entry || !entry.lastReviewDate) continue;
    const lastReview = new Date(entry.lastReviewDate);
    const daysSince = Math.floor((today - lastReview) / (1000 * 60 * 60 * 24));
    if (entry.status === 'complete' && daysSince > DECAY_DAYS) {
      memo[surahId] = { ...entry, status: 'decayed' };
    }
  }
  return memo;
}

function appReducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return ensureToday({ ...initialState, ...action.payload, _loaded: true });

    case 'ADD_PAGE': {
      const s = ensureToday(state);
      const newTotal = s.totalPages + 1;
      return {
        ...s,
        totalPages: newTotal,
        khatms: getKhatmCount(newTotal),
        lastReadDate: s.todayDate,
        dayStreak: s.dayStreak === 0 ? 1 : s.dayStreak,
      };
    }

    case 'ADD_MINUTES': {
      const s = ensureToday(state);
      const mins = action.payload;
      return {
        ...s,
        totalMinutes: s.totalMinutes + mins,
        todayMinutes: s.todayMinutes + mins,
        lastReadDate: s.todayDate,
        dayStreak: s.dayStreak === 0 ? 1 : s.dayStreak,
      };
    }

    case 'SET_KHATM_PAGE':
      return { ...state, khatmPage: action.payload };

    // Start memorizing a surah
    case 'MEMO_START': {
      const surahId = action.payload;
      const memo = { ...state.memo };
      if (!memo[surahId]) {
        memo[surahId] = {
          versesMemorized: [],
          lastReviewDate: new Date().toDateString(),
          status: 'active',
        };
      } else if (memo[surahId].status === 'decayed') {
        // Restart after decay
        memo[surahId] = {
          versesMemorized: [],
          lastReviewDate: new Date().toDateString(),
          status: 'active',
        };
      }
      return { ...state, memo };
    }

    // Mark a verse as memorized
    case 'MEMO_VERSE': {
      const { surahId, verseNum, totalVerses } = action.payload;
      const memo = { ...state.memo };
      const entry = memo[surahId];
      if (!entry) return state;

      const verses = [...entry.versesMemorized];
      if (!verses.includes(verseNum)) {
        verses.push(verseNum);
        verses.sort((a, b) => a - b);
      }

      const isComplete = verses.length >= totalVerses;
      memo[surahId] = {
        ...entry,
        versesMemorized: verses,
        lastReviewDate: new Date().toDateString(),
        status: isComplete ? 'complete' : 'active',
      };
      return { ...state, memo };
    }

    // Unmark a verse
    case 'MEMO_UNVERSE': {
      const { surahId, verseNum } = action.payload;
      const memo = { ...state.memo };
      const entry = memo[surahId];
      if (!entry) return state;

      const verses = entry.versesMemorized.filter(v => v !== verseNum);
      memo[surahId] = {
        ...entry,
        versesMemorized: verses,
        lastReviewDate: new Date().toDateString(),
        status: 'active', // un-complete if removing
      };
      return { ...state, memo };
    }

    // Review a surah (resets decay timer)
    case 'MEMO_REVIEW': {
      const surahId = action.payload;
      const memo = { ...state.memo };
      const entry = memo[surahId];
      if (!entry) return state;

      memo[surahId] = {
        ...entry,
        lastReviewDate: new Date().toDateString(),
        // Restore from decayed if reviewing
        status: entry.status === 'decayed' ? 'active' : entry.status,
      };
      return { ...state, memo };
    }

    // Remove surah from memo
    case 'MEMO_REMOVE': {
      const surahId = action.payload;
      const memo = { ...state.memo };
      delete memo[surahId];
      return { ...state, memo };
    }

    case 'RESET':
      return { ...initialState, _loaded: true };

    default:
      return state;
  }
}

const PERSISTED_KEYS = [...Object.keys(initialState)];
function toStorable(state) {
  const out = {};
  for (const key of PERSISTED_KEYS) {
    out[key] = state[key];
  }
  return out;
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, { ...initialState, _loaded: false });

  useEffect(() => {
    (async () => {
      try {
        // Clean up old storage keys
        await AsyncStorage.multiRemove([
          '@sidr_app_state', '@sidr_state_v2', '@sidr_state_v3',
        ]).catch(() => {});

        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          console.log('[Sidr] Loaded state');
          dispatch({ type: 'LOAD_STATE', payload: JSON.parse(raw) });
        } else {
          console.log('[Sidr] Fresh start');
          dispatch({ type: 'LOAD_STATE', payload: {} });
        }
      } catch (err) {
        console.error('[Sidr] Load error:', err);
        dispatch({ type: 'LOAD_STATE', payload: {} });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state._loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStorable(state)))
      .catch((err) => console.error('[Sidr] Save error:', err));
  }, [state]);

  const addPage = useCallback(() => {
    dispatch({ type: 'ADD_PAGE' });
  }, []);

  const addMinutes = useCallback((mins) => {
    if (mins > 0) dispatch({ type: 'ADD_MINUTES', payload: mins });
  }, []);

  const setKhatmPage = useCallback((page) => {
    dispatch({ type: 'SET_KHATM_PAGE', payload: page });
  }, []);

  const memoStart = useCallback((surahId) => {
    dispatch({ type: 'MEMO_START', payload: surahId });
  }, []);

  const memoVerse = useCallback((surahId, verseNum, totalVerses) => {
    dispatch({ type: 'MEMO_VERSE', payload: { surahId, verseNum, totalVerses } });
  }, []);

  const memoUnverse = useCallback((surahId, verseNum) => {
    dispatch({ type: 'MEMO_UNVERSE', payload: { surahId, verseNum } });
  }, []);

  const memoReview = useCallback((surahId) => {
    dispatch({ type: 'MEMO_REVIEW', payload: surahId });
  }, []);

  const memoRemove = useCallback((surahId) => {
    dispatch({ type: 'MEMO_REMOVE', payload: surahId });
  }, []);

  const resetProgress = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <AppContext.Provider value={{
      state, addPage, addMinutes, setKhatmPage, resetProgress,
      memoStart, memoVerse, memoUnverse, memoReview, memoRemove,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return ctx;
}
