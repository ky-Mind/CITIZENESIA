// The endless world outside: land and sea from noise, built in 32 m chunks around the player and dropped again far away
// (like Minecraft), so the world never ends but only the nearby part is in memory. The home island is flat ground at y = 0.
import * as THREE from "three";
import { mat, h2, vnoise, sm } from "./kit.js";
import { doorOf } from "./homes.js";

export const SEA = -0.35, HOME_R = 40, CHUNK = 32;
const SEG = 16;

const fbm = (x, z) => vnoise(x, z) * 0.55 + vnoise(x * 2.1 + 7.3, z * 2.1 - 3.1) * 0.3 + vnoise(x * 4.3 - 11, z * 4.3 + 5) * 0.15;
export function heightAt(x, z) {
  const d = Math.hypot(x, z);
  if (d < HOME_R) return 0;
  let h = (fbm(x / 110 + 40, z / 110 - 17) - 0.56) * 22;   // land where positive, sea where negative
  if (h > 0) h *= 0.45;                                      // gentle hills, deeper sea
  return Math.max(-4 * sm((d - HOME_R) / 26), h * sm((d - HOME_R) / 16));   // the home island slopes into the sea as a beach
}

const C_SAND = new THREE.Color("#efe2c4"), C_WET = new THREE.Color("#d8c7a0"), C_GRASS = new THREE.Color("#a8d88a"), C_GRASS2 = new THREE.Color("#94cc78"), C_HILL = new THREE.Color("#86c46a");
const groundMat = mat("#ffffff", { vertexColors: true, roughness: 0.9 });
const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6).translate(0, 0.45, 0);
const crownGeo = new THREE.SphereGeometry(0.85, 10, 8).translate(0, 1.4, 0);
const rockGeo = new THREE.DodecahedronGeometry(0.55, 0);
const wallGeo = new THREE.BoxGeometry(2, 1.7, 1.8).translate(0, 0.85, 0);
const roofGeo = new THREE.ConeGeometry(1.65, 1.1, 4).rotateY(Math.PI / 4).translate(0, 2.25, 0);
const doorGeo = new THREE.BoxGeometry(0.5, 0.8, 0.05).translate(0, 0.4, 0.92);
const M_TRUNK = mat("#8a5a3a"), M_CROWN = mat("#ffffff"), M_ROCK = mat("#c9c1b4", { flatShading: true }), M_WALL = mat("#ffffff"), M_ROOF = mat("#ffffff"), M_DOOR = mat("#6b4a33");
const CROWNS = ["#6fb35a", "#86c46a", "#7dbb5f"], WALLS = ["#f6d2a8", "#cfe3f2", "#f3e7b8", "#f2c9d6", "#e9e2f4"], ROOFS = ["#d9694a", "#4a7fc0", "#6aa060", "#b05a7a", "#7a5ab0"];

