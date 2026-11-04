// Shared look of CITIZENESIA: the same materials, helpers and sign painting as the video world (EP 001 v3 world.js).
import * as THREE from "three";

export const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const sm = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
export const lerp = (a, b, u) => a + (b - a) * u;
export const easeOutBack = (u) => { u = clamp(u); const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };

export function canTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export const glossy = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15, ...o });
export const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
export const ink = mat("#22201f", { roughness: 0.3 });

export function M(g, m, x = 0, y = 0, z = 0, p) {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; if (p) p.add(o); return o;
}

const FONT = (size, font) => `${font || 900} ${size}px ${font === 700 ? "Poppins" : "'Archivo Black'"}`;
export function signTex(lines, o = {}) {
  return canTex(o.w || 512, o.h || 256, (c, w, h) => {
    c.fillStyle = o.bg || "#fffaf0"; c.fillRect(0, 0, w, h);
    if (o.band) { c.fillStyle = o.band; c.fillRect(0, 0, w, o.bandH || 70); }
    c.textAlign = "center"; c.textBaseline = "middle";
    lines.forEach(([txt, size, y, col, font]) => {
      c.fillStyle = col || "#3a2a1c"; let f = size; c.font = FONT(f, font);
      while (c.measureText(txt).width > w - 30 && f > 10) { f -= 2; c.font = FONT(f, font); }
      c.fillText(txt, w / 2, y);
    });
  });
}
export function nameTex(txt) {
  return canTex(360, 96, (c, w, h) => {
    c.fillStyle = "#fffdf4"; c.fillRect(0, 0, w, h); c.strokeStyle = "#e0384b"; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
    c.fillStyle = "#3a2a1c"; let f = 50; c.font = FONT(f);
    while (c.measureText(txt).width > w - 34) { f -= 2; c.font = FONT(f); }
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, w / 2, h / 2 + 3);
  });
}
export const nameTag = (p, txt, x, y, z, s = 1) =>
  M(new THREE.PlaneGeometry(1.6 * s, 0.43 * s), mat("#fff", { map: nameTex(txt), side: THREE.DoubleSide, roughness: 0.6 }), x, y, z, p);

// A canvas sign whose text can be redrawn (population board, decree board).
export function liveSign(w, h, paint) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  let last = null;
  return { tex, draw(v) { const k = JSON.stringify(v); if (k === last) return; last = k; paint(c.getContext("2d"), w, h, v); tex.needsUpdate = true; } };
}

export const SKY = "#cdeaf7", PINK = "#ffd3dc";
