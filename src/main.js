// CITIZENESIA: THE GAME v0.1. You start as a cell, swim into The People's House to be born, work at the job office for coins,
// and build with blocks. World data (population, today's decree, citizens) comes from public/data/world.json, written by the census.
import * as THREE from "three";
import { SKY, PINK, clamp, lerp } from "./kit.js";
import { sperm, swim, talk, baby, walk, blinkAt, LOOK_COLOURS } from "./actors.js";
import { buildWorld, ISLAND_R, OFFICE } from "./world.js";
import { createBuilder, BLOCKS } from "./build.js";
import { t9n, getLang, setLang } from "./i18n.js";

const $ = (id) => document.getElementById(id);
const touch = matchMedia("(pointer: coarse)").matches;

// ---------- renderer, scene, light (as in the video) ----------
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $("gl"), antialias: true }); }
catch (e) {   // no 3D in this browser: say so instead of a blank sky
  document.body.insertAdjacentHTML("beforeend", '<div class="hud card" style="left:50%;top:50%;transform:translate(-50%,-50%);padding:18px 22px;max-width:86vw;text-align:center;font:800 16px/1.4 Poppins">CITIZENESIA needs WebGL (3D). Open it in Chrome, Safari or Firefox with hardware acceleration on.</div>');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.5 : 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color(SKY); scene.fog = new THREE.Fog(SKY, 45, 110);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
scene.add(new THREE.HemisphereLight("#fff8f0", "#c9a4ae", 1.35));
const sun = new THREE.DirectionalLight("#fff3e2", 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 }); sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
scene.add(sun, sun.target);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.userData.lift = undefined; camera.clearViewOffset(); camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

const world = buildWorld(scene, t9n);
const NOBUILD_OFFICE = { x0: OFFICE.x - 5, x1: OFFICE.x + 5, z0: OFFICE.z - 4.2, z1: OFFICE.z + 4.2 };
const inBox = (b, x, z, m = 0) => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m;
const noBuild = (x, z) => Math.hypot(x, z) < 6.2 || world.solids.some((b) => inBox(b, x, z, 0.4)) || inBox(NOBUILD_OFFICE, x, z)
  || Math.hypot(x - world.doorWorld.x, z - world.doorWorld.z) < 2.2;
const builder = createBuilder(scene, camera, noBuild);

// ---------- save ----------
const KEY = "citizenesia.save.v1";
let S = { name: "", look: { cap: "#e0384b", band: null, glasses: true, stache: true, helmet: false }, level: 0, coins: 0, free: false, hired: false, created: false, pos: [0, 7], blocks: [] };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
let dirty = false;
function save() { S.blocks = builder.save(); S.pos = [round(player.x), round(player.z)]; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} dirty = false; }
const round = (v) => Math.round(v * 100) / 100;
builder.load(S.blocks);

// ---------- world data from the census ----------
let DATA = { day: 1, population: 0, decree: null, citizens: [] };
const paintData = () => world.setData(DATA, t9n("locale"));
fetch("data/world.json").then((r) => r.json()).then((d) => { DATA = d; paintData(); world.setCitizens(d.citizens || []); }).catch(() => paintData());

// ---------- the player ----------
const player = new THREE.Vector3(S.pos[0], 0, S.pos[1]);
let vy = 0, facing = Math.PI, avatar = null, moving = false;
const handle = () => "@" + (S.name || t9n("namePh"));
function makeAvatar() {
  if (avatar) scene.remove(avatar.g);
  avatar = S.level === 0 ? { kind: "cell", ...sperm({ name: handle(), look: S.look, ph: 0 }) } : { kind: "baby", ...baby(handle(), S.look) };
  avatar.g.scale.setScalar(avatar.kind === "cell" ? 0.45 : 0.75);
  scene.add(avatar.g);
}
const groundY = () => builder.groundAt(player.x, player.z, player.y);

