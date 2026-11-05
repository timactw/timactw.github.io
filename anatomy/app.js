import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { FORENSICS_HTML, ABOUT_HTML } from './content.js';

// ---------- safe storage ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode etc. */ } },
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// ---------- state ----------
let LANG = store.get('lang', 'both');
let DATA = null;            // parts.json
const PART = new Map();     // id -> part (with .mesh)
const sysGroup = {};        // sys -> THREE.Group
const sysLoaded = {};       // sys -> Promise
let selected = null;
let tab = 'explore';
const hiddenParts = new Set();
const extraHi = new Set();  // parts highlighted by the forensics "view in 3D" buttons

// ---------- three setup ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.rotateSpeed = 0.8;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.minDistance = 8;
controls.maxDistance = 700;

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8070, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(80, 200, 220); scene.add(key);
const rim = new THREE.DirectionalLight(0xffffff, 0.7); rim.position.set(-150, 100, -200); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffffff, 0.4); fill.position.set(0, -100, 100); scene.add(fill);

const HOME = { target: new THREE.Vector3(0, 80, 8), dist: 300 };
function fitHome(animate = true) {
  const aspect = camera.aspect;
  const h = 180, w = 80;
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const dH = (h / 2) / Math.tan(fov / 2);
  const dW = (w / 2) / Math.tan(fov / 2) / aspect;
  const d = Math.max(dH, dW) * 1.08;
  flyTo(HOME.target.clone(), new THREE.Vector3(0, 0, 1), d, animate);
}

// camera animation
let anim = null;
function flyTo(target, dir, dist, animate = true) {
  const endPos = target.clone().add(dir.clone().normalize().multiplyScalar(dist));
  if (!animate) { controls.target.copy(target); camera.position.copy(endPos); controls.update(); return; }
  anim = { t0: performance.now(), dur: 650, fromT: controls.target.clone(), toT: target, fromP: camera.position.clone(), toP: endPos };
}
function focusPart(p) {
  if (!p || !p.mesh) return;
  const box = new THREE.Box3().setFromObject(p.mesh);
  const sph = box.getBoundingSphere(new THREE.Sphere());
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const dist = Math.max(sph.radius / Math.sin(fov / 2) * 1.4, 45);
  const dir = camera.position.clone().sub(controls.target).normalize();
  flyTo(sph.center, dir, dist);
}

function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(1, r.height);
  camera.updateProjectionMatrix();
}
new ResizeObserver(() => resize()).observe(canvas.parentElement);

