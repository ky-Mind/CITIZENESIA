// The island of CITIZENESIA: the plaza, houses and trees from the video, the president, the population and decree boards,
// The People's House (where cells are born) and the job office (19,000,000 jobs open). Everything solid is listed in `solids`.
import * as THREE from "three";
import { M, mat, glossy, signTex, liveSign, hash, lerp } from "./kit.js";
import { sperm, swim, talk, blinkAt } from "./actors.js";

export const ISLAND_R = 34;
export const HOUSE = { x: -13, z: -9 };      // The People's House
export const OFFICE = { x: 13, z: -9 };      // the job office

export function buildWorld(scene, t9n) {
  const solids = [];   // axis-aligned boxes {x0,x1,z0,z1,h} the player cannot walk through
  const box = (x, z, w, d, h = 9) => solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h });

  // ground: sea, island, plaza
  const sea = M(new THREE.CircleGeometry(160, 64), mat("#9fd3ea", { roughness: 0.35 }), 0, -0.45, 0, scene); sea.rotation.x = -Math.PI / 2; sea.castShadow = false;
  M(new THREE.CylinderGeometry(ISLAND_R + 1.2, ISLAND_R + 2.5, 0.8, 72), mat("#efe2c4"), 0, -0.6, 0, scene);   // sand rim
  M(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R, 0.4, 72), mat("#a8d88a"), 0, -0.2, 0, scene);
  M(new THREE.CylinderGeometry(5.5, 5.5, 0.06, 40), mat("#efe2c4"), 0, 0.03, 0, scene);
  [[HOUSE.x, HOUSE.z], [OFFICE.x, OFFICE.z]].forEach(([x, z]) => {   // paths from the plaza
    const len = Math.hypot(x, z) - 4, p = M(new THREE.BoxGeometry(1.6, 0.04, len), mat("#efe2c4"), x / 2, 0.02, z / 2, scene);
    p.rotation.y = Math.atan2(x, z);
  });

  // the little houses with dark, empty windows (they light up as the population grows)
  const windows = [];
  function house(x, z, wall, roof, ry = 0) {
    const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = ry; scene.add(h);
    M(new THREE.BoxGeometry(2, 1.7, 1.8), mat(wall), 0, 0.85, 0, h);
    const r = M(new THREE.ConeGeometry(1.65, 1.1, 4), mat(roof), 0, 2.25, 0, h); r.rotation.y = Math.PI / 4;
    M(new THREE.BoxGeometry(0.5, 0.8, 0.05), mat("#6b4a33"), 0, 0.4, 0.92, h);
    [-0.6, 0.6].forEach((wx) => windows.push(M(new THREE.BoxGeometry(0.42, 0.42, 0.05), mat("#3a4a5a"), wx, 1.15, 0.92, h)));
    box(x, z, 2.3, 2.3, 3);
  }
  [[-7.5, 5, "#f6d2a8", "#d9694a", 0.5 + Math.PI], [7.4, 5.2, "#cfe3f2", "#4a7fc0", -0.5 + Math.PI], [-10.5, -0.5, "#f3e7b8", "#6aa060", 0.9 + Math.PI / 2],
   [10.4, -0.2, "#f2c9d6", "#b05a7a", -0.9 - Math.PI / 2], [0, 15, "#e9e2f4", "#7a5ab0", Math.PI]].forEach((a) => house(...a));
  for (let i = 0; i < 22; i++) {   // trees around the edge
    const a = i / 22 * Math.PI * 2 + 0.3, r = 22 + hash(i) * 9; const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - HOUSE.x, z - HOUSE.z) < 7 || Math.hypot(x - OFFICE.x, z - OFFICE.z) < 8) continue;
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

  // the president floats over the plaza and talks
  const president = sperm({ president: true, ph: 0.4 }); scene.add(president.g); president.g.scale.setScalar(1.15);

  // The People's House: walk (swim) through the door to be born
  const ph = new THREE.Group(); ph.position.set(HOUSE.x, 0, HOUSE.z); ph.scale.setScalar(1.35); scene.add(ph);   // faces +z, towards the plaza side
  M(new THREE.BoxGeometry(4.6, 1.8, 2.6), mat("#f6f2ea"), 0, 0.9, 0, ph);
  for (let i = 0; i < 6; i++) if (i !== 2 && i !== 3) M(new THREE.CylinderGeometry(0.11, 0.11, 1.8, 10), mat("#ffffff"), -2.0 + i * 0.8, 0.9, 1.35, ph);
  M(new THREE.BoxGeometry(4.9, 0.18, 2.9), mat("#e2dccf"), 0, 1.86, 0, ph);
  [-1, 1].forEach((k) => { const d = M(new THREE.SphereGeometry(1.6, 32, 16, 0, Math.PI, 0, Math.PI / 2), mat("#3f9a6a", { roughness: 0.5 }), k * 0.42, 1.95, 0, ph); d.rotation.y = k > 0 ? -Math.PI / 2 : Math.PI / 2; d.rotation.z = k * 0.12; d.scale.set(1, 0.8, 1.35); });
  M(new THREE.BoxGeometry(0.9, 1.25, 0.04), mat("#2a2018"), 0, 0.63, 1.31, ph);
  const doorPivot = new THREE.Group(); doorPivot.position.set(-0.45, 0, 1.33); ph.add(doorPivot);
  M(new THREE.BoxGeometry(0.9, 1.25, 0.08), mat("#8a5a3a"), 0.45, 0.63, 0, doorPivot);
  const phSign = M(new THREE.PlaneGeometry(2.6, 0.48), mat("#fff"), 0, 1.55, 1.32, ph);
  ph.updateMatrixWorld(true);
  const doorWorld = new THREE.Vector3(0, 0, 1.9).applyMatrix4(ph.matrixWorld);
  box(HOUSE.x, HOUSE.z, 6.6, 6.6, 4);

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

  // citizens swimming over the plaza (sample names until the census fills them in)
  const swimmers = [];
  function setCitizens(names) {
    swimmers.forEach((s) => scene.remove(s.s.g)); swimmers.length = 0;
    const LOOKS = [{ cap: "#2f6fd1" }, { band: "#2fa04a" }, { cap: "#e83a7a" }, { band: "#e8742a" }, { glasses: true }, { helmet: true }];
    names.slice(0, 8).forEach((n, i) => { const s = sperm({ name: n, ph: i * 1.3, look: LOOKS[i % LOOKS.length] }); s.g.scale.setScalar(0.55); scene.add(s.g); swimmers.push({ s, i }); });
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

  const tmp = new THREE.Vector3();
  function update(t, ctx) {
    president.g.position.set(0, 2.9 + Math.sin(t * 1.6) * 0.12, -1.2);
    tmp.set(ctx.player.x, 2.9, ctx.player.z);   // the president turns to whoever is near
    const near = Math.hypot(ctx.player.x, ctx.player.z + 1.2) < 9;
    president.g.rotation.y = near ? -Math.atan2(tmp.z + 1.2, tmp.x) : -0.35 + Math.sin(t * 0.3) * 0.3;
    swim(president, t, 0.5, 0.3); talk(president, ctx.presidentTalking ? (Math.sin(t * 18) > 0 ? 5 : 2) : 0, blinkAt(t, 1));
    swimmers.forEach(({ s, i }) => {
      const a = t * (0.18 + i * 0.02) + i * 0.8, r = 7 + (i % 3) * 1.6;
      s.g.position.set(Math.cos(a) * r, 6.5 + (i % 4) * 0.7 + Math.sin(t + i) * 0.3, Math.sin(a) * r);
      s.g.rotation.set(0, -a - Math.PI / 2, 0); swim(s, t, 1.1); talk(s, 0, blinkAt(t, i + 4));
    });
    doorPivot.rotation.y = -1.9 * ctx.doorOpen;
    const lit = Math.min(windows.length, Math.floor((data.population || 0) / 100));
    windows.forEach((w, i) => { const on = i < lit; w.material.color.set(on ? "#ffd36a" : "#3a4a5a"); w.material.emissive.set(on ? "#a8741a" : "#000000"); });
  }

  return { solids, update, setData, setCitizens, paintTexts, doorWorld, officeDesk, president };
}
