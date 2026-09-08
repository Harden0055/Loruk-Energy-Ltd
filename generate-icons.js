import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generate() {
  const iconPath = path.join(__dirname, 'public', 'icon.svg');
  const maskableIconPath = path.join(__dirname, 'public', 'icon-maskable.svg');
  const publicDir = path.join(__dirname, 'public');

  try {
    console.log('Generating pwa-192x192.png...');
    await sharp(iconPath)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'pwa-192x192.png'));

    console.log('Generating pwa-512x512.png...');
    await sharp(iconPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'pwa-512x512.png'));

    console.log('Generating apple-touch-icon.png...');
    await sharp(iconPath)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));

    console.log('Generating pwa-maskable-512x512.png...');
    await sharp(maskableIconPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

    console.log('Icons generated successfully!');
  } catch (e) {
    console.error('Error generating icons:', e);
  }
}

generate();
