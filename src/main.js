// CITIZENESIA: THE GAME v0.2. You start as a cell inside The People's House (its inside is the womb from the video).
// You grow through real comments: the census reads them each episode and writes public/data/world.json (level, likes, role).
// At level BABY you enter the egg, are born, and walk out into an endless world of islands and sea, where you work and build.
import * as THREE from "three";
import { SKY, clamp, lerp, fnv } from "./kit.js";
import { sperm, swim, talk, baby, walk, sit, fetus, grow, STAGE_YEARS, blinkAt, LOOK_COLOURS } from "./actors.js";
import { buildIsland, OFFICE } from "./island.js";
import { buildDPR, SPAWN, EXIT, EGG } from "./dpr.js";
import { createTerrain, heightAt, SEA, HOME_R } from "./terrain.js";
import { createBuilder, BLOCKS } from "./build.js";
import { t9n, getLang, setLang } from "./i18n.js";
import { SFX } from "./sfx.js";
import { createHomes, buildInterior, HOUSE_TYPES, typeOf, WALLS, ROOFS } from "./homes.js";

const $ = (id) => document.getElementById(id);
const touch = matchMedia("(pointer: coarse)").matches;
const params = new URLSearchParams(location.search), DEBUG = params.has("debug");
const quality = { low: touch, shadows: !touch };

// admin (the presenter): opening the game at /kymind makes this device the admin's, and it stays admin from then on.
// Everything runs on the player's own device, so admin powers change only that device's game.
let isAdmin = false;
try {
  if (/^\/kymind\/?$/i.test(location.pathname)) { localStorage.setItem("citizenesia.admin", "1"); history.replaceState(null, "", "/" + location.search); }
  isAdmin = localStorage.getItem("citizenesia.admin") === "1";
} catch {}

// ---------- renderer ----------
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $("gl"), antialias: !touch, powerPreference: "high-performance" }); }
catch (e) {   // no 3D in this browser: say so instead of a blank sky
  document.body.insertAdjacentHTML("beforeend", '<div class="hud card" style="left:50%;top:50%;transform:translate(-50%,-50%);padding:18px 22px;max-width:86vw;text-align:center;font:800 16px/1.4 Poppins">CITIZENESIA needs WebGL (3D). Open it in Chrome, Safari or Firefox with hardware acceleration on.</div>');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.25 : 1.75));
renderer.shadowMap.enabled = quality.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.userData.lift = undefined; camera.clearViewOffset(); camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

// ---------- the two places: inside The People's House, and the world outside ----------
const dpr = buildDPR(t9n, quality);
const out = new THREE.Scene(); out.background = new THREE.Color(SKY); out.fog = new THREE.Fog(SKY, 40, touch ? 85 : 120);
out.add(new THREE.HemisphereLight("#fff8f0", "#c9a4ae", 1.35));
const sun = new THREE.DirectionalLight("#fff3e2", 2.2); sun.castShadow = quality.shadows; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 }); sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
out.add(sun, sun.target);
const terrain = createTerrain(out, touch ? 2 : 3);
const island = buildIsland(out, t9n);
const inBox = (b, x, z, m = 0) => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m;
const NOBUILD_OFFICE = { x0: OFFICE.x - 5, x1: OFFICE.x + 5, z0: OFFICE.z - 4.2, z1: OFFICE.z + 4.2 };
const noBuild = (x, z) => Math.hypot(x, z) < 6.2 || island.solids.some((b) => inBox(b, x, z, 0.4)) || inBox(NOBUILD_OFFICE, x, z)
  || Math.hypot(x - island.doorWorld.x, z - island.doorWorld.z) < 3;
const builder = createBuilder(out, camera, noBuild);
const homes = createHomes(out);

// ---------- save ----------
const KEY = "citizenesia.save.v2", ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => "CZ-" + Array.from({ length: 4 }, () => ABC[Math.floor(Math.random() * ABC.length)]).join("");
let S = { name: "", code: newCode(), look: { cap: "#e0384b", band: null, glasses: true, stache: true, helmet: false }, coins: 0, free: false, hired: false,
  born: false, created: false, adm: { on: true, form: "president", size: 1, body: null, sim: 1, age: 16 }, where: "in", posIn: [SPAWN.womb[0], SPAWN.womb[1]], posOut: [0, -14], blocks: [], homes: [], votes: { yes: 0, no: 0 } };
try { const v1 = JSON.parse(localStorage.getItem("citizenesia.save.v1") || "null"); if (v1) Object.assign(S, { name: v1.name || "", look: v1.look || S.look, free: !!v1.free, created: !!v1.created }); } catch {}
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
let dirty = false, resetting = false;
const powers = () => isAdmin && S.adm.on;   // admin mode; "view as a player" turns it off
const round = (v) => Math.round(v * 100) / 100;
function save() {
  if (resetting) return;
  S.blocks = builder.save(); S.homes = homes.list; S.where = where === "house" ? "out" : where;
  if (where === "house") {} else if (where === "in") S.posIn = [round(player.x), round(player.z)]; else S.posOut = [round(player.x), round(player.z)];
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} dirty = false;
}
builder.load(S.blocks); homes.load(S.homes);

// ---------- the census (world.json): population, today's law, every citizen's level ----------
let DATA = { day: 1, population: 0, decree: null, citizens: [], links: {}, inbox: null };
const norm = (c) => (typeof c === "string" ? { name: c.replace(/^@/, ""), level: 1 } : { ...c, name: String(c.name || "").replace(/^@/, ""), level: c.level || 1 });
const paintData = () => { island.setData(DATA, t9n("locale")); dpr.setData(DATA, t9n("locale"), S.votes); };
fetch("data/world.json").then((r) => r.json()).then((d) => { DATA = { ...DATA, ...d, links: d.links || {}, citizens: (d.citizens || []).map(norm) }; applyData(); }).catch(() => applyData());
function applyData() { paintData(); island.setCitizens(DATA.citizens); dpr.setCitizens(DATA.citizens); refreshLevel(); }
const me = () => { const n = (S.name || "").toLowerCase(); return n ? DATA.citizens.find((c) => c.name.toLowerCase() === n) || null : null; };
const linked = (c) => !!c && [].concat(c.v || []).includes(fnv(S.code));
let LV = 1;   // 1 cell, 2 fetus, 3 baby, 4 child, 5 teen, 6 adult (from the census; only for a linked account)
function refreshLevel() {
  const c = me(); LV = linked(c) ? clamp(c.level | 0, 1, 6) : 1;
  if (isAdmin) LV = powers() ? 6 : S.adm.sim;   // the admin's player view tries each census level
  if (DEBUG && params.get("level")) LV = clamp(+params.get("level"), 1, 6);
  if (avatar && avatar.kind !== kindNow()) makeAvatar();
  hud();
}
const ageYears = () => (powers() ? S.adm.age ?? 16 : STAGE_YEARS[clamp(LV, 3, 6)]);   // the body follows the age
const kindNow = () => (powers() ? S.adm.form : S.born ? "baby" : LV === 2 ? "fetus" : "cell");

