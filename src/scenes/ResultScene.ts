import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config/theme';
import { TR } from '../config/tr';
import { createButton } from '../ui/button';
import { attachFpsOverlay } from '../systems/debug';

interface ResultData {
  winnerName: string;
  score: string;
  streak?: number;
}

export class ResultScene extends Phaser.Scene {
  private result!: ResultData;

  constructor() {
    super('Result');
  }

  init(data: Partial<ResultData>): void {
    this.result = {
      winnerName: data.winnerName ?? '?',
      score: data.score ?? '0 - 0',
      streak: data.streak
    };
  }

  create(): void {
    attachFpsOverlay(this);
    this.cameras.main.setBackgroundColor(COLORS.nightNavy);
    const cx = GAME_WIDTH / 2;

    const banner = this.add
      .text(cx, 200, TR.result.winner(this.result.winnerName), {
        fontFamily: FONTS.display,
        fontSize: '64px',
        color: COLORS.turuncuCss
      })
      .setOrigin(0.5)
      .setScale(0.6)
      .setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 400, ease: 'Back.easeOut' });

    this.add
      .text(cx, 300, `${TR.result.finalScore}: ${this.result.score}`, {
        fontFamily: FONTS.body,
        fontSize: '30px',
        color: COLORS.chalkCss
      })
      .setOrigin(0.5);

    if (this.result.streak && this.result.streak > 1) {
      this.add
        .text(cx, 350, TR.result.streak(this.result.streak), {
          fontFamily: FONTS.body,
          fontSize: '22px',
          color: COLORS.turuncuCss
        })
        .setOrigin(0.5);
    }

    createButton(this, cx, 460, TR.result.rematch, () => this.scene.start('CharacterSelect'));
    createButton(this, cx, 545, TR.result.mainMenu, () => this.scene.start('MainMenu'), {
      primary: false
    });
  }
}