function loop(now) {
  if (anim) {
    const k = Math.min(1, (now - anim.t0) / anim.dur);
    const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    controls.target.lerpVectors(anim.fromT, anim.toT, e);
    camera.position.lerpVectors(anim.fromP, anim.toP, e);
    if (k >= 1) anim = null;
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// ---------- materials ----------
const ORGAN_COL = {
  cerebrum: 0xe8b4b0, cerebellum: 0xd99a9a, brainstem: 0xd4a58e, heart: 0xb8333a, aorta: 0xd2453f,
  trachea: 0xd8c7b5, bronchi: 0xcfb8a0, lung_L: 0xf0a3a8, lung_R: 0xf0a3a8, esophagus: 0xc98a6e,
  stomach: 0xe0976f, liver: 0x8e3b2f, gallbladder: 0x5b8f3a, pancreas: 0xe8c07a, spleen: 0x7a2e45,
  duodenum: 0xe6a87c, small_int: 0xeeb48f, large_int: 0xc99a6e, appendix: 0xc99a6e,
  kidney_L: 0xa0453a, kidney_R: 0xa0453a, adrenal: 0xe0b040, ureter: 0xe0c070, bladder: 0xe3b98c,
};
function baseColor(p) {
  if (p.sys === 'skeleton') {
    if (p.region === '牙齒') return 0xfaf6ea;
    if (p.id === 'discs' || p.id === 'costal_cart') return 0x9cc3d5;
    return 0xe9dfc8;
  }
  if (p.sys === 'muscles') {
    if (p.id.startsWith('achilles') || p.id.startsWith('it_tract')) return 0xe6d6b8;
    return 0xb9554b;
  }
  return ORGAN_COL[p.id] ?? 0xd08080;
}
const HILITE = new THREE.Color(0x2f7bff);
let muscleOpacity = 1;

function applyMaterial(p) {
  const m = p.mesh.material;
  const isSel = selected === p || extraHi.has(p.id) || (quiz.active && quiz.hiliteIds.has(p.id));
  const dim = quiz.active && quiz.dimOthers && !quiz.hiliteIds.has(p.id);
  let op = 1;
  if (p.sys === 'muscles') op = muscleOpacity;
  if (p.id.startsWith('lung_')) op = Math.min(op, 0.45);
  if (dim) op = Math.min(op, 0.12);
  m.opacity = op;
  m.transparent = op < 0.999;
  m.depthWrite = op >= 0.999;
  m.emissive.copy(isSel ? HILITE : new THREE.Color(0x000000));
  m.emissiveIntensity = isSel ? 0.75 : 0;
  m.needsUpdate = true;
  p.mesh.visible = !hiddenParts.has(p.id);
}
function refreshAll() { for (const p of PART.values()) if (p.mesh) applyMaterial(p); }

// ---------- loading ----------
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
let loadingCount = 0;
function setLoading(on, text) {
  loadingCount += on ? 1 : -1;
  $('#loading').hidden = loadingCount <= 0;
  if (text) $('#loadingText').textContent = text;
}

function loadSystem(sys) {
  if (sysLoaded[sys]) return sysLoaded[sys];
  const names = { skeleton: '骨骼', organs: '器官', muscles: '肌肉', skin: '皮膚' };
  setLoading(true, `載入${names[sys]}模型中…`);
  sysLoaded[sys] = new Promise((resolve, reject) => {
    loader.load(`models/${sys}.glb`, (gltf) => {
      const g = gltf.scene;
      g.name = sys;
      g.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry.computeVertexNormals();
        const id = o.name || o.parent?.name;
        if (sys === 'skin') {
          o.material = new THREE.MeshStandardMaterial({ color: 0xe8c2a8, roughness: .8, transparent: true, opacity: 0, depthWrite: false, side: THREE.FrontSide });
          o.renderOrder = 10; o.userData.skin = true;
          return;
        }
        const p = PART.get(id) || PART.get(o.parent?.name);
        if (!p) { console.warn('unknown mesh', id); return; }
        o.material = new THREE.MeshStandardMaterial({ color: baseColor(p), roughness: p.sys === 'skeleton' ? 0.65 : 0.5, metalness: 0 });
        o.userData.partId = p.id;
        p.mesh = o;
        applyMaterial(p);
      });
      scene.add(g);
      sysGroup[sys] = g;
      setLoading(false);
      resolve(g);
    }, undefined, (err) => { setLoading(false); console.error(err); sysLoaded[sys] = null; reject(err); });
  });
  return sysLoaded[sys];
}

async function setSystem(sys, on) {
  if (on) { await loadSystem(sys); sysGroup[sys].visible = true; }
  else if (sysGroup[sys]) sysGroup[sys].visible = false;
  const cb = $(`input[data-sys="${sys}"]`); if (cb) cb.checked = on;
  if (!on && selected && selected.sys === sys) select(null);
}

