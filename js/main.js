(function () {
  window.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    PA.Input.attach(canvas);
    PA.Game.init();

    let lastTime = 0;
    function loop(ts) {
      const dt = lastTime ? Math.min(ts - lastTime, 50) : 16;
      lastTime = ts;
      PA.Game.update(dt);
      PA.Game.render(ctx);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });
})();
