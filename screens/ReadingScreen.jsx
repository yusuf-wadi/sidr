import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import ProgressBar from '../components/ProgressBar';

const QURAN_EXCERPT = [
  {
    surah: 'Al-Fatihah (The Opening)',
    number: 1,
    ayahs: [
      { number: 1, arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.' },
      { number: 2, arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', translation: '[All] praise is [due] to Allah, Lord of the worlds.' },
      { number: 3, arabic: 'الرَّحْمَٰنِ الرَّحِيمِ', translation: 'The Entirely Merciful, the Especially Merciful.' },
      { number: 4, arabic: 'مَالِكِ يَوْمِ الدِّينِ', translation: 'Sovereign of the Day of Recompense.' },
      { number: 5, arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', translation: 'It is You we worship and You we ask for help.' },
      { number: 6, arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', translation: 'Guide us to the straight path.' },
      { number: 7, arabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', translation: 'The path of those upon whom You have bestowed favor, not of those who have earned [Your] anger or of those who are astray.' },
    ],
  },
  {
    surah: 'Al-Ikhlas (Sincerity)',
    number: 112,
    ayahs: [
      { number: 1, arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ', translation: 'Say, "He is Allah, [who is] One."' },
      { number: 2, arabic: 'اللَّهُ الصَّمَدُ', translation: 'Allah, the Eternal Refuge.' },
      { number: 3, arabic: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', translation: 'He neither begets nor is born.' },
      { number: 4, arabic: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', translation: 'Nor is there to Him any equivalent.' },
    ],
  },
];

export default function ReadingScreen({ navigation }) {
  const { endSession } = useAppContext();
  const [isActive, setIsActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pagesInput, setPagesInput] = useState('1');
  const [selectedSurahIndex, setSelectedSurahIndex] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startSession() {
    setIsActive(true);
    setElapsed(0);
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }

  function pauseSession() {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function resumeSession() {
    setIsActive(true);
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }

  function endSessionHandler() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);

    const pages = Math.max(1, parseInt(pagesInput, 10) || 1);
    const minutes = Math.max(1, Math.round(elapsed / 60));

    Alert.alert(
      'Session Complete 🌿',
      `You read ${pages} page${pages > 1 ? 's' : ''} in ${minutes} minute${minutes > 1 ? 's' : ''}. Well done!`,
      [
        {
          text: 'Save & Go Home',
          onPress: () => {
            endSession(pages, minutes);
            setElapsed(0);
            setPagesInput('1');
            navigation.navigate('Home');
          },
        },
        {
          text: 'Save & Stay',
          onPress: () => {
            endSession(pages, minutes);
            setElapsed(0);
            setPagesInput('1');
          },
        },
      ],
    );
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const surah = QURAN_EXCERPT[selectedSurahIndex];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📖 Reading Session</Text>

      <View style={styles.surahSelector}>
        {QURAN_EXCERPT.map((s, i) => (
          <TouchableOpacity
            key={s.number}
            style={[styles.surahTab, i === selectedSurahIndex && styles.surahTabActive]}
            onPress={() => setSelectedSurahIndex(i)}
          >
            <Text style={[styles.surahTabText, i === selectedSurahIndex && styles.surahTabTextActive]}>
              {s.surah}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.verseCard}>
        <Text style={styles.surahName}>Surah {surah.surah}</Text>
        {surah.ayahs.map((ayah) => (
          <View key={ayah.number} style={styles.ayah}>
            <Text style={styles.ayahNumber}>{ayah.number}</Text>
            <Text style={styles.arabic}>{ayah.arabic}</Text>
            <Text style={styles.translation}>{ayah.translation}</Text>
          </View>
        ))}
      </View>

      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>Session Timer</Text>
        <Text style={styles.timer}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </Text>
        <ProgressBar label="Minutes read" value={minutes} max={60} unit=" min" />
      </View>

      <View style={styles.pagesRow}>
        <Text style={styles.pagesLabel}>Pages read this session:</Text>
        <TextInput
          style={styles.pagesInput}
          keyboardType="number-pad"
          value={pagesInput}
          onChangeText={setPagesInput}
          maxLength={4}
        />
      </View>

      <View style={styles.controls}>
        {!isActive && elapsed === 0 && (
          <TouchableOpacity style={styles.startButton} onPress={startSession}>
            <Text style={styles.startButtonText}>▶ Start Session</Text>
          </TouchableOpacity>
        )}
        {isActive && (
          <TouchableOpacity style={styles.pauseButton} onPress={pauseSession}>
            <Text style={styles.pauseButtonText}>⏸ Pause</Text>
          </TouchableOpacity>
        )}
        {!isActive && elapsed > 0 && (
          <TouchableOpacity style={styles.resumeButton} onPress={resumeSession}>
            <Text style={styles.resumeButtonText}>▶ Resume</Text>
          </TouchableOpacity>
        )}
        {elapsed > 0 && (
          <TouchableOpacity style={styles.endButton} onPress={endSessionHandler}>
            <Text style={styles.endButtonText}>✅ End Session</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f0faf4',
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a5c38',
    textAlign: 'center',
    marginBottom: 16,
  },
  surahSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  surahTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#d4edda',
  },
  surahTabActive: {
    backgroundColor: '#1a5c38',
  },
  surahTabText: {
    fontSize: 12,
    color: '#1a5c38',
    fontWeight: '600',
  },
  surahTabTextActive: {
    color: '#fff',
  },
  verseCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  surahName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a5c38',
    marginBottom: 12,
    textAlign: 'center',
  },
  ayah: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  ayahNumber: {
    fontSize: 11,
    color: '#aaa',
    marginBottom: 4,
  },
  arabic: {
    fontSize: 22,
    textAlign: 'right',
    color: '#1a1a1a',
    lineHeight: 38,
    fontWeight: '500',
  },
  translation: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  timerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  timerLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  timer: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1a5c38',
    fontVariant: ['tabular-nums'],
    marginBottom: 8,
  },
  pagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  pagesLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  pagesInput: {
    borderWidth: 1,
    borderColor: '#1a5c38',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 18,
    fontWeight: '700',
    color: '#1a5c38',
    width: 70,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  startButton: {
    backgroundColor: '#1a5c38',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pauseButton: {
    backgroundColor: '#f5a623',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resumeButton: {
    backgroundColor: '#1a5c38',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  resumeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  endButton: {
    backgroundColor: '#c0392b',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  endButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
