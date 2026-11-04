// Inside The People's House (Gedung DPR). Its inside is the womb from the video: pink walls, floating bubbles and the swimming
// cells, the only place in the country where cells live. Four rooms joined by open doorways:
//   lobby (south)  : exit door, reception, aspiration box, metal detector
//   plenary hall   : ~80 seats with microphones and vote buttons, the speaker's podium, the leaders' desk with the gavel,
//                    the president, three big screens and a light switch
//   the womb (east): the big egg where cells are born, sleeping fetuses in their bubbles
//   lounge (west)  : free snacks, water, TV, vending machine, nap bench and the census board
import * as THREE from "three";
import { M, mat, glossy, signTex, liveSign, hash, canTex } from "./kit.js";
import { sperm, swim, talk, blinkAt, fetus } from "./actors.js";

const PINK = "#ffd3dc";
export const ROOMS = {   // walkable floor of each room (connectors are the doorways)
  lobby: { x0: -12, x1: 12, z0: 31.5, z1: 52, ceil: 7 },
  hall: { x0: -30, x1: 30, z0: -30, z1: 29.5, ceil: 21 },
  womb: { x0: 31.5, x1: 58, z0: -15, z1: 15, ceil: 16 },
  lounge: { x0: -58, x1: -31.5, z0: -15, z1: 15, ceil: 6 },
};
const DOORS = [{ x0: -3, x1: 3, z0: 28, z1: 33 }, { x0: 28, x1: 33, z0: -3, z1: 3 }, { x0: -33, x1: -28, z0: -3, z1: 3 }];
const STAGE = { x0: -12, x1: 12, z0: -25, z1: -16.5, h: 0.6 };
export const SPAWN = { womb: [39, 0, -Math.PI / 2], lobby: [0, 49, 0] };   // x, z, camera yaw
export const EXIT = { x: 0, z: 52 };
export const EGG = new THREE.Vector3(47, 3.6, 0);

