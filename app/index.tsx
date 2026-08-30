import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useColors } from '@/hooks/useColors';

type SoundDefinition = {
  id: string;
  name: string;
  category: string;
  icon: keyof typeof Feather.glyphMap;
  free: boolean;
  color: string;
  url: string;
  source?: number;
};

type SavedMix = {
  id: string;
  name: string;
  sounds: string[];
  createdAt: number;
};

const STORAGE_KEY = '@sleepwave/saved-mixes';
const ENTITLEMENT = 'premium_access';
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
const FAN_SOUND_SOURCE = require('../assets/audio/fan-whirr.wav') as number;

const SOUND_LIBRARY: SoundDefinition[] = [
  { id: 'rain', name: 'Rain', category: 'Nature', icon: 'cloud-rain', free: true, color: '#8491EA', url: 'https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3' },
  { id: 'ocean', name: 'Ocean Waves', category: 'Nature', icon: 'wind', free: true, color: '#63BFD2', url: 'https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3' },
  { id: 'white-noise', name: 'White Noise', category: 'Focus', icon: 'radio', free: true, color: '#A6ACC4', url: 'https://assets.mixkit.co/active_storage/sfx/2457/2457-preview.mp3' },
  { id: 'fan', name: 'Fan', category: 'Focus', icon: 'refresh-cw', free: true, color: '#A9B7C5', url: '', source: FAN_SOUND_SOURCE },
  { id: 'wind', name: 'Wind', category: 'Nature', icon: 'wind', free: true, color: '#89B9AD', url: 'https://assets.mixkit.co/active_storage/sfx/2460/2460-preview.mp3' },
  { id: 'forest', name: 'Forest', category: 'Premium', icon: 'sunrise', free: false, color: '#77B88A', url: 'https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3' },
  { id: 'fireplace', name: 'Fireplace', category: 'Premium', icon: 'thermometer', free: false, color: '#E89A6D', url: 'https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3' },
  { id: 'thunder', name: 'Thunder', category: 'Premium', icon: 'cloud-lightning', free: false, color: '#8C8DD5', url: 'https://assets.mixkit.co/active_storage/sfx/2457/2457-preview.mp3' },
  { id: 'crickets', name: 'Night Crickets', category: 'Premium', icon: 'moon', free: false, color: '#A5C47A', url: 'https://assets.mixkit.co/active_storage/sfx/2471/2471-preview.mp3' },
  { id: 'stream', name: 'Water Stream', category: 'Premium', icon: 'droplet', free: false, color: '#65B3D4', url: 'https://assets.mixkit.co/active_storage/sfx/2460/2460-preview.mp3' },
  { id: 'space', name: 'Deep Space', category: 'Premium', icon: 'zap', free: false, color: '#9F86D8', url: 'https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3' },
  { id: 'meditation', name: 'Meditation Tone', category: 'Premium', icon: 'circle', free: false, color: '#D0A4D9', url: 'https://assets.mixkit.co/active_storage/sfx/2515/2515-preview.mp3' },
  { id: 'piano', name: 'Soft Piano', category: 'Premium', icon: 'music', free: false, color: '#D99AB2', url: 'https://assets.mixkit.co/active_storage/sfx/2457/2457-preview.mp3' },
];

