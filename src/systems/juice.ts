import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { COLORS } from '../config/theme';

/** Respect the user's reduced-motion preference: no shake/slow-mo/freeze. */
export const reducedMotion: boolean =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

function setTimeScale(scene: Phaser.Scene, scale: number): void {
  scene.tweens.timeScale = scale;
  scene.time.timeScale = scale;
}

/**
 * Ball-contact impact: brief freeze-frame, then optional slow motion for
 * match-deciding kicks. Uses real-time timeouts so the effect itself is
 * not slowed by the timescale it manipulates.
 */
export function impactMoment(scene: Phaser.Scene, opts: { decisive: boolean }): void {
  if (reducedMotion) return;
  const J = BALANCE.juice;

  setTimeScale(scene, 0.02);
  window.setTimeout(() => {
    if (!scene.scene.isActive()) return;
    if (opts.decisive) {
      setTimeScale(scene, J.slowMoScale);
      window.setTimeout(() => {
        if (scene.scene.isActive()) setTimeScale(scene, 1);
      }, J.slowMoMs);
    } else {
      setTimeScale(scene, 1);
    }
  }, J.freezeFrameMs);
}

export function cameraShake(scene: Phaser.Scene): void {
  if (reducedMotion) return;
  scene.cameras.main.shake(BALANCE.juice.shakeMs, BALANCE.juice.shakeIntensity);
}

/** Ensure timescales are restored (scene shutdown safety). */
export function resetTimeScale(scene: Phaser.Scene): void {
  setTimeScale(scene, 1);
}

/** Announcer slam: scale punch + expanding orange shockwave ring. */
export function announcerSlam(
  scene: Phaser.Scene,
  text: Phaser.GameObjects.Text,
  message: string
): void {
  const J = BALANCE.juice;
  text.setText(message).setVisible(true).setAlpha(0).setScale(0.3);
  scene.tweens.add({
    targets: text,
    alpha: 1,
    scale: J.announcerPunchScale,
    duration: 180,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({ targets: text, scale: 1, duration: 160, ease: 'Sine.easeOut' });
    }
  });

  const ring = scene.add
    .circle(text.x, text.y, 10)
    .setStrokeStyle(6, COLORS.turuncu, 0.9)
    .setDepth(text.depth - 1);
  scene.tweens.add({
    targets: ring,
    radius: 420,
    alpha: 0,
    duration: 550,
    ease: 'Cubic.easeOut',
    onUpdate: () => ring.setStrokeStyle(6, COLORS.turuncu, ring.alpha * 0.9),
    onComplete: () => ring.destroy()
  });
}

/** One-time generation of tiny particle textures. */
export function ensureFxTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists('fx/spark')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('fx/spark', 12, 12);
    g.destroy();
  }
  if (!scene.textures.exists('fx/confetti')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 10, 14);
    g.generateTexture('fx/confetti', 10, 14);
    g.destroy();
  }
}

/** Orange trail following the ball during flight. Returns a stopper. */
export function ballTrail(scene: Phaser.Scene, target: Phaser.GameObjects.Image): () => void {
  ensureFxTextures(scene);
  const emitter = scene.add
    .particles(0, 0, 'fx/spark', {
      speed: 12,
      lifespan: 280,
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: COLORS.turuncu,
      blendMode: Phaser.BlendModes.ADD,
      frequency: 18,
      follow: target
    })
    .setDepth(305);
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    emitter.stopFollow();
    emitter.stop();
    scene.time.delayedCall(400, () => emitter.destroy());
  };
}

/** Confetti burst (match win). */
export function confettiBurst(scene: Phaser.Scene, x: number, y: number): void {
  ensureFxTextures(scene);
  const emitter = scene.add
    .particles(x, y, 'fx/confetti', {
      speed: { min: 220, max: 520 },
      angle: { min: 230, max: 310 },
      gravityY: 700,
      lifespan: 2400,
      quantity: BALANCE.juice.confettiCount,
      scale: { min: 0.5, max: 1.1 },
      rotate: { min: 0, max: 360 },
      tint: [COLORS.turuncu, COLORS.chalk, 0xffd400, 0x35c46f, 0x4aa3ff],
      emitting: false
    })
    .setDepth(950);
  emitter.explode(BALANCE.juice.confettiCount, 0, 0);
  scene.time.delayedCall(2600, () => emitter.destroy());
}

/** Net ripple on goal: quick elastic scale pulse on the net container. */
export function netRipple(scene: Phaser.Scene, net: Phaser.GameObjects.Container): void {
  scene.tweens.add({
    targets: net,
    scaleX: 1.035,
    scaleY: 1.05,
    duration: BALANCE.juice.netRippleMs / 2,
    yoyo: true,
    repeat: 1,
    ease: 'Sine.easeInOut'
  });
}
