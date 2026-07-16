import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config/theme';
import { TR } from '../config/tr';
import { queueAssetManifest, generatePlaceholders } from '../systems/assets';

/**
 * Shows a progress bar while assets load, and blocks until the web fonts
 * are ready so no scene ever renders with a fallback font.
 */
export class PreloadScene extends Phaser.Scene {
  private fontsReady = false;
  private loadDone = false;

  constructor() {
    super('Preload');
  }

  preload(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const barW = 420;
    const barH = 14;
    this.add
      .rectangle(cx, cy, barW + 8, barH + 8, COLORS.panel)
      .setStrokeStyle(2, COLORS.chalk, 0.3);
    const fill = this.add
      .rectangle(cx - barW / 2, cy, 0, barH, COLORS.turuncu)
      .setOrigin(0, 0.5);

    this.add
      .text(cx, cy - 48, TR.title, {
        fontFamily: FONTS.display,
        fontSize: '42px',
        color: COLORS.turuncuCss
      })
      .setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => {
      fill.width = barW * p;
    });
    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      this.loadDone = true;
      this.tryContinue();
    });

    queueAssetManifest(this);

    document.fonts.ready.then(() => {
      // Force both faces to actually load (fonts.ready resolves even if unused).
      return Promise.all([
        document.fonts.load(`16px ${FONTS.display}`),
        document.fonts.load(`16px ${FONTS.body}`)
      ]);
    }).then(() => {
      this.fontsReady = true;
      this.tryContinue();
    }).catch(() => {
      // Never block the game on fonts.
      this.fontsReady = true;
      this.tryContinue();
    });
  }

  create(): void {
    generatePlaceholders(this);
    this.loadDone = true;
    this.tryContinue();
  }

  private tryContinue(): void {
    if (this.fontsReady && this.loadDone && this.scene.isActive('Preload')) {
      this.scene.start('MainMenu');
    }
  }
}