// ---------- input: keys, mouse/touch orbit, joystick ----------
const keys = new Set();
addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  keys.add(e.code);
  if (e.code === "Space") jump();
  if (e.code === "KeyE" || e.code === "Enter") doAction();
  if (e.code === "KeyB") toggleBuild();
  if (e.code === "KeyX" && building) setTool(tool === "place" ? "del" : "place");
  if (building && /^Digit\d$/.test(e.code)) { const n = (+e.code.slice(5) + 9) % 10; if (BLOCKS[n]) pick(n); }
});
addEventListener("keyup", (e) => keys.delete(e.code));
let yaw = 0, pitch = 0.42, dist = 7;
const drag = { id: null, x: 0, y: 0, moved: 0, button: 0 };
const ndc = new THREE.Vector2();
const canvas = $("gl");
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerdown", (e) => {
  if (drag.id !== null) return;
  Object.assign(drag, { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, button: e.button });
  canvas.setPointerCapture(e.pointerId);
  aimAt(e);
});
canvas.addEventListener("pointermove", (e) => {
  if (drag.id === e.pointerId) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 6) { yaw -= dx * 0.006; pitch = clamp(pitch + dy * 0.005, 0.05, 1.25); }
  } else if (!touch) aimAt(e);
});
canvas.addEventListener("pointerup", (e) => {
  if (drag.id !== e.pointerId) return;
  if (building && drag.moved <= 6) { aimAt(e); useTool(drag.button === 2 ? "del" : tool); }
  drag.id = null;
});
canvas.addEventListener("wheel", (e) => { dist = clamp(dist + e.deltaY * 0.01, 4, 16); }, { passive: true });
function aimAt(e) { if (!building) return; ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); builder.aim(ndc, tool === "del", player); }

