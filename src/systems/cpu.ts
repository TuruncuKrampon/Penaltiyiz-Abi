import { BALANCE } from '../config/balance';
import type { Difficulty } from '../config/balance';
import type { Rng } from './rng';
import type { Column } from './kickResolver';

/**
 * CPU keeper: weighted random column, plus a difficulty-based chance to
 * "read" the shooter's actually-locked column.
 */
export function cpuKeeperColumn(shooterColumn: Column, difficulty: Difficulty, rng: Rng): Column {
  const C = BALANCE.cpuKeeper;
  if (rng.chance(C.readChance[difficulty])) {
    return shooterColumn;
  }
  return rng.weighted(C.blindWeights) as Column;
}

export function cpuKeeperSavePenalty(difficulty: Difficulty): number {
  return BALANCE.cpuKeeper.saveRollPenalty[difficulty];
}

export interface CpuShotPlan {
  aimX: number;
  aimY: number;
  power: number;
}

/**
 * CPU shooter: usually corners, power mostly in the sweet spot, with a
 * difficulty-scaled chance of a perfect strike.
 */
export function cpuShotPlan(difficulty: Difficulty, rng: Rng): CpuShotPlan {
  const S = BALANCE.cpuShooter;
  const P = BALANCE.power;

  let aimX: number;
  if (rng.chance(S.cornerAimChance)) {
    aimX = rng.chance(0.5) ? rng.range(0.06, 0.28) : rng.range(0.72, 0.94);
  } else {
    aimX = rng.range(0.35, 0.65);
  }
  const aimY = rng.chance(0.5) ? rng.range(0.1, 0.4) : rng.range(0.6, 0.92);

  let power: number;
  if (rng.chance(S.perfectPowerChance[difficulty])) {
    power = rng.range(P.sweetSpotMin, P.sweetSpotMax);
  } else {
    // Imperfect: sometimes weak, sometimes hot-headed overpower.
    power = rng.chance(0.5) ? rng.range(P.weakThreshold - 10, P.sweetSpotMin) : rng.range(P.sweetSpotMax, 100);
  }

  return { aimX, aimY, power };
}
