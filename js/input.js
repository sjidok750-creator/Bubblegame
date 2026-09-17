/* ============================================================
   Input: keyboard + multi-touch on-screen buttons
   ============================================================ */
(function () {
  'use strict';
  const keys = { left: false, right: false, up: false, down: false, jump: false, fire: false, start: false };
  const pressed = { jump: false, fire: false, start: false }; // edge-triggered
  let anyTap = false;

  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    KeyZ: 'jump', Space: 'jump', KeyK: 'jump', ArrowUpJump: 'jump',
    KeyX: 'fire', ControlLeft: 'fire', KeyJ: 'fire', ShiftLeft: 'fire', KeyL: 'fire',
    Enter: 'start', Escape: 'pause', KeyP: 'pause', KeyM: 'mute'
  };

  function set(name, v) {
    if (name === 'pause' || name === 'mute') { if (v) pressed[name] = true; return; }
    if (v && !keys[name]) pressed[name] = true;
    keys[name] = v;
    if (v) anyTap = true;
  }

  window.addEventListener('keydown', e => {
    const k = KEYMAP[e.code];
    if (k) { set(k, true); e.preventDefault(); }
    if (e.code === 'ArrowUp') set('jump', true);
  });
  window.addEventListener('keyup', e => {
    const k = KEYMAP[e.code];
    if (k) { set(k, false); e.preventDefault(); }
    if (e.code === 'ArrowUp') set('jump', false);
  });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  // Touch buttons
  function bindButton(el, name) {
    if (!el) return;
    const on = e => { e.preventDefault(); el.classList.add('on'); set(name, true); };
    const off = e => { e.preventDefault(); el.classList.remove('on'); set(name, false); };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
    el.addEventListener('pointerout', off);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  // D-pad as one surface: supports sliding thumb between left/right
  function bindDpad(el) {
    if (!el) return;
    const active = new Map();
    function update() {
      let l = false, r = false;
      for (const dir of active.values()) { if (dir < 0) l = true; else if (dir > 0) r = true; }
      set('left', l); set('right', r);
      el.querySelector('.dl').classList.toggle('on', l);
      el.querySelector('.dr').classList.toggle('on', r);
    }
    function dirOf(e) {
      const rc = el.getBoundingClientRect();
      const rel = (e.clientX - rc.left) / rc.width;
      return rel < 0.5 ? -1 : 1;
    }
    el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); active.set(e.pointerId, dirOf(e)); update(); });
    el.addEventListener('pointermove', e => { if (active.has(e.pointerId)) { active.set(e.pointerId, dirOf(e)); update(); } });
    const end = e => { e.preventDefault(); active.delete(e.pointerId); update(); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  function initTouch() {
    bindDpad(document.getElementById('dpad'));
    bindButton(document.getElementById('btn-jump'), 'jump');
    bindButton(document.getElementById('btn-fire'), 'fire');
    const canvas = document.getElementById('game');
    canvas.addEventListener('pointerdown', e => { anyTap = true; pressed.start = true; e.preventDefault(); });
  }

  function consume(name) { const v = pressed[name]; pressed[name] = false; return v; }
  function consumeTap() { const v = anyTap; anyTap = false; return v; }

  window.Input = { keys, consume, consumeTap, initTouch };
})();
