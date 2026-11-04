// The citizens of CITIZENESIA, built exactly like the video: the sperm-cell citizen (and the president), the fetus and the baby.
// A LOOK is { cap, band, glasses, stache, helmet } with colours as css strings or null.
import * as THREE from "three";
import { M, mat, glossy, ink, hash, nameTag } from "./kit.js";

export const LOOK_COLOURS = ["#e0384b", "#2f6fd1", "#e83a7a", "#2fa04a", "#e8a91c", "#8a4fd1", "#22201f", "#fbfaf6"];

function addLook(head, look, cell) {
  // cell heads are an ellipsoid of radius ~0.8 facing +x; baby heads a sphere of 0.55 at y 1.6 facing +z
  if (look.cap) {
    if (cell) {
      M(new THREE.SphereGeometry(0.82, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.38), mat(look.cap), 0.05, 0.08, 0, head).scale.set(1.2, 1, 0.95);
      M(new THREE.BoxGeometry(0.7, 0.05, 0.5), mat(look.cap), 0.85, 0.55, 0.1, head).rotation.z = -0.3;
    } else {
      M(new THREE.SphereGeometry(0.57, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(look.cap), 0, 1.66, 0, head);
      M(new THREE.BoxGeometry(0.5, 0.04, 0.4), mat(look.cap), 0, 1.86, 0.52, head);
    }
  }
  if (look.band) {
    if (cell) M(new THREE.TorusGeometry(0.78, 0.07, 8, 32).rotateX(Math.PI / 2), mat(look.band), 0, 0.42, 0, head).scale.set(1.25, 1, 0.95);
    else M(new THREE.TorusGeometry(0.5, 0.05, 8, 32).rotateX(Math.PI / 2), mat(look.band), 0, 1.85, 0, head);
  }
  if (look.glasses) {
    if (cell) { [-0.2, 0.5].forEach((x, i) => M(new THREE.TorusGeometry(0.2, 0.03, 8, 24), ink, 0.37 + x * 0.6, 0.17, 0.74 + i * 0.05, head)); M(new THREE.BoxGeometry(0.2, 0.025, 0.02), ink, 0.42, 0.17, 0.76, head); }
    else [-0.17, 0.17].forEach((dx) => M(new THREE.TorusGeometry(0.12, 0.022, 8, 20), ink, dx, 1.65, 0.53, head));
  }
  if (look.stache) {
    [-1, 1].forEach((k) => {
      const c = cell ? M(new THREE.CapsuleGeometry(0.06, 0.16, 4, 8), mat("#2a2421"), 0.52 + k * 0.11, -0.1, 0.76, head)
                     : M(new THREE.CapsuleGeometry(0.04, 0.11, 4, 8), mat("#2a2421"), k * 0.08, 1.55, 0.54, head);
      c.rotation.z = Math.PI / 2 + k * 0.35;
    });
  }
  if (look.helmet) {
    const h = new THREE.Group(); head.add(h);
    const r = cell ? 1.25 : 0.8, y = cell ? 0.05 : 1.62;
    M(new THREE.SphereGeometry(r, 32, 24), new THREE.MeshPhysicalMaterial({ color: "#eaf6ff", roughness: 0.05, transparent: true, opacity: 0.3, clearcoat: 1 }), 0, y, 0, h).castShadow = false;
    M(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), mat("#9aa3ad"), 0, y + r + 0.15, 0, h);
    M(new THREE.SphereGeometry(0.09, 10, 8), mat("#e0384b"), 0, y + r + 0.42, 0, h);
  }
}

