window.PA = window.PA || {};

PA.Input = (function () {
  function attach(canvas) {
    canvas.addEventListener('pointerdown', (evt) => {
      evt.preventDefault();
      const pt = PA.Utils.toCanvasCoords(evt, canvas);
      if (PA.Game && PA.Game.onPointerDown) PA.Game.onPointerDown(pt);
    }, { passive: false });

    canvas.addEventListener('pointerup', (evt) => {
      evt.preventDefault();
      const pt = PA.Utils.toCanvasCoords(evt, canvas);
      if (PA.Game && PA.Game.onPointerUp) PA.Game.onPointerUp(pt);
    }, { passive: false });

    window.addEventListener('keydown', (evt) => {
      if (evt.code === 'Space' || evt.code === 'Enter') {
        if (PA.Game && PA.Game.onActionKey) PA.Game.onActionKey();
      }
    });
  }

  return { attach };
})();