export function createTerrain(scene, radius = 3) {
  const chunks = new Map(), queue = [];
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), mat("#9fd3ea", { roughness: 0.25, transparent: true, opacity: 0.88 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = SEA; sea.receiveShadow = true; scene.add(sea);
  const dummy = new THREE.Object3D();

  function build(cx, cz) {
    const g = new THREE.Group(), solids = [], x0 = cx * CHUNK, z0 = cz * CHUNK;
    // ground
    const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, SEG, SEG).rotateX(-Math.PI / 2), p = geo.attributes.position, col = [];
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const wx = p.getX(i) + x0 + CHUNK / 2, wz = p.getZ(i) + z0 + CHUNK / 2, y = heightAt(wx, wz);
      p.setY(i, y);
      if (y < SEA - 0.2) c.copy(C_WET); else if (y < SEA + 0.35) c.copy(C_SAND); else if (y > 2.6) c.copy(C_HILL); else c.copy(h2(Math.floor(wx / 6), Math.floor(wz / 6)) > 0.5 ? C_GRASS : C_GRASS2);
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, groundMat); ground.position.set(x0 + CHUNK / 2, 0, z0 + CHUNK / 2); ground.receiveShadow = true; g.add(ground);

    // what grows and stands here (the same every visit: chosen from the chunk's own numbers)
    const r = (i) => h2(cx * 9973 + i * 31, cz * 7919 - i * 17);
    const trees = [], rocks = [], houses = [];
    const far = Math.hypot(x0 + CHUNK / 2, z0 + CHUNK / 2) > HOME_R + 30;
    for (let i = 0; i < 18; i++) {
      const x = x0 + r(i) * CHUNK, z = z0 + r(i + 50) * CHUNK, y = heightAt(x, z);
      if (Math.hypot(x, z) < HOME_R + 4) continue;
      if (y > SEA + 0.6 && y < 4.5 && r(i + 100) < 0.75) trees.push([x, y, z, 0.8 + r(i + 150) * 0.6, i]);
      else if (y > SEA - 0.1 && r(i + 200) < 0.35) rocks.push([x, y, z, 0.6 + r(i + 250) * 1.2, i]);
    }
    if (far && r(999) < 0.22) {   // a little village from the neighbouring land
      for (let i = 0; i < 6; i++) {
        const x = x0 + 6 + r(i + 300) * (CHUNK - 12), z = z0 + 6 + r(i + 350) * (CHUNK - 12), y = heightAt(x, z);
        if (y > SEA + 0.5 && y < 3.5 && houses.every((h) => Math.hypot(h[0] - x, h[2] - z) > 4)) houses.push([x, y - 0.1, z, r(i + 400) * Math.PI * 2, i]);
      }
    }
    const inst = (geo, m, list, set) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, m, list.length); im.castShadow = im.receiveShadow = true;
      list.forEach((o, i) => { set(o, i); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
      g.add(im); return im;
    };
    inst(trunkGeo, M_TRUNK, trees, ([x, y, z, s]) => { dummy.position.set(x, y, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(s); });
    const cr = inst(crownGeo, M_CROWN, trees, ([x, y, z, s]) => { dummy.position.set(x, y, z); dummy.scale.setScalar(s); });
    if (cr) trees.forEach((tr, i) => cr.setColorAt(i, c.set(CROWNS[tr[4] % 3])));
    inst(rockGeo, M_ROCK, rocks, ([x, y, z, s, i]) => { dummy.position.set(x, y + s * 0.15, z); dummy.rotation.set(i, i * 2, 0); dummy.scale.set(s, s * 0.7, s); });
    const wl = inst(wallGeo, M_WALL, houses, ([x, y, z, ry]) => { dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.setScalar(1); });
    const rf = inst(roofGeo, M_ROOF, houses, ([x, y, z, ry]) => { dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); });
    inst(doorGeo, M_DOOR, houses, ([x, y, z, ry]) => { dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); });
    if (wl) houses.forEach((h, i) => { wl.setColorAt(i, c.set(WALLS[h[4] % 5])); rf.setColorAt(i, c.set(ROOFS[(h[4] + 2) % 5])); });

    trees.forEach(([x, y, z, s]) => solids.push({ x0: x - 0.3 * s, x1: x + 0.3 * s, z0: z - 0.3 * s, z1: z + 0.3 * s, h: y + 2.2 * s }));
    rocks.forEach(([x, y, z, s]) => s > 1 && solids.push({ x0: x - 0.45 * s, x1: x + 0.45 * s, z0: z - 0.45 * s, z1: z + 0.45 * s, h: y + 0.5 * s }));
    houses.forEach(([x, y, z]) => solids.push({ x0: x - 1.25, x1: x + 1.25, z0: z - 1.25, z1: z + 1.25, h: y + 3 }));
    const doors = houses.map(([x, y, z, ry, i]) => ({ ...doorOf(x, z, ry, 1.1), ry, wall: WALLS[i % 5], type: "s", id: `v${cx},${cz},${i}` }));
    scene.add(g);
    return { g, ground, solids, doors };
  }

  const key = (cx, cz) => cx + "," + cz;
  let cur = null;
  function update(px, pz, budget = 2) {
    const ccx = Math.floor(px / CHUNK), ccz = Math.floor(pz / CHUNK);
    if (cur !== key(ccx, ccz)) {
      cur = key(ccx, ccz); queue.length = 0;
      for (let d = 0; d <= radius; d++) for (let dx = -d; dx <= d; dx++) for (let dz = -d; dz <= d; dz++)   // nearest rings first
        if (Math.max(Math.abs(dx), Math.abs(dz)) === d && !chunks.has(key(ccx + dx, ccz + dz))) queue.push([ccx + dx, ccz + dz]);
      for (const [k, ch] of chunks) {
        const [cx, cz] = k.split(",").map(Number);
        if (Math.abs(cx - ccx) > radius + 1 || Math.abs(cz - ccz) > radius + 1) {
          scene.remove(ch.g); ch.ground.geometry.dispose(); ch.g.children.forEach((o) => o.isInstancedMesh && o.dispose()); chunks.delete(k);
        }
      }
    }
    for (let i = 0; i < budget && queue.length; i++) { const [cx, cz] = queue.shift(); if (!chunks.has(key(cx, cz))) chunks.set(key(cx, cz), build(cx, cz)); }
    sea.position.set(Math.round(px), SEA, Math.round(pz));
  }
  function solidsNear(x, z) {
    const out = [], ccx = Math.floor(x / CHUNK), ccz = Math.floor(z / CHUNK);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const ch = chunks.get(key(ccx + dx, ccz + dz)); if (ch) out.push(...ch.solids); }
    return out;
  }
  const doorsNear = (x, z) => { const out = [], ccx = Math.floor(x / CHUNK), ccz = Math.floor(z / CHUNK); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const ch = chunks.get(key(ccx + dx, ccz + dz)); if (ch) out.push(...ch.doors); } return out; };
  const groundMeshes = () => [...chunks.values()].map((c) => c.ground);
  const loaded = () => chunks.size;
  return { update, solidsNear, doorsNear, groundMeshes, loaded, sea };
}