// ---------- names / i18n ----------
function nameHTML(p, short = false) {
  const zh = short ? p.qzh : p.zh, en = short ? p.qen : p.en;
  if (LANG === 'zh') return esc(zh);
  if (LANG === 'en') return esc(en);
  return `${esc(zh)}<small>${esc(en)}</small>`;
}
function nameText(p, short = false) {
  const zh = short ? p.qzh : p.zh, en = short ? p.qen : p.en;
  return LANG === 'zh' ? zh : LANG === 'en' ? en : `${zh}（${en}）`;
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function tr(zh, en) { return LANG === 'en' ? en : zh; }
function applyLang() {
  document.documentElement.lang = LANG === 'en' ? 'en' : 'zh-Hant-TW';
  $$('#lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === LANG));
  $$('[data-zh]').forEach((el) => { el.textContent = LANG === 'en' ? el.dataset.en : el.dataset.zh; });
  $('#search').placeholder = tr('搜尋，例如：股骨、femur', 'Search, e.g. femur, 股骨');
  buildList();
  if (selected) showCard(selected);
  if (quiz.active) renderQuiz();
}

// ---------- selection & card ----------
function select(p, opts = {}) {
  if (!opts.keepExtra && extraHi.size) { const old = [...extraHi]; extraHi.clear(); old.forEach((i) => { const x = PART.get(i); if (x && x.mesh) applyMaterial(x); }); }
  const prev = selected;
  selected = p;
  if (prev && prev.mesh) applyMaterial(prev);
  if (p && p.mesh) applyMaterial(p);
  if (p) showCard(p); else $('#card').hidden = true;
  $$('#list button').forEach((b) => b.classList.toggle('sel', p && b.dataset.id === p.id));
  if (p && opts.focus) focusPart(p);
}
const SYS_ZH = { skeleton: '骨骼', organs: '主要器官', muscles: '主要肌肉' };
const SYS_EN = { skeleton: 'Skeleton', organs: 'Major organs', muscles: 'Major muscles' };
function showCard(p) {
  $('#card').hidden = false;
  $('#cardTag').textContent = `${tr(SYS_ZH[p.sys], SYS_EN[p.sys])}・${p.region}`;
  if (LANG === 'en') { $('#cardZh').textContent = p.en; $('#cardEn').textContent = p.zh; }
  else { $('#cardZh').textContent = p.zh; $('#cardEn').textContent = LANG === 'both' ? p.en : ''; }
  $('#cardDesc').textContent = p.desc;
}

// ---------- picking ----------
const ray = new THREE.Raycaster();
function pick(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const v = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(v, camera);
  const objs = [];
  for (const [s, g] of Object.entries(sysGroup)) if (s !== 'skin' && g.visible) objs.push(g);
  const hits = ray.intersectObjects(objs, true);
  for (const h of hits) {
    const o = h.object;
    if (!o.visible || !o.userData.partId) continue;
    const p = PART.get(o.userData.partId);
    if (o.material.opacity < 0.2 && !(quiz.active)) continue; // see-through parts don't block
    if (quiz.active && quiz.mode === 'pick') return null;
    return p;
  }
  return null;
}
let down = null;
canvas.addEventListener('pointerdown', (e) => { if (e.isPrimary) down = { x: e.clientX, y: e.clientY, t: performance.now(), n: 1 }; else if (down) down.n++; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || !e.isPrimary) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const dt = performance.now() - down.t;
  const multi = down.n > 1;
  down = null;
  if (multi || moved > 10 || dt > 500) return;
  const p = pick(e.clientX, e.clientY);
  if (quiz.active && quiz.mode === 'tap') { quizTap(p); return; }
  if (quiz.active) return;
  select(p);
});

// ---------- part list ----------
function buildList() {
  const q = ($('#search').value || '').trim().toLowerCase();
  const el = $('#list');
  el.innerHTML = '';
  for (const sys of ['skeleton', 'organs', 'muscles']) {
    const parts = DATA.parts.filter((p) => p.sys === sys && (!q || p.zh.toLowerCase().includes(q) || p.en.toLowerCase().includes(q) || p.qzh.includes(q)));
    if (!parts.length) continue;
    const regions = [...new Set(parts.map((p) => p.region))];
    const d = document.createElement('details');
    if (q) d.open = true;
    d.innerHTML = `<summary>${esc(tr(SYS_ZH[sys], SYS_EN[sys]))}（${parts.length}）</summary>`;
    for (const rg of regions) {
      const h = document.createElement('div');
      h.style.cssText = 'font-size:13px;color:var(--mut);padding:6px 8px 2px';
      h.textContent = rg;
      d.appendChild(h);
      for (const p of parts.filter((x) => x.region === rg)) {
        const b = document.createElement('button');
        b.dataset.id = p.id;
        b.innerHTML = nameHTML(p);
        if (selected === p) b.classList.add('sel');
        d.appendChild(b);
      }
    }
    el.appendChild(d);
  }
}
$('#list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  const p = PART.get(b.dataset.id);
  await setSystem(p.sys, true);
  hiddenParts.delete(p.id); applyMaterial(p);
  select(p, { focus: true });
});
$('#search').addEventListener('input', () => buildList());

