import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { COLORS, FONTS } from '../config/theme';
import { TR } from '../config/tr';
import { rng } from './rng';
import { sfx } from './audio';

/**
 * The 6 toxic goal celebrations. Each stages the scorer's `celebrate`
 * sprite with tweens and plays a matching mocking sound — no speech
 * bubbles (the Beşiktaş line is the single exception, handled below).
 * Index order matches BALANCE.celebrations.weights.
 */

type Celebration = (scene: Phaser.Scene, scorer: Phaser.GameObjects.Sprite) => void;

const shush: Celebration = (scene, scorer) => {
  sfx.hush();
  // snap to face the camera, tiny defiant hold, slow head-shake wiggle
  scene.tweens.add({
    targets: scorer,
    scaleX: { from: scorer.scaleX * -1, to: scorer.scaleX },
    duration: 300,
    ease: 'Sine.easeInOut'
  });
  scene.tweens.add({
    targets: scorer,
    angle: { from: -4, to: 4 },
    duration: 260,
    yoyo: true,
    repeat: 4,
    ease: 'Sine.easeInOut',
    onComplete: () => scorer.setAngle(0)
  });
};

const earCup: Celebration = (scene, scorer) => {
  sfx.laugh('short');
  // lean side to side, "can't hear you"
  scene.tweens.add({
    targets: scorer,
    angle: { from: -12, to: 12 },
    duration: 380,
    yoyo: true,
    repeat: 3,
    ease: 'Sine.easeInOut',
    onComplete: () => scorer.setAngle(0)
  });
};

const siuu: Celebration = (scene, scorer) => {
  sfx.siuu();
  const groundY = scorer.y;
  scene.tweens.add({
    targets: scorer,
    y: groundY - 130,
    angle: 360,
    duration: 550,
    ease: 'Quad.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: scorer,
        y: groundY,
        duration: 320,
        ease: 'Bounce.easeOut',
        onStart: () => scorer.setAngle(0)
      });
      // landing stomp pose: arms-down power stance = quick squash
      scene.tweens.add({
        targets: scorer,
        scaleY: scorer.scaleY * 0.88,
        duration: 120,
        delay: 320,
        yoyo: true,
        ease: 'Sine.easeOut'
      });
    }
  });
};

const calmDown: Celebration = (scene, scorer) => {
  sfx.laugh('chuckle');
  // smug slow "settle down" palm bounces
  scene.tweens.add({
    targets: scorer,
    y: scorer.y - 12,
    duration: 300,
    yoyo: true,
    repeat: 3,
    ease: 'Sine.easeInOut'
  });
};

const legsUp: Celebration = (scene, scorer) => {
  sfx.laugh('long');
  // roach specialty: flip on the back, legs kicking in the air
  const groundY = scorer.y;
  scene.tweens.add({
    targets: scorer,
    angle: 180,
    y: groundY - 30,
    duration: 380,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: scorer,
        angle: { from: 172, to: 188 },
        duration: 110,
        yoyo: true,
        repeat: 8,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          scene.tweens.add({
            targets: scorer,
            angle: 0,
            y: groundY,
            duration: 260,
            ease: 'Back.easeIn'
          });
        }
      });
    }
  });
};

const pointAndLaugh: Celebration = (scene, scorer) => {
  sfx.laugh('loud');
  // repeated jabs toward the keeper
  scene.tweens.add({
    targets: scorer,
    x: scorer.x + 26,
    angle: -8,
    duration: 220,
    yoyo: true,
    repeat: 4,
    ease: 'Quad.easeOut',
    onComplete: () => scorer.setAngle(0)
  });
};

const CELEBRATIONS: Celebration[] = [shush, earCup, siuu, calmDown, legsUp, pointAndLaugh];

/** Play a random toxic celebration on the scorer. */
export function playToxicCelebration(scene: Phaser.Scene, scorer: Phaser.GameObjects.Sprite): void {
  const idx = rng.weighted(BALANCE.celebrations.weights);
  CELEBRATIONS[idx](scene, scorer);
}

/** Conceding keeper slumps: sag + tiny defeated sway. */
export function playKeeperSulk(scene: Phaser.Scene, keeper: Phaser.GameObjects.Sprite): void {
  scene.tweens.add({
    targets: keeper,
    scaleY: keeper.scaleY * 0.93,
    duration: 350,
    ease: 'Sine.easeOut'
  });
  scene.tweens.add({
    targets: keeper,
    angle: { from: -3, to: 3 },
    duration: 500,
    yoyo: true,
    repeat: 2,
    ease: 'Sine.easeInOut',
    onComplete: () => keeper.setAngle(0)
  });
}

/**
 * Beşiktaş special: speech bubble with the line, plus layered audio
 * (mp3 → TTS → bubble-only). Played IN ADDITION to a toxic celebration
 * when the bw skin scores.
 */
export function playBesiktasCelebration(
  scene: Phaser.Scene,
  scorer: Phaser.GameObjects.Sprite
): void {
  sfx.playBesiktas();

  const bubbleY = scorer.y - scorer.displayHeight - 46;
  const txt = scene.add
    .text(scorer.x, bubbleY, TR.match.besiktasLine, {
      fontFamily: FONTS.display,
      fontSize: '30px',
      color: COLORS.nightNavyCss,
      align: 'center',
      wordWrap: { width: 360 }
    })
    .setOrigin(0.5)
    .setDepth(801);

  const pad = 18;
  const bw = txt.width + pad * 2;
  const bh = txt.height + pad * 1.4;
  const bx = Phaser.Math.Clamp(scorer.x, bw / 2 + 10, scene.scale.width - bw / 2 - 10);
  txt.setX(bx);
  // draw in local space around (0,0) so the pop-in scale tween stays centered
  const bubble = scene.add.graphics({ x: bx, y: bubbleY }).setDepth(800);
  const tailX = scorer.x - bx;
  bubble.fillStyle(COLORS.white, 1);
  bubble.lineStyle(4, 0x111111, 1);
  bubble.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 16);
  bubble.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 16);
  bubble.fillTriangle(-14, bh / 2 - 2, 18, bh / 2 - 2, tailX, bh / 2 + 26);
  bubble.lineBetween(-14, bh / 2 - 2, tailX, bh / 2 + 26);
  bubble.lineBetween(18, bh / 2 - 2, tailX, bh / 2 + 26);

  const group = [bubble, txt];
  group.forEach(o => o.setAlpha(0).setScale(0.6));
  scene.tweens.add({ targets: group, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut' });

  scene.time.delayedCall(BALANCE.celebrations.besiktasBubbleMs, () => {
    scene.tweens.add({
      targets: group,
      alpha: 0,
      duration: 250,
      onComplete: () => group.forEach(o => o.destroy())
    });
  });
}