// ---------- the player ----------
let where = S.where === "out" && (S.born || powers()) ? "out" : "in";
let house = null;   // the inside of the house you are in
const room = () => (where === "in" ? dpr : where === "house" ? house : null);
const scene = () => (room() ? room().scene : out);
const startPos = where === "in" ? (S.created ? S.posIn : [SPAWN.womb[0], SPAWN.womb[1]]) : S.posOut;
const player = new THREE.Vector3(startPos[0], 0, startPos[1]);
let vy = 0, facing = Math.PI / 2, avatar = null, moving = false, swimH = 1.1;
let yaw = SPAWN.womb[2], pitch = 0.35, dist = 7;
const handle = () => "@" + (S.name || t9n("namePh"));
function makeAvatar() {
  if (avatar) avatar.g.parent?.remove(avatar.g);
  const kind = kindNow(), adm = powers(), k = adm ? S.adm.size : 1, body = adm ? S.adm.body : null;
  if (kind === "cell" || kind === "president") {
    avatar = { kind, ...sperm({ name: handle(), look: S.look, president: kind === "president", color: body }) };
    avatar.g.scale.setScalar((kind === "president" ? 0.6 : 0.45 * (1 + Math.min(1, (me()?.likes || 0) / 500) * 0.6)) * k);
  }
  else if (kind === "fetus") { avatar = { kind, ...fetus(handle()) }; avatar.g.scale.setScalar(0.42 * k); }
  else { avatar = { kind, ...grow(baby(handle(), { ...S.look, skin: body }), ageYears()) }; avatar.g.scale.setScalar(0.75 * k); }
  scene().add(avatar.g);
}
function ground(x, z, fromY = 99) {
  if (room()) return room().groundAt(x, z);
  return Math.max(heightAt(x, z), builder.groundAt(x, z, fromY));
}
function placeAt(w, x, z, camYaw, face) {
  where = w; player.set(x, 0, z); player.y = ground(x, z); vy = 0; seated = null;
  if (camYaw !== undefined) { yaw = camYaw; facing = face ?? camYaw + Math.PI; }
  if (avatar) scene().add(avatar.g);
  if (w !== "house" && house) { house.dispose(); house = null; }
  if (w === "out") terrain.update(x, z, 9);
  if (building && w !== "out") toggleBuild();
  dirty = true; hud(); labels();
}
function flash(color = "#fff", then) {
  const f = $("flash"); f.style.background = color; f.style.opacity = 1;
  setTimeout(() => { then && then(); setTimeout(() => (f.style.opacity = 0), 60); }, 380);
}

// ---------- input: keys, drag to look around (360°), pinch/wheel zoom, joystick ----------
const keys = new Set();
const typing = (e) => /INPUT|TEXTAREA/.test(e.target.tagName);
addEventListener("keydown", (e) => {
  if (typing(e)) return;
  keys.add(e.code);
  if (e.code === "Space") { e.preventDefault(); jump(); }
  const ai = { KeyE: 0, Enter: 0, KeyR: 1, KeyF: 2, KeyG: 3 }[e.code];
  if (ai !== undefined && curActs[ai]) curActs[ai][1]();
  if (e.code === "KeyB") toggleBuild();
  if (e.code === "KeyX" && building) setTool(tool === "place" ? "del" : "place");
  if (e.code === "Escape") { $("grow").style.display = "none"; $("admin").style.display = "none"; $("menu").style.display = "none"; }
  if (building && /^Digit\d$/.test(e.code)) { const n = (+e.code.slice(5) + 9) % 10; if (BLOCKS[n]) pick(n); }
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
const canvas = $("gl"), ptrs = new Map(), drag = { id: null, x: 0, y: 0, moved: 0, button: 0 }, ndc = new THREE.Vector2();
let pinch0 = 0, dist0 = 7;
const pinchLen = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerdown", (e) => {
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId);
  if (ptrs.size === 2) { pinch0 = pinchLen(); dist0 = dist; drag.id = null; return; }
  if (drag.id !== null) return;
  Object.assign(drag, { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, button: e.button });
  aimAt(e);
});
canvas.addEventListener("pointermove", (e) => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { const l = pinchLen(); if (pinch0 > 0 && l > 0) dist = clamp(dist0 * pinch0 / l, 3, 18); return; }
  if (drag.id === e.pointerId) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved > 6) { yaw -= dx * (touch ? 0.008 : 0.006); pitch = clamp(pitch + dy * 0.005, -0.25, 1.4); }
  } else if (!touch) aimAt(e);
});
const ptrUp = (e) => {
  ptrs.delete(e.pointerId);
  if (drag.id !== e.pointerId) return;
  if (building && drag.moved <= 6) { aimAt(e); useTool(drag.button === 2 ? "del" : tool); }
  drag.id = null;
};
canvas.addEventListener("pointerup", ptrUp); canvas.addEventListener("pointercancel", ptrUp);
canvas.addEventListener("wheel", (e) => { dist = clamp(dist + e.deltaY * 0.01, 3, 18); }, { passive: true });
const nearGround = () => terrain.groundMeshes().filter((m) => Math.hypot(m.position.x - player.x, m.position.z - player.z) < 50);
function aimAt(e) {
  if (!building) return; ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); builder.aim(ndc, tool === "del", player, nearGround());
  if (pickingHouse() && tool === "place") aimHouse(); else houseGhost.visible = false;
}

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
let toastT = 0, stampT = 0;
function toast(msg, s = 2.8) { const el = $("toast"); el.textContent = msg; el.classList.add("on"); toastT = s; }
function stamp(txt) { const el = $("stamp"); el.textContent = txt; el.classList.add("on"); stampT = 1.3; }
function hint() {
  if (powers()) return "";
  if (where === "in") return S.born ? "hintExit" : LV >= 3 ? "hintEgg" : LV === 2 ? "hintFetus" : "hintCell";
  return !S.hired ? "hintWork" : builder.count() < 3 ? "hintBuild" : "";
}
function hud() {
  $("meName").textContent = handle();
  $("meLv").textContent = powers() ? t9n("admin") + (S.adm.form === "baby" ? ` · ${S.adm.age ?? 16} ${t9n("aYears")}` : "") : t9n("levels")[LV];
  $("meCoins").textContent = S.free || powers() ? "∞" : S.coins;
  $("adminBtn").style.display = isAdmin ? "inline-block" : "none";
  const h = hint(); $("hint").textContent = h ? t9n(h) : "";
  $("hint").style.display = h && !building ? "" : "none";
  $("buildBtn").style.display = where === "out" ? "" : "none";
  if (where === "house") $("hint").textContent = t9n("hintHouse"), $("hint").style.display = "";
  $("jumpBtn").textContent = avatar && avatar.kind !== "baby" ? t9n("swimUp") : t9n("jump");
}
function labels() {
  document.documentElement.lang = getLang();
  $("langBtn").textContent = t9n("lang"); $("buildBtn").textContent = building ? t9n("done") : t9n("build");
  $("editBtn").textContent = t9n("edit"); $("resetBtn").textContent = t9n("reset"); $("growBtn").textContent = t9n("grow");
  $("cSub").textContent = t9n("subtitle"); $("cNameL").textContent = t9n("yourName"); $("cName").placeholder = t9n("namePh");
  $("cLookL").textContent = t9n("look"); $("cFreeL").textContent = t9n("freeMode"); $("cGo").textContent = S.created ? "OK" : t9n("play");
  island.paintTexts(); dpr.paintTexts(); paintData(); buildBar(); creatorUI(); hud(); actsSig = "";
}
$("langBtn").onclick = () => { setLang(getLang() === "id" ? "en" : "id"); labels(); makeAvatar(); };
$("menuBtn").onclick = () => { const m = $("menu"); m.style.display = m.style.display === "flex" ? "none" : "flex"; };
$("editBtn").onclick = () => { $("menu").style.display = "none"; openCreator(); };
$("growBtn").onclick = () => { $("menu").style.display = "none"; openGrow(); };
$("me").onclick = () => openGrow();
$("resetBtn").onclick = () => {
  if (!confirm(t9n("resetAsk"))) return;
  resetting = true; try { localStorage.removeItem(KEY); localStorage.removeItem("citizenesia.save.v1"); } catch {} location.reload();
};
$("jumpBtn").onclick = () => jump();
$("buildBtn").onclick = () => toggleBuild();

