import fs from "node:fs";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname);
const team = JSON.parse(fs.readFileSync(path.join(root, "src/team.json"), "utf8"));
const layout = fs.readFileSync(path.join(root, "src/layout.html"), "utf8");
const dist = path.join(root, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, "assets"), { recursive: true });
for (const f of fs.readdirSync(path.join(root, "assets"))) fs.copyFileSync(path.join(root, "assets", f), path.join(dist, "assets", f));

// ---- charts (static SVG, grown bottom-up by CSS when revealed) ----
const ramp = () => {
  const x0 = 34, x1 = 290, yb = 170, yt = 20, max = 20;
  const y = v => yb - (v / max) * (yb - yt);
  const data = [["Year 1", 2], ["Year 2", 8], ["Year 3", 20]];
  let s = `<svg viewBox="0 0 300 200" role="img" aria-label="Cumulative contract value: US$2M in year 1, 8M in year 2, 20M in year 3">`;
  for (const t of [0, 10, 20]) s += `<line class="axis" x1="${x0}" x2="${x1}" y1="${y(t)}" y2="${y(t)}"/><text x="${x0 - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`;
  data.forEach(([l, v], i) => {
    const w = 52, cx = x0 + 44 + i * 84, hot = i === 2 ? " hot" : "";
    s += `<rect class="bar${hot}" x="${cx - w / 2}" y="${y(v)}" width="${w}" height="${yb - y(v)}" rx="2" style="--d:${i * 150}ms"/><text class="lbl" x="${cx}" y="${y(v) - 7}" text-anchor="middle">${v}</text><text x="${cx}" y="${yb + 18}" text-anchor="middle">${l}</text>`;
  });
  return s + `</svg>`;
};
const err = () => {
  const xs = [4, 8, 12, 16, 20], base = [6.0, 4.2, 3.2, 2.6, 2.3], tl = [3.2, 2.4, 2.0, 1.8, 1.7];
  const x0 = 34, x1 = 290, yb = 170, yt = 20, ymax = 6;
  const X = v => x0 + 14 + ((v - 4) / 16) * (x1 - x0 - 28), Y = v => yb - (v / ymax) * (yb - yt);
  const pts = a => a.map((v, i) => `${X(xs[i]).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  let s = `<svg viewBox="0 0 300 210" role="img" aria-label="Position error against anchor count: Traceline stays below the dense-anchor baseline and near the 2.5 m target">`;
  for (const t of [0, 2, 4, 6]) s += `<line class="axis" x1="${x0}" x2="${x1}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${x0 - 8}" y="${Y(t) + 4}" text-anchor="end">${t}</text>`;
  s += `<line class="tgt" x1="${x0}" x2="${x1}" y1="${Y(2.5)}" y2="${Y(2.5)}"/><text x="${x1}" y="${Y(2.5) - 6}" text-anchor="end" style="fill:var(--ok)">target 2.5 m</text>`;
  xs.forEach(v => s += `<text x="${X(v)}" y="${yb + 18}" text-anchor="middle">${v}</text>`);
  s += `<text x="${(x0 + x1) / 2}" y="${yb + 36}" text-anchor="middle">Anchors installed</text>`;
  s += `<polyline class="ln l-base" points="${pts(base)}"/><polyline class="ln l-tl" style="--len:700" points="${pts(tl)}"/>`;
  tl.forEach((v, i) => s += `<circle cx="${X(xs[i])}" cy="${Y(v)}" r="3.4" fill="var(--signal)"/>`);
  return s + `</svg>`;
};
const risk = () => {
  const x0 = 40, y0 = 10, cw = 80, ch = 66;
  let s = `<svg viewBox="0 0 300 260" role="img" aria-label="Risk map of likelihood against impact">`;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const heat = (r === 0 ? 3 : r === 1 ? 2 : 1) + c; // top-right is worst
    const a = [0.04, 0.08, 0.14, 0.22, 0.32][heat - 1];
    s += `<rect x="${x0 + c * cw}" y="${y0 + r * ch}" width="${cw - 3}" height="${ch - 3}" rx="3" fill="rgba(255,90,71,${a})"/>`;
  }
  [["1", 2.55, 2.45], ["2", 1.6, 1.6], ["3", 1.45, 2.5]].forEach(([n, imp, lik]) => {
    const cx = x0 + (imp - 0.5) / 3 * (cw * 3 - 3) , cy = y0 + (1 - (lik - 0.5) / 3) * (ch * 3 - 3);
    s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="13" fill="var(--signal)"/><text x="${cx.toFixed(1)}" y="${(cy + 4.5).toFixed(1)}" text-anchor="middle" style="fill:#000;font-weight:700;font-size:13px">${n}</text>`;
  });
  s += `<text x="${x0 + cw * 1.5 - 1}" y="${y0 + ch * 3 + 22}" text-anchor="middle">Impact</text>`;
  s += `<text transform="translate(12 ${y0 + ch * 1.5}) rotate(-90)" text-anchor="middle">Likelihood</text>`;
  ["Low", "Medium", "High"].forEach((t, i) => s += `<text x="${x0 + i * cw + cw / 2}" y="${y0 + ch * 3 + 6}" text-anchor="middle">${t}</text>`);
  return s + `</svg>`;
};
const charts = { ramp, err, risk };


