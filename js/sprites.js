/* ============================================================
   Bubble Bobble — pixel art sprite definitions & rasterizer
   All sprites are drawn as text; each char maps to a palette color.
   ============================================================ */
(function () {
  'use strict';

  const PAL = {
    'K': '#000000', 'W': '#ffffff',
    'g': '#48e848', 'G': '#00a040', 'h': '#a8ff80',
    'y': '#ffe860', 'Y': '#ffa000',
    'r': '#ff3838', 'R': '#a80808',
    'b': '#50c8ff', 'B': '#1868f0', 'D': '#0c3898',
    'p': '#ff90f0', 'P': '#a848f0', 'V': '#6018a8',
    'o': '#ff8020', 'n': '#8c4810', 'N': '#d8a060',
    'c': '#60f8f8', 'e': '#f8c8a0', 'l': '#c8c8c8', 'd': '#707070', 'k': '#383838',
    'm': '#e02890', 'i': '#b8f850', 't': '#20b8a8', 's': '#fff0c0', 'q': '#ffd0a0'
  };

  const S = {};

  // ---------- BUB (player) ----------
  S.bub_idle = [
    "......GGGG......",
    "....GGggggGG....",
    "...GggggggggG...",
    "..GggWWWgWWWgG..",
    "..GgWWWKgWWWKG..",
    "..GgWWWKgWWWKG..",
    "..GggWWWgWWWgG..",
    "..GgggggggggggG.",
    "..GgggKKKKKKggG.",
    "..GggyyyyyyyggG.",
    ".G.GgyyyyyyyggG.",
    ".GG.GgyyyyyyggG.",
    "..GGGgyyyyyggG..",
    "...GGGgggggGG...",
    "....GggG.GggG...",
    "....GGGG.GGGG..."];
  S.bub_walk0 = [
    "......GGGG......",
    "....GGggggGG....",
    "...GggggggggG...",
    "..GggWWWgWWWgG..",
    "..GgWWWKgWWWKG..",
    "..GgWWWKgWWWKG..",
    "..GggWWWgWWWgG..",
    "..GgggggggggggG.",
    "..GgggKKKKKKggG.",
    "..GggyyyyyyyggG.",
    ".G.GgyyyyyyyggG.",
    ".GG.GgyyyyyyggG.",
    "..GGGgyyyyyggG..",
    "...GGGgggggGG...",
    "..GggG.....GggG.",
    "..GGGG.....GGGG."];
  S.bub_walk1 = [
    "................",
    "......GGGG......",
    "....GGggggGG....",
    "...GggggggggG...",
    "..GggWWWgWWWgG..",
    "..GgWWWKgWWWKG..",
    "..GgWWWKgWWWKG..",
    "..GggWWWgWWWgG..",
    "..GgggggggggggG.",
    "..GgggKKKKKKggG.",
    ".G.GgyyyyyyyggG.",
    ".GG.GyyyyyyyggG.",
    "..GGGgyyyyyggG..",
    "...GGGgggggGG...",
    ".....GggGggG....",
    ".....GGGGGGG...."];
  S.bub_jump = [
    "......GGGG......",
    "....GGggggGG....",
    "...GggggggggG...",
    "..GggWWWgWWWgG..",
    "..GgWWWKgWWWKG..",
    "..GgWWWKgWWWKG..",
    "..GggWWWgWWWgG..",
    "..GgggggggggggG.",
    "..GgggKKKKKKggG.",
    ".G.GgyyyyyyyggG.",
    ".GG.GyyyyyyyggG.",
    "..GGGgyyyyyggG..",
    "...GGGgggggGGG..",
    "....GggGGGggG...",
    "....GGGG.GGGG...",
    "................"];
  S.bub_blow = [
    "......GGGG......",
    "....GGggggGG....",
    "...GggggggggG...",
    "..GggWWWgWWWgG..",
    "..GgWWWKgWWWKG..",
    "..GgWWWKgWWWKG..",
    "..GggWWWgWWWgG..",
    "..GgggggggKKKG..",
    "..GgggggggKrKG..",
    "..GggyyyyyyKKG..",
    ".G.GgyyyyyyyggG.",
    ".GG.GgyyyyyyggG.",
    "..GGGgyyyyyggG..",
    "...GGGgggggGG...",
    "....GggG.GggG...",
    "....GGGG.GGGG..."];
  S.bub_die = [
    "......GGGG......",
    "....GGggggGG....",
    "...GggggggggG...",
    "..GgKgKgggKgKgG.",
    "..GggKgggggKggG.",
    "..GgKgKgggKgKgG.",
    "..GgggggggggggG.",
    "..GgggggggggggG.",
    "..GggKKKKKKKggG.",
    "..GggyyyyyyyggG.",
    ".G.GgyyyyyyyggG.",
    ".GG.GgyyyyyyggG.",
    "..GGGgyyyyyggG..",
    "...GGGgggggGG...",
    "..GggG.....GggG.",
    "..GGGG.....GGGG."];
  S.bub_icon = [
    "..GggG..",
    ".GgWgWG.",
    ".GgWgWG.",
    ".GggggG.",
    ".GgyyyG.",
    "..GgygG.",
    "...GGG..",
    "........"];

  // ---------- BOB (2P colour swap, used on title) ----------
  // ---------- ENEMIES ----------
  S.zen0 = [
    "....bbbbbbbb....",
    "...bbbbbbbbbb...",
    "..bbbWWWWWWWbb..",
    "..bbWWKWWWKWWb..",
    "..bbWWKWWWKWWb..",
    "..bbWWWWWWWWWb..",
    "l..bbWWRRRWWbb..",
    "ll.bbbbbbbbbbb..",
    "lll.bbbbbbbbbb..",
    "ll.bbbbbbbbbbbb.",
    "l.bbbbbbbbbbbbb.",
    "..bbbbbbbbbbbbb.",
    "...bbbbbbbbbbb..",
    "....bbb...bbb...",
    "....bbb...bbb...",
    "...bbbb...bbbb.."];
  S.zen1 = [
    "....bbbbbbbb....",
    "...bbbbbbbbbb...",
    "..bbbWWWWWWWbb..",
    "..bbWWKWWWKWWb..",
    "..bbWWKWWWKWWb..",
    "..bbWWWWWWWWWb..",
    ".l.bbWWRRRWWbb..",
    "ll.bbbbbbbbbbb..",
    "lll.bbbbbbbbbb..",
    "l..bbbbbbbbbbbb.",
    "..bbbbbbbbbbbbb.",
    "..bbbbbbbbbbbbb.",
    "...bbbbbbbbbbb..",
    "....bbbb.bbb....",
    ".....bbb.bbb....",
    "....bbbb..bbbb.."];

  S.mighta0 = [
    ".......PP.......",
    "......PPPP......",
    ".....PPPPPP.....",
    "....PPPPPPPP....",
    "...PPPPPPPPPP...",
    "..PPPPPPPPPPPP..",
    ".PPPPPPPPPPPPPP.",
    "....KKKKKKKK....",
    "...KKyyKKyyKKK..",
    "...KKyyKKyyKKK..",
    "...PPPPPPPPPPP..",
    "..PPPPPPPPPPPPP.",
    "..PPPPPPPPPPPPP.",
    "..PPPPPPPPPPPPP.",
    "..PPPPPPPPPPPPP.",
    "..PPP.PPPP.PPPP."];
  S.mighta1 = [
    ".......PP.......",
    "......PPPP......",
    ".....PPPPPP.....",
    "....PPPPPPPP....",
    "...PPPPPPPPPP...",
    "..PPPPPPPPPPPP..",
    ".PPPPPPPPPPPPPP.",
    "....KKKKKKKK....",
    "...KKyyKKyyKKK..",
    "...KKyyKKyyKKK..",
    "...PPPPPPPPPPP..",
    "..PPPPPPPPPPPPP.",
    "..PPPPPPPPPPPPP.",
    "..PPPPPPPPPPPPP.",
    "..PPPPPPPPPPPPP.",
    "..PPPPP.PPP.PPP."];

  S.monsta0 = [
    "....PPPPPPPP....",
    "..PPPPPPPPPPPP..",
    ".PPPWWPPPPWWPPP.",
    ".PPWWKWPPWWKWPP.",
    "PPPWWKWPPWWKWPPP",
    "PPPPWWPPPPWWPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPWWWWWWWWWWPPP",
    "PPPWRWRWRWRWRPPP",
    "PPPPRRRRRRRRPPPP",
    ".PPPPPPPPPPPPPP.",
    ".PPPPPPPPPPPPPP.",
    "..PP.PPPPPP.PP..",
    "..P..PPPPPP..P..",
    ".....PP..PP.....",
    "................"];
  S.monsta1 = [
    "................",
    "....PPPPPPPP....",
    "..PPPPPPPPPPPP..",
    ".PPPWWPPPPWWPPP.",
    ".PPWWKWPPWWKWPP.",
    "PPPWWKWPPWWKWPPP",
    "PPPPWWPPPPWWPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPWWWWWWWWWWPPP",
    "PPPWRWRWRWRWRPPP",
    "PPPPRRRRRRRRPPPP",
    ".PPPPPPPPPPPPPP.",
    "..PPPPPPPPPPPP..",
    ".PP..PPPPPP..PP.",
    ".....PP..PP.....",
    "................"];

  S.pulpul0 = [
    ".......dd.......",
    "..llllllllllll..",
    ".......dd.......",
    "......YYYY......",
    "....YYYYYYYY....",
    "...YYWWWYWWWYY..",
    "...YWWWKYWWWKY..",
    "...YYWWWYWWWYY..",
    "...YYYYYYYYYYY..",
    "..YYYYYYRRYYYYY.",
    "..YYYYYYYYYYYYY.",
    "...YYYYYYYYYYY..",
    "....YYYYYYYYY...",
    ".....YY..YY.....",
    "....YYY..YYY....",
    "................"];
  S.pulpul1 = [
    ".......dd.......",
    "......llll......",
    ".......dd.......",
    "......YYYY......",
    "....YYYYYYYY....",
    "...YYWWWYWWWYY..",
    "...YWWWKYWWWKY..",
    "...YYWWWYWWWYY..",
    "...YYYYYYYYYYY..",
    "..YYYYYYRRYYYYY.",
    "..YYYYYYYYYYYYY.",
    "...YYYYYYYYYYY..",
    "....YYYYYYYYY...",
    ".....YY..YY.....",
    "....YYY..YYY....",
    "................"];

  S.banebou0 = [
    "................",
    "....oooooooo....",
    "...oooooooooo...",
    "..ooWWWooWWWoo..",
    "..oWWWKooWWWKo..",
    "..oWWWKooWWWKo..",
    "..ooWWWooWWWoo..",
    "..oooooooooooo..",
    "..oooRRRRRRooo..",
    "...oooooooooo...",
    "....oooooooo....",
    ".....llllll.....",
    "......llll......",
    ".....llllll.....",
    "......llll......",
    ".....llllll....."];
  S.banebou1 = [
    "....oooooooo....",
    "...oooooooooo...",
    "..ooWWWooWWWoo..",
    "..oWWWKooWWWKo..",
    "..oWWWKooWWWKo..",
    "..ooWWWooWWWoo..",
    "..oooooooooooo..",
    "..oooRRRRRRooo..",
    "...oooooooooo...",
    "....oooooooo....",
    ".....llllll.....",
    "......llll......",
    "................",
    ".....llllll.....",
    "................",
    ".....llllll....."];

  S.hidegons0 = [
    "..r..r....r..r..",
    "..rr.r....r.rr..",
    "..rrrrrrrrrrrr..",
    ".rrrrrrrrrrrrrr.",
    ".rrWWWrrrrWWWrr.",
    ".rWWWKrrrrWWWKr.",
    ".rWWWKrrrrWWWKr.",
    ".rrWWWrrrrWWWrr.",
    ".rrrrrrrrrrrrrr.",
    ".rrWrrrrrrrrWrr.",
    ".rrrRRRRRRRRrrr.",
    "..rrrrrrrrrrrr..",
    "..rrrrrrrrrrrr..",
    "...rrrr..rrrr...",
    "...rrrr..rrrr...",
    "..rrrrr..rrrrr.."];
  S.hidegons1 = [
    "..r..r....r..r..",
    "..rr.r....r.rr..",
    "..rrrrrrrrrrrr..",
    ".rrrrrrrrrrrrrr.",
    ".rrWWWrrrrWWWrr.",
    ".rWWWKrrrrWWWKr.",
    ".rWWWKrrrrWWWKr.",
    ".rrWWWrrrrWWWrr.",
    ".rrrrrrrrrrrrrr.",
    ".rrWrrrrrrrrWrr.",
    ".rrrRRRRRRRRrrr.",
    "..rrrrrrrrrrrr..",
    "..rrrrrrrrrrrr..",
    "....rrrr.rrr....",
    ".....rrr.rrr....",
    "....rrrr..rrrr.."];

  S.drunk0 = [
    "....mmmmmmmm....",
    "...mmmmmmmmmm...",
    "..mmWWWmmmWWWmm.",
    "..mWWWKmmmWWWKm.",
    "..mmWWWmmmWWWmm.",
    "..mmmmmmrrmmmmm.",
    "..mmmmmmrrmmmmm.",
    "..mmmmmmmmmmmm..",
    "..mmmKKKKKKmmm..",
    "..mmmmmmmmmmmm.n",
    ".mmmmmmmmmmmm.nn",
    ".mmmmmmmmmmmm.nn",
    "..mmmmmmmmmmm.nn",
    "...mmmm..mmmm...",
    "...mmmm..mmmm...",
    "..mmmmm..mmmmm.."];
  S.drunk1 = [
    "....mmmmmmmm....",
    "...mmmmmmmmmm...",
    "..mmWWWmmmWWWmm.",
    "..mWWWKmmmWWWKm.",
    "..mmWWWmmmWWWmm.",
    "..mmmmmmrrmmmmm.",
    "..mmmmmmrrmmmmm.",
    "..mmmmmmmmmmmm..",
    "..mmmKKKKKKmmm.n",
    "..mmmmmmmmmmmm.n",
    ".mmmmmmmmmmmm.nn",
    ".mmmmmmmmmmmm.nn",
    "..mmmmmmmmmmm...",
    "....mmmm.mmm....",
    ".....mmm.mmm....",
    "....mmmm..mmmm.."];

  S.invader0 = [
    "......tttt......",
    "....tttttttt....",
    "...tttttttttt...",
    "..tttttttttttt..",
    "..ttWWWttWWWtt..",
    "..tWWWKttWWWKt..",
    "..ttWWWttWWWtt..",
    "..tttttttttttt..",
    "...llllllllll...",
    "..llllllllllll..",
    ".llllllllllllll.",
    ".ll.llllllll.ll.",
    "....llllllll....",
    "....ll....ll....",
    "...lll....lll...",
    "................"];
  S.invader1 = [
    "......tttt......",
    "....tttttttt....",
    "...tttttttttt...",
    "..tttttttttttt..",
    "..ttWWWttWWWtt..",
    "..tWWWKttWWWKt..",
    "..ttWWWttWWWtt..",
    "..tttttttttttt..",
    "...llllllllll...",
    "..llllllllllll..",
    ".llllllllllllll.",
    "..l.llllllll.l..",
    "....llllllll....",
    ".....ll..ll.....",
    "....lll..lll....",
    "................"];

  S.skel0 = [
    "....WWWWWWWW....",
    "..WWWWWWWWWWWW..",
    ".WWWKKWWWWKKWWW.",
    ".WWKKKKWWKKKKWW.",
    "WWWKKKKWWKKKKWWW",
    "WWWWKKWWWWKKWWWW",
    "WWWWWWWWWWWWWWWW",
    "WWWKWKWKWKWKWWWW",
    "WWWWWWWWWWWWWWWW",
    ".WWWWWWWWWWWWWW.",
    ".WWKWWKWWKWWKWW.",
    "..WWWWWWWWWWWW..",
    "...WW.WWWW.WW...",
    "................",
    "................",
    "................"];
  S.skel1 = [
    "................",
    "....WWWWWWWW....",
    "..WWWWWWWWWWWW..",
    ".WWWKKWWWWKKWWW.",
    ".WWKKKKWWKKKKWW.",
    "WWWKKKKWWKKKKWWW",
    "WWWWKKWWWWKKWWWW",
    "WWWWWWWWWWWWWWWW",
    "WWWKWKWKWKWKWWWW",
    "WWWWWWWWWWWWWWWW",
    ".WWWWWWWWWWWWWW.",
    ".WWKWWKWWKWWKWW.",
    "..WWWWWWWWWWWW..",
    ".WW.WW.WW.WW.WW.",
    "................",
    "................"];

  // ---------- BUBBLES ----------
  S.bubble0 = [
    ".....gggggg.....",
    "...gg......gg...",
    "..g..........g..",
    ".g...WW.......g.",
    ".g..W.........g.",
    "g...W..........g",
    "g..............g",
    "g..............g",
    "g..............g",
    "g..............g",
    "g..............g",
    ".g............g.",
    ".g............g.",
    "..g..........g..",
    "...gg......gg...",
    ".....gggggg....."];
  S.bubble1 = [
    "................",
    "....gggggggg....",
    "..gg........gg..",
    ".g....WW......g.",
    ".g...W........g.",
    "g....W.........g",
    "g..............g",
    "g..............g",
    "g..............g",
    "g..............g",
    ".g............g.",
    ".g............g.",
    "..gg........gg..",
    "....gggggggg....",
    "................",
    "................"];
  S.pop0 = [
    ".....gg..gg.....",
    "...g........g...",
    "..g..........g..",
    ".g............g.",
    "................",
    "g..............g",
    "g..............g",
    "................",
    "................",
    "g..............g",
    "g..............g",
    "................",
    ".g............g.",
    "..g..........g..",
    "...g........g...",
    ".....gg..gg....."];
  S.pop1 = [
    "................",
    "..g...........g.",
    "................",
    "......g..g......",
    "................",
    ".g............g.",
    "................",
    "................",
    "................",
    "................",
    ".g............g.",
    "................",
    "......g..g......",
    "................",
    "..g...........g.",
    "................"];

  // ---------- FRUITS / ITEMS ----------
  S.banana = [
    "................",
    "...........nn...",
    "..........yyn...",
    ".........yyyy...",
    "........yyyyy...",
    ".......yyyyy....",
    "......yyyyy.....",
    ".....yyyyy......",
    "....yyyyy.......",
    "...yyyyy........",
    "..yyyyy.........",
    ".yyyyy..........",
    ".nyyy...........",
    ".nnn............",
    "................",
    "................"];
  S.cherry = [
    "........n.......",
    ".......n.n......",
    "......n...n.....",
    ".....n.....n....",
    "....n......n....",
    "...rrr....rrr...",
    "..rrrrr..rrrrr..",
    ".rrWrrrrrrWrrrr.",
    ".rrrrrrrrrrrrrr.",
    ".rrrrrr.rrrrrrr.",
    "..rrrr...rrrrr..",
    "...rr.....rrr...",
    "................",
    "................",
    "................",
    "................"];
  S.orange = [
    ".......G........",
    "......GG........",
    ".....oooooo.....",
    "....oooooooo....",
    "...oooooooooo...",
    "..oooWoooooooo..",
    "..ooWooooooooo..",
    "..oooooooooooo..",
    "..oooooooooooo..",
    "..oooooooooooo..",
    "...oooooooooo...",
    "....oooooooo....",
    ".....oooooo.....",
    "................",
    "................",
    "................"];
  S.grapes = [
    ".......G........",
    "......GG........",
    ".....GG.........",
    "...PPPPPPPP.....",
    "..PPPPPPPPPP....",
    "..PpPPPpPPPP....",
    ".PPPPPPPPPPPP...",
    ".PPPpPPPPpPPP...",
    ".PPPPPPPPPPPP...",
    "..PPPPPPPPPP....",
    "..PPpPPPPPPP....",
    "...PPPPPPPP.....",
    "....PPPPPP......",
    ".....PPPP.......",
    "......PP........",
    "................"];
  S.melon = [
    "................",
    "................",
    "................",
    "..rrrrrrrrrrrr..",
    "..rrrKrrrKrrrr..",
    "...rrrrKrrrrKr..",
    "...rrKrrrrrrrr..",
    "....rrrrrKrrr...",
    "....rrrrrrrr....",
    ".....WWWWWW.....",
    ".....gGGGGg.....",
    "......GGGG......",
    ".......GG.......",
    "................",
    "................",
    "................"];
  S.pear = [
    ".......n........",
    ".......n........",
    "......ii........",
    "......iii.......",
    ".....iiii.......",
    ".....iiiii......",
    "....iiiiiii.....",
    "...iiiiiiiii....",
    "..iiiWiiiiiii...",
    "..iiWiiiiiiii...",
    "..iiiiiiiiiii...",
    "..iiiiiiiiiii...",
    "...iiiiiiiii....",
    "....iiiiiii.....",
    ".....iiiii......",
    "................"];
  S.apple = [
    ".......n........",
    ".......nG.......",
    "....rrrrGrrr....",
    "...rrrrrrrrrr...",
    "..rrWrrrrrrrrr..",
    "..rWrrrrrrrrrrr.",
    "..rrrrrrrrrrrrr.",
    "..rrrrrrrrrrrrr.",
    "..rrrrrrrrrrrrr.",
    "...rrrrrrrrrrr..",
    "...rrrrrrrrrrr..",
    "....rrrrrrrrr...",
    ".....rrr.rrr....",
    "................",
    "................",
    "................"];
  S.diamond = [
    "................",
    "................",
    "....bbbbbbbb....",
    "...bWbbbbbbbb...",
    "..bbWbbbbbbbbb..",
    ".bbbbbbbbbbbbbb.",
    "..bbbbbbbbbbbb..",
    "...bbbbbbbbbb...",
    "....bbbbbbbb....",
    ".....bbbbbb.....",
    "......bbbb......",
    ".......bb.......",
    "................",
    "................",
    "................",
    "................"];
  S.shoes = [
    "................",
    "................",
    "................",
    "......rrr.......",
    ".....rrrrr......",
    ".....rrrrrr.....",
    ".....rrrWrrr....",
    "....rrrrrrrrr...",
    "...rrrrrrrrrrr..",
    "..rrrrrrrrrrrrr.",
    ".WWWWWWWWWWWWWW.",
    ".WWWWWWWWWWWWWW.",
    "................",
    "................",
    "................",
    "................"];
  S.candy = [
    "................",
    "................",
    "................",
    "..p.........p...",
    "..pp..pppp..pp..",
    "..ppppppppppp...",
    "..pppppWpppppp..",
    "..ppppWpppppppp.",
    "..ppppppppppppp.",
    "..ppppppppppp...",
    "..pp..pppp..pp..",
    "..p.........p...",
    "................",
    "................",
    "................",
    "................"];
  S.umbrella = [
    ".......Y........",
    "....rrrrrrrr....",
    "..rrWWrrrrWWrr..",
    ".rrrWWrrrrWWrrr.",
    "rrrrWWrrrrWWrrrr",
    "rWWrrrrWWrrrrWWr",
    ".......nn.......",
    ".......nn.......",
    ".......nn.......",
    ".......nn.......",
    ".......nn.......",
    ".....n.nn.......",
    "......nnn.......",
    "................",
    "................",
    "................"];
  S.cross = [
    ".....yyyyy......",
    ".....yrrry......",
    ".....yrrry......",
    "..yyyyrrryyyy...",
    "..yrrrrrrrrry...",
    "..yrrrrrrrrry...",
    "..yyyyrrryyyy...",
    ".....yrrry......",
    ".....yrrry......",
    ".....yrrry......",
    ".....yrrry......",
    ".....yyyyy......",
    "................",
    "................",
    "................",
    "................"];
  S.potion = [
    "......llll......",
    "......llll......",
    ".......bb.......",
    "......bbbb......",
    ".....bbbbbb.....",
    "....bbbbbbbb....",
    "....bbWbbbbb....",
    "....bWbbbbbb....",
    "....bbbbbbbb....",
    "....bbbbbbbb....",
    ".....bbbbbb.....",
    "......bbbb......",
    "................",
    "................",
    "................",
    "................"];

  // ---------- PROJECTILES / EFFECTS (8x8) ----------
  S.boulder = [
    "..dddd..",
    ".dlllld.",
    "dlllllld",
    "dllllldd",
    "dlllllld",
    "dlllldld",
    ".dddddd.",
    "..dddd.."];
  S.fireball = [
    "...YY...",
    "..YYYY..",
    ".YYrrYY.",
    "YYrrrrYY",
    "YYrrrrYY",
    ".YYrrYY.",
    "..YYYY..",
    "...YY..."];
  S.bottle = [
    "...nn...",
    "...nn...",
    "..nnnn..",
    ".nnnnnn.",
    ".nnWnnn.",
    ".nnnnnn.",
    ".nnnnnn.",
    "..nnnn.."];
  S.laser = [
    "..yWWy..",
    "..yWWy..",
    "..yWWy..",
    "..yWWy..",
    "..yWWy..",
    "..yWWy..",
    "..yWWy..",
    "..yWWy.."];
  S.flame0 = [
    "...Y....",
    "..YY..Y.",
    ".YYYY.Y.",
    ".YrYYYY.",
    "YYrrYYYY",
    "YrrrrrYY",
    "YrrrrrrY",
    "rrrrrrrr"];
  S.flame1 = [
    ".Y......",
    ".Y..YY..",
    ".YY.YYY.",
    ".YYYYrY.",
    "YYYYrrYY",
    "YYrrrrrY",
    "YrrrrrrY",
    "rrrrrrrr"];
  S.drop = [
    "...bb...",
    "..bbbb..",
    ".bbWbbb.",
    ".bWbbbb.",
    ".bbbbbb.",
    ".bbbbbb.",
    "..bbbb..",
    "........"];
  S.water = [
    "bbBbbbBb",
    "BbbbBbbb",
    "bbbbbbbb",
    "bBbbbbBb",
    "bbbbBbbb",
    "bbBbbbbb",
    "bbbbbbBb",
    "BbbbBbbb"];
  S.bolt = [
    "................",
    ".yy.............",
    "..yyyyyy........",
    "....yyyyyyyy....",
    ".......yyyyyyyy.",
    "..........yyyyyy",
    "............yy..",
    "................"];
  S.spark = [
    "y..y",
    ".yy.",
    ".yy.",
    "y..y"];

  // ---------- 5x7 FONT ----------
  const FONT = {
    'A': [0x0E,0x11,0x11,0x1F,0x11,0x11,0x11], 'B': [0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
    'C': [0x0E,0x11,0x10,0x10,0x10,0x11,0x0E], 'D': [0x1E,0x11,0x11,0x11,0x11,0x11,0x1E],
    'E': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F], 'F': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
    'G': [0x0E,0x11,0x10,0x17,0x11,0x11,0x0F], 'H': [0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
    'I': [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E], 'J': [0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
    'K': [0x11,0x12,0x14,0x18,0x14,0x12,0x11], 'L': [0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
    'M': [0x11,0x1B,0x15,0x15,0x11,0x11,0x11], 'N': [0x11,0x19,0x15,0x13,0x11,0x11,0x11],
    'O': [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E], 'P': [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
    'Q': [0x0E,0x11,0x11,0x11,0x15,0x12,0x0D], 'R': [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
    'S': [0x0F,0x10,0x10,0x0E,0x01,0x01,0x1E], 'T': [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
    'U': [0x11,0x11,0x11,0x11,0x11,0x11,0x0E], 'V': [0x11,0x11,0x11,0x11,0x11,0x0A,0x04],
    'W': [0x11,0x11,0x11,0x15,0x15,0x15,0x0A], 'X': [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
    'Y': [0x11,0x11,0x0A,0x04,0x04,0x04,0x04], 'Z': [0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
    '0': [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E], '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
    '2': [0x0E,0x11,0x01,0x02,0x04,0x08,0x1F], '3': [0x1F,0x02,0x04,0x02,0x01,0x11,0x0E],
    '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02], '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
    '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E], '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
    '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E], '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
    ' ': [0,0,0,0,0,0,0], '.': [0,0,0,0,0,0x0C,0x0C], ',': [0,0,0,0,0x0C,0x04,0x08],
    '!': [0x04,0x04,0x04,0x04,0x04,0,0x04], '?': [0x0E,0x11,0x01,0x02,0x04,0,0x04],
    '-': [0,0,0,0x1F,0,0,0], ':': [0,0x0C,0x0C,0,0x0C,0x0C,0], "'": [0x04,0x04,0x08,0,0,0,0],
    '/': [0x01,0x02,0x02,0x04,0x08,0x08,0x10], '(': [0x02,0x04,0x08,0x08,0x08,0x04,0x02],
    ')': [0x08,0x04,0x02,0x02,0x02,0x04,0x08], '+': [0,0x04,0x04,0x1F,0x04,0x04,0],
    '=': [0,0,0x1F,0,0x1F,0,0], '>': [0x08,0x04,0x02,0x01,0x02,0x04,0x08], '<': [0x02,0x04,0x08,0x10,0x08,0x04,0x02],
    '"': [0x0A,0x0A,0,0,0,0,0], '*': [0,0x0A,0x04,0x1F,0x04,0x0A,0], '~': [0,0,0x08,0x15,0x02,0,0]
  };

  // ---------- Rasterizer ----------
  const cache = {};
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function raster(rows, opts) {
    opts = opts || {};
    const h = rows.length, w = rows[0].length;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const swap = opts.swap || null;
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < w; x++) {
        let ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        if (swap && swap[ch]) ch = swap[ch];
        let col = PAL[ch];
        if (!col) continue;
        if (ch.length > 1) col = ch;
        const r = parseInt(col.substr(1, 2), 16), g = parseInt(col.substr(3, 2), 16), b = parseInt(col.substr(5, 2), 16);
        const i = (y * w + x) * 4;
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
  function flipH(src) {
    const c = makeCanvas(src.width, src.height);
    const ctx = c.getContext('2d');
    ctx.translate(src.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    return c;
  }
  function scaled(src, k) {
    const c = makeCanvas(src.width * k, src.height * k);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  // get(name, {swap, flip})
  function get(name, opts) {
    opts = opts || {};
    const key = name + '|' + (opts.swapKey || '') + '|' + (opts.flip ? 'f' : '') + '|' + (opts.scale || 1);
    if (cache[key]) return cache[key];
    const rows = S[name];
    if (!rows) throw new Error('no sprite ' + name);
    let c = raster(rows, { swap: opts.swap });
    if (opts.scale && opts.scale > 1) c = scaled(c, opts.scale);
    if (opts.flip) c = flipH(c);
    cache[key] = c;
    return c;
  }

  // Colour-swap tables
  const SWAPS = {
    angry: { 'b': 'r', 'P': 'r', 'Y': 'r', 'o': 'r', 'm': 'r', 't': 'r', 'r': 'R', 'V': 'R', 'W': 'y', 'l': 'q' },
    bob: { 'g': 'b', 'G': 'B', 'y': 'W' },
    redBubble: { 'g': 'r' },
    fireBubble: { 'g': 'o' },
    waterBubble: { 'g': 'b' },
    boltBubble: { 'g': 'y' },
    extendBubble: { 'g': 'p' },
    candyBlue: { 'p': 'b' },
    candyYellow: { 'p': 'y' },
    crossBlue: { 'r': 'b', 'y': 'W' },
    crossYellow: { 'r': 'y', 'y': 'W' },
    pinkBubble: { 'g': 'p' }
  };

  // Font rendering
  const fontCache = {};
  function glyph(ch, color) {
    const key = ch + color;
    if (fontCache[key]) return fontCache[key];
    const rows = FONT[ch] || FONT['?'];
    const c = makeCanvas(8, 8);
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    for (let y = 0; y < 7; y++) {
      const bits = rows[y];
      for (let x = 0; x < 5; x++) {
        if (bits & (1 << (4 - x))) ctx.fillRect(x + 1, y, 1, 1);
      }
    }
    fontCache[key] = c;
    return c;
  }
  function text(ctx, str, x, y, color, scale) {
    scale = scale || 1;
    color = color || '#ffffff';
    str = String(str).toUpperCase();
    for (let i = 0; i < str.length; i++) {
      const g = glyph(str[i], color);
      ctx.drawImage(g, x + i * 8 * scale, y, 8 * scale, 8 * scale);
    }
  }
  function textCenter(ctx, str, cx, y, color, scale) {
    scale = scale || 1;
    text(ctx, str, Math.floor(cx - (String(str).length * 8 * scale) / 2), y, color, scale);
  }

  window.Sprites = { PAL, S, get, SWAPS, text, textCenter, makeCanvas, raster };
})();
