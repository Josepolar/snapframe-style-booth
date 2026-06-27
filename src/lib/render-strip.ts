import type { FilterId, LayoutId, Session } from "./photobooth";
import { FILTERS, formatStamp } from "./photobooth";

type RenderOpts = {
  shots: string[];
  layout: LayoutId;
  filter: FilterId;
  frameColor: string;
  frameText: string;
  caption?: string;
  stamp: number;
  scale?: number; // pixel multiplier
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getFilterCss(id: FilterId) {
  return FILTERS.find((f) => f.id === id)?.css ?? "none";
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / img.height;
  const tr = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > tr) {
    sw = img.height * tr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / tr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export async function renderStrip(opts: RenderOpts): Promise<string> {
  const { layout, frameColor, frameText, caption, stamp } = opts;
  const filter = getFilterCss(opts.filter);
  const scale = opts.scale ?? 2;

  let width = 0;
  let height = 0;

  const PAD = 32 * scale;
  const GAP = 14 * scale;
  const FOOTER = 110 * scale;

  let cells: { x: number; y: number; w: number; h: number }[] = [];

  if (layout === "strip4") {
    const cellW = 360 * scale;
    const cellH = 270 * scale;
    width = cellW + PAD * 2;
    height = PAD + cellH * 4 + GAP * 3 + FOOTER;
    for (let i = 0; i < 4; i++) {
      cells.push({ x: PAD, y: PAD + i * (cellH + GAP), w: cellW, h: cellH });
    }
  } else if (layout === "grid2x2") {
    const cell = 320 * scale;
    width = cell * 2 + PAD * 2 + GAP;
    height = cell * 2 + PAD + GAP + FOOTER;
    for (let i = 0; i < 4; i++) {
      const c = i % 2;
      const r = Math.floor(i / 2);
      cells.push({ x: PAD + c * (cell + GAP), y: PAD + r * (cell + GAP), w: cell, h: cell });
    }
  } else if (layout === "polaroid") {
    const w = 520 * scale;
    const h = 520 * scale;
    width = w + PAD * 2;
    height = PAD + h + FOOTER + 30 * scale;
    cells.push({ x: PAD, y: PAD, w, h });
  } else if (layout === "couple") {
    const w = 320 * scale;
    const h = 420 * scale;
    width = w * 2 + PAD * 2 + GAP;
    height = PAD + h + FOOTER;
    cells.push({ x: PAD, y: PAD, w, h });
    cells.push({ x: PAD + w + GAP, y: PAD, w, h });
  } else {
    // collage: 6 shots, 2 cols x 3 rows
    const w = 280 * scale;
    const h = 220 * scale;
    width = w * 2 + PAD * 2 + GAP;
    height = h * 3 + GAP * 2 + PAD + FOOTER;
    for (let i = 0; i < 6; i++) {
      const c = i % 2;
      const r = Math.floor(i / 2);
      cells.push({ x: PAD + c * (w + GAP), y: PAD + r * (h + GAP), w, h });
    }
  }

  // Caption space
  const captionPad = caption ? 70 * scale : 0;
  height += captionPad;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available");

  // Background (frame)
  ctx.fillStyle = frameColor;
  ctx.fillRect(0, 0, width, height);

  // Subtle inner stroke
  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // Photos
  const imgs = await Promise.all(opts.shots.map(loadImage));
  cells.forEach((cell, i) => {
    const img = imgs[i % imgs.length];
    if (!img) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cell.x, cell.y, cell.w, cell.h);
    ctx.clip();
    // Fill bg behind photo
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    ctx.filter = filter;
    drawCover(ctx, img, cell.x, cell.y, cell.w, cell.h);
    ctx.filter = "none";
    ctx.restore();
  });

  // Footer
  const footerY = height - FOOTER - captionPad + 24 * scale;
  ctx.fillStyle = frameText;
  ctx.textAlign = "center";
  ctx.font = `italic 600 ${28 * scale}px "Playfair Display", Georgia, serif`;
  ctx.fillText("SnapFrame", width / 2, footerY + 10 * scale);

  ctx.font = `500 ${10 * scale}px "JetBrains Mono", monospace`;
  ctx.fillStyle = frameText + (frameText.length === 7 ? "99" : "");
  ctx.fillText(formatStamp(stamp).toUpperCase(), width / 2, footerY + 36 * scale);

  // Caption
  if (caption) {
    const cy = height - captionPad + 30 * scale;
    ctx.fillStyle = frameText;
    ctx.font = `italic 500 ${16 * scale}px "Playfair Display", Georgia, serif`;
    ctx.textAlign = "center";
    // wrap
    const maxW = width - PAD * 2;
    const words = caption.split(/\s+/);
    let line = "";
    let y = cy;
    const lh = 22 * scale;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, width / 2, y);
        line = word;
        y += lh;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, width / 2, y);
  }

  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function renderSessionStrip(s: Session, scale = 2) {
  const frameText = ["#18181b", "#1c1917", "#0a0a0a"].includes(s.frameColor.toLowerCase())
    ? "#fafaf9"
    : "#1c1917";
  return renderStrip({
    shots: s.shots,
    layout: s.layout,
    filter: s.filter,
    frameColor: s.frameColor,
    frameText,
    caption: s.caption,
    stamp: s.createdAt,
    scale,
  });
}
