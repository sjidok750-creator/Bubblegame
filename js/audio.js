/* ============================================================
   Chiptune audio: WebAudio sequencer + SFX (no external files)
   ============================================================ */
(function () {
  'use strict';
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let muted = false;
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function freq(name) {
    // e.g. "C#5", "Eb4"
    let m = /^([A-G])([#b]?)(\d)$/.exec(name);
    if (!m) return 0;
    let n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3]) + 1) * 12;
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.55; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(master);
    // noise buffer
    const len = ctx.sampleRate * 1;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  let noiseBuf = null;

  function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }

  // ---------- Sequencer ----------
  // A song: { bpm, tracks: [{ wave, vol, seq: "C5:2 E5:2 -:4 ..." , transpose }] }
  function parseSeq(seq) {
    return seq.trim().split(/\s+/).map(t => {
      const [n, d] = t.split(':');
      return { n: n === '-' ? null : n, d: parseFloat(d || '1') };
    });
  }

  const SONGS = {};
  const bass = (chords, pattern) => chords.map(c => pattern.replace(/R/g, c)).join(' ');
  const MAIN_MEL =
    'C5:2 E5:2 G5:2 -:2 A5:2 G5:2 E5:2 -:2 ' +
    'D5:2 E5:2 D5:2 -:2 C5:2 D5:2 E5:2 -:2 ' +
    'C5:2 E5:2 G5:2 -:2 A5:2 G5:2 E5:2 -:2 ' +
    'G5:2 A5:2 G5:2 E5:2 D5:4 -:4 ' +
    'E5:2 E5:2 D5:2 E5:2 G5:2 E5:2 D5:2 C5:2 ' +
    'D5:2 D5:2 C5:2 D5:2 E5:2 D5:2 C5:2 A4:2 ' +
    'E5:2 E5:2 D5:2 E5:2 G5:2 E5:2 D5:2 C5:2 ' +
    'D5:2 E5:2 D5:2 C5:2 C5:4 -:4 ' +
    'A5:2 A5:2 G5:2 A5:2 C6:2 A5:2 G5:2 E5:2 ' +
    'G5:2 G5:2 E5:2 G5:2 A5:2 G5:2 E5:2 D5:2 ' +
    'A5:2 A5:2 G5:2 A5:2 C6:2 A5:2 G5:2 E5:2 ' +
    'G5:2 A5:2 G5:2 E5:2 D5:4 -:4 ' +
    'E5:2 E5:2 D5:2 E5:2 G5:2 E5:2 D5:2 C5:2 ' +
    'D5:2 D5:2 C5:2 D5:2 E5:2 D5:2 C5:2 A4:2 ' +
    'E5:2 E5:2 D5:2 E5:2 G5:2 E5:2 D5:2 C5:2 ' +
    'D5:2 E5:2 D5:2 C5:2 C5:4 -:4 ';
  const MAIN_CH = ['C', 'G', 'C', 'G', 'C', 'F', 'C', 'G', 'F', 'C', 'F', 'G', 'C', 'F', 'C', 'G'];
  const THIRD = { C: 'E', G: 'B', F: 'A' };
  const FIFTH = { C: 'G', G: 'D', F: 'C' };
  SONGS.main = {
    bpm: 150,
    tracks: [
      { wave: 'square', vol: 0.22, seq: MAIN_MEL },
      { wave: 'square', vol: 0.10, seq: MAIN_CH.map(c => `-:2 ${THIRD[c]}4:2 -:2 ${FIFTH[c]}4:2 -:2 ${THIRD[c]}4:2 -:2 ${FIFTH[c]}4:2`).join(' ') },
      { wave: 'triangle', vol: 0.35, seq: bass(MAIN_CH, 'R2:2 R3:2 R2:2 R3:2 R2:2 R3:2 R2:2 R3:2') },
      { wave: 'noise', vol: 0.10, seq: MAIN_CH.map(() => 'x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2').join(' ') }
    ]
  };
  const TITLE_MEL =
    'E5:4 G5:4 A5:4 G5:4 E5:4 D5:4 C5:8 ' +
    'D5:4 E5:4 D5:4 C5:4 A4:4 C5:4 D5:8 ' +
    'E5:4 G5:4 A5:4 G5:4 E5:4 D5:4 C5:8 ' +
    'G5:4 A5:4 G5:4 E5:4 D5:16 ';
  const TITLE_CH = ['C', 'F', 'C', 'G', 'C', 'F', 'C', 'G'];
  SONGS.title = {
    bpm: 120,
    tracks: [
      { wave: 'square', vol: 0.22, seq: TITLE_MEL },
      { wave: 'triangle', vol: 0.35, seq: bass(TITLE_CH, 'R2:4 R3:4 R2:4 R3:4') },
      { wave: 'square', vol: 0.09, seq: TITLE_CH.map(c => `-:2 ${THIRD[c]}4:2 -:2 ${FIFTH[c]}4:2 -:2 ${THIRD[c]}4:2 -:2 ${FIFTH[c]}4:2`).join(' ') }
    ]
  };
  SONGS.clear = {
    bpm: 160, once: true,
    tracks: [
      { wave: 'square', vol: 0.25, seq: 'C5:2 E5:2 G5:2 C6:2 -:2 G5:2 C6:8' },
      { wave: 'triangle', vol: 0.35, seq: 'C3:4 G3:4 C3:4 C4:6' }
    ]
  };
  SONGS.death = {
    bpm: 140, once: true,
    tracks: [
      { wave: 'square', vol: 0.25, seq: 'E5:2 D#5:2 D5:2 C#5:2 C5:4 -:2 G4:2 E4:2 C4:6' },
      { wave: 'triangle', vol: 0.3, seq: 'C3:4 B2:4 A2:4 G2:4 C2:8' }
    ]
  };
  SONGS.gameover = {
    bpm: 110, once: true,
    tracks: [
      { wave: 'square', vol: 0.25, seq: 'A4:4 C5:4 E5:4 A5:6 -:2 G#5:4 E5:4 C5:4 A4:8' },
      { wave: 'triangle', vol: 0.35, seq: 'A2:8 A2:8 E2:8 A2:8' }
    ]
  };
  SONGS.extend = {
    bpm: 170, once: true,
    tracks: [
      { wave: 'square', vol: 0.25, seq: 'C5:1 E5:1 G5:1 C6:1 E6:1 G6:1 C7:4 -:1 G6:1 C7:6' },
      { wave: 'square', vol: 0.15, seq: '-:2 C5:1 E5:1 G5:1 C6:1 E6:4 -:1 E6:1 G6:6' }
    ]
  };
  SONGS.boss = {
    bpm: 165,
    tracks: [
      { wave: 'square', vol: 0.22, seq: 'A4:2 A4:2 C5:2 A4:2 E5:2 A4:2 C5:2 A4:2 G4:2 G4:2 B4:2 G4:2 D5:2 G4:2 B4:2 G4:2 F4:2 F4:2 A4:2 F4:2 C5:2 F4:2 A4:2 F4:2 E4:2 G#4:2 B4:2 E5:2 E4:2 G#4:2 B4:2 E5:2' },
      { wave: 'triangle', vol: 0.35, seq: 'A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2' },
      { wave: 'noise', vol: 0.12, seq: 'x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2 x:2 h:2' }
    ]
  };
  SONGS.ending = {
    bpm: 100,
    tracks: [
      { wave: 'square', vol: 0.22, seq: 'C5:4 E5:4 G5:4 E5:4 A5:4 G5:4 E5:8 F5:4 A5:4 C6:4 A5:4 G5:8 E5:8 D5:4 E5:4 F5:4 D5:4 E5:4 C5:4 D5:8 G5:4 F5:4 E5:4 D5:4 C5:16' },
      { wave: 'triangle', vol: 0.35, seq: bass(['C', 'A', 'F', 'G', 'D', 'C', 'G', 'C'], 'R2:4 R3:4 R2:4 R3:4') }
    ]
  };

  let cur = null; // {song, tracks:[{notes, idx, nextTime}], tempoMul}
  let timer = null;
  let tempoMul = 1;

  function playMusic(name, mul) {
    if (!ctx) return;
    stopMusic();
    const song = SONGS[name];
    if (!song) return;
    tempoMul = mul || 1;
    const t0 = ctx.currentTime + 0.05;
    cur = {
      name, song,
      tracks: song.tracks.map(t => ({ def: t, notes: parseSeq(t.seq), idx: 0, next: t0, done: false }))
    };
    timer = setInterval(schedule, 40);
    schedule();
  }
  function stopMusic() {
    if (timer) clearInterval(timer);
    timer = null; cur = null;
  }
  function setTempo(mul) { tempoMul = mul; }
  function currentMusic() { return cur ? cur.name : null; }

  function schedule() {
    if (!cur || !ctx) return;
    const ahead = ctx.currentTime + 0.18;
    const sixteenth = (60 / cur.song.bpm) / 4 / tempoMul;
    let allDone = true;
    for (const tr of cur.tracks) {
      if (tr.done) continue;
      allDone = false;
      while (tr.next < ahead) {
        const nt = tr.notes[tr.idx];
        const dur = nt.d * sixteenth;
        if (nt.n) playNote(tr.def, nt.n, tr.next, dur);
        tr.next += dur;
        tr.idx++;
        if (tr.idx >= tr.notes.length) {
          if (cur.song.once) { tr.done = true; break; }
          tr.idx = 0;
        }
      }
    }
    if (allDone) stopMusic();
  }

  function playNote(def, n, t, dur) {
    if (def.wave === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = n === 'x' ? 3000 : 6000;
      const v = def.vol * (n === 'x' ? 1 : 0.5);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + Math.min(dur, 0.08));
      src.connect(f); f.connect(g); g.connect(musicGain);
      src.start(t); src.stop(t + 0.1);
      return;
    }
    const o = ctx.createOscillator();
    o.type = def.wave;
    o.frequency.value = freq(n);
    const g = ctx.createGain();
    const len = dur * 0.85;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(def.vol, t + 0.008);
    g.gain.setValueAtTime(def.vol, t + len * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + len + 0.02);
  }

  // ---------- SFX ----------
  function tone(wave, f0, f1, dur, vol, delay) {
    if (!ctx) return;
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, hp, delay) {
    if (!ctx) return;
    const t = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 1000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }
  const SFX = {
    jump: () => tone('square', 320, 720, 0.12, 0.18),
    blow: () => { tone('square', 900, 420, 0.09, 0.16); },
    pop: () => { noise(0.05, 0.25, 2500); tone('square', 1400, 200, 0.07, 0.14); },
    bounce: () => tone('square', 500, 1000, 0.1, 0.15),
    trap: () => { tone('square', 600, 900, 0.06, 0.16); tone('square', 900, 1300, 0.08, 0.16, 0.06); },
    item: () => { tone('square', 1047, 1047, 0.06, 0.18); tone('square', 1319, 1319, 0.06, 0.18, 0.06); tone('square', 1568, 1568, 0.1, 0.18, 0.12); },
    fruit: () => { tone('square', 784, 784, 0.05, 0.16); tone('square', 1175, 1175, 0.09, 0.16, 0.05); },
    hurt: () => { tone('sawtooth', 400, 60, 0.5, 0.25); },
    hurry: () => { for (let i = 0; i < 4; i++) { tone('square', 880, 880, 0.08, 0.2, i * 0.16); tone('square', 660, 660, 0.08, 0.2, i * 0.16 + 0.08); } },
    kill: () => { noise(0.12, 0.3, 800); tone('square', 200, 900, 0.15, 0.18); },
    fire: () => { noise(0.3, 0.3, 600); },
    water: () => { noise(0.4, 0.25, 300); tone('sine', 300, 120, 0.4, 0.15); },
    bolt: () => { tone('sawtooth', 1800, 300, 0.2, 0.2); noise(0.15, 0.2, 4000); },
    letter: () => { tone('square', 1319, 1319, 0.06, 0.18); tone('square', 1760, 1760, 0.12, 0.18, 0.06); },
    throw: () => tone('square', 700, 300, 0.1, 0.12),
    skel: () => { tone('sawtooth', 120, 80, 0.3, 0.2); },
    start: () => { tone('square', 523, 523, 0.08, 0.2); tone('square', 659, 659, 0.08, 0.2, 0.1); tone('square', 784, 784, 0.08, 0.2, 0.2); tone('square', 1047, 1047, 0.2, 0.2, 0.3); },
    bossHit: () => { tone('square', 300, 150, 0.12, 0.2); noise(0.08, 0.2, 1500); },
    tick: () => tone('square', 1000, 1000, 0.03, 0.1)
  };
  function sfx(name) { if (ctx && SFX[name]) SFX[name](); }

  window.GameAudio = { init, sfx, playMusic, stopMusic, setTempo, currentMusic, setMuted, isMuted: () => muted, ready: () => !!ctx };
})();
