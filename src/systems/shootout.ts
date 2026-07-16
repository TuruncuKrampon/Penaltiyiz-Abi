import { BALANCE } from '../config/balance';

export type Outcome = 'goal' | 'save' | 'miss' | 'post';
export type Side = 'A' | 'B';

/**
 * Pure penalty-shootout state engine. No Phaser, no rendering — fully
 * unit-testable. Implements real shootout rules:
 *  - best-of-N alternating kicks (A kicks odd kicks, B even),
 *  - mathematical early termination during regulation,
 *  - sudden-death pairs after a regulation tie.
 */
export class Shootout {
  readonly regulation = BALANCE.shootout.regulationKicksPerSide;
  readonly kicks: Record<Side, Outcome[]> = { A: [], B: [] };

  score(side: Side): number {
    return this.kicks[side].filter(o => o === 'goal').length;
  }

  taken(side: Side): number {
    return this.kicks[side].length;
  }

  totalKicksTaken(): number {
    return this.taken('A') + this.taken('B');
  }

  /** Whose turn it is to kick right now. */
  currentKicker(): Side {
    return this.totalKicksTaken() % 2 === 0 ? 'A' : 'B';
  }

  /** 1-based kick number for the side about to kick. */
  kickNumber(side: Side): number {
    return this.taken(side) + 1;
  }

  inSuddenDeath(): boolean {
    return this.taken('A') >= this.regulation && this.taken('B') >= this.regulation
      ? true
      : false;
  }

  recordKick(side: Side, outcome: Outcome): void {
    this.kicks[side].push(outcome);
  }

  /**
   * Returns the winning side if the shootout is mathematically decided,
   * otherwise null.
   */
  winner(): Side | null {
    const a = this.score('A');
    const b = this.score('B');
    const takenA = this.taken('A');
    const takenB = this.taken('B');

    const inRegulation = takenA < this.regulation || takenB < this.regulation;
    if (inRegulation) {
      const remainingA = this.regulation - takenA;
      const remainingB = this.regulation - takenB;
      if (a > b + remainingB) return 'A';
      if (b > a + remainingA) return 'B';
      if (takenA === this.regulation && takenB === this.regulation && a !== b) {
        return a > b ? 'A' : 'B';
      }
      return null;
    }

    // Sudden death: decide only after complete pairs.
    if (takenA === takenB && a !== b) {
      return a > b ? 'A' : 'B';
    }
    return null;
  }
}
