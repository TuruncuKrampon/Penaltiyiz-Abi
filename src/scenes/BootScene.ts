import Phaser from 'phaser';
import { COLORS } from '../config/theme';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.nightNavy);
    this.scene.start('Preload');
  }
}