// ---------- character creator ----------
function openCreator() { $("creator").style.display = "flex"; creatorUI(); yaw = facing; pitch = 0.25; dist = 4.8; }   // starts facing you; drag to turn, move to walk
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
$("cName").addEventListener("input", (e) => { S.name = e.target.value.replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 30); e.target.value = S.name; refreshLevel(); makeAvatar(); });
$("cFree").addEventListener("change", (e) => { S.free = e.target.checked; hud(); buildBar(); });
$("cGo").onclick = () => { if (!S.name) S.name = t9n("namePh"); S.created = true; $("creator").style.display = "none"; refreshLevel(); makeAvatar(); labels(); save(); SFX.pop(); };

// ---------- grow through comments (Instagram, TikTok, YouTube, or the in-app box once online) ----------
function openGrow() {
  const c = me(), ok = linked(c);
  $("gTitle").textContent = t9n("gTitle"); $("gHow").textContent = t9n("gHow");
  $("gLadder").innerHTML = t9n("gLadder").map((l) => `<li>${l}</li>`).join("");
  $("gYou").textContent = `${t9n("gYou", { name: S.name || t9n("namePh"), lv: t9n("levels")[LV] })} · ${ok ? t9n("gVerified") : t9n("gNotVerified")}`;
  $("gCodeL").textContent = t9n("gCode"); $("gCode").textContent = S.code; $("gText").placeholder = t9n("gPh");
  const L = DATA.links || {};
  [["gIG", "gCopyIG", L.instagram], ["gTT", "gTT", L.tiktok], ["gYT", "gYT", L.youtube]].forEach(([id, k, url]) => {
    const b = $(id); b.textContent = t9n(k) + (url ? "" : " " + t9n("gSoon")); b.disabled = !url;
    b.onclick = () => { if (!url) return; copy(commentText()); toast(t9n("gCopied"), 3); window.open(url, "_blank", "noopener"); };
  });
  $("gSend").textContent = t9n("gSend"); $("gSend").disabled = !DATA.inbox; $("gClose").textContent = t9n("gClose");
  $("gNote").textContent = DATA.inbox ? "" : t9n("gNoInbox");
  $("grow").style.display = "flex";
}
const commentText = () => `${$("gText").value.trim()} ${S.code}`.trim();
function copy(txt) {
  const fallback = () => { const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} ta.remove(); };
  try { navigator.clipboard.writeText(txt).catch(fallback); } catch { fallback(); }
}
$("gSend").onclick = () => {
  if (!DATA.inbox) return;
  fetch(DATA.inbox, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: S.name, code: S.code, text: $("gText").value.trim() }) })
    .then((r) => { if (!r.ok) throw 0; toast(t9n("gSent"), 3); $("gText").value = ""; }).catch(() => toast("…", 1));
};
$("gClose").onclick = () => ($("grow").style.display = "none");
$("grow").onclick = (e) => { if (e.target.id === "grow") $("grow").style.display = "none"; };

