// Genera icon-192.png e icon-512.png sin dependencias externas
// Usa un encoder PNG puro con zlib (built-in de Node)
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── PNG encoder ──────────────────────────────────────────────
function encodePNG(width, height, pixels) {
  // pixels: Uint8Array de largo width*height*4 (RGBA)
  const crc32 = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return (buf) => {
      let c = 0xffffffff;
      for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
      return (c ^ 0xffffffff) >>> 0;
    };
  })();

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([typeBuf, data]);
    const crc  = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGB (sin alpha en IDAT)

  // Construir raw rows con filter byte 0
  // Usamos RGB (3 bytes por pixel) para simplificar
  const rowSize = width * 3;
  const raw = Buffer.alloc((rowSize + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (rowSize + 1)] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      const ri = y * (rowSize + 1) + 1 + x * 3;
      raw[ri]   = pixels[pi];
      raw[ri+1] = pixels[pi+1];
      raw[ri+2] = pixels[pi+2];
    }
  }

  // Actualizar IHDR para RGB (color type 2)
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Rasterizador simple ──────────────────────────────────────
function hexRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

class Canvas {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.buf = new Uint8Array(w * h * 4);
    // fondo transparente
    for (let i = 3; i < this.buf.length; i += 4) this.buf[i] = 255;
  }

  setPixel(x, y, r, g, b) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.buf[i] = r; this.buf[i+1] = g; this.buf[i+2] = b; this.buf[i+3] = 255;
  }

  fillRect(x, y, w, h, col) {
    const [r,g,b] = col;
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        this.setPixel(x+dx, y+dy, r, g, b);
  }

  fillRoundRect(x, y, w, h, rx, col) {
    const [r,g,b] = col;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const px = x+dx, py = y+dy;
        // Check corners
        let inCorner = false;
        const corners = [[x+rx, y+rx],[x+w-rx,y+rx],[x+rx,y+h-rx],[x+w-rx,y+h-rx]];
        const nearCorner = (
          (px < x+rx && py < y+rx) ||
          (px > x+w-rx && py < y+rx) ||
          (px < x+rx && py > y+h-rx) ||
          (px > x+w-rx && py > y+h-rx)
        );
        if (nearCorner) {
          // find closest corner
          let cx, cy;
          if (px < x+rx && py < y+rx) { cx=x+rx; cy=y+rx; }
          else if (px > x+w-rx && py < y+rx) { cx=x+w-rx; cy=y+rx; }
          else if (px < x+rx && py > y+h-rx) { cx=x+rx; cy=y+h-rx; }
          else { cx=x+w-rx; cy=y+h-rx; }
          const dist = Math.sqrt((px-cx)**2 + (py-cy)**2);
          if (dist > rx) continue;
        }
        this.setPixel(px, py, r, g, b);
      }
    }
  }

  fillEllipse(cx, cy, rx, ry, col) {
    const [r,g,b] = col;
    const x0 = Math.floor(cx-rx), x1 = Math.ceil(cx+rx);
    const y0 = Math.floor(cy-ry), y1 = Math.ceil(cy+ry);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (((x-cx)/rx)**2 + ((y-cy)/ry)**2 <= 1)
          this.setPixel(x, y, r, g, b);
  }

  fillPolygon(pts, col) {
    const [r,g,b] = col;
    const xs = pts.map(p=>p[0]), ys = pts.map(p=>p[1]);
    const minY = Math.floor(Math.min(...ys)), maxY = Math.ceil(Math.max(...ys));
    for (let y = minY; y <= maxY; y++) {
      const xIntersects = [];
      for (let i = 0, j = pts.length-1; i < pts.length; j=i++) {
        const [xi,yi] = pts[i], [xj,yj] = pts[j];
        if ((yi>y) !== (yj>y))
          xIntersects.push(xi + (y-yi)/(yj-yi)*(xj-xi));
      }
      xIntersects.sort((a,b)=>a-b);
      for (let k = 0; k+1 < xIntersects.length; k+=2)
        for (let x = Math.ceil(xIntersects[k]); x <= Math.floor(xIntersects[k+1]); x++)
          this.setPixel(x, y, r, g, b);
    }
  }

  toPNG() { return encodePNG(this.w, this.h, this.buf); }
}

// ── Dibujar el ícono ─────────────────────────────────────────
function drawIcon(size) {
  const c = new Canvas(size, size);
  const s = size / 512;
  const sc = v => v * s;

  const BG    = hexRGB('#af9e78');
  const WHITE = hexRGB('#ffffff');
  const LINE  = hexRGB('#e8d6ae');
  const WIN   = hexRGB('#fbe8c0');
  const DARK  = hexRGB('#3a2e1e');
  const MID   = hexRGB('#c2b18a');

  // Fondo redondeado
  c.fillRoundRect(0, 0, size, size, sc(96), BG);

  // Trailer
  c.fillRoundRect(sc(58), sc(178), sc(232), sc(152), sc(16), WHITE);

  // Líneas trailer
  c.fillRect(sc(58), sc(218), sc(232), sc(6), LINE);
  c.fillRect(sc(58), sc(258), sc(232), sc(6), LINE);
  c.fillRect(sc(58), sc(298), sc(232), sc(6), LINE);

  // Cab
  c.fillPolygon([[sc(290),sc(222)],[sc(290),sc(330)],[sc(424),sc(330)],[sc(424),sc(268)],[sc(386),sc(222)]], WHITE);

  // Ventana
  c.fillPolygon([[sc(300),sc(232)],[sc(300),sc(284)],[sc(378),sc(284)],[sc(378),sc(258)],[sc(358),sc(232)]], WIN);

  // Chasis
  c.fillRect(sc(58), sc(326), sc(366), sc(14), LINE);

  // Parrilla
  c.fillRect(sc(408), sc(290), sc(16), sc(40), LINE);

  // Rueda izquierda
  c.fillEllipse(sc(128), sc(354), sc(42), sc(42), DARK);
  c.fillEllipse(sc(128), sc(354), sc(22), sc(22), MID);
  c.fillEllipse(sc(128), sc(354), sc(8),  sc(8),  DARK);

  // Rueda derecha
  c.fillEllipse(sc(370), sc(354), sc(42), sc(42), DARK);
  c.fillEllipse(sc(370), sc(354), sc(22), sc(22), MID);
  c.fillEllipse(sc(370), sc(354), sc(8),  sc(8),  DARK);

  return c.toPNG();
}

const dir = path.dirname(__filename);
fs.writeFileSync(path.join(dir, 'icon-512.png'), drawIcon(512));
fs.writeFileSync(path.join(dir, 'icon-192.png'), drawIcon(192));
console.log('icon-192.png y icon-512.png generados OK');
