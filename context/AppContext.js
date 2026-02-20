import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getKhatmCount } from '../utils/treeLogic';

const STORAGE_KEY = '@sidr_app_state';

const initialState = {
  totalPages: 0,
  totalMinutes: 0,
  todayMinutes: 0,
  todayDate: new Date().toDateString(),
  dayStreak: 0,
  lastReadDate: null,
  khatms: 0,
  sessions: [],
  isLoading: true,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...action.payload, isLoading: false };

    case 'END_SESSION': {
      const { pages, minutes } = action.payload;
      const today = new Date().toDateString();
      const newTotalPages = state.totalPages + pages;
      const newTotalMinutes = state.totalMinutes + minutes;
      const newKhatms = getKhatmCount(newTotalPages);

      let newStreak = state.dayStreak;
      let newTodayMinutes = state.todayMinutes;

      if (state.todayDate !== today) {
        newTodayMinutes = minutes;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (state.lastReadDate === yesterday.toDateString()) {
          newStreak = state.dayStreak + 1;
        } else {
          newStreak = 1;
        }
      } else {
        newTodayMinutes = state.todayMinutes + minutes;
      }

      const session = {
        id: Date.now(),
        date: today,
        pages,
        minutes,
      };

      return {
        ...state,
        totalPages: newTotalPages,
        totalMinutes: newTotalMinutes,
        todayMinutes: newTodayMinutes,
        todayDate: today,
        lastReadDate: today,
        dayStreak: newStreak,
        khatms: newKhatms,
        sessions: [session, ...state.sessions].slice(0, 100),
      };
    }

    case 'RESET':
      return { ...initialState, isLoading: false };

    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          dispatch({ type: 'LOAD_STATE', payload: JSON.parse(raw) });
        } else {
          dispatch({ type: 'LOAD_STATE', payload: { ...initialState } });
        }
      })
      .catch(() => {
        dispatch({ type: 'LOAD_STATE', payload: { ...initialState } });
      });
  }, []);

  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }
  }, [state]);

  function endSession(pages, minutes) {
    dispatch({ type: 'END_SESSION', payload: { pages, minutes } });
  }

  function resetProgress() {
    dispatch({ type: 'RESET' });
  }

  return (
    <AppContext.Provider value={{ state, endSession, resetProgress }}>
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
