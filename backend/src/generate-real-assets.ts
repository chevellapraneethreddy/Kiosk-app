import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

async function generateRealJpegs() {
  const assetsDir = path.resolve(__dirname, '../../frontend/public/assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const items = [
    { name: 'sample-pink-saree.jpg', color: { r: 255, g: 105, b: 180 }, text: 'PINK SILK SAREE' },
    { name: 'sample-red-saree.jpg', color: { r: 220, g: 20, b: 60 }, text: 'RED BRIDAL SAREE' },
    { name: 'sample-blue-saree.jpg', color: { r: 30, g: 144, b: 255 }, text: 'ROYAL BLUE SAREE' },
    { name: 'sample-green-saree.jpg', color: { r: 46, g: 139, b: 87 }, text: 'EMERALD GREEN SAREE' },
    { name: 'sample-traditional-saree.jpg', color: { r: 255, g: 215, b: 0 }, text: 'TEMPLE SAREE' },
    { name: 'sample-wedding-saree.jpg', color: { r: 255, g: 160, b: 122 }, text: 'WEDDING SAREE' },
    { name: 'sample-sherwani.jpg', color: { r: 245, g: 245, b: 220 }, text: 'GOLD SHERWANI' },
    { name: 'sample-tuxedo.jpg', color: { r: 30, g: 30, b: 40 }, text: 'BLACK TUXEDO' },
    { name: 'sample-indowestern.jpg', color: { r: 128, g: 0, b: 32 }, text: 'INDO WESTERN' },
    { name: 'sample-portrait.jpg', color: { r: 75, g: 0, b: 130 }, text: 'ROYAL PORTRAIT' },
  ];

  for (const item of items) {
    const svgOverlay = Buffer.from(`
      <svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="800" fill="rgb(${item.color.r},${item.color.g},${item.color.b})" />
        <circle cx="300" cy="400" r="200" fill="rgba(255,255,255,0.2)" />
        <text x="300" y="420" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#FFFFFF" text-anchor="middle">
          ${item.text}
        </text>
      </svg>
    `);

    const destPath = path.join(assetsDir, item.name);
    await sharp(svgOverlay)
      .jpeg({ quality: 90 })
      .toFile(destPath);

    console.log(`Generated genuine JPEG file: ${item.name}`);
  }
}

generateRealJpegs().catch(console.error);
