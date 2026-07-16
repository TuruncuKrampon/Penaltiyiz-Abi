import Phaser from 'phaser';
import { COLORS, FONTS } from '../config/theme';

export function isDebug(): boolean {
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

/**
 * FPS overlay shown behind ?debug=1. Call from any scene's create();
 * it attaches an update listener on that scene.
 */
export function attachFpsOverlay(scene: Phaser.Scene): void {
  if (!isDebug()) return;
  const txt = scene.add
    .text(8, 8, '', {
      fontFamily: FONTS.body,
      fontSize: '14px',
      color: COLORS.turuncuCss,
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 6, y: 3 }
    })
    .setDepth(10000)
    .setScrollFactor(0);
  scene.events.on(Phaser.Scenes.Events.UPDATE, () => {
    txt.setText(`${scene.game.loop.actualFps.toFixed(0)} fps | ${scene.scene.key}`);
  });
}

/**
 * Draws the 3x2 goal-mouth zone grid for tuning. Rect coordinates are
 * supplied by the caller (MatchScene knows where the goal is).
 */
export function drawZoneGrid(
  scene: Phaser.Scene,
  goal: { x: number; y: number; width: number; height: number },
  cols: number,
  rows: number
): void {
  if (!isDebug()) return;
  const g = scene.add.graphics().setDepth(9999);
  g.lineStyle(1, COLORS.turuncu, 0.7);
  const cw = goal.width / cols;
  const rh = goal.height / rows;
  for (let c = 0; c <= cols; c++) {
    g.lineBetween(goal.x + c * cw, goal.y, goal.x + c * cw, goal.y + goal.height);
  }
  for (let r = 0; r <= rows; r++) {
    g.lineBetween(goal.x, goal.y + r * rh, goal.x + goal.width, goal.y + r * rh);
  }
}