// ---------- building (outside only, after birth) ----------
let building = false, tool = "place", pickT = 0;
function toggleBuild() {
  if (!S.created || (where !== "out" && !building)) return;
  building = !building; $("bar").style.display = building ? "flex" : "none";
  if (!building) { builder.hide(); houseGhost.visible = false; }
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
  HOUSE_TYPES.forEach((T) => {
    const b = document.createElement("button"); b.className = "btn yellow tool" + (pickT === T.id && tool === "place" ? " on" : "");
    b.style.cssText = "flex:none;font-size:12px;padding:8px 10px"; b.textContent = `🏠 ${t9n("houseSizes")[T.id]} · ${S.free || powers() ? "∞" : T.price}`;
    b.onclick = () => { pick(T.id); setTool("place"); }; bar.appendChild(b);
  });
  bar.insertAdjacentHTML("beforeend", '<div class="sep"></div>');
  [["place", "btn green"], ["del", "btn red"]].forEach(([k, cls]) => {
    const b = document.createElement("button"); b.className = cls + " tool" + (tool === k ? " on" : ""); b.textContent = t9n(k); b.onclick = () => setTool(k); bar.appendChild(b);
  });
  bar.insertAdjacentHTML("beforeend", `<span class="cost">${S.free ? t9n("free") : t9n("cost")}</span>`);
}
function useTool(kind) {
  if (kind === "del" && sellHouseAt()) return;
  if (kind !== "del" && pickingHouse()) { buyHouse(); return; }
  const c = builder.target; if (!c) { toast(t9n("noBuildHere"), 1.2); return; }
  if (kind === "del") {
    if (c.existing && builder.remove(c.x, c.y, c.z)) { if (!S.free && !powers()) S.coins += 1; dirty = true; SFX.click(); }
  } else {
    const px = Math.floor(player.x), pz = Math.floor(player.z);   // never bury the player
    if (c.x === px && c.z === pz && c.y >= Math.floor(player.y) && c.y < player.y + 1.6) return;
    if (!S.free && !powers() && S.coins < 1) { toast(t9n("broke")); return; }
    if (builder.add(c.x, c.y, c.z, pickT)) { if (!S.free && !powers()) S.coins -= 1; dirty = true; SFX.click(); }
  }
  hud();
}

// ---------- speech bubbles ----------
let bubbleT = 0, bubbleAt = null;
function say(getPos, text, s = 3) { const b = $("bubble"); b.textContent = text; b.style.display = "block"; bubbleT = s; bubbleAt = getPos; }
const overPlayer = () => tmp.copy(player).add(new THREE.Vector3(0, avatar.kind === "baby" ? 2.0 : 1.6, 0));

// ---------- everything you can use ----------
let seated = null, napT = -1, workT = -1, bornT = -1, gateT = 0, wasInGate = false, sayI = 0, presTalkT = 0;
const lineFor = (s) => s.replace("{pop}", (DATA.population || 0).toLocaleString(t9n("locale"))).replace("{decree}", DATA.decree ? DATA.decree.text : t9n("noDecree"));
function vote(yes) {
  S.votes[yes ? "yes" : "no"]++; dirty = true; paintData(); (yes ? SFX.yes : SFX.no)(); toast(t9n("voted"), 2.4);
}
function enterEgg() {
  if (S.born) { toast(t9n("eggBorn")); return; }
  if (LV >= 3) { bornT = 0; dpr.flashEgg(); SFX.born(); return; }
  toast(t9n(LV === 2 ? "eggFetus" : "eggCell"), 3.4); SFX.no();
}
function work() {
  if (!S.hired) { toast(t9n("reject"), 2.2); SFX.no(); setTimeout(() => { toast(t9n("hired")); SFX.yes(); S.hired = true; dirty = true; hud(); }, 2300); return; }
  if (workT < 0) { workT = 0; $("prog").style.display = "block"; $("progT").textContent = t9n("working"); }
}
const SP = dpr.spots;
const IN_SPOTS = [
  { ...SP.reception, acts: () => [["aCard", () => { const c = me(); toast(linked(c) ? t9n("card", { no: String(c.no || 0).padStart(4, "0"), name: c.name, lv: t9n("levels")[LV], role: c.role ? " · " + c.role : "" }) : t9n("cardNone", { code: S.code }), 4); SFX.pop(); }]] },
  { ...SP.aspiration, acts: () => [["aGrow", openGrow]] },
  { ...SP.podium, acts: () => [["aSpeech", () => { say(overPlayer, t9n("speech", { decree: DATA.decree ? DATA.decree.text : t9n("noDecree") }), 4); SFX.mic(); }]] },
  { ...SP.gavel, acts: () => [["aGavel", () => { dpr.swingGavel(); SFX.gavel(); setTimeout(() => stamp(t9n("sah")), 300); }]] },
  { ...SP.president, acts: () => [["aTalk", () => { say(() => tmp.copy(dpr.president.g.position).add(new THREE.Vector3(0, 1.6, 0)), lineFor(t9n("presidentSays")[sayI++ % 4]), 3.4); presTalkT = 3.4; }]] },
  { ...SP.lights, acts: () => [["aLights", () => { dpr.setLights(!dpr.lightsOn); SFX.click(); toast(t9n(dpr.lightsOn ? "lightsOn" : "lightsOff"), 2.4); }]] },
  { ...SP.egg, acts: () => [["aEgg", enterEgg]] },
  { ...SP.snack, acts: () => [["aEat", () => { SFX.eat(); toast(t9n("snack")); }]] },
  { ...SP.water, acts: () => [["aDrink", () => { SFX.pop(); toast(t9n("drink")); }]] },
  { ...SP.tv, acts: () => [["aTv", () => toast(t9n("tvNow"))]] },
  { ...SP.vending, acts: () => [["aVend", () => { const fr = S.free || powers(); if (!fr && S.coins < 1) { toast(t9n("broke")); return; } if (!fr) S.coins--; dirty = true; SFX.coin(); toast(t9n("vend")); hud(); }]] },
  { ...SP.nap, acts: () => [["aNap", () => { napT = 0; toast(t9n("nap"), 2.5); }]] },
  { ...SP.census, acts: () => [["aCensus", () => toast((DATA.citizens || []).slice(0, 8).map((c) => "@" + c.name + " (" + t9n("levels")[c.level] + ")").join(" · ") || "—", 5)]] },
  ...dpr.seats.map((s) => ({ x: s.cx, z: s.cz, r: 0.85, acts: () => [["aSit", () => { seated = s; player.x = s.cx; player.z = s.cz; facing = s.facing; toast(t9n("sitDown"), 1.6); }]] })),
];
const OUT_SPOTS = [
  { x: island.officeDesk.x, z: island.officeDesk.z, r: 3, acts: () => [["aWork", work]] },
  { x: island.FLAG.x, z: island.FLAG.z + 0.8, r: 2.4, acts: () => [["aFlag", () => toast(t9n("flagInfo"), 4.5)]] },
  { x: -3.6, z: -2.4, r: 2.2, acts: () => [["aRead", () => toast(`${t9n("population")}: ${(DATA.population || 0).toLocaleString(t9n("locale"))}`)]] },
  { x: 3.6, z: -2.4, r: 2.2, acts: () => [["aRead", () => toast(DATA.decree ? `“${DATA.decree.text}” · @${DATA.decree.author}` : t9n("noDecree"), 4)]] },
];
const SEATED_ACTS = () => seated.house ? [...(seated.eat ? [["hEat", () => { SFX.eat(); toast(t9n("eatMsg")); }]] : []), ...(seated.tv ? HOUSE_ACTS.tv() : []), ["aStand", () => (seated = null)]] : [["aMic", () => { say(overPlayer, t9n("interupsi"), 2); SFX.mic(); }], ["aYes", () => vote(true)], ["aNo", () => vote(false)], ["aStand", () => (seated = null)]];
let curActs = [], actsSig = "";
function findActs() {
  if (seated) return SEATED_ACTS();
  if (napT >= 0 || workT >= 0 || bornT >= 0) return [];
  let best = null, bd = 1;
  if (where === "house") {
    for (const sp of house.spots) { const d = Math.hypot(player.x - sp.x, player.z - sp.z) / sp.r; if (d < bd) { bd = d; best = sp; } }
    if (!best) return [];
    if (best.k === "seat") { const st = best.seat; return [["aSit", () => { seated = { ...st, house: true }; player.x = st.cx; player.z = st.cz; facing = st.facing; }]]; }
    return HOUSE_ACTS[best.k]();
  }
  const list = where === "in" ? IN_SPOTS : OUT_SPOTS;
  for (const s of list) { const d = Math.hypot(player.x - s.x, player.z - s.z) / s.r; if (d < bd) { bd = d; best = s; } }
  if (where === "out") for (const w of island.walkers) {   // born citizens say what they do
    const d = Math.hypot(player.x - w.x, player.z - w.z) / 2; if (d < bd) { bd = d; best = { acts: () => [["aTalk", () => say(() => tmp.copy(w.b.g.position).add(new THREE.Vector3(0, 2, 0)), `@${w.c.name}: ${w.c.life || w.c.role || "…"}`, 3)]] }; }
  }
  return best ? best.acts() : [];
}
function renderActs(list) {
  const sig = list.map((a) => a[0]).join("|"); if (sig === actsSig) return; actsSig = sig; curActs = list;
  const box = $("acts"); box.innerHTML = "";
  list.forEach(([k, fn], i) => {
    const b = document.createElement("button"); b.className = "btn yellow";
    b.innerHTML = t9n(k) + (touch ? "" : `<small>${["E", "R", "F", "G"][i]}</small>`);
    b.onclick = () => fn(); box.appendChild(b);
  });
}
function jump() {
  if (building || !avatar) return;
  if (seated) { seated = null; return; }
  if (avatar.kind !== "baby") { swimH = Math.min(swimH + 1.6, (where === "in" ? dpr.ceilAt(player.x, player.z) : powers() ? 40 : 8) - 2.2); return; }
  if (player.y <= ground(player.x, player.z, player.y) + 0.01) vy = 8.2;
}

