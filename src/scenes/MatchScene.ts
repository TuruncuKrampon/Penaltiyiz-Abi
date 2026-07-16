import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config/theme';
import { BALANCE } from '../config/balance';
import { attachFpsOverlay, drawZoneGrid } from '../systems/debug';
import { getMatchSettings } from '../systems/settings';
import type { MatchSettings } from '../systems/settings';

/** Goal mouth rect in world coordinates (shared by aim, keeper, debug grid). */
export const GOAL_RECT = { x: 390, y: 180, width: 500, height: 190 };

/**
 * M0 stub: renders the 2.5D layout skeleton (sky, pitch, goal box outline)
 * and routes to Result. The full 5-phase kick loop lands in M1.
 */
export class MatchScene extends Phaser.Scene {
  private settings!: MatchSettings;

  constructor() {
    super('Match');
  }

  create(): void {
    attachFpsOverlay(this);
    this.settings = getMatchSettings(this.game);

    // sky + pitch gray-box
    this.cameras.main.setBackgroundColor(COLORS.nightNavy);
    this.add.rectangle(GAME_WIDTH / 2, 560, GAME_WIDTH, 320, COLORS.grassDark);

    // goal outline placeholder
    this.add
      .rectangle(
        GOAL_RECT.x + GOAL_RECT.width / 2,
        GOAL_RECT.y + GOAL_RECT.height / 2,
        GOAL_RECT.width,
        GOAL_RECT.height
      )
      .setStrokeStyle(4, COLORS.chalk, 0.9)
      .setFillStyle(COLORS.nightNavy, 0.2);

    drawZoneGrid(this, GOAL_RECT, BALANCE.aim.columns, BALANCE.aim.rows);

    this.add
      .text(GAME_WIDTH / 2, 90, `${this.settings.p1.name} vs ${this.settings.p2.name}`, {
        fontFamily: FONTS.display,
        fontSize: '32px',
        color: COLORS.chalkCss
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, 'M1: atış döngüsü burada olacak — devam için tıkla', {
        fontFamily: FONTS.body,
        fontSize: '20px',
        color: COLORS.turuncuCss
      })
      .setOrigin(0.5);

    this.input.once('pointerup', () => {
      this.scene.start('Result', { winnerName: this.settings.p1.name, score: '5 - 4' });
    });
  }
}
