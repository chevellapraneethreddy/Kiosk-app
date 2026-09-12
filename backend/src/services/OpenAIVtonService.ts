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
 * Fully supports shirts, t-shirts, ladies dresses, pants/trousers for men, sarees, and suits.
 */
export function buildOpenAITryOnPrompt(category: string, description?: string, customPrompt?: string): string {
  if (customPrompt) return customPrompt;

  const catLower = (category || 'garment').toLowerCase();

  // Clean description of redundant holding/folding words so it describes the worn garment cleanly
  const cleanDescText = (description || '').trim()
    .replace(/neatly folded|folded|held up to camera|held up to display|held up|in hands|holding it|holding/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const desc = cleanDescText ? ` (${cleanDescText})` : '';

  let garmentSpecificInstruction = '';
  let framingInstruction = '';

  if (catLower.includes('saree') || catLower.includes('sari')) {
    garmentSpecificInstruction = `The reference garment is a traditional Indian saree${desc} with a matching blouse.
The person in the photograph must be realistically dressed in this exact saree from shoulders all the way down to the feet/ankles:
1. MATCHING BLOUSE: A fitted tailored blouse in the exact same color and fabric as the saree, with short sleeves (ending just above the elbow) featuring matching zari/borders on the sleeve cuffs, with a neat modest neckline.
2. PALLU DRAPE: The ornate pallu (decorative fabric end) of the saree is gracefully draped diagonally across the chest from the right waist up over the left shoulder, with the zari borders and pallu pattern prominently visible across the torso and flowing down the left side and back.
3. WAIST & FRONT PLEATS: The saree is neatly wrapped around the waist, with crisp, elegant vertical accordion pleats tucked securely at the center of the waist, flowing straight down the center to the floor.
4. FULL-LENGTH SKIRT DRAPE: The saree skirt drapes gracefully around the lower body and legs all the way down to the ankles and feet, touching the floor, exactly like a traditional Indian saree look in a premium fashion standee / showroom.
5. ARMS & HANDS: Both arms must be relaxed and hanging naturally beside the hips with empty, natural hands at the sides. No hands holding cloth, no bunched fabric in front of the body.
6. EXACT FABRIC & ZARI BORDERS: Preserve the exact color shades, sheen, silk/cotton texture, golden zari borders, and motifs of the reference saree throughout the entire garment.`;
    framingInstruction = `FULL-LENGTH TOP-TO-BOTTOM PORTRAIT (HEAD TO ANKLES):
The framing MUST show the complete person TOP TO BOTTOM, from the top of the head down to the feet/ankles, exactly like a vertical digital fashion standee or showroom smart mirror.
The full head, hair, face, and smile must be clearly positioned in the upper portion of the frame with headroom above, and the entire saree skirt and pleats must cascade all the way down to the bottom of the frame. Do NOT cut off at the waist, thighs, or knees.`;
  } else if (catLower.includes('pant') || catLower.includes('trouser') || catLower.includes('jean') || catLower.includes('bottom') || catLower.includes('chino') || catLower.includes('slack')) {
    garmentSpecificInstruction = `The reference garment is a pair of ${catLower}${desc}.
Replace the lower-body clothing on the person's body with these EXACT pants/trousers/jeans (tailored cut for men or women):
1. WAISTBAND & POCKETS: Fitted cleanly at the natural waistline with waistband, belt loops, front fly, and tailored side/back pockets.
2. FULL LEG LENGTH DOWN TO SHOES: The pants must drape naturally and extend all the way down along both legs to the ankles and shoes, showing authentic fabric folds, creases, and hem.
3. COMPLEMENTARY TOP: The person should be wearing a clean, neat neutral top (such as a crisp plain white or black fitted t-shirt or shirt) tucked in or resting neatly above the waistband to showcase the trousers.
4. ARMS & POSTURE: Both legs standing naturally and upright. Both arms relaxed beside the hips with empty, natural hands. No hands holding cloth.
5. PRESERVE FABRIC & COLOR: Retain the exact fabric wash, color shades, denim texture, weave, and stitching from the reference pants.`;
    framingInstruction = `FULL-LENGTH TOP-TO-BOTTOM PORTRAIT (HEAD TO SHOES):
Outpaint and expand the framing downwards into a complete full-length vertical fashion photograph showing the complete person TOP TO BOTTOM, from head down to shoes. Both legs and the entire pair of pants must be fully displayed in the frame.`;
  } else if (catLower.includes('dress') || catLower.includes('gown') || catLower.includes('frock') || catLower.includes('kurti') || catLower.includes('anarkali') || catLower.includes('maxi')) {
    garmentSpecificInstruction = `The reference garment is an elegant ladies dress/kurti${desc}.
Replace the clothing on the person's body with this EXACT dress/kurti:
1. FIT & SILHOUETTE: Realistically tailored and fitted from the neckline and shoulders, over the bust and waist, flowing gracefully along the hips and legs down to the hemline (mid-calf, ankle, or floor length).
2. DETAILS & CUT: Preserve all prints, embroidery, neckline style, and sleeve length from the reference garment.
3. ARMS & HANDS: Both arms relaxed and hanging naturally beside the hips with empty hands. No hands holding fabric in front of the body.
4. PRESERVE FABRIC & COLOR: Retain the exact fabric colors, prints, embroidery, and textures from the reference dress.`;
    framingInstruction = `FULL-LENGTH TOP-TO-BOTTOM PORTRAIT:
Outpaint and expand the framing downwards into a full-length vertical fashion portrait showing the person from the top of the head down to the hemline and shoes/feet. Head and hair 100% in-frame with headroom above.`;
  } else if (catLower.includes('t-shirt') || catLower.includes('tshirt') || catLower.includes('tee')) {
    const cleanDesc = (cleanDescText || 't-shirt').replace(/trousers?|pants?|jeans?/gi, 't-shirt');
    garmentSpecificInstruction = `The reference garment is a ${cleanDesc}.

CRITICAL: 100% FULL T-SHIRT REPLACEMENT (NO HYBRID BLEND WITH OLD CLOTHING):
1. COMPLETELY REMOVE THE PREVIOUS CLOTHING:
The person's original dark polo shirt, collar, sleeves, stripes, and fabric MUST BE 100% ENTIRELY REMOVED AND REPLACED.
Do NOT retain the old collar. Do NOT retain the old striped sleeves. Do NOT keep any black polo fabric.

2. WEAR THE FULL NEW T-SHIRT:
Dress the person in a COMPLETE, UNIFORM ${cleanDesc}.
Every single part of the new t-shirt — the collar/crewneck, both sleeves, both shoulders, chest, stomach, and bottom hem — MUST be made 100% of this reference fabric and uniform color (${cleanDesc}).
Do NOT retain or blend any parts, colors, collar, or stripes from the old worn shirt.

3. FULL TORSO COVERAGE:
The t-shirt must cover the entire upper body from shoulders all the way down to the bottom hem, waistband, and belt. Never cut off at the shoulders or chest.

4. ARMS & HANDS:
Both arms hanging down naturally beside the hips with relaxed, empty hands. No hands holding fabric in front of the chest.

5. UPPER-BODY ONLY:
The reference garment is strictly an upper-body t-shirt. The lower-body pants must remain neutral/dark.`;
    framingInstruction = `WAIST-UP / MID-THIGH FASHION PORTRAIT:
Framing must show the complete person from the top of the hair down past the waistline, hips, and belt. Head and hair 100% in-frame with headroom above. The full t-shirt must be visible down to the bottom hem. Do NOT extend all the way down to shoes when trying on a t-shirt.`;
  } else if (catLower.includes('shirt') || catLower.includes('top') || catLower.includes('blouse')) {
    const cleanDesc = (cleanDescText || 'shirt').replace(/trousers?|pants?|jeans?/gi, 'shirt');
    garmentSpecificInstruction = `The reference garment is a ${cleanDesc}.

CRITICAL: 100% FULL SHIRT REPLACEMENT (NO HYBRID OR COLORBLOCK):
1. COMPLETELY REMOVE THE PREVIOUS SHIRT:
The person's original dark/black polo shirt, horizontal striped sleeves, and polo collar MUST BE 100% ENTIRELY REMOVED AND REPLACED.
Do NOT retain the old collar. Do NOT retain the old striped sleeves. Do NOT retain the old dark polo fabric. Do NOT create a two-tone or colorblock shirt.

2. WEAR THE FULL NEW SHIRT:
Dress the person in a COMPLETE, UNIFORM ${cleanDesc}.
Every single part of the new shirt — the entire collar, both full sleeves (from shoulder seam down to cuffs), front placket with buttons, chest, stomach, and bottom hem — MUST be made 100% of this reference fabric and uniform color (${cleanDesc}).
If the reference garment is pink, the ENTIRE shirt is 100% pink throughout from collar to cuffs to waist!

3. FIT & TAILORING:
The shirt must be tailored to fit the person's body naturally and impeccably (masculine tailored cut for men, feminine tailored cut for women), buttoned up cleanly with a crisp collar, sleeves, chest, and stomach.

4. FULL LENGTH DOWN TO WAIST & HIPS:
Show the ENTIRE shirt from collar down to the bottom hem, resting naturally at the waistline, hips, and belt. It must never be cut off at the chest or shoulders.

5. ARMS & HANDS:
Both arms must be relaxed and hanging naturally beside the hips with empty, natural hands at the sides. Completely remove the folded garment from the person's hands and remove any hands/arms clutched in front of the chest.

6. UPPER-BODY ONLY:
The reference garment is strictly an upper-body shirt. Do NOT put this fabric or color onto the person's pants/trousers/legs. The lower body (pants) must remain simple, dark/neutral, and separate.`;
    framingInstruction = `WAIST-UP / MID-THIGH FASHION PORTRAIT:
Framing must be a clean, premium fashion portrait showing the person from the top of their hair down to the waistline, hips, and belt. The complete head and hair must be 100% visible with headroom at the top. The entire shirt down to its bottom hem must be fully in frame. Do NOT extend all the way down to shoes when trying on a shirt.`;
  } else if (catLower.includes('suit') || catLower.includes('blazer') || catLower.includes('jacket') || catLower.includes('coat') || catLower.includes('tuxedo')) {
    garmentSpecificInstruction = `The reference garment is a tailored ${catLower}${desc}.
Replace the clothing with this tailored suit/blazer:
1. TAILORING & FIT: Sharp structured shoulders, crisp lapels, buttoned front, matching trousers, and clean formal shirt/blouse underneath (tailored for men or women).
2. FULL LENGTH: Jacket extending past hips and trousers extending down both legs to formal shoes.
3. ARMS & HANDS: Both arms relaxed beside the hips with empty, natural hands.
4. PRESERVE FABRIC: Retain exact suit fabric, color, pinstripes, or texture from the reference.`;
    framingInstruction = `FULL-BODY FASHION PORTRAIT:
Outpaint and expand the framing downwards into a full-length fashion portrait showing the complete suit jacket down past the hips and trousers down to the shoes. Complete head and hair fully visible.`;
  } else {
    garmentSpecificInstruction = `The reference garment is a ${catLower}${desc}. Make the garment neatly fitted and worn on the person's body showing its complete cut from top to bottom hem. Both arms resting naturally beside the hips with empty hands.`;
    framingInstruction = `COMPLETE FASHION PORTRAIT:
Outpaint and expand the framing downwards into a complete fashion portrait showing the entire garment down to its bottom edge. Complete head and hair fully visible with headroom at the top.`;
  }

  return `Edit the provided photograph of this same person.

CRITICAL IDENTITY & FACE PRESERVATION (MEN & WOMEN):
Preserve this exact person's identity, facial features, eyeglasses/glasses if worn, beard and mustache (for men), bindi/earrings (for women), skin tone, hairstyle, and facial expression. The complete head, hair, forehead, glasses, eyes, nose, and mouth must be 100% visible, fully in frame, and razor sharp in high definition. Do NOT crop, alter, modify, or remove the head, hair, or glasses. Never substitute with another person.

CRITICAL GARMENT, COLOR & PATTERN:
The reference garment is the absolute source of truth. Preserve its exact colors, shades, prints, embroidery, textures, zari borders, checks/stripes, and construction details. The person on the photo MUST be wearing this EXACT garment. Do NOT make the garment plain, grey, white, or a different color. Preserve all vibrant colors, patterns, and fabric weave from the reference garment.

CRITICAL FRAMING & COVERAGE:
${framingInstruction}
${garmentSpecificInstruction}

NATURAL POSE & NO HELD CLOTH:
Make the garment naturally and realistically worn on the person's body. Completely remove the garment from the person's hands and remove any hands/arms/fingers holding or clutching it in front of the body. Keep both arms relaxed and hanging naturally beside the hips with empty, natural hands. Do not create a different person. Create a premium photorealistic fashion photograph. Authentic room background preserved.`;
}

export class OpenAIVtonService {
  private client: OpenAI;
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
    this.model = config.OPENAI_IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini';

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
    let garmentDescription = input.description || '';

    // 1. If garment image is not explicitly separate from person photo, or if description is missing, extract
    if (
      !finalGarmentPath ||
      !fs.existsSync(finalGarmentPath) ||
      path.resolve(finalGarmentPath) === path.resolve(input.userImagePath) ||
      !garmentDescription
    ) {
      logger.info('[OPENAI] Extracting held garment info and description from captured photo...');
      if (input.onProgress) input.onProgress(20, 'Detecting and preparing your garment...');
      const garmentInfo: ExtractedGarmentResult = await garmentExtractionService.extractGarmentInfo(
        input.userImagePath
      );
      if (!finalGarmentPath || !fs.existsSync(finalGarmentPath) || path.resolve(finalGarmentPath) === path.resolve(input.userImagePath)) {
        finalGarmentPath = path.resolve(__dirname, '../../..', garmentInfo.garmentPath.replace(/^\//, ''));
      }
      if (!input.category || input.category === 'shirt') {
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
      catLower.includes('suit') ||
      catLower.includes('blazer') ||
      catLower.includes('tuxedo') ||
      catLower.includes('lehenga') ||
      catLower.includes('skirt');

    const promptToUse = buildOpenAITryOnPrompt(garmentCategory, garmentDescription, input.prompt);
    logger.info(`[OPENAI] Virtual try-on prompt (${garmentCategory}, fullBody=${isFullBodyGarment}): ${promptToUse}`);

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
