import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config/theme';
import { BALANCE } from '../config/balance';
import { TR } from '../config/tr';
import { attachFpsOverlay, drawZoneGrid } from '../systems/debug';
import { getMatchSettings, loadStreak, saveStreak } from '../systems/settings';
import type { MatchSettings, PlayerConfig } from '../systems/settings';
import { Shootout } from '../systems/shootout';
import type { Side, Outcome } from '../systems/shootout';
import { resolveKick, columnOf } from '../systems/kickResolver';
import type { Column, KickResult } from '../systems/kickResolver';
import { cpuKeeperColumn, cpuKeeperSavePenalty, cpuShotPlan } from '../systems/cpu';
import { rng } from '../systems/rng';
import { Scoreboard } from '../ui/scoreboard';
import { charKey, ENV_KEYS, hasRealTexture } from '../systems/assets';

/** Goal mouth rect in world coordinates (shared by aim, keeper, debug grid). */
export const GOAL_RECT = { x: 390, y: 180, width: 500, height: 190 };
const PENALTY_SPOT = { x: 640, y: 600 };
const KEEPER_BASE = { x: 640, y: GOAL_RECT.y + GOAL_RECT.height + 2 };
const KICKER_START = { x: PENALTY_SPOT.x - 110, y: PENALTY_SPOT.y + 8 };
const KICKER_CONTACT = { x: PENALTY_SPOT.x - 30, y: PENALTY_SPOT.y + 4 };

type Phase =
  | 'idle'
  | 'handover'
  | 'aimX'
  | 'aimY'
  | 'power'
  | 'runup'
  | 'flight'
  | 'outcome';

export class MatchScene extends Phaser.Scene {
  private settings!: MatchSettings;
  private shootout!: Shootout;
  private scoreboard!: Scoreboard;

  private phase: Phase = 'idle';
  private phaseStart = 0;
  private inputLockedUntil = 0;

  // per-kick state
  private aimX = 0.5;
  private aimY = 0.5;
  private power = 0;
  private keeperCommit: Column | null = null;
  private keeperLocked: Column = 1;
  private cpuPlan: { aimX: number; aimY: number; power: number } | null = null;
  private runTimer: Phaser.Time.TimerEvent | null = null;

  // display objects
  private kicker!: Phaser.GameObjects.Sprite;
  private keeper!: Phaser.GameObjects.Sprite;
  private kickerShadow!: Phaser.GameObjects.Ellipse;
  private keeperShadow!: Phaser.GameObjects.Ellipse;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  private ball!: Phaser.GameObjects.Image;
  private reticle!: Phaser.GameObjects.Container;
  private powerBar!: Phaser.GameObjects.Container;
  private powerFill!: Phaser.GameObjects.Rectangle;
  private powerMarker!: Phaser.GameObjects.Triangle;
  private phaseLabel!: Phaser.GameObjects.Text;
  private announcer!: Phaser.GameObjects.Text;
  private shotCounter!: Phaser.GameObjects.Text;
  private handoverGroup!: Phaser.GameObjects.Container;
  private keeperButtons!: Phaser.GameObjects.Container;

  constructor() {
    super('Match');
  }