// ---------- the sperm-cell citizen ----------
export function sperm(o = {}) {
  const g = new THREE.Group();
  const body = glossy(o.color || "#fbfaf6");
  const head = new THREE.Group(); g.add(head);
  M(new THREE.SphereGeometry(0.8, 32, 24), body, 0, 0, 0, head).scale.set(1.25, 1, 0.95);
  M(new THREE.SphereGeometry(0.32, 20, 14), body, -0.95, -0.02, 0, head).scale.set(1.3, 0.85, 0.85);
  const eyes = [-0.2, 0.5].map((x, i) => {
    const e = new THREE.Group(); e.position.set(0.35 + x * 0.6, 0.18, 0.62 + i * 0.05); head.add(e);
    M(new THREE.SphereGeometry(0.15, 16, 12), mat("#ffffff", { roughness: 0.2 }), 0, 0, 0, e).scale.set(0.9, 1.15, 0.5);
    M(new THREE.SphereGeometry(0.075, 12, 10), ink, 0.03, -0.02, 0.08, e).scale.set(1, 1.2, 0.5); return e;
  });
  const smile = M(new THREE.TorusGeometry(0.13, 0.03, 8, 18, Math.PI), ink, 0.52, -0.2, 0.74, head); smile.rotation.z = Math.PI;
  const mouth = M(new THREE.SphereGeometry(0.13, 16, 10), mat("#5a1d24", { roughness: 0.5 }), 0.52, -0.24, 0.72, head); mouth.scale.set(1.2, 0.1, 0.4); mouth.visible = false;
  [0.05, 0.85].forEach((x) => M(new THREE.SphereGeometry(0.09, 10, 8), mat("#ff8fa3", { transparent: true, opacity: 0.6 }), x, -0.08, 0.66, head).scale.set(1, 0.6, 0.3));
  if (o.president) {   // messy hair, round glasses, pointy beard, red sash
    for (let i = 0; i < 9; i++) { const a = -0.9 + i * 0.22; M(new THREE.SphereGeometry(0.2 + hash(i) * 0.06, 12, 10), mat("#2a2421"), Math.sin(a) * 0.75, 0.7 + Math.cos(a) * 0.2 + hash(i + 3) * 0.08, (hash(i + 5) - 0.5) * 0.4, head); }
    M(new THREE.ConeGeometry(0.08, 0.24, 8), mat("#2a2421"), 0.55, -0.48, 0.6, head).rotation.x = Math.PI + 0.3;
    const s = M(new THREE.TorusGeometry(0.86, 0.07, 8, 32), mat("#e0384b"), 0, 0, 0, head); s.rotation.set(0.25, 0, 0.9); s.scale.set(1.2, 1, 0.95);
    o.look = { glasses: true };
  }
  if (o.look) addLook(head, o.look, true);
  if (o.name) nameTag(head, o.name, -0.2, -1.1, 0.6, 0.9);
  const tail = new THREE.Mesh(new THREE.BufferGeometry(), body); tail.castShadow = true; g.add(tail);
  return { g, head, tail, body, eyes, smile, mouth, ph: o.ph || 0, len: o.len || 4.2 };
}

const TS = 40, TR = 8;
export function swim(s, t, speed = 1, amp = 0.42) {   // rebuild the wavy, tapering tail and wobble the head
  const pts = [];
  for (let i = 0; i <= 18; i++) { const u = i / 18; pts.push(new THREE.Vector3(-1.1 - u * s.len, Math.sin(u * Math.PI * 2.2 - t * 9 * speed + s.ph) * amp * u, Math.cos(u * Math.PI * 1.6 - t * 5 * speed) * 0.15 * u)); }
  const curve = new THREE.CatmullRomCurve3(pts), tube = new THREE.TubeGeometry(curve, TS, 0.13, TR);
  const p = tube.attributes.position, n = TR + 1;
  for (let i = 0; i < p.count; i++) {
    const seg = Math.floor(i / n) / TS, c = curve.getPoint(Math.min(1, seg)), k = 1 - seg * 0.8;
    p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k);
  }
  tube.computeVertexNormals(); s.tail.geometry.dispose(); s.tail.geometry = tube;
  s.head.rotation.z = Math.sin(t * 9 * speed + s.ph) * 0.06;
}
export function talk(s, lv, blink = 0) {
  s.smile.visible = lv === 0; s.mouth.visible = lv > 0; s.mouth.scale.set(1.2 - lv * 0.03, 0.12 + lv * 0.09, 0.4);
  s.eyes.forEach((e) => (e.scale.y = 1 - 0.9 * blink));
}
export const blinkAt = (t, seed) => { const p = (t + hash(seed) * 3.1) % 3.7; return p < 0.12 ? Math.sin((p / 0.12) * Math.PI) : 0; };

