// Self-check : `node src/lib/docx/imageSize.test.ts`.
import assert from "node:assert/strict";
import { imageSize } from "./imageSize.ts";

// PNG 3×2 : signature + IHDR avec largeur/hauteur aux offsets 16/20.
const png = Buffer.alloc(24);
png[0] = 0x89;
png[1] = 0x50;
png.writeUInt32BE(3, 16);
png.writeUInt32BE(2, 20);
assert.deepEqual(imageSize(png), { type: "png", w: 3, h: 2 });

// JPEG minimal : SOI + SOF0 (hauteur=2, largeur=3).
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x02, 0x00, 0x03]);
assert.deepEqual(imageSize(jpg), { type: "jpg", w: 3, h: 2 });

// Illisible → défaut 4:3 (pas de crash).
assert.deepEqual(imageSize(Buffer.from([0xff, 0xd8])), { type: "jpg", w: 4, h: 3 });

console.log("imageSize.ts OK");