export function buildDPR(t9n, quality) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(PINK); scene.fog = new THREE.Fog(PINK, 26, 80);
  const hemi = new THREE.HemisphereLight("#fff6f8", "#e7a3b4", 1.5); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff3e2", 1.6); sun.castShadow = quality.shadows; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 60 }); sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  const solids = [], acts = [];
  const box = (x0, x1, z0, z1, h) => solids.push({ x0, x1, z0, z1, h });
  const put = (g, m, x, y, z, p = scene) => M(g, m, x, y, z, p);
  const FLOOR = mat("#ffdbe3"), WALL = mat("#f7b3c4"), RIB = glossy("#f39ab0", { roughness: 0.4 }), TRIM = mat("#fffdf4"), CARPET = mat("#e0384b");
  const WOOD = mat("#a8683f"), DARK = mat("#2a2a30"), GOLD = glossy("#ffd84a", { metalness: 0.4 });

  // ---------- floors, walls, ceilings ----------
  for (const [k, r] of Object.entries(ROOMS)) {
    put(new THREE.BoxGeometry(r.x1 - r.x0 + 2, 0.2, r.z1 - r.z0 + 2), FLOOR, (r.x0 + r.x1) / 2, -0.1, (r.z0 + r.z1) / 2).castShadow = false;
    if (k !== "hall" && k !== "womb") { const c = put(new THREE.PlaneGeometry(r.x1 - r.x0 + 2, r.z1 - r.z0 + 2), mat("#ffe3ea", { side: THREE.DoubleSide }), (r.x0 + r.x1) / 2, r.ceil, (r.z0 + r.z1) / 2); c.rotation.x = Math.PI / 2; c.castShadow = false; }
  }
  DOORS.forEach((d) => put(new THREE.BoxGeometry(d.x1 - d.x0, 0.2, d.z1 - d.z0), FLOOR, (d.x0 + d.x1) / 2, -0.1, (d.z0 + d.z1) / 2));
  function wall(x0, x1, z0, z1, h) {
    const w = put(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), WALL, (x0 + x1) / 2, h / 2, (z0 + z1) / 2); w.castShadow = false;
    put(new THREE.BoxGeometry(x1 - x0 + 0.1, 0.3, z1 - z0 + 0.1), TRIM, (x0 + x1) / 2, 0.15, (z0 + z1) / 2).castShadow = false;   // skirting
    box(x0, x1, z0, z1, 99);
  }
  // hall
  wall(-31, 31, -31, -30, 18); wall(-31, -30, -30, -3, 18); wall(-31, -30, 3, 29.5, 18); wall(30, 31, -30, -3, 18); wall(30, 31, 3, 29.5, 18);
  wall(-31, -3, 29.5, 31.5, 18); wall(3, 31, 29.5, 31.5, 18);
  // lobby
  wall(-13, -12, 31.5, 53, 7); wall(12, 13, 31.5, 53, 7); wall(-13, -2.2, 52, 53, 7); wall(2.2, 13, 52, 53, 7);
  // womb and lounge
  wall(31, 59, -16, -15, 16); wall(31, 59, 15, 16, 16); wall(58, 59, -16, 16, 16);
  wall(-59, -31, -16, -15, 6); wall(-59, -31, 15, 16, 6); wall(-59, -58, -16, 16, 6);
  // doorway lintels
  put(new THREE.BoxGeometry(6, 11.5, 2), WALL, 0, 12.25, 30.5); put(new THREE.BoxGeometry(2, 13, 6), WALL, 30.5, 11.5, 0); put(new THREE.BoxGeometry(2, 13.5, 6), WALL, -30.5, 11.25, 0);

  // the hall's dome (the green dome of the building, seen from inside, ribbed like a womb)
  const dome = put(new THREE.SphereGeometry(44, 48, 18, 0, Math.PI * 2, 0, Math.PI / 2), mat("#ffc2cf", { side: THREE.BackSide }), 0, 9, 0); dome.scale.y = 0.27; dome.castShadow = false;
  for (let i = 0; i < 10; i++) { const rib = put(new THREE.TorusGeometry(42.5, 0.35, 8, 48, Math.PI), RIB, 0, 9, 0); rib.rotation.y = (i / 10) * Math.PI; rib.scale.set(1, 0.27, 1); rib.castShadow = false; }
  const wombDome = put(new THREE.SphereGeometry(19, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat("#ffb8c8", { side: THREE.BackSide }), 44.75, 9, 0); wombDome.scale.set(1, 0.4, 1.05); wombDome.castShadow = false;
  // fleshy ribs on the walls of every room
  const ribGeo = new THREE.TorusGeometry(2.2, 0.22, 8, 20, Math.PI);
  const ribAt = (x, z, ry, s = 1) => { const r = put(ribGeo, RIB, x, 0, z); r.rotation.y = ry; r.scale.set(s, s * 2.2, s); r.castShadow = false; };
  for (let x = -26; x <= 26; x += 6.5) { ribAt(x, -29.9, 0); }
  for (let z = -24; z <= 24; z += 8) { if (Math.abs(z) > 4) { ribAt(-29.9, z, Math.PI / 2); ribAt(29.9, z, Math.PI / 2); } }
  for (let x = 35; x <= 56; x += 5) { ribAt(x, -14.9, 0, 1.3); ribAt(x, 14.9, 0, 1.3); }

  // carpet aisles in the hall and the lobby
  const carpet = (x, z, w, d, ry = 0) => { const c = put(new THREE.BoxGeometry(w, 0.03, d), CARPET, x, 0.015, z); c.rotation.y = ry; c.castShadow = false; };
  carpet(0, 41, 3, 22); carpet(0, 8, 3, 42); carpet(37, 0, 14, 3); carpet(-37, 0, 14, 3);

  // signs over the doorways
  const doorSign = (x, z, ry, key, color = "#2f6b4f") => { const s = put(new THREE.PlaneGeometry(5.6, 1), mat("#fff"), x, 0, z); s.rotation.y = ry; s.userData = { key, color }; return s; };
  const signs = [doorSign(0, 32.6, 0, "signHall"), doorSign(0, 29.4, Math.PI, "signHall"), doorSign(29.4, 0, -Math.PI / 2, "signWomb", "#e0384b"), doorSign(-29.4, 0, Math.PI / 2, "signLounge", "#e8742a"), doorSign(0, 51.4, Math.PI, "signExit", "#e0384b")];
  signs[0].position.y = signs[1].position.y = 7.2; signs[2].position.y = 6.2; signs[3].position.y = 5; signs[4].position.y = 5.2;

  // ---------- bubbles everywhere (one instanced mesh) ----------
  const NB = quality.low ? 50 : 110, bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false }), NB);
  const bubs = []; for (let i = 0; i < NB; i++) { const inWomb = i % 3 === 0; bubs.push({ x: inWomb ? 33 + hash(i) * 24 : -28 + hash(i) * 56, z: inWomb ? -13 + hash(i + 1) * 26 : -28 + hash(i + 1) * 56, y: hash(i + 2) * 12, s: 0.06 + hash(i + 3) * 0.18, v: 0.3 + hash(i + 4) * 0.6, top: inWomb ? 12 : 16 }); }
  scene.add(bub);

  // ---------- plenary hall ----------
  // the stage, the leaders' desk with the gavel, the president's chair
  put(new THREE.BoxGeometry(STAGE.x1 - STAGE.x0, STAGE.h, STAGE.z1 - STAGE.z0), mat("#c8324a"), 0, STAGE.h / 2, (STAGE.z0 + STAGE.z1) / 2);
  put(new THREE.BoxGeometry(STAGE.x1 - STAGE.x0 + 0.2, 0.08, 0.3), GOLD, 0, STAGE.h, STAGE.z1);
  put(new THREE.BoxGeometry(10, 1.1, 1.2), WOOD, 0, STAGE.h + 0.55, -21); box(-5, 5, -21.6, -20.4, STAGE.h + 1.1);
  put(new THREE.BoxGeometry(10.2, 0.08, 1.3), mat("#6b3f22"), 0, STAGE.h + 1.12, -21);
  const nameplates = [-3, 0, 3].map((x) => put(new THREE.BoxGeometry(1.6, 0.35, 0.08), mat("#fff"), x, STAGE.h + 0.65, -20.38));
  const gavel = new THREE.Group(); gavel.position.set(2, STAGE.h + 1.16, -21); scene.add(gavel);
  put(new THREE.CylinderGeometry(0.28, 0.32, 0.12, 16), WOOD, 0, 0.06, 0, gavel);
  const gHead = new THREE.Group(); gHead.position.set(0, 0.25, 0.35); gavel.add(gHead);
  put(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 12), mat("#6b3f22"), 0, 0, 0, gHead).rotation.z = Math.PI / 2;
  put(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8), mat("#6b3f22"), 0, 0, 0.35, gHead).rotation.x = Math.PI / 2;
  const chair = new THREE.Group(); chair.position.set(0, STAGE.h, -23.5); scene.add(chair);
  put(new THREE.BoxGeometry(2.2, 0.3, 1.6), mat("#c8324a"), 0, 0.9, 0, chair); put(new THREE.BoxGeometry(2.2, 3.4, 0.3), mat("#c8324a"), 0, 2.4, -0.7, chair);
  put(new THREE.BoxGeometry(2.5, 0.3, 0.5), GOLD, 0, 4.2, -0.7, chair); box(-1.2, 1.2, -24.4, -22.6, STAGE.h + 4);
  // the president floats over his chair
  const president = sperm({ president: true, ph: 0.4 }); president.g.scale.setScalar(1.25); scene.add(president.g);

  // the speaker's podium in front of the stage
  const pod = new THREE.Group(); pod.position.set(0, 0, -13.2); scene.add(pod);
  put(new THREE.BoxGeometry(1.6, 1.25, 0.9), WOOD, 0, 0.62, 0, pod); put(new THREE.BoxGeometry(1.8, 0.1, 1.1), mat("#6b3f22"), 0, 1.3, -0.05, pod);
  put(new THREE.BoxGeometry(1.2, 0.5, 0.05), mat("#fff", { map: canTex(256, 110, (c, w, h) => { c.fillStyle = "#e0384b"; c.fillRect(0, 0, w, h); c.fillStyle = "#fff"; c.font = "900 54px 'Archivo Black'"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("CZ", w / 2, h / 2 + 4); }) }), 0, 0.75, 0.46, pod);
  put(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), DARK, 0, 1.55, -0.2, pod).rotation.x = -0.5;
  put(new THREE.SphereGeometry(0.07, 10, 8), DARK, 0, 1.78, -0.32, pod);
  box(-0.9, 0.9, -13.7, -12.7, 1.4);

  // the seats: rows in arcs facing the podium; each with a desk, a chair, a microphone and two vote buttons (instanced, light)
  const seats = [];
  [8, 11, 14, 17, 20].forEach((r) => {
    const step = 1.75 / r;
    for (let a = -1.08; a <= 1.08; a += step) {
      if (Math.abs(a) < 0.1 || Math.abs(Math.abs(a) - 0.62) < 0.08) continue;   // aisles
      seats.push({ a, r, x: Math.sin(a) * r, z: -13.2 + Math.cos(a) * r });
    }
  });
  const dummy = new THREE.Object3D(), mSeat = new THREE.Matrix4(), mOff = new THREE.Matrix4();
  function inst(geo, m, ox, oy, oz, rx = 0) {
    const im = new THREE.InstancedMesh(geo, m, seats.length); im.castShadow = im.receiveShadow = quality.shadows;
    seats.forEach((s, i) => {
      dummy.position.set(s.x, 0, s.z); dummy.rotation.set(0, s.a, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); mSeat.copy(dummy.matrix);
      dummy.position.set(ox, oy, oz); dummy.rotation.set(rx, 0, 0); dummy.updateMatrix(); mOff.copy(dummy.matrix);
      im.setMatrixAt(i, mSeat.clone().multiply(mOff));
    });
    scene.add(im); return im;
  }
  inst(new THREE.BoxGeometry(1.3, 0.08, 0.6), mat("#f6f2ea"), 0, 0.86, -0.5);           // desk top
  inst(new THREE.BoxGeometry(1.3, 0.82, 0.06), WOOD, 0, 0.41, -0.78);                    // desk front
  inst(new THREE.BoxGeometry(0.62, 0.1, 0.6), mat("#c8324a"), 0, 0.5, 0.25);             // chair seat
  inst(new THREE.BoxGeometry(0.62, 0.75, 0.1), mat("#c8324a"), 0, 0.92, 0.55);           // chair back
  inst(new THREE.CylinderGeometry(0.05, 0.06, 0.48, 6), DARK, 0, 0.25, 0.25);            // chair leg
  inst(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 5), DARK, 0.35, 1.1, -0.55, -0.45); // microphone
  inst(new THREE.SphereGeometry(0.05, 8, 6), DARK, 0.35, 1.31, -0.45);
  inst(new THREE.BoxGeometry(0.14, 0.05, 0.1), mat("#2fa04a", { emissive: "#2fa04a", emissiveIntensity: 0.4 }), -0.35, 0.92, -0.4);   // AGREE
  inst(new THREE.BoxGeometry(0.14, 0.05, 0.1), mat("#e0384b", { emissive: "#e0384b", emissiveIntensity: 0.4 }), -0.15, 0.92, -0.4);   // REJECT
  const fwd = new THREE.Vector3();
  seats.forEach((s) => {   // the desk is solid; the chair is where you sit
    fwd.set(-Math.sin(s.a), 0, -Math.cos(s.a));
    const dx = s.x + fwd.x * 0.5, dz = s.z + fwd.z * 0.5; box(dx - 0.55, dx + 0.55, dz - 0.55, dz + 0.55, 0.95);
    s.cx = s.x - fwd.x * 0.25; s.cz = s.z - fwd.z * 0.25; s.facing = Math.atan2(fwd.x, fwd.z);
  });

  // the three screens on the north wall
  const popScr = liveSign(512, 300, (c, w, h, v) => {
    c.fillStyle = "#1d1f26"; c.fillRect(0, 0, w, h); c.fillStyle = "#2f6b4f"; c.fillRect(0, 0, w, 70);
    c.fillStyle = "#fff"; c.font = "900 46px 'Archivo Black'"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(v.label, w / 2, 38);
    const s = v.n.toLocaleString(v.locale); let f = 150; c.font = `900 ${f}px 'Archivo Black'`; while (c.measureText(s).width > 470) { f -= 6; c.font = `900 ${f}px 'Archivo Black'`; }
    c.fillStyle = "#7dffb0"; c.fillText(s, w / 2, 190);
  });
  const lawScr = liveSign(768, 432, (c, w, h, v) => {
    c.fillStyle = "#1d1f26"; c.fillRect(0, 0, w, h); c.fillStyle = "#e0384b"; c.fillRect(0, 0, w, 80);
    c.fillStyle = "#fff"; c.font = "900 44px 'Archivo Black'"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(v.title, w / 2, 42);
    let f = 60; const words = v.text.split(" "); let lines;
    for (;;) { c.font = `900 ${f}px 'Archivo Black'`; lines = [""]; for (const wd of words) { const tl = lines[lines.length - 1] ? lines[lines.length - 1] + " " + wd : wd; if (c.measureText(tl).width > w - 60) lines.push(wd); else lines[lines.length - 1] = tl; } if (lines.length <= 3 || f <= 26) break; f -= 4; }
    c.fillStyle = "#fff6c8"; lines.forEach((l, i) => c.fillText(l, w / 2, 175 + (i - (lines.length - 1) / 2) * (f + 12)));
    c.font = "700 30px Poppins"; c.fillStyle = "#c9c1b4"; c.fillText(v.by, w / 2, 390);
  });
  const voteScr = liveSign(512, 300, (c, w, h, v) => {
    c.fillStyle = "#1d1f26"; c.fillRect(0, 0, w, h); c.fillStyle = "#2f8be6"; c.fillRect(0, 0, w, 70);
    c.fillStyle = "#fff"; c.font = "900 44px 'Archivo Black'"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(v.label, w / 2, 38);
    c.font = "900 54px 'Archivo Black'"; c.fillStyle = "#7dffb0"; c.fillText(`${v.yesL} ${v.yes}`, w / 2, 140); c.fillStyle = "#ff8fa3"; c.fillText(`${v.noL} ${v.no}`, w / 2, 220);
  });
  const screen = (x, y, w, h, tex) => { put(new THREE.BoxGeometry(w + 0.4, h + 0.4, 0.2), DARK, x, y, -29.85).castShadow = false; put(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), x, y, -29.7).castShadow = false; };
  screen(-17, 5.5, 8, 4.7, popScr.tex); screen(0, 11.5, 12, 6.75, lawScr.tex); screen(17, 5.5, 8, 4.7, voteScr.tex);

  // banners and the (still empty) national flag
  const banner = canTex(128, 384, (c, w, h) => { c.fillStyle = "#e0384b"; c.fillRect(0, 0, w, h); c.fillStyle = "#fffdf4"; c.fillRect(0, h - 40, w, 40); c.save(); c.translate(w / 2 + 14, h / 2 - 20); c.rotate(-Math.PI / 2); c.font = "900 46px 'Archivo Black'"; c.textAlign = "center"; c.fillText("CITIZENESIA", 0, 0); c.restore(); });
  [-1, 1].forEach((k) => [-20, -8, 12, 22].forEach((z) => { const b = put(new THREE.PlaneGeometry(1.6, 4.8), mat("#fff", { map: banner, side: THREE.DoubleSide }), k * 29.85, 5.2, z); b.rotation.y = -k * Math.PI / 2; b.castShadow = false; }));
  const flagTex = canTex(256, 170, (c, w, h) => { c.fillStyle = "#fffdf4"; c.fillRect(0, 0, w, h); c.strokeStyle = "#e0384b"; c.lineWidth = 10; c.setLineDash([18, 12]); c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = "#e0384b"; c.font = "900 110px 'Archivo Black'"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("?", w / 2, h / 2 + 6); });
  [-8.5, 8.5].forEach((x) => { put(new THREE.CylinderGeometry(0.07, 0.09, 6, 8), GOLD, x, STAGE.h + 3, -27.5); put(new THREE.PlaneGeometry(2.2, 1.45), mat("#fff", { map: flagTex, side: THREE.DoubleSide }), x + 1.15, STAGE.h + 5.1, -27.5); box(x - 0.3, x + 0.3, -27.8, -27.2, 9); });

  // the chandelier, and the light switch that turns it (and the hall lights) on and off
  const chand = new THREE.Group(); chand.position.set(0, 14, 2); scene.add(chand);
  put(new THREE.CylinderGeometry(0.05, 0.05, 6, 6), GOLD, 0, 3, 0, chand);
  put(new THREE.TorusGeometry(2.6, 0.12, 8, 40), GOLD, 0, 0, 0, chand).rotation.x = Math.PI / 2;
  const bulbs = new THREE.MeshStandardMaterial({ color: "#fff6d8", emissive: "#ffd36a", emissiveIntensity: 1.4 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; put(new THREE.SphereGeometry(0.22, 12, 10), bulbs, Math.cos(a) * 2.6, -0.25, Math.sin(a) * 2.6, chand).castShadow = false; }
  const sw = new THREE.Group(); sw.position.set(4.6, 1.3, 29.45); scene.add(sw);
  put(new THREE.BoxGeometry(0.5, 0.7, 0.06), TRIM, 0, 0, 0, sw); const swKnob = put(new THREE.BoxGeometry(0.16, 0.26, 0.08), mat("#e0384b"), 0, 0.07, -0.05, sw);
  let lightsOn = true;
  function setLights(on) { lightsOn = on; hemi.intensity = on ? 1.5 : 0.35; sun.intensity = on ? 1.6 : 0.2; bulbs.emissiveIntensity = on ? 1.4 : 0.05; swKnob.position.y = on ? 0.07 : -0.07; scene.background.set(on ? PINK : "#6b3a48"); scene.fog.color.copy(scene.background); }

  // ---------- the womb (east): the big egg, the sleeping fetuses ----------
  const egg = new THREE.Group(); egg.position.copy(EGG); scene.add(egg);
  put(new THREE.SphereGeometry(3.4, 40, 30), new THREE.MeshPhysicalMaterial({ color: "#ffe9b8", roughness: 0.15, transparent: true, opacity: 0.6, clearcoat: 1 }), 0, 0, 0, egg).castShadow = false;
  const halo = put(new THREE.SphereGeometry(3.8, 32, 24), new THREE.MeshBasicMaterial({ color: "#fff4d6", transparent: true, opacity: 0.22, side: THREE.BackSide }), 0, 0, 0, egg);
  const eggFlash = put(new THREE.SphereGeometry(3.3, 24, 18), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0 }), 0, 0, 0, egg); eggFlash.castShadow = false;
  put(new THREE.CylinderGeometry(3.6, 4.2, 0.4, 40), RIB, EGG.x, 0.2, EGG.z).castShadow = false;
  box(EGG.x - 3.2, EGG.x + 3.2, EGG.z - 3.2, EGG.z + 3.2, 7.2);
  const pods = [], podSpots = [[38, -10], [44, -11.5], [52, -11], [38, 10], [44, 11.5], [52, 11]];

  // ---------- lounge (west) ----------
  // free snacks table (today's sample decree)
  put(new THREE.BoxGeometry(5, 0.1, 1.6), mat("#fffdf4"), -42, 0.95, -10); [-1, 1].forEach((k) => put(new THREE.BoxGeometry(0.1, 0.95, 1.4), WOOD, -42 + k * 2.3, 0.47, -10)); box(-44.6, -39.4, -10.9, -9.1, 1.05);
  for (let i = 0; i < 5; i++) { put(new THREE.CylinderGeometry(0.38, 0.25, 0.22, 16), mat(["#ffd84a", "#e8742a", "#f29ac8", "#86c46a", "#cfeaf7"][i]), -44 + i, 1.11, -10); for (let j = 0; j < 4; j++) put(new THREE.SphereGeometry(0.1, 8, 6), mat(["#c9925a", "#e0384b", "#ffd84a"][j % 3]), -44 + i + (hash(i * 4 + j) - 0.5) * 0.4, 1.26, -10 + (hash(i * 7 + j) - 0.5) * 0.4); }
  const snackSign = put(new THREE.PlaneGeometry(4.6, 0.9), mat("#fff"), -42, 2.2, -11.2);
  // water dispenser
  put(new THREE.BoxGeometry(0.8, 1.2, 0.8), TRIM, -57, 0.6, -5); put(new THREE.CylinderGeometry(0.33, 0.33, 0.9, 16), glossy("#9fd3ea", { transparent: true, opacity: 0.7 }), -57, 1.65, -5); box(-57.6, -56.4, -5.6, -4.4, 2);
  // TV
  const tv = liveSign(512, 288, (c, w, h, v) => { c.fillStyle = "#1d1f26"; c.fillRect(0, 0, w, h); c.fillStyle = "#e0384b"; c.fillRect(20, 20, 120, 44); c.fillStyle = "#fff"; c.font = "900 30px 'Archivo Black'"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("LIVE", 80, 43); c.font = "900 46px 'Archivo Black'"; c.fillText(v.title, w / 2, 150); c.font = "700 26px Poppins"; c.fillStyle = "#c9c1b4"; c.fillText(v.sub, w / 2, 220); });
  put(new THREE.BoxGeometry(0.15, 2.4, 4.1), DARK, -57.9, 2.6, 2); const tvScr = put(new THREE.PlaneGeometry(3.8, 2.1), new THREE.MeshBasicMaterial({ map: tv.tex, toneMapped: false }), -57.8, 2.6, 2); tvScr.rotation.y = Math.PI / 2;
  // sofa facing the TV
  put(new THREE.BoxGeometry(1.2, 0.5, 4), mat("#7a5ab0"), -52, 0.45, 2); put(new THREE.BoxGeometry(0.4, 1.1, 4), mat("#7a5ab0"), -51.4, 0.75, 2); box(-52.6, -51.2, 0, 4, 0.8);
  // vending machine
  put(new THREE.BoxGeometry(1.4, 2.4, 1), mat("#2f8be6"), -57.2, 1.2, 9); put(new THREE.BoxGeometry(0.06, 1.5, 0.8), glossy("#cfeaf7", { transparent: true, opacity: 0.6 }), -56.48, 1.45, 9); box(-57.9, -56.5, 8.5, 9.5, 2.4);
  // nap bench
  put(new THREE.BoxGeometry(3.4, 0.4, 1.2), mat("#e9e2f4"), -40, 0.5, 11); put(new THREE.BoxGeometry(0.8, 0.25, 1), mat("#fffdf4"), -41.5, 0.82, 11); box(-41.7, -38.3, 10.4, 11.6, 0.7);
  // census board (names of the citizens)
  const census = liveSign(640, 400, (c, w, h, v) => { c.fillStyle = "#fffaf0"; c.fillRect(0, 0, w, h); c.fillStyle = "#2f6b4f"; c.fillRect(0, 0, w, 70); c.fillStyle = "#fff"; c.font = "900 40px 'Archivo Black'"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(v.title, w / 2, 38); c.textAlign = "left"; c.font = "800 26px Poppins"; c.fillStyle = "#3a2414"; v.rows.slice(0, 10).forEach((r, i) => c.fillText(r, 30 + (i % 2) * 310, 110 + Math.floor(i / 2) * 56)); });
  const censusBoard = put(new THREE.PlaneGeometry(5, 3.1), mat("#fff", { map: census.tex }), -46, 2.6, 14.85); censusBoard.rotation.y = Math.PI;

  // ---------- lobby ----------
  // reception desk
  put(new THREE.BoxGeometry(5, 1.1, 1.2), mat("#fffdf4"), -7, 0.55, 40); put(new THREE.BoxGeometry(5.2, 0.1, 1.4), WOOD, -7, 1.15, 40); box(-9.6, -4.4, 39.3, 40.7, 1.2);
  const recSign = put(new THREE.PlaneGeometry(3, 0.55), mat("#fff"), -7, 0.6, 40.62);
  // aspiration box (comment box): opens the platforms
  put(new THREE.BoxGeometry(1.1, 1.3, 1.1), mat("#e0384b"), 7, 0.65, 40); put(new THREE.BoxGeometry(0.7, 0.06, 0.12), DARK, 7, 1.31, 40); box(6.4, 7.6, 39.4, 40.6, 1.4);
  const aspSign = put(new THREE.PlaneGeometry(2.6, 0.55), mat("#fff"), 7, 2.0, 40);
  put(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), DARK, 7, 1.6, 40.0);
  // metal detector gate
  [-1.3, 1.3].forEach((x) => { put(new THREE.BoxGeometry(0.3, 2.6, 0.6), mat("#d9d4cc"), x, 1.3, 46.5); box(x - 0.15, x + 0.15, 46.2, 46.8, 3); });
  put(new THREE.BoxGeometry(2.9, 0.3, 0.6), mat("#d9d4cc"), 0, 2.75, 46.5); const gateLed = put(new THREE.SphereGeometry(0.1, 10, 8), mat("#2fa04a", { emissive: "#2fa04a", emissiveIntensity: 1 }), 0, 2.95, 46.5);
  // the exit door (to the island) glows with daylight
  put(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ color: "#eaf7ff" }), 0, 2.1, 52.45).rotation.y = Math.PI;
  // benches, plants, the president's portrait
  [[-10, 47], [10, 47]].forEach(([x, z]) => { put(new THREE.BoxGeometry(1, 0.45, 3), mat("#c8324a"), x, 0.35, z); box(x - 0.5, x + 0.5, z - 1.5, z + 1.5, 0.6); });
  [[-11, 33], [11, 33], [-11, 50.5], [11, 50.5]].forEach(([x, z]) => { put(new THREE.CylinderGeometry(0.35, 0.28, 0.6, 12), mat("#e8742a"), x, 0.3, z); put(new THREE.SphereGeometry(0.65, 12, 10), mat("#6fb35a"), x, 1.15, z); box(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 1.5); });
  const portrait = canTex(256, 320, (c, w, h) => { c.fillStyle = "#ffd84a"; c.fillRect(0, 0, w, h); c.fillStyle = "#cdeaf7"; c.fillRect(16, 16, w - 32, h - 32); c.fillStyle = "#fbfaf6"; c.beginPath(); c.ellipse(w / 2, 150, 80, 66, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "#2a2421"; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(w / 2 - 66 + i * 22, 92 - Math.sin(i / 6 * Math.PI) * 10, 18, 0, Math.PI * 2); c.fill(); } c.strokeStyle = "#22201f"; c.lineWidth = 5; [w / 2 - 28, w / 2 + 28].forEach((x) => { c.beginPath(); c.arc(x, 145, 18, 0, Math.PI * 2); c.stroke(); }); c.strokeStyle = "#e0384b"; c.lineWidth = 14; c.beginPath(); c.moveTo(w / 2 - 80, 120); c.lineTo(w / 2 + 70, 210); c.stroke(); c.fillStyle = "#3a2414"; c.font = "900 30px 'Archivo Black'"; c.textAlign = "center"; c.fillText("PRESIDEN", w / 2, 285); });
  put(new THREE.PlaneGeometry(2.2, 2.75), mat("#fff", { map: portrait }), -11.9, 3.6, 43).rotation.y = Math.PI / 2;
  put(new THREE.PlaneGeometry(2.2, 2.75), mat("#fff", { map: portrait }), 11.9, 3.6, 43).rotation.y = -Math.PI / 2;

  // ---------- the citizens: cells swim through the building, fetuses sleep in their pods ----------
  const swimmers = [];
  function setCitizens(list) {
    swimmers.forEach((s) => scene.remove(s.s.g)); swimmers.length = 0;
    pods.forEach((p) => scene.remove(p.g)); pods.length = 0;
    const LOOKS = [{ cap: "#2f6fd1" }, { band: "#2fa04a" }, { cap: "#e83a7a" }, { band: "#e8742a" }, { glasses: true }, { helmet: true }];
    const cells = list.filter((c) => c.level <= 1), fetuses = list.filter((c) => c.level === 2);
    const n = quality.low ? 6 : 12;
    for (let i = 0; i < n; i++) {
      const c = cells[i]; const s = sperm({ name: c ? "@" + c.name : null, ph: i * 1.3, look: (c && c.look) || LOOKS[i % LOOKS.length] });
      const sc = 0.5 * (1 + Math.min(1, ((c && c.likes) || 0) / 500) * 0.6); s.g.scale.setScalar(sc); scene.add(s.g);
      swimmers.push({ s, i, inWomb: i % 2 === 0 });
    }
    fetuses.slice(0, podSpots.length).forEach((c, i) => { const f = fetus("@" + c.name); f.g.scale.setScalar(0.42); f.g.position.set(podSpots[i][0], 1.4, podSpots[i][1]); scene.add(f.g); pods.push(f); });
  }

  // ---------- texts that follow the language and the census ----------
  function paintTexts() {
    signs.forEach((s) => { s.material.map = signTex([[t9n(s.userData.key), 52, 50, "#fff"]], { bg: s.userData.color, w: 560, h: 100 }); s.material.needsUpdate = true; });
    [["recSign", recSign, t9n("reception"), "#2f6b4f"], ["aspSign", aspSign, t9n("aspiration"), "#e0384b"], ["snack", snackSign, t9n("snackSign"), "#e8742a"]].forEach(([, m, txt, col]) => { m.material.map = signTex([[txt, 54, 50, "#fff"]], { bg: col, w: 560, h: 100 }); m.material.needsUpdate = true; });
    nameplates.forEach((m, i) => { m.material.map = signTex([[t9n("leaders")[i], 46, 48, "#3a2414"]], { w: 320, h: 80 }); m.material.needsUpdate = true; });
  }
  let votes = { yes: 0, no: 0 };
  function setData(d, locale, v = votes) {
    votes = v;
    popScr.draw({ label: t9n("population"), n: d.population || 0, locale });
    lawScr.draw(d.decree ? { title: t9n("decreeTitle", { n: String(d.day || 1).padStart(3, "0") }), text: `“${d.decree.text}”`, by: `@${d.decree.author} · ❤ ${d.decree.likes.toLocaleString(locale)}` }
                         : { title: t9n("decreeTitle", { n: "000" }), text: t9n("noDecree"), by: t9n("noDecreeBy") });
    voteScr.draw({ label: t9n("voteTitle"), yesL: t9n("agree"), noL: t9n("reject2"), yes: v.yes, no: v.no });
    tv.draw({ title: `CITIZENESIA · ${t9n("day")} ${String(d.day || 1).padStart(3, "0")}`, sub: t9n("tvSub") });
    census.draw({ title: t9n("censusTitle"), rows: (d.citizens || []).map((c) => `#${String(c.no || 0).padStart(4, "0")} @${c.name}`) });
  }

  // ---------- interactive things (main.js fills in what each one does) ----------
  const spots = {
    reception: { x: -7, z: 41.3, r: 2.2 }, aspiration: { x: 7, z: 41.3, r: 2.2 }, gate: { x: 0, z: 46.5, r: 1.2 },
    podium: { x: 0, z: -14.4, r: 1.6 }, gavel: { x: 2, z: -19.8, r: 2.0, y: STAGE.h }, president: { x: 0, z: -18, r: 5.5 },
    lights: { x: 4.6, z: 28.6, r: 1.8 }, egg: { x: EGG.x - 4.6, z: EGG.z, r: 2.6 }, eggAny: { x: EGG.x, z: EGG.z, r: 6.2 },
    snack: { x: -42, z: -8.4, r: 2.2 }, water: { x: -55.6, z: -5, r: 1.8 }, tv: { x: -54, z: 2, r: 4 }, vending: { x: -55.8, z: 9, r: 1.8 },
    nap: { x: -40, z: 9.6, r: 2.2 }, census: { x: -46, z: 13, r: 2.6 }, exit: { x: 0, z: 51.6, r: 2.2 },
  };

  // ---------- each frame ----------
  let gavelT = 9, flashT = 9;
  function update(t, dt, ctx) {
    // the president floats over his chair and turns to whoever comes near
    const pp = president.g.position; pp.set(0, STAGE.h + 4.2 + Math.sin(t * 1.6) * 0.15, -22.6);
    const nearP = Math.hypot(ctx.player.x - pp.x, ctx.player.z - pp.z) < 14;
    president.g.rotation.y = nearP ? -Math.atan2(ctx.player.z - pp.z, ctx.player.x - pp.x) : Math.PI / 2 + Math.sin(t * 0.3) * 0.4;
    swim(president, t, 0.5, 0.3); talk(president, ctx.presidentTalking ? (Math.sin(t * 18) > 0 ? 5 : 2) : 0, blinkAt(t, 1));
    // cells swim laps: half around the egg, half under the dome of the hall
    swimmers.forEach((w) => {
      const { s, i } = w; let x, y, z, a;
      if (w.inWomb) { a = t * (0.35 + i * 0.015) + i * 0.9; const r = 6.5 + (i % 3) * 1.4; x = EGG.x + Math.cos(a) * r; z = EGG.z + Math.sin(a) * r; y = 3 + (i % 4) * 0.9 + Math.sin(t * 1.3 + i) * 0.4; }
      else { a = t * (0.16 + i * 0.01) + i * 0.7; const r = 9 + (i % 4) * 3; x = Math.cos(a) * r; z = 2 + Math.sin(a) * r; y = 7 + (i % 3) * 1.5 + Math.sin(t + i) * 0.4; }
      s.g.position.set(x, y, z); s.g.rotation.set(0, -a - Math.PI / 2, Math.sin(t * 1.1 + i) * 0.12);
      const near = Math.hypot(x - ctx.cam.x, z - ctx.cam.z) < 26;   // only nearby tails are animated (keeps phones fast)
      if (near) swim(s, t + i, 1.1); talk(s, 0, blinkAt(t, i + 4));
    });
    pods.forEach((p, i) => { p.f.rotation.z = -0.35 + Math.sin(t * 1.2 + i) * 0.06; p.g.position.y = 1.4 + Math.sin(t * 0.8 + i) * 0.1; });
    // bubbles drift up
    bubs.forEach((b, i) => { dummy.position.set(b.x + Math.sin(t * 0.7 + i) * 0.3, (b.y + t * b.v) % b.top, b.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(b.s); dummy.updateMatrix(); bub.setMatrixAt(i, dummy.matrix); });
    bub.instanceMatrix.needsUpdate = true;
    halo.scale.setScalar(1 + Math.sin(t * 2) * 0.02);
    // gavel swing and the egg flash
    gavelT += dt; gHead.rotation.x = gavelT < 0.6 ? -Math.abs(Math.sin(gavelT / 0.3 * Math.PI)) * 0.9 : 0;
    flashT += dt; eggFlash.material.opacity = flashT < 0.8 ? Math.sin(flashT / 0.8 * Math.PI) * 0.9 : 0;
    gateLed.material.color.set(ctx.gateBeep ? "#e0384b" : "#2fa04a"); gateLed.material.emissive.copy(gateLed.material.color);
    sun.position.set(ctx.player.x + 6, 16, ctx.player.z + 8); sun.target.position.set(ctx.player.x, 0, ctx.player.z);
  }

  // where can you stand?
  const inRect = (r, x, z, m) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;
  const walkable = (x, z, m = 0.35) => Object.values(ROOMS).some((r) => inRect(r, x, z, m)) || DOORS.some((d) => inRect(d, x, z, m));
  const groundAt = (x, z) => (inRect(STAGE, x, z, 0) ? STAGE.h : 0);
  const ceilAt = (x, z) => { for (const r of Object.values(ROOMS)) if (inRect(r, x, z, 0)) return r.ceil; return 6; };

  return { scene, sun, solids, seats, spots, president, update, setCitizens, setData, paintTexts, setLights, get lightsOn() { return lightsOn; },
    walkable, groundAt, ceilAt, swingGavel: () => (gavelT = 0), flashEgg: () => (flashT = 0) };
}
