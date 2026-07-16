import Phaser from 'phaser';
import { COLORS, FONTS } from '../config/theme';
import { SKIN_IDS, SKIN_COLORS } from './settings';
import type { SkinId } from './settings';

/**
 * Asset manifest + placeholder fallback.
 *
 * Files live under src/assets/... and are discovered at build time via
 * import.meta.glob — a missing file is simply absent from the glob, so
 * the game NEVER issues a 404 request. Anything missing gets a colored
 * capsule placeholder texture with the pose label, generated at runtime.
 * Dropping a new PNG in and rebuilding (or reloading dev) picks it up.
 */

const ASSET_URLS = import.meta.glob('../assets/**/*.{png,mp3}', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

/** rel is e.g. "chars/bw/kicker_idle.png" or "audio/babaniz-besiktas.mp3". */
export function assetUrl(rel: string): string | null {
  return ASSET_URLS[`../assets/${rel}`] ?? null;
}

export const CHAR_POSES = [
  'kicker_idle',
  'kicker_run_a',
  'kicker_run_b',
  'kicker_kick',
  'celebrate',
  'keeper_idle',
  'keeper_dive',
  'keeper_save',
  'keeper_sad'
] as const;
export type CharPose = (typeof CHAR_POSES)[number];

export function charKey(skin: SkinId, pose: CharPose): string {
  return `${skin}/${pose}`;
}

export const ENV_KEYS = {
  stadium: 'env/stadium_bg',
  ball: 'env/ball'
} as const;

/** Queue every EXISTING manifest file on the loader; note what's absent. */
export function queueAssetManifest(scene: Phaser.Scene): void {
  for (const skin of SKIN_IDS) {
    for (const pose of CHAR_POSES) {
      const url = assetUrl(`chars/${skin}/${pose}.png`);
      if (url) scene.load.image(charKey(skin, pose), url);
    }
  }
  const stadiumUrl = assetUrl('env/stadium_bg.png');
  if (stadiumUrl) scene.load.image(ENV_KEYS.stadium, stadiumUrl);
  const ballUrl = assetUrl('env/ball.png');
  if (ballUrl) scene.load.image(ENV_KEYS.ball, ballUrl);
}

export function hasRealTexture(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key);
}

/**
 * After the loader finishes, generate placeholder textures for anything
 * absent. Call once from PreloadScene.create().
 */
export function generatePlaceholders(scene: Phaser.Scene): void {
  for (const skin of SKIN_IDS) {
    for (const pose of CHAR_POSES) {
      const key = charKey(skin, pose);
      if (!scene.textures.exists(key)) makeCharPlaceholder(scene, key, skin, pose);
    }
  }
  if (!scene.textures.exists(ENV_KEYS.ball)) makeBallPlaceholder(scene, ENV_KEYS.ball);
  // Stadium has no generated placeholder: MatchScene draws its gray-box
  // pitch whenever the texture is absent.
}

function makeCharPlaceholder(scene: Phaser.Scene, key: string, skin: SkinId, pose: CharPose): void {
  const w = 200;
  const h = 400;
  const colors = SKIN_COLORS[skin];
  const isKeeper = pose.startsWith('keeper');

  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(colors.primary, 1);
  g.fillRoundedRect(w / 2 - 55, 120, 110, 230, 40);
  g.lineStyle(6, colors.secondary, 1);
  g.strokeRoundedRect(w / 2 - 55, 120, 110, 230, 40);
  g.fillStyle(colors.secondary, 1);
  g.fillCircle(w / 2, 80, 44);
  if (isKeeper) {
    g.fillStyle(COLORS.turuncu, 1);
    g.fillCircle(w / 2 - 70, 200, 20);
    g.fillCircle(w / 2 + 70, 200, 20);
  }
  // oversized orange cleats
  g.fillStyle(COLORS.turuncu, 1);
  g.fillRoundedRect(w / 2 - 78, 350, 70, 34, 16);
  g.fillRoundedRect(w / 2 + 8, 350, 70, 34, 16);
  g.fillStyle(0x1c5fd6, 1);
  g.fillRect(w / 2 - 78, 378, 70, 7);
  g.fillRect(w / 2 + 8, 378, 70, 7);

  const label = scene.make.text(
    {
      x: w / 2,
      y: 235,
      text: pose.replace('_', '\n'),
      style: {
        fontFamily: FONTS.body,
        fontSize: '22px',
        fontStyle: 'bold',
        color: COLORS.nightNavyCss,
        align: 'center'
      }
    },
    false
  ).setOrigin(0.5);

  const rt = scene.make.renderTexture({ x: 0, y: 0, width: w, height: h }, false);
  rt.draw(g, 0, 0);
  rt.draw(label, label.x, label.y);
  rt.saveTexture(key);
  rt.destroy();
  label.destroy();
  g.destroy();
}

function makeBallPlaceholder(scene: Phaser.Scene, key: string): void {
  const d = 128;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(COLORS.white, 1);
  g.fillCircle(d / 2, d / 2, d / 2 - 4);
  g.lineStyle(4, 0x222222, 1);
  g.strokeCircle(d / 2, d / 2, d / 2 - 4);
  g.fillStyle(COLORS.turuncu, 1);
  g.fillCircle(d / 2, d / 2, 16);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.fillCircle(d / 2 + Math.cos(a) * 38, d / 2 + Math.sin(a) * 38, 11);
  }
  const rt = scene.make.renderTexture({ x: 0, y: 0, width: d, height: d }, false);
  rt.draw(g, 0, 0);
  rt.saveTexture(key);
  rt.destroy();
  g.destroy();
}
