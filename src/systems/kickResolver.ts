import { BALANCE } from '../config/balance';
import type { Rng } from './rng';
import type { Outcome } from './shootout';

export type Column = 0 | 1 | 2; // L, C, R
export type Row = 0 | 1; // high, low

export interface KickInput {
  /** Continuous horizontal aim, 0..1 across the goal mouth. */
  aimX: number;
  /** Continuous vertical aim, 0..1 top-to-bottom of the goal mouth. */
  aimY: number;
  /** Locked power, 0..100. */
  power: number;
  /** Column the keeper committed to. */
  keeperColumn: Column;
  /** Save-roll penalty for high CPU difficulties (0 for humans). */
  keeperSavePenalty?: number;
}

export interface KickResult {
  outcome: Outcome;
  column: Column;
  row: Row;
  /** Where the ball actually ends up (0..1 goal-mouth space; may exceed for misses). */
  ballX: number;
  ballY: number;
  keeperColumn: Column;
}

export function columnOf(aimX: number): Column {
  return Math.min(2, Math.floor(aimX * BALANCE.aim.columns)) as Column;
}

export function rowOf(aimY: number): Row {
  return Math.min(1, Math.floor(aimY * BALANCE.aim.rows)) as Row;
}

/**
 * Pure kick resolution. All probabilities from balance.ts. Order of checks:
 * overpower miss → post → save roll → goal.
 */
export function resolveKick(input: KickInput, rng: Rng): KickResult {
  const R = BALANCE.resolve;
  const P = BALANCE.power;
  const column = columnOf(input.aimX);
  const row = rowOf(input.aimY);

  const base: Omit<KickResult, 'outcome' | 'ballX' | 'ballY'> = {
    column,
    row,
    keeperColumn: input.keeperColumn
  };

  // 1) Overpower: sailing it over / dragging it wide.
  if (input.power > P.sweetSpotMax) {
    const missChance = (input.power - P.sweetSpotMax) * P.overpowerMissPerPoint;
    if (rng.chance(missChance)) {
      const wide = input.aimX < 0.5 ? -0.18 : 1.18;
      const skied = rng.chance(0.5);
      return {
        ...base,
        outcome: 'miss',
        ballX: skied ? input.aimX : wide,
        ballY: skied ? -0.35 : input.aimY - 0.15
      };
    }
  }

  // 2) Post: extreme horizontal aim + very high power.
  const nearEdge = input.aimX < R.extremeAimEdgeFraction || input.aimX > 1 - R.extremeAimEdgeFraction;
  if (nearEdge && input.power >= R.postPowerThreshold && rng.chance(R.postChanceExtremeAim)) {
    return {
      ...base,
      outcome: 'post',
      ballX: input.aimX < 0.5 ? 0.005 : 0.995,
      ballY: input.aimY
    };
  }

  // 3) Save roll.
  let saveChance: number;
  if (input.keeperColumn === column) {
    saveChance = row === 1 ? R.saveIfCorrectColumnLow : R.saveIfCorrectColumnHigh;
    if (column === 1 && row === 1) saveChance += R.lowCenterExtraSave;
  } else {
    // Fluke trailing-leg save only plausible on low balls.
    saveChance = row === 1 ? R.saveIfWrongColumn : 0;
  }
  if (input.power < P.weakThreshold) saveChance += P.weakSaveBonus;
  saveChance -= input.keeperSavePenalty ?? 0;
  saveChance = Math.max(0, Math.min(0.98, saveChance));

  if (rng.chance(saveChance)) {
    return { ...base, outcome: 'save', ballX: input.aimX, ballY: input.aimY };
  }

  return { ...base, outcome: 'goal', ballX: input.aimX, ballY: input.aimY };
}
