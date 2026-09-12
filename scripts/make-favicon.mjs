import fs from 'node:fs';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const src = 'public/tippyme-mark.png';
const meta = await sharp(src).metadata();
console.log('source', meta.width, meta.height);

// Dark mark → white for contrast, then pad on TippyMe purple.
const whiteMark = await sharp(src).negate({ alpha: false }).png().toBuffer();

const buffers = [];
for (const size of [16, 32, 48]) {
  const pad = Math.max(2, Math.round(size * 0.18));
  const inner = size - pad * 2;
  const mark = await sharp(whiteMark)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const buf = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 147, g: 98, b: 255, alpha: 1 }, // #9362ff
    },
  })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toBuffer();

  buffers.push(buf);
  fs.writeFileSync(`public/favicon-${size}.png`, buf);
  console.log(`wrote favicon-${size}.png`, buf.length);
}

const ico = await pngToIco(buffers);
fs.writeFileSync('public/favicon.ico', ico);
console.log('wrote favicon.ico', ico.length);

const applePad = 32;
const appleInner = 180 - applePad * 2;
const appleMark = await sharp(whiteMark)
  .resize(appleInner, appleInner, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 180,
    height: 180,
    channels: 4,
    background: { r: 147, g: 98, b: 255, alpha: 1 },
  },
})
  .composite([{ input: appleMark, gravity: 'centre' }])
  .png()
  .toFile('public/apple-touch-icon.png');
console.log('wrote apple-touch-icon.png');
