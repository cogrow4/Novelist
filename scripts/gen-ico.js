#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const SRC = path.resolve('icon/1024-mac.png');
const OUT_ICO = path.resolve('build/icon.ico');

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function generateIco() {
  if (!fs.existsSync(SRC)) {
    console.error(`Source icon not found: ${SRC}`);
    process.exit(1);
  }

  const buildDir = path.dirname(OUT_ICO);
  await ensureDir(buildDir);

  // Generate multiple PNG sizes for embedding in the ICO
  const sizes = [16, 32, 48, 64, 128, 256];
  const icoBuildDir = path.resolve('build/ico-temp');
  await ensureDir(icoBuildDir);
  
  const pngPaths = [];
  
  for (const size of sizes) {
    const dest = path.join(icoBuildDir, `icon_${size}x${size}.png`);
    await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(dest);
    pngPaths.push(dest);
    console.log(`Created ${size}x${size} icon`);
  }

  // Convert all PNG sizes to a single multi-resolution ICO file
  console.log('\nGenerating multi-resolution .ico file...');
  const icoBuffer = await pngToIco(pngPaths);
  await fs.promises.writeFile(OUT_ICO, icoBuffer);
  
  console.log(`\n✓ Created ${OUT_ICO}`);
  console.log(`Icon contains ${sizes.length} resolutions: ${sizes.join('x, ')}x`);
  
  // Clean up temporary files
  await fs.promises.rm(icoBuildDir, { recursive: true, force: true });
  console.log('Cleaned up temporary files');
}

generateIco().catch((e) => {
  console.error(e);
  process.exit(1);
});
