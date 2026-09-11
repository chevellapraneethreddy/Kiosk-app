import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export async function processAndOptimizeImage(
  inputPath: string,
  outputPath: string,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<void> {
  const maxWidth = options.maxWidth || 1920;
  const maxHeight = options.maxHeight || 1920;
  const quality = options.quality || 85;

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await sharp(inputPath)
    .rotate() // auto-rotate based on EXIF orientation
    .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality, progressive: true })
    .toFile(outputPath);
}

export async function generateStyledMockImage(
  userImagePath: string,
  outputPath: string,
  styleName: string
): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create a stunning stylized composite mock image
  // Applies color tinting, vignetting, and watermark branding
  try {
    const userImgBuffer = await sharp(userImagePath)
      .resize(1080, 1440, { fit: 'cover' })
      .toBuffer();

    // Generate a luxury overlay effect based on style
    let tintColor = { r: 255, g: 105, b: 180, alpha: 0.15 }; // default pink
    if (styleName.toLowerCase().includes('red')) {
      tintColor = { r: 220, g: 20, b: 60, alpha: 0.2 };
    } else if (styleName.toLowerCase().includes('blue')) {
      tintColor = { r: 30, g: 144, b: 255, alpha: 0.2 };
    } else if (styleName.toLowerCase().includes('green')) {
      tintColor = { r: 46, g: 139, b: 87, alpha: 0.2 };
    } else if (styleName.toLowerCase().includes('gold') || styleName.toLowerCase().includes('sherwani')) {
      tintColor = { r: 255, g: 215, b: 0, alpha: 0.2 };
    }

    const overlaySvg = Buffer.from(`
      <svg width="1080" height="1440" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(0,0,0,0.4)" />
            <stop offset="50%" stop-color="rgba(${tintColor.r},${tintColor.g},${tintColor.b},${tintColor.alpha})" />
            <stop offset="100%" stop-color="rgba(10,10,20,0.85)" />
          </linearGradient>
        </defs>
        <rect width="1080" height="1440" fill="url(#grad)" />
        <text x="540" y="1360" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#F3E5AB" text-anchor="middle" letter-spacing="4">
          ✨ ROYAL AI STANDEE • ${styleName.toUpperCase()} ✨
        </text>
      </svg>
    `);

    await sharp(userImgBuffer)
      .composite([{ input: overlaySvg, top: 0, left: 0 }])
      .jpeg({ quality: 90 })
      .toFile(outputPath);
  } catch (err) {
    // Fallback if composite fails
    fs.copyFileSync(userImagePath, outputPath);
  }
}
