// Détecte type + dimensions d'une image (JPEG/PNG), pour dimensionner ImageRun sans
// dépendance. HEIC est déjà converti en JPEG à l'upload côté client.

export type ImageInfo = { type: "jpg" | "png"; w: number; h: number };

export function imageSize(buf: Buffer): ImageInfo {
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    return { type: "png", w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // JPEG : parcourt les segments jusqu'à un marqueur SOF (C0-CF sauf C4/C8/CC).
  let o = 2;
  while (o + 8 < buf.length) {
    if (buf[o] !== 0xff) {
      o++;
      continue;
    }
    const m = buf[o + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { type: "jpg", h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7) };
    }
    o += 2 + buf.readUInt16BE(o + 2);
  }
  return { type: "jpg", w: 4, h: 3 }; // défaut 4:3 si illisible
}