// ---------- quiz ----------
const quiz = { active: false, mode: 'pick', scope: 'skeleton', target: null, answered: false, hiliteIds: new Set(), dimOthers: false, choices: [] };
const DEEP = new Set(['ethmoid', 'vomer', 'palatine_L', 'palatine_R', 'inf_concha_L', 'inf_concha_R', 'lacrimal_L', 'lacrimal_R', 'adrenal', 'discs']);
const score = Object.assign({ all: 0, allOk: 0, best: 0 }, store.get('anatomyScore', {}));
const session = { n: 0, ok: 0, streak: 0 };
function renderScore() {
  $('#sNow').textContent = `${session.ok} / ${session.n}`;
  $('#sStreak').textContent = session.streak;
  $('#sAll').textContent = `${score.allOk} / ${score.all}`;
  $('#sBest').textContent = score.best;
}
function record(ok) {
  session.n++; score.all++;
  if (ok) { session.ok++; score.allOk++; session.streak++; score.best = Math.max(score.best, session.streak); } else session.streak = 0;
  store.set('anatomyScore', score);
  renderScore();
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

async function startQuiz() {
  quiz.active = true;
  for (const s of ['skeleton', 'organs', 'muscles']) await setSystem(s, s === quiz.scope);
  hiddenParts.clear();
  select(null);
  nextQuestion();
}
function stopQuiz() {
  quiz.active = false; quiz.hiliteIds.clear(); quiz.dimOthers = false; quiz.target = null;
  refreshAll();
}
function nextQuestion() {
  const pool = DATA.parts.filter((p) => p.sys === quiz.scope && PART.get(p.id).mesh && !DEEP.has(p.id));
  const target = pool[Math.floor(Math.random() * pool.length)];
  quiz.target = PART.get(target.id);
  quiz.answered = false;
  quiz.hiliteIds.clear();
  if (quiz.mode === 'pick') {
    quiz.hiliteIds.add(quiz.target.id);
    quiz.dimOthers = true;
    const keys = [...new Set(pool.map((p) => p.qzh))].filter((k) => k !== quiz.target.qzh);
    // prefer distractors from the same region (harder but fair), fill with others
    const same = shuffle([...new Set(pool.filter((p) => p.region === quiz.target.region).map((p) => p.qzh))].filter((k) => k !== quiz.target.qzh));
    const pickK = [...same.slice(0, 2)];
    for (const k of shuffle(keys)) { if (pickK.length >= 3) break; if (!pickK.includes(k)) pickK.push(k); }
    const opts = shuffle([quiz.target.qzh, ...pickK]).map((k) => pool.find((p) => p.qzh === k));
    quiz.choices = opts;
    refreshAll();
    focusPart(quiz.target);
  } else {
    quiz.dimOthers = false;
    quiz.choices = [];
    refreshAll();
    fitHome();
  }
  renderQuiz();
}
function renderQuiz() {
  const t = quiz.target; if (!t) return;
  const fb = $('#qfeedback');
  if (!quiz.answered) { fb.textContent = ''; fb.className = 'feedback'; }
  if (quiz.mode === 'pick') {
    $('#qprompt').innerHTML = tr('藍色發光的是哪個部位？', 'Which part is glowing blue?') + `<small>${tr('提示：可以轉動模型從不同角度看', 'Tip: rotate to look from other sides')}</small>`;
    const box = $('#qchoices'); box.innerHTML = '';
    for (const c of quiz.choices) {
      const b = document.createElement('button');
      b.innerHTML = nameHTML(c, true);
      b.dataset.k = c.qzh;
      if (quiz.answered) {
        if (c.qzh === t.qzh) b.classList.add('right');
        else if (c.qzh === quiz.lastPick) b.classList.add('wrong');
      }
      b.onclick = () => quizPick(c.qzh);
      box.appendChild(b);
    }
  } else {
    $('#qprompt').innerHTML = tr('請在模型上點出：', 'Tap this part on the model:') + `<br>${nameHTML(t, true)}`;
    $('#qchoices').innerHTML = '';
  }
}
function quizPick(k) {
  if (quiz.answered) return;
  quiz.answered = true; quiz.lastPick = k;
  const ok = k === quiz.target.qzh;
  record(ok);
  const fb = $('#qfeedback');
  fb.className = 'feedback ' + (ok ? 'ok' : 'no');
  fb.textContent = (ok ? tr('答對了！', 'Correct! ') : tr('再想想～正確答案是 ', 'Not quite. Answer: ')) + nameText(quiz.target) + (ok ? '' : '') + '。' + quiz.target.desc;
  renderQuiz();
}
function quizTap(p) {
  if (quiz.answered || !p) return;
  const ok = p.qzh === quiz.target.qzh;
  quiz.answered = true;
  record(ok);
  quiz.hiliteIds.clear();
  quiz.hiliteIds.add(quiz.target.id);
  // show all same-name targets (e.g. both sides)
  for (const x of PART.values()) if (x.sys === quiz.scope && x.qzh === quiz.target.qzh) quiz.hiliteIds.add(x.id);
  refreshAll();
  const fb = $('#qfeedback');
  fb.className = 'feedback ' + (ok ? 'ok' : 'no');
  fb.textContent = ok ? tr(`答對了！你點的是${p.zh}。`, `Correct! You tapped ${p.en}.`)
    : tr(`你點到的是「${nameText(p)}」。正確位置已用藍色標出來。`, `You tapped “${p.en}”. The correct part is now glowing blue.`);
  if (!ok) focusPart(quiz.target);
}
$('#qnext').onclick = () => nextQuestion();
$('#qskip').onclick = () => { if (!quiz.answered) { session.streak = 0; renderScore(); } nextQuestion(); };
$('#qreset').onclick = () => { if (confirm(tr('確定要清除所有成績紀錄嗎？', 'Reset all scores?'))) { score.all = score.allOk = score.best = 0; session.n = session.ok = session.streak = 0; store.set('anatomyScore', score); renderScore(); } };
$$('#qmode button').forEach((b) => b.onclick = () => { $$('#qmode button').forEach((x) => x.classList.toggle('on', x === b)); quiz.mode = b.dataset.q; if (quiz.active) nextQuestion(); });
$$('#qscope button').forEach((b) => b.onclick = async () => { $$('#qscope button').forEach((x) => x.classList.toggle('on', x === b)); quiz.scope = b.dataset.s; if (quiz.active) await startQuiz(); });

// ---------- tabs ----------
async function setTab(t) {
  tab = t;
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  $$('#panel .pane').forEach((p) => p.classList.toggle('on', p.dataset.pane === t));
  $('#forensics').hidden = t !== 'forensics';
  $('#about').hidden = t !== 'about';
  if (t === 'quiz') { $('#card').hidden = true; await startQuiz(); }
  else if (quiz.active) { stopQuiz(); }
  if (t === 'forensics' || t === 'about') { $('#' + t).scrollTop = 0; }
  try { history.replaceState(null, '', '#' + t); } catch (e) { /* ignore */ }
}
$$('#tabs button').forEach((b) => b.onclick = () => setTab(b.dataset.tab));
$$('#lang button').forEach((b) => b.onclick = () => { LANG = b.dataset.lang; store.set('lang', LANG); applyLang(); });

// ---------- explore controls ----------
$$('input[data-sys]').forEach((cb) => cb.addEventListener('change', () => setSystem(cb.dataset.sys, cb.checked)));
$('#skin').addEventListener('input', async (e) => {
  const v = +e.target.value / 100;
  if (v > 0) await loadSystem('skin');
  const g = sysGroup.skin; if (!g) return;
  g.visible = v > 0;
  g.traverse((o) => { if (o.isMesh) o.material.opacity = v; });
});
$('#muscleOp').addEventListener('input', (e) => { muscleOpacity = +e.target.value / 100; refreshAll(); });
$('#resetView').onclick = () => fitHome();
$('#cardClose').onclick = () => select(null);
$('#cardFocus').onclick = () => selected && focusPart(selected);
$('#cardHide').onclick = () => { if (!selected) return; hiddenParts.add(selected.id); const p = selected; select(null); applyMaterial(p); };
$('#showAll').onclick = () => { hiddenParts.clear(); refreshAll(); };

// forensics "view in 3D" buttons
async function view3D(ids, opts = {}) {
  await setTab('explore');
  await setSystem('skeleton', true);
  if (opts.only) { await setSystem('organs', false); await setSystem('muscles', false); }
  hiddenParts.clear();
  const parts = ids.map((i) => PART.get(i)).filter(Boolean);
  // highlight all, card for first
  select(parts[0]);
  for (const p of parts) { extraHi.add(p.id); applyMaterial(p); }
  const box = new THREE.Box3(); for (const p of parts) box.expandByObject(p.mesh);
  const sph = box.getBoundingSphere(new THREE.Sphere());
  const fov = THREE.MathUtils.degToRad(camera.fov);
  flyTo(sph.center, new THREE.Vector3(...(opts.dir || [0, 0, 1])), Math.max(sph.radius / Math.sin(fov / 2) * 1.25, 25));
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]');
  if (!b) return;
  e.preventDefault();
  view3D(b.dataset.view.split(','), { only: true, dir: b.dataset.dir ? b.dataset.dir.split(',').map(Number) : undefined });
});