// ---------- houses ----------
let doorCool = 0;
function enterHouse(d) {
  SFX.door(); doorCool = 1;
  const out2 = { x: d.x + Math.sin(d.ry) * 0.9, z: d.z + Math.cos(d.ry) * 0.9 };
  S.posOut = [round(out2.x), round(out2.z)];
  flash("#fff6ea", () => { const h = buildInterior(d, t9n, quality); if (house) house.dispose(); house = h; placeAt("house", h.spawn.x, h.spawn.z, 0); });
}
function leaveHouse() {
  const d = house.door; SFX.door(); doorCool = 1.2; player.z -= 0.4;
  flash("#ffffff", () => placeAt("out", d.x + Math.sin(d.ry) * 1.7, d.z + Math.cos(d.ry) * 1.7, d.ry, d.ry));
}
const HOUSE_ACTS = {
  bed: () => [["hSleep", () => { napT = 0; toast(t9n("sleepMsg"), 2.6); dirty = true; }]],
  fridge: () => [["hFridge", () => { SFX.pop(); toast(t9n("fridgeMsg")); }]],
  stove: () => [["hCook", () => { SFX.eat(); toast(t9n("cookMsg")); }]],
  tv: () => [[house.tvOn ? "hTvOff" : "hTvOn", () => { house.setTv(!house.tvOn); SFX.click(); actsSig = ""; }]],
  light: () => [["hLight", () => { house.setLight(!house.lightOn); SFX.click(); }]],
  pc: () => [["hPc", openGrow]],
  books: () => [["hRead", () => toast(t9n("readMsg"), 3)]],
  exit: () => [],
};
// buying a ready-made house in build mode
let houseTarget = null;
const houseGhost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.35, depthWrite: false }));
houseGhost.visible = false; out.add(houseGhost);
const pickingHouse = () => typeof pickT === "string";
function aimHouse() {
  const c = builder.target; builder.hide(); houseTarget = null; houseGhost.visible = false;
  if (!c) return;
  const T = typeOf(pickT), half = 0.95 * T.size + 0.1, x = c.x + 0.5, z = c.z + 0.5;
  const ry = Math.round(Math.atan2(player.x - x, player.z - z) / (Math.PI / 2)) * (Math.PI / 2);   // the door faces you
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].map(([a, b]) => [x + a * half, z + b * half]);
  const fits = corners.every(([cx, cz]) => heightAt(cx, cz) > SEA + 0.2 && !noBuild(cx, cz) && Math.abs(heightAt(cx, cz) - heightAt(x, z)) < 1.2)
    && !homes.solids().some((b) => b.x0 < x + half && b.x1 > x - half && b.z0 < z + half && b.z1 > z - half)
    && !builder.save().some(([bx, , bz]) => bx + 1 > x - half && bx < x + half && bz + 1 > z - half && bz < z + half)
    && Math.hypot(player.x - x, player.z - z) > half + 0.6;
  houseGhost.visible = true; houseGhost.scale.set(half * 2, 3 * T.size, half * 2); houseGhost.position.set(x, heightAt(x, z) + 1.5 * T.size, z);
  houseGhost.material.color.set(fits ? "#ffffff" : "#ff5f7f");
  if (fits) houseTarget = { x, z, ry, y: heightAt(x, z), type: T.id };
}
const ray = new THREE.Raycaster();
function sellHouseAt() {
  ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(homes.group.children, true)[0];
  const h = hit && hit.object.userData.home; if (!h) return false;
  if (h.owner && h.owner !== S.name && !powers()) { toast(t9n("houseNotYours")); return true; }
  homes.remove(h); const price = typeOf(h.type).price; if (!S.free && !powers()) S.coins += price; dirty = true; SFX.coin(); toast(t9n("houseSold", { n: price })); hud(); return true;
}
function buyHouse() {
  if (!houseTarget) { toast(t9n("houseNoRoom"), 1.4); return; }
  const T = typeOf(houseTarget.type), fr = S.free || powers();
  if (!fr && S.coins < T.price) { toast(t9n("broke")); return; }
  const i = Math.floor(Math.random() * 5);
  homes.add({ ...houseTarget, id: Date.now().toString(36), wall: WALLS[i], roof: ROOFS[(i + 2) % 5], owner: S.name });
  if (!fr) S.coins -= T.price; dirty = true; SFX.coin(); toast(t9n("houseBought", { n: fr ? 0 : T.price }), 2.4); houseGhost.visible = false; houseTarget = null; hud();
}

