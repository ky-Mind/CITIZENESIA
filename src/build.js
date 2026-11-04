// Building: 1-unit blocks on a grid, in the video's pastel palette. Blocks live in a Map keyed "x,y,z" and are saved as [x,y,z,type].
import * as THREE from "three";
import { mat, glossy } from "./kit.js";
import { ISLAND_R } from "./world.js";

export const BLOCKS = [
  { id: "grass", c: "#a8d88a", top: "#8fcf6e" }, { id: "dirt", c: "#b88a5c" }, { id: "wood", c: "#c9925a" }, { id: "brick", c: "#d9694a" },
  { id: "glass", c: "#cfeaf7", glass: true }, { id: "roof", c: "#e0384b" }, { id: "white", c: "#f6f2ea" }, { id: "pink", c: "#f29ac8" },
  { id: "dome", c: "#3f9a6a" }, { id: "gold", c: "#ffd84a", shiny: true },
];
const GEO = new THREE.BoxGeometry(1, 1, 1);
const MATS = BLOCKS.map((b) => b.glass ? glossy(b.c, { transparent: true, opacity: 0.45, roughness: 0.05 })
  : b.shiny ? glossy(b.c, { metalness: 0.3 }) : b.top ? [mat(b.c), mat(b.c), mat(b.top), mat(b.c), mat(b.c), mat(b.c)] : mat(b.c));

export function createBuilder(scene, camera, noBuild) {
  const blocks = new Map();
  const group = new THREE.Group(); scene.add(group);
  const key = (x, y, z) => `${x},${y},${z}`;

  function add(x, y, z, t) {
    const k = key(x, y, z); if (blocks.has(k)) return false;
    const m = new THREE.Mesh(GEO, MATS[t]); m.position.set(x + 0.5, y + 0.5, z + 0.5); m.castShadow = m.receiveShadow = true;
    m.userData = { x, y, z, t }; group.add(m); blocks.set(k, m); return true;
  }
  function remove(x, y, z) { const k = key(x, y, z), m = blocks.get(k); if (!m) return false; group.remove(m); blocks.delete(k); return true; }
  const has = (x, y, z) => blocks.has(key(x, y, z));
  // height of the highest solid surface under (px, pz) not above `fromY + step`
  function groundAt(px, pz, fromY, step = 0.6) {
    const x = Math.floor(px), z = Math.floor(pz); let top = 0;
    for (let y = 0; y < 40; y++) if (has(x, y, z) && y + 1 <= fromY + step) top = y + 1;
    return top;
  }
  const blockedAt = (px, pz, y0, y1) => { const x = Math.floor(px), z = Math.floor(pz); for (let y = Math.floor(y0); y < y1; y++) if (has(x, y, z)) return true; return false; };

  // ghost block and raycast against blocks + ground plane
  const ghost = new THREE.Mesh(GEO, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.35, depthWrite: false }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(GEO), new THREE.LineBasicMaterial({ color: "#3a2414" }));
  ghost.add(edges); ghost.visible = false; scene.add(ghost);
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
  let target = null;

  function aim(ndc, removeMode, from) {
    ray.setFromCamera(ndc, camera); ray.far = 40;
    const hit = ray.intersectObjects(group.children, false)[0];
    let cell = null;
    if (hit) {
      const { x, y, z } = hit.object.userData;
      if (removeMode) cell = { x, y, z, existing: true };
      else { const n = hit.face.normal; cell = { x: x + Math.round(n.x), y: y + Math.round(n.y), z: z + Math.round(n.z) }; }
    } else if (!removeMode && ray.ray.intersectPlane(plane, hitP)) {
      cell = { x: Math.floor(hitP.x), y: 0, z: Math.floor(hitP.z) };
    }
    if (cell && !cell.existing) {
      const far = Math.hypot(cell.x + 0.5 - from.x, cell.z + 0.5 - from.z) > 12;
      const out = Math.hypot(cell.x + 0.5, cell.z + 0.5) > ISLAND_R - 1 || cell.y < 0 || cell.y > 30;
      if (far || out || noBuild(cell.x + 0.5, cell.z + 0.5)) cell = null;
    }
    target = cell;
    ghost.visible = !!cell;
    if (cell) { ghost.position.set(cell.x + 0.5, cell.y + 0.5, cell.z + 0.5); ghost.material.color.set(removeMode ? "#ff5f7f" : "#ffffff"); ghost.scale.setScalar(removeMode ? 1.04 : 1); }
    return cell;
  }
  const hide = () => { ghost.visible = false; target = null; };

  const save = () => [...blocks.values()].map((m) => [m.userData.x, m.userData.y, m.userData.z, m.userData.t]);
  function load(list = []) { [...blocks.values()].forEach((m) => group.remove(m)); blocks.clear(); list.forEach(([x, y, z, t]) => MATS[t] && add(x, y, z, t)); }

  return { add, remove, has, groundAt, blockedAt, aim, hide, get target() { return target; }, save, load, count: () => blocks.size };
}
