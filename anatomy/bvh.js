// Tiny triangle BVH for the "auto see-through" occlusion test (ray vs mesh, any-hit or nearest-hit).
// Built lazily per mesh (median split, 6 triangles per leaf), double-sided. All in the mesh's local space.
const LEAF = 6;

export function buildBVH(geom) {
  const pos = geom.attributes.position, idx = geom.index;
  const nV = pos.count, P = new Float32Array(nV * 3);
  for (let i = 0; i < nV; i++) { P[i * 3] = pos.getX(i); P[i * 3 + 1] = pos.getY(i); P[i * 3 + 2] = pos.getZ(i); }
  const nT = idx ? Math.floor(idx.count / 3) : Math.floor(nV / 3);
  const T = new Uint32Array(nT * 3);
  for (let i = 0; i < nT * 3; i++) T[i] = idx ? idx.getX(i) : i;
  const tb = new Float32Array(nT * 6), cen = new Float32Array(nT * 3);
  for (let t = 0; t < nT; t++) {
    for (let a = 0; a < 3; a++) {
      const x = P[T[t * 3] * 3 + a], y = P[T[t * 3 + 1] * 3 + a], z = P[T[t * 3 + 2] * 3 + a];
      const lo = Math.min(x, y, z), hi = Math.max(x, y, z);
      tb[t * 6 + a] = lo; tb[t * 6 + 3 + a] = hi; cen[t * 3 + a] = (lo + hi) / 2;
    }
  }
  const order = new Uint32Array(nT); for (let i = 0; i < nT; i++) order[i] = i;
  const nodes = [];
  function build(s, e) {
    const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    const c = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let i = s; i < e; i++) {
      const t = order[i];
      for (let a = 0; a < 3; a++) {
        if (tb[t * 6 + a] < b[a]) b[a] = tb[t * 6 + a];
        if (tb[t * 6 + 3 + a] > b[3 + a]) b[3 + a] = tb[t * 6 + 3 + a];
        const v = cen[t * 3 + a]; if (v < c[a]) c[a] = v; if (v > c[3 + a]) c[3 + a] = v;
      }
    }
    const node = { b, s, e, l: null, r: null }; nodes.push(node);
    if (e - s > LEAF) {
      const ex = [c[3] - c[0], c[4] - c[1], c[5] - c[2]];
      const ax = ex[0] >= ex[1] && ex[0] >= ex[2] ? 0 : ex[1] >= ex[2] ? 1 : 2;
      order.subarray(s, e).sort((p, q) => cen[p * 3 + ax] - cen[q * 3 + ax]);
      const m = (s + e) >> 1;
      node.l = build(s, m); node.r = build(m, e);
    }
    return node;
  }
  const root = nT ? build(0, nT) : null;
  return { P, T, order, root };
}

const stack = [];
// ray (origin o, direction d, NOT necessarily unit length: t is the same parameter in any space) vs BVH.
// Returns the nearest hit parameter in (0, tmax) or Infinity; with any=true returns as soon as something is hit.
export function bvhRay(h, ox, oy, oz, dx, dy, dz, tmax, any) {
  if (!h.root) return Infinity;
  const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;
  let best = tmax;
  stack.length = 0; stack.push(h.root);
  const { P, T, order } = h;
  while (stack.length) {
    const n = stack.pop(), b = n.b;
    let t1 = (b[0] - ox) * ix, t2 = (b[3] - ox) * ix;
    let tn = Math.min(t1, t2), tf = Math.max(t1, t2);
    t1 = (b[1] - oy) * iy; t2 = (b[4] - oy) * iy;
    tn = Math.max(tn, Math.min(t1, t2)); tf = Math.min(tf, Math.max(t1, t2));
    t1 = (b[2] - oz) * iz; t2 = (b[5] - oz) * iz;
    tn = Math.max(tn, Math.min(t1, t2)); tf = Math.min(tf, Math.max(t1, t2));
    if (tf < 0 || tn > tf || tn > best) continue;
    if (n.l) { stack.push(n.l, n.r); continue; }
    for (let i = n.s; i < n.e; i++) {
      const t = order[i], a = T[t * 3] * 3, bb = T[t * 3 + 1] * 3, c = T[t * 3 + 2] * 3;
      const e1x = P[bb] - P[a], e1y = P[bb + 1] - P[a + 1], e1z = P[bb + 2] - P[a + 2];
      const e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
      const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (det > -1e-12 && det < 1e-12) continue;
      const inv = 1 / det, sx = ox - P[a], sy = oy - P[a + 1], sz = oz - P[a + 2];
      const u = (sx * px + sy * py + sz * pz) * inv; if (u < 0 || u > 1) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
      const v = (dx * qx + dy * qy + dz * qz) * inv; if (v < 0 || u + v > 1) continue;
      const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (tt > 1e-6 && tt < best) { best = tt; if (any) return best; }
    }
  }
  return best === tmax ? Infinity : best;
}