// ---------- admin panel ----------
const PLACES = {
  womb: () => placeAt("in", SPAWN.womb[0], SPAWN.womb[1], SPAWN.womb[2]), hall: () => placeAt("in", 0, 8, 0), lobby: () => placeAt("in", SPAWN.lobby[0], SPAWN.lobby[1], SPAWN.lobby[2]),
  lounge: () => placeAt("in", -40, 0, Math.PI / 2), plaza: () => placeAt("out", 0, 7, 0), office: () => placeAt("out", OFFICE.x, OFFICE.z + 7, 0),
  foreign: () => { for (let r = 150; r < 900; r += 6) for (let a = 0; a < 6.28; a += 0.4) { const x = Math.cos(a) * r, z = Math.sin(a) * r; if (heightAt(x, z) > 0.5) return placeAt("out", x, z, a); } },
};
function openAdmin() {
  const P = $("adminPanel"), A = S.adm, on = A.on;
  const btn = (label, cls, fn) => { const b = document.createElement("button"); b.className = "btn " + cls; b.textContent = label; b.onclick = () => { fn(); SFX.click(); if ($("admin").style.display === "flex") openAdmin(); }; return b; };
  const row = (...bs) => { const r = document.createElement("div"); r.className = "row"; bs.forEach((b) => r.appendChild(b)); return r; };
  const lab = (txt) => { const l = document.createElement("label"); l.textContent = txt; return l; };
  P.innerHTML = `<h2>${t9n("aTitle")}</h2>`;
  P.appendChild(row(btn(t9n("aModeAdmin"), on ? "green" : "off", () => { A.on = true; changed(t9n("aAdminOn")); }), btn(t9n("aModeUser"), on ? "off" : "", () => { A.on = false; changed(t9n("aUserOn")); })));
  P.insertAdjacentHTML("beforeend", `<p>${on ? t9n("aAdminNote") : t9n("aUserNote")}</p>`);
  if (on) {
    P.appendChild(lab(t9n("aForm")));
    P.appendChild(row(...Object.entries(t9n("aForms")).map(([k, v]) => btn(v, A.form === k ? "yellow" : "off", () => { A.form = k; changed(); }))));
    P.appendChild(lab(`${t9n("aSize")} ×${A.size.toFixed(1)}`));
    const rg = document.createElement("input"); rg.type = "range"; rg.min = 0.5; rg.max = 3; rg.step = 0.1; rg.value = A.size;
    rg.oninput = () => { A.size = +rg.value; P.querySelectorAll("label")[1].textContent = `${t9n("aSize")} ×${A.size.toFixed(1)}`; makeAvatar(); dirty = true; }; P.appendChild(rg);
    if (A.form === "baby") {
      A.age = A.age ?? 16;
      P.appendChild(lab(`${t9n("aAge")}: ${A.age} ${t9n("aYears")}`));
      const ag = document.createElement("input"); ag.type = "range"; ag.min = 0; ag.max = 80; ag.step = 1; ag.value = A.age;
      ag.oninput = () => { A.age = +ag.value; P.querySelectorAll("label")[2].textContent = `${t9n("aAge")}: ${A.age} ${t9n("aYears")}`; makeAvatar(); hud(); dirty = true; }; P.appendChild(ag);
    }
    P.appendChild(lab(t9n("aBody")));
    const sw = document.createElement("div"); sw.className = "row";
    [null, "#fbfaf6", "#f2c39b", "#c98a5c", "#8a5a3a", ...LOOK_COLOURS.slice(0, 6)].forEach((c) => {
      const d = document.createElement("div"); d.className = "c" + (A.body === c ? " on" : ""); d.style.background = c || "linear-gradient(135deg,#fff 45%,#e2d6c0 55%)";
      d.onclick = () => { A.body = c; changed(); openAdmin(); }; sw.appendChild(d);
    });
    P.appendChild(sw);
    P.appendChild(row(btn(t9n("aLook"), "", () => { $("admin").style.display = "none"; openCreator(); })));
  } else {
    P.appendChild(row(...[1, 2, 3, 4, 5, 6].map((n) => btn(t9n("levels")[n], A.sim === n ? "yellow" : "off", () => { A.sim = n; changed(); }))));
    P.appendChild(row(btn(t9n("aFresh"), "red", () => { A.sim = 1; S.born = false; S.hired = false; changed(t9n("aFreshDone")); PLACES.womb(); $("admin").style.display = "none"; })));
  }
  P.appendChild(lab(t9n("aGo")));
  P.appendChild(row(...Object.entries(t9n("aPlaces")).map(([k, v]) => btn(v, "dark", () => { flash("#fff", PLACES[k]); $("admin").style.display = "none"; }))));
  P.appendChild(row(btn(t9n("gClose"), "yellow", () => ($("admin").style.display = "none"))));
  $("admin").style.display = "flex";
}
function changed(msg) {
  dirty = true; refreshLevel(); makeAvatar();
  if (!powers() && where === "out" && !S.born) PLACES.womb();   // a player who isn't born can't be outside
  hud(); if (msg) toast(msg, 2);
}
$("adminBtn").onclick = () => openAdmin();
$("admin").onclick = (e) => { if (e.target.id === "admin") $("admin").style.display = "none"; };

