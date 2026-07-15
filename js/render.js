window.PA = window.PA || {};

PA.Render = (function () {
  const CFG = PA.Config;

  function drawStadium(ctx) {
    const w = CFG.CANVAS_W, h = CFG.CANVAS_H;
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    sky.addColorStop(0, '#8fd0ff');
    sky.addColorStop(1, '#c9ecff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.42);

    // stands
    ctx.fillStyle = '#5a6b8c';
    ctx.fillRect(0, h * 0.06, w, h * 0.18);
    ctx.fillStyle = '#455579';
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#d8452f' : '#e8e8e8';
      ctx.fillRect(i * (w / 40), h * 0.06, w / 40 - 1, h * 0.05);
    }
    // floodlights
    [w * 0.06, w * 0.94].forEach(fx => {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(fx, h * 0.06);
      ctx.lineTo(fx, h * -0.02);
      ctx.stroke();
      ctx.fillStyle = '#fffbe0';
      ctx.fillRect(fx - 16, h * -0.04, 32, 10);
    });

    // pitch
    const pitchTop = h * 0.24;
    ctx.fillStyle = '#3fae4d';
    ctx.fillRect(0, pitchTop, w, h - pitchTop);
    ctx.fillStyle = '#39a146';
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) {
        ctx.beginPath();
        const yTop = pitchTop + (i / 8) * (h - pitchTop);
        const yBot = pitchTop + ((i + 1) / 8) * (h - pitchTop);
        ctx.moveTo(0, yTop);
        ctx.lineTo(w, yTop);
        ctx.lineTo(w, yBot);
        ctx.lineTo(0, yBot);
        ctx.fill();
      }
    }
    // penalty arc / box lines
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(CFG.GOAL_RECT.x - 60, CFG.GOAL_RECT.y + CFG.GOAL_RECT.h - 4, CFG.GOAL_RECT.w + 120, 150);
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.86, 55, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.82, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGoal(ctx) {
    const g = CFG.GOAL_RECT;
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 6;
    ctx.strokeRect(g.x, g.y, g.w, g.h);
    // side/back posts for depth
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x - 18, g.y + 14);
    ctx.moveTo(g.x + g.w, g.y);
    ctx.lineTo(g.x + g.w + 18, g.y + 14);
    ctx.stroke();
    // net crosshatch
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    const step = 20;
    for (let gx = g.x; gx <= g.x + g.w; gx += step) {
      ctx.beginPath();
      ctx.moveTo(gx, g.y);
      ctx.lineTo(gx, g.y + g.h);
      ctx.stroke();
    }
    for (let gy = g.y; gy <= g.y + g.h; gy += step) {
      ctx.beginPath();
      ctx.moveTo(g.x, gy);
      ctx.lineTo(g.x + g.w, gy);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBall(ctx, pos, scale) {
    scale = scale || 1;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function zoneCenter(zone) {
    return { x: zone.rect.x + zone.rect.w / 2, y: zone.rect.y + zone.rect.h / 2 };
  }

  function drawZoneGrid(ctx, { selectedZone, diveZone, interactive } = {}) {
    CFG.ZONES.forEach(z => {
      ctx.save();
      let fill = 'rgba(255,255,255,0.06)';
      if (selectedZone === z.id) fill = 'rgba(255, 210, 0, 0.32)';
      if (diveZone === z.id) fill = 'rgba(255, 60, 60, 0.28)';
      ctx.fillStyle = fill;
      ctx.fillRect(z.rect.x, z.rect.y, z.rect.w, z.rect.h);
      ctx.strokeStyle = interactive ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(z.rect.x, z.rect.y, z.rect.w, z.rect.h);
      ctx.restore();
    });
  }

  function drawPowerBar(ctx, { position, locked, accuracy, onTarget } = {}) {
    const w = 320, h = 22;
    const x = CFG.CANVAS_W / 2 - w / 2;
    const y = CFG.CANVAS_H - 46;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x - 6, y - 6, w + 12, h + 12);

    // bands
    const onTargetX = x + CFG.ON_TARGET_BAND[0] * w;
    const onTargetW = (CFG.ON_TARGET_BAND[1] - CFG.ON_TARGET_BAND[0]) * w;
    ctx.fillStyle = 'rgba(80, 200, 90, 0.55)';
    ctx.fillRect(onTargetX, y, onTargetW, h);

    const perfX = x + CFG.PERFECT_BAND[0] * w;
    const perfW = (CFG.PERFECT_BAND[1] - CFG.PERFECT_BAND[0]) * w;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.75)';
    ctx.fillRect(perfX, y, perfW, h);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // indicator
    const pos = position != null ? position : 0.5;
    const indicatorX = x + pos * w;
    ctx.fillStyle = locked ? (onTarget ? '#3fd15a' : '#ff4444') : '#fff';
    ctx.beginPath();
    ctx.moveTo(indicatorX, y - 8);
    ctx.lineTo(indicatorX - 7, y - 2);
    ctx.lineTo(indicatorX + 7, y - 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    words.forEach(word => {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = word;
      } else {
        cur = test;
      }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function drawSpeechBubble(ctx, { x, y, text, big }) {
    ctx.save();
    ctx.font = big ? 'bold 26px "Baloo 2", sans-serif' : 'bold 16px sans-serif';
    const maxWidth = 260;
    const lines = wrapText(ctx, text, maxWidth);
    const lineH = big ? 30 : 20;
    const padX = 18, padY = 14;
    const textWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
    const boxW = textWidth + padX * 2;
    const boxH = lines.length * lineH + padY * 2;
    const bx = PA.Utils.clamp(x - boxW / 2, 10, CFG.CANVAS_W - boxW - 10);
    const by = Math.max(10, y - boxH - 18);

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    roundRect(ctx, bx, by, boxW, boxH, 14);
    ctx.fill();
    ctx.stroke();

    // tail
    ctx.beginPath();
    ctx.moveTo(x - 10, by + boxH);
    ctx.lineTo(x + 14, by + boxH);
    ctx.lineTo(x, by + boxH + 18);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.stroke();

    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, i) => {
      ctx.fillText(line, bx + boxW / 2, by + padY + lineH * i + lineH / 2);
    });
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return {
    drawStadium, drawGoal, drawBall, drawZoneGrid, drawPowerBar,
    drawSpeechBubble, zoneCenter
  };
})();
