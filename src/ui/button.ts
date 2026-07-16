import Phaser from 'phaser';
import { COLORS, FONTS } from '../config/theme';

export interface ButtonOptions {
  width?: number;
  height?: number;
  primary?: boolean;
  fontSize?: string;
  disabled?: boolean;
}

/**
 * Shared tweened button. Everything user-clickable goes through this so
 * hover/press feel is consistent (nothing snaps).
 */
export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {}
): Phaser.GameObjects.Container {
  const width = opts.width ?? 320;
  const height = opts.height ?? 64;
  const primary = opts.primary ?? true;

  const bg = scene.add
    .rectangle(0, 0, width, height, primary ? COLORS.turuncu : COLORS.panel)
    .setStrokeStyle(2, primary ? COLORS.turuncu : COLORS.chalk, primary ? 0 : 0.4);
  const txt = scene.add
    .text(0, 0, label, {
      fontFamily: FONTS.body,
      fontSize: opts.fontSize ?? '24px',
      fontStyle: 'bold',
      color: primary ? COLORS.nightNavyCss : COLORS.chalkCss
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, txt]);
  container.setSize(width, height);

  if (opts.disabled) {
    container.setAlpha(0.45);
    return container;
  }

  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => {
    scene.tweens.add({ targets: container, scale: 1.05, duration: 120, ease: 'Sine.easeOut' });
  });
  bg.on('pointerout', () => {
    scene.tweens.add({ targets: container, scale: 1, duration: 120, ease: 'Sine.easeOut' });
  });
  bg.on('pointerdown', () => {
    scene.tweens.add({ targets: container, scale: 0.95, duration: 60, ease: 'Sine.easeOut' });
  });
  bg.on('pointerup', () => {
    scene.tweens.add({
      targets: container,
      scale: 1.05,
      duration: 80,
      ease: 'Back.easeOut',
      onComplete: () => onClick()
    });
  });

  return container;
}