// ---------- stature calculator ----------
function setupCalc() {
  const inp = $('#femurIn'), out = $('#statureOut');
  if (!inp) return;
  const f = () => {
    const x = parseFloat(inp.value);
    out.textContent = isFinite(x) && x > 20 && x < 70 ? `${(2.38 * x + 61.41).toFixed(1)} 公分` : '—';
  };
  inp.addEventListener('input', f); f();
}

// ---------- boot ----------
async function boot() {
  resize();
  $('#forensics').innerHTML = FORENSICS_HTML;
  $('#about').innerHTML = ABOUT_HTML;
  const res = await fetch('models/parts.json');
  DATA = await res.json();
  for (const p of DATA.parts) PART.set(p.id, { ...p, mesh: null });
  const m = DATA.meta;
  $$('.meta-femur').forEach((el) => el.textContent = m.femur_L_cm.toFixed(1));
  $$('.meta-height').forEach((el) => el.textContent = m.height_cm.toFixed(1));
  $$('.meta-est').forEach((el) => el.textContent = (2.38 * m.femur_L_cm + 61.41).toFixed(1));
  const fi = $('#femurIn'); if (fi) fi.value = m.femur_L_cm.toFixed(1);
  setupCalc();
  fitHome(false);
  requestAnimationFrame(loop);
  applyLang();
  renderScore();
  await loadSystem('skeleton');
  sysGroup.skeleton.visible = true;
  const h = (location.hash || '').slice(1);
  if (['quiz', 'forensics', 'about'].includes(h)) setTab(h);
  window.__anatomyReady = true;
}
boot().catch((e) => { console.error(e); $('#loadingText').textContent = '載入失敗，請重新整理。'; $('#loading').hidden = false; });

// ---------- offline ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// test hooks (used by automated checks only)
window.__anatomy = { renderFrame: () => renderer.render(scene, camera), PART, camera, controls, sysGroup, setTab, select, quiz, pickAtNDC: (x, y) => { const r = canvas.getBoundingClientRect(); return pick(r.left + (x + 1) / 2 * r.width, r.top + (1 - y) / 2 * r.height); }, projectPart: (id) => { const p = PART.get(id); const b = new THREE.Box3().setFromObject(p.mesh); const c = b.getCenter(new THREE.Vector3()).project(camera); const r = canvas.getBoundingClientRect(); return { x: r.left + (c.x + 1) / 2 * r.width, y: r.top + (1 - c.y) / 2 * r.height }; } };
