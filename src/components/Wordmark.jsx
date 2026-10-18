import React, { useMemo } from "react";
import { motion } from "framer-motion";

const GLYPHS = {
  t: ["..#..", "..#..", ".###.", "..#..", "..#..", "..#.#", "...#."],
  r: [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".####"],
  c: [".....", ".....", ".###.", "#....", "#....", "#...#", ".###."],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".####"],
  l: [".##..", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  i: ["..#..", ".....", ".##..", "..#..", "..#..", "..#..", ".###."],
  n: [".....", ".....", "#.##.", "##..#", "#...#", "#...#", "#...#"]
};

export default function Wordmark() {
  const word = "traceline";
  const U = 10;
  const P = 8.4;
  const cols = word.length * 6 - 1;

  const dots = useMemo(() => {
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const grey = [172, 172, 184];
    const blue = [108, 196, 240];
    const coral = [255, 90, 71];
    const rowA = [0.95, 0.95, 0.92, 0.85, 0.72, 0.52, 0.34];

    const list = [];
    [...word].forEach((ch, li) => {
      const glyph = GLYPHS[ch] || [];
      glyph.forEach((row, y) => {
        [...row].forEach((c, x) => {
          if (c !== "#") return;
          const col = li * 6 + x;
          const t = col / cols;
          const k = Math.min(1, Math.max(0, (t - 0.4) / 0.22));
          const sm = k * k * (3 - 2 * k);
          const [r, g, b] = mix(grey, blue, sm);
          list.push({
            id: `${col}-${y}`,
            x: col * U,
            y: y * U,
            color: `rgb(${r},${g},${b})`,
            opacity: rowA[y] || 0.5,
            delay: (col * 0.015) + (y * 0.02)
          });
        });
      });
    });
    return list;
  }, [cols]);

  return (
    <div className="wordmark-container" aria-label="traceline dot matrix wordmark">
      <svg
        viewBox={`0 0 ${cols * U} ${7 * U}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        style={{ width: "100%", maxWidth: "780px", overflow: "visible" }}
      >
        {dots.map((d) => (
          <motion.rect
            key={d.id}
            x={d.x}
            y={d.y}
            width={P}
            height={P}
            rx={1.5}
            fill={d.color}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: d.opacity, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: d.delay, ease: "easeOut" }}
            whileHover={{ scale: 1.4, fill: "var(--signal, #7FB2D6)", opacity: 1 }}
          />
        ))}
      </svg>
    </div>
  );
}