// ---------- the loop ----------
const clock = new THREE.Clock(); let t = 0, saveT = 0, drownT = 0, foreignShown = false;
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), camT = new THREE.Vector3(), tmp = new THREE.Vector3();
const C_SKY = new THREE.Color(SKY), C_DEEP = new THREE.Color("#5fa9cf");
let nearSolids = [];
function blockedXZ(x, z) {
  const r = 0.35, y = player.y;
  const rm = room();
  if (rm) return !rm.walkable(x, z) || rm.solids.some((b) => y < b.h && inBox(b, x, z, r));
  if (island.solids.some((b) => y < b.h && inBox(b, x, z, r)) || nearSolids.some((b) => y < b.h && inBox(b, x, z, r))) return true;
  if (heightAt(x, z) > y + 0.7) return true;   // too steep
  const top = y + 1.3;
  return [[r, 0], [-r, 0], [0, r], [0, -r]].some(([ox, oz]) => builder.blockedAt(x + ox, z + oz, y + 0.05, top));
}
function tryMove(dx, dz) { if (!blockedXZ(player.x + dx, player.z)) player.x += dx; if (!blockedXZ(player.x, player.z + dz)) player.z += dz; }
function camOK(x, y, z) {
  const rm = room();
  if (rm && rm.wallH && y > rm.wallH + 0.3) return true;   // houses have no roof inside: the camera may look in from above the walls
  if (rm) return rm.walkable(x, z, 0.1) && y < rm.ceilAt(x, z) - 0.3 && y > rm.groundAt(x, z) + 0.25 && !rm.solids.some((b) => y < b.h + 0.2 && inBox(b, x, z, 0.2))
    && (rm !== dpr || !dpr.president.g.visible || dpr.president.g.position.distanceTo(tmp.set(x, y, z)) > 2.2);
  return y > heightAt(x, z) + 0.35 && !island.solids.some((b) => y < b.h + 0.3 && inBox(b, x, z, 0.35)) && !builder.has(Math.floor(x), Math.floor(y), Math.floor(z));
}
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;
  const creating = $("creator").style.display === "flex", panel = $("grow").style.display === "flex" || $("admin").style.display === "flex";
  const run = keys.has("ShiftLeft") || keys.has("ShiftRight");
  let mx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) + joy.x;
  let mz = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) + joy.y;
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const want = ml > 0.08 && !panel && bornT < 0 && workT < 0;
  if (want && seated) seated = null;
  if (want && napT >= 0) napT = -1;
  moving = want && !seated;
  if (where === "out") { nearSolids = terrain.solidsNear(player.x, player.z).concat(homes.solids()); terrain.update(player.x, player.z, 2); }
  const underwater = where === "out" && player.y < SEA;
  if (moving) {
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(-fwd.z, 0, fwd.x);
    const base = (avatar.kind === "cell" || avatar.kind === "president" ? 5.2 : avatar.kind === "fetus" ? 3.6 : 4.4) * (powers() ? 1.5 : 1);
    const v = base * (run ? 1.7 : 1) * (underwater ? 0.5 : 1) * dt;
    const dx = (right.x * mx - fwd.x * mz) * v, dz = (right.z * mx - fwd.z * mz) * v;
    tryMove(dx, dz); facing = Math.atan2(dx, dz);
  }
  if (seated) { player.x = seated.cx; player.z = seated.cz; facing = seated.facing; }

  // vertical: cells and fetuses float (UP swims higher, then they sink back), babies fall and jump
  let g = ground(player.x, player.z, player.y);
  if (avatar.kind !== "baby" && where === "out") g = Math.max(g, SEA);   // swimmers float on the sea
  if (avatar.kind !== "baby") { swimH = Math.max(avatar.kind === "fetus" ? 1.4 : 1.1, swimH - dt * 0.5); player.y = lerp(player.y, g + swimH + Math.sin(t * 2) * 0.12, 0.12); }
  else { vy -= 25 * dt; player.y += vy * dt; if (player.y <= g) { player.y = g; vy = 0; } if (g > player.y - 0.01 && g - player.y < 0.65) player.y = g; }

  // avatar pose
  avatar.g.position.copy(player);
  if (avatar.kind === "cell" || avatar.kind === "president") { avatar.g.rotation.set(0, facing - Math.PI / 2, 0); swim(avatar, t, moving ? 1.6 : 0.6); talk(avatar, 0, blinkAt(t, 3)); }
  else if (avatar.kind === "fetus") { avatar.g.rotation.set(0, facing - Math.PI / 2, 0); avatar.f.rotation.z = -0.35 + Math.sin(t * 1.5) * 0.08; }
  else { avatar.g.rotation.set(0, facing, 0); walk(avatar, t, moving && player.y <= g + 0.01, 1); if (seated) { sit(avatar); avatar.g.position.y += 0.1; } }
  if (napT >= 0) { napT += dt; if (napT > 3) { napT = -1; toast(t9n("napWake"), 1.8); SFX.pop(); } }

  // doors between inside and outside
  if (where === "in" && bornT < 0 && Math.hypot(player.x - EXIT.x, player.z - EXIT.z) < 1.6) {
    if (S.born || powers()) { SFX.door(); player.z -= 1; flash("#eaf7ff", () => placeAt("out", island.doorWorld.x, island.doorWorld.z + 2.4, 0, 0)); }
    else { toast(t9n("cellNoExit"), 3); player.z = 49.6; SFX.no(); }
  }
  if (where === "out" && Math.hypot(player.x - island.doorWorld.x, player.z - island.doorWorld.z) < 1.2) {
    SFX.door(); toast(t9n("enter"), 1.4); player.z = island.doorWorld.z + 2; flash("#ffd3dc", () => placeAt("in", SPAWN.lobby[0], SPAWN.lobby[1], SPAWN.lobby[2]));
  }
  // every house has a door: walk in, and back out through the door inside
  doorCool -= dt;
  if (where === "out" && doorCool <= 0 && bornT < 0) {
    for (const d of [...island.doors, ...terrain.doorsNear(player.x, player.z), ...homes.doors()])
      if (Math.hypot(player.x - d.x, player.z - d.z) < 1.05) { enterHouse(d); break; }
  }
  if (where === "house" && player.z > house.spawn.z + 0.75 && Math.abs(player.x) < 0.8) leaveHouse();
  // metal detector
  const inGate = where === "in" && Math.abs(player.x) < 1.1 && Math.abs(player.z - 46.5) < 0.4;
  if (inGate && !wasInGate) { SFX.beep(); gateT = 1; toast(t9n("gateBeep", { n: S.free ? "∞" : S.coins }), 2); }
  wasInGate = inGate; gateT -= dt;

  // being born: the egg flashes, the cell becomes a baby in front of it
  if (bornT >= 0) {
    bornT += dt;
    if (bornT > 0.5 && !S.born) { $("flash").style.background = "#fff"; $("flash").style.opacity = 1; }
    if (bornT > 0.9 && !S.born) { S.born = true; dirty = true; makeAvatar(); player.set(EGG.x - 5.4, 0, EGG.z); facing = -Math.PI / 2; yaw = -Math.PI / 2; $("flash").style.opacity = 0; toast(t9n("born"), 3.4); hud(); }
    if (bornT > 1.4) bornT = -1;
  }
  // drowning: a baby whose head goes under the sea
  if (where === "out" && avatar.kind === "baby" && !powers() && player.y + 1.2 < SEA) {
    drownT += dt; $("water").style.opacity = Math.min(1, drownT * 1.2);
    if (drownT > 0.6 && drownT - dt <= 0.6) { SFX.glug(); toast(t9n("drown"), 2.4); }
    if (drownT > 2.4) { drownT = 0; $("water").style.opacity = 0; placeAt("out", island.doorWorld.x, island.doorWorld.z + 3, 0, 0); toast(t9n("respawn"), 2.4); }
  } else if (drownT > 0) { drownT = Math.max(0, drownT - dt * 2); $("water").style.opacity = Math.min(1, drownT * 1.2); }
  if (where === "out" && !foreignShown && Math.hypot(player.x, player.z) > HOME_R + 80 && heightAt(player.x, player.z) > SEA + 0.4) { foreignShown = true; toast(t9n("foreign"), 3.4); }
  // working
  if (workT >= 0) {
    workT += dt; $("progI").style.width = `${Math.min(100, workT / 4 * 100)}%`;
    if (workT >= 4) { workT = -1; $("prog").style.display = "none"; S.coins += 10; dirty = true; SFX.coin(); toast(t9n("paid", { n: 10 }), 1.8); hud(); }
  }
  // what can you use here?
  renderActs(creating || panel || building ? [] : findActs());

  // the places move
  dpr.president.g.visible = !(powers() && S.adm.form === "president");   // the admin is the president
  if (where === "house") house.update(camera.position);
  if (where === "in") dpr.update(t, dt, { player, cam: camera.position, presidentTalking: presTalkT > 0, gateBeep: gateT > 0 });
  else { island.update(t, { player, doorOpen: Math.hypot(player.x - island.doorWorld.x, player.z - island.doorWorld.z) < 6 ? 1 : 0 }); sun.position.set(player.x + 8, 20, player.z + 10); sun.target.position.copy(player); }
  presTalkT -= dt;

  // camera: third person, 360° around the player, pulled in when a wall, a block or the ceiling is in the way
  const d = (avatar.kind === "baby" ? dist : dist * 0.85) * (where === "house" ? 1.35 : 1);
  camT.set(player.x, player.y + (avatar.kind === "baby" ? (seated ? 1.0 : 1.2) + (avatar.lift || 0) * avatar.g.scale.y * 1.3 : 0.7), player.z);
  const inHouse = where === "house" && !creating, cy = yaw, cp = inHouse ? Math.max(pitch, 0.9) : pitch;
  let k = d;
  for (; k > 1.2; k -= 0.25) if (camOK(camT.x + Math.sin(cy) * Math.cos(cp) * k, camT.y + Math.sin(cp) * k, camT.z + Math.cos(cy) * Math.cos(cp) * k)) break;
  camera.position.set(camT.x + Math.sin(cy) * Math.cos(cp) * k, camT.y + Math.sin(cp) * k, camT.z + Math.cos(cy) * Math.cos(cp) * k);
  camera.lookAt(camT);
  const lift = creating && innerWidth <= 700;   // on a phone the creator sheet covers the bottom: show the character higher up
  if (lift !== camera.userData.lift) { camera.userData.lift = lift; if (lift) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.3, innerWidth, innerHeight); else camera.clearViewOffset(); }
  if (where === "out") { const uw = camera.position.y < SEA; out.background.copy(uw ? C_DEEP : C_SKY); out.fog.color.copy(out.background); out.fog.far = uw ? 22 : touch ? 85 : 120; }

  // bubbles, toasts, autosave
  if (bubbleT > 0) {
    bubbleT -= dt; bubbleAt().project(camera);
    const b = $("bubble"); b.style.left = `${(tmp.x + 1) / 2 * innerWidth}px`; b.style.top = `${(1 - tmp.y) / 2 * innerHeight}px`;
    if (bubbleT <= 0) b.style.display = "none";
  }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $("toast").classList.remove("on"); }
  if (stampT > 0) { stampT -= dt; if (stampT <= 0) $("stamp").classList.remove("on"); }
  saveT += dt; if (saveT > 3 && S.created) { saveT = 0; if (dirty || moving) save(); }
  renderer.render(scene(), camera);
  requestAnimationFrame(frame);
}

// ---------- start ----------
makeAvatar(); placeAt(where, player.x, player.z, where === "in" ? SPAWN.womb[2] : Math.PI); labels();
if (!S.created) openCreator();
addEventListener("pagehide", () => S.created && save());
document.fonts.ready.then(() => labels());
requestAnimationFrame(frame);
if (DEBUG) window.__cz = { player, S, builder, dpr, island, terrain, heightAt, placeAt, refreshLevel, toggleBuild, get LV() { return LV; }, get where() { return where; },
  get acts() { return curActs.map((a) => a[0]); }, openAdmin, homes, get house() { return house; }, enterHouse, toggleBuild, pick, setTool, aimHouse, buyHouse, get houseTarget() { return houseTarget; }, ndc, get isAdmin() { return isAdmin; }, PLACES, act: (i = 0) => curActs[i] && curActs[i][1](), get DATA() { return DATA; }, get avatar() { return avatar; } };
