/* ============================================================
   Bubble Bobble — game engine
   ============================================================ */
(function () {
  'use strict';
  const W = 256, H = 224, T = 8, COLS = 32, ROWS = 28, PF_TOP = 8, PF_H = 216;
  const GRAV = 0.14, MAXFALL = 2.6, JUMP_V = -3.3;
  const BL = 3, BR = 13, BT = 2, BB = 16;             // entity collision box inside 16x16 sprite
  const SP = window.Sprites, AU = window.GameAudio, IN = window.Input, LV = window.Levels;

  let canvas, ctx, buf, bctx, lvlCanvas, oldLvlCanvas;
  const rnd = Math.random;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  const game = {
    state: 'title', round: 1, score: 0, hi: 30000, lives: 3, lvl: null, frame: 0,
    stateTimer: 0, roundTimer: 0, hurry: false, hurryText: 0, skel: null,
    extend: [false, false, false, false, false, false], chain: { count: 0, timer: 0 },
    specialTimer: 0, itemTimer: 0, itemSpawned: 0, popped: 0, nextLife: 30000,
    transition: null, bonus: 0, boss: null, shake: 0, continueTimer: 0, muted: false,
    introTimer: 0, titleTimer: 0, paused: false, flash: 0
  };
  const EXT = ['E', 'X', 'T', 'E', 'N', 'D'];
  const FRUITS = [
    ['banana', 1000], ['cherry', 2000], ['orange', 4000], ['grapes', 8000],
    ['melon', 16000], ['pear', 32000], ['apple', 64000], ['diamond', 64000]
  ];
  const ENEMY_DEF = {
    zen: { speed: 0.75, fly: false, spr: 'zen' },
    mighta: { speed: 0.7, fly: false, spr: 'mighta', shoot: 'boulder' },
    monsta: { speed: 0.9, fly: true, spr: 'monsta' },
    pulpul: { speed: 0.6, fly: true, spr: 'pulpul' },
    banebou: { speed: 0.8, fly: false, spr: 'banebou', bounce: true },
    hidegons: { speed: 0.75, fly: false, spr: 'hidegons', shoot: 'fireball' },
    drunk: { speed: 0.85, fly: false, spr: 'drunk', shoot: 'bottle' },
    invader: { speed: 0.8, fly: true, spr: 'invader', shoot: 'laser' }
  };

  let player, enemies, bubbles, items, projs, effects, flows, flames;

  // ------------------------------------------------------------------
  // Tile helpers
  // ------------------------------------------------------------------
  function tile(c, r) {
    if (c < 0 || c >= COLS) return 1;
    if (r < 1) return 0;
    if (r >= ROWS) r -= (ROWS - 1);
    return game.lvl.map[r][c];
  }
  function solidPx(px, py) {
    if (py >= H) py -= PF_H;
    return tile(Math.floor(px / T), Math.floor(py / T)) === 1;
  }
  function wallPx(px) { const c = Math.floor(px / T); return c < 2 || c >= COLS - 2; }
  function surfaceSpan(x0, x1, ty) {
    if (ty >= H) ty -= PF_H;
    const r = Math.floor(ty / T);
    const c0 = Math.floor(x0 / T), c1 = Math.floor(x1 / T);
    for (let c = c0; c <= c1; c++) if (tile(c, r) === 1 && tile(c, r - 1) === 0) return true;
    return false;
  }
  function boxSolid(x0, y0, x1, y1) {
    for (let py = y0; py <= y1 + T; py += T) {
      const yy = Math.min(py, y1);
      for (let px = x0; px <= x1 + T; px += T) {
        if (solidPx(Math.min(px, x1), yy)) return true;
      }
    }
    return false;
  }

  // Walker physics (player & ground enemies). One-way platforms, wrap-around.
  function physWalk(e) {
    e.hitWall = false;
    const embedded = solidPx(e.x + 8, e.y + 9);
    e.x += e.vx;
    const yTop = e.y + BT + 1, yMid = e.y + 9, yBot = e.y + BB - 1;
    const rows = [yTop, yMid, yBot];
    const movingUp = e.vy < 0;
    if (e.vx > 0) {
      const px = e.x + BR - 1;
      for (const py of rows) {
        if ((wallPx(px)) || (!movingUp && !embedded && solidPx(px, py))) { e.x = Math.floor(px / T) * T - BR; e.hitWall = true; break; }
      }
    } else if (e.vx < 0) {
      const px = e.x + BL;
      for (const py of rows) {
        if ((wallPx(px)) || (!movingUp && !embedded && solidPx(px, py))) { e.x = Math.floor(px / T) * T + T - BL; e.hitWall = true; break; }
      }
    }
    const prevBot = e.y + BB;
    e.vy += GRAV; if (e.vy > MAXFALL) e.vy = MAXFALL;
    e.y += e.vy;
    e.onGround = false;
    if (e.vy > 0) {
      const newBot = e.y + BB;
      for (let ty = Math.ceil(prevBot / T) * T; ty <= newBot; ty += T) {
        if (surfaceSpan(e.x + BL, e.x + BR - 1, ty)) { e.y = ty - BB; e.vy = 0; e.onGround = true; break; }
      }
    } else if (e.vy < 0) {
      if (e.y + BT < PF_TOP) { e.y = PF_TOP - BT; e.vy = 0; }
    }
    if (e.y + BT >= H) { e.y -= PF_H; }
  }
  // Flying physics: bounce off any solid
  function physFly(e) {
    e.hitWall = false;
    let nx = e.x + e.vx;
    if (boxSolid(nx + BL, e.y + BT, nx + BR - 1, e.y + BB - 1) || nx + BL < 16 || nx + BR > W - 16) { e.vx = -e.vx; e.hitWall = true; } else e.x = nx;
    let ny = e.y + e.vy;
    if (boxSolid(e.x + BL, ny + BT, e.x + BR - 1, ny + BB - 1) || ny + BT < PF_TOP || ny + BB > H - 8) { e.vy = -e.vy; } else e.y = ny;
  }

  // ------------------------------------------------------------------
  // Round setup
  // ------------------------------------------------------------------
  function loadRound(n, keepOld) {
    if (keepOld && lvlCanvas) oldLvlCanvas = lvlCanvas;
    game.round = n;
    game.lvl = n >= 100 ? LV.buildBoss() : LV.build(n);
    lvlCanvas = renderLevel(game.lvl);
    enemies = []; bubbles = []; items = []; projs = []; effects = []; flows = []; flames = [];
    game.skel = null; game.hurry = false; game.hurryText = 0; game.roundTimer = 0;
    game.specialTimer = 500 + Math.floor(rnd() * 400); game.itemTimer = 0; game.itemSpawned = 0; game.popped = 0;
    game.chain = { count: 0, timer: 0 }; game.bonus = 0; game.boss = null;
    let i = 0;
    for (const s of game.lvl.spawns) { enemies.push(makeEnemy(s.type, s.x, s.y, 40 + i * 12)); i++; }
    if (game.lvl.boss) makeBoss();
    resetPlayerPos();
    player.invul = 100;
    if (AU.currentMusic() !== (game.lvl.boss ? 'boss' : 'main')) AU.playMusic(game.lvl.boss ? 'boss' : 'main');
    AU.setTempo(1);
  }
  function resetPlayerPos() {
    player.x = 20; player.y = 200; player.vx = 0; player.vy = 0; player.dir = 1; player.onGround = false; player.riding = null; player.carried = null;
  }
  function newPlayer() {
    return {
      x: 20, y: 200, vx: 0, vy: 0, dir: 1, onGround: false, jumpHeld: false, anim: 0, blowT: 0, cool: 0, invul: 0,
      speed: 1, blowRate: 1, bubSpeed: 1, bubRange: 1, riding: null, carried: null, dead: false
    };
  }
  function makeEnemy(type, x, y, delay) {
    const d = ENEMY_DEF[type];
    return {
      type, x, y, vx: 0, vy: 0, dir: rnd() < 0.5 ? -1 : 1, onGround: false, state: 'appear', timer: delay || 0,
      angry: game.hurry, anim: 0, fly: d.fly, speed: d.speed * (1 + Math.min(0.6, game.round * 0.006)), cool: 60 + Math.floor(rnd() * 120), jumpT: 0
    };
  }
  function makeBoss() {
    game.boss = { x: 112, y: 100, vx: 1.2, vy: 0, dir: 1, hp: 40, maxHp: 40, timer: 0, hit: 0, anim: 0, dead: false, appear: 90 };
  }

  // ------------------------------------------------------------------
  // Level pre-render
  // ------------------------------------------------------------------
  function renderLevel(lvl) {
    const c = SP.makeCanvas(W, H);
    const g = c.getContext('2d');
    const pal = lvl.palette;
    // shadows first (cast right & below)
    g.fillStyle = hexA(pal.lo, 0.55);
    for (let r = 1; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
      if (lvl.map[r][col] !== 1) continue;
      if (col + 1 < COLS && lvl.map[r][col + 1] === 0) g.fillRect((col + 1) * T, r * T + 3, 4, T);
      if (r + 1 < ROWS && lvl.map[r + 1][col] === 0) g.fillRect(col * T + 3, (r + 1) * T, T, 3);
      if (col + 1 < COLS && r + 1 < ROWS && lvl.map[r + 1][col + 1] === 0 && lvl.map[r][col + 1] === 0 && lvl.map[r + 1][col] === 0) g.fillRect((col + 1) * T, (r + 1) * T, 4, 3);
    }
    const tileImg = makeTile(pal, false), wallImg = makeTile(pal, true);
    for (let r = 1; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
      if (lvl.map[r][col] !== 1) continue;
      const isWall = col < 2 || col >= COLS - 2;
      g.drawImage(isWall ? wallImg : tileImg, col * T, r * T);
    }
    return c;
  }
  function hexA(hex, a) {
    const r = parseInt(hex.substr(1, 2), 16), gg = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    return `rgba(${r},${gg},${b},${a})`;
  }
  function makeTile(pal, wall) {
    const c = SP.makeCanvas(T, T);
    const g = c.getContext('2d');
    g.fillStyle = pal.base; g.fillRect(0, 0, T, T);
    g.fillStyle = pal.hi; g.fillRect(0, 0, T, 1); g.fillRect(0, 0, 1, T);
    g.fillStyle = pal.lo; g.fillRect(0, T - 1, T, 1); g.fillRect(T - 1, 0, 1, T);
    g.fillStyle = wall ? pal.hi : pal.acc;
    switch (pal.pat) {
      case 0: g.fillRect(3, 3, 2, 2); break;
      case 1: g.fillRect(2, 2, 1, 1); g.fillRect(5, 2, 1, 1); g.fillRect(2, 5, 1, 1); g.fillRect(5, 5, 1, 1); break;
      case 2: g.fillRect(3, 2, 1, 1); g.fillRect(2, 3, 1, 1); g.fillRect(4, 3, 1, 1); g.fillRect(3, 4, 1, 1); break;
      case 3: g.fillRect(2, 3, 4, 1); break;
      case 4: g.fillRect(2, 2, 1, 1); g.fillRect(3, 3, 1, 1); g.fillRect(4, 4, 1, 1); g.fillRect(5, 5, 1, 1); break;
      case 5: g.fillRect(3, 2, 2, 1); g.fillRect(2, 3, 1, 2); g.fillRect(5, 3, 1, 2); g.fillRect(3, 5, 2, 1); break;
    }
    if (wall) { g.fillStyle = hexA(pal.lo, 0.5); g.fillRect(1, 1, 3, 3); }
    return c;
  }

  // ------------------------------------------------------------------
  // Player
  // ------------------------------------------------------------------
  function updatePlayer() {
    const p = player, k = IN.keys;
    if (p.invul > 0) p.invul--;
    if (p.cool > 0) p.cool--;
    if (p.blowT > 0) p.blowT--;
    if (p.carried) { // riding a water flow
      const f = p.carried;
      if (!f.alive || IN.consume('jump')) { p.carried = null; p.vy = JUMP_V * 0.8; AU.sfx('jump'); }
      else { p.x = f.x - 8; p.y = f.y - 12; p.vx = 0; p.vy = 0; return; }
    }
    const sp = 1.05 * p.speed;
    if (k.left) { p.vx = -sp; p.dir = -1; }
    else if (k.right) { p.vx = sp; p.dir = 1; }
    else p.vx = 0;

    // bubble riding
    if (p.riding) {
      const b = p.riding;
      if (!b.alive || b.popping) p.riding = null;
      else { p.y = b.cy - 8 - BB; p.vy = 0; p.onGround = true; }
    }
    if (IN.consume('jump') && (p.onGround || p.riding)) {
      p.vy = JUMP_V; p.onGround = false; p.riding = null; AU.sfx('jump');
    }
    if (p.riding) { p.x += p.vx; if (p.x < 16) p.x = 16; if (p.x > W - 32) p.x = W - 32; }
    else physWalk(p);
    if (p.onGround) p.riding = p.riding;
    // blow bubble
    if (IN.consume('fire') || (k.fire && p.cool === 0 && p.blowRate > 1)) {
      if (p.cool === 0) { blowBubble(); p.cool = Math.round(18 / p.blowRate); p.blowT = 12; }
    }
    p.anim++;
  }
  function blowBubble() {
    const p = player;
    const b = makeBubble(p.x + 8 + p.dir * 12, p.y + 8, 'normal');
    b.vx = p.dir * 3.2 * p.bubSpeed; b.phase = 'shot'; b.range = 52 * p.bubRange;
    bubbles.push(b);
    AU.sfx('blow');
  }
  function makeBubble(cx, cy, kind) {
    return { cx, cy, vx: 0, vy: 0, phase: 'float', dist: 0, range: 0, life: kind === 'normal' ? 660 : 900, age: 0, kind, enemy: null, wob: rnd() * 6.28, alive: true, popping: false, popDelay: 0, letter: null, r: 8, squash: 0 };
  }

  // ------------------------------------------------------------------
  // Bubbles
  // ------------------------------------------------------------------
  function gatherX() {
    const w = game.lvl.wind;
    return w === 'L' ? 40 : w === 'R' ? W - 40 : W / 2;
  }
  function bubbleFree(cx, cy) {
    // bubble may occupy a spot if its bounding square (r-1) touches no solid
    const r = 6;
    return !(solidPx(cx - r, cy - r) || solidPx(cx + r, cy - r) || solidPx(cx - r, cy + r) || solidPx(cx + r, cy + r) || solidPx(cx, cy - r) || solidPx(cx, cy + r) || solidPx(cx - r, cy) || solidPx(cx + r, cy));
  }
  function updateBubbles() {
    const gx = gatherX();
    for (const b of bubbles) {
      if (!b.alive) continue;
      b.age++;
      if (b.popping) { b.popDelay--; if (b.popDelay <= 0) popBubble(b); continue; }
      if (b.squash > 0) b.squash--;
      if (b.phase === 'shot') {
        const nx = b.cx + b.vx;
        if (!bubbleFree(nx, b.cy) || Math.abs(b.vx) < 0.35) { b.phase = 'float'; b.vx = 0; }
        else { b.cx = nx; b.dist += Math.abs(b.vx); b.vx *= 0.955; if (b.dist > b.range) b.vx *= 0.8; }
      } else if (b.phase === 'enter') {
        b.cy -= 0.35;
        if (b.cy < H - 20 && bubbleFree(b.cx, b.cy)) b.phase = 'float';
        if (b.cy < H - 60) b.phase = 'float';
      } else {
        // floating: rise if free above, else drift toward gather point
        let up = bubbleFree(b.cx, b.cy - 0.4) && b.cy - b.r > PF_TOP + 1;
        let dx = 0;
        const wind = game.lvl.wind;
        if (up) {
          b.cy -= 0.32;
          dx = wind === 'L' ? -0.12 : wind === 'R' ? 0.12 : (gx - b.cx) * 0.001;
        } else {
          dx = Math.sign(gx - b.cx) * 0.4;
          if (Math.abs(gx - b.cx) < 2) dx = 0;
        }
        if (dx !== 0 && bubbleFree(b.cx + dx, b.cy)) b.cx += dx;
        if (b.cy - b.r < PF_TOP + 1) b.cy = PF_TOP + 1 + b.r;
        // gentle bob
        b.cy += Math.sin(b.age * 0.08 + b.wob) * 0.05;
      }
      // trapping
      if (!b.enemy && b.kind === 'normal' && (b.phase === 'shot' || b.age < 45)) {
        for (const e of enemies) {
          if (e.state !== 'active') continue;
          if (circleBox(b.cx, b.cy, 9, e.x + BL, e.y + BT, e.x + BR, e.y + BB)) {
            b.enemy = e; e.state = 'trapped'; b.phase = 'float'; b.vx = 0; b.life = 480; b.age = 60;
            AU.sfx('trap');
            break;
          }
        }
      }
      b.life--;
      if (b.life <= 0) {
        if (b.enemy) { releaseEnemy(b); }
        else { b.popping = true; b.popDelay = 0; }
      }
    }
    // repulsion between bubbles
    for (let i = 0; i < bubbles.length; i++) {
      const a = bubbles[i]; if (!a.alive || a.popping || a.phase === 'shot') continue;
      for (let j = i + 1; j < bubbles.length; j++) {
        const c = bubbles[j]; if (!c.alive || c.popping || c.phase === 'shot') continue;
        const dx = c.cx - a.cx, dy = c.cy - a.cy, d2 = dx * dx + dy * dy;
        if (d2 < 196 && d2 > 0.01) {
          const d = Math.sqrt(d2), push = (14 - d) * 0.18;
          const ux = dx / d, uy = dy / d;
          if (bubbleFree(a.cx - ux * push, a.cy - uy * push)) { a.cx -= ux * push; a.cy -= uy * push; }
          if (bubbleFree(c.cx + ux * push, c.cy + uy * push)) { c.cx += ux * push; c.cy += uy * push; }
        }
      }
    }
    bubbles = bubbles.filter(b => b.alive);
  }
  function circleBox(cx, cy, r, x0, y0, x1, y1) {
    const nx = clamp(cx, x0, x1), ny = clamp(cy, y0, y1);
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
  }
  function releaseEnemy(b) {
    const e = b.enemy;
    e.x = b.cx - 8; e.y = b.cy - 8; e.state = 'active'; e.angry = true; e.vy = 0; e.vx = 0;
    e.cool = 60;
    b.enemy = null; b.alive = false;
    effects.push({ kind: 'pop', x: b.cx, y: b.cy, life: 12, red: true });
    AU.sfx('pop');
  }
  function schedulePop(b, delay) {
    if (!b.alive || b.popping) return;
    b.popping = true; b.popDelay = delay;
  }
  function popBubble(b) {
    if (!b.alive) return;
    b.alive = false;
    effects.push({ kind: 'pop', x: b.cx, y: b.cy, life: 12, kind2: b.kind });
    AU.sfx('pop');
    if (player.riding === b) player.riding = null;
    // chain neighbours
    for (const o of bubbles) {
      if (o === b || !o.alive || o.popping || o.phase === 'shot' || o.phase === 'enter') continue;
      const dx = o.cx - b.cx, dy = o.cy - b.cy;
      if (dx * dx + dy * dy < 22 * 22) schedulePop(o, 4);
    }
    if (b.enemy) {
      killEnemy(b.enemy, b.cx, b.cy);
      b.enemy = null;
    } else if (b.kind === 'normal') {
      addScore(10);
      game.popped++;
    } else if (b.kind === 'fire') {
      projs.push({ kind: 'firedrop', x: b.cx - 4, y: b.cy - 4, vx: 0, vy: 0.5, life: 400, w: 8, h: 8 });
      AU.sfx('fire');
    } else if (b.kind === 'water') {
      spawnFlow(b.cx, b.cy, player.dir);
      AU.sfx('water');
    } else if (b.kind === 'bolt') {
      projs.push({ kind: 'bolt', x: b.cx - 8, y: b.cy - 4, vx: -player.dir * 3.5, vy: 0, life: 120, w: 16, h: 8 });
      AU.sfx('bolt');
    } else if (b.kind === 'extend') {
      collectLetter(b.letter);
    }
  }
  function collectLetter(idx) {
    AU.sfx('letter');
    game.extend[idx] = true;
    effects.push({ kind: 'text', x: player.x + 8, y: player.y - 8, life: 50, text: EXT[idx], color: '#ff90f0' });
    if (game.extend.every(v => v)) {
      game.extend = [false, false, false, false, false, false];
      game.lives++;
      AU.playMusic('extend');
      effects.push({ kind: 'text', x: W / 2, y: 100, life: 120, text: 'EXTEND!! 1UP', color: '#ffe860', big: true });
      setTimeout(() => { if (game.state === 'play') AU.playMusic(game.lvl.boss ? 'boss' : 'main', game.hurry ? 1.25 : 1); }, 2500);
    }
  }

  // ------------------------------------------------------------------
  // Enemies
  // ------------------------------------------------------------------
  function updateEnemies() {
    for (const e of enemies) {
      if (e.state === 'appear') { e.timer--; if (e.timer <= 0) e.state = 'active'; continue; }
      if (e.state !== 'active') continue;
      const d = ENEMY_DEF[e.type];
      const sp = e.speed * (e.angry ? 1.55 : 1) * (game.bonus > 0 ? 0 : 1);
      e.anim++;
      if (e.cool > 0) e.cool--;
      const px = player.x, py = player.y;
      if (!e.fly) {
        if (e.onGround) {
          e.vx = e.dir * sp;
          if (d.bounce && sp > 0) { e.vy = JUMP_V * (0.7 + rnd() * 0.3); }
          else if (sp > 0) {
            // jump if player is above and roughly aligned, or occasionally
            if (e.jumpT > 0) e.jumpT--;
            if (e.jumpT === 0 && py < e.y - 20 && Math.abs(px - e.x) < 48 && rnd() < 0.05) { e.vy = JUMP_V; e.jumpT = 50; }
            // turn toward the player sometimes
            if (rnd() < 0.008) e.dir = px > e.x ? 1 : -1;
            // avoid walking off edges sometimes (not always: original monsters do drop)
            const aheadX = e.dir > 0 ? e.x + BR + 2 : e.x + BL - 2;
            if (!solidPx(aheadX, e.y + BB + 1) && rnd() < 0.5 && e.jumpT === 0 && py < e.y + 8) { e.dir = -e.dir; e.jumpT = 20; }
          }
        }
        if (d.shoot && e.cool === 0 && sp > 0) enemyShoot(e, d.shoot);
        physWalk(e);
        if (e.hitWall) { e.dir = -e.dir; e.vx = 0; }
      } else {
        if (e.type === 'monsta') {
          if (e.vx === 0 && e.vy === 0) { e.vx = e.dir * sp; e.vy = -sp; }
          const m = Math.abs(e.vx) || sp; const s = sp || 0.0001;
          e.vx = Math.sign(e.vx || e.dir) * s; e.vy = Math.sign(e.vy || -1) * s;
          if (rnd() < 0.004) e.vx = Math.sign(px - e.x || 1) * s;
          physFly(e);
          e.dir = e.vx >= 0 ? 1 : -1;
        } else if (e.type === 'pulpul') {
          const ax = Math.sign(px - e.x) * 0.03, ay = Math.sign(py - e.y) * 0.02;
          e.vx = clamp(e.vx + ax + Math.sin(e.anim * 0.1) * 0.01, -sp, sp);
          e.vy = clamp(e.vy + ay, -sp * 0.7, sp * 0.7);
          if (sp === 0) { e.vx = 0; e.vy = 0; }
          physFly(e);
          e.dir = e.vx >= 0 ? 1 : -1;
        } else if (e.type === 'invader') {
          if (e.vx === 0) e.vx = e.dir * sp;
          e.vx = Math.sign(e.vx) * sp; e.vy = Math.sin(e.anim * 0.05) * 0.3;
          if (rnd() < 0.006) e.vy = Math.sign(py - e.y) * 0.8;
          physFly(e);
          e.dir = e.vx >= 0 ? 1 : -1;
          if (d.shoot && e.cool === 0 && sp > 0 && Math.abs(px - e.x) < 24 && py > e.y) enemyShoot(e, 'laser');
        }
      }
      // player collision
      if (player.invul === 0 && !player.dead && rectHit(e.x + BL + 1, e.y + BT + 1, e.x + BR - 1, e.y + BB - 1, player.x + BL + 1, player.y + BT + 1, player.x + BR - 1, player.y + BB - 1)) killPlayer();
      // flames / flows / projectiles kill enemies
      for (const f of flames) if (f.life > 0 && rectHit(f.x, f.y, f.x + 8, f.y + 8, e.x + BL, e.y + BT, e.x + BR, e.y + BB)) { killEnemy(e, e.x + 8, e.y + 8, true); break; }
    }
  }
  function enemyShoot(e, kind) {
    const px = player.x, py = player.y;
    const facing = (px - e.x) * e.dir > 0;
    if (kind === 'boulder') {
      if (Math.abs(py - e.y) < 20 && facing && Math.abs(px - e.x) < 120) {
        projs.push({ kind: 'boulder', x: e.x + 4 + e.dir * 8, y: e.y + 6, vx: e.dir * 1.8, vy: 0, life: 200, w: 8, h: 8, grav: true });
        e.cool = 150 + Math.floor(rnd() * 100); AU.sfx('throw');
      }
    } else if (kind === 'fireball') {
      if (Math.abs(py - e.y) < 24 && facing) {
        projs.push({ kind: 'fireball', x: e.x + 4 + e.dir * 8, y: e.y + 6, vx: e.dir * 2.2, vy: 0, life: 150, w: 8, h: 8 });
        e.cool = 170 + Math.floor(rnd() * 100); AU.sfx('throw');
      }
    } else if (kind === 'bottle') {
      if (facing && Math.abs(px - e.x) < 140) {
        projs.push({ kind: 'bottle', x: e.x + 4, y: e.y + 4, vx: e.dir * 2.6, vy: 0, life: 160, w: 8, h: 8, ret: e, t: 0 });
        e.cool = 200 + Math.floor(rnd() * 100); AU.sfx('throw');
      }
    } else if (kind === 'laser') {
      projs.push({ kind: 'laser', x: e.x + 4, y: e.y + 12, vx: 0, vy: 2.5, life: 120, w: 8, h: 8 });
      e.cool = 130 + Math.floor(rnd() * 100); AU.sfx('throw');
    }
  }
  function rectHit(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1) {
    return ax0 < bx1 && ax1 > bx0 && ay0 < by1 && ay1 > by0;
  }
  function killEnemy(e, cx, cy, byHazard) {
    if (e.state === 'dead') return;
    e.state = 'dead';
    AU.sfx('kill');
    // chain counting
    if (game.chain.timer > 0) game.chain.count++; else game.chain.count = 1;
    game.chain.timer = 45;
    const idx = Math.min(game.chain.count, FRUITS.length) - 1;
    const fr = FRUITS[idx];
    const dir = cx < player.x + 8 ? -1 : 1;
    items.push({ kind: 'fruit', spr: fr[0], value: fr[1], x: cx - 8, y: cy - 8, vx: dir * (1 + rnd()) * (byHazard ? 0.5 : 1), vy: -2.6, onGround: false, life: 720, alive: true });
    effects.push({ kind: 'text', x: cx, y: cy - 4, life: 40, text: String(fr[1]), color: '#ffffff' });
    addScore(fr[1]);
    enemies = enemies.filter(x => x !== e);
  }
  function killPlayer() {
    if (player.dead) return;
    player.dead = true;
    game.state = 'dying'; game.stateTimer = 110;
    player.vy = -2.5; player.riding = null; player.carried = null;
    AU.stopMusic(); AU.sfx('hurt'); AU.playMusic('death');
  }

  // ------------------------------------------------------------------
  // Projectiles, flames, water flows
  // ------------------------------------------------------------------
  function updateProjs() {
    for (const p of projs) {
      p.life--;
      if (p.kind === 'boulder') {
        p.vy += GRAV; p.x += p.vx; p.y += p.vy;
        if (solidPx(p.x + 4, p.y + 8)) { p.y = Math.floor((p.y + 8) / T) * T - 8; p.vy = 0; }
        if (solidPx(p.x + (p.vx > 0 ? 8 : 0), p.y + 4)) p.life = 0;
        if (p.y > H) p.life = 0;
      } else if (p.kind === 'fireball' || p.kind === 'laser') {
        p.x += p.vx; p.y += p.vy;
        if (solidPx(p.x + 4, p.y + 4)) p.life = 0;
      } else if (p.kind === 'bottle') {
        p.t++;
        p.vx *= 0.975; if (p.t === 60) p.vx = -p.vx * 1.0; p.x += p.vx;
        p.y += Math.sin(p.t * 0.2) * 0.5;
        if (wallPx(p.x + 4) || wallPx(p.x + 4)) p.life = 0;
      } else if (p.kind === 'firedrop') {
        p.vy += GRAV; if (p.vy > 2.5) p.vy = 2.5; p.y += p.vy;
        if (p.y + 8 >= H) { p.life = 0; continue; }
        if (solidPx(p.x + 4, p.y + 8)) {
          p.life = 0;
          const r = Math.floor((p.y + 8) / T), c = Math.floor((p.x + 4) / T);
          spawnFlames(c, r - 1);
        }
      } else if (p.kind === 'bolt') {
        p.x += p.vx;
        if (wallPx(p.x + (p.vx > 0 ? 16 : 0))) p.life = 0;
        for (const e of enemies) if (e.state === 'active' && rectHit(p.x, p.y, p.x + 16, p.y + 8, e.x + BL, e.y + BT, e.x + BR, e.y + BB)) killEnemy(e, e.x + 8, e.y + 8, true);
        if (game.boss && !game.boss.dead && rectHit(p.x, p.y, p.x + 16, p.y + 8, game.boss.x, game.boss.y, game.boss.x + 32, game.boss.y + 32)) { hitBoss(3); p.life = 0; }
      }
      // hurts player?
      if ((p.kind === 'boulder' || p.kind === 'fireball' || p.kind === 'laser' || p.kind === 'bottle') && player.invul === 0 && !player.dead) {
        if (rectHit(p.x + 1, p.y + 1, p.x + 7, p.y + 7, player.x + BL, player.y + BT, player.x + BR, player.y + BB)) killPlayer();
      }
      // bubble hits (player bubbles pop hostile projectiles? no) — fire drop touches enemies
      if (p.kind === 'firedrop') for (const e of enemies) if (e.state === 'active' && rectHit(p.x, p.y, p.x + 8, p.y + 8, e.x + BL, e.y + BT, e.x + BR, e.y + BB)) killEnemy(e, e.x + 8, e.y + 8, true);
    }
    projs = projs.filter(p => p.life > 0);
    for (const f of flames) { f.life--; f.anim++; }
    flames = flames.filter(f => f.life > 0);
    updateFlows();
  }
  function spawnFlames(c, r) {
    for (let i = 0; i < 7; i++) {
      for (const s of [-1, 1]) {
        if (i === 0 && s === 1) continue;
        const cc = c + i * s;
        if (cc < 2 || cc >= COLS - 2) break;
        if (tile(cc, r + 1) !== 1 || tile(cc, r) === 1) break;
        flames.push({ x: cc * T, y: r * T, life: 150 - i * 8, delay: i * 5, anim: i * 3 });
      }
    }
  }
  function spawnFlow(x, y, dir) {
    flows.push({ x, y, dir, vy: 0, life: 420, trail: [], carried: [], alive: true, falling: true });
  }
  function updateFlows() {
    for (const f of flows) {
      if (!f.alive) continue;
      f.life--;
      f.trail.unshift({ x: f.x, y: f.y }); if (f.trail.length > 10) f.trail.pop();
      // fall if nothing below, else run along the surface
      if (!solidPx(f.x, f.y + 5)) { f.y += 2.2; f.falling = true; }
      else {
        f.falling = false;
        const nx = f.x + f.dir * 2.2;
        if (solidPx(nx + f.dir * 3, f.y)) f.dir = -f.dir; else f.x = nx;
      }
      if (f.y >= H) { f.y -= PF_H; }
      if (f.life <= 0) {
        f.alive = false;
        for (const e of f.carried) killEnemy(e, f.x, f.y, true);
        f.carried = [];
      }
      // carry enemies
      for (const e of enemies) {
        if (e.state !== 'active') continue;
        if (circleBox(f.x, f.y, 7, e.x + BL, e.y + BT, e.x + BR, e.y + BB) || f.trail.some(t => circleBox(t.x, t.y, 6, e.x + BL, e.y + BT, e.x + BR, e.y + BB))) {
          e.state = 'washed'; f.carried.push(e);
        }
      }
      f.carried.forEach((e, i) => { const t = f.trail[Math.min(i + 1, f.trail.length - 1)] || f; e.x = t.x - 8; e.y = t.y - 8; });
      // carry player
      if (!player.dead && !player.carried && circleBox(f.x, f.y, 7, player.x + BL, player.y + BT, player.x + BR, player.y + BB)) { player.carried = f; }
    }
    flows = flows.filter(f => f.alive);
  }

  // ------------------------------------------------------------------
  // Items
  // ------------------------------------------------------------------
  const ITEM_TABLE = [
    ['candyPink', 18], ['candyBlue', 14], ['candyYellow', 14], ['shoes', 16], ['umbrella', 5], ['crossFire', 5], ['crossWater', 5], ['crossBolt', 5], ['potion', 4]
  ];
  function itemSprite(kind) {
    switch (kind) {
      case 'candyPink': return SP.get('candy');
      case 'candyBlue': return SP.get('candy', { swap: SP.SWAPS.candyBlue, swapKey: 'cb' });
      case 'candyYellow': return SP.get('candy', { swap: SP.SWAPS.candyYellow, swapKey: 'cy' });
      case 'crossFire': return SP.get('cross');
      case 'crossWater': return SP.get('cross', { swap: SP.SWAPS.crossBlue, swapKey: 'xb' });
      case 'crossBolt': return SP.get('cross', { swap: SP.SWAPS.crossYellow, swapKey: 'xy' });
      default: return SP.get(kind);
    }
  }
  function randomSpot() {
    const spots = [];
    const m = game.lvl.map;
    for (let r = 4; r < ROWS - 1; r++) for (let c = 3; c < COLS - 3; c++) {
      if (m[r][c] === 1 && m[r - 1][c] === 0 && m[r - 2][c] === 0 && m[r - 1][c + 1] === 0 && m[r - 2][c + 1] === 0 && m[r][c + 1] === 1) spots.push({ x: c * T, y: (r - 2) * T });
    }
    return spots[Math.floor(rnd() * spots.length)] || { x: 120, y: 40 };
  }
  function spawnBonusItem() {
    let total = 0; for (const t of ITEM_TABLE) total += t[1];
    let v = rnd() * total, kind = 'candyPink';
    for (const t of ITEM_TABLE) { v -= t[1]; if (v <= 0) { kind = t[0]; break; } }
    const s = randomSpot();
    items.push({ kind, spr: kind, value: 500, x: s.x, y: s.y, vx: 0, vy: 0, onGround: false, life: 660, alive: true });
    game.itemSpawned++;
  }
  function updateItems() {
    for (const it of items) {
      if (!it.alive) continue;
      it.life--;
      if (it.life <= 0) { it.alive = false; continue; }
      if (!it.onGround) {
        it.x += it.vx;
        if (it.x < 16) { it.x = 16; it.vx = -it.vx; } if (it.x > W - 32) { it.x = W - 32; it.vx = -it.vx; }
        const prevBot = it.y + 16;
        it.vy += GRAV; if (it.vy > MAXFALL) it.vy = MAXFALL;
        it.y += it.vy;
        if (it.vy > 0) {
          const nb = it.y + 16;
          for (let ty = Math.ceil(prevBot / T) * T; ty <= nb; ty += T) {
            if (surfaceSpan(it.x + 4, it.x + 12, ty)) { it.y = ty - 16; it.vy = 0; it.onGround = true; it.vx = 0; break; }
          }
        }
        if (it.y >= H) it.y -= PF_H;
      }
      // pick up
      if (!player.dead && rectHit(it.x + 2, it.y + 2, it.x + 14, it.y + 16, player.x + BL, player.y + BT, player.x + BR, player.y + BB)) {
        it.alive = false;
        pickUp(it);
      }
    }
    items = items.filter(i => i.alive);
  }
  function pickUp(it) {
    if (it.kind === 'fruit') {
      addScore(it.value); AU.sfx('fruit');
      effects.push({ kind: 'text', x: it.x + 8, y: it.y, life: 45, text: String(it.value), color: '#ffe860' });
      return;
    }
    AU.sfx('item');
    addScore(it.value);
    effects.push({ kind: 'text', x: it.x + 8, y: it.y, life: 45, text: String(it.value), color: '#ffe860' });
    switch (it.kind) {
      case 'candyPink': player.blowRate = 2.2; break;
      case 'candyBlue': player.bubSpeed = 1.6; break;
      case 'candyYellow': player.bubRange = 2.2; break;
      case 'shoes': player.speed = 1.55; break;
      case 'umbrella': game.umbrella = 60; break;
      case 'crossFire': game.rain = { kind: 'fire', t: 150 }; break;
      case 'crossWater': game.rain = { kind: 'water', t: 90 }; break;
      case 'crossBolt': game.rain = { kind: 'bolt', t: 120 }; break;
      case 'potion': game.bonus = 600; for (let i = 0; i < 18; i++) { const s = randomSpot(); items.push({ kind: 'fruit', spr: ['diamond', 'apple', 'melon', 'grapes'][i % 4], value: [5000, 1000, 2000, 3000][i % 4], x: s.x, y: s.y, vx: 0, vy: 0, onGround: false, life: 600, alive: true }); } break;
    }
  }
  function updateRain() {
    const r = game.rain; if (!r) return;
    r.t--;
    if (r.kind === 'fire' && r.t % 6 === 0) projs.push({ kind: 'firedrop', x: 16 + rnd() * (W - 48), y: PF_TOP, vx: 0, vy: 1, life: 400, w: 8, h: 8 });
    if (r.kind === 'water' && r.t % 30 === 0) spawnFlow(24 + rnd() * (W - 48), 12, rnd() < 0.5 ? -1 : 1);
    if (r.kind === 'bolt' && r.t % 15 === 0) { const left = rnd() < 0.5; projs.push({ kind: 'bolt', x: left ? 16 : W - 32, y: 16 + rnd() * 180, vx: left ? 3.5 : -3.5, vy: 0, life: 120, w: 16, h: 8 }); AU.sfx('bolt'); }
    if (r.t <= 0) game.rain = null;
  }

  function addScore(v) {
    game.score += v;
    if (game.score > game.hi) { game.hi = game.score; }
    if (game.score >= game.nextLife) {
      game.lives++; AU.sfx('item');
      effects.push({ kind: 'text', x: W / 2, y: 60, life: 90, text: 'EXTRA LIFE!', color: '#48e848', big: true });
      game.nextLife = game.nextLife === 30000 ? 100000 : game.nextLife + 100000;
    }
  }

  // ------------------------------------------------------------------
  // Player <-> bubble interaction, specials, skel, boss
  // ------------------------------------------------------------------
  function playerBubbles() {
    const p = player;
    if (p.dead) return;
    const x0 = p.x + BL, y0 = p.y + BT, x1 = p.x + BR, y1 = p.y + BB;
    for (const b of bubbles) {
      if (!b.alive || b.popping || b.phase === 'enter') continue;
      if (b.phase === 'shot' && b.age < 12) continue;
      if (p.riding === b) continue;
      if (!circleBox(b.cx, b.cy, b.r, x0, y0, x1, y1)) continue;
      const feet = p.y + BB;
      if (p.vy > 0 && feet <= b.cy + 3 && !b.enemy && b.kind === 'normal') {
        if (IN.keys.jump) { // bounce
          p.vy = JUMP_V * 0.85; p.y = b.cy - b.r - BB + 2; b.squash = 8; b.cy += 3; AU.sfx('bounce');
        } else { // ride
          p.riding = b; p.vy = 0; p.y = b.cy - b.r - BB;
        }
      } else {
        schedulePop(b, 0);
      }
    }
  }
  function updateSpecials() {
    if (game.round < 2 || game.lvl.boss) return;
    if (bubbles.some(b => b.kind !== 'normal' && b.alive)) return;
    game.specialTimer--;
    if (game.specialTimer > 0) return;
    game.specialTimer = 700 + Math.floor(rnd() * 500);
    // choose an entry gap in the floor
    const gaps = [];
    for (let c = 2; c < COLS - 2; c++) if (game.lvl.map[ROWS - 1][c] === 0) gaps.push(c);
    if (!gaps.length) return;
    const c = gaps[Math.floor(rnd() * gaps.length)];
    const roll = rnd();
    let kind, letter = null;
    if (roll < 0.35) { kind = 'extend'; const missing = EXT.map((l, i) => i).filter(i => !game.extend[i]); letter = missing[Math.floor(rnd() * missing.length)]; }
    else { const ks = ['water', 'fire', 'bolt']; kind = ks[(game.round + Math.floor(rnd() * 3)) % 3]; }
    const b = makeBubble(c * T + 4, H + 10, kind);
    b.phase = 'enter'; b.letter = letter;
    bubbles.push(b);
  }
  function updateSkel() {
    if (game.lvl.boss) return;
    game.roundTimer++;
    if (!game.hurry && game.roundTimer > 1500 && enemies.length) {
      game.hurry = true; game.hurryText = 150;
      for (const e of enemies) e.angry = true;
      AU.sfx('hurry'); AU.setTempo(1.25);
    }
    if (game.hurryText > 0) game.hurryText--;
    if (!game.skel && game.roundTimer > 2400 && enemies.length) {
      game.skel = { x: player.x < W / 2 ? W - 40 : 24, y: player.y < H / 2 ? H - 40 : 24, anim: 0, appear: 60 };
      AU.sfx('skel'); AU.setTempo(1.45);
    }
    const s = game.skel;
    if (s) {
      s.anim++;
      if (s.appear > 0) { s.appear--; return; }
      const sp = 0.95 + Math.min(0.5, game.round * 0.004);
      const dx = player.x - s.x, dy = player.y - s.y;
      s.x += Math.sign(dx) * Math.min(sp, Math.abs(dx));
      s.y += Math.sign(dy) * Math.min(sp * 0.8, Math.abs(dy));
      if (player.invul === 0 && !player.dead && rectHit(s.x + 3, s.y + 3, s.x + 13, s.y + 13, player.x + BL, player.y + BT, player.x + BR, player.y + BB)) killPlayer();
    }
  }
  function updateBoss() {
    const b = game.boss; if (!b) return;
    b.anim++; b.timer++;
    if (b.appear > 0) { b.appear--; return; }
    if (b.dead) return;
    if (b.hit > 0) b.hit--;
    // bouncing movement
    b.vy += GRAV * 0.9;
    let nx = b.x + b.vx;
    if (nx < 16 || nx + 32 > W - 16) { b.vx = -b.vx; nx = b.x + b.vx; }
    b.x = nx;
    b.y += b.vy;
    if (b.y + 32 > H - 8) { b.y = H - 8 - 32; b.vy = -(2.4 + rnd() * 1.2); if (rnd() < 0.3) b.vx = Math.sign(player.x - b.x) * (1 + rnd()); }
    if (b.y < PF_TOP + 8) { b.y = PF_TOP + 8; b.vy = 0.5; }
    b.dir = b.vx >= 0 ? 1 : -1;
    // bottles
    if (b.timer % 110 === 0) {
      for (let i = -1; i <= 1; i++) projs.push({ kind: 'bottle', x: b.x + 12, y: b.y + 12, vx: Math.sign(player.x - b.x || 1) * 2.4, vy: i * 0.5, life: 150, w: 8, h: 8, t: 0 });
      AU.sfx('throw');
    }
    // bubble hits
    for (const bb of bubbles) {
      if (!bb.alive || bb.popping || bb.enemy) continue;
      if (circleBox(bb.cx, bb.cy, bb.r, b.x + 4, b.y + 4, b.x + 28, b.y + 28)) { schedulePop(bb, 0); if (bb.phase === 'shot' || bb.age < 60) hitBoss(bb.kind === 'normal' ? 1 : 4); }
    }
    for (const f of flames) if (f.life > 0 && f.anim % 20 === 0 && rectHit(f.x, f.y, f.x + 8, f.y + 8, b.x, b.y, b.x + 32, b.y + 32)) hitBoss(1);
    if (player.invul === 0 && !player.dead && rectHit(b.x + 5, b.y + 5, b.x + 27, b.y + 27, player.x + BL, player.y + BT, player.x + BR, player.y + BB)) killPlayer();
    // rain of specials to help the fight
    if (b.timer % 240 === 0 && !bubbles.some(x => x.kind !== 'normal')) {
      const nb = makeBubble(40 + rnd() * (W - 80), H + 10, ['bolt', 'fire', 'water'][Math.floor(rnd() * 3)]); nb.phase = 'enter'; bubbles.push(nb);
    }
  }
  function hitBoss(n) {
    const b = game.boss; if (!b || b.dead) return;
    b.hp -= n; b.hit = 10; AU.sfx('bossHit'); game.shake = 6;
    addScore(1000);
    if (b.hp <= 0) {
      b.dead = true; b.hp = 0;
      addScore(100000);
      for (let i = 0; i < 12; i++) effects.push({ kind: 'pop', x: b.x + rnd() * 32, y: b.y + rnd() * 32, life: 30 + i * 4, red: true });
      game.state = 'roundClear'; game.stateTimer = 240; AU.playMusic('clear');
      for (let i = 0; i < 10; i++) { const s = randomSpot(); items.push({ kind: 'fruit', spr: 'diamond', value: 10000, x: s.x, y: s.y, vx: 0, vy: 0, onGround: false, life: 600, alive: true }); }
    }
  }

  // ------------------------------------------------------------------
  // Main update
  // ------------------------------------------------------------------
  function startGame() {
    player = newPlayer();
    game.score = 0; game.lives = 2; game.nextLife = 30000;
    game.extend = [false, false, false, false, false, false];
    game.umbrella = 0; game.rain = null;
    loadRound(1, false);
    game.state = 'roundStart'; game.stateTimer = 150;
    AU.stopMusic(); AU.sfx('start');
  }
  function nextRound(skip) {
    const n = Math.min(100, game.round + (skip || 1));
    const p = player;
    const oldCanvas = lvlCanvas;
    loadRound(n, true);
    game.transition = { t: 0, old: oldCanvas };
    game.state = 'roundStart'; game.stateTimer = 150;
  }
  function respawn() {
    player.dead = false; player.invul = 180; player.speed = 1; player.blowRate = 1; player.bubSpeed = 1; player.bubRange = 1;
    resetPlayerPos();
    game.skel = null; game.roundTimer = Math.min(game.roundTimer, 600); game.hurry = false;
    for (const e of enemies) e.angry = false;
    AU.playMusic(game.lvl.boss ? 'boss' : 'main'); AU.setTempo(1);
  }

  function update() {
    game.frame++;
    if (IN.consume('mute')) { game.muted = !game.muted; AU.setMuted(game.muted); }
    if (game.shake > 0) game.shake--;
    if (game.flash > 0) game.flash--;
    for (const ef of effects) { ef.life--; if (ef.kind === 'text') ef.y -= 0.4; }
    effects = effects.filter(e => e.life > 0);

    switch (game.state) {
      case 'title':
        game.titleTimer++;
        if (IN.consume('start') || IN.consume('jump') || IN.consume('fire')) { game.state = 'intro'; game.introTimer = 0; AU.init(); AU.stopMusic(); AU.sfx('start'); }
        break;
      case 'intro':
        game.introTimer++;
        if (game.introTimer > 30 && (IN.consume('start') || IN.consume('jump') || IN.consume('fire') || game.introTimer > 520)) startGame();
        break;
      case 'roundStart':
        game.stateTimer--;
        if (game.transition) { game.transition.t += 4; if (game.transition.t >= H) game.transition = null; }
        if (game.stateTimer <= 0) { game.state = 'play'; if (AU.currentMusic() !== (game.lvl.boss ? 'boss' : 'main')) AU.playMusic(game.lvl.boss ? 'boss' : 'main'); }
        break;
      case 'play':
        if (IN.consume('pause')) { game.state = 'paused'; break; }
        if (game.chain.timer > 0) game.chain.timer--;
        if (game.bonus > 0) game.bonus--;
        updatePlayer();
        updateEnemies();
        updateBubbles();
        playerBubbles();
        updateProjs();
        updateItems();
        updateRain();
        updateSpecials();
        updateSkel();
        updateBoss();
        game.itemTimer++;
        if ((game.itemTimer === 900 && game.itemSpawned === 0) || (game.popped >= 25 && game.itemSpawned === 1) || (game.popped >= 60 && game.itemSpawned === 2)) spawnBonusItem();
        if (game.umbrella > 0) { game.umbrella--; if (game.umbrella === 0) { nextRound(3); AU.sfx('start'); } }
        if (game.state === 'play' && !game.lvl.boss && enemies.length === 0 && !bubbles.some(b => b.enemy)) {
          game.state = 'roundClear'; game.stateTimer = 170; AU.playMusic('clear');
        }
        break;
      case 'roundClear':
        game.stateTimer--;
        updatePlayer(); updateBubbles(); playerBubbles(); updateItems(); updateProjs();
        for (const b of bubbles) if (b.enemy) b.enemy = null;
        if (game.stateTimer <= 0) {
          if (game.lvl.boss) { game.state = 'ending'; game.stateTimer = 0; AU.playMusic('ending'); }
          else nextRound(1);
        }
        break;
      case 'dying':
        game.stateTimer--;
        player.vy += 0.06; player.y += player.vy; player.anim++;
        if (game.stateTimer <= 0) {
          if (game.lives > 0) { game.lives--; respawn(); game.state = 'play'; }
          else { game.state = 'gameover'; game.stateTimer = 600; AU.playMusic('gameover'); }
        }
        break;
      case 'gameover':
        game.stateTimer--;
        if (game.stateTimer < 540 && (IN.consume('start') || IN.consume('jump') || IN.consume('fire'))) {
          // continue
          game.score = 0; game.lives = 2; game.nextLife = 30000; player.dead = false; respawn(); game.state = 'roundStart'; game.stateTimer = 120; AU.stopMusic(); AU.sfx('start');
        } else if (game.stateTimer <= 0) { game.state = 'title'; game.titleTimer = 0; AU.playMusic('title'); }
        break;
      case 'ending':
        game.stateTimer++;
        if (game.stateTimer > 200 && (IN.consume('start') || IN.consume('jump') || IN.consume('fire'))) { game.state = 'title'; game.titleTimer = 0; AU.playMusic('title'); }
        break;
      case 'paused':
        if (IN.consume('pause') || IN.consume('start')) game.state = 'play';
        break;
    }
    saveHi();
  }
  let hiSaved = 0;
  function saveHi() { if (game.hi !== hiSaved) { hiSaved = game.hi; try { localStorage.setItem('bb_hi', String(game.hi)); } catch (e) { } } }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------
  function drawSprite(g, name, x, y, opts) {
    const img = SP.get(name, opts);
    g.drawImage(img, Math.round(x), Math.round(y));
  }
  function bubbleSprite(b) {
    const f = (Math.floor(b.age / 10) % 2) === 0 ? 'bubble0' : 'bubble1';
    if (b.enemy && b.life < 100 && (Math.floor(b.age / 6) % 2)) return SP.get(f, { swap: SP.SWAPS.redBubble, swapKey: 'red' });
    if (!b.enemy && b.kind === 'normal' && b.life < 120 && (Math.floor(b.age / 6) % 2)) return SP.get(f, { swap: SP.SWAPS.redBubble, swapKey: 'red' });
    switch (b.kind) {
      case 'fire': return SP.get(f, { swap: SP.SWAPS.fireBubble, swapKey: 'fire' });
      case 'water': return SP.get(f, { swap: SP.SWAPS.waterBubble, swapKey: 'water' });
      case 'bolt': return SP.get(f, { swap: SP.SWAPS.boltBubble, swapKey: 'bolt' });
      case 'extend': return SP.get(f, { swap: SP.SWAPS.extendBubble, swapKey: 'ext' });
    }
    return SP.get(f);
  }
  function drawEntity(g, e, yoff) {
    yoff = yoff || 0;
    const d = ENEMY_DEF[e.type];
    const frame = d.spr + (Math.floor(e.anim / 10) % 2);
    const opts = { flip: e.dir < 0 };
    if (e.angry) { opts.swap = SP.SWAPS.angry; opts.swapKey = 'angry'; }
    if (e.state === 'appear') { if (Math.floor(game.frame / 4) % 2) return; }
    drawSprite(g, frame, e.x, e.y + yoff, opts);
    if (e.y + 16 > H) drawSprite(g, frame, e.x, e.y - PF_H + yoff, opts);
  }
  function drawPlayerSprite(g) {
    const p = player;
    let name = 'bub_idle';
    if (p.dead) name = 'bub_die';
    else if (p.blowT > 0) name = 'bub_blow';
    else if (!p.onGround && !p.riding) name = 'bub_jump';
    else if (p.vx !== 0) name = (Math.floor(p.anim / 7) % 2) ? 'bub_walk1' : 'bub_walk0';
    if (p.invul > 0 && Math.floor(game.frame / 3) % 2 && !p.dead) return;
    if (p.dead) {
      g.save(); g.translate(Math.round(p.x + 8), Math.round(p.y + 8)); g.rotate(p.anim * 0.25);
      g.drawImage(SP.get(name), -8, -8); g.restore();
      return;
    }
    drawSprite(g, name, p.x, p.y, { flip: p.dir < 0 });
    if (p.y + 16 > H) drawSprite(g, name, p.x, p.y - PF_H, { flip: p.dir < 0 });
  }
  function drawHud(g) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, 8);
    SP.text(g, '1UP', 8, 0, '#48e848');
    SP.text(g, padScore(game.score), 40, 0, '#ffffff');
    SP.text(g, 'HIGH', 104, 0, '#ff3838');
    SP.text(g, padScore(game.hi), 144, 0, '#ffffff');
    SP.text(g, 'R' + game.round, 208, 0, '#50c8ff');
  }
  function padScore(s) { let t = String(s); while (t.length < 7) t = ' ' + t; return t; }

  function drawPlayfield(g) {
    g.drawImage(lvlCanvas, 0, 0);
    // items
    for (const it of items) {
      if (it.kind !== 'fruit' && it.life < 120 && Math.floor(game.frame / 4) % 2) continue;
      g.drawImage(it.kind === 'fruit' ? SP.get(it.spr) : itemSprite(it.kind), Math.round(it.x), Math.round(it.y));
    }
    // flames
    for (const f of flames) { if (f.delay > 0) { f.delay--; continue; } g.drawImage(SP.get(Math.floor(f.anim / 6) % 2 ? 'flame0' : 'flame1'), f.x, f.y); }
    // flows
    for (const f of flows) {
      g.drawImage(SP.get('water'), Math.round(f.x - 4), Math.round(f.y - 4));
      f.trail.forEach((t, i) => { if (i % 2 === 0) g.drawImage(SP.get('drop'), Math.round(t.x - 4), Math.round(t.y - 4)); });
    }
    // enemies
    for (const e of enemies) if (e.state !== 'trapped') drawEntity(g, e);
    // boss
    if (game.boss) {
      const b = game.boss;
      if (!(b.appear > 0 && Math.floor(game.frame / 4) % 2) && !(b.hit > 0 && Math.floor(game.frame / 2) % 2)) {
        const opts = { scale: 2, flip: b.dir < 0 };
        if (b.dead) { opts.swap = SP.SWAPS.angry; opts.swapKey = 'angry'; }
        drawSprite(g, 'drunk' + (Math.floor(b.anim / 8) % 2), b.x, b.y, opts);
      }
      // hp bar
      g.fillStyle = '#400'; g.fillRect(96, 10, 64, 4); g.fillStyle = '#f33'; g.fillRect(96, 10, Math.round(64 * b.hp / b.maxHp), 4);
    }
    // player
    drawPlayerSprite(g);
    // projectiles
    for (const p of projs) {
      let name = p.kind;
      if (p.kind === 'firedrop') name = 'fireball';
      if (p.kind === 'laser') name = 'laser';
      const opts = {};
      if (p.kind === 'bolt') { opts.flip = p.vx < 0; }
      if (p.kind === 'bottle') { g.save(); g.translate(Math.round(p.x + 4), Math.round(p.y + 4)); g.rotate(p.t * 0.3); g.drawImage(SP.get('bottle'), -4, -4); g.restore(); continue; }
      drawSprite(g, name, p.x, p.y, opts);
    }
    // bubbles
    for (const b of bubbles) {
      if (!b.alive) continue;
      const sq = b.squash > 0 ? 1 : 0;
      if (b.enemy) {
        const e = b.enemy; const d = ENEMY_DEF[e.type];
        const img = SP.get(d.spr + (Math.floor(b.age / 8) % 2), { flip: (Math.floor(b.age / 30) % 2) === 0, swap: e.angry ? SP.SWAPS.angry : null, swapKey: e.angry ? 'angry' : '' });
        g.save(); g.globalAlpha = 0.9; g.drawImage(img, Math.round(b.cx - 8), Math.round(b.cy - 8)); g.restore();
        g.save(); g.globalAlpha = 0.28; g.fillStyle = e.angry && b.life < 100 ? '#ff4040' : '#80ffb0';
        g.beginPath(); g.arc(b.cx, b.cy, 7.5, 0, 6.283); g.fill(); g.restore();
      } else {
        g.save(); g.globalAlpha = 0.16;
        g.fillStyle = b.kind === 'fire' ? '#ff8020' : b.kind === 'water' ? '#50c8ff' : b.kind === 'bolt' ? '#ffe860' : b.kind === 'extend' ? '#ff90f0' : '#80ffb0';
        g.beginPath(); g.arc(b.cx, b.cy, 7, 0, 6.283); g.fill(); g.restore();
      }
      const img = bubbleSprite(b);
      if (sq) g.drawImage(img, Math.round(b.cx - 9), Math.round(b.cy - 6), 18, 13);
      else g.drawImage(img, Math.round(b.cx - 8), Math.round(b.cy - 8));
      if (b.kind === 'extend') SP.text(g, EXT[b.letter], Math.round(b.cx - 4), Math.round(b.cy - 4), '#ffffff');
    }
    // skel
    if (game.skel) {
      const s = game.skel;
      if (!(s.appear > 0 && Math.floor(game.frame / 4) % 2)) drawSprite(g, 'skel' + (Math.floor(s.anim / 10) % 2), s.x, s.y, { flip: player.x < s.x });
    }
    // effects
    for (const ef of effects) {
      if (ef.kind === 'pop') {
        const name = ef.life > 6 ? 'pop0' : 'pop1';
        const opts = ef.red ? { swap: SP.SWAPS.redBubble, swapKey: 'red' } : ef.kind2 && ef.kind2 !== 'normal' ? { swap: SP.SWAPS[ef.kind2 + 'Bubble'], swapKey: ef.kind2 } : {};
        drawSprite(g, name, ef.x - 8, ef.y - 8, opts);
      } else if (ef.kind === 'text') {
        if (ef.big) SP.textCenter(g, ef.text, ef.x, ef.y, ef.color, 1);
        else SP.textCenter(g, ef.text, ef.x, ef.y, ef.color);
      }
    }
    // lives & extend
    for (let i = 0; i < Math.min(game.lives, 8); i++) g.drawImage(SP.get('bub_icon'), 18 + i * 9, H - 8);
    for (let i = 0; i < 6; i++) SP.text(g, EXT[i], W - 18 - (5 - i) * 8 - 8, H - 8, game.extend[i] ? '#ff90f0' : '#404040');
  }

  function drawOverlay(g) {
    switch (game.state) {
      case 'roundStart': {
        const y = 100;
        if (!game.transition) {
          SP.textCenter(g, 'ROUND ' + game.round, W / 2, y, '#ffffff');
          if (game.stateTimer < 100) SP.textCenter(g, 'READY!', W / 2, y + 16, '#ffe860');
        }
        break;
      }
      case 'paused': SP.textCenter(g, 'PAUSE', W / 2, 104, '#ffffff'); break;
      case 'gameover':
        SP.textCenter(g, 'GAME OVER', W / 2, 96, '#ff3838');
        if (game.stateTimer < 540) {
          SP.textCenter(g, 'CONTINUE?', W / 2, 116, '#ffffff');
          SP.textCenter(g, String(Math.ceil(game.stateTimer / 60)), W / 2, 128, '#ffe860');
        }
        break;
    }
    if (game.hurryText > 0 && (Math.floor(game.frame / 8) % 2) && game.state === 'play') SP.textCenter(g, 'HURRY UP!!', W / 2, 104, '#ff3838');
    if (game.bonus > 0 && game.state === 'play') SP.textCenter(g, 'BONUS!', W / 2, 20, '#ffe860');
  }

  function drawTitle(g) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const t = game.titleTimer;
    // floating bubbles background
    for (let i = 0; i < 14; i++) {
      const bx = (i * 37 + t * (0.2 + (i % 3) * 0.1)) % (W + 16) - 8;
      const by = H - ((t * (0.25 + (i % 4) * 0.08) + i * 53) % (H + 16));
      g.save(); g.globalAlpha = 0.5; g.drawImage(SP.get(i % 2 ? 'bubble0' : 'bubble1', i % 3 === 0 ? { swap: SP.SWAPS.waterBubble, swapKey: 'water' } : {}), Math.round(bx), Math.round(by)); g.restore();
    }
    const c1 = ['#48e848', '#ffe860', '#50c8ff', '#ff90f0'];
    const wob = Math.sin(t * 0.05) * 3;
    for (let i = 0; i < 6; i++) {
      const ch = 'BUBBLE'[i];
      const col = c1[(i + Math.floor(t / 10)) % 4];
      SP.text(g, ch, 40 + i * 30, 40 + Math.sin(t * 0.08 + i) * 3 + wob, col, 3);
    }
    for (let i = 0; i < 6; i++) {
      const ch = 'BOBBLE'[i];
      const col = c1[(i + 2 + Math.floor(t / 10)) % 4];
      SP.text(g, ch, 40 + i * 30, 76 + Math.sin(t * 0.08 + i + 3) * 3 - wob, col, 3);
    }
    // Bub & Bob
    drawSprite(g, (Math.floor(t / 12) % 2) ? 'bub_walk0' : 'bub_walk1', 24, 120, { scale: 2 });
    drawSprite(g, (Math.floor(t / 12) % 2) ? 'bub_walk0' : 'bub_walk1', W - 56, 120, { scale: 2, flip: true, swap: SP.SWAPS.bob, swapKey: 'bob' });
    if (Math.floor(t / 30) % 2) SP.textCenter(g, 'TAP OR PRESS START', W / 2, 136, '#ffffff');
    SP.textCenter(g, 'HIGH SCORE ' + game.hi, W / 2, 160, '#ff3838');
    SP.textCenter(g, 'ARROWS: MOVE  Z: JUMP  X: BUBBLE', W / 2, 184, '#808080');
    SP.textCenter(g, 'FAN REMAKE - 100 ROUNDS', W / 2, 200, '#50c8ff');
  }
  function drawIntro(g) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const lines = ['NOW, IT IS BEGINNING OF A', 'FANTASTIC STORY!!', '', 'LET\'S MAKE A JOURNEY TO', 'THE CAVE OF MONSTERS!', '', 'GOOD LUCK!'];
    let shown = Math.floor(game.introTimer / 3);
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i].substring(0, Math.max(0, shown));
      shown -= lines[i].length;
      SP.textCenter(g, s, W / 2, 64 + i * 14, i === 6 ? '#ffe860' : '#ffffff');
      if (shown < 0) break;
    }
    drawSprite(g, (Math.floor(game.introTimer / 10) % 2) ? 'bub_walk0' : 'bub_walk1', 24 + (game.introTimer * 0.5) % 200, 180);
  }
  function drawEnding(g) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const t = game.stateTimer;
    const lines = ['CONGRATULATIONS!', '', 'YOU HAVE DEFEATED THE', 'CAVE OF MONSTERS AND', 'RESCUED YOUR FRIENDS.', '', 'BUT THE STORY IS NOT OVER...', '', 'SCORE ' + game.score];
    for (let i = 0; i < lines.length; i++) if (t > i * 25) SP.textCenter(g, lines[i], W / 2, 48 + i * 14, i === 0 ? '#ffe860' : '#ffffff');
    for (let i = 0; i < 8; i++) {
      const bx = (i * 31 + t * 0.4) % (W + 16) - 8, by = H - ((t * 0.5 + i * 41) % (H + 16));
      g.drawImage(SP.get('bubble0'), Math.round(bx), Math.round(by));
    }
    drawSprite(g, (Math.floor(t / 10) % 2) ? 'bub_walk0' : 'bub_walk1', 100, 190, { scale: 2 });
    drawSprite(g, (Math.floor(t / 10) % 2) ? 'bub_walk0' : 'bub_walk1', 132, 190, { scale: 2, flip: true, swap: SP.SWAPS.bob, swapKey: 'bob' });
  }

  function render() {
    const g = bctx;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (game.state === 'title') { drawTitle(g); }
    else if (game.state === 'intro') { drawIntro(g); }
    else if (game.state === 'ending') { drawEnding(g); }
    else {
      g.save();
      if (game.shake > 0) g.translate(Math.round((rnd() - 0.5) * 4), Math.round((rnd() - 0.5) * 4));
      if (game.transition) {
        const t = game.transition.t;
        g.drawImage(game.transition.old, 0, -t);
        g.drawImage(lvlCanvas, 0, H - t);
        // player rides along
        drawSprite(g, 'bub_idle', player.x, player.y + H - t, { flip: false });
      } else {
        drawPlayfield(g);
      }
      g.restore();
      drawHud(g);
      drawOverlay(g);
    }
    // blit to display canvas (integer scaled, nearest neighbour)
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
  }

  // ------------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------------
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth, vh = window.innerHeight;
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const stage = document.getElementById('stage');
    let s, layout = 'none';
    const fit = (aw, ah) => Math.floor(Math.min(aw * dpr / W, ah * dpr / H));
    if (!touch) { s = fit(vw, vh); }
    else {
      const STRIP = 132, SIDE = 210;
      const sBottom = fit(vw, vh - STRIP), sSide = fit(vw - SIDE * 2, vh);
      if (sSide >= sBottom && sSide >= 1) { s = sSide; layout = 'side'; }
      else { s = sBottom; layout = 'bottom'; }
      stage.style.paddingBottom = layout === 'bottom' ? STRIP + 'px' : '0px';
    }
    if (s < 1) s = 1;
    document.body.setAttribute('data-layout', layout);
    canvas.width = W * s; canvas.height = H * s;
    canvas.style.width = (W * s / dpr) + 'px';
    canvas.style.height = (H * s / dpr) + 'px';
  }
  let last = 0, acc = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!last) last = ts;
    let dt = ts - last; last = ts;
    if (dt > 100) dt = 100;
    acc += dt;
    const step = 1000 / 60;
    let n = 0;
    while (acc >= step && n < 4) { update(); acc -= step; n++; }
    render();
  }
  function init() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    buf = SP.makeCanvas(W, H); bctx = buf.getContext('2d');
    try { const h = parseInt(localStorage.getItem('bb_hi') || '0'); if (h > game.hi) game.hi = h; } catch (e) { }
    hiSaved = game.hi;
    player = newPlayer();
    enemies = []; bubbles = []; items = []; projs = []; effects = []; flows = []; flames = [];
    game.lvl = LV.build(1); lvlCanvas = renderLevel(game.lvl);
    IN.initTouch();
    window.addEventListener('resize', resize);
    resize();
    const unlock = () => { AU.init(); if (game.state === 'title' && !AU.currentMusic()) AU.playMusic('title'); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    const fs = document.getElementById('btn-fs');
    if (fs) fs.addEventListener('click', () => {
      const el = document.documentElement;
      if (!document.fullscreenElement) { (el.requestFullscreen || el.webkitRequestFullscreen || function () { }).call(el); if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); }
      else (document.exitFullscreen || function () { }).call(document);
    });
    const mute = document.getElementById('btn-mute');
    if (mute) mute.addEventListener('click', () => { AU.init(); game.muted = !game.muted; AU.setMuted(game.muted); mute.textContent = game.muted ? '🔇' : '🔊'; });
    requestAnimationFrame(loop);
  }
  window.BubbleBobble = { init, game: () => game, _debug: () => ({ player, enemies, bubbles, items, projs, flows, flames }), _load: (n) => { loadRound(n, false); game.state = 'play'; player.dead = false; } };
  window.addEventListener('DOMContentLoaded', init);
})();
