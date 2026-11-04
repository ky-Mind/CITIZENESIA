// Tiny sound effects made on the fly (no audio files to download).
let ctx = null;
const ac = () => { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } } if (ctx.state === "suspended") ctx.resume(); return ctx; };
function tone(f0, f1, dur, type = "sine", vol = 0.18, delay = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
export const SFX = {
  click: () => tone(880, 660, 0.08, "square", 0.08),
  yes: () => { tone(660, 660, 0.09, "square", 0.08); tone(990, 990, 0.12, "square", 0.08, 0.09); },
  no: () => { tone(330, 220, 0.18, "square", 0.08); },
  beep: () => { tone(1500, 1500, 0.12, "square", 0.06); tone(1500, 1500, 0.12, "square", 0.06, 0.18); },
  gavel: () => { tone(180, 60, 0.18, "triangle", 0.35); tone(180, 60, 0.18, "triangle", 0.35, 0.28); },
  pop: () => tone(300, 900, 0.12, "sine", 0.15),
  coin: () => { tone(988, 988, 0.08, "square", 0.07); tone(1319, 1319, 0.2, "square", 0.07, 0.08); },
  glug: () => { for (let i = 0; i < 4; i++) tone(260 - i * 30, 120, 0.15, "sine", 0.2, i * 0.16); },
  born: () => { tone(300, 1200, 0.6, "sine", 0.18); tone(600, 2400, 0.6, "triangle", 0.06, 0.1); },
  door: () => tone(200, 140, 0.25, "triangle", 0.15),
  mic: () => { tone(2400, 2600, 0.25, "sawtooth", 0.03); },
  eat: () => { for (let i = 0; i < 3; i++) tone(500 + i * 80, 200, 0.07, "square", 0.05, i * 0.12); },
};
