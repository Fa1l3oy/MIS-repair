/**
 * Draws believable "phone photos" of broken equipment for the demo data:
 * a simple SVG scene per kind of fault (before) and the fixed state (after),
 * then a little camera tilt, exposure/white-balance variation, blur and grain.
 * No stock photos are needed, and every picture comes out slightly different.
 */
import sharp from "sharp";

export type Scene =
  | "ac"
  | "light"
  | "socket"
  | "switch"
  | "faucet"
  | "toilet"
  | "drain"
  | "monitor"
  | "wifi"
  | "printer"
  | "projector"
  | "mic"
  | "speaker"
  | "chair"
  | "door"
  | "ceiling"
  | "floor"
  | "sign"
  | "elevator";

export type Stage = "before" | "after";
type Rng = () => number;

const W = 1200;
const H = 900;

const between = (rng: Rng, a: number, b: number) => a + rng() * (b - a);
const pickOne = <T>(rng: Rng, items: readonly T[]) => items[Math.floor(rng() * items.length)];

const WALLS = ["#e9e3d8", "#e4e7e9", "#efe8dc", "#dde5e8", "#ebe2d0", "#e6e1da"];
const DEFS = `
  <linearGradient id="plastic" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe2e6"/></linearGradient>
  <linearGradient id="ivory" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf8f1"/><stop offset="1" stop-color="#e7e0d0"/></linearGradient>
  <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d949b"/><stop offset=".45" stop-color="#f4f6f8"/><stop offset=".6" stop-color="#c3c8ce"/><stop offset="1" stop-color="#7c838a"/></linearGradient>
  <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8bec5"/><stop offset=".5" stop-color="#e3e6e9"/><stop offset="1" stop-color="#a7aeb6"/></linearGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b98a5a"/><stop offset="1" stop-color="#8f6437"/></linearGradient>
  <linearGradient id="door" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9c6b3f"/><stop offset=".5" stop-color="#b07d4d"/><stop offset="1" stop-color="#8e5f35"/></linearGradient>
  <linearGradient id="desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9a77d"/><stop offset="1" stop-color="#a88457"/></linearGradient>
  <radialGradient id="water" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#e8f6ff"/><stop offset=".6" stop-color="#9fd0ea"/><stop offset="1" stop-color="#5f9fc2"/></radialGradient>
  <radialGradient id="burn" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1b1410" stop-opacity=".95"/><stop offset=".45" stop-color="#3a2a1d" stop-opacity=".7"/><stop offset="1" stop-color="#5a4430" stop-opacity="0"/></radialGradient>
  <radialGradient id="stain" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8a6a3c" stop-opacity=".25"/><stop offset=".8" stop-color="#7a5a30" stop-opacity=".45"/><stop offset="1" stop-color="#6b4c26" stop-opacity="0"/></radialGradient>
  <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
  <radialGradient id="vignette" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient>
  <radialGradient id="window" cx=".15" cy=".05" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="blur4"><feGaussianBlur stdDeviation="4"/></filter>`;

const drop = (x: number, y: number, s = 1) =>
  `<path d="M${x} ${y - 16 * s} C ${x + 10 * s} ${y - 2 * s} ${x + 10 * s} ${y + 9 * s} ${x} ${y + 9 * s} C ${x - 10 * s} ${y + 9 * s} ${x - 10 * s} ${y - 2 * s} ${x} ${y - 16 * s} Z" fill="url(#water)" opacity=".9"/>`;

function drops(rng: Rng, n: number, x0: number, x1: number, y0: number, y1: number) {
  return Array.from({ length: n }, () => drop(between(rng, x0, x1), between(rng, y0, y1), between(rng, 0.7, 1.3))).join("");
}