// ---------- the baby (born out of The People's House) ----------
export function baby(name, look = {}) {
  const g = new THREE.Group();
  const skin = glossy("#f2c39b", { roughness: 0.5, clearcoat: 0.3 });
  const legs = [-1, 1].map((k) => { const l = new THREE.Group(); l.position.set(k * 0.17, 0.42, 0); g.add(l); M(new THREE.CapsuleGeometry(0.13, 0.25, 4, 8), skin, 0, -0.2, 0, l); return l; });
  const body = new THREE.Group(); g.add(body);
  M(new THREE.SphereGeometry(0.42, 20, 14), mat("#ffffff", { roughness: 0.9 }), 0, 0.62, 0, body).scale.set(1.05, 0.75, 0.95);
  M(new THREE.SphereGeometry(0.33, 20, 14), skin, 0, 0.95, 0, body);
  const arms = [-1, 1].map((k) => { const a = new THREE.Group(); a.position.set(k * 0.3, 1.1, 0.05); body.add(a); M(new THREE.CapsuleGeometry(0.09, 0.3, 4, 8), skin, 0, -0.18, 0, a); a.rotation.z = k * 0.9; return a; });
  M(new THREE.SphereGeometry(0.55, 24, 18), skin, 0, 1.6, 0, body);
  const eyes = [-0.17, 0.17].map((dx) => { const e = M(new THREE.SphereGeometry(0.07, 10, 8), ink, dx, 1.65, 0.5, body); e.scale.set(1, 1.3, 0.5); return e; });
  M(new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI), ink, 0, 1.47, 0.52, body).rotation.z = Math.PI;
  [-0.32, 0.32].forEach((x) => M(new THREE.SphereGeometry(0.08, 10, 8), mat("#ff8fa3", { transparent: true, opacity: 0.6 }), x, 1.52, 0.44, body).scale.set(1, 0.6, 0.3));
  if (!look.cap && !look.helmet) M(new THREE.SphereGeometry(0.12, 10, 8), mat("#2a2421"), 0.05, 2.15, 0, body).scale.set(1, 1.6, 1);
  addLook(body, look, false);
  if (name) nameTag(body, name, 0, 0.62, 0.45, 0.6);
  return { g, body, legs, arms, eyes };
}
export function walk(b, t, moving, seed = 0) {
  const wv = moving ? Math.sin(t * 14) : 0;
  b.legs[0].rotation.x = wv * 0.5; b.legs[1].rotation.x = -wv * 0.5; b.body.rotation.z = wv * 0.12; b.body.position.y = Math.abs(wv) * 0.06;
  b.arms[0].rotation.z = -0.9 - (moving ? 0 : 0.1 * Math.sin(t * 2 + seed)); b.arms[1].rotation.z = 0.9;
  b.eyes.forEach((e) => (e.scale.y = 1.3 * (1 - 0.9 * blinkAt(t, seed + 9))));
}

export function sit(b) {   // a baby sitting on a chair: legs forward, a little lower
  b.legs.forEach((l) => (l.rotation.x = -1.45)); b.body.position.y = -0.18; b.body.rotation.z = 0;
}

// ---------- the fetus (level 2), curled up asleep, as in the video's egg ----------
export function fetus(name, bubble = true) {
  const g = new THREE.Group(), f = new THREE.Group(); f.rotation.z = -0.35; g.add(f);
  const skin = glossy("#ffc9b0", { roughness: 0.45, clearcoat: 0.3 });
  M(new THREE.SphereGeometry(1.05, 28, 20), skin, 0.15, 0.8, 0.2, f);
  M(new THREE.SphereGeometry(0.95, 24, 18), skin, -0.15, -0.55, 0, f).scale.set(0.9, 1.1, 0.85);
  [-1, 1].forEach((k) => { const leg = M(new THREE.CapsuleGeometry(0.28, 0.6, 6, 12), skin, k * 0.35 + 0.2, -0.9, 0.55, f); leg.rotation.set(1.3, 0, k * 0.3); });
  [-1, 1].forEach((k) => { const arm = M(new THREE.CapsuleGeometry(0.17, 0.5, 6, 10), skin, k * 0.4 + 0.25, -0.05, 0.75, f); arm.rotation.set(0.9, 0, -k * 0.6); });
  [-0.3, 0.25].forEach((x) => { const e = M(new THREE.TorusGeometry(0.11, 0.025, 6, 14, Math.PI), ink, x + 0.45, 0.85, 1.12, f); e.rotation.z = Math.PI; });
  M(new THREE.TorusGeometry(0.07, 0.02, 6, 12, Math.PI), ink, 0.48, 0.55, 1.15, f).rotation.z = Math.PI;
  [-0.25, 0.85].forEach((x) => M(new THREE.SphereGeometry(0.1, 10, 8), mat("#ff8fa3", { transparent: true, opacity: 0.6 }), x + 0.1, 0.62, 1.05, f).scale.set(1, 0.6, 0.3));
  M(new THREE.TorusGeometry(0.2, 0.06, 8, 18), mat("#fffdf4"), 0.62, -0.05, 1.0, f).rotation.x = 1.2;
  if (name) nameTag(f, name, 0.3, -1.95, 1.0, 0.85).rotation.z = 0.35;
  if (bubble) M(new THREE.SphereGeometry(2.1, 28, 20), new THREE.MeshPhysicalMaterial({ color: "#ffe9b8", roughness: 0.15, transparent: true, opacity: 0.4, clearcoat: 1, depthWrite: false }), 0, 0, 0, g).castShadow = false;
  return { g, f };
}