const joy = { id: null, cx: 0, cy: 0, x: 0, y: 0 };
if (touch) {
  const j = $("joy"), knob = j.querySelector("i"); j.style.display = "block";
  j.addEventListener("pointerdown", (e) => { const r = j.getBoundingClientRect(); Object.assign(joy, { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }); j.setPointerCapture(e.pointerId); moveJoy(e); });
  j.addEventListener("pointermove", (e) => e.pointerId === joy.id && moveJoy(e));
  const end = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ""; };
  j.addEventListener("pointerup", end); j.addEventListener("pointercancel", end);
  function moveJoy(e) {
    let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const l = Math.hypot(dx, dy), m = 50;
    if (l > m) { dx *= m / l; dy *= m / l; }
    joy.x = dx / m; joy.y = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`;
  }
}

// ---------- HUD ----------
let toastT = 0;
function toast(msg, s = 2.6) { const el = $("toast"); el.textContent = msg; el.classList.add("on"); toastT = s; }
function hud() {
  $("meName").textContent = handle();
  $("meLv").textContent = t9n(["lvCell", "lvBaby", "lvCitizen"][Math.min(S.level, 2)]);
  $("meCoins").textContent = S.free ? "∞" : S.coins;
  $("hint").textContent = S.level === 0 ? t9n("hintBorn") : !S.hired ? t9n("hintWork") : builder.count() < 3 ? t9n("hintBuild") : "";
  $("hint").style.display = $("hint").textContent && !building ? "" : "none";
}
function labels() {
  document.documentElement.lang = getLang();
  $("langBtn").textContent = t9n("lang"); $("jumpBtn").textContent = t9n("jump"); $("buildBtn").textContent = building ? t9n("done") : t9n("build");
  $("editBtn").textContent = t9n("edit"); $("resetBtn").textContent = t9n("reset");
  $("cSub").textContent = t9n("subtitle"); $("cNameL").textContent = t9n("yourName"); $("cName").placeholder = t9n("namePh");
  $("cLookL").textContent = t9n("look"); $("cFreeL").textContent = t9n("freeMode"); $("cGo").textContent = S.created ? "OK" : t9n("play");
  world.paintTexts(); paintData(); buildBar(); creatorUI(); hud();
}
$("langBtn").onclick = () => { setLang(getLang() === "id" ? "en" : "id"); labels(); makeAvatar(); };
$("menuBtn").onclick = () => { const m = $("menu"); m.style.display = m.style.display === "flex" ? "none" : "flex"; };
$("editBtn").onclick = () => { $("menu").style.display = "none"; openCreator(); };
$("resetBtn").onclick = () => {
  if (!confirm(t9n("resetAsk"))) return;
  try { localStorage.removeItem(KEY); } catch {} location.reload();
};
$("jumpBtn").onclick = () => jump();
$("buildBtn").onclick = () => toggleBuild();
$("act").onclick = () => doAction();

// ---------- character creator ----------
function openCreator() { $("creator").style.display = "flex"; creatorUI(); }
function creatorUI() {
  $("cName").value = S.name; $("cFree").checked = S.free;
  const sw = (el, field) => {
    el.innerHTML = `<span class="lk">${t9n(field)}</span>`;
    [null, ...LOOK_COLOURS].forEach((c) => {
      const d = document.createElement("div"); d.className = "c" + (c ? "" : " none") + (S.look[field] === c ? " on" : "");
      if (c) d.style.background = c;
      d.onclick = () => { S.look[field] = c; if (field === "cap" && c) S.look.helmet = false; creatorUI(); makeAvatar(); };
      el.appendChild(d);
    });
  };
  sw($("cCap"), "cap"); sw($("cBand"), "band");
  const tg = $("cTog"); tg.innerHTML = "";
  ["glasses", "stache", "helmet"].forEach((f) => {
    const b = document.createElement("button"); b.className = "tg" + (S.look[f] ? " on" : ""); b.textContent = t9n(f);
    b.onclick = () => { S.look[f] = !S.look[f]; if (f === "helmet" && S.look.helmet) S.look.cap = null; creatorUI(); makeAvatar(); };
    tg.appendChild(b);
  });
}
$("cName").addEventListener("input", (e) => { S.name = e.target.value.replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 20); e.target.value = S.name; makeAvatar(); hud(); });
$("cFree").addEventListener("change", (e) => { S.free = e.target.checked; hud(); buildBar(); });
$("cGo").onclick = () => { if (!S.name) S.name = t9n("namePh"); S.created = true; $("creator").style.display = "none"; makeAvatar(); labels(); save(); };

// ---------- building ----------
let building = false, tool = "place", pickT = 0;
function toggleBuild() {
  if (!S.created) return;
  building = !building; $("bar").style.display = building ? "flex" : "none"; $("cross").style.display = "none";
  if (!building) builder.hide();
  labels();
}
function pick(n) { pickT = n; buildBar(); }
function setTool(t) { tool = t; buildBar(); }
function buildBar() {
  const bar = $("bar"); bar.innerHTML = "";
  BLOCKS.forEach((b, i) => {
    const d = document.createElement("div"); d.className = "sw" + (i === pickT && tool === "place" ? " on" : "");
    d.style.background = b.top ? `linear-gradient(${b.top} 35%, ${b.c} 35%)` : b.c; if (b.glass) d.style.opacity = ".7";
    d.innerHTML = `<b>${(i + 1) % 10}</b>`; d.onclick = () => { pick(i); setTool("place"); }; bar.appendChild(d);
  });
  bar.insertAdjacentHTML("beforeend", '<div class="sep"></div>');
  [["place", "btn green"], ["del", "btn red"]].forEach(([k, cls]) => {
    const b = document.createElement("button"); b.className = cls + " tool" + (tool === k ? " on" : ""); b.textContent = t9n(k); b.onclick = () => setTool(k); bar.appendChild(b);
  });
  bar.insertAdjacentHTML("beforeend", `<span class="cost">${S.free ? t9n("free") : t9n("cost")}</span>`);
}
function useTool(kind) {
  const c = builder.target; if (!c) { toast(t9n("noBuildHere"), 1.2); return; }
  if (kind === "del") {
    if (c.existing && builder.remove(c.x, c.y, c.z)) { if (!S.free) S.coins += 1; dirty = true; }
  } else {
    // never bury the player
    const px = Math.floor(player.x), pz = Math.floor(player.z);
    if (c.x === px && c.z === pz && c.y >= Math.floor(player.y) - 0 && c.y < player.y + 1.6) return;
    if (!S.free && S.coins < 1) { toast(t9n("broke")); return; }
    if (builder.add(c.x, c.y, c.z, pickT)) { if (!S.free) S.coins -= 1; dirty = true; }
  }
  hud();
}

// ---------- actions: be born, work, talk to the president ----------
let near = null, workT = -1, talkT = 0, sayI = 0, bornT = -1, doorOpen = 0;
function doAction() {
  if (near === "office") {
    if (S.level === 0) { toast(t9n("needBorn")); return; }
    if (!S.hired) { toast(t9n("reject"), 2.2); setTimeout(() => { toast(t9n("hired")); S.hired = true; dirty = true; hud(); }, 2300); return; }
    if (workT < 0) { workT = 0; $("prog").style.display = "block"; $("progT").textContent = t9n("working"); }
  } else if (near === "president") {
    const lines = t9n("presidentSays");
    const line = lines[sayI++ % lines.length].replace("{pop}", (DATA.population || 0).toLocaleString(t9n("locale"))).replace("{decree}", DATA.decree ? DATA.decree.text : t9n("noDecree"));
    const b = $("bubble"); b.textContent = line; b.style.display = "block"; talkT = 3;
  }
}
function jump() { if (S.level > 0 && player.y <= groundY() + 0.01 && !building) vy = 8.2; }

// ---------- the loop ----------
const clock = new THREE.Clock(); let t = 0, saveT = 0;
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), camT = new THREE.Vector3(), tmp = new THREE.Vector3();
function tryMove(dx, dz) {
  const r = 0.35, top = player.y + (avatar.kind === "cell" ? 0.6 : 1.3);
  const blockedXZ = (x, z) => Math.hypot(x, z) > ISLAND_R - 0.8 || world.solids.some((b) => player.y < b.h && inBox(b, x, z, r))
    || (avatar.kind === "baby" && [[r, 0], [-r, 0], [0, r], [0, -r]].some(([ox, oz]) => builder.blockedAt(x + ox, z + oz, player.y + 0.05, top)));
  if (!blockedXZ(player.x + dx, player.z)) player.x += dx;
  if (!blockedXZ(player.x, player.z + dz)) player.z += dz;
}
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;
  // movement relative to the camera
  let mx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) + joy.x;
  let mz = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) + joy.y;
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const creating = $("creator").style.display === "flex";
  moving = ml > 0.08 && !creating && bornT < 0 && workT < 0;
  if (moving) {
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(-fwd.z, 0, fwd.x);
    const v = (avatar.kind === "cell" ? 5.2 : 4.4) * dt;
    const dx = (right.x * mx - fwd.x * mz) * v, dz = (right.z * mx - fwd.z * mz) * v;
    tryMove(dx, dz); facing = Math.atan2(dx, dz);
  }
  // vertical: cells hover above the ground, babies fall and jump
  const g = groundY();
  if (avatar.kind === "cell") player.y = lerp(player.y, g + 1.1 + Math.sin(t * 2) * 0.12, 0.15);
  else { vy -= 25 * dt; player.y += vy * dt; if (player.y <= g) { player.y = g; vy = 0; } if (g > player.y - 0.01 && g - player.y < 0.65) player.y = g; }

  // avatar pose
  avatar.g.position.copy(player);
  if (avatar.kind === "cell") { avatar.g.rotation.set(0, facing - Math.PI / 2, 0); swim(avatar, t, moving ? 1.6 : 0.6); talk(avatar, 0, blinkAt(t, 3)); }
  else { avatar.g.rotation.set(0, facing, 0); walk(avatar, t, moving && player.y <= g + 0.01, 1); }

  // what is the player next to?
  const dDoor = Math.hypot(player.x - world.doorWorld.x, player.z - world.doorWorld.z);
  const dDesk = Math.hypot(player.x - world.officeDesk.x, player.z - world.officeDesk.z);
  const dPres = Math.hypot(player.x, player.z + 1.2);
  near = dDesk < 3 ? "office" : dPres < 5 ? "president" : null;
  const act = $("act");
  act.style.display = near && !building && !creating ? "" : "none";
  act.textContent = near === "office" ? (getLang() === "id" ? "KERJA 💼" : "WORK 💼") : near === "president" ? (getLang() === "id" ? "NGOBROL 💬" : "TALK 💬") : "";

  // being born: swim into the door
  if (S.level === 0 && dDoor < 1.8 && bornT < 0 && S.created) bornT = 0;
  doorOpen = lerp(doorOpen, dDoor < 4 || bornT >= 0 ? 1 : 0, 0.08);
  if (bornT >= 0) {
    bornT += dt;
    if (bornT > 0.5 && S.level === 0) { $("flash").style.opacity = 1; }
    if (bornT > 0.9 && S.level === 0) {
      S.level = 1; dirty = true; makeAvatar();
      player.set(world.doorWorld.x, 0, world.doorWorld.z + 2.2); facing = 0; yaw = Math.PI;
      $("flash").style.opacity = 0; toast(t9n("born"), 3); hud();
    }
    if (bornT > 1.4) bornT = -1;
  }
  // working
  if (workT >= 0) {
    workT += dt; $("progI").style.width = `${Math.min(100, workT / 4 * 100)}%`;
    if (workT >= 4) { workT = -1; $("prog").style.display = "none"; S.coins += 10; dirty = true; toast(t9n("paid", { n: 10 }), 1.8); hud(); }
  }
  // president speech bubble follows his head
  if (talkT > 0) {
    talkT -= dt; tmp.copy(world.president.g.position).add(new THREE.Vector3(0, 1.4, 0)).project(camera);
    const b = $("bubble"); b.style.left = `${(tmp.x + 1) / 2 * innerWidth}px`; b.style.top = `${(1 - tmp.y) / 2 * innerHeight}px`;
    if (talkT <= 0) b.style.display = "none";
  }
  world.update(t, { player, presidentTalking: talkT > 0, doorOpen });

  // camera: third person orbit, kept above the ground
  const d = creating ? 4.2 : avatar.kind === "cell" ? dist * 0.85 : dist;
  camT.set(player.x, player.y + (avatar.kind === "cell" ? 0.7 : 1.2), player.z);
  const cy = creating ? facing : yaw;   // the creator shows you from the front
  const cp = creating ? 0.25 : pitch;
  // pull the camera in when a building, a block or the president is in the way
  const camOK = (x, y, z) => !world.solids.some((b) => y < b.h + 0.3 && inBox(b, x, z, 0.35)) && !builder.has(Math.floor(x), Math.floor(y), Math.floor(z))
    && Math.hypot(x - world.president.g.position.x, y - world.president.g.position.y, z - world.president.g.position.z) > 1.9;
  let k = d;
  for (; k > 1.4; k -= 0.25) if (camOK(camT.x + Math.sin(cy) * Math.cos(cp) * k, camT.y + Math.sin(cp) * k, camT.z + Math.cos(cy) * Math.cos(cp) * k)) break;
  camera.position.set(camT.x + Math.sin(cy) * Math.cos(cp) * k, Math.max(0.6, camT.y + Math.sin(cp) * k), camT.z + Math.cos(cy) * Math.cos(cp) * k);
  camera.lookAt(camT);
  // on a phone the creator sheet covers the lower part of the screen: show the character in the upper part
  const lift = creating && innerWidth <= 700;
  if (lift !== camera.userData.lift) { camera.userData.lift = lift; if (lift) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.3, innerWidth, innerHeight); else camera.clearViewOffset(); }
  sun.position.set(player.x + 8, 18, player.z + 10); sun.target.position.copy(player);
  const pinkish = S.level === 0 && S.created;   // cells see a faint pink world, like the swim zone
  scene.background.lerp(new THREE.Color(pinkish ? PINK : SKY), 0.02); scene.fog.color.copy(scene.background);

  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $("toast").classList.remove("on"); }
  saveT += dt; if (saveT > 3 && dirty && S.created) { saveT = 0; save(); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- start ----------
makeAvatar(); labels();
if (!S.created) openCreator();
addEventListener("pagehide", () => S.created && save());
document.fonts.ready.then(() => { world.paintTexts(); paintData(); });
requestAnimationFrame(frame);
if (location.search.includes("debug")) window.__cz = { player, S, builder, world, toggleBuild, doAction, get near() { return near; } };   // for tests
