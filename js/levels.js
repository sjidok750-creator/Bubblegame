/* ============================================================
   Level data: 100 rounds. Playfield 32x27 tiles (rows 1..27).
   Walls: cols 0-1 and 30-31. Floor row 27 / ceiling row 1 have
   matching gaps so falling entities wrap top<->bottom.
   Each layout: { p:[[x,y,w,h],...], gaps:[[x,w],...], wind:'C'|'L'|'R' }
   ============================================================ */
(function () {
  'use strict';
  const COLS = 32, ROWS = 28;

  // helpers
  const M = (x, w) => COLS - x - w;                 // mirrored x
  function sym(rects) {                               // rects + mirrored copies
    const out = rects.slice();
    for (const r of rects) { const m = [M(r[0], r[2]), r[1], r[2], r[3]]; if (m[0] !== r[0]) out.push(m); }
    return out;
  }
  function row(y, segs) { return segs.map(s => [s[0], y, s[1], 1]); }
  function stairsUp(x, y, n, step, w) { const o = []; for (let i = 0; i < n; i++) o.push([x + i * step, y - i * 3, w, 1]); return o; }
  function stairsDown(x, y, n, step, w) { const o = []; for (let i = 0; i < n; i++) o.push([x + i * step, y + i * 3, w, 1]); return o; }
  function grid(xs, ys, w, h) { const o = []; for (const y of ys) for (const x of xs) o.push([x, y, w, h]); return o; }

  const G_SIDES = [[5, 3], [24, 3]];
  const G_CENTER = [[13, 6]];
  const G_WIDE = [[4, 4], [24, 4]];
  const G_ALL = [[2, 28]];

  const LAYOUTS = [
    // 1  classic tiers
    { p: [...row(22, [[5, 8], [19, 8]]), ...row(17, [[2, 5], [9, 14], [25, 5]]), ...row(12, [[5, 8], [19, 8]]), ...row(7, [[2, 5], [9, 14], [25, 5]])], gaps: G_SIDES, wind: 'C' },
    // 2  big steps
    { p: [...row(22, [[2, 10], [20, 10]]), [8, 17, 16, 1], ...row(12, [[2, 10], [20, 10]]), [8, 7, 16, 1]], gaps: G_SIDES, wind: 'C' },
    // 3  V shape
    { p: sym([...stairsUp(2, 23, 4, 3, 4)]).concat([[10, 8, 12, 1]]), gaps: G_CENTER, wind: 'C' },
    // 4  columns
    { p: [[7, 10, 2, 13], [15, 6, 2, 17], [23, 10, 2, 13], ...sym([[2, 20, 4, 1], [2, 14, 4, 1]])], gaps: G_SIDES, wind: 'L' },
    // 5  boxes
    { p: [...grid([5, 13, 21], [21], 4, 2), ...grid([9, 17], [14], 4, 2), ...grid([5, 13, 21], [7], 4, 2)], gaps: G_SIDES, wind: 'R' },
    // 6  alternating bars
    { p: [[2, 22, 20, 1], [10, 18, 20, 1], [2, 14, 20, 1], [10, 10, 20, 1], [2, 6, 20, 1]], gaps: [[24, 4]], wind: 'L' },
    // 7  pyramid
    { p: [[4, 23, 24, 1], [7, 19, 18, 1], [10, 15, 12, 1], [13, 11, 6, 1], [15, 7, 2, 1]], gaps: G_SIDES, wind: 'C' },
    // 8  H frame
    { p: [[8, 6, 2, 16], [22, 6, 2, 16], [10, 14, 12, 1], ...sym([[2, 10, 5, 1], [2, 20, 5, 1]])], gaps: G_CENTER, wind: 'C' },
    // 9  zigzag
    { p: [[2, 23, 16, 1], [14, 19, 16, 1], [2, 15, 16, 1], [14, 11, 16, 1], [2, 7, 16, 1]], gaps: [[20, 4]], wind: 'R' },
    // 10 cup
    { p: [[4, 23, 24, 1], ...sym([[4, 16, 3, 1], [4, 10, 3, 1]]), [10, 13, 12, 1], [13, 6, 6, 1]], gaps: G_SIDES, wind: 'C' },
    // 11 floating dots
    { p: [...grid([4, 12, 20, 26], [22], 2, 1), ...grid([8, 16, 24], [18], 2, 1), ...grid([4, 12, 20, 26], [14], 2, 1), ...grid([8, 16, 24], [10], 2, 1), ...grid([4, 12, 20, 26], [6], 2, 1)], gaps: G_SIDES, wind: 'C' },
    // 12 side ladders
    { p: sym([[2, 23, 6, 1], [2, 19, 6, 1], [2, 15, 6, 1], [2, 11, 6, 1], [2, 7, 6, 1]]).concat([[12, 17, 8, 1], [12, 9, 8, 1]]), gaps: G_CENTER, wind: 'C' },
    // 13 diamond
    { p: [[14, 22, 4, 1], [11, 18, 10, 1], [8, 14, 16, 1], [11, 10, 10, 1], [14, 6, 4, 1], ...sym([[2, 12, 3, 1]])], gaps: G_WIDE, wind: 'C' },
    // 14 corridors
    { p: [[2, 21, 24, 1], [6, 16, 24, 1], [2, 11, 24, 1], [6, 6, 24, 1]], gaps: [[26, 4]], wind: 'L' },
    // 15 cage
    { p: [[6, 8, 1, 14], [25, 8, 1, 14], [6, 8, 20, 1], [6, 21, 20, 1], [12, 14, 8, 1], ...sym([[2, 24, 3, 1]])], gaps: G_CENTER, wind: 'C' },
    // 16 hanging bars
    { p: [[4, 2, 1, 8], [27, 2, 1, 8], [4, 10, 6, 1], [22, 10, 6, 1], [12, 12, 8, 1], [2, 18, 10, 1], [20, 18, 10, 1], [12, 22, 8, 1]], gaps: G_SIDES, wind: 'C' },
    // 17 checker
    { p: [...grid([2, 10, 18, 26], [23], 4, 1), ...grid([6, 14, 22], [19], 4, 1), ...grid([2, 10, 18, 26], [15], 4, 1), ...grid([6, 14, 22], [11], 4, 1), ...grid([2, 10, 18, 26], [7], 4, 1)], gaps: [[14, 4]], wind: 'C' },
    // 18 towers
    { p: [[5, 14, 4, 13], [23, 14, 4, 13], [13, 18, 6, 9], [2, 9, 8, 1], [22, 9, 8, 1], [12, 12, 8, 1], [14, 5, 4, 1]], gaps: G_SIDES, wind: 'C' },
    // 19 wide stairs
    { p: [...stairsDown(2, 6, 6, 4, 6), ...stairsUp(2, 25, 0, 0, 0), [24, 22, 6, 1]], gaps: [[26, 3]], wind: 'R' },
    // 20 bridge
    { p: [[2, 14, 28, 1], [8, 20, 4, 1], [20, 20, 4, 1], [14, 23, 4, 1], [6, 8, 6, 1], [20, 8, 6, 1], [13, 5, 6, 1]], gaps: G_SIDES, wind: 'C' },
    // 21 scattered
    { p: [[3, 24, 5, 1], [12, 22, 8, 1], [24, 24, 4, 1], [6, 18, 5, 1], [20, 17, 6, 1], [2, 13, 4, 1], [11, 12, 9, 1], [26, 12, 4, 1], [5, 8, 6, 1], [21, 7, 6, 1], [13, 5, 6, 1]], gaps: G_CENTER, wind: 'C' },
    // 22 double columns
    { p: [[10, 4, 2, 20], [20, 4, 2, 20], ...sym([[2, 20, 6, 1], [2, 14, 6, 1], [2, 8, 6, 1]]), [12, 17, 8, 1], [12, 11, 8, 1]], gaps: G_CENTER, wind: 'C' },
    // 23 nested U
    { p: [[4, 22, 24, 1], [4, 12, 1, 10], [27, 12, 1, 10], [8, 17, 16, 1], [8, 10, 1, 7], [23, 10, 1, 7], [13, 12, 6, 1], [10, 6, 12, 1]], gaps: G_SIDES, wind: 'C' },
    // 24 rain
    { p: [...grid([3, 9, 15, 21, 27], [23], 2, 1), ...grid([6, 12, 18, 24], [19], 2, 1), ...grid([3, 9, 15, 21, 27], [15], 2, 1), ...grid([6, 12, 18, 24], [11], 2, 1), ...grid([3, 9, 15, 21, 27], [7], 2, 1), ...grid([6, 12, 18, 24], [3], 2, 1)], gaps: G_SIDES, wind: 'C' },
    // 25 T
    { p: [[2, 8, 28, 1], [15, 9, 2, 14], [6, 14, 6, 1], [20, 14, 6, 1], [4, 20, 8, 1], [20, 20, 8, 1]], gaps: G_CENTER, wind: 'C' },
    // 26 arrows
    { p: [...stairsUp(2, 24, 4, 2, 3), ...stairsDown(2, 6, 4, 2, 3), ...stairsUp(19, 24, 4, 2, 3).map(r => [M(r[0], r[2]), r[1], r[2], r[3]]), ...stairsDown(19, 6, 4, 2, 3).map(r => [M(r[0], r[2]), r[1], r[2], r[3]]), [13, 15, 6, 1]], gaps: G_CENTER, wind: 'C' },
    // 27 wall of gaps
    { p: [[2, 20, 4, 1], [8, 20, 4, 1], [14, 20, 4, 1], [20, 20, 4, 1], [26, 20, 4, 1], [5, 15, 4, 1], [11, 15, 4, 1], [17, 15, 4, 1], [23, 15, 4, 1], [2, 10, 4, 1], [8, 10, 4, 1], [14, 10, 4, 1], [20, 10, 4, 1], [26, 10, 4, 1], [5, 5, 4, 1], [11, 5, 4, 1], [17, 5, 4, 1], [23, 5, 4, 1]], gaps: G_SIDES, wind: 'C' },
    // 28 spiral-ish
    { p: [[2, 22, 22, 1], [8, 17, 22, 1], [2, 12, 22, 1], [8, 7, 22, 1], [26, 22, 1, 5], [5, 17, 1, 5], [26, 12, 1, 5]], gaps: [[2, 3]], wind: 'L' },
    // 29 platforms + pillars
    { p: [[4, 23, 6, 1], [22, 23, 6, 1], [13, 21, 6, 1], [15, 12, 2, 9], [4, 16, 8, 1], [20, 16, 8, 1], [2, 9, 6, 1], [24, 9, 6, 1], [10, 6, 12, 1]], gaps: G_SIDES, wind: 'C' },
    // 30 crown
    { p: [[2, 24, 28, 1], [4, 20, 2, 4], [14, 20, 4, 4], [26, 20, 2, 4], [2, 14, 8, 1], [22, 14, 8, 1], [10, 10, 12, 1], [6, 6, 4, 1], [22, 6, 4, 1]], gaps: G_ALL, wind: 'C' },
    // 31 ledges in walls
    { p: sym([[2, 24, 3, 1], [2, 21, 3, 1], [2, 18, 3, 1], [2, 15, 3, 1], [2, 12, 3, 1], [2, 9, 3, 1], [2, 6, 3, 1]]).concat([[9, 19, 14, 1], [9, 12, 14, 1], [13, 6, 6, 1]]), gaps: G_CENTER, wind: 'C' },
    // 32 big block
    { p: [[10, 12, 12, 8], [2, 22, 6, 1], [24, 22, 6, 1], [5, 16, 3, 1], [24, 16, 3, 1], [2, 9, 6, 1], [24, 9, 6, 1], [12, 6, 8, 1]], gaps: G_SIDES, wind: 'C' },
    // 33 lanes
    { p: [[2, 23, 8, 1], [12, 23, 8, 1], [22, 23, 8, 1], [7, 19, 8, 1], [17, 19, 8, 1], [2, 15, 8, 1], [12, 15, 8, 1], [22, 15, 8, 1], [7, 11, 8, 1], [17, 11, 8, 1], [2, 7, 8, 1], [12, 7, 8, 1], [22, 7, 8, 1]], gaps: G_SIDES, wind: 'C' },
    // 34 cross
    { p: [[15, 3, 2, 22], [4, 14, 24, 1], [2, 22, 5, 1], [25, 22, 5, 1], [2, 7, 5, 1], [25, 7, 5, 1], [9, 19, 4, 1], [19, 19, 4, 1], [9, 9, 4, 1], [19, 9, 4, 1]], gaps: G_SIDES, wind: 'C' },
    // 35 waves
    { p: [[2, 23, 4, 1], [6, 22, 4, 1], [10, 21, 4, 1], [14, 22, 4, 1], [18, 23, 4, 1], [22, 22, 4, 1], [26, 21, 4, 1], [2, 16, 4, 1], [6, 15, 4, 1], [10, 14, 4, 1], [14, 15, 4, 1], [18, 16, 4, 1], [22, 15, 4, 1], [26, 14, 4, 1], [2, 9, 4, 1], [6, 8, 4, 1], [10, 7, 4, 1], [14, 8, 4, 1], [18, 9, 4, 1], [22, 8, 4, 1], [26, 7, 4, 1]], gaps: G_CENTER, wind: 'C' },
    // 36 two rooms
    { p: [[15, 2, 2, 12], [2, 14, 28, 1], [15, 15, 2, 6], [5, 21, 6, 1], [21, 21, 6, 1], [5, 8, 6, 1], [21, 8, 6, 1]], gaps: G_SIDES, wind: 'C' },
    // 37 stair tower
    { p: [...stairsUp(2, 24, 5, 3, 4), ...stairsUp(13, 24, 5, 3, 4).map(r => [M(r[0], r[2]), r[1], r[2], r[3]]), [12, 8, 8, 1]], gaps: G_CENTER, wind: 'C' },
    // 38 combs
    { p: [[2, 20, 28, 1], [4, 21, 1, 6], [9, 21, 1, 6], [14, 21, 1, 6], [19, 21, 1, 6], [24, 21, 1, 6], [2, 12, 28, 1], [6, 13, 1, 4], [12, 13, 1, 4], [18, 13, 1, 4], [24, 13, 1, 4], [8, 6, 16, 1]], gaps: [[27, 3]], wind: 'R' },
    // 39 vertical maze
    { p: [[6, 2, 1, 10], [12, 8, 1, 12], [18, 2, 1, 12], [24, 8, 1, 12], [2, 22, 8, 1], [14, 22, 8, 1], [26, 22, 4, 1], [7, 16, 5, 1], [19, 16, 5, 1], [2, 11, 4, 1], [7, 7, 5, 1], [19, 6, 5, 1], [26, 11, 4, 1]], gaps: G_SIDES, wind: 'C' },
    // 40 fortress
    { p: [[4, 20, 24, 1], [4, 14, 2, 6], [26, 14, 2, 6], [8, 16, 16, 1], [12, 10, 8, 1], [2, 6, 8, 1], [22, 6, 8, 1], [10, 24, 4, 1], [18, 24, 4, 1]], gaps: G_SIDES, wind: 'C' },
    // 41 slots
    { p: [[2, 24, 6, 1], [24, 24, 6, 1], [10, 24, 12, 1], [2, 19, 3, 1], [27, 19, 3, 1], [8, 19, 4, 1], [20, 19, 4, 1], [13, 16, 6, 1], [2, 13, 8, 1], [22, 13, 8, 1], [8, 9, 16, 1], [2, 5, 4, 1], [26, 5, 4, 1]], gaps: G_CENTER, wind: 'C' },
    // 42 snake
    { p: [[2, 23, 24, 1], [26, 19, 4, 1], [6, 19, 20, 1], [2, 15, 4, 1], [6, 15, 20, 1], [26, 11, 4, 1], [6, 11, 20, 1], [2, 7, 24, 1]], gaps: [[27, 3]], wind: 'R' },
    // 43 islands
    { p: [[3, 23, 6, 1], [23, 23, 6, 1], [12, 20, 8, 1], [3, 17, 4, 1], [25, 17, 4, 1], [9, 14, 5, 1], [18, 14, 5, 1], [3, 11, 4, 1], [25, 11, 4, 1], [12, 8, 8, 1], [6, 5, 4, 1], [22, 5, 4, 1]], gaps: G_SIDES, wind: 'C' },
    // 44 rails
    { p: [[2, 24, 28, 1], [2, 20, 12, 1], [18, 20, 12, 1], [2, 16, 4, 1], [26, 16, 4, 1], [8, 16, 16, 1], [2, 12, 12, 1], [18, 12, 12, 1], [8, 8, 16, 1], [2, 4, 4, 1], [26, 4, 4, 1]], gaps: G_ALL, wind: 'C' },
    // 45 monoliths
    { p: [[6, 6, 3, 8], [23, 6, 3, 8], [14, 10, 4, 8], [6, 18, 3, 8], [23, 18, 3, 8], [2, 14, 4, 1], [26, 14, 4, 1], [10, 22, 12, 1], [10, 6, 12, 1]], gaps: G_SIDES, wind: 'C' },
    // 46 nets
    { p: [...grid([2, 8, 14, 20, 26], [24, 18, 12, 6], 4, 1), ...grid([5, 11, 17, 23], [21, 15, 9], 2, 1)], gaps: G_CENTER, wind: 'C' },
    // 47 gates
    { p: [[2, 22, 5, 1], [9, 22, 14, 1], [25, 22, 5, 1], [9, 16, 1, 6], [22, 16, 1, 6], [9, 15, 14, 1], [2, 10, 5, 1], [25, 10, 5, 1], [12, 9, 8, 1], [15, 4, 2, 5]], gaps: G_SIDES, wind: 'C' },
    // 48 up-down stairs
    { p: [...stairsDown(2, 5, 7, 4, 4), ...stairsUp(2, 23, 0, 0, 0), [2, 24, 4, 1], [26, 24, 4, 1], [10, 12, 4, 1]], gaps: [[26, 3]], wind: 'R' },
    // 49 layered cake
    { p: [[2, 23, 28, 1], [4, 19, 24, 1], [6, 15, 20, 1], [8, 11, 16, 1], [10, 7, 12, 1], [12, 3, 8, 1]], gaps: G_ALL, wind: 'C' },
    // 50 windows
    { p: [[4, 5, 1, 18], [27, 5, 1, 18], [4, 22, 24, 1], [4, 5, 24, 1], [9, 13, 14, 1], [9, 18, 5, 1], [18, 18, 5, 1], [13, 9, 6, 1], [2, 25, 3, 1], [27, 25, 3, 1]], gaps: G_CENTER, wind: 'C' },
    // 51 twin peaks
    { p: [...stairsUp(2, 24, 4, 2, 3), ...stairsDown(9, 15, 3, 2, 3), ...stairsUp(17, 21, 4, 2, 3), ...stairsDown(24, 12, 2, 2, 3), [13, 8, 6, 1]], gaps: G_SIDES, wind: 'C' },
    // 52 plus signs
    { p: [[7, 18, 1, 5], [5, 20, 5, 1], [24, 18, 1, 5], [22, 20, 5, 1], [15, 12, 2, 6], [12, 14, 8, 1], [7, 6, 1, 5], [5, 8, 5, 1], [24, 6, 1, 5], [22, 8, 5, 1], [13, 23, 6, 1], [14, 5, 4, 1]], gaps: G_SIDES, wind: 'C' },
    // 53 ladder
    { p: [[12, 3, 1, 22], [19, 3, 1, 22], [13, 22, 6, 1], [13, 18, 6, 1], [13, 14, 6, 1], [13, 10, 6, 1], [13, 6, 6, 1], [2, 20, 8, 1], [22, 20, 8, 1], [2, 12, 8, 1], [22, 12, 8, 1], [2, 5, 8, 1], [22, 5, 8, 1]], gaps: G_CENTER, wind: 'C' },
    // 54 basin
    { p: [[2, 18, 3, 1], [27, 18, 3, 1], [5, 23, 22, 1], [5, 19, 1, 4], [26, 19, 1, 4], [9, 16, 14, 1], [12, 12, 8, 1], [2, 8, 8, 1], [22, 8, 8, 1], [14, 5, 4, 1]], gaps: G_CENTER, wind: 'C' },
    // 55 mesh
    { p: [...grid([2, 6, 10, 14, 18, 22, 26], [22, 16, 10], 3, 1), ...grid([4, 8, 12, 16, 20, 24], [19, 13, 7], 3, 1)], gaps: G_SIDES, wind: 'C' },
    // 56 pit
    { p: [[2, 24, 10, 1], [20, 24, 10, 1], [11, 18, 1, 7], [20, 18, 1, 7], [11, 17, 10, 1], [2, 14, 8, 1], [22, 14, 8, 1], [8, 10, 16, 1], [2, 6, 6, 1], [24, 6, 6, 1], [13, 5, 6, 1]], gaps: G_CENTER, wind: 'C' },
    // 57 offset columns
    { p: [[5, 4, 2, 8], [11, 12, 2, 8], [19, 4, 2, 8], [25, 12, 2, 8], [2, 23, 7, 1], [11, 23, 10, 1], [23, 23, 7, 1], [2, 12, 3, 1], [7, 12, 4, 1], [21, 12, 4, 1], [27, 12, 3, 1], [8, 7, 3, 1], [13, 5, 6, 1], [21, 7, 3, 1]], gaps: G_SIDES, wind: 'C' },
    // 58 nested boxes
    { p: [[8, 8, 16, 1], [8, 9, 1, 12], [23, 9, 1, 12], [8, 21, 16, 1], [12, 12, 8, 1], [12, 13, 1, 5], [19, 13, 1, 5], [12, 18, 8, 1], [2, 24, 4, 1], [26, 24, 4, 1], [2, 14, 4, 1], [26, 14, 4, 1], [2, 5, 4, 1], [26, 5, 4, 1]], gaps: G_CENTER, wind: 'C' },
    // 59 slopes
    { p: [[2, 24, 6, 1], [8, 23, 6, 1], [14, 22, 6, 1], [20, 21, 6, 1], [26, 20, 4, 1], [2, 16, 4, 1], [6, 15, 6, 1], [12, 14, 6, 1], [18, 13, 6, 1], [24, 12, 6, 1], [2, 8, 6, 1], [8, 7, 6, 1], [14, 6, 6, 1], [20, 5, 6, 1], [26, 4, 4, 1]], gaps: G_ALL, wind: 'L' },
    // 60 arena
    { p: [[2, 22, 4, 1], [26, 22, 4, 1], [6, 18, 4, 1], [22, 18, 4, 1], [10, 14, 12, 1], [6, 10, 4, 1], [22, 10, 4, 1], [2, 6, 4, 1], [26, 6, 4, 1], [13, 6, 6, 1]], gaps: G_CENTER, wind: 'C' }
  ];

  // Tile palettes per group of 10 rounds (base, light, dark, pattern accent)
  const PALETTES = [
    { base: '#3060e8', hi: '#80a8ff', lo: '#102078', acc: '#f8f0c0', pat: 0 },
    { base: '#20a860', hi: '#70e8a0', lo: '#085030', acc: '#f0ffe0', pat: 1 },
    { base: '#e04880', hi: '#ff98c0', lo: '#701038', acc: '#ffe8f0', pat: 2 },
    { base: '#d88028', hi: '#ffc070', lo: '#703808', acc: '#fff0d0', pat: 3 },
    { base: '#8848d8', hi: '#c898ff', lo: '#381070', acc: '#f0e0ff', pat: 4 },
    { base: '#20a8b0', hi: '#80f0f8', lo: '#084858', acc: '#e0ffff', pat: 5 },
    { base: '#c83030', hi: '#ff8080', lo: '#600808', acc: '#ffe0e0', pat: 0 },
    { base: '#b8a020', hi: '#ffe860', lo: '#584808', acc: '#fffbe0', pat: 1 },
    { base: '#5058c8', hi: '#98a0ff', lo: '#181c60', acc: '#e8e8ff', pat: 2 },
    { base: '#707880', hi: '#c0c8d0', lo: '#282c30', acc: '#f8f8f8', pat: 3 }
  ];

  // Enemy roster by round
  function rosterFor(n) {
    const types = ['zen'];
    if (n >= 4) types.push('mighta');
    if (n >= 9) types.push('monsta');
    if (n >= 15) types.push('pulpul');
    if (n >= 24) types.push('banebou');
    if (n >= 35) types.push('hidegons');
    if (n >= 45) types.push('drunk');
    if (n >= 55) types.push('invader');
    const count = Math.min(7, 4 + Math.floor((n - 1) / 15) + (n % 5 === 0 ? 1 : 0));
    const rng = seeded(n * 7919 + 13);
    const list = [];
    // newest types are emphasised on the round they debut
    for (let i = 0; i < count; i++) {
      let t;
      if (i === 0 && n >= 4) t = types[types.length - 1];
      else t = types[Math.floor(rng() * types.length)];
      list.push(t);
    }
    return list;
  }

  function seeded(seed) {
    let s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // Build a level object: map (ROWS x COLS array of 0/1), spawns, palette
  function build(n) {
    let layoutIdx, mirror = false;
    if (n <= LAYOUTS.length) { layoutIdx = n - 1; }
    else { layoutIdx = ((n - 1) * 37 + 11) % LAYOUTS.length; mirror = (n % 2 === 0); }
    const lay = LAYOUTS[layoutIdx];
    const map = [];
    for (let r = 0; r < ROWS; r++) { map.push(new Array(COLS).fill(0)); }
    // walls
    for (let r = 1; r < ROWS; r++) { map[r][0] = map[r][1] = map[r][COLS - 2] = map[r][COLS - 1] = 1; }
    // ceiling & floor with gaps
    const gaps = lay.gaps.map(g => mirror ? [M(g[0], g[1]), g[1]] : g);
    for (let c = 2; c < COLS - 2; c++) {
      let inGap = false;
      for (const g of gaps) if (c >= g[0] && c < g[0] + g[1]) inGap = true;
      if (!inGap) { map[1][c] = 1; map[ROWS - 1][c] = 1; }
    }
    // platforms
    for (const rc of lay.p) {
      let [x, y, w, h] = rc;
      if (w <= 0 || h <= 0) continue;
      if (mirror) x = M(x, w);
      for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) {
        if (r >= 1 && r < ROWS && c >= 0 && c < COLS) map[r][c] = 1;
      }
    }
    // keep the player's start corner clear: bottom-left cells (2..5, 24..26)
    for (let r = 23; r < ROWS - 1; r++) for (let c = 2; c < 6; c++) map[r][c] = 0;
    map[ROWS - 1][2] = map[ROWS - 1][3] = map[ROWS - 1][4] = 1;
    map[1][2] = map[1][3] = map[1][4] = 1;

    // Enemy spawn spots: cells whose tile below is solid and 2 free tiles above.
    const spots = [];
    for (let r = 3; r < ROWS - 1; r++) for (let c = 2; c < COLS - 2; c++) {
      if (map[r][c] === 1 && map[r - 1][c] === 0 && map[r - 2][c] === 0 && (c + 1 < COLS - 2 && map[r][c + 1] === 1 && map[r - 1][c + 1] === 0 && map[r - 2][c + 1] === 0)) {
        if (r >= 22 && c < 10) continue; // not near the player start
        spots.push({ c, r: r - 2, top: r < 14 });
      }
    }
    const roster = rosterFor(n);
    const rng = seeded(n * 104729 + 7);
    const spawns = [];
    const used = [];
    for (const type of roster) {
      let best = null, tries = 0;
      while (tries++ < 60) {
        const s = spots[Math.floor(rng() * spots.length)];
        if (!s) break;
        let ok = true;
        for (const u of used) if (Math.abs(u.c - s.c) < 4 && Math.abs(u.r - s.r) < 3) { ok = false; break; }
        if (ok) { best = s; break; }
      }
      if (!best) best = spots[Math.floor(rng() * spots.length)] || { c: 15, r: 3 };
      used.push(best);
      spawns.push({ type, x: best.c * 8, y: best.r * 8 });
    }
    let wind = lay.wind;
    if (mirror && wind === 'L') wind = 'R'; else if (mirror && wind === 'R') wind = 'L';
    return { n, map, spawns, wind, palette: PALETTES[Math.floor((n - 1) / 10) % PALETTES.length] };
  }

  // Boss arena for round 100
  function buildBoss() {
    const lv = build(60);
    lv.n = 100;
    lv.spawns = [];
    lv.boss = true;
    lv.palette = { base: '#802020', hi: '#ff6060', lo: '#300808', acc: '#ffd0d0', pat: 2 };
    return lv;
  }

  window.Levels = { build, buildBoss, COLS, ROWS, count: 100, PALETTES, seeded };
})();
