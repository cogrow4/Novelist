#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import sharp from 'sharp';

const SRC = path.resolve('icon/1024-mac.png');
const ICONSET_DIR = path.resolve('build/app.iconset');
const OUT_ICNS = path.resolve('build/icon.icns');

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function makePng(size, dest) {
  await sharp(SRC)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(dest);
}

async function run() {
  if (!fs.existsSync(SRC)) {
    console.error(`Source icon not found: ${SRC}`);
    process.exit(1);
  }
  await ensureDir(ICONSET_DIR);

  const tasks = [
    [16, 'icon_16x16.png'],
    [32, 'icon_16x16@2x.png'],
    [32, 'icon_32x32.png'],
    [64, 'icon_32x32@2x.png'],
    [128, 'icon_128x128.png'],
    [256, 'icon_128x128@2x.png'],
    [256, 'icon_256x256.png'],
    [512, 'icon_256x256@2x.png'],
    [512, 'icon_512x512.png'],
    [1024, 'icon_512x512@2x.png']
  ];

  for (const [size, name] of tasks) {
    const dest = path.join(ICONSET_DIR, name);
    await makePng(size, dest);
    console.log(`Wrote ${dest}`);
  }

  // Create .icns using macOS iconutil
  try {
    execSync(`iconutil -c icns ${ICONSET_DIR} -o ${OUT_ICNS}`, { stdio: 'inherit' });
    console.log(`Created ${OUT_ICNS}`);
  } catch (e) {
    console.error('Failed to create .icns with iconutil. Ensure this is run on macOS with Xcode tools installed.');
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
