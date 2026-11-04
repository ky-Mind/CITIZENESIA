// The home island of CITIZENESIA, as in the video: the plaza, the houses, the population and decree boards,
// The People's House (Gedung DPR, now big enough to walk into) and the job office (19,000,000 jobs open).
// No cells live out here: they stay inside The People's House until they are born. Outside walk the babies and citizens.
import * as THREE from "three";
import { M, mat, signTex, liveSign, hash, canTex } from "./kit.js";
import { baby, walk } from "./actors.js";
import { doorOf } from "./homes.js";

export const HOUSE = { x: 0, z: -22, s: 3 };    // The People's House, front door facing +z
export const OFFICE = { x: 20, z: -10 };       // the job office, open front facing +z

export function buildIsland(scene, t9n) {
  const solids = [];   // axis-aligned boxes {x0,x1,z0,z1,h} the player cannot walk through
  const box = (x, z, w, d, h = 9) => solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h });

  // plaza and paths (the island ground itself is the terrain at y = 0)
  M(new THREE.CylinderGeometry(5.5, 5.5, 0.06, 40), mat("#efe2c4"), 0, 0.03, 0, scene);
  const path = (x0, z0, x1, z1, w = 1.6) => { const len = Math.hypot(x1 - x0, z1 - z0), p = M(new THREE.BoxGeometry(w, 0.04, len), mat("#efe2c4"), (x0 + x1) / 2, 0.02, (z0 + z1) / 2, scene); p.rotation.y = Math.atan2(x1 - x0, z1 - z0); };
  path(0, -5, 0, -16.5, 3); path(4, -3.5, OFFICE.x, OFFICE.z + 3.6);

  // the little houses with dark, empty windows (they light up as the population grows)
  const windows = [], doors = [];
  function house(x, z, wall, roof, ry = 0) {
    doors.push({ ...doorOf(x, z, ry, 0.95), ry, wall, type: "s", id: "i" + doors.length });
    const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = ry; scene.add(h);
    M(new THREE.BoxGeometry(2, 1.7, 1.8), mat(wall), 0, 0.85, 0, h);
    const r = M(new THREE.ConeGeometry(1.65, 1.1, 4), mat(roof), 0, 2.25, 0, h); r.rotation.y = Math.PI / 4;
    M(new THREE.BoxGeometry(0.5, 0.8, 0.05), mat("#6b4a33"), 0, 0.4, 0.92, h);
    [-0.6, 0.6].forEach((wx) => windows.push(M(new THREE.BoxGeometry(0.42, 0.42, 0.05), mat("#3a4a5a"), wx, 1.15, 0.92, h)));
    box(x, z, 2.3, 2.3, 3);
  }
  [[-7.5, 5, "#f6d2a8", "#d9694a", 0.5 + Math.PI], [7.4, 5.2, "#cfe3f2", "#4a7fc0", -0.5 + Math.PI], [-10.5, -0.5, "#f3e7b8", "#6aa060", 0.9 + Math.PI / 2],
   [10.4, -0.2, "#f2c9d6", "#b05a7a", -0.9 - Math.PI / 2], [0, 15, "#e9e2f4", "#7a5ab0", Math.PI], [-16, 8, "#f6d2a8", "#6aa060", Math.PI / 2], [15, 9, "#cfe3f2", "#d9694a", -Math.PI / 2]].forEach((a) => house(...a));
  for (let i = 0; i < 34; i++) {   // trees around the edge
    const a = i / 34 * Math.PI * 2 + 0.3, r = 24 + hash(i) * 12; const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x - HOUSE.x) < 11 && Math.abs(z - HOUSE.z) < 9 || Math.hypot(x - OFFICE.x, z - OFFICE.z) < 8) continue;
    const tr = new THREE.Group(); tr.position.set(x, 0, z); scene.add(tr);
    M(new THREE.CylinderGeometry(0.12, 0.16, 0.9, 8), mat("#8a5a3a"), 0, 0.45, 0, tr);
    M(new THREE.SphereGeometry(0.7 + hash(i + 7) * 0.3, 14, 10), mat(i % 2 ? "#6fb35a" : "#86c46a"), 0, 1.35, 0, tr);
    box(x, z, 0.8, 0.8, 2);
  }

  // population board (followers = population) and the decree board (top comment = law)
  const pop = liveSign(512, 320, (c, w, h, v) => {
    c.fillStyle = "#fffaf0"; c.fillRect(0, 0, w, h); c.fillStyle = "#2f6b4f"; c.fillRect(0, 0, w, 84);
    c.fillStyle = "#fff"; c.font = "900 56px 'Archivo Black'"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(v.label, w / 2, 46);
    const s = v.n.toLocaleString(v.locale); let f = 190; c.font = `900 ${f}px 'Archivo Black'`;
    while (c.measureText(s).width > 470) { f -= 6; c.font = `900 ${f}px 'Archivo Black'`; }
    c.fillStyle = v.n ? "#2f6b4f" : "#e0384b"; c.fillText(s, w / 2, 210);
  });
  const decree = liveSign(512, 384, (c, w, h, v) => {
    c.fillStyle = "#fffdf4"; c.fillRect(0, 0, w, h); c.fillStyle = "#e0384b"; c.fillRect(0, 0, w, 76);
    c.fillStyle = "#fff"; c.font = "900 40px 'Archivo Black'"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(v.title, w / 2, 40);
    c.fillStyle = "#3a2414"; let f = 48; const words = `“${v.text}”`.split(" "); let lines;
    for (;;) {   // wrap and shrink until the quote fits in three lines
      c.font = `900 ${f}px 'Archivo Black'`; lines = [""];
      for (const wd of words) { const tl = lines[lines.length - 1] ? lines[lines.length - 1] + " " + wd : wd; if (c.measureText(tl).width > w - 40) lines.push(wd); else lines[lines.length - 1] = tl; }
      if (lines.length <= 3 || f <= 22) break; f -= 4;
    }
    lines.forEach((l, i) => c.fillText(l, w / 2, 130 + i * (f + 10)));
    c.font = "700 28px Poppins"; c.fillStyle = "#8a7a66"; c.fillText(v.by, w / 2, 340);
  });
  function board(x, z, ry, tex, w, hgt) {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry; scene.add(b);
    [-w / 2 + 0.2, w / 2 - 0.2].forEach((px) => M(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8), mat("#6b4a33"), px, 1.7, 0, b));
    M(new THREE.BoxGeometry(w, hgt, 0.1), mat("#fff", { map: tex }), 0, 3.4 - hgt / 2 + 0.1, 0.06, b);
    box(x, z, w, 0.5, 3);
  }
  board(-3.6, -3.4, 0.3, pop.tex, 2.9, 1.82);
  board(3.6, -3.4, -0.3, decree.tex, 2.9, 2.18);

  // The People's House (Gedung DPR): the video's building, three times bigger, with a door you can walk through
  const S3 = HOUSE.s, ph = new THREE.Group(); ph.position.set(HOUSE.x, 0, HOUSE.z); ph.scale.setScalar(S3); scene.add(ph);
  M(new THREE.BoxGeometry(4.6, 1.8, 2.6), mat("#f6f2ea"), 0, 0.9, 0, ph);
  for (let i = 0; i < 6; i++) if (i !== 2 && i !== 3) M(new THREE.CylinderGeometry(0.11, 0.11, 1.8, 10), mat("#ffffff"), -2.0 + i * 0.8, 0.9, 1.35, ph);
  M(new THREE.BoxGeometry(4.9, 0.18, 2.9), mat("#e2dccf"), 0, 1.86, 0, ph);
  M(new THREE.BoxGeometry(5.1, 0.1, 3.2), mat("#e2dccf"), 0, 0.05, 0.1, ph);
  [-1, 1].forEach((k) => { const d = M(new THREE.SphereGeometry(1.6, 32, 16, 0, Math.PI, 0, Math.PI / 2), mat("#3f9a6a", { roughness: 0.5 }), k * 0.42, 1.95, 0, ph); d.rotation.y = k > 0 ? -Math.PI / 2 : Math.PI / 2; d.rotation.z = k * 0.12; d.scale.set(1, 0.8, 1.35); });
  M(new THREE.BoxGeometry(0.9, 1.25, 0.04), mat("#ffb3c3", { emissive: "#ff8fa3", emissiveIntensity: 0.5 }), 0, 0.63, 1.31, ph);   // pink glow of the womb inside
  const doorPivot = new THREE.Group(); doorPivot.position.set(-0.45, 0, 1.33); ph.add(doorPivot);
  M(new THREE.BoxGeometry(0.9, 1.25, 0.08), mat("#8a5a3a"), 0.45, 0.63, 0, doorPivot);
  const phSign = M(new THREE.PlaneGeometry(2.6, 0.48), mat("#fff"), 0, 1.55, 1.32, ph);
  const doorWorld = new THREE.Vector3(HOUSE.x, 0, HOUSE.z + 1.33 * S3 + 0.5);
  box(HOUSE.x, HOUSE.z, 4.9 * S3, 2.6 * S3 + 0.2, 9);
  [-2.0, -1.2, 1.2, 2.0].forEach((cx) => box(HOUSE.x + cx * S3, HOUSE.z + 1.35 * S3, 0.5, 0.5, 6));

  // the flag pole: the flag and the app icon will be designed by the viewers in the comments
  const flagTex = canTex(256, 170, (c, w, h) => { c.fillStyle = "#fffdf4"; c.fillRect(0, 0, w, h); c.strokeStyle = "#e0384b"; c.lineWidth = 10; c.setLineDash([18, 12]); c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = "#e0384b"; c.font = "900 110px 'Archivo Black'"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("?", w / 2, h / 2 + 6); });
  const FLAG = { x: -7, z: -13 };
  M(new THREE.CylinderGeometry(0.09, 0.12, 8, 10), mat("#d9d4cc", { metalness: 0.4, roughness: 0.4 }), FLAG.x, 4, FLAG.z, scene);
  M(new THREE.SphereGeometry(0.18, 12, 10), mat("#ffd84a", { metalness: 0.5, roughness: 0.3 }), FLAG.x, 8.1, FLAG.z, scene);
  const flag = M(new THREE.PlaneGeometry(2.4, 1.6, 12, 1), mat("#fff", { map: flagTex, side: THREE.DoubleSide }), FLAG.x + 1.25, 7, FLAG.z, scene);
  const flagBase = flag.geometry.attributes.position.array.slice();
  box(FLAG.x, FLAG.z, 0.5, 0.5, 9);

  // the job office: open front, fifteen empty desks, a giant JOBS OPEN board
  const of = new THREE.Group(); of.position.set(OFFICE.x, 0, OFFICE.z); scene.add(of);   // open front faces +z
  M(new THREE.BoxGeometry(9, 0.2, 7), mat("#d9cbb2"), 0, 0.1, 0, of);
  M(new THREE.BoxGeometry(9, 4.2, 0.2), mat("#f2ead8"), 0, 2.1, -3.4, of);
  [-1, 1].forEach((k) => M(new THREE.BoxGeometry(0.2, 4.2, 7), mat("#f2ead8"), k * 4.4, 2.1, 0, of));
  M(new THREE.BoxGeometry(9.4, 0.3, 7.4), mat("#e0384b"), 0, 4.3, 0, of);
  const jobsBoard = M(new THREE.BoxGeometry(4.2, 2.2, 0.1), mat("#fff"), 0, 2.6, -3.25, of);
  const roofSign = M(new THREE.BoxGeometry(5, 1, 0.12), mat("#fff"), 0, 5, 1.2, of);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const ch = new THREE.Group(); ch.position.set(-3 + c * 2, 0.2, -1.6 + r * 2.2); of.add(ch);
    M(new THREE.BoxGeometry(1.5, 0.08, 0.8), mat("#f6f2ea"), 0, 0.85, -0.6, ch);
    [-0.65, 0.65].forEach((x) => M(new THREE.BoxGeometry(0.06, 0.85, 0.7), mat("#bfb7a8"), x, 0.42, -0.6, ch));
    M(new THREE.BoxGeometry(0.55, 0.38, 0.05), mat("#2a2a30"), 0, 1.1, -0.85, ch);
    M(new THREE.BoxGeometry(0.62, 0.08, 0.62), mat("#4a7fc0"), 0, 0.55, 0.2, ch);
    M(new THREE.BoxGeometry(0.62, 0.7, 0.08), mat("#4a7fc0"), 0, 0.95, 0.5, ch);
  }
  // walls are solid, the open front is walkable
  box(OFFICE.x, OFFICE.z - 3.4, 9, 0.6, 5); box(OFFICE.x - 4.4, OFFICE.z, 0.6, 7, 5); box(OFFICE.x + 4.4, OFFICE.z, 0.6, 7, 5);
  const officeDesk = new THREE.Vector3(OFFICE.x, 0, OFFICE.z + 1.5);

  // born citizens (level BABY and up in the census) stroll around the plaza
  const walkers = [];
  function setCitizens(list) {
    walkers.forEach((w) => scene.remove(w.b.g)); walkers.length = 0;
    const LOOKS = [{ cap: "#2f6fd1" }, { band: "#2fa04a" }, { cap: "#e83a7a" }, { band: "#e8742a" }, { glasses: true }, { helmet: true }];
    list.filter((c) => c.level >= 3).slice(0, 10).forEach((c, i) => {
      const b = baby("@" + c.name, c.look || LOOKS[i % LOOKS.length]); b.g.scale.setScalar(0.75); scene.add(b.g);
      walkers.push({ b, c, i, x: 0, z: 0, ry: 0 });
    });
  }

  // texts that change with the language
  function paintTexts() {
    phSign.material.map = signTex([[t9n("peoplesHouse"), 44, 48, "#2f6b4f"]], { h: 96 }); phSign.material.needsUpdate = true;
    jobsBoard.material.map = signTex([[t9n("jobsOpen"), 76, 66, "#fff"], [t9n("jobsCount"), 84, 222, "#2f6b4f"]], { band: "#e0384b", bandH: 130, w: 600, h: 324 }); jobsBoard.material.needsUpdate = true;
    roofSign.material.map = signTex([[t9n("jobOffice"), 64, 64, "#fff"]], { bg: "#2f6b4f", h: 128 }); roofSign.material.needsUpdate = true;
  }

  let data = { population: 0, decree: null };
  function setData(d, locale) {
    data = d;
    pop.draw({ label: t9n("population"), n: d.population || 0, locale });
    decree.draw(d.decree ? { title: t9n("decreeTitle", { n: String(d.day || 1).padStart(3, "0") }), text: d.decree.text, by: `@${d.decree.author} · ❤ ${d.decree.likes.toLocaleString(locale)}` }
                         : { title: t9n("decreeTitle", { n: "000" }), text: t9n("noDecree"), by: t9n("noDecreeBy") });
  }

  function update(t, ctx) {
    walkers.forEach((w) => {   // slow loops around the plaza, pausing now and then
      const pause = Math.sin(t * 0.4 + w.i * 1.7) > 0.6, a = w.i * 0.63 + (t * 0.09 + Math.sin(t * 0.2 + w.i)) * (w.i % 2 ? 1 : -1), r = 7.5 + (w.i % 4) * 1.6;
      if (!pause) { const nx = Math.cos(a) * r, nz = Math.sin(a) * r * 0.8 + 2; w.ry = Math.atan2(nx - w.x, nz - w.z); w.x = nx; w.z = nz; }
      w.b.g.position.set(w.x, 0, w.z); w.b.g.rotation.y = w.ry; walk(w.b, t, !pause, w.i);
    });
    const fp = flag.geometry.attributes.position;   // the flag waves
    for (let i = 0; i < fp.count; i++) { const x = flagBase[i * 3]; fp.setZ(i, Math.sin(x * 2.2 - t * 4) * 0.12 * (x + 1.2)); }
    fp.needsUpdate = true;
    doorPivot.rotation.y = -1.9 * ctx.doorOpen;
    const lit = Math.min(windows.length, Math.floor((data.population || 0) / 100));
    windows.forEach((w, i) => { const on = i < lit; w.material.color.set(on ? "#ffd36a" : "#3a4a5a"); w.material.emissive.set(on ? "#a8741a" : "#000000"); });
  }

  return { solids, update, setData, setCitizens, paintTexts, doorWorld, officeDesk, walkers, FLAG, doors };
}