/** Irregular blob path around a centre (stains, puddles). */
function blob(rng: Rng, cx: number, cy: number, rx: number, ry: number) {
  const pts = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const k = between(rng, 0.75, 1.15);
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  const mid = (p: number[], q: number[]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = `M ${mid(pts[13], pts[0]).join(" ")}`;
  for (let i = 0; i < 14; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % 14]);
    d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

function grid(x0: number, y0: number, w: number, h: number, size: number, fill: string, line: string, width = 4) {
  let s = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${fill}"/>`;
  for (let x = x0; x <= x0 + w; x += size) s += `<rect x="${x - width / 2}" y="${y0}" width="${width}" height="${h}" fill="${line}"/>`;
  for (let y = y0; y <= y0 + h; y += size) s += `<rect x="${x0}" y="${y - width / 2}" width="${w}" height="${width}" fill="${line}"/>`;
  return s;
}

const wall = (color: string) => `<rect width="${W}" height="${H}" fill="${color}"/><rect width="${W}" height="${H}" fill="url(#window)"/>`;
const shadow = (x: number, y: number, w: number, h: number, o = 0.25) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="#000" opacity="${o}" filter="url(#soft)"/>`;

const SCENES: Record<Scene, (rng: Rng, stage: Stage) => string> = {
  ac(rng, stage) {
    const led = stage === "before" ? "#f59e0b" : "#22c55e";
    let s = wall(pickOne(rng, WALLS)) + `<rect width="${W}" height="70" fill="#000" opacity=".06"/>`;
    s += `<rect x="905" y="410" width="48" height="490" fill="#f3f4f5" stroke="#d3d6da" stroke-width="3"/>`;
    s += shadow(250, 200, 740, 250);
    s += `<rect x="230" y="170" width="740" height="250" rx="28" fill="url(#plastic)" stroke="#c9cdd2" stroke-width="3"/>`;
    s += `<rect x="252" y="190" width="696" height="150" rx="18" fill="#fff" opacity=".55"/>`;
    s += `<rect x="270" y="352" width="660" height="44" rx="12" fill="#d3d7dc"/>`;
    for (let i = 0; i < 5; i++) s += `<rect x="285" y="${358 + i * 7}" width="630" height="2.5" fill="#b9bec4"/>`;
    s += `<rect x="815" y="298" width="96" height="28" rx="7" fill="#2b2f35"/><circle cx="836" cy="312" r="6" fill="${led}"/>`;
    s += `<rect x="852" y="306" width="48" height="12" rx="3" fill="#475569" opacity=".8"/>`;
    if (stage === "before") {
      s += `<path d="${blob(rng, 560, 560, 260, 150)}" fill="url(#stain)" filter="url(#blur4)"/>`;
      s += `<path d="${blob(rng, 470, 470, 70, 24)}" fill="#5f9fc2" opacity=".35"/>`;
      s += drops(rng, 6, 300, 880, 440, 800);
    }
    return s;
  },

  light(rng, stage) {
    let s = grid(0, 0, W, H, 200, "#eceae5", "#cdc8bf", 7);
    const fixtures = [
      [200, 200],
      [600, 200],
      [400, 600],
    ];
    fixtures.forEach(([x, y], f) => {
      s += `<rect x="${x + 8}" y="${y + 8}" width="184" height="184" fill="#f5f5f3" stroke="#b9b4ab" stroke-width="3"/>`;
      for (let t = 0; t < 3; t++) {
        const lit = stage === "after" || (f === 2 && t !== 1) || (f === 0 && t === 0);
        const tx = x + 30 + t * 52;
        if (lit) s += `<rect x="${tx - 30}" y="${y}" width="96" height="200" fill="url(#glow)" filter="url(#soft)"/>`;
        s += `<rect x="${tx}" y="${y + 22}" width="30" height="156" rx="14" fill="${lit ? "#ffffff" : t === 1 && f === 0 ? "#d7dadd" : "#aeb2b6"}"/>`;
      }
    });
    if (stage === "before") s += `<rect width="${W}" height="${H}" fill="#000" opacity=".16"/>`;
    return s;
  },

  socket(rng, stage) {
    let s = wall(pickOne(rng, WALLS)) + shadow(420, 270, 380, 400, 0.2);
    s += `<rect x="410" y="250" width="380" height="400" rx="30" fill="url(#ivory)" stroke="#d6cfbf" stroke-width="3"/>`;
    for (const cy of [355, 545]) {
      s += `<circle cx="600" cy="${cy}" r="66" fill="#eee7d8" stroke="#cbc2ae" stroke-width="3"/>`;
      s += `<rect x="568" y="${cy - 30}" width="11" height="36" rx="4" fill="#3b3b3b"/><rect x="621" y="${cy - 30}" width="11" height="36" rx="4" fill="#3b3b3b"/>`;
      s += `<circle cx="600" cy="${cy + 30}" r="9" fill="#3b3b3b"/>`;
    }
    s += `<circle cx="438" cy="278" r="6" fill="#bdb4a1"/><circle cx="762" cy="622" r="6" fill="#bdb4a1"/>`;
    if (stage === "before") {
      s += `<circle cx="605" cy="345" r="120" fill="url(#burn)"/>`;
      s += `<path d="M560 250 Q 590 170 640 120 Q 610 200 650 250 Z" fill="#2a1f17" opacity=".35" filter="url(#blur4)"/>`;
      s += `<path d="M575 380 q 20 18 48 4" stroke="#1a120c" stroke-width="6" fill="none" opacity=".8"/>`;
    }
    return s;
  },

  switch(rng, stage) {
    let s = wall(pickOne(rng, WALLS)) + shadow(440, 290, 320, 320, 0.2);
    s += `<rect x="430" y="270" width="340" height="340" rx="26" fill="url(#ivory)" stroke="#d6cfbf" stroke-width="3"/>`;
    for (const x of [470, 605]) {
      s += `<rect x="${x}" y="315" width="125" height="250" rx="14" fill="#f8f5ee" stroke="#cfc6b3" stroke-width="3"/>`;
      s += `<rect x="${x + 12}" y="330" width="101" height="110" rx="10" fill="#fff" opacity=".8"/>`;
    }
    if (stage === "before") {
      s += `<path d="M615 330 L 650 395 L 632 430 L 675 520 L 690 560" stroke="#6b6254" stroke-width="4" fill="none"/>`;
      s += `<path d="M650 395 L 700 380" stroke="#6b6254" stroke-width="3" fill="none"/>`;
      s += `<rect x="605" y="315" width="125" height="250" rx="14" fill="#000" opacity=".06" transform="rotate(4 667 440)"/>`;
    }
    return s;
  },

  faucet(rng, stage) {
    let s = grid(0, 0, W, 580, 150, "#eef3f5", "#cfd8dc", 5);
    s += `<rect y="560" width="${W}" height="${H - 560}" fill="#cfcac1"/><rect y="560" width="${W}" height="14" fill="#b7b1a6"/>`;
    s += `<ellipse cx="600" cy="660" rx="340" ry="120" fill="#fbfbfb" stroke="#d6d6d6" stroke-width="4"/>`;
    s += `<ellipse cx="600" cy="672" rx="285" ry="86" fill="#e9eced"/><ellipse cx="600" cy="700" rx="26" ry="10" fill="url(#chrome)"/>`;
    s += `<rect x="572" y="450" width="56" height="130" rx="10" fill="url(#chrome)"/>`;
    s += `<path d="M600 470 C 640 440 720 440 728 505 L 728 540" stroke="url(#chrome)" stroke-width="30" fill="none" stroke-linecap="round"/>`;
    s += `<rect x="520" y="430" width="160" height="26" rx="12" fill="url(#chrome)"/>`;
    if (stage === "before") {
      s += drops(rng, 3, 718, 738, 575, 660);
      s += `<ellipse cx="640" cy="690" rx="120" ry="30" fill="#8fc3dc" opacity=".35"/>`;
      s += `<path d="${blob(rng, 700, 610, 60, 18)}" fill="#c9c3a8" opacity=".6"/>`;
    }
    return s;
  },

  toilet(rng, stage) {
    let s = grid(0, 0, W, 640, 150, "#f1f4f6", "#d2d9dd", 5) + grid(0, 640, W, H - 640, 180, "#c9cdd0", "#a9afb3", 5);
    s += shadow(430, 280, 340, 450, 0.18);
    s += `<rect x="470" y="250" width="260" height="200" rx="20" fill="url(#plastic)" stroke="#d3d7db" stroke-width="3"/>`;
    s += `<rect x="455" y="238" width="290" height="26" rx="12" fill="#f7f8f9" stroke="#d3d7db" stroke-width="3"/><circle cx="600" cy="251" r="12" fill="url(#chrome)"/>`;
    s += `<path d="M430 470 Q 600 430 770 470 Q 780 560 700 610 L 680 720 L 520 720 L 500 610 Q 420 560 430 470 Z" fill="url(#plastic)" stroke="#cfd3d8" stroke-width="3"/>`;
    s += `<ellipse cx="600" cy="486" rx="150" ry="40" fill="#e9edf0" stroke="#d3d7db" stroke-width="3"/>`;
    if (stage === "before") {
      s += `<path d="${blob(rng, 620, 790, 300, 60)}" fill="#8fbfd6" opacity=".45"/>`;
      s += `<path d="${blob(rng, 700, 780, 90, 16)}" fill="#fff" opacity=".35"/>`;
    }
    return s;
  },

  drain(rng, stage) {
    let s = grid(0, 0, W, H, 200, "#c7cacc", "#9ba1a6", 6);
    if (stage === "before") s += `<path d="${blob(rng, 600, 470, 420, 300)}" fill="#7fa9bd" opacity=".55"/>`;
    s += `<circle cx="600" cy="470" r="96" fill="url(#chrome)" stroke="#6b7278" stroke-width="4"/>`;
    for (let i = -3; i <= 3; i++) s += `<rect x="${592 + i * 20}" y="410" width="10" height="120" rx="4" fill="#4b5157"/>`;
    if (stage === "before") {
      for (let i = 0; i < 16; i++) s += `<circle cx="${between(rng, 350, 850)}" cy="${between(rng, 280, 660)}" r="${between(rng, 3, 9)}" fill="#6e5b43" opacity=".55"/>`;
      s += `<path d="M540 520 q 40 -30 80 10 q 30 30 70 -5" stroke="#3a3027" stroke-width="3" fill="none" opacity=".6"/>`;
    }
    return s;
  },

  monitor(rng, stage) {
    let s = wall(pickOne(rng, WALLS)) + `<rect y="590" width="${W}" height="${H - 590}" fill="url(#desk)"/>`;
    s += shadow(270, 170, 680, 400, 0.22);
    s += `<rect x="572" y="530" width="56" height="70" fill="#2a2d33"/><ellipse cx="600" cy="600" rx="140" ry="18" fill="#23262b"/>`;
    s += `<rect x="260" y="140" width="680" height="400" rx="16" fill="#1b1e23"/>`;
    if (stage === "before") {
      if (rng() < 0.5) {
        s += `<rect x="282" y="162" width="636" height="356" fill="#1f5bb6"/>`;
        s += `<rect x="330" y="215" width="22" height="22" fill="#fff"/><rect x="330" y="265" width="22" height="22" fill="#fff"/>`;
        s += `<path d="M372 222 q 26 30 0 60" stroke="#fff" stroke-width="10" fill="none"/>`;
        for (let i = 0; i < 4; i++) s += `<rect x="330" y="${330 + i * 34}" width="${between(rng, 280, 520)}" height="12" rx="3" fill="#fff" opacity=".85"/>`;
      } else {
        s += `<rect x="282" y="162" width="636" height="356" fill="#050607"/>`;
        s += `<rect x="470" y="310" width="260" height="60" rx="6" fill="none" stroke="#e5e7eb" stroke-width="3"/><rect x="495" y="333" width="210" height="12" rx="3" fill="#e5e7eb" opacity=".8"/>`;
      }
    } else {
      s += `<rect x="282" y="162" width="636" height="356" fill="#4f46e5"/><rect x="282" y="162" width="636" height="356" fill="url(#glow)" opacity=".45"/>`;
      s += `<rect x="330" y="200" width="300" height="190" rx="8" fill="#f8fafc"/><rect x="330" y="200" width="300" height="26" rx="8" fill="#cbd5e1"/>`;
      s += `<rect x="282" y="488" width="636" height="30" fill="#0f172a" opacity=".85"/>`;
    }
    s += `<rect x="370" y="650" width="460" height="120" rx="14" fill="#e5e7eb" stroke="#cfd4da" stroke-width="3"/>`;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) s += `<rect x="${386 + c * 36}" y="${664 + r * 26}" width="30" height="20" rx="4" fill="#f8fafc"/>`;
    s += `<ellipse cx="900" cy="720" rx="36" ry="52" fill="#e5e7eb" stroke="#cfd4da" stroke-width="3"/>`;
    return s;
  },

  wifi(rng, stage) {
    let s = grid(0, 0, W, H, 200, "#ebe9e4", "#cfcac1", 7);
    s += `<rect x="590" y="0" width="22" height="320" fill="#f3f4f5" stroke="#d5d8db" stroke-width="2"/>`;
    s += `<circle cx="600" cy="470" r="165" fill="#000" opacity=".18" filter="url(#soft)"/>`;
    s += `<circle cx="600" cy="460" r="160" fill="url(#plastic)" stroke="#d2d5d9" stroke-width="4"/><circle cx="600" cy="460" r="118" fill="none" stroke="#e4e6e9" stroke-width="6"/>`;
    const led = stage === "before" ? "#ef4444" : "#3b82f6";
    s += `<circle cx="600" cy="460" r="46" fill="${led}" opacity=".35" filter="url(#blur4)"/><circle cx="600" cy="460" r="14" fill="${led}"/>`;
    return s;
  },

  printer(rng, stage) {
    let s = wall(pickOne(rng, WALLS)) + `<rect y="600" width="${W}" height="${H - 600}" fill="url(#desk)"/>`;
    s += shadow(330, 320, 560, 300, 0.25);
    s += `<rect x="320" y="330" width="560" height="290" rx="20" fill="#d8dbde" stroke="#bfc4c9" stroke-width="3"/>`;
    s += `<rect x="340" y="300" width="520" height="56" rx="14" fill="#c7cbd0"/><rect x="380" y="372" width="440" height="22" rx="6" fill="#1f2328"/>`;
    s += `<rect x="740" y="420" width="110" height="60" rx="8" fill="#3b4148"/><circle cx="765" cy="450" r="8" fill="${stage === "before" ? "#f97316" : "#22c55e"}"/>`;
    s += `<rect x="360" y="560" width="480" height="40" rx="8" fill="#c1c6cb"/>`;
    if (stage === "before") {
      s += `<path d="M430 380 L 520 250 L 590 300 L 660 210 L 740 290 L 780 380 Z" fill="#fbfbfb" stroke="#d6d6d6" stroke-width="3"/>`;
      s += `<path d="M520 250 L 560 340 M 660 210 L 640 330 M 590 300 L 610 360" stroke="#c9c9c9" stroke-width="3"/>`;
      s += `<rect x="150" y="660" width="240" height="190" fill="#fbfbfb" transform="rotate(-8 270 755)"/>`;
      for (let i = 0; i < 5; i++) s += `<rect x="${170 + i * 44}" y="665" width="7" height="180" fill="#6b7280" opacity=".55" transform="rotate(-8 270 755)"/>`;
    } else {
      for (let i = 0; i < 4; i++) s += `<rect x="${430 + i * 3}" y="${282 - i * 5}" width="340" height="16" fill="#fbfbfb" stroke="#e1e1e1"/>`;
    }
    return s;
  },

  projector(rng, stage) {
    let s = wall(pickOne(rng, WALLS)) + `<rect y="720" width="${W}" height="${H - 720}" fill="#6b7280" opacity=".35"/>`;
    s += `<rect x="190" y="90" width="820" height="30" rx="8" fill="#2f3338"/>`;
    s += `<rect x="210" y="120" width="780" height="500" fill="#f7f7f5" stroke="#3a3e44" stroke-width="6"/>`;
    if (stage === "before") {
      s += `<rect x="260" y="160" width="680" height="420" fill="${rng() < 0.5 ? "#1e3a8a" : "#3b3413"}" opacity=".88"/>`;
      s += `<rect x="480" y="340" width="240" height="60" rx="6" fill="none" stroke="#e5e7eb" stroke-width="3"/><rect x="505" y="363" width="190" height="12" rx="3" fill="#e5e7eb" opacity=".8"/>`;
    } else {
      s += `<rect x="260" y="160" width="680" height="420" fill="#ffffff"/><rect x="260" y="160" width="680" height="70" fill="#4f46e5"/>`;
      s += `<rect x="290" y="186" width="300" height="18" rx="4" fill="#fff" opacity=".9"/>`;
      for (let i = 0; i < 4; i++) s += `<rect x="300" y="${270 + i * 48}" width="${between(rng, 180, 300)}" height="16" rx="4" fill="#94a3b8"/>`;
      [140, 220, 180, 260].forEach((h, i) => (s += `<rect x="${660 + i * 62}" y="${540 - h}" width="40" height="${h}" rx="4" fill="${["#4f46e5", "#22c55e", "#f59e0b", "#06b6d4"][i]}"/>`));
    }
    s += `<rect x="200" y="740" width="800" height="18" rx="6" fill="#9ca3af"/>`;
    return s;
  },

  mic(rng, stage) {
    let s = `<rect width="${W}" height="${H}" fill="url(#desk)"/><rect width="${W}" height="${H}" fill="url(#window)"/>`;
    s += `<rect x="760" y="140" width="330" height="120" rx="14" fill="#1f2328"/><rect x="800" y="60" width="10" height="90" fill="#111"/><rect x="1040" y="60" width="10" height="90" fill="#111"/>`;
    s += `<rect x="790" y="180" width="160" height="16" rx="4" fill="#22c55e" opacity=".75"/>`;
    s += `<g transform="rotate(-24 560 520)">`;
    s += `<rect x="330" y="470" width="470" height="92" rx="46" fill="#000" opacity=".25" filter="url(#soft)"/>`;
    s += `<rect x="360" y="460" width="420" height="84" rx="42" fill="#2d3138"/><rect x="740" y="470" width="30" height="64" rx="12" fill="#3f444c"/>`;
    s += `<circle cx="340" cy="502" r="78" fill="#4b5058"/>`;
    for (let i = -3; i <= 3; i++) s += `<rect x="${340 + i * 18 - 1}" y="432" width="2" height="140" fill="#2d3138"/><rect x="270" y="${502 + i * 18 - 1}" width="140" height="2" fill="#2d3138"/>`;
    s += `<circle cx="700" cy="502" r="9" fill="${stage === "before" ? "#ef4444" : "#22c55e"}"/></g>`;
    return s;
  },

  speaker(rng, stage) {
    let s = wall(pickOne(rng, WALLS)) + shadow(430, 200, 360, 520, 0.25);
    s += `<rect x="420" y="180" width="360" height="520" rx="18" fill="#24272c"/>`;
    s += `<circle cx="600" cy="320" r="48" fill="#15171a" stroke="#3a3e44" stroke-width="5"/>`;
    s += `<circle cx="600" cy="530" r="125" fill="#15171a" stroke="#3a3e44" stroke-width="6"/><circle cx="600" cy="530" r="40" fill="#2a2e34"/>`;
    if (stage === "before") s += `<path d="M560 460 L 610 520 L 590 560 L 640 610" stroke="#6b7280" stroke-width="4" fill="none"/><path d="M610 520 L 660 505" stroke="#6b7280" stroke-width="3"/>`;
    return s;
  },

  chair(rng, stage) {
    let s = wall(pickOne(rng, WALLS)) + `<rect y="520" width="${W}" height="${H - 520}" fill="#b9b3a8"/>` + grid(0, 520, W, H - 520, 190, "#bdb7ac", "#a39c90", 3);
    const color = pickOne(rng, ["#2563eb", "#ea580c", "#0f766e", "#475569"]);
    const tilt = stage === "before" ? 9 : 0;
    s += `<ellipse cx="600" cy="790" rx="230" ry="26" fill="#000" opacity=".2" filter="url(#blur4)"/>`;
    s += `<g transform="rotate(${tilt} 600 790)">`;
    s += `<rect x="470" y="290" width="250" height="190" rx="24" fill="${color}"/><rect x="480" y="300" width="230" height="40" rx="16" fill="#fff" opacity=".12"/>`;
    s += `<rect x="455" y="500" width="300" height="46" rx="16" fill="${color}"/>`;
    s += `<rect x="650" y="430" width="250" height="26" rx="10" fill="#e7e5e4" stroke="#c7c3bd" stroke-width="3"/><rect x="720" y="455" width="14" height="70" fill="#9ca3af"/>`;
    const legs = stage === "before" ? `<rect x="700" y="546" width="14" height="170" fill="#9ca3af" transform="rotate(28 707 546)"/>` : `<rect x="700" y="546" width="14" height="240" fill="#9ca3af"/>`;
    s += `<rect x="490" y="546" width="14" height="240" fill="#9ca3af"/><rect x="560" y="546" width="14" height="230" fill="#8b929b"/>${legs}`;
    s += `</g>`;
    if (stage === "before") s += `<circle cx="820" cy="800" r="9" fill="#6b7280"/><rect x="760" y="780" width="60" height="12" rx="5" fill="#9ca3af" transform="rotate(-20 790 786)"/>`;
    return s;
  },

  door(rng, stage) {
    let s = wall(pickOne(rng, WALLS)) + `<rect y="860" width="${W}" height="40" fill="#8f8a80"/>`;
    s += `<rect x="360" y="40" width="480" height="830" fill="#d6d0c4"/><rect x="385" y="60" width="430" height="810" fill="url(#door)"/>`;
    s += `<rect x="420" y="110" width="360" height="300" rx="6" fill="none" stroke="#7a522c" stroke-width="5" opacity=".6"/><rect x="420" y="470" width="360" height="330" rx="6" fill="none" stroke="#7a522c" stroke-width="5" opacity=".6"/>`;
    const angle = stage === "before" ? 38 : 0;
    s += `<rect x="712" y="420" width="34" height="150" rx="8" fill="url(#chrome)" ${stage === "before" ? 'transform="translate(6 10) rotate(4 729 495)"' : ""}/>`;
    s += `<rect x="620" y="470" width="115" height="24" rx="11" fill="url(#chrome)" transform="rotate(${angle} 729 482)"/>`;
    if (stage === "before") {
      s += `<circle cx="729" cy="432" r="5" fill="#4b5563"/><circle cx="729" cy="560" r="5" fill="#4b5563"/>`;
      s += `<path d="M700 600 l 40 20 M 690 630 l 60 14" stroke="#e7d3b8" stroke-width="3" opacity=".7"/>`;
    }
    return s;
  },

  ceiling(rng, stage) {
    let s = grid(0, 0, W, H, 220, "#edebe6", "#cbc6bd", 7);
    if (stage === "before") {
      const cx = between(rng, 480, 720);
      const cy = between(rng, 330, 520);
      s += `<path d="${blob(rng, cx, cy, 250, 190)}" fill="url(#stain)"/>`;
      s += `<path d="${blob(rng, cx + 20, cy + 10, 150, 110)}" fill="none" stroke="#7b5c33" stroke-width="5" opacity=".35"/>`;
      s += `<path d="${blob(rng, cx - 10, cy, 80, 60)}" fill="#6b4c26" opacity=".25"/>`;
      s += `<rect x="440" y="440" width="220" height="220" fill="#000" opacity=".08"/>`;
      s += drops(rng, 3, cx - 60, cx + 60, cy + 120, cy + 320);
    } else {
      s += `<rect x="444" y="444" width="212" height="212" fill="#f6f5f1"/>`;
    }
    return s;
  },

  floor(rng, stage) {
    const base = pickOne(rng, ["#d8d2c6", "#cfd3d6", "#d9cdb8"]);
    let s = grid(0, 0, W, H, 230, base, "#aca395", 5);
    if (stage === "before") {
      s += `<rect x="462" y="232" width="230" height="230" fill="#000" opacity=".07"/>`;
      s += `<path d="M470 250 L 540 320 L 520 380 L 600 430 L 690 455 M 540 320 L 620 290 L 690 240 M 520 380 L 480 450" stroke="#4b4337" stroke-width="5" fill="none"/>`;
      s += `<path d="M600 430 l 22 -8 l -6 24 z M 640 300 l 18 6 l -12 14 z" fill="#8a8173"/>`;
      s += `<rect x="462" y="455" width="230" height="10" fill="#000" opacity=".25" filter="url(#blur4)"/>`;
    } else {
      s += `<rect x="463" y="233" width="228" height="228" fill="${base}" stroke="#9f9687" stroke-width="3"/><rect x="463" y="233" width="228" height="228" fill="#fff" opacity=".12"/>`;
    }
    return s;
  },

  sign(rng, stage) {
    let s = wall(pickOne(rng, WALLS)) + `<rect width="${W}" height="80" fill="#000" opacity=".07"/>`;
    const rot = stage === "before" ? 17 : 0;
    s += `<g transform="rotate(${rot} 330 300)">`;
    s += `<rect x="330" y="300" width="560" height="180" rx="14" fill="#000" opacity=".2" filter="url(#soft)"/>`;
    s += `<rect x="320" y="290" width="560" height="180" rx="14" fill="#0f766e"/><rect x="336" y="306" width="528" height="148" rx="10" fill="none" stroke="#fff" stroke-width="4" opacity=".8"/>`;
    s += `<path d="M380 380 L 450 330 L 450 360 L 520 360 L 520 400 L 450 400 L 450 430 Z" fill="#fff"/>`;
    s += `<rect x="560" y="345" width="260" height="22" rx="5" fill="#fff"/><rect x="560" y="390" width="190" height="18" rx="5" fill="#fff" opacity=".8"/>`;
    s += `<circle cx="345" cy="315" r="7" fill="#d1d5db"/>${stage === "after" ? `<circle cx="855" cy="315" r="7" fill="#d1d5db"/>` : ""}</g>`;
    if (stage === "before") s += `<circle cx="875" cy="305" r="6" fill="#6b7280"/>`;
    return s;
  },

  elevator(rng, stage) {
    let s = `<rect width="${W}" height="${H}" fill="#d9d4ca"/><rect width="${W}" height="${H}" fill="url(#window)"/><rect y="860" width="${W}" height="40" fill="#8f8a80"/>`;
    s += `<rect x="340" y="140" width="520" height="730" fill="#8e959d"/>`;
    s += `<rect x="520" y="70" width="160" height="52" rx="8" fill="#111418"/><path d="M570 106 L 585 84 L 600 106 Z" fill="${stage === "before" ? "#4b5563" : "#ef4444"}"/><rect x="612" y="84" width="16" height="24" rx="3" fill="${stage === "before" ? "#4b5563" : "#ef4444"}"/>`;
    const gap = stage === "before" ? 46 : 4;
    s += `<rect x="365" y="160" width="${235 - gap / 2}" height="700" fill="url(#steel)"/><rect x="${600 + gap / 2}" y="${stage === "before" ? 168 : 160}" width="${235 - gap / 2}" height="700" fill="url(#steel)"/>`;
    if (stage === "before") {
      s += `<rect x="${600 - gap / 2}" y="160" width="${gap}" height="700" fill="#1f2328"/>`;
      s += `<g transform="rotate(-8 600 480)"><rect x="300" y="450" width="600" height="46" fill="#facc15"/>`;
      for (let i = 0; i < 12; i++) s += `<path d="M${300 + i * 50} 450 l 25 0 l -25 46 l -25 0 z" fill="#111"/>`;
      s += `</g>`;
    }
    s += `<rect x="880" y="420" width="60" height="120" rx="8" fill="url(#steel)"/><circle cx="910" cy="455" r="12" fill="#e5e7eb"/><circle cx="910" cy="505" r="12" fill="#e5e7eb"/>`;
    return s;
  },
};

