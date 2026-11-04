// Houses you can walk into. Every house in the world has a door: the little houses on the home island, the village houses
// on the neighbouring land, and the ready-made houses players buy in build mode. Walking into a door opens its inside,
// built on the spot from the house's own colours and size, with furniture you can use.
import * as THREE from "three";
import { M, mat, glossy, signTex, canTex, h2 } from "./kit.js";

export const HOUSE_TYPES = [
  { id: "s", size: 1.6, price: 50, room: [9, 8] },
  { id: "m", size: 2.2, price: 120, room: [12, 10] },
  { id: "l", size: 2.8, price: 250, room: [15, 12] },
];
export const typeOf = (id) => HOUSE_TYPES.find((h) => h.id === id) || HOUSE_TYPES[0];
export const WALLS = ["#f6d2a8", "#cfe3f2", "#f3e7b8", "#f2c9d6", "#e9e2f4"], ROOFS = ["#d9694a", "#4a7fc0", "#6aa060", "#b05a7a", "#7a5ab0"];

// the door is on the house's local +z side; this is where you stand to go in
export const doorOf = (x, z, ry, half) => ({ x: x + Math.sin(ry) * (half + 0.15), z: z + Math.cos(ry) * (half + 0.15) });

// ---------- a bought house, outside: the island house, bigger, with the owner's name ----------
export function houseMesh(type, wall, roof, owner) {
  const T = typeOf(type), g = new THREE.Group(), s = T.size;
  const inner = new THREE.Group(); inner.scale.setScalar(s); g.add(inner);
  M(new THREE.BoxGeometry(2, 1.7, 1.8), mat(wall), 0, 0.85, 0, inner);
  const r = M(new THREE.ConeGeometry(1.65, 1.1, 4), mat(roof), 0, 2.25, 0, inner); r.rotation.y = Math.PI / 4;
  M(new THREE.BoxGeometry(0.5, 0.8, 0.05), mat("#6b4a33"), 0, 0.4, 0.92, inner);
  [-0.6, 0.6].forEach((wx) => M(new THREE.BoxGeometry(0.42, 0.42, 0.05), mat("#ffd36a", { emissive: "#a8741a" }), wx, 1.15, 0.92, inner));
  if (type !== "s") M(new THREE.BoxGeometry(0.3, 0.7, 0.3), mat("#b05a3a"), 0.6, 2.4, -0.3, inner);   // chimney
  if (owner) M(new THREE.PlaneGeometry(1.3, 0.3), mat("#fff", { map: signTex([["@" + owner, 40, 40, "#3a2414"]], { w: 360, h: 80 }) }), 0, 1.45, 0.92, inner);
  g.userData.half = 0.95 * s;
  return g;
}

export function createHomes(scene) {
  const list = [], group = new THREE.Group(); scene.add(group);
  function add(h) {
    const m = houseMesh(h.type, h.wall, h.roof, h.owner); m.position.set(h.x, h.y || 0, h.z); m.rotation.y = h.ry;
    m.traverse((o) => (o.userData.home = h)); group.add(m); list.push({ h, m });
  }
  function remove(h) { const i = list.findIndex((e) => e.h === h); if (i < 0) return; group.remove(list[i].m); list.splice(i, 1); }
  const half = (h) => 0.95 * typeOf(h.type).size;
  const solids = () => list.map(({ h }) => { const r = half(h) + 0.1; return { x0: h.x - r, x1: h.x + r, z0: h.z - r, z1: h.z + r, h: (h.y || 0) + 3 * typeOf(h.type).size }; });
  const doors = () => list.map(({ h }) => ({ ...doorOf(h.x, h.z, h.ry, half(h)), ry: h.ry, wall: h.wall, type: h.type, id: "b" + h.id, owner: h.owner }));
  const load = (arr = []) => { [...list].forEach((e) => remove(e.h)); arr.forEach(add); };
  return { add, remove, solids, doors, load, group, get list() { return list.map((e) => e.h); } };
}

