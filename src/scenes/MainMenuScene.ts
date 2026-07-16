import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config/theme';
import { TR } from '../config/tr';
import type { Difficulty } from '../config/balance';
import { createButton } from '../ui/button';
import { attachFpsOverlay } from '../systems/debug';
import { loadLastDifficulty, saveLastDifficulty } from '../systems/settings';
import type { GameMode } from '../systems/settings';

export class MainMenuScene extends Phaser.Scene {
  private difficulty: Difficulty = 'normal';
  private diffButtons = new Map<Difficulty, Phaser.GameObjects.Container>();

  constructor() {
    super('MainMenu');
  }

  create(): void {
    attachFpsOverlay(this);
    this.cameras.main.setBackgroundColor(COLORS.nightNavy);
    this.difficulty = loadLastDifficulty();

    const cx = GAME_WIDTH / 2;

    const title = this.add
      .text(cx, 150, TR.title, {
        fontFamily: FONTS.display,
        fontSize: '84px',
        color: COLORS.turuncuCss,
        stroke: COLORS.chalkCss,
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setScale(0.8)
      .setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 450, ease: 'Back.easeOut' });

    this.add
      .text(cx, 222, TR.tagline, {
        fontFamily: FONTS.body,
        fontSize: '22px',
        color: COLORS.chalkCss
      })
      .setOrigin(0.5)
      .setAlpha(0.8);

    createButton(this, cx, 330, TR.menu.vsCpu, () => this.startMode('cpu'));
    createButton(this, cx, 415, TR.menu.hotSeat, () => this.startMode('hotseat'));

    // difficulty picker (applies to vs CPU)
    this.add
      .text(cx, 495, TR.menu.difficulty, {
        fontFamily: FONTS.body,
        fontSize: '18px',
        color: COLORS.chalkCss
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    const diffs: Difficulty[] = ['easy', 'normal', 'legend'];
    diffs.forEach((d, i) => {
      const btn = createButton(
        this,
        cx + (i - 1) * 180,
        550,
        TR.menu.difficulties[d],
        () => this.setDifficulty(d),
        { width: 160, height: 48, primary: false, fontSize: '18px' }
      );
      this.diffButtons.set(d, btn);
    });
    this.refreshDifficultyChips();

    this.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 10, 'v0.1', {
        fontFamily: FONTS.body,
        fontSize: '13px',
        color: COLORS.chalkCss
      })
      .setOrigin(1)
      .setAlpha(0.35);
  }

  private setDifficulty(d: Difficulty): void {
    this.difficulty = d;
    saveLastDifficulty(d);
    this.refreshDifficultyChips();
  }

  private refreshDifficultyChips(): void {
    for (const [d, btn] of this.diffButtons) {
      const bg = btn.list[0] as Phaser.GameObjects.Rectangle;
      const txt = btn.list[1] as Phaser.GameObjects.Text;
      if (d === this.difficulty) {
        bg.setFillStyle(COLORS.turuncu);
        txt.setColor(COLORS.nightNavyCss);
      } else {
        bg.setFillStyle(COLORS.panel);
        txt.setColor(COLORS.chalkCss);
      }
    }
  }

  private startMode(mode: GameMode): void {
    this.scene.start('CharacterSelect', { mode, difficulty: this.difficulty });
  }
}