let noiseCache: Promise<Buffer> | null = null;
function noise() {
  noiseCache ??= sharp({
    create: { width: W, height: H, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 24 } },
  })
    .png()
    .toBuffer();
  return noiseCache;
}

/** One JPEG "photo" (1200×900) of the scene. */
export async function renderPhoto(scene: Scene, stage: Stage, rng: Rng) {
  const angle = between(rng, -2.5, 2.5);
  const dx = between(rng, -40, 40);
  const dy = between(rng, -30, 30);
  const tint = pickOne(rng, ["#fff4e0", "#e8f0ff", "#ffffff", "#fff9ef"]);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${DEFS}</defs>
<rect width="${W}" height="${H}" fill="#cfcac2"/>
<g transform="rotate(${angle.toFixed(2)} 600 450) translate(${dx.toFixed(1)} ${dy.toFixed(1)}) translate(600 450) scale(1.08) translate(-600 -450)">${SCENES[scene](rng, stage)}</g>
<rect width="${W}" height="${H}" fill="${tint}" opacity=".12"/>
<rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;
  return sharp(Buffer.from(svg))
    .modulate({ brightness: between(rng, 0.9, 1.08), saturation: between(rng, 0.85, 1.1) })
    .blur(0.7)
    .composite([{ input: await noise(), blend: "soft-light" }])
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
}
