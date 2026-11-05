// Line-figure animations for the 「動作」 tab. Pure functions: animInner(id, t) -> inner SVG markup for a 150x150 viewBox,
// t = 0 (start pose) .. 1 (end pose). Angles are in degrees, measured from "straight down", positive toward the front.
// Orange (#ff7a00) marks the body part that does the work, the same colour as the prime movers on the 3D model.

const G = 136;                       // ground (ankle) line
const rad = (d) => (d * Math.PI) / 180;
const vec = (len, ang) => [len * Math.sin(rad(ang)), len * Math.cos(rad(ang))];
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const n1 = (n) => (Math.round(n * 10) / 10).toString();
const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const mix = (A, B, t) => { const o = {}; for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) { const a = A[k] ?? B[k], b = B[k] ?? A[k]; o[k] = a + (b - a) * t; } return o; };

const GROUPS = { arm: ['ua', 'fa'], armF: ['uaF', 'faF'], leg: ['th', 'sh', 'ft'], legF: ['thF', 'shF', 'ftF'] };
const hotSet = (list) => { const s = new Set(); for (const h of list || []) (GROUPS[h] || [h]).forEach((x) => s.add(x)); return s; };

function seg(a, b, cls = '') { return `<line class="${cls}" x1="${n1(a[0])}" y1="${n1(a[1])}" x2="${n1(b[0])}" y2="${n1(b[1])}"/>`; }
function ground() { return `<line class="gr" x1="8" y1="140" x2="142" y2="140"/>`; }
function headSide(c, lean) {
  const a = rad(lean);
  const nose = [c[0] + 9 * Math.cos(a) + 0 * Math.sin(a), c[1] - 9 * Math.sin(a) * 0];
  return `<circle class="hd" cx="${n1(c[0])}" cy="${n1(c[1])}" r="9"/><path class="ns" d="M${n1(nose[0] - .5)} ${n1(nose[1] - 2)}l4 3.2l-4 1.8"/>`;
}

// ---------------------------------------------------------------- side view
const SIDE0 = { lean: 0, head: 0, a: 0, f: 0, h: 0, s: 0, ft: 90 };
function side(pose, o) {
  const P = { ...SIDE0, ...pose };
  const A = P.A ?? P.a, F = P.F ?? P.f, H = P.H ?? P.h, S = P.S ?? P.s, FT = P.FT ?? P.ft;
  const neck = [38 * Math.sin(rad(P.lean)), -38 * Math.cos(rad(P.lean))];
  const sho = [neck[0] * 0.92, neck[1] * 0.92];
  const head = add(neck, [15 * Math.sin(rad(P.lean + P.head)), -15 * Math.cos(rad(P.lean + P.head))]);
  const arm = (a, f) => { const e = add(sho, vec(22, a)); return { e, h: add(e, vec(21, f)) }; };
  const leg = (h, s, ft) => { const k = vec(29, h); const an = add(k, vec(29, s)); return { k, an, toe: add(an, vec(11, ft)), heel: add(an, vec(-3, ft)) }; };
  const N = arm(P.a, P.f), Fa = arm(A, F), Ln = leg(P.h, P.s, P.ft), Lf = leg(H, S, FT);
  // translate so the anchor point sits on the ground
  const an = o.anchor || { pt: 'ankleN', x: 62 };
  const ref = { ankleN: Ln.an, ankleF: Lf.an, toeN: Ln.toe, toeF: Lf.toe }[an.pt];
  const dx = an.x - ref[0], dy = G - ref[1];
  const T = (p) => [p[0] + dx, p[1] + dy];
  const pts = { hip: T([0, 0]), neck: T(neck), sho: T(sho), head: T(head), eN: T(N.e), hN: T(N.h), eF: T(Fa.e), hF: T(Fa.h),
    kN: T(Ln.k), aN: T(Ln.an), tN: T(Ln.toe), hlN: T(Ln.heel), kF: T(Lf.k), aF: T(Lf.an), tF: T(Lf.toe), hlF: T(Lf.heel) };
  const hot = hotSet(o.hot);
  const c = (name, far) => (hot.has(name) ? 'hot' : far ? 'far' : '');
  let s = ground();
  // far limbs first
  s += seg(pts.hip, pts.kF, c('thF', 1)) + seg(pts.kF, pts.aF, c('shF', 1)) + seg(pts.hlF, pts.tF, c('ftF', 1));
  s += seg(pts.sho, pts.eF, c('uaF', 1)) + seg(pts.eF, pts.hF, c('faF', 1));
  s += seg(pts.hip, pts.neck, hot.has('torso') ? 'hot tor' : 'tor');
  s += headSide(pts.head, P.lean + P.head);
  s += seg(pts.hip, pts.kN, c('th')) + seg(pts.kN, pts.aN, c('sh')) + seg(pts.hlN, pts.tN, c('ft'));
  s += seg(pts.sho, pts.eN, c('ua')) + seg(pts.eN, pts.hN, c('fa'));
  if (o.extra) s += o.extra(o.t ?? 0, pts);
  return s;
}

