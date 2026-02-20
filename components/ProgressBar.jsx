import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * ProgressBar renders a labeled horizontal progress bar.
 *
 * Props:
 *  - label    {string}  – Label shown above the bar
 *  - value    {number}  – Current value
 *  - max      {number}  – Maximum value (100% point)
 *  - unit     {string}  – Unit string appended to value/max display
 *  - color    {string}  – Fill color (default: '#1a5c38')
 */
export default function ProgressBar({ label, value, max, unit = '', color = '#1a5c38' }) {
  const clampedProgress = max > 0 ? Math.min(value / max, 1) : 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.valueText}>
          {value}
          {unit} / {max}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.round(clampedProgress * 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  valueText: {
    fontSize: 12,
    color: '#666',
  },
  track: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
