import { OpenAI, toFile } from 'openai';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { config } from '../config';
import { logger } from '../utils/logger';
import { storageService } from './storageService';
import { garmentExtractionService, ExtractedGarmentResult } from './ai/GarmentExtractionService';

export interface OpenAITryOnInput {
  generationId: string;
  userImagePath: string;
  garmentImagePath?: string;
  gender?: string;
  category?: string;
  description?: string;
  prompt?: string;
  onProgress?: (progress: number, message: string) => void;
}

export interface OpenAITryOnOutput {
  jobId: string;
  status: 'COMPLETED' | 'FAILED';
  resultUrl?: string;
  errorMessage?: string;
}

/**
 * Builds the dynamic prompt tailored for OpenAI Image Editing (gpt-image-2)
 * Strictly adheres to user priority:
 * 1. Selected gender/category
 * 2. Physical garment shown by the customer
 * 3. Exact garment appearance
 * 4. Same person/identity
 * 5. Correct body placement
 */
export function buildOpenAITryOnPrompt(category: string, description?: string, customPrompt?: string, gender?: string): string {
  if (customPrompt) return customPrompt;

  const catLower = (category || 'garment').toLowerCase();
  const selectedGender = (gender || (catLower.includes('saree') || catLower.includes('dress') ? 'WOMEN' : 'MEN')).toUpperCase();

  // Clean description of redundant holding/folding words so it describes the worn garment cleanly
  const cleanDescText = (description || '').trim()
    .replace(/neatly folded|folded|held up to camera|held up to display|held up|in hands|holding it|holding/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const desc = cleanDescText ? ` (${cleanDescText})` : '';

  let garmentSpecificInstruction = '';
  let framingInstruction = '';
  let strictNegativeRule = '';

  if (catLower.includes('saree') || catLower.includes('sari')) {
    // WOMEN + SAREE
    garmentSpecificInstruction = `SELECTED CATEGORY: WOMEN + SAREE
The reference garment is a traditional Indian saree${desc} with a matching blouse.
The woman in the photograph must appear naturally wearing this SAME saree shown to the camera:
1. PRESERVE SAREE DETAILS: Preserve the exact saree color, gold/zari border, pattern, silk/cotton fabric, and design shown in the reference.
2. NATURAL SAREE DRAPING:
   - MATCHING BLOUSE: Fitted tailored blouse in the exact same color and fabric as the saree, with neat modest sleeves featuring matching zari/borders.
   - PALLU DRAPE: The ornate pallu (decorative fabric end) is gracefully draped diagonally across the chest from the right waist up over the left shoulder, with the border and pallu pattern prominently visible across the torso and flowing down the left side and back.
   - WAIST & FRONT PLEATS: Neatly wrapped around the waist, with crisp, elegant vertical accordion pleats tucked securely at the center of the waist, flowing straight down the center to the floor.
   - FULL-LENGTH SKIRT DRAPE: The saree skirt drapes gracefully around the lower body all the way down to the ankles and feet, touching the floor.
3. ARMS & HANDS: Both arms must be relaxed and hanging naturally beside the hips with empty, natural hands at the sides. Do NOT show the woman holding the saree after generation. Completely remove the folded cloth from hands.`;

    strictNegativeRule = `STRICT SAREE NEGATIVE CONSTRAINTS:
- Do NOT turn the saree into a shirt, dress, pants, or any men's clothing.
- Do NOT change the saree into another design or color.
- Do NOT show the woman holding the saree after generation.
- Never place trousers or jeans under the saree.
- Never make it into western clothing.`;

    framingInstruction = `FULL-BODY / 3/4-BODY REALISTIC FASHION STANDEE PORTRAIT:
Framing MUST show the complete woman, from the top of the head down to the feet/ankles, exactly like a vertical digital fashion standee or showroom smart mirror. Full head, hair, face, and smile clearly positioned in the upper frame with headroom above, and the entire saree skirt and pleats cascading down to the floor.`;
  } else if (catLower.includes('dress') || catLower.includes('gown') || catLower.includes('frock') || catLower.includes('kurti')) {
    // WOMEN + DRESS
    garmentSpecificInstruction = `SELECTED CATEGORY: WOMEN + DRESS
The reference garment is an elegant dress${desc}.
The woman in the photograph must appear naturally wearing the SAME dress shown to the camera:
1. PRESERVE EXACT DRESS: Preserve the exact color, pattern, fabric, prints, embroidery, neckline, and design from the reference garment.
2. FIT & SILHOUETTE: Realistically tailored and fitted from the neckline and shoulders, over the bust and waist, flowing gracefully along the hips and legs down to the hemline.
3. ARMS & HANDS: Both arms relaxed and hanging naturally beside the hips with empty hands. No hands holding fabric in front of the body.`;

    strictNegativeRule = `STRICT DRESS NEGATIVE CONSTRAINTS:
- Do NOT generate a saree, shirt, T-shirt or pants.
- Do NOT turn the dress into men's clothing.
- Do NOT change the dress fabric, pattern, or color.
- Do NOT show the woman holding the dress.`;

    framingInstruction = `FULL-LENGTH TOP-TO-BOTTOM PORTRAIT:
Framing must show the complete woman from top of the head down to the hemline and shoes/feet. Head and hair 100% in-frame with headroom above.`;
  } else if (catLower.includes('kurtha') || catLower.includes('kurta')) {
    // MEN + KURTHA
    garmentSpecificInstruction = `SELECTED CATEGORY: MEN + KURTHA
The reference garment is a traditional Indian men's kurtha${desc}.
Generate the same man naturally wearing the SAME kurtha shown to the camera:
1. PRESERVE EXACT KURTHA: Preserve the exact fabric, color shades, ethnic motifs/embroidery, buttons, and neckline from the reference garment.
2. TAILORING & FIT: Classic long kurtha tunic extending down past the hips and thighs to the knees, with a crisp mandarin/nehru collar, front buttoned placket, and tailored sleeves.
3. COMPLEMENTARY BOTTOM: Paired cleanly with neutral ethnic trousers/churidar/pajama below the knee.
4. ARMS & HANDS: Both arms relaxed beside the hips with empty, natural hands. Completely remove any held or folded fabric in front of the chest.`;

    strictNegativeRule = `STRICT KURTHA NEGATIVE CONSTRAINTS:
- Do NOT turn it into a shirt, T-shirt, saree or dress.
- Do NOT generate women's clothing or western tops.
- Do NOT put the kurtha pattern on the pants/legs.
- Do NOT show the man holding the kurtha.`;

    framingInstruction = `FULL-BODY FASHION PORTRAIT (HEAD TO SHOES):
Full-length fashion portrait showing the complete man from head down past knees to shoes. Complete head, face, beard, and hair 100% in frame with headroom above.`;
  } else if (catLower.includes('t-shirt') || catLower.includes('tshirt') || catLower.includes('tee')) {
    // MEN + T-SHIRT
    garmentSpecificInstruction = `SELECTED CATEGORY: MEN + T-SHIRT
The reference garment is a men's t-shirt${desc}.
Generate the same man naturally wearing the SAME T-shirt shown to the camera:
1. PRESERVE EXACT T-SHIRT: Preserve the exact fabric, uniform color, crewneck/v-neck, and any graphic/texture from the reference t-shirt.
2. 100% FULL REPLACEMENT: The man's previous worn top must be entirely replaced. Every part of the new t-shirt — collar, both sleeves, shoulders, chest, torso, and bottom hem — must be made of this reference fabric.
3. TORSO COVERAGE: Covers the upper body from shoulders down to the waistband and belt.
4. ARMS & HANDS: Both arms hanging down naturally beside the hips with relaxed, empty hands. No hands holding fabric in front of the chest.
5. UPPER-BODY ONLY: Reference garment is strictly an upper-body t-shirt. Lower body pants must remain separate and neutral.`;

    strictNegativeRule = `STRICT T-SHIRT NEGATIVE CONSTRAINTS:
- Do NOT turn it into a collared shirt, saree, dress, or kurtha.
- Do NOT put the t-shirt pattern on the pants/legs.
- Do NOT create a hybrid or colorblock with previous worn clothes.
- Do NOT show the man holding cloth.`;

    framingInstruction = `WAIST-UP / MID-THIGH FASHION PORTRAIT:
Framing must show the complete man from top of hair down past the waistline and belt. Head and face 100% in-frame with headroom above. The full t-shirt must be visible down to the bottom hem.`;
  } else if (catLower.includes('pant') || catLower.includes('trouser') || catLower.includes('jean') || catLower.includes('bottom') || catLower.includes('chino') || catLower.includes('slack')) {
    // MEN + PANT
    garmentSpecificInstruction = `SELECTED CATEGORY: MEN + PANT
The reference garment is a pair of men's pants/trousers/jeans${desc}.
Generate the same man naturally wearing the SAME pants shown to the camera:
1. PRESERVE EXACT PANTS: Preserve the exact denim/chino fabric wash, color shades, texture, pockets, and stitching from the reference pants.
2. LOWER-BODY FIT: Fitted cleanly at the natural waistline with waistband, belt loops, front fly, and tailored side pockets, extending down along both legs to the shoes.
3. COMPLEMENTARY TOP: The man should be wearing a clean neutral top (such as a crisp plain white or black top) tucked in or resting above the waistband to showcase the trousers.
4. ARMS & HANDS: Both legs standing naturally upright. Both arms relaxed beside the hips with empty hands. No hands holding cloth.
5. LOWER-BODY ONLY: Do NOT put the pant design on the shirt or upper body. Upper and lower body must remain strictly separate.`;

    strictNegativeRule = `STRICT PANT NEGATIVE CONSTRAINTS:
- Do NOT put the pant design on the shirt/upper body.
- Do NOT generate a saree or dress.
- Do NOT turn pants into shorts or a skirt.
- Do NOT show the man holding pants.`;

    framingInstruction = `FULL-LENGTH TOP-TO-BOTTOM PORTRAIT (HEAD TO SHOES):
Full-length fashion portrait showing the complete man from head down along both legs to shoes. Both legs and entire pair of pants fully in frame.`;
  } else {
    // MEN + SHIRT
    garmentSpecificInstruction = `SELECTED CATEGORY: MEN + SHIRT
The reference garment is a men's button-up shirt${desc}.
Generate the same man naturally wearing the SAME shirt shown to the camera:
1. PRESERVE EXACT SHIRT: Preserve the exact color, checks/stripes/pattern, fabric weave, collar style, and buttons from the reference shirt.
2. 100% FULL REPLACEMENT: The man's previous worn top must be entirely replaced. Every part of the new shirt — crisp collar, both full sleeves down to cuffs, front button placket, chest, stomach, and bottom hem — must be made 100% of this reference fabric.
3. TAILORING & FIT: Masculine tailored fit, buttoned up cleanly, resting naturally at the waistline, hips, and belt.
4. ARMS & HANDS: Both arms relaxed and hanging naturally beside the hips with empty, natural hands at the sides. Completely remove any held or folded garment from hands.
5. UPPER-BODY ONLY: The reference garment is strictly an upper-body shirt. Do NOT put the shirt pattern on pants or legs. The pants must remain neutral, dark, and separate.`;

    strictNegativeRule = `STRICT SHIRT NEGATIVE CONSTRAINTS:
- Do NOT put the shirt pattern on pants/legs.
- Do NOT generate a saree or dress.
- Do NOT turn it into a t-shirt or kurtha.
- Do NOT show the man holding cloth.`;

    framingInstruction = `WAIST-UP / MID-THIGH FASHION PORTRAIT:
Framing must be a clean, premium fashion portrait showing the man from top of hair down to the waistline, hips, and belt. Complete head, face, glasses (if worn), and hair 100% in-frame with headroom above. The entire shirt down to its bottom hem must be fully visible.`;
  }

  return `AI VIRTUAL TRY-ON PRIORITY RULES:
1. SELECTED CATEGORY & GENDER: ${selectedGender} • ${category.toUpperCase()}. This selected category is the absolute authority and strictly controls the AI generation.
2. PHYSICAL GARMENT: The physical garment shown by the customer in the reference image is the primary visual source of truth.
3. EXACT GARMENT APPEARANCE: Faithfully reproduce the reference garment's exact colors, shades, prints, embroidery, textures, zari borders, checks/stripes, and construction details.
4. IDENTITY & FACE PRESERVATION: Flawlessly preserve this exact person's identity, facial features, eyeglasses/glasses if worn, beard/mustache (for men), bindi/earrings (for women), skin tone, hairstyle, and facial expression. Never substitute with another person.
5. NATURAL BODY PLACEMENT & DRAPE: Garment is worn realistically with organic textile folds, weight, and authentic draping. Both arms relaxed and hanging straight down naturally beside hips with empty, natural hands at the sides. Zero hands holding or clutching cloth.

CRITICAL INSTRUCTIONS:
${garmentSpecificInstruction}

${strictNegativeRule}

FRAMING REQUIREMENTS:
${framingInstruction}

FINAL POLISH & IMAGE EXCELLENCE:
- Commercial fashion magazine editorial quality, shot on 100MP medium-format camera with soft studio lighting.
- Realistic textile micro-textures, authentic silk sheen, crisp embroidery, and natural fabric shadows.
- Lifelike skin texture with natural pores, sharp eyes, and razor-sharp facial details (zero AI blurring, zero plastic skin, zero extra fingers/limbs).
- Seamless room background preservation with authentic depth of field.`;
}

export class OpenAIVtonService {
  private client: OpenAI;
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
    this.model = config.OPENAI_IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

    const configured = !!this.apiKey;
    logger.info(`[OPENAI] OPENAI_API_KEY configured: ${configured}, Model: ${this.model}`);

    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  async processTryOn(input: OpenAITryOnInput): Promise<OpenAITryOnOutput> {
    logger.info(`[OPENAI] processTryOn started for generation ${input.generationId} with model ${this.model}`);

    if (!this.apiKey) {
      const err = 'OPENAI_API_KEY is not configured in environment variables';
      logger.error(`[OPENAI] ${err}`);
      throw new Error(err);
    }

    if (!fs.existsSync(input.userImagePath)) {
      const err = `Person image not found at path: ${input.userImagePath}`;
      logger.error(`[OPENAI] ${err}`);
      throw new Error(err);
    }

    let finalGarmentPath = input.garmentImagePath;
    let garmentCategory = input.category || 'shirt';
    let garmentGender = input.gender || (garmentCategory.toLowerCase().includes('saree') || garmentCategory.toLowerCase().includes('dress') ? 'WOMEN' : 'MEN');
    let garmentDescription = input.description || '';

    // If garment image is not explicitly separate from person photo, or if description is missing, extract
    if (
      !finalGarmentPath ||
      !fs.existsSync(finalGarmentPath) ||
      path.resolve(finalGarmentPath) === path.resolve(input.userImagePath) ||
      !garmentDescription
    ) {
      logger.info(`[OPENAI] Extracting held garment info for selected category: ${garmentGender} • ${garmentCategory}...`);
      if (input.onProgress) input.onProgress(20, 'Detecting and preparing your garment...');
      const garmentInfo: ExtractedGarmentResult = await garmentExtractionService.extractGarmentInfo(
        input.userImagePath,
        input.category,
        input.gender
      );
      if (!finalGarmentPath || !fs.existsSync(finalGarmentPath) || path.resolve(finalGarmentPath) === path.resolve(input.userImagePath)) {
        finalGarmentPath = path.resolve(__dirname, '../../..', garmentInfo.garmentPath.replace(/^\//, ''));
      }
      // CRITICAL: NEVER overwrite user selected category!
      if (!input.category) {
        garmentCategory = garmentInfo.category;
      }
      if (!garmentDescription) {
        garmentDescription = garmentInfo.description;
      }
    }

    if (!fs.existsSync(finalGarmentPath)) {
      const err = `Garment image not found at path: ${finalGarmentPath}`;
      logger.error(`[OPENAI] ${err}`);
      throw new Error(err);
    }

    const catLower = garmentCategory.toLowerCase();
    const isFullBodyGarment =
      catLower.includes('pant') ||
      catLower.includes('trouser') ||
      catLower.includes('jean') ||
      catLower.includes('bottom') ||
      catLower.includes('chino') ||
      catLower.includes('slack') ||
      catLower.includes('dress') ||
      catLower.includes('gown') ||
      catLower.includes('kurti') ||
      catLower.includes('anarkali') ||
      catLower.includes('maxi') ||
      catLower.includes('frock') ||
      catLower.includes('saree') ||
      catLower.includes('sari') ||
      catLower.includes('kurtha') ||
      catLower.includes('kurta') ||
      catLower.includes('suit') ||
      catLower.includes('blazer') ||
      catLower.includes('tuxedo') ||
      catLower.includes('lehenga') ||
      catLower.includes('skirt');

    const promptToUse = buildOpenAITryOnPrompt(garmentCategory, garmentDescription, input.prompt, garmentGender);
    logger.info(`[OPENAI] Virtual try-on prompt (${garmentGender} • ${garmentCategory}, fullBody=${isFullBodyGarment}):\n${promptToUse}`);

    try {
      if (input.onProgress) input.onProgress(35, 'Preparing framing for full garment coverage...');

      const originalPersonBuffer = fs.readFileSync(input.userImagePath);
      const personMeta = await sharp(originalPersonBuffer).metadata();
      const pWidth = personMeta.width || 1024;
      const pHeight = personMeta.height || 1024;

      // Sample wall/background color from top corners
      let wallColor = { r: 215, g: 205, b: 190, alpha: 1 };
      try {
        const wallSample = await sharp(originalPersonBuffer)
          .extract({ left: Math.max(0, Math.floor(pWidth * 0.8)), top: 20, width: 20, height: 20 })
          .stats();
        const [r, g, b] = wallSample.channels.map((c) => Math.round(c.mean));
        wallColor = { r, g, b, alpha: 1 };
      } catch {}

      // Add guaranteed top headroom so hair/eyes/glasses are NEVER cut off
      const topPad = 60;

      // Aspect ratio & resolution configuration:
      // For full body (saree, dress, pants, suit): 2:3 portrait (1024x1536) for head-to-toe drape
      // For upper body (shirts, t-shirts, tops): 1:1 square (1024x1024) for wider, larger presentation on screen with minimal empty side margins
      const targetAspect = isFullBodyGarment ? 1.5 : 1.0;
      const finalW = 1024;
      const finalH = isFullBodyGarment ? 1536 : 1024;

      // Crop horizontally if wide landscape webcam shot
      let cropW = pWidth;
      let cropLeft = 0;
      if (pWidth >= pHeight * 0.8) {
        if (isFullBodyGarment) {
          cropW = Math.min(pWidth, Math.floor(pHeight * 0.75));
        } else {
          cropW = Math.min(pWidth, Math.floor((pHeight + topPad) * 1.05));
        }
        cropLeft = Math.floor((pWidth - cropW) / 2);
      }

      const cropped = await sharp(originalPersonBuffer)
        .extract({ left: cropLeft, top: 0, width: cropW, height: pHeight })
        .toBuffer();

      // Geometry for exact aspect ratio (targetAspect) without any stretching:
      const heightMultiplier = isFullBodyGarment ? 2.1 : 1.05;
      let targetH = Math.max(
        Math.round(cropW * targetAspect),
        Math.round((pHeight + topPad) * (isFullBodyGarment ? 1.4 : 1.0)),
        Math.round(pHeight * heightMultiplier)
      );

      // Exact aspect ratio calculation: width = targetH / targetAspect
      let targetW = Math.round(targetH / targetAspect);
      if (targetW < cropW) {
        targetW = cropW;
        targetH = Math.round(targetW * targetAspect);
      }

      const padLeft = Math.floor((targetW - cropW) / 2);
      const padRight = targetW - cropW - padLeft;
      const padBottom = targetH - pHeight - topPad;

      const preparedPersonBuffer = await sharp(cropped)
        .extend({
          top: topPad,
          bottom: Math.max(0, padBottom),
          left: Math.max(0, padLeft),
          right: Math.max(0, padRight),
          background: wallColor,
        })
        .resize(finalW, finalH, { fit: 'fill' })
        .jpeg({ quality: 95 })
        .toBuffer();

      // Ensure garment image is clean high-quality JPEG
      const garmentBuffer = await sharp(finalGarmentPath).jpeg({ quality: 95 }).toBuffer();

      // Convert buffers to OpenAI uploadable files
      const personFile = await toFile(preparedPersonBuffer, 'person.jpg', { type: 'image/jpeg' });
      const garmentFile = await toFile(garmentBuffer, 'garment.jpg', { type: 'image/jpeg' });

      if (input.onProgress) input.onProgress(50, `Transforming outfit with OpenAI (${this.model})...`);
      logger.info(`[OPENAI] Submitting image edit request to OpenAI Images API (${this.model})...`);

      const response = await this.client.images.edit({
        model: this.model,
        image: [personFile, garmentFile],
        prompt: promptToUse,
        quality: 'high',
        output_format: 'jpeg',
      });

      if (input.onProgress) input.onProgress(85, 'Processing transformed fashion photo...');

      const base64Data = response.data?.[0]?.b64_json;
      if (!base64Data) {
        throw new Error('OpenAI Image API did not return generated image data');
      }

      const generatedBuffer = Buffer.from(base64Data, 'base64');

      // Verification: ensure valid output
      if (!generatedBuffer || generatedBuffer.length < 5000) {
        throw new Error('OpenAI returned an empty or corrupted image');
      }

      // Ensure output is not identical to input image
      if (generatedBuffer.equals(originalPersonBuffer)) {
        logger.error('[OPENAI] Error: OpenAI output is identical to input image');
        throw new Error('Virtual try-on output was identical to original input image');
      }

      if (input.onProgress) input.onProgress(95, 'Saving your look for display and download...');

      const targetFilename = `generated_${input.generationId}.jpg`;
      const relativeUrl = await storageService.saveFile(generatedBuffer, targetFilename, 'generated');

      logger.info(`[OPENAI] Output successfully saved at: ${relativeUrl} (${generatedBuffer.length} bytes)`);

      const jobId = `openai_${input.generationId}_${Date.now()}`;

      return {
        jobId,
        status: 'COMPLETED',
        resultUrl: relativeUrl,
      };
    } catch (error: any) {
      const errMsg = error?.response?.data?.error?.message || error.message || 'OpenAI Image Generation failed';
      logger.error(`[OPENAI] Execution Error: ${errMsg}`);
      throw new Error(`OpenAI Virtual Try-On failed: ${errMsg}`);
    }
  }
}

export const openAiVtonService = new OpenAIVtonService();
