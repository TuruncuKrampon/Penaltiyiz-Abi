window.PA = window.PA || {};

PA.Roach = (function () {
  const U = PA.Utils;

  const BASE = {
    bodyRx: 30,
    bodyRy: 23,
    headR: 15,
    upperLegLen: 20,
    lowerLegLen: 18,
    armLen: 24,
    normalCleatLen: 17,
    normalCleatH: 11
  };

  function cleatSize() {
    const f = PA.Config.CLEAT_SCALE_FACTOR;
    return { len: BASE.normalCleatLen * f, h: BASE.normalCleatH * f };
  }

  // ---------- Pose library ----------

  const ZONE_DIR = {
    TL: { x: -1, y: -1 }, TC: { x: 0, y: -1 }, TR: { x: 1, y: -1 },
    BL: { x: -1, y: 1 }, BC: { x: 0, y: 1 }, BR: { x: 1, y: 1 }
  };

  function basePose() {
    return {
      bodyLean: 0, armAngleL: 0.15, armAngleR: -0.15,
      legAngleL: 0.06, legAngleR: -0.06,
      antennaWobble: 0, eyeExpression: 'normal',
      hopOffset: 0, kickExtend: 0, faceCover: 0, turnAmount: 0,
      chestPuff: 0
    };
  }

  const POSE_FNS = {
    idle(t) {
      const p = basePose();
      p.hopOffset = Math.sin(t * Math.PI * 2) * 2;
      p.antennaWobble = Math.sin(t * Math.PI * 2) * 0.18;
      p.armAngleL = 0.15 + Math.sin(t * Math.PI * 2) * 0.04;
      p.armAngleR = -0.15 - Math.sin(t * Math.PI * 2) * 0.04;
      return p;
    },
    runup(t) {
      const p = basePose();
      const cycle = Math.sin(t * Math.PI * 7);
      p.bodyLean = U.lerp(0, 0.28, t);
      p.legAngleL = cycle * 0.9;
      p.legAngleR = -cycle * 0.9;
      p.armAngleL = -cycle * 0.6;
      p.armAngleR = cycle * 0.6;
      p.antennaWobble = Math.sin(t * Math.PI * 10) * 0.35;
      p.hopOffset = Math.abs(cycle) * -4;
      return p;
    },
    kickImpact(t) {
      const p = basePose();
      const swing = U.easeOutQuad(U.clamp((t - 0.35) / 0.5, 0, 1));
      p.bodyLean = 0.28 - swing * 0.15;
      p.legAngleR = U.lerp(-0.9, 1.3, swing);
      p.legAngleL = -0.15;
      p.armAngleL = U.lerp(-0.4, 0.5, swing);
      p.armAngleR = U.lerp(0.4, -0.6, swing);
      p.kickExtend = swing;
      p.antennaWobble = Math.sin(t * Math.PI * 12) * 0.3;
      return p;
    },
    celebrateGoal(t) {
      const p = basePose();
      const jump = Math.sin(U.clamp(t, 0, 1) * Math.PI);
      p.hopOffset = -jump * 26;
      p.armAngleL = U.lerp(0.15, -2.6, U.easeOutBack(U.clamp(t * 1.4, 0, 1)));
      p.armAngleR = U.lerp(-0.15, 2.6, U.easeOutBack(U.clamp(t * 1.4, 0, 1)));
      p.antennaWobble = Math.sin(t * Math.PI * 8) * 0.4;
      p.eyeExpression = 'happy';
      p.legAngleL = -jump * 0.3;
      p.legAngleR = jump * 0.3;
      return p;
    },
    celebrateBesiktas(t) {
      const p = basePose();
      const turnT = U.clamp(t / 0.4, 0, 1);
      p.turnAmount = U.easeOutQuad(turnT);
      const jump = Math.sin(U.clamp((t - 0.3) / 0.7, 0, 1) * Math.PI);
      p.hopOffset = -jump * 14;
      p.armAngleL = U.lerp(0.15, -2.2, U.clamp((t - 0.3) * 2, 0, 1));
      p.armAngleR = U.lerp(-0.15, 2.2, U.clamp((t - 0.3) * 2, 0, 1));
      p.antennaWobble = Math.sin(t * Math.PI * 8) * 0.4;
      p.eyeExpression = 'happy';
      return p;
    },
    keeperDive(t, character) {
      const p = basePose();
      const dir = ZONE_DIR[character.diveZone] || { x: 0, y: -1 };
      const dt = U.easeOutQuad(U.clamp(t, 0, 1));
      p.bodyLean = dir.x * dt * 0.9;
      p.hopOffset = dir.y < 0 ? -dt * 22 : dt * 6;
      p.armAngleL = U.lerp(0.15, dir.x * -1.4 + dir.y * -0.6, dt);
      p.armAngleR = U.lerp(-0.15, dir.x * 1.4 + dir.y * -0.6, dt);
      p.legAngleL = dir.x * dt * 0.6;
      p.legAngleR = dir.x * dt * 0.6;
      p.antennaWobble = Math.sin(t * Math.PI * 10) * 0.3;
      p.eyeExpression = 'shocked';
      return p;
    },
    reactSaveKeeper(t) {
      const p = basePose();
      const pf = U.easeOutBack(U.clamp(t, 0, 1));
      p.chestPuff = pf;
      p.armAngleL = U.lerp(0.15, -0.9, pf);
      p.armAngleR = U.lerp(-0.15, 0.9, pf);
      p.eyeExpression = 'happy';
      p.hopOffset = -pf * 4;
      return p;
    },
    reactSaveKicker(t) {
      const p = basePose();
      const s = U.clamp(t, 0, 1);
      p.bodyLean = s * 0.35;
      p.hopOffset = s * 10;
      p.antennaWobble = -s * 0.5;
      p.armAngleL = U.lerp(0.15, 0.5, s);
      p.armAngleR = U.lerp(-0.15, -0.5, s);
      p.eyeExpression = 'sad';
      return p;
    },
    reactMissKicker(t) {
      const p = basePose();
      const s = U.clamp(t / 0.6, 0, 1);
      p.faceCover = s;
      p.armAngleL = U.lerp(0.15, 2.1, s);
      p.armAngleR = U.lerp(-0.15, -2.1, s);
      p.bodyLean = s * 0.12;
      p.eyeExpression = 'shocked';
      return p;
    },
    victoryDance(t) {
      const p = basePose();
      const sway = Math.sin(t * Math.PI * 2);
      p.hopOffset = Math.abs(Math.sin(t * Math.PI * 4)) * -12;
      p.bodyLean = sway * 0.2;
      p.armAngleL = 0.4 + sway * 0.9;
      p.armAngleR = -0.4 - sway * 0.9;
      p.legAngleL = -sway * 0.4;
      p.legAngleR = sway * 0.4;
      p.antennaWobble = sway * 0.4;
      p.eyeExpression = 'happy';
      return p;
    }
  };

  // ---------- Animation runner ----------

  function playAnimation(character, clip, duration, onComplete, loop) {
    character.anim = { clip, elapsed: 0, duration, loop: !!loop, onComplete: onComplete || null };
    character.pose = POSE_FNS[clip](0, character);
  }

  function update(character, dt) {
    if (!character.anim) {
      character.anim = { clip: 'idle', elapsed: 0, duration: 2200, loop: true, onComplete: null };
    }
    const a = character.anim;
    a.elapsed += dt;
    let t;
    if (a.loop) {
      t = (a.elapsed % a.duration) / a.duration;
    } else {
      t = U.clamp(a.elapsed / a.duration, 0, 1);
    }
    character.pose = POSE_FNS[a.clip](t, character);
    if (!a.loop && t >= 1) {
      const cb = a.onComplete;
      character.anim = { clip: 'idle', elapsed: 0, duration: 2200, loop: true, onComplete: null };
      if (cb) cb();
    }
  }

  // ---------- Drawing ----------

  function drawJerseyFill(ctx, cx, cy, rx, ry, team) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = team.primary;
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    if (team.pattern === 'solid') {
      ctx.restore();
      return;
    }
    ctx.fillStyle = team.secondary;
    if (team.pattern === 'stripes-diagonal') {
      ctx.translate(cx, cy);
      ctx.rotate(-0.4);
      ctx.translate(-cx, -cy);
    }
    const stripeW = rx * 2 / 7;
    for (let i = -1; i < 8; i += 2) {
      ctx.fillRect(cx - rx - rx * 2 + i * stripeW, cy - ry * 2, stripeW, ry * 4);
    }
    ctx.restore();
  }

  function drawCleat(ctx, footX, footY, angle) {
    const sz = cleatSize();
    ctx.save();
    ctx.translate(footX, footY);
    ctx.rotate(angle);
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath();
    ctx.ellipse(sz.len * 0.15, 0, sz.len / 2, sz.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c95c0e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // sole
    ctx.fillStyle = '#1c5fd6';
    ctx.fillRect(-sz.len * 0.15, sz.h * 0.32, sz.len * 0.75, sz.h * 0.16);
    // laces
    ctx.strokeStyle = '#1c5fd6';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-sz.len * 0.05 + i * 6, -sz.h * 0.28);
      ctx.lineTo(sz.len * 0.05 + i * 6, sz.h * 0.05);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLeg(ctx, hipX, hipY, angle, extend) {
    const upperLen = BASE.upperLegLen;
    const lowerLen = BASE.lowerLegLen * (1 + extend * 0.3);
    const kneeX = hipX + Math.sin(angle) * upperLen;
    const kneeY = hipY + Math.cos(angle) * upperLen;
    const footAngle = angle + extend * 0.5;
    const footX = kneeX + Math.sin(footAngle) * lowerLen;
    const footY = kneeY + Math.cos(footAngle) * lowerLen;

    ctx.strokeStyle = '#6b4a2f';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();

    drawCleat(ctx, footX, footY, footAngle);
  }

  function drawArm(ctx, shoulderX, shoulderY, angle) {
    const len = BASE.armLen;
    const handX = shoulderX + Math.sin(angle) * len;
    const handY = shoulderY + Math.cos(angle) * len;
    ctx.strokeStyle = '#6b4a2f';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(handX, handY);
    ctx.stroke();
    ctx.fillStyle = '#5c3f28';
    ctx.beginPath();
    ctx.arc(handX, handY, 4, 0, Math.PI * 2);
    ctx.fill();
    return { x: handX, y: handY };
  }

  function drawEyes(ctx, cx, cy, r, expression) {
    const eyeOffsetX = r * 0.45;
    const eyeOffsetY = -r * 0.1;
    const eyeR = r * 0.4;
    [-1, 1].forEach(side => {
      const ex = cx + side * eyeOffsetX;
      const ey = cy + eyeOffsetY;
      ctx.fillStyle = '#fff';
      if (expression === 'happy') {
        ctx.beginPath();
        ctx.arc(ex, ey, eyeR, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ex, ey, eyeR, Math.PI, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.stroke();
        let pupilR = eyeR * 0.5;
        let pupilOffY = 0;
        if (expression === 'sad') pupilOffY = eyeR * 0.35;
        if (expression === 'shocked') pupilR = eyeR * 0.28;
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(ex, ey + pupilOffY, pupilR, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    if (expression === 'sad') {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.55, r * 0.3, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (expression === 'happy') {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.45, r * 0.35, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  }

  function drawRoach(ctx, opts) {
    const { x, y, scale, facing, team, role, pose } = opts;
    const p = pose || basePose();
    const turnFacing = facing * Math.cos(p.turnAmount * Math.PI);

    ctx.save();
    ctx.translate(x, y + p.hopOffset * scale);
    ctx.scale(scale * turnFacing, scale);

    // ground shadow (counter-scale to stay flat/consistent)
    ctx.save();
    ctx.scale(1 / (turnFacing || 1), 1);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 30, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const hipY = BASE.bodyRy - 2;
    const bodyCenterY = -(BASE.upperLegLen + BASE.lowerLegLen + hipY);

    ctx.save();
    ctx.translate(0, bodyCenterY);
    ctx.rotate(p.bodyLean * 0.3);

    // back leg + arm (drawn behind body)
    drawLeg(ctx, -6, hipY, p.legAngleR, p.kickExtend * 0.6);
    drawArm(ctx, -BASE.bodyRx * 0.6, -BASE.bodyRy * 0.2, p.armAngleR);

    // body
    drawJerseyFill(ctx, 0, 0, BASE.bodyRx * (1 + p.chestPuff * 0.12), BASE.bodyRy * (1 + p.chestPuff * 0.08), team);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, BASE.bodyRx, BASE.bodyRy, 0, 0, Math.PI * 2);
    ctx.stroke();

    // front leg
    drawLeg(ctx, 6, hipY, p.legAngleL, p.kickExtend);

    // front arm (may cover face)
    const armHand = drawArm(ctx, BASE.bodyRx * 0.6, -BASE.bodyRy * 0.2, p.armAngleL);

    // keeper gloves
    if (role === 'keeper') {
      ctx.fillStyle = '#f2f2f2';
      ctx.beginPath();
      ctx.arc(armHand.x, armHand.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // head
    const headX = BASE.bodyRx * 0.55;
    const headY = -BASE.bodyRy - BASE.headR * 0.6;
    ctx.save();
    ctx.translate(headX, headY);

    // antennae
    ctx.strokeStyle = '#4a3120';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    [-1, 1].forEach(side => {
      ctx.save();
      ctx.rotate(side * 0.5 + p.antennaWobble * side);
      ctx.beginPath();
      ctx.moveTo(0, -BASE.headR * 0.6);
      ctx.quadraticCurveTo(6, -BASE.headR * 1.8, 10, -BASE.headR * 2.4);
      ctx.stroke();
      ctx.fillStyle = '#4a3120';
      ctx.beginPath();
      ctx.arc(10, -BASE.headR * 2.4, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // head shape
    ctx.fillStyle = '#8a5a35';
    ctx.beginPath();
    ctx.ellipse(0, 0, BASE.headR, BASE.headR * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (p.faceCover < 0.5) {
      drawEyes(ctx, 0, 0, BASE.headR, p.eyeExpression);
    }
    ctx.restore();

    // arms covering face when faceCover active
    if (p.faceCover > 0.05) {
      ctx.fillStyle = 'rgba(0,0,0,0.0001)'; // no-op, arms already drawn above cover geometry approx.
    }

    ctx.restore(); // body group
    ctx.restore(); // outer
  }

  return { drawRoach, playAnimation, update, POSE_FNS };
})();