// ---------- the inside of a house ----------
export function buildInterior(door, t9n, quality) {
  const T = typeOf(door.type), [W, D] = T.room, H = 3.4, r = (i) => h2(i * 31 + door.id.length, [...door.id].reduce((a, c) => a + c.charCodeAt(0), 0));
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#cdeaf7");
  const hemi = new THREE.HemisphereLight("#fff8ee", "#d9b68c", 1.5); scene.add(hemi);
  const lamp = new THREE.PointLight("#ffe2b0", 30, 20); lamp.position.set(0, H - 0.4, 0); scene.add(lamp);
  const sun = new THREE.DirectionalLight("#fff3e2", 0.8); sun.position.set(4, 8, 6); scene.add(sun, sun.target);
  const solids = [], box = (x0, x1, z0, z1, h) => solids.push({ x0, x1, z0, z1, h });
  const put = (g, m, x, y, z) => M(g, m, x, y, z, scene);
  const hx = W / 2, hz = D / 2;
  const WALL = mat(door.wall || "#f6d2a8"), WOOD = mat("#a8683f"), LIGHT = mat("#f6f2ea"), DARK = mat("#2a2a30");
  // room
  put(new THREE.BoxGeometry(W, 0.2, D), mat("#d9b68c"), 0, -0.1, 0).castShadow = false;
  for (let i = -hx + 1; i < hx; i += 1) put(new THREE.BoxGeometry(0.02, 0.01, D), mat("#c9a274"), i, 0.005, 0).castShadow = false;   // floorboards
  const walls = [[0, -hz, W, 0], [0, hz, W, 0], [-hx, 0, 0, D], [hx, 0, 0, D]].map(([x, z, w, d]) => { const wl = put(new THREE.BoxGeometry(w || 0.2, H, d || 0.2), WALL, x, H / 2, z); wl.castShadow = false; return wl; });
  const doorM = put(new THREE.BoxGeometry(1.2, 2.1, 0.08), mat("#6b4a33"), 0, 1.05, hz - 0.12);   // the door you came in through
  walls[1].add(doorM); doorM.position.set(0, 1.05 - H / 2, -0.12);
  // windows with sky behind them
  const sky = new THREE.MeshBasicMaterial({ color: "#cdeaf7" });
  [-1, 1].forEach((k) => { const wn = put(new THREE.PlaneGeometry(1.6, 1.1), sky, k * (hx - 0.11), 1.7, -hz / 3); wn.rotation.y = -k * Math.PI / 2; put(new THREE.BoxGeometry(0.06, 1.25, 1.75), LIGHT, k * (hx - 0.12), 1.7, -hz / 3); });
  // rug
  put(new THREE.CylinderGeometry(1.6, 1.6, 0.02, 32), mat(["#e0384b", "#2f8be6", "#2fa04a", "#e8a91c"][Math.floor(r(1) * 4)]), 0.5, 0.01, 0.6).castShadow = false;

  const spots = [], seats = [];
  // bed (back left)
  const bx = -hx + 1.3, bz = -hz + 1.6;
  put(new THREE.BoxGeometry(1.8, 0.45, 2.6), WOOD, bx, 0.22, bz); put(new THREE.BoxGeometry(1.7, 0.25, 2.4), LIGHT, bx, 0.57, bz);
  put(new THREE.BoxGeometry(1.72, 0.12, 1.5), mat(["#7a5ab0", "#e83a7a", "#2f6fd1", "#6aa060"][Math.floor(r(2) * 4)]), bx, 0.74, bz + 0.45);
  put(new THREE.BoxGeometry(1.0, 0.18, 0.45), mat("#ffffff"), bx, 0.8, bz - 0.9); put(new THREE.BoxGeometry(1.8, 1.1, 0.12), WOOD, bx, 0.55, bz - 1.3);
  box(bx - 0.9, bx + 0.9, bz - 1.35, bz + 1.3, 0.85); spots.push({ k: "bed", x: bx + 1.3, z: bz + 0.4, r: 1.3 });
  // kitchen (back right): counter, stove, fridge
  const kx = hx - 2.2, kz = -hz + 0.5;
  put(new THREE.BoxGeometry(2.6, 0.95, 0.8), LIGHT, kx, 0.47, kz); put(new THREE.BoxGeometry(2.7, 0.06, 0.9), mat("#c9c1b4"), kx, 0.97, kz);
  [-0.4, 0.2].forEach((dx) => put(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 16), DARK, kx + dx, 1.01, kz));
  put(new THREE.BoxGeometry(0.9, 2.0, 0.8), mat("#e9f3f8"), hx - 0.6, 1.0, kz + 0.1); put(new THREE.BoxGeometry(0.05, 0.6, 0.05), mat("#9aa3ad"), hx - 0.95, 1.3, kz + 0.52);
  box(kx - 1.35, hx, kz - 0.45, kz + 0.5, 2); spots.push({ k: "fridge", x: hx - 0.8, z: kz + 1.3, r: 1.1 }, { k: "stove", x: kx - 0.2, z: kz + 1.2, r: 1.1 });
  // table and two chairs (middle right)
  const tx = hx - 2.6, tz = 0.4;
  put(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 24), WOOD, tx, 0.78, tz); put(new THREE.CylinderGeometry(0.08, 0.12, 0.76, 10), WOOD, tx, 0.38, tz);
  put(new THREE.SphereGeometry(0.16, 12, 10), mat("#e8742a"), tx, 0.9, tz);
  box(tx - 0.6, tx + 0.6, tz - 0.6, tz + 0.6, 0.85);
  [-1, 1].forEach((k) => { const cz = tz + k * 1.05; put(new THREE.BoxGeometry(0.5, 0.08, 0.5), mat("#c8324a"), tx, 0.48, cz); put(new THREE.BoxGeometry(0.5, 0.6, 0.06), mat("#c8324a"), tx, 0.8, cz + k * 0.24);
    seats.push({ cx: tx, cz, facing: k > 0 ? Math.PI : 0, eat: true }); });
  // sofa facing the TV (front left)
  const sx = -hx + 2.4, sz = hz - 2.2;
  put(new THREE.BoxGeometry(2.4, 0.45, 0.9), mat("#2f6fd1"), sx, 0.3, sz); put(new THREE.BoxGeometry(2.4, 0.7, 0.25), mat("#2f6fd1"), sx, 0.75, sz + 0.4);
  box(sx - 1.2, sx + 1.2, sz + 0.25, sz + 0.55, 1.1);
  [-0.6, 0.6].forEach((dx) => seats.push({ cx: sx + dx, cz: sz, facing: Math.PI, tv: true }));
  const tv = put(new THREE.BoxGeometry(1.8, 1.05, 0.08), DARK, sx, 1.4, -hz + 0.15);
  const tvScr = put(new THREE.PlaneGeometry(1.65, 0.92), new THREE.MeshBasicMaterial({ color: "#1d1f26" }), sx, 1.4, -hz + 0.2);
  put(new THREE.BoxGeometry(1.4, 0.5, 0.5), WOOD, sx, 0.25, -hz + 0.35); box(sx - 0.7, sx + 0.7, -hz, -hz + 0.6, 0.6);
  if (bx + 0.9 > sx - 0.9) { tv.position.x = tvScr.position.x = 0.4; }   // small rooms: keep the TV clear of the bed
  spots.push({ k: "tv", x: sx, z: sz - 1.2, r: 1.2 });
  // lamp and light switch by the door
  put(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), DARK, hx - 0.5, 0.8, hz - 0.6); const shade = put(new THREE.ConeGeometry(0.35, 0.4, 16, 1, true), mat("#ffe2b0", { emissive: "#ffd36a", emissiveIntensity: 0.8, side: THREE.DoubleSide }), hx - 0.5, 1.7, hz - 0.6);
  put(new THREE.BoxGeometry(0.2, 0.3, 0.04), LIGHT, 1.0, 1.3, hz - 0.12);
  spots.push({ k: "light", x: 1.0, z: hz - 0.9, r: 0.9 }, { k: "exit", x: 0, z: hz - 0.6, r: 0.7 });
  // a plant and a picture of the owner (or of the country)
  put(new THREE.CylinderGeometry(0.25, 0.2, 0.45, 12), mat("#e8742a"), -hx + 0.5, 0.22, hz - 0.5); put(new THREE.SphereGeometry(0.45, 12, 10), mat("#6fb35a"), -hx + 0.5, 0.85, hz - 0.5);
  const pic = put(new THREE.PlaneGeometry(1.4, 0.9), mat("#fff", { map: canTex(280, 180, (c, w, h) => { c.fillStyle = "#ffd84a"; c.fillRect(0, 0, w, h); c.fillStyle = "#cdeaf7"; c.fillRect(12, 12, w - 24, h - 24); c.fillStyle = "#3a2414"; c.font = "900 30px 'Archivo Black'"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(door.owner ? "@" + door.owner : "CITIZENESIA", w / 2, h / 2); }) }), -hx + 0.12, 1.8, 0.8);
  pic.rotation.y = Math.PI / 2;
  // bigger houses: a desk with a computer (it opens the comment box) and a bookshelf
  if (T.id !== "s") {
    const dx = -hx + 0.6, dz = 0.2 - (T.id === "l" ? 1.6 : 0);
    put(new THREE.BoxGeometry(0.8, 0.06, 1.6), WOOD, dx, 0.76, dz); [-0.7, 0.7].forEach((o) => put(new THREE.BoxGeometry(0.7, 0.74, 0.06), WOOD, dx, 0.37, dz + o));
    put(new THREE.BoxGeometry(0.06, 0.55, 0.85), DARK, dx - 0.2, 1.1, dz); put(new THREE.PlaneGeometry(0.75, 0.45), new THREE.MeshBasicMaterial({ color: "#ff8fa3" }), dx - 0.16, 1.1, dz).rotation.y = Math.PI / 2;
    box(dx - 0.4, dx + 0.4, dz - 0.8, dz + 0.8, 0.9); spots.push({ k: "pc", x: dx + 1.0, z: dz, r: 1.0 });
  }
  if (T.id === "l") {
    const ox = 0.6;
    put(new THREE.BoxGeometry(2.2, 2.4, 0.5), WOOD, ox, 1.2, -hz + 0.3);
    for (let s = 0; s < 4; s++) for (let b = 0; b < 9; b++) put(new THREE.BoxGeometry(0.16, 0.42, 0.34), mat(["#e0384b", "#2f6fd1", "#2fa04a", "#e8a91c", "#7a5ab0"][(b + s) % 5]), ox - 0.85 + b * 0.21, 0.35 + s * 0.58, -hz + 0.35);
    box(ox - 1.1, ox + 1.1, -hz, -hz + 0.6, 2.4); spots.push({ k: "books", x: ox, z: -hz + 1.4, r: 1.0 });
  }
  seats.forEach((s) => spots.push({ k: "seat", seat: s, x: s.cx, z: s.cz, r: 0.6 }));

  let lightOn = true;
  const setLight = (on) => { lightOn = on; lamp.intensity = on ? 30 : 0; hemi.intensity = on ? 1.5 : 0.45; shade.material.emissiveIntensity = on ? 0.8 : 0; };
  let tvOn = false;
  const setTv = (on) => { tvOn = on; tvScr.material.color.set(on ? "#ffffff" : "#1d1f26"); };
  const tvTex = canTex(330, 184, (c, w, h) => { c.fillStyle = "#2f8be6"; c.fillRect(0, 0, w, h); c.fillStyle = "#e0384b"; c.fillRect(10, 10, 70, 28); c.fillStyle = "#fff"; c.font = "900 18px 'Archivo Black'"; c.fillText("LIVE", 22, 30); c.font = "900 30px 'Archivo Black'"; c.textAlign = "center"; c.fillText("CITIZENESIA", w / 2, h / 2 + 10); });
  tvScr.material.map = tvTex;

  const m = 0.35;
  const walkable = (x, z, mm = m) => x > -hx + 0.1 + mm && x < hx - 0.1 - mm && z > -hz + 0.1 + mm && z < hz - 0.1 - mm;
  const dispose = () => scene.traverse((o) => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach((mt) => { mt.map?.dispose(); mt.dispose(); }); });
  // the wall between the camera and the room is hidden, like a doll's house
  function update(cam) { walls[0].visible = cam.z > -hz; walls[1].visible = cam.z < hz; walls[2].visible = cam.x > -hx; walls[3].visible = cam.x < hx; }
  return { scene, sun, solids, spots, walkable, groundAt: () => 0, ceilAt: () => 99, wallH: H, spawn: { x: 0, z: hz - 1.3 }, door, update, setLight, get lightOn() { return lightOn; }, setTv, get tvOn() { return tvOn; }, dispose };
}
