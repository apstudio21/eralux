// Стискає JPG/PNG/WebP у теці: максимум 2400 px по довшій стороні, якість ~80.
// Файл перезаписується лише якщо став меншим. Маленькі файли не чіпає.
import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const MAX = 2400, MIN_BYTES = 350 * 1024;
const dir = process.argv[2] || 'images/uploads';

async function walk(d) {
  let out = [];
  for (const e of await readdir(d, { withFileTypes: true }).catch(() => [])) {
    const p = join(d, e.name);
    if (e.isDirectory()) out = out.concat(await walk(p)); else out.push(p);
  }
  return out;
}

for (const file of await walk(dir)) {
  const ext = extname(file).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
  try {
    const before = (await stat(file)).size;
    const img = sharp(file, { failOn: 'none' }).rotate();
    const m = await img.metadata();
    const big = Math.max(m.width || 0, m.height || 0) > MAX;
    if (!big && before < MIN_BYTES) continue;
    let p = img.resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true });
    if (ext === '.png') p = p.png({ compressionLevel: 9, palette: true, quality: 85 });
    else if (ext === '.webp') p = p.webp({ quality: 80 });
    else p = p.jpeg({ quality: 80, mozjpeg: true, progressive: true });
    const buf = await p.toBuffer();
    if (buf.length < before) {
      await writeFile(file, buf);
      console.log(`${file}: ${Math.round(before / 1024)} → ${Math.round(buf.length / 1024)} КБ`);
    }
  } catch (err) {
    console.log(`${file}: пропущено (${err.message})`);
  }
}
