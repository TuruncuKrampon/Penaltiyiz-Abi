/**
 * EVERY gameplay tunable lives here. Scene code must never contain
 * magic numbers — if you want to tune the game, this is the only file
 * you should need to touch.
 */

export const BALANCE = {
  shootout: {
    regulationKicksPerSide: 5,
    /** Sudden-death pairs continue until decided. */
    suddenDeath: true
  },

  aim: {
    /** Full sweep period (one direction) of the X reticle, ms. */
    oscillationXMs: 900,
    /** Full sweep period of the Y reticle, ms. */
    oscillationYMs: 700,
    /** Goal mouth zone grid. */
    columns: 3,
    rows: 2
  },

  power: {
    /** Bar sweeps 0 -> 100 -> 0 over this many ms. */
    sweepMs: 1200,
    sweetSpotMin: 70,
    sweetSpotMax: 90,
    /** Above sweetSpotMax: each extra point adds this much miss chance. */
    overpowerMissPerPoint: 0.035,
    /** Below this, ball is slow and save chance is boosted. */
    weakThreshold: 40,
    weakSaveBonus: 0.25,
    /** Ball flight duration scales with power: ms at power 0 and 100. */
    flightMsSlow: 950,
    flightMsFast: 480
  },

  resolve: {
    /**
     * Base save probability when the keeper commits to the correct column,
     * by row: keepers are stronger on low balls.
     */
    saveIfCorrectColumnLow: 0.78,
    saveIfCorrectColumnHigh: 0.52,
    /** Keeper covering center column gets a bonus on low-center shots. */
    lowCenterExtraSave: 0.12,
    /** Wrong column: tiny chance of a trailing-leg fluke save on center row shots. */
    saveIfWrongColumn: 0.04,
    /** Chance the shot clips the post on extreme aim + very high power. */
    postChanceExtremeAim: 0.12,
    /** Power above this counts as "very high" for post logic. */
    postPowerThreshold: 92,
    /** How close to the horizontal edge (0..1 within zone) counts as extreme aim. */
    extremeAimEdgeFraction: 0.22
  },

  runup: {
    durationMs: 900,
    /** Keeper input is locked this many ms before ball contact. */
    keeperLockBeforeContactMs: 60
  },

  cpuKeeper: {
    /** Chance the CPU "reads" the shooter's locked column, per difficulty. */
    readChance: { easy: 0.15, normal: 0.35, legend: 0.55 } as Record<string, number>,
    /** Save-roll penalty applied at higher difficulties to keep it fair. */
    saveRollPenalty: { easy: 0, normal: 0.05, legend: 0.1 } as Record<string, number>,
    /** Column weights when guessing blind (L, C, R). */
    blindWeights: [0.4, 0.2, 0.4]
  },

  cpuShooter: {
    /** CPU aims into the sweet spot most of the time. */
    perfectPowerChance: { easy: 0.35, normal: 0.55, legend: 0.75 } as Record<string, number>,
    /** Chance CPU aims at a corner rather than center. */
    cornerAimChance: 0.75
  },

  characters: {
    /** Display heights in px at 1280x720; raw PNG size must not matter. */
    kickerHeight: 240,
    keeperHeight: 150,
    ballDiameter: 36,
    /** Ball scales down to this fraction across its flight. */
    ballFlightEndScale: 0.45,
    runCycleFps: 8
  },

  juice: {
    freezeFrameMs: 80,
    shakeMs: 120,
    shakeIntensity: 0.008,
    slowMoScale: 0.35,
    slowMoMs: 500,
    announcerPunchScale: 1.35,
    netRippleMs: 350,
    confettiCount: 120
  },

  celebrations: {
    /** Duration each toxic celebration plays, ms. */
    durationMs: 2200,
    /** Weights for the 6 toxic celebrations (equal by default). */
    weights: [1, 1, 1, 1, 1, 1],
    /** Extra hold time for the Beşiktaş speech bubble, ms. */
    besiktasBubbleMs: 1800
  },

  audio: {
    masterVolume: 0.8,
    crowdLoopVolume: 0.25,
    sfxVolume: 0.9
  }
} as const;

export type Difficulty = 'easy' | 'normal' | 'legend';