  create(): void {
    attachFpsOverlay(this);
    this.settings = getMatchSettings(this.game);
    this.shootout = new Shootout();
    this.phase = 'idle';
    this.cameras.main.setBackgroundColor(COLORS.nightNavy);

    this.buildPitch();
    this.buildActors();
    this.buildUi();

    this.scoreboard = new Scoreboard(this, this.settings.p1, this.settings.p2);
    this.scoreboard.update(this.shootout, TR.match.suddenDeath);

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onPointerUp(p));
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKeyDown(e));

    drawZoneGrid(this, GOAL_RECT, BALANCE.aim.columns, BALANCE.aim.rows);

    this.startKick();
  }

  // ---------- scene construction ----------

  private buildPitch(): void {
    if (hasRealTexture(this, ENV_KEYS.stadium)) {
      const img = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ENV_KEYS.stadium);
      const scale = Math.max(GAME_WIDTH / img.width, GAME_HEIGHT / img.height);
      img.setScale(scale).setDepth(0);
    } else {
      // gray-box stadium
      this.add.rectangle(GAME_WIDTH / 2, 105, GAME_WIDTH, 210, 0x1a2440);
      this.add.rectangle(
        GAME_WIDTH / 2,
        (210 + GAME_HEIGHT) / 2,
        GAME_WIDTH,
        GAME_HEIGHT - 210,
        COLORS.grassDark
      );
      for (let i = 0; i < 6; i++) {
        if (i % 2 === 0) continue;
        this.add.rectangle(GAME_WIDTH / 2, 252 + i * 85, GAME_WIDTH, 85, COLORS.grassLight, 0.5);
      }
    }

    // goal frame is always drawn in-engine so lines stay crisp
    const g = this.add.graphics().setDepth(100);
    g.lineStyle(6, COLORS.chalk, 1);
    g.strokeRect(GOAL_RECT.x, GOAL_RECT.y, GOAL_RECT.width, GOAL_RECT.height);
    g.lineStyle(1, COLORS.chalk, 0.25);
    for (let i = 1; i < 12; i++) {
      const nx = GOAL_RECT.x + (GOAL_RECT.width / 12) * i;
      g.lineBetween(nx, GOAL_RECT.y, nx, GOAL_RECT.y + GOAL_RECT.height);
    }
    for (let i = 1; i < 5; i++) {
      const ny = GOAL_RECT.y + (GOAL_RECT.height / 5) * i;
      g.lineBetween(GOAL_RECT.x, ny, GOAL_RECT.x + GOAL_RECT.width, ny);
    }
    this.add.circle(PENALTY_SPOT.x, PENALTY_SPOT.y, 5, COLORS.chalk, 0.9).setDepth(90);
  }

  private normalizeHeight(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image, target: number): void {
    const tex = sprite.texture.getSourceImage() as { width: number; height: number };
    const scale = target / tex.height;
    sprite.setScale(scale);
  }

  private buildActors(): void {
    this.kickerShadow = this.add
      .ellipse(KICKER_START.x, KICKER_START.y + 6, 110, 26, 0x000000, 0.3)
      .setDepth(200);
    this.keeperShadow = this.add
      .ellipse(KEEPER_BASE.x, KEEPER_BASE.y + 4, 70, 16, 0x000000, 0.3)
      .setDepth(140);
    this.ballShadow = this.add
      .ellipse(PENALTY_SPOT.x, PENALTY_SPOT.y + 10, 34, 10, 0x000000, 0.35)
      .setDepth(200);

    const kickerCfg = this.playerOf(this.shootout.currentKicker());
    this.kicker = this.add
      .sprite(KICKER_START.x, KICKER_START.y, charKey(kickerCfg.skin, 'kicker_idle'))
      .setOrigin(0.5, 1)
      .setDepth(300);
    this.normalizeHeight(this.kicker, BALANCE.characters.kickerHeight);

    const keeperCfg = this.playerOf(this.otherSide(this.shootout.currentKicker()));
    this.keeper = this.add
      .sprite(KEEPER_BASE.x, KEEPER_BASE.y, charKey(keeperCfg.skin, 'keeper_idle'))
      .setOrigin(0.5, 1)
      .setDepth(150);
    this.normalizeHeight(this.keeper, BALANCE.characters.keeperHeight);

    this.ball = this.add
      .image(PENALTY_SPOT.x, PENALTY_SPOT.y, ENV_KEYS.ball)
      .setDepth(310);
    this.ball.setDisplaySize(BALANCE.characters.ballDiameter, BALANCE.characters.ballDiameter);
  }

  private buildUi(): void {
    const ring = this.add.circle(0, 0, 18).setStrokeStyle(3, COLORS.turuncu, 1);
    const dot = this.add.circle(0, 0, 3, COLORS.turuncu);
    const lineH = this.add.rectangle(0, 0, 46, 2, COLORS.turuncu, 0.7);
    const lineV = this.add.rectangle(0, 0, 2, 46, COLORS.turuncu, 0.7);
    this.reticle = this.add.container(0, 0, [lineH, lineV, ring, dot]).setDepth(400).setVisible(false);

    const barW = 520;
    const barBg = this.add.rectangle(0, 0, barW, 26, COLORS.panel).setStrokeStyle(2, COLORS.chalk, 0.5);
    const sweetW = (barW * (BALANCE.power.sweetSpotMax - BALANCE.power.sweetSpotMin)) / 100;
    const sweetX =
      -barW / 2 +
      (barW * (BALANCE.power.sweetSpotMin + (BALANCE.power.sweetSpotMax - BALANCE.power.sweetSpotMin) / 2)) / 100;
    const sweet = this.add.rectangle(sweetX, 0, sweetW, 26, COLORS.turuncu, 0.35);
    this.powerFill = this.add.rectangle(-barW / 2, 0, 0, 18, COLORS.turuncu).setOrigin(0, 0.5);
    this.powerMarker = this.add.triangle(-barW / 2, -22, 0, 0, 14, 0, 7, 12, COLORS.chalk);
    this.powerBar = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT - 52, [barBg, sweet, this.powerFill, this.powerMarker])
      .setDepth(400)
      .setVisible(false);
    this.powerBar.setData('barW', barW);

    this.phaseLabel = this.add
      .text(GAME_WIDTH / 2, 128, '', {
        fontFamily: FONTS.body,
        fontSize: '24px',
        fontStyle: 'bold',
        color: COLORS.turuncuCss,
        backgroundColor: 'rgba(14,21,38,0.75)',
        padding: { x: 14, y: 6 }
      })
      .setOrigin(0.5)
      .setDepth(400);

    this.shotCounter = this.add
      .text(14, GAME_HEIGHT - 30, '', {
        fontFamily: FONTS.body,
        fontSize: '17px',
        color: COLORS.chalkCss
      })
      .setDepth(400)
      .setAlpha(0.85);

    this.announcer = this.add
      .text(GAME_WIDTH / 2, 330, '', {
        fontFamily: FONTS.display,
        fontSize: '96px',
        color: COLORS.turuncuCss,
        stroke: COLORS.nightNavyCss,
        strokeThickness: 10
      })
      .setOrigin(0.5)
      .setDepth(600)
      .setVisible(false);

    this.buildKeeperButtons();
    this.buildHandover();
  }

  private buildKeeperButtons(): void {
    const y = GAME_HEIGHT - 92;
    const labels = [TR.match.keeperLeft, TR.match.keeperCenter, TR.match.keeperRight];
    const items: Phaser.GameObjects.GameObject[] = [];
    for (let c = 0 as Column; c <= 2; c = (c + 1) as Column) {
      const x = GAME_WIDTH / 2 + (c - 1) * 210;
      const bg = this.add
        .rectangle(x, y, 190, 64, COLORS.panel, 0.9)
        .setStrokeStyle(2, COLORS.chalk, 0.5)
        .setInteractive({ useHandCursor: true });
      const txt = this.add
        .text(x, y, labels[c], {
          fontFamily: FONTS.body,
          fontSize: '22px',
          fontStyle: 'bold',
          color: COLORS.chalkCss
        })
        .setOrigin(0.5);
      bg.on('pointerdown', () => this.commitKeeper(c));
      bg.setData('col', c);
      items.push(bg, txt);
    }
    const hint = this.add
      .text(GAME_WIDTH / 2, y - 52, '← / ↓ / →  veya  A / S / D', {
        fontFamily: FONTS.body,
        fontSize: '15px',
        color: COLORS.chalkCss
      })
      .setOrigin(0.5)
      .setAlpha(0.7);
    items.push(hint);
    this.keeperButtons = this.add.container(0, 0, items).setDepth(450).setVisible(false);
  }

  private buildHandover(): void {
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.nightNavy, 0.97);
    const title = this.add
      .text(GAME_WIDTH / 2, 250, TR.match.handOverTitle, {
        fontFamily: FONTS.display,
        fontSize: '64px',
        color: COLORS.turuncuCss
      })
      .setOrigin(0.5);
    const line1 = this.add
      .text(GAME_WIDTH / 2, 350, '', {
        fontFamily: FONTS.body,
        fontSize: '28px',
        color: COLORS.chalkCss
      })
      .setOrigin(0.5);
    const line2 = this.add
      .text(GAME_WIDTH / 2, 395, '', {
        fontFamily: FONTS.body,
        fontSize: '24px',
        color: COLORS.chalkCss
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
    const tap = this.add
      .text(GAME_WIDTH / 2, 500, TR.match.handOverTap, {
        fontFamily: FONTS.body,
        fontSize: '22px',
        fontStyle: 'bold',
        color: COLORS.turuncuCss
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: tap, alpha: 0.4, yoyo: true, repeat: -1, duration: 650 });

    this.handoverGroup = this.add
      .container(0, 0, [dim, title, line1, line2, tap])
      .setDepth(900)
      .setVisible(false);
    this.handoverGroup.setData('line1', line1);
    this.handoverGroup.setData('line2', line2);
  }

  // ---------- helpers ----------

  private playerOf(side: Side): PlayerConfig {
    return side === 'A' ? this.settings.p1 : this.settings.p2;
  }

  private otherSide(side: Side): Side {
    return side === 'A' ? 'B' : 'A';
  }

  private kickerSide(): Side {
    return this.shootout.currentKicker();
  }

  private kickerIsHuman(): boolean {
    return !this.playerOf(this.kickerSide()).isCpu;
  }

  private keeperIsHuman(): boolean {
    return !this.playerOf(this.otherSide(this.kickerSide())).isCpu;
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseStart = this.time.now;
    this.inputLockedUntil = this.time.now + 160;
  }

  private setKickerPose(pose: 'kicker_idle' | 'kicker_run_a' | 'kicker_run_b' | 'kicker_kick' | 'celebrate' | 'keeper_sad'): void {
    const cfg = this.playerOf(this.kickerSide());
    this.kicker.setTexture(charKey(cfg.skin, pose));
    this.normalizeHeight(this.kicker, BALANCE.characters.kickerHeight);
  }

  private setKeeperPose(pose: 'keeper_idle' | 'keeper_dive' | 'keeper_save' | 'keeper_sad', flipX = false): void {
    const cfg = this.playerOf(this.otherSide(this.kickerSide()));
    this.keeper.setTexture(charKey(cfg.skin, pose));
    this.keeper.setFlipX(flipX);
    this.normalizeHeight(this.keeper, BALANCE.characters.keeperHeight);
  }

  private refreshActors(): void {
    this.runTimer?.remove();
    this.runTimer = null;

    this.kicker.setPosition(KICKER_START.x, KICKER_START.y).setAngle(0);
    this.setKickerPose('kicker_idle');
    this.kickerShadow.setPosition(KICKER_START.x, KICKER_START.y + 6);

    this.keeper.setPosition(KEEPER_BASE.x, KEEPER_BASE.y).setAngle(0);
    this.setKeeperPose('keeper_idle');
    this.keeperShadow.setPosition(KEEPER_BASE.x, KEEPER_BASE.y + 4);

    this.ball
      .setPosition(PENALTY_SPOT.x, PENALTY_SPOT.y)
      .setVisible(true);
    this.ball.setDisplaySize(BALANCE.characters.ballDiameter, BALANCE.characters.ballDiameter);
    this.ballShadow.setPosition(PENALTY_SPOT.x, PENALTY_SPOT.y + 10).setScale(1).setAlpha(0.35);
  }

  private goalPoint(fx: number, fy: number): { x: number; y: number } {
    return {
      x: GOAL_RECT.x + fx * GOAL_RECT.width,
      y: GOAL_RECT.y + fy * GOAL_RECT.height
    };
  }

  private columnCenterX(c: Column): number {
    return GOAL_RECT.x + ((c + 0.5) * GOAL_RECT.width) / BALANCE.aim.columns;
  }

  // ---------- kick flow ----------

  private startKick(): void {
    this.aimX = 0.5;
    this.aimY = 0.5;
    this.power = 0;
    this.keeperCommit = null;
    this.keeperLocked = 1;
    this.cpuPlan = null;

    this.reticle.setVisible(false);
    this.powerBar.setVisible(false);
    this.keeperButtons.setVisible(false);
    this.announcer.setVisible(false);
    this.refreshActors();

    const side = this.kickerSide();
    const n = Math.min(this.shootout.kickNumber(side), this.shootout.regulation);
    this.shotCounter.setText(
      this.shootout.inSuddenDeath()
        ? TR.match.suddenDeath
        : TR.match.shotCounter(n, this.shootout.regulation)
    );

    if (this.settings.mode === 'hotseat') {
      this.showHandover();
    } else if (this.kickerIsHuman()) {
      this.beginAiming();
    } else {
      this.cpuPlan = cpuShotPlan(this.settings.difficulty, rng);
      this.phaseLabel.setText(TR.match.phaseRunup);
      this.setPhase('idle');
      this.time.delayedCall(700, () => this.beginRunup());
    }
  }

  private showHandover(): void {
    const kicker = this.playerOf(this.kickerSide());
    const keeper = this.playerOf(this.otherSide(this.kickerSide()));
    (this.handoverGroup.getData('line1') as Phaser.GameObjects.Text).setText(
      TR.match.handOverShooter(kicker.name)
    );
    (this.handoverGroup.getData('line2') as Phaser.GameObjects.Text).setText(
      TR.match.handOverKeeper(keeper.name)
    );
    this.handoverGroup.setVisible(true);
    this.phaseLabel.setText('');
    this.setPhase('handover');
  }

  private beginAiming(): void {
    this.phaseLabel.setText(TR.match.phaseAimX);
    this.reticle.setVisible(true);
    this.setPhase('aimX');
  }

  private beginRunup(): void {
    this.phaseLabel.setText(this.keeperIsHuman() ? TR.match.phaseRunup : '');
    this.reticle.setVisible(false);
    this.powerBar.setVisible(false);
    if (this.keeperIsHuman()) this.keeperButtons.setVisible(true);
    this.setPhase('runup');

    // run cycle: alternate run_a / run_b at configured fps
    let runFrame = 0;
    this.setKickerPose('kicker_run_a');
    this.runTimer = this.time.addEvent({
      delay: 1000 / BALANCE.characters.runCycleFps,
      loop: true,
      callback: () => {
        runFrame++;
        this.setKickerPose(runFrame % 2 === 0 ? 'kicker_run_a' : 'kicker_run_b');
      }
    });

    this.tweens.add({
      targets: this.kicker,
      x: KICKER_CONTACT.x,
      y: KICKER_CONTACT.y,
      duration: BALANCE.runup.durationMs,
      ease: 'Quad.easeIn',
      onUpdate: () => this.kickerShadow.setPosition(this.kicker.x, this.kicker.y + 6)
    });

    this.time.delayedCall(
      BALANCE.runup.durationMs - BALANCE.runup.keeperLockBeforeContactMs,
      () => {
        if (this.phase !== 'runup') return;
        this.lockKeeperChoice();
      }
    );
    this.time.delayedCall(BALANCE.runup.durationMs, () => {
      if (this.phase !== 'runup') return;
      this.resolveAndFly();
    });
  }

  private lockKeeperChoice(): void {
    if (this.keeperIsHuman()) {
      this.keeperLocked = this.keeperCommit ?? (rng.int(3) as Column);
    } else {
      const plannedColumn = columnOf(this.cpuPlan ? this.cpuPlan.aimX : this.aimX);
      this.keeperLocked = cpuKeeperColumn(plannedColumn, this.settings.difficulty, rng);
    }
  }

  private resolveAndFly(): void {
    this.runTimer?.remove();
    this.runTimer = null;

    const input = this.cpuPlan ?? { aimX: this.aimX, aimY: this.aimY, power: this.power };
    const keeperPenalty = this.keeperIsHuman() ? 0 : cpuKeeperSavePenalty(this.settings.difficulty);

    const result = resolveKick(
      {
        aimX: input.aimX,
        aimY: input.aimY,
        power: input.power,
        keeperColumn: this.keeperLocked,
        keeperSavePenalty: keeperPenalty
      },
      rng
    );

    this.keeperButtons.setVisible(false);
    this.phaseLabel.setText('');
    this.setPhase('flight');
    this.setKickerPose('kicker_kick');

    const flightMs = Phaser.Math.Linear(
      BALANCE.power.flightMsSlow,
      BALANCE.power.flightMsFast,
      Phaser.Math.Clamp(input.power / 100, 0, 1)
    );

    // keeper dive: dive sprite is drawn diving LEFT; flip for right dives
    if (result.keeperColumn === 1) {
      this.setKeeperPose('keeper_dive', rng.chance(0.5));
      this.tweens.add({
        targets: this.keeper,
        y: KEEPER_BASE.y - (result.row === 0 ? 40 : 4),
        duration: flightMs * 0.9,
        ease: 'Quad.easeOut'
      });
    } else {
      this.setKeeperPose('keeper_dive', result.keeperColumn === 2);
      this.tweens.add({
        targets: this.keeper,
        x: this.columnCenterX(result.keeperColumn),
        y: KEEPER_BASE.y - (result.row === 0 ? 46 : 6),
        angle: result.keeperColumn === 0 ? -18 : 18,
        duration: flightMs * 0.9,
        ease: 'Quad.easeOut',
        onUpdate: () => this.keeperShadow.setPosition(this.keeper.x, KEEPER_BASE.y + 4)
      });
    }

    let end = this.goalPoint(result.ballX, result.ballY);
    if (result.outcome === 'save') {
      end = { x: this.columnCenterX(result.keeperColumn), y: KEEPER_BASE.y - 60 };
    }

    const startX = this.ball.x;
    const startY = this.ball.y;
    const groundStartY = PENALTY_SPOT.y + 10;
    const groundEndY = GOAL_RECT.y + GOAL_RECT.height + 6;

    this.tweens.add({
      targets: this.ball,
      x: end.x,
      y: end.y,
      duration: flightMs,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const t = tween.progress;
        const d = BALANCE.characters.ballDiameter *
          Phaser.Math.Linear(1, BALANCE.characters.ballFlightEndScale, t);
        this.ball.setDisplaySize(d, d);
        this.ball.setAngle(this.ball.angle + 14);
        // shadow slides along the ground toward the goal line
        const gx = Phaser.Math.Linear(startX, end.x, t);
        const gy = Phaser.Math.Linear(groundStartY, groundEndY, t);
        this.ballShadow.setPosition(gx, gy).setScale(1 - t * 0.55).setAlpha(0.35 * (1 - t * 0.4));
        void startY;
      },
      onComplete: () => this.showOutcome(result)
    });
  }

  private showOutcome(result: KickResult): void {
    this.setPhase('outcome');

    if (result.outcome === 'post') {
      this.tweens.add({
        targets: this.ball,
        x: this.ball.x + (result.ballX < 0.5 ? -70 : 70),
        y: this.ball.y + 60,
        duration: 260,
        ease: 'Quad.easeOut'
      });
    }

    // keeper reaction
    if (result.outcome === 'save') {
      this.setKeeperPose('keeper_save');
      this.keeper.setAngle(0).setPosition(this.columnCenterX(result.keeperColumn), KEEPER_BASE.y);
    } else if (result.outcome === 'goal') {
      this.setKeeperPose('keeper_sad');
      this.keeper.setAngle(0);
      this.setKickerPose('celebrate');
    }

    const text =
      result.outcome === 'goal'
        ? TR.match.announcerGoal
        : result.outcome === 'save'
          ? TR.match.announcerSave
          : result.outcome === 'post'
            ? TR.match.announcerPost
            : TR.match.announcerMiss;

    this.announcer.setText(text).setVisible(true).setScale(0.4).setAlpha(0);
    this.tweens.add({
      targets: this.announcer,
      alpha: 1,
      scale: 1,
      duration: 240,
      ease: 'Back.easeOut'
    });

    const side = this.kickerSide();
    this.shootout.recordKick(side, result.outcome as Outcome);
    this.scoreboard.update(this.shootout, TR.match.suddenDeath);

    this.time.delayedCall(1400, () => {
      const winner = this.shootout.winner();
      if (winner) {
        this.endMatch(winner);
      } else {
        this.startKick();
      }
    });
  }

  private endMatch(winner: Side): void {
    const winnerCfg = this.playerOf(winner);
    const score = `${this.shootout.score('A')} - ${this.shootout.score('B')}`;

    let streak: number | undefined;
    if (this.settings.mode === 'cpu') {
      const humanWon = !winnerCfg.isCpu;
      streak = humanWon ? loadStreak() + 1 : 0;
      saveStreak(streak);
    }

    this.scene.start('Result', { winnerName: winnerCfg.name, score, streak });
  }

  // ---------- input ----------

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.time.now < this.inputLockedUntil) return;

    switch (this.phase) {
      case 'handover':
        this.handoverGroup.setVisible(false);
        if (this.kickerIsHuman()) {
          this.beginAiming();
        } else {
          this.cpuPlan = cpuShotPlan(this.settings.difficulty, rng);
          this.time.delayedCall(500, () => this.beginRunup());
          this.setPhase('idle');
        }
        break;
      case 'aimX':
        this.phaseLabel.setText(TR.match.phaseAimY);
        this.setPhase('aimY');
        break;
      case 'aimY':
        this.phaseLabel.setText(TR.match.phasePower);
        this.powerBar.setVisible(true);
        this.setPhase('power');
        break;
      case 'power':
        this.beginRunup();
        break;
      case 'runup':
        if (this.keeperIsHuman()) {
          const third = Math.min(2, Math.floor((pointer.x / GAME_WIDTH) * 3)) as Column;
          this.commitKeeper(third);
        }
        break;
      default:
        break;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;

    if (this.phase === 'runup' && this.keeperIsHuman()) {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.commitKeeper(0);
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.commitKeeper(1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.commitKeeper(2);
      return;
    }

    if (e.code === 'Space' || e.code === 'Enter') {
      this.onPointerUp(this.input.activePointer);
    }
  }

  private commitKeeper(c: Column): void {
    if (this.phase !== 'runup' || !this.keeperIsHuman()) return;
    this.keeperCommit = c;
    this.keeperButtons.list.forEach(o => {
      if (o instanceof Phaser.GameObjects.Rectangle) {
        const isChosen = o.getData('col') === c;
        o.setStrokeStyle(isChosen ? 3 : 2, isChosen ? COLORS.turuncu : COLORS.chalk, isChosen ? 1 : 0.5);
      }
    });
  }

  // ---------- per-frame ----------

  update(time: number): void {
    const elapsed = time - this.phaseStart;

    if (this.phase === 'aimX') {
      const period = BALANCE.aim.oscillationXMs * 2;
      const t = (elapsed % period) / period;
      this.aimX = t < 0.5 ? t * 2 : 2 - t * 2;
      const p = this.goalPoint(this.aimX, this.aimY);
      this.reticle.setPosition(p.x, p.y);
    } else if (this.phase === 'aimY') {
      const period = BALANCE.aim.oscillationYMs * 2;
      const t = (elapsed % period) / period;
      this.aimY = t < 0.5 ? t * 2 : 2 - t * 2;
      const p = this.goalPoint(this.aimX, this.aimY);
      this.reticle.setPosition(p.x, p.y);
    } else if (this.phase === 'power') {
      const period = BALANCE.power.sweepMs;
      const t = (elapsed % period) / period;
      this.power = (t < 0.5 ? t * 2 : 2 - t * 2) * 100;
      const barW = this.powerBar.getData('barW') as number;
      this.powerFill.width = (barW * this.power) / 100;
      this.powerMarker.x = -barW / 2 + (barW * this.power) / 100;
    }
  }
}