// ---------------------------------------------------------------- front view
const FRONT0 = { sh: 0, aL: 6, fL: 6, aR: 6, fR: 6, lL: 2, sL: 2, lR: 2, sR: 2, foreL: 1, foreR: 1 };
function front(pose, o) {
  const P = { ...FRONT0, ...pose };
  const fv = (len, ang, sd) => [sd * len * Math.sin(rad(ang)), len * Math.cos(rad(ang))];
  const hipL = [-7, 0], hipR = [7, 0];
  const neck = [0, -38];
  const shL = [-14, -34 - P.sh], shR = [14, -34 - P.sh];
  const arm = (s0, a, f, sd) => { const e = add(s0, fv(22, a, sd)); return [e, add(e, fv(21, f, sd))]; };
  const leg = (h0, l, s, fore, sd) => { const k = add(h0, fv(29 * fore, l, sd)); const an = add(k, fv(29, s, sd)); return [k, an]; };
  const aL = arm(shL, P.aL, P.fL, -1), aR = arm(shR, P.aR, P.fR, 1);
  const lL = leg(hipL, P.lL, P.sL, P.foreL, -1), lR = leg(hipR, P.lR, P.sR, P.foreR, 1);
  const st = o.stance === 'L' ? lL[1] : lR[1];
  const dx = 75 - 0, dy = G - st[1];
  const T = (p) => [p[0] + dx, p[1] + dy];
  const hot = hotSet(o.hot);
  const cl = (n) => (hot.has(n) ? 'hot' : '');
  const Hd = T([0, -54]);
  let s = ground();
  s += seg(T(hipL), T(lL[0]), cl('thL')) + seg(T(lL[0]), T(lL[1]), cl('shL')) + seg(T(lL[1]), T(add(lL[1], [-8, 0])), '');
  s += seg(T(hipR), T(lR[0]), cl('thR')) + seg(T(lR[0]), T(lR[1]), cl('shR')) + seg(T(lR[1]), T(add(lR[1], [8, 0])), '');
  s += seg(T(hipL), T(hipR), cl('pelvis')) + seg(T([0, 0]), T(neck), 'tor');
  s += seg(T(shL), T(neck), cl('shoulders')) + seg(T(neck), T(shR), cl('shoulders'));
  s += `<circle class="hd" cx="${n1(Hd[0])}" cy="${n1(Hd[1])}" r="10"/>`;
  s += seg(T(shL), T(aL[0]), cl('armL')) + seg(T(aL[0]), T(aL[1]), cl('armL')) + seg(T(shR), T(aR[0]), cl('armR')) + seg(T(aR[0]), T(aR[1]), cl('armR'));
  if (o.extra) s += o.extra(o.t ?? 0, { T, hipL, hipR });
  return s;
}

