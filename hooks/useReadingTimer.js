import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';

/**
 * Passively tracks time while the screen is focused.
 * Saves accumulated minutes to context every 60 seconds
 * and on blur/unmount.
 */
export function useReadingTimer() {
  const isFocused = useIsFocused();
  const { addMinutes } = useAppContext();
  const startRef = useRef(null);
  const savedRef = useRef(0); // seconds already saved this focus session

  useEffect(() => {
    if (isFocused) {
      startRef.current = Date.now();
      savedRef.current = 0;

      // Save a minute every 60s while focused
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
        const newMinutes = Math.floor(elapsed / 60) - savedRef.current;
        if (newMinutes > 0) {
          addMinutes(newMinutes);
          savedRef.current += newMinutes;
        }
      }, 60000);

      return () => {
        clearInterval(interval);
        // Save remaining time on blur
        if (startRef.current) {
          const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
          const totalMins = Math.floor(elapsed / 60);
          const unsaved = totalMins - savedRef.current;
          if (unsaved > 0) {
            addMinutes(unsaved);
          }
        }
        startRef.current = null;
      };
    }
  }, [isFocused, addMinutes]);
}
