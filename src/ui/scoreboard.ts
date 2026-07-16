import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config/theme';
import { BALANCE } from '../config/balance';
import { SKIN_COLORS } from '../systems/settings';
import type { PlayerConfig } from '../systems/settings';
import type { Shootout, Side, Outcome } from '../systems/shootout';

/**
 * Always-visible top-center scoreboard: names, skin chips, score and
 * five slot markers per player (empty / goal / fail).
 */
export class Scoreboard {
  private slots: Record<Side, Phaser.GameObjects.Arc[]> = { A: [], B: [] };
  private scoreText!: Phaser.GameObjects.Text;
  private extraText!: Phaser.GameObjects.Text;

  constructor(
    private scene: Phaser.Scene,
    p1: PlayerConfig,
    p2: PlayerConfig
  ) {
    const cx = GAME_WIDTH / 2;
    const y = 30;

    scene.add
      .rectangle(cx, y + 14, 640, 92, COLORS.nightNavy, 0.82)
      .setStrokeStyle(1, COLORS.chalk, 0.25)
      .setDepth(500);

    this.scoreText = scene.add
      .text(cx, y, '0 - 0', {
        fontFamily: FONTS.display,
        fontSize: '34px',
        color: COLORS.turuncuCss
      })
      .setOrigin(0.5)
      .setDepth(501);

    this.extraText = scene.add
      .text(cx, y + 40, '', {
        fontFamily: FONTS.body,
        fontSize: '15px',
        color: COLORS.chalkCss
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(501);

    this.buildSide('A', p1, cx - 200, y);
    this.buildSide('B', p2, cx + 200, y);
  }

  private buildSide(side: Side, player: PlayerConfig, x: number, y: number): void {
    const colors = SKIN_COLORS[player.skin];
    const chipX = side === 'A' ? x - 118 : x + 118;
    this.scene.add.rectangle(chipX, y, 12, 26, colors.primary).setDepth(501);
    this.scene.add
      .rectangle(chipX + (side === 'A' ? 12 : -12), y, 12, 26, colors.secondary)
      .setDepth(501);

    this.scene.add
      .text(x, y - 8, player.name, {
        fontFamily: FONTS.body,
        fontSize: '19px',
        fontStyle: 'bold',
        color: COLORS.chalkCss
      })
      .setOrigin(0.5)
      .setDepth(501);

    const n = BALANCE.shootout.regulationKicksPerSide;
    for (let i = 0; i < n; i++) {
      const sx = x - ((n - 1) / 2) * 26 + i * 26;
      const dot = this.scene.add
        .circle(sx, y + 22, 9, COLORS.panel)
        .setStrokeStyle(1.5, COLORS.chalk, 0.4)
        .setDepth(501);
      this.slots[side].push(dot);
    }
  }

  update(shootout: Shootout, suddenDeathLabel: string): void {
    this.scoreText.setText(`${shootout.score('A')} - ${shootout.score('B')}`);

    (['A', 'B'] as Side[]).forEach(side => {
      const kicks = shootout.kicks[side];
      this.slots[side].forEach((dot, i) => {
        const outcome: Outcome | undefined = kicks[kicks.length > this.slots[side].length
          ? kicks.length - this.slots[side].length + i
          : i];
        if (outcome === undefined) {
          dot.setFillStyle(COLORS.panel);
        } else if (outcome === 'goal') {
          dot.setFillStyle(COLORS.turuncu);
        } else {
          dot.setFillStyle(COLORS.alertRed);
        }
      });
    });

    this.extraText.setText(shootout.inSuddenDeath() ? suddenDeathLabel : '');
  }
}