// ---------------------------------------------------------------- special views
function headTurn(t) {
  const ang = 58 * t;
  return `<ellipse class="tor" cx="75" cy="112" rx="44" ry="15" fill="none"/>` +
    `<line class="gr" x1="75" y1="20" x2="75" y2="50" style="stroke-dasharray:3 4"/>` +
    `<g transform="rotate(${n1(ang)} 75 88)"><ellipse class="hd hotl" cx="75" cy="86" rx="21" ry="25"/><path class="ns hotl" d="M69 63 L75 50 L81 63"/>` +
    `<ellipse class="ear" cx="53.5" cy="88" rx="3" ry="7"/><ellipse class="ear" cx="96.5" cy="88" rx="3" ry="7"/></g>` +
    `<path class="arr" d="M104 62 Q122 70 124 92" fill="none"/><path class="arr" d="M124 92 l-4 -8 m4 8 l5 -7" fill="none"/>`;
}
function bite(t) {
  const open = 24 * (1 - t);           // t=0 open, t=1 clenched
  const tmj = [70, 82];
  return `<circle class="hd" cx="70" cy="70" r="36" fill="none"/>` +
    `<path class="ns" d="M104 66 l9 9 l-8 4"/>` +
    `<circle class="eye" cx="88" cy="58" r="2.2"/>` +
    `<line class="seg" x1="82" y1="90" x2="104" y2="90" style="stroke-width:3"/>` +   // upper teeth line
    `<g transform="rotate(${n1(open)} ${tmj[0]} ${tmj[1]})"><path class="hot jaw" d="M70 82 L74 112 L104 112 L102 94" fill="none"/>` +
    `<line class="seg" x1="82" y1="93" x2="102" y2="93" style="stroke-width:3"/></g>`;
}
function inhale(t) {
  const rx = 31 + 5 * t, ry = 35 + 4 * t, dome = 88 + 14 * t, base = 104 + 6 * t;
  return `<path class="tor" d="M48 28 Q36 70 48 118" fill="none"/>` +                // spine
    `<ellipse class="hd" cx="76" cy="${n1(66)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="none" style="stroke-width:3.5"/>` +
    `<ellipse class="hotl" cx="76" cy="62" rx="${n1(rx - 9)}" ry="${n1(ry - 12)}" style="fill:#ff7a00;fill-opacity:.2;stroke:none"/>` +
    `<path class="hot" d="M${n1(76 - rx + 2)} ${n1(base)} Q76 ${n1(dome)} ${n1(76 + rx - 2)} ${n1(base)}" fill="none"/>` +
    `<path class="arr" d="M76 ${n1(base + 6)} l0 ${n1(10 + 6 * t)} m0 0 l-4 -6 m4 6 l4 -6" fill="none"/>` +
    `<path class="arr" d="M${n1(76 + rx + 6)} 62 l10 0 m0 0 l-6 -4 m6 4 l-6 4" fill="none"/>`;
}
function dumbbell(t, p) { const [x, y] = p.hN; return `<line class="db" x1="${n1(x - 6)}" y1="${n1(y)}" x2="${n1(x + 6)}" y2="${n1(y)}"/><circle class="dbc" cx="${n1(x - 6)}" cy="${n1(y)}" r="3"/><circle class="dbc" cx="${n1(x + 6)}" cy="${n1(y)}" r="3"/>`; }
function ball(t, p) { return `<circle class="ball" cx="${n1(p.hN[0])}" cy="${n1(p.hN[1] - 3)}" r="4.5"/>`; }
function kickBall(t) { const u = sm((t - 0.72) / 0.28); return `<circle class="ball" cx="${n1(116 + 22 * u)}" cy="${n1(112 - 30 * u)}" r="5"/>`; }
function levelLine(t, p) { const a = p.T(p.hipL), b = p.T(p.hipR); return `<line class="lvl" x1="${n1(a[0] - 26)}" y1="${n1(a[1])}" x2="${n1(b[0] + 26)}" y2="${n1(b[1])}"/>`; }

