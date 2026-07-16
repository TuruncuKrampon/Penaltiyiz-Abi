import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH } from '../config/theme';
import { TR } from '../config/tr';
import type { Difficulty } from '../config/balance';
import { createButton } from '../ui/button';
import { attachFpsOverlay } from '../systems/debug';
import {
  SKIN_IDS, SKIN_COLORS, setMatchSettings
} from '../systems/settings';
import type { SkinId, GameMode } from '../systems/settings';

interface InitData {
  mode: GameMode;
  difficulty: Difficulty;
}

/**
 * Skin picker. In hot-seat mode both players pick (and may not pick the
 * same skin); vs CPU the computer takes a random remaining skin.
 */
export class CharacterSelectScene extends Phaser.Scene {
  private mode: GameMode = 'cpu';
  private difficulty: Difficulty = 'normal';
  private p1Skin: SkinId | null = null;
  private p2Skin: SkinId | null = null;
  private warning!: Phaser.GameObjects.Text;
  private chips: { skin: SkinId; row: 1 | 2; container: Phaser.GameObjects.Container }[] = [];

  constructor() {
    super('CharacterSelect');
  }

  init(data: Partial<InitData>): void {
    this.mode = data.mode ?? 'cpu';
    this.difficulty = data.difficulty ?? 'normal';
    this.p1Skin = null;
    this.p2Skin = null;
    this.chips = [];
  }

  create(): void {
    attachFpsOverlay(this);
    this.cameras.main.setBackgroundColor(COLORS.nightNavy);
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 90, TR.select.heading, {
        fontFamily: FONTS.display,
        fontSize: '48px',
        color: COLORS.chalkCss
      })
      .setOrigin(0.5);

    this.buildRow(1, 200, TR.select.player1);
    if (this.mode === 'hotseat') {
      this.buildRow(2, 400, TR.select.player2);
    } else {
      this.add
        .text(cx, 420, `${TR.select.cpu}: ?`, {
          fontFamily: FONTS.body,
          fontSize: '22px',
          color: COLORS.chalkCss
        })
        .setOrigin(0.5)
        .setAlpha(0.7)
        .setName('cpuLabel');
    }

    this.warning = this.add
      .text(cx, 560, TR.select.sameSkinWarning, {
        fontFamily: FONTS.body,
        fontSize: '20px',
        color: COLORS.alertRedCss
      })
      .setOrigin(0.5)
      .setAlpha(0);

    createButton(this, cx, 630, TR.select.continue, () => this.tryContinue());
  }

  private buildRow(row: 1 | 2, y: number, label: string): void {
    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, y - 55, label, {
        fontFamily: FONTS.body,
        fontSize: '22px',
        color: COLORS.turuncuCss,
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    SKIN_IDS.forEach((skin, i) => {
      const x = cx + (i - 1) * 260;
      const colors = SKIN_COLORS[skin];

      const bg = this.add
        .rectangle(0, 0, 230, 84, COLORS.panel)
        .setStrokeStyle(2, COLORS.chalk, 0.25);
      const swatchA = this.add.rectangle(-84, 0, 28, 56, colors.primary);
      const swatchB = this.add.rectangle(-54, 0, 28, 56, colors.secondary);
      const txt = this.add
        .text(20, 0, TR.select.skins[skin], {
          fontFamily: FONTS.body,
          fontSize: '19px',
          color: COLORS.chalkCss
        })
        .setOrigin(0.5);

      const container = this.add.container(x, y, [bg, swatchA, swatchB, txt]);
      container.setSize(230, 84);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => this.pick(row, skin));

      this.chips.push({ skin, row, container });
    });
  }

  private pick(row: 1 | 2, skin: SkinId): void {
    if (row === 1) this.p1Skin = skin;
    else this.p2Skin = skin;
    this.warning.setAlpha(0);
    this.refreshChips();
  }

  private refreshChips(): void {
    for (const chip of this.chips) {
      const selected = chip.row === 1 ? this.p1Skin === chip.skin : this.p2Skin === chip.skin;
      const bg = chip.container.list[0] as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(selected ? 4 : 2, selected ? COLORS.turuncu : COLORS.chalk, selected ? 1 : 0.25);
      this.tweens.add({
        targets: chip.container,
        scale: selected ? 1.06 : 1,
        duration: 120,
        ease: 'Sine.easeOut'
      });
    }
  }

  private tryContinue(): void {
    if (!this.p1Skin) {
      this.flashWarning();
      return;
    }

    let p2Skin: SkinId;
    if (this.mode === 'hotseat') {
      if (!this.p2Skin) {
        this.flashWarning();
        return;
      }
      if (this.p2Skin === this.p1Skin) {
        this.flashWarning();
        return;
      }
      p2Skin = this.p2Skin;
    } else {
      const remaining = SKIN_IDS.filter(s => s !== this.p1Skin);
      p2Skin = remaining[Math.floor(Math.random() * remaining.length)];
    }

    setMatchSettings(this.game, {
      mode: this.mode,
      difficulty: this.difficulty,
      p1: { name: TR.select.player1, skin: this.p1Skin, isCpu: false },
      p2: {
        name: this.mode === 'cpu' ? TR.select.cpu : TR.select.player2,
        skin: p2Skin,
        isCpu: this.mode === 'cpu'
      }
    });
    this.scene.start('Match');
  }

  private flashWarning(): void {
    this.warning.setAlpha(1);
    this.tweens.add({
      targets: this.warning,
      alpha: 0,
      delay: 1600,
      duration: 400
    });
  }
}