const TIME_PRESETS = [
  { label: '15 min', seconds: 15 * 60 },
  { label: '30 min', seconds: 30 * 60 },
  { label: '1 hour', seconds: 60 * 60 },
];

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function triggerHaptic() {
  if (Platform.OS !== 'web') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function WaveMark({ size = 34, color }: { size?: number; color: string }) {
  return (
    <View style={[styles.waveMark, { width: size, height: size, borderRadius: size / 2 }]}>
      <Feather name="moon" size={size * 0.44} color={color} />
      <View style={[styles.waveLine, { backgroundColor: color, width: size * 0.54 }]} />
    </View>
  );
}

function IconButton({
  icon,
  onPress,
  label,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  label: string;
  color: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      testID={`button-${label.toLowerCase().replaceAll(' ', '-')}`}
      onPress={() => {
        triggerHaptic();
        onPress();
      }}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Feather name={icon} size={20} color={color} />
    </Pressable>
  );
}

function SoundCard({
  sound,
  active,
  premium,
  onPress,
  colors,
}: {
  sound: SoundDefinition;
  active: boolean;
  premium: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const locked = !sound.free && !premium;
  return (
    <Pressable
      testID={`sound-${sound.id}`}
      accessibilityLabel={locked ? `Unlock ${sound.name}` : `${active ? 'Pause' : 'Play'} ${sound.name}`}
      onPress={() => {
        triggerHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.soundCard,
        { backgroundColor: active ? colors.accent : colors.card, borderColor: active ? sound.color : colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.soundIcon, { backgroundColor: `${sound.color}24` }]}>
        <Feather name={locked ? 'lock' : sound.icon} size={19} color={sound.color} />
      </View>
      <View style={styles.soundCopy}>
        <Text style={[styles.soundName, { color: colors.foreground }]} numberOfLines={1}>
          {sound.name}
        </Text>
        <Text style={[styles.soundCategory, { color: colors.mutedForeground }]}>
          {locked ? 'Premium' : sound.category}
        </Text>
      </View>
      <View style={[styles.playButton, { backgroundColor: active ? sound.color : colors.secondary }]}>
        <Feather name={active ? 'pause' : locked ? 'lock' : 'play'} size={14} color={active ? colors.primaryForeground : colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeSounds, setActiveSounds] = useState<string[]>(['rain']);
  const [volumes, setVolumes] = useState<Record<string, number>>({ rain: 0.68 });
  const [timer, setTimer] = useState<number | null>(null);
  const [showTimer, setShowTimer] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [savedMixes, setSavedMixes] = useState<SavedMix[]>([]);
  const [premium, setPremium] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [revenueCatReady, setRevenueCatReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, Audio.Sound>>({});

  const activeDefinitions = useMemo(
    () => SOUND_LIBRARY.filter((sound) => activeSounds.includes(sound.id)),
    [activeSounds],
  );

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value) {
        setSavedMixes(JSON.parse(value) as SavedMix[]);
      }
    });
    void Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }, []);

  useEffect(() => {
    if (timer === null) return undefined;
    if (timer <= 0) {
      setTimer(null);
      setActiveSounds([]);
      return undefined;
    }
    const interval = setInterval(() => setTimer((current) => (current === null ? null : current - 1)), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (!REVENUECAT_IOS_KEY && !REVENUECAT_ANDROID_KEY) return undefined;
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    if (!apiKey) return undefined;
    let mounted = true;
    void (async () => {
      try {
        Purchases.configure({ apiKey });
        const customerInfo = await Purchases.getCustomerInfo();
        if (mounted) {
          setPremium(Boolean(customerInfo.entitlements.active[ENTITLEMENT]));
          setRevenueCatReady(true);
        }
        const currentOffering = await Purchases.getOfferings();
        if (mounted) setOfferings(currentOffering.current?.availablePackages ?? []);
      } catch {
        if (mounted) setRevenueCatReady(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      for (const sound of SOUND_LIBRARY) {
        if (!activeSounds.includes(sound.id)) {
          const loaded = audioRefs.current[sound.id];
          if (loaded) {
            await loaded.unloadAsync();
            delete audioRefs.current[sound.id];
          }
        }
      }
      for (const sound of activeDefinitions) {
        try {
          let player = audioRefs.current[sound.id];
          if (!player) {
            const result = await Audio.Sound.createAsync(
              sound.source ?? { uri: sound.url },
              { isLooping: true, shouldPlay: true, volume: volumes[sound.id] ?? 0.6 },
            );
            player = result.sound;
            audioRefs.current[sound.id] = player;
          } else {
            await player.setVolumeAsync(volumes[sound.id] ?? 0.6);
            await player.playAsync();
          }
        } catch {
          setAudioError('A sound could not be loaded. Check your connection and try again.');
        }
      }
    })();
  }, [activeDefinitions, activeSounds, volumes]);

  useEffect(() => {
    return () => {
      void Promise.all(Object.values(audioRefs.current).map((sound) => sound.unloadAsync()));
    };
  }, []);

  const toggleSound = useCallback(
    (sound: SoundDefinition) => {
      if (!sound.free && !premium) {
        setShowPaywall(true);
        return;
      }
      setAudioError(null);
      setActiveSounds((current) =>
        current.includes(sound.id) ? current.filter((id) => id !== sound.id) : [...current, sound.id],
      );
      setVolumes((current) => ({ ...current, [sound.id]: current[sound.id] ?? 0.6 }));
    },
    [premium],
  );

  const updateVolume = async (id: string, value: number) => {
    setVolumes((current) => ({ ...current, [id]: value }));
    const player = audioRefs.current[id];
    if (player) await player.setVolumeAsync(value);
  };

  const saveCurrentMix = async () => {
    const isExisting = savedMixes.some((mix) => mix.sounds.join(',') === activeSounds.join(','));
    if (!premium && savedMixes.length >= 1 && !isExisting) {
      setShowPaywall(true);
      return;
    }
    if (activeSounds.length === 0) {
      Alert.alert('Nothing playing', 'Start at least one sound before saving a mix.');
      return;
    }
    const mix: SavedMix = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: activeDefinitions.map((sound) => sound.name).join(' + '),
      sounds: activeSounds,
      createdAt: Date.now(),
    };
    const next = [mix, ...savedMixes.filter((item) => item.sounds.join(',') !== activeSounds.join(','))];
    setSavedMixes(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    triggerHaptic();
  };

  const restoreMix = (mix: SavedMix) => {
    setActiveSounds(mix.sounds);
    setShowSaved(false);
  };

  const purchasePackage = async (pkg: PurchasesPackage) => {
    setPurchaseLoading(true);
    try {
      const result = await Purchases.purchasePackage(pkg);
      setPremium(Boolean(result.customerInfo.entitlements.active[ENTITLEMENT]));
      setShowPaywall(false);
    } catch {
      Alert.alert('Purchase not completed', 'Your purchase was not completed. You can try again anytime.');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const restorePurchases = async () => {
    setPurchaseLoading(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      setPremium(Boolean(customerInfo.entitlements.active[ENTITLEMENT]));
      if (customerInfo.entitlements.active[ENTITLEMENT]) setShowPaywall(false);
    } catch {
      Alert.alert('Restore unavailable', 'We could not restore purchases right now. Please try again later.');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const freeDisplaySounds = SOUND_LIBRARY.filter((sound) => sound.free);
  const premiumDisplaySounds = SOUND_LIBRARY.filter((sound) => !sound.free);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 100 }]}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <WaveMark color={colors.primary} />
            <View>
              <Text style={[styles.brandName, { color: colors.foreground }]}>SleepWave</Text>
              <Text style={[styles.brandMeta, { color: colors.mutedForeground }]}>Your quiet place to land</Text>
            </View>
          </View>
          <Pressable
            testID="button-upgrade"
            onPress={() => {
              triggerHaptic();
              setShowPaywall(true);
            }}
            style={({ pressed }) => [styles.upgradeButton, { backgroundColor: colors.accent }, pressed && styles.pressed]}
          >
            <Feather name="star" size={14} color={colors.accentForeground} />
            <Text style={[styles.upgradeText, { color: colors.accentForeground }]}>
              {premium ? 'Premium' : 'Upgrade'}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>TONIGHT</Text>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>
              Let the day{'\n'}drift away.
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
              A gentle mix for slower breaths and softer thoughts.
            </Text>
          </View>
          <View style={styles.orbit}>
            <View style={[styles.orbitRing, { borderColor: colors.border }]} />
            <View style={[styles.orbitRingSmall, { borderColor: colors.accent }]} />
            <Feather name="moon" size={28} color={colors.primary} />
            <View style={[styles.star, styles.starOne, { backgroundColor: colors.primary }]} />
            <View style={[styles.star, styles.starTwo, { backgroundColor: colors.accent }]} />
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Soundscape</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Blend what feels good tonight</Text>
          </View>
          <View style={[styles.activePill, { backgroundColor: colors.secondary }]}>
            <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.activeText, { color: colors.secondaryForeground }]}>{activeSounds.length} playing</Text>
          </View>
        </View>

        <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>FREE SOUNDS</Text>
        <View style={styles.soundGrid}>
          {freeDisplaySounds.map((sound) => (
            <SoundCard
              key={sound.id}
              sound={sound}
              active={activeSounds.includes(sound.id)}
              premium={premium}
              onPress={() => toggleSound(sound)}
              colors={colors}
            />
          ))}
        </View>

        <View style={styles.premiumHeading}>
          <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>PREMIUM SOUNDS</Text>
          {!premium && (
            <Pressable onPress={() => setShowPaywall(true)} hitSlop={8}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Unlock all</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.soundGrid}>
          {premiumDisplaySounds.map((sound) => (
            <SoundCard
              key={sound.id}
              sound={sound}
              active={activeSounds.includes(sound.id)}
              premium={premium}
              onPress={() => toggleSound(sound)}
              colors={colors}
            />
          ))}
        </View>

        {activeDefinitions.length > 0 && (
          <View style={styles.mixerSection}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your mix</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Balance each layer</Text>
              </View>
              <IconButton icon="bookmark" label="Save mix" onPress={() => void saveCurrentMix()} color={colors.primary} />
            </View>
            <View style={[styles.mixerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {activeDefinitions.map((sound, index) => (
                <View key={sound.id} style={[styles.mixerRow, index < activeDefinitions.length - 1 && styles.mixerDivider]}>
                  <View style={[styles.mixerIcon, { backgroundColor: `${sound.color}24` }]}>
                    <Feather name={sound.icon} size={17} color={sound.color} />
                  </View>
                  <Text style={[styles.mixerName, { color: colors.foreground }]}>{sound.name}</Text>
                  <View style={styles.sliderTrack}>
                    <View style={[styles.sliderFill, { width: `${(volumes[sound.id] ?? 0.6) * 100}%`, backgroundColor: sound.color }]} />
                    <Pressable
                      accessibilityLabel={`Volume for ${sound.name}`}
                      testID={`slider-${sound.id}`}
                      onPress={(event) => {
                        const next = Math.max(0, Math.min(1, event.nativeEvent.locationX / 100));
                        void updateVolume(sound.id, next);
                      }}
                      style={styles.sliderTouchArea}
                    />
                  </View>
                  <Text style={[styles.volumeText, { color: colors.mutedForeground }]}>
                    {Math.round((volumes[sound.id] ?? 0.6) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomControls}>
          <Pressable
            testID="button-timer"
            onPress={() => {
              triggerHaptic();
              setShowTimer(true);
            }}
            style={({ pressed }) => [styles.controlCard, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <View style={[styles.controlIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="clock" size={18} color={colors.primary} />
            </View>
            <View style={styles.controlCopy}>
              <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>SLEEP TIMER</Text>
              <Text style={[styles.controlValue, { color: colors.foreground }]}>
                {timer === null ? 'Off' : formatTime(timer)}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            testID="button-saved-mixes"
            onPress={() => {
              triggerHaptic();
              setShowSaved(true);
            }}
            style={({ pressed }) => [styles.controlCard, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <View style={[styles.controlIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="bookmark" size={18} color={colors.primary} />
            </View>
            <View style={styles.controlCopy}>
              <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>SAVED MIXES</Text>
              <Text style={[styles.controlValue, { color: colors.foreground }]}>{savedMixes.length || 'None yet'}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
        {audioError && (
          <Pressable onPress={() => setAudioError(null)} style={[styles.errorBanner, { backgroundColor: colors.accent }]}>
            <Feather name="wifi-off" size={16} color={colors.accentForeground} />
            <Text style={[styles.errorText, { color: colors.accentForeground }]}>{audioError}</Text>
            <Feather name="x" size={15} color={colors.accentForeground} />
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={showTimer} transparent animationType="slide" onRequestClose={() => setShowTimer(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Sleep timer</Text>
            <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>All sounds fade out when time is up.</Text>
            <View style={styles.timerOptions}>
              {TIME_PRESETS.map((preset) => (
                <Pressable
                  key={preset.label}
                  testID={`timer-${preset.label}`}
                  onPress={() => {
                    triggerHaptic();
                    setTimer(preset.seconds);
                    setShowTimer(false);
                  }}
                  style={({ pressed }) => [styles.timerOption, { backgroundColor: timer === preset.seconds ? colors.accent : colors.secondary }, pressed && styles.pressed]}
                >
                  <Feather name="clock" size={17} color={timer === preset.seconds ? colors.accentForeground : colors.mutedForeground} />
                  <Text style={[styles.timerOptionText, { color: timer === preset.seconds ? colors.accentForeground : colors.secondaryForeground }]}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>
            {timer !== null && (
              <Pressable
                onPress={() => {
                  setTimer(null);
                  setShowTimer(false);
                }}
                style={[styles.clearButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.clearButtonText, { color: colors.mutedForeground }]}>Turn timer off</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setShowTimer(false)} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showSaved} transparent animationType="slide" onRequestClose={() => setShowSaved(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Saved mixes</Text>
            <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>Keep the combinations you come back to.</Text>
            {savedMixes.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="bookmark" size={28} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No mixes saved yet</Text>
                <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>Tap the bookmark beside “Your mix” to save your first one.</Text>
              </View>
            ) : (
              <FlatList
                data={savedMixes}
                keyExtractor={(item) => item.id}
                scrollEnabled={savedMixes.length > 3}
                style={styles.savedList}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => restoreMix(item)}
                    style={({ pressed }) => [styles.savedRow, { backgroundColor: colors.secondary }, pressed && styles.pressed]}
                  >
                    <View style={[styles.controlIcon, { backgroundColor: colors.accent }]}>
                      <Feather name="music" size={17} color={colors.accentForeground} />
                    </View>
                    <View style={styles.savedCopy}>
                      <Text style={[styles.savedTitle, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.savedMeta, { color: colors.mutedForeground }]}>{item.sounds.length} layers</Text>
                    </View>
                    <Feather name="play" size={16} color={colors.primary} />
                  </Pressable>
                )}
              />
            )}
            <Pressable onPress={() => setShowSaved(false)} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.primary }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showPaywall} transparent animationType="slide" onRequestClose={() => setShowPaywall(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.paywall, { backgroundColor: colors.card }]}>
            <Pressable onPress={() => setShowPaywall(false)} style={styles.paywallClose} hitSlop={8}>
              <Feather name="x" size={21} color={colors.mutedForeground} />
            </Pressable>
            <View style={[styles.paywallIcon, { backgroundColor: colors.accent }]}>
              <WaveMark size={54} color={colors.accentForeground} />
            </View>
            <Text style={[styles.paywallTitle, { color: colors.foreground }]}>Sleep better tonight.</Text>
            <Text style={[styles.paywallSubtitle, { color: colors.mutedForeground }]}>
              Give your nights more room to breathe with every SleepWave soundscape.
            </Text>
            <View style={styles.benefitList}>
              {['Unlock every sound', 'Save unlimited mixes', 'A more peaceful experience'].map((benefit) => (
                <View key={benefit} style={styles.benefitRow}>
                  <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
                    <Feather name="check" size={13} color={colors.accentForeground} />
                  </View>
                  <Text style={[styles.benefitText, { color: colors.foreground }]}>{benefit}</Text>
                </View>
              ))}
            </View>
            {offerings.length > 0 ? (
              <View style={styles.packageList}>
                {offerings.map((pkg) => (
                  <Pressable
                    key={pkg.identifier}
                    onPress={() => void purchasePackage(pkg)}
                    disabled={purchaseLoading}
                    style={({ pressed }) => [styles.packageButton, { backgroundColor: pkg.packageType === 'MONTHLY' ? colors.primary : colors.secondary }, pressed && styles.pressed]}
                  >
                    <View>
                      <Text style={[styles.packageTitle, { color: pkg.packageType === 'MONTHLY' ? colors.primaryForeground : colors.secondaryForeground }]}>{pkg.product.title}</Text>
                      <Text style={[styles.packageDescription, { color: pkg.packageType === 'MONTHLY' ? colors.primaryForeground : colors.mutedForeground }]}>{pkg.product.description}</Text>
                    </View>
                    <Text style={[styles.packagePrice, { color: pkg.packageType === 'MONTHLY' ? colors.primaryForeground : colors.secondaryForeground }]}>{pkg.product.priceString}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Pressable
                testID="button-start-premium"
                onPress={() => {
                  if (revenueCatReady) {
                    Alert.alert('Offers are loading', 'Your subscription options are still loading. Please try again in a moment.');
                  } else {
                    Alert.alert('RevenueCat setup needed', 'Connect your RevenueCat public app key and offerings to enable purchases in this build.');
                  }
                }}
                style={({ pressed }) => [styles.primaryCta, { backgroundColor: colors.primary }, pressed && styles.pressed]}
              >
                <Text style={[styles.primaryCtaText, { color: colors.primaryForeground }]}>Start Premium</Text>
                <Feather name="arrow-up-right" size={17} color={colors.primaryForeground} />
              </Pressable>
            )}
            <Pressable onPress={() => void restorePurchases()} disabled={purchaseLoading} style={styles.restoreButton}>
              {purchaseLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.restoreText, { color: colors.primary }]}>Restore purchases</Text>}
            </Pressable>
            {!revenueCatReady && (
              <Text style={[styles.previewNote, { color: colors.mutedForeground }]}>Preview mode · connect your store products before launch</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  waveMark: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B2140', overflow: 'hidden' },
  waveLine: { height: 2, borderRadius: 2, position: 'absolute', bottom: 10, transform: [{ rotate: '-12deg' }] },
  brandName: { fontSize: 19, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  brandMeta: { marginTop: 2, fontSize: 11, fontFamily: 'Inter_400Regular' },
  upgradeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18 },
  upgradeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  hero: { minHeight: 194, borderRadius: 25, borderWidth: 1, padding: 22, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  heroCopy: { flex: 1, zIndex: 1 },
  eyebrow: { fontSize: 10, letterSpacing: 1.8, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  heroTitle: { fontSize: 31, lineHeight: 36, letterSpacing: -1.2, fontFamily: 'Inter_700Bold' },
  heroSubtitle: { maxWidth: 195, fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', marginTop: 12 },
  orbit: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center', marginRight: -30 },
  orbitRing: { position: 'absolute', width: 120, height: 120, borderWidth: 1, borderRadius: 60 },
  orbitRingSmall: { position: 'absolute', width: 82, height: 82, borderWidth: 1, borderRadius: 41 },
  star: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  starOne: { top: 17, right: 17 },
  starTwo: { bottom: 22, left: 12, width: 3, height: 3 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 17 },
  sectionTitle: { fontSize: 19, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },
  sectionSubtitle: { marginTop: 4, fontSize: 12, fontFamily: 'Inter_400Regular' },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 13 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  groupLabel: { fontSize: 10, letterSpacing: 1.6, fontFamily: 'Inter_700Bold', marginBottom: 11 },
  soundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  soundCard: { width: '48.4%', minHeight: 91, borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  soundIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  soundCopy: { flex: 1, minWidth: 0 },
  soundName: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  soundCategory: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 4 },
  playButton: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  premiumHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26 },
  seeAll: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginBottom: 11 },
  mixerSection: { marginTop: 8 },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#191F35' },
  mixerCard: { borderWidth: 1, borderRadius: 19, paddingHorizontal: 14 },
  mixerRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 9 },
  mixerDivider: { borderBottomWidth: 1, borderBottomColor: '#252D46' },
  mixerIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mixerName: { width: 80, fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  sliderTrack: { flex: 1, height: 4, borderRadius: 4, backgroundColor: '#252D46', overflow: 'visible', justifyContent: 'center' },
  sliderFill: { height: 4, borderRadius: 4 },
  sliderTouchArea: { position: 'absolute', left: 0, right: 0, top: -15, height: 34 },
  volumeText: { width: 34, textAlign: 'right', fontSize: 10, fontFamily: 'Inter_500Medium' },
  bottomControls: { flexDirection: 'row', gap: 10, marginTop: 25 },
  controlCard: { flex: 1, minHeight: 75, borderRadius: 18, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  controlIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  controlCopy: { flex: 1 },
  controlLabel: { fontSize: 9, letterSpacing: 1.2, fontFamily: 'Inter_700Bold' },
  controlValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 5 },
  errorBanner: { marginTop: 14, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { flex: 1, fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3, 5, 12, 0.72)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 21, paddingTop: 12, paddingBottom: 30 },
  sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 4, backgroundColor: '#5B627B', marginBottom: 22 },
  sheetTitle: { fontSize: 23, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  sheetSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 6, marginBottom: 22 },
  timerOptions: { flexDirection: 'row', gap: 9 },
  timerOption: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 78, borderRadius: 17, gap: 8 },
  timerOptionText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  clearButton: { borderWidth: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  clearButtonText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  closeButton: { alignItems: 'center', justifyContent: 'center', paddingTop: 18, minHeight: 42 },
  closeButtonText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  savedList: { maxHeight: 250 },
  savedRow: { minHeight: 62, borderRadius: 15, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  savedCopy: { flex: 1 },
  savedTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  savedMeta: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 25 },
  emptyTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginTop: 12 },
  emptyCopy: { textAlign: 'center', fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', marginTop: 7 },
  paywall: { borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 28, paddingBottom: 32, alignItems: 'center' },
  paywallClose: { position: 'absolute', top: 18, right: 20, zIndex: 2, padding: 5 },
  paywallIcon: { width: 72, height: 72, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  paywallTitle: { textAlign: 'center', fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.8 },
  paywallSubtitle: { maxWidth: 310, textAlign: 'center', fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular', marginTop: 9 },
  benefitList: { alignSelf: 'stretch', gap: 12, marginTop: 22, marginBottom: 20 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  benefitText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  packageList: { alignSelf: 'stretch', gap: 9 },
  packageButton: { minHeight: 64, borderRadius: 17, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packageTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  packageDescription: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 4 },
  packagePrice: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  primaryCta: { width: '100%', minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryCtaText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  restoreButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  restoreText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  previewNote: { fontSize: 9, fontFamily: 'Inter_400Regular', marginTop: 8 },
});