// ---------------------------------------------------------------- the 14 movements
export const ANIMS = {
  'elbow-flex': { view: 'side', cap: ['側面', 'Side view'], hot: ['arm'], extra: dumbbell, anchor: { pt: 'ankleN', x: 62 },
    A: { a: 6, f: 4, A: 0, F: 0 }, B: { a: 6, f: 118, A: 0, F: 0 } },
  'elbow-ext': { view: 'side', cap: ['側面', 'Side view'], hot: ['arm'], anchor: { pt: 'ankleN', x: 56 },
    A: { lean: 4, a: -12, f: 100, A: 30, F: 125 }, B: { lean: 4, a: 88, f: 90, A: 30, F: 125 } },
  'arm-raise': { view: 'front', cap: ['正面', 'Front view'], hot: ['armL', 'armR'], stance: 'L',
    A: { aL: 6, fL: 6, aR: 6, fR: 6, sh: 0 }, B: { aL: 172, fL: 172, aR: 172, fR: 172, sh: 3 } },
  'shrug': { view: 'front', cap: ['正面', 'Front view'], hot: ['shoulders'], stance: 'L',
    A: { sh: 0 }, B: { sh: 9 } },
  'squat': { view: 'side', cap: ['側面（由蹲到站）', 'Side view'], hot: ['leg', 'legF'], anchor: { pt: 'ankleN', x: 58 },
    A: { lean: 38, head: -22, a: 82, f: 82, h: 78, s: -28 }, B: { lean: 0, head: 0, a: 82, f: 82, h: 0, s: 0 } },
  'kick': { view: 'side', cap: ['側面', 'Side view'], hot: ['leg'], anchor: { pt: 'ankleF', x: 52 }, extra: (t) => kickBall(t),
    A: { lean: -4, a: -35, f: -20, A: 30, F: 70, h: -32, s: -88, ft: 0, H: 0, S: 0, FT: 90 },
    B: { lean: -10, a: -35, f: -20, A: 30, F: 70, h: 46, s: 56, ft: 112, H: 0, S: 0, FT: 90 } },
  'tiptoe': { view: 'side', cap: ['側面', 'Side view'], hot: ['sh', 'shF'], anchor: { pt: 'toeN', x: 72 },
    A: { ft: 90, a: 4, f: 4 }, B: { ft: 38, a: 4, f: 4 } },
  'run': { view: 'side', cap: ['側面（推蹬那條腿）', 'Side view'], hot: ['leg'], anchor: { pt: 'toeN', x: 34 },
    A: { lean: 12, a: 30, f: 100, A: -30, F: 40, h: 4, s: -6, ft: 90, H: 25, S: -55, FT: 35 },
    B: { lean: 14, a: -45, f: 50, A: 55, F: 120, h: -35, s: -48, ft: 25, H: 75, S: 25, FT: 115 } },
  'hip-stable': { view: 'front', cap: ['正面（虛線＝骨盆保持水平）', 'Front view (dashed = level pelvis)'], hot: ['pelvis', 'thR', 'shR'], stance: 'R', extra: levelLine,
    A: { aL: 8, fL: 8, aR: 8, fR: 8, lL: 2, sL: 2, foreL: 1 }, B: { aL: 28, fL: 28, aR: 28, fR: 28, lL: 4, sL: 14, foreL: 0.35 } },
  'head-turn': { view: 'top', cap: ['從上往下看（向右轉）', 'Top view'], hot: ['head'], draw: headTurn,
    A: {}, B: {} },
  'bite': { view: 'face', cap: ['側面（由張開到咬緊）', 'Side view'], hot: ['jaw'], draw: bite, A: {}, B: {} },
  'situp': { view: 'side', cap: ['側面', 'Side view'], hot: ['torso'], anchor: { pt: 'ankleN', x: 104 },
    A: { lean: -90, head: 0, a: 100, f: 100, h: 140, s: 20, ft: 90 }, B: { lean: 28, head: 0, a: 92, f: 92, h: 140, s: 20, ft: 90 } },
  'throw': { view: 'side', cap: ['側面', 'Side view'], hot: ['arm', 'torso'], anchor: { pt: 'ankleN', x: 38 }, extra: ball,
    A: { lean: -18, head: 12, a: 255, f: 188, A: 55, F: 75, h: -32, s: -14, ft: 90, H: 38, S: 2, FT: 90 },
    B: { lean: 28, head: -14, a: 132, f: 118, A: -25, F: -35, h: -32, s: -14, ft: 90, H: 38, S: 2, FT: 90 } },
  'inhale': { view: 'schematic', cap: ['側面示意（簡化）', 'Schematic side view'], hot: ['diaphragm'], draw: inhale, A: {}, B: {} },
};

export function animInner(id, t) {
  const d = ANIMS[id]; if (!d) return '';
  if (d.draw) return d.draw(t);
  const pose = mix(d.A, d.B, t);
  const o = { ...d, t };
  return d.view === 'front' ? front(pose, o) : side(pose, o);
}
export function animCaption(id, en) { const d = ANIMS[id]; return d ? (en ? d.cap[1] : d.cap[0]) : ''; }

// loop: hold start, ease to end, hold, ease back (3.2 s)
export function cycleT(ms) {
  const u = (ms % 3200) / 3200;
  if (u < 0.1) return 0;
  if (u < 0.5) return sm((u - 0.1) / 0.4);
  if (u < 0.6) return 1;
  return 1 - sm((u - 0.6) / 0.4);
}
