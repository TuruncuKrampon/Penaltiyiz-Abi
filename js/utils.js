window.PA = window.PA || {};

PA.Utils = (function () {
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // Ping-pong triangle wave, returns 0..1
  function triangleWave(elapsedMs, periodMs) {
    const t = (elapsedMs % periodMs) / periodMs; // 0..1
    return t < 0.5 ? t * 2 : 2 - t * 2;
  }

  function toCanvasCoords(evt, canvas) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - r.left) * (canvas.width / r.width),
      y: (evt.clientY - r.top) * (canvas.height / r.height)
    };
  }

  function pointInRect(pt, rect) {
    return pt.x >= rect.x && pt.x <= rect.x + rect.w &&
           pt.y >= rect.y && pt.y <= rect.y + rect.h;
  }

  // Weighted-random pick from a map of {key: weight}
  function weightedPick(weights) {
    const keys = Object.keys(weights);
    const total = keys.reduce((s, k) => s + weights[k], 0);
    let r = Math.random() * total;
    for (const k of keys) {
      r -= weights[k];
      if (r <= 0) return k;
    }
    return keys[keys.length - 1];
  }

  function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function makeEmptyZoneHistory(zoneIds) {
    const h = {};
    zoneIds.forEach(id => { h[id] = 0; });
    return h;
  }

  return {
    clamp, lerp, easeOutQuad, easeInOutSine, easeOutBack, triangleWave,
    toCanvasCoords, pointInRect, weightedPick, randomInRange, makeEmptyZoneHistory
  };
})();
