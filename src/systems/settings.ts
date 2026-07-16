import type { Difficulty } from '../config/balance';

export type SkinId = 'bw' | 'yn' | 'yr';
export type GameMode = 'cpu' | 'hotseat';

export interface PlayerConfig {
  name: string;
  skin: SkinId;
  isCpu: boolean;
}

export interface MatchSettings {
  mode: GameMode;
  difficulty: Difficulty;
  p1: PlayerConfig;
  p2: PlayerConfig;
}

export const SKIN_IDS: SkinId[] = ['bw', 'yn', 'yr'];

/** Accent colors used for UI chips and gray-box placeholders per skin. */
export const SKIN_COLORS: Record<SkinId, { primary: number; secondary: number }> = {
  bw: { primary: 0x111111, secondary: 0xffffff },
  yn: { primary: 0xffd400, secondary: 0x0a2472 },
  yr: { primary: 0xffd400, secondary: 0xd1131a }
};

const KEY = 'matchSettings';

export function setMatchSettings(game: Phaser.Game, s: MatchSettings): void {
  game.registry.set(KEY, s);
}

export function getMatchSettings(game: Phaser.Game): MatchSettings {
  const s = game.registry.get(KEY) as MatchSettings | undefined;
  if (s) return s;
  // Sensible default so MatchScene can boot standalone during development.
  return {
    mode: 'cpu',
    difficulty: 'normal',
    p1: { name: 'Oyuncu 1', skin: 'bw', isCpu: false },
    p2: { name: 'Bilgisayar', skin: 'yr', isCpu: true }
  };
}

// --- localStorage: settings + vs-CPU win streak ---

const LS_PREFIX = 'turuncu-krampon:';

export function saveStreak(n: number): void {
  try {
    localStorage.setItem(LS_PREFIX + 'streak', String(n));
  } catch {
    /* storage unavailable (private mode) — streaks just don't persist */
  }
}

export function loadStreak(): number {
  try {
    return Number(localStorage.getItem(LS_PREFIX + 'streak')) || 0;
  } catch {
    return 0;
  }
}

export function saveLastDifficulty(d: Difficulty): void {
  try {
    localStorage.setItem(LS_PREFIX + 'difficulty', d);
  } catch {
    /* ignore */
  }
}

export function loadLastDifficulty(): Difficulty {
  try {
    const d = localStorage.getItem(LS_PREFIX + 'difficulty');
    if (d === 'easy' || d === 'normal' || d === 'legend') return d;
  } catch {
    /* ignore */
  }
  return 'normal';
}