// ---- pixel wordmark (dot-matrix "traceline", grey to blue, fading toward the bottom) ----
const G = {
  t: ["..#..","..#..",".###.","..#..","..#..","..#.#","...#."],
  r: [".....",".....","#.##.","##..#","#....","#....","#...."],
  a: [".....",".....",".###.","....#",".####","#...#",".####"],
  c: [".....",".....",".###.","#....","#....","#...#",".###."],
  e: [".....",".....",".###.","#...#","#####","#....",".####"],
  l: [".##..","..#..","..#..","..#..","..#..","..#..",".###."],
  i: ["..#..",".....",".##..","..#..","..#..","..#..",".###."],
  n: [".....",".....","#.##.","##..#","#...#","#...#","#...#"]
};
const wordmark = () => {
  const word = "traceline", U = 10, P = 8.4, cols = word.length * 6 - 1;
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const grey = [172, 172, 184], blue = [108, 196, 240], rowA = [0.95, 0.95, 0.92, 0.85, 0.72, 0.52, 0.34];
  let s = `<svg viewBox="0 0 ${cols * U} ${7 * U}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">`;
  [...word].forEach((ch, li) => G[ch].forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== "#") return;
    const col = li * 6 + x, t = col / cols, k = Math.min(1, Math.max(0, (t - 0.4) / 0.22)), sm = k * k * (3 - 2 * k);
    const [r, g, b] = mix(grey, blue, sm);
    s += `<rect x="${col * U}" y="${y * U}" width="${P}" height="${P}" rx="1" fill="rgb(${r},${g},${b})" opacity="${rowA[y]}"/>`;
  })));
  return s + `</svg>`;
};

// ---- team footer ----
const members = team.members.map(m => `          <li><b>${m.name}</b>: ${m.role}</li>`).join("\n");

for (const f of fs.readdirSync(path.join(root, "src/pages"))) {
  let page = fs.readFileSync(path.join(root, "src/pages", f), "utf8");
  const title = (page.match(/<!--title:\s*(.*?)-->/) || [])[1] || "Traceline";
  const scripts = (page.match(/<!--scripts:\s*(.*?)-->/s) || [])[1] || "";
  page = page.replace(/<!--(title|scripts):[\s\S]*?-->\n?/g, "");
  page = page.replace(/\{\{chart:(\w+)\}\}/g, (_, n) => charts[n]());
  const out = layout
    .replace("{{title}}", title.trim())
    .replace("{{content}}", () => page)
    .replace("{{scripts}}", () => scripts.trim())
    .replace("{{members}}", () => members)
    .replace("{{wordmark}}", () => wordmark())
    .replace(/\{\{teamName\}\}/g, team.teamName)
    .replace("{{blurb}}", team.blurb)
    .replace("{{institute}}", team.institute)
    .replace("{{stage}}", team.stage);
  fs.writeFileSync(path.join(dist, f), out);
}
fs.writeFileSync(path.join(dist, "_redirects"), "/business /business.html 200\n/pricing /pricing.html 200\n/security /security.html 200\n/console /console.html 200\n");
console.log("built", fs.readdirSync(dist));
