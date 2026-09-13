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
 * Strictly enforces user rules:
 * 1. Selected category/gender is a strict constraint.
 * 2. Physical garment shown is the visual source of truth.
 * 3. Person must ACTUALLY WEAR the garment.
 * 4. Hands/arms holding garment must NOT remain in final result; relaxed arms at sides.
 * 5. Person identity, face, eyes, hair, and body proportions preserved.
 * 6. High-detail textile appearance and photorealistic commercial fashion photography.
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
Generate the SAME PERSON in the photograph ACTUALLY WEARING this SAME physical saree shown to the camera:
1. PRESERVE SAREE DETAILS: Faithfully preserve the exact saree color, print, pattern, border, embroidery, fabric texture, and design details shown in the reference garment.
2. CREATE A REALISTIC TRADITIONAL SAREE DRAPE:
   - MATCHING BLOUSE: Fitted tailored blouse in the exact same color and fabric as the saree, with neat modest sleeves featuring matching zari/borders.
   - PALLU DRAPE: The ornate pallu is gracefully draped diagonally across the chest from the right waist up over the left shoulder, with the border and pallu pattern prominently visible across the torso and flowing down the left side.
   - WAIST & FRONT PLEATS: Neatly wrapped around the waist, with natural waist pleats tucked securely at the center, flowing straight down to the floor.
   - FULL-LENGTH SILHOUETTE: Realistic full-length silhouette with natural fabric folds cascading gracefully down to the ankles and feet. Saree must look physically worn.
3. ARMS & HANDS: Both arms must be relaxed and hanging naturally beside the hips in a normal relaxed pose with empty hands. The person must NOT be shown holding the saree. Hands/arms holding the garment must NOT remain in the final result. Completely remove the folded cloth from hands.`;

    strictNegativeRule = `STRICT SAREE NEGATIVE CONSTRAINTS:
- DO NOT generate a western dress.
- DO NOT generate a shirt.
- DO NOT generate a T-shirt.
- DO NOT generate pants.
- DO NOT change the saree into another design or color.
- MOST IMPORTANT: The person must NOT be shown holding the saree.
- Never place trousers or jeans under the saree.
- Do NOT simply paste the garment onto the original image.`;

    framingInstruction = `FULL-BODY / 3/4-BODY REALISTIC FASHION STANDEE PORTRAIT:
Framing MUST show the complete woman, from the top of the head down to the feet/ankles, like a vertical digital fashion standee. Full head, hair, face, and natural appearance clearly visible in the upper frame with headroom above, and the entire saree skirt and pleats cascading down to the floor.`;
  } else if (catLower.includes('dress') || catLower.includes('gown') || catLower.includes('frock') || catLower.includes('kurti')) {
    // WOMEN + DRESS
    garmentSpecificInstruction = `SELECTED CATEGORY: WOMEN + DRESS
The reference garment is an elegant dress${desc}.
Generate the SAME PERSON in the photograph ACTUALLY WEARING this SAME physical dress shown to the camera:
1. PRESERVE EXACT DRESS: Faithfully preserve the exact color, print, pattern, embroidery, fabric, neckline, sleeves, and silhouette from the reference garment.
2. FIT & SILHOUETTE: The garment must appear naturally worn on the person's body, realistically tailored and fitted from neckline and shoulders, over the bust and waist, flowing naturally down to the hemline with realistic fabric folds and shadows.
3. ARMS & HANDS: Both arms relaxed and hanging naturally beside the hips in a normal relaxed pose with empty hands. The person must NOT still be holding the garment. Hands/arms holding the garment must NOT remain in the final result.`;

    strictNegativeRule = `STRICT DRESS NEGATIVE CONSTRAINTS:
- DO NOT generate a saree.
- DO NOT generate a shirt.
- DO NOT generate a T-shirt.
- DO NOT generate pants.
- DO NOT turn the dress into men's clothing.
- DO NOT change the dress fabric, pattern, or color.
- The person must NOT still be holding the garment.
- Do NOT simply paste the garment onto the original image.`;

    framingInstruction = `FULL-LENGTH TOP-TO-BOTTOM PORTRAIT:
Framing must show the complete woman from top of head down to hemline and shoes/feet. Head and hair 100% in-frame with headroom above.`;
  } else if (catLower.includes('kurtha') || catLower.includes('kurta')) {
    // MEN + KURTHA
    garmentSpecificInstruction = `SELECTED CATEGORY: MEN + KURTHA
The reference garment is a traditional Indian men's kurtha${desc}.
Generate the SAME PERSON ACTUALLY WEARING this SAME physical kurtha shown to the camera:
1. PRESERVE EXACT KURTHA: Faithfully preserve the exact color, embroidery/print, collar, button/placket details, fabric, and long silhouette from the reference garment.
2. TAILORING & FIT: Classic long kurtha tunic extending naturally below the knees where appropriate, with a crisp mandarin/nehru collar, buttoned placket, and tailored sleeves with realistic textile folds and shadows.
3. COMPLEMENTARY BOTTOM: Paired cleanly with neutral ethnic churidar/trousers/pajama below the knee.
4. ARMS & HANDS: Both arms relaxed beside hips in a normal relaxed pose with empty, natural hands. The person must NOT still be holding the garment. Hands/arms holding the garment must NOT remain in the final result. Completely remove any held or folded cloth.`;

    strictNegativeRule = `STRICT KURTHA NEGATIVE CONSTRAINTS:
- DO NOT generate a shirt, T-shirt, saree or dress.
- DO NOT generate women's clothing.
- DO NOT put the kurtha pattern on the pants/legs.
- The person must NOT still be holding the kurtha.
- Do NOT simply paste the garment onto the original image.`;

    framingInstruction = `FULL-BODY FASHION PORTRAIT (HEAD TO SHOES):
Full-length portrait showing the complete man from head down past knees to shoes. Complete head, face, beard, and hair 100% in frame with headroom above.`;
  } else if (catLower.includes('t-shirt') || catLower.includes('tshirt') || catLower.includes('tee')) {
    // MEN + T-SHIRT
    garmentSpecificInstruction = `SELECTED CATEGORY: MEN + T-SHIRT
The reference garment is a men's t-shirt${desc}.
Generate the SAME PERSON ACTUALLY WEARING this SAME physical T-shirt shown to the camera:
1. PRESERVE EXACT T-SHIRT: Faithfully preserve the exact color, print, logo, neckline, sleeves, and fabric appearance from the reference t-shirt.
2. 100% FULL REPLACEMENT: The person's previous top is completely replaced. The T-shirt covers the torso naturally with realistic fabric texture, folds, and shadows.
3. TORSO COVERAGE: Covers upper body from neckline down to waistband. Lower body pants must remain separate and neutral.
4. ARMS & HANDS: Both arms hanging down naturally beside hips in a normal relaxed pose with empty hands. The person must NOT still be holding the garment. Hands/arms holding the garment must NOT remain in the final result.`;

    strictNegativeRule = `STRICT T-SHIRT NEGATIVE CONSTRAINTS:
- DO NOT generate a shirt, kurtha, saree or dress.
- DO NOT transfer the t-shirt pattern onto pants or legs.
- The person must NOT still be holding the t-shirt.
- Do NOT simply paste the garment onto the original image.`;

    framingInstruction = `WAIST-UP / MID-THIGH FASHION PORTRAIT:
Framing shows the complete man from top of hair down past the waistline. Head and face 100% in-frame with headroom above. Full t-shirt visible down to the bottom hem.`;
  } else if (catLower.includes('pant') || catLower.includes('trouser') || catLower.includes('jean') || catLower.includes('bottom') || catLower.includes('chino') || catLower.includes('slack')) {
    // MEN + PANT
    garmentSpecificInstruction = `SELECTED CATEGORY: MEN + PANT
The reference garment is a pair of men's pants/trousers${desc}.
Generate the SAME PERSON ACTUALLY WEARING this SAME physical pants/trousers shown to the camera:
1. PRESERVE EXACT PANTS: Faithfully preserve the exact color, pattern, fabric, pockets/details, and overall silhouette from the reference pants.
2. LOWER-BODY FIT: The pants must naturally cover the legs down to the shoes, with waistband, pockets, and tailored fit.
3. COMPLEMENTARY TOP: Person is wearing a clean neutral top tucked in or resting cleanly above the waistband to showcase the trousers.
4. ARMS & HANDS: Both arms hanging naturally beside hips in a normal relaxed pose with empty hands. The person must NOT still be holding the garment. Hands/arms holding the garment must NOT remain in the final result.
5. LOWER-BODY ONLY: Do NOT transfer the pant pattern onto the shirt. Upper and lower body must remain strictly separate.`;

    strictNegativeRule = `STRICT PANT NEGATIVE CONSTRAINTS:
- Do NOT transfer the pant pattern onto the shirt.
- DO NOT generate a saree or dress.
- DO NOT turn pants into shorts or a skirt.
- The person must NOT still be holding the pants.
- Do NOT simply paste the garment onto the original image.`;

    framingInstruction = `FULL-LENGTH TOP-TO-BOTTOM PORTRAIT (HEAD TO SHOES):
Full-length portrait showing the complete man from head down along both legs to shoes. Entire pair of pants fully in frame.`;
  } else {
    // MEN + SHIRT
    garmentSpecificInstruction = `SELECTED CATEGORY: MEN + SHIRT
The reference garment is a men's button-up shirt${desc}.
Generate the SAME PERSON ACTUALLY WEARING this SAME physical shirt shown to the camera:
1. PRESERVE EXACT SHIRT: Faithfully preserve the shirt's exact color, pattern, print, logo, collar, buttons, sleeves, and fabric appearance from the reference shirt.
2. TORSO COVERAGE: The shirt must cover the torso naturally with crisp collar, button placket, cuffs, and realistic textile folds and shadows.
3. COMPLEMENTARY BOTTOM: Pants must remain neutral, dark, and separate. DO NOT transfer the shirt pattern onto pants or legs.
4. ARMS & HANDS: Both arms relaxed and hanging naturally beside the hips in a normal relaxed pose with empty, natural hands at the sides. The person must NOT still be holding the garment. Hands/arms holding the garment must NOT remain in the final result. Completely remove any held or folded garment from hands.`;

    strictNegativeRule = `STRICT SHIRT NEGATIVE CONSTRAINTS:
- DO NOT transfer the shirt pattern onto pants or legs.
- DO NOT generate a T-shirt, kurtha, saree or dress.
- The person must NOT still be holding the shirt.
- Do NOT simply paste the garment onto the original image.`;

    framingInstruction = `WAIST-UP / MID-THIGH FASHION PORTRAIT:
Framing must be a clean fashion portrait showing the man from top of hair down to the waistline. Complete head, face, glasses (if worn), and hair 100% in-frame with headroom above. Entire shirt down to bottom hem fully visible.`;
  }

  return `AI VIRTUAL TRY-ON PRIORITY RULES:
1. SELECTED CATEGORY & GENDER: ${selectedGender} • ${category.toUpperCase()}. This selected category is a STRICT CONSTRAINT and absolute authority.
2. PHYSICAL GARMENT: The physical garment shown by the customer in the reference image is the SOURCE OF TRUTH. Never replace the physical garment with a predefined or generic garment.
3. SAME PERSON & PRESERVATION: Preserve the person's exact face, identity, facial features, skin tone, hairstyle, body proportions, and natural appearance. Preserve the original camera perspective, environment/background where possible, and lighting direction.
4. ACTUALLY WEARING THE GARMENT: The final image must show the SAME PERSON ACTUALLY WEARING the physical garment with natural garment fit, realistic fabric texture, realistic folds, realistic shadows, correct garment shape, and high-detail textile appearance.
5. ARMS & HANDS POSE: The person must NOT still be holding the garment. Hands and arms holding the garment must NOT remain in the final result. Generate natural arms and hands in a normal relaxed pose at the sides. Do NOT simply paste the garment onto the original image.

CRITICAL INSTRUCTIONS:
${garmentSpecificInstruction}

${strictNegativeRule}

FRAMING REQUIREMENTS:
${framingInstruction}

FINAL POLISH & IMAGE EXCELLENCE:
- Commercial fashion-photo quality, photorealistic, shot on high-resolution camera with natural lighting.
- Realistic textile micro-textures, authentic fabric sheen, crisp embroidery/patterns, and natural shadows.
- Sharp facial details, natural skin texture, razor-sharp eyes, zero AI blurring, zero extra fingers/limbs.
- Original room background preserved seamlessly with authentic depth of field.`;
}

export class OpenAIVtonService {
  private client: OpenAI;
  private apiKey: string;
  private model: string;
  private quality: string;

  constructor() {
    this.apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
    this.model = config.OPENAI_IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
    this.quality = config.OPENAI_IMAGE_QUALITY || process.env.OPENAI_IMAGE_QUALITY || 'medium';

    const configured = !!this.apiKey;
    logger.info(`[OPENAI] Service initialized. Configured: ${configured}, Model: ${this.model}, Quality: ${this.quality}`);

    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  async processTryOn(input: OpenAITryOnInput): Promise<OpenAITryOnOutput> {
    // Section 8 Mandatory Logging: Start of Try-On
    logger.info(`TRYON_START`);
    logger.info(`OPENAI_CALL_COUNT=0`);

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

    // If garment image is missing or identical to user photo, extract clean fabric swatch locally via Sharp
    // Note: garmentExtractionService uses 100% local Sharp image processing (ZERO OpenAI calls).
    if (
      !finalGarmentPath ||
      !fs.existsSync(finalGarmentPath) ||
      path.resolve(finalGarmentPath) === path.resolve(input.userImagePath) ||
      !garmentDescription
    ) {
      logger.info(`[EXTRACTION] Extracting held garment swatch locally for category: ${garmentGender} • ${garmentCategory}...`);
      if (input.onProgress) input.onProgress(20, 'Preparing your garment reference...');
      const garmentInfo: ExtractedGarmentResult = await garmentExtractionService.extractGarmentInfo(
        input.userImagePath,
        input.category,
        input.gender
      );
      if (!finalGarmentPath || !fs.existsSync(finalGarmentPath) || path.resolve(finalGarmentPath) === path.resolve(input.userImagePath)) {
        finalGarmentPath = path.resolve(__dirname, '../../..', garmentInfo.garmentPath.replace(/^\//, ''));
      }
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

    try {
      if (input.onProgress) input.onProgress(35, 'Optimizing images and framing...');

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

      // Add top headroom so hair/face/glasses are preserved without cropping
      const topPad = 60;

      // Aspect ratio & resolution:
      // Full body (Saree, Dress, Pant, Kurtha): 1024x1536
      // Upper body (Shirt, T-Shirt): 1024x1024
      const targetAspect = isFullBodyGarment ? 1.5 : 1.0;
      const finalW = 1024;
      const finalH = isFullBodyGarment ? 1536 : 1024;
      const targetSize = `${finalW}x${finalH}`;

      // Crop horizontally if wide landscape camera frame
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

      // Geometry for exact aspect ratio
      const heightMultiplier = isFullBodyGarment ? 2.1 : 1.05;
      let targetH = Math.max(
        Math.round(cropW * targetAspect),
        Math.round((pHeight + topPad) * (isFullBodyGarment ? 1.4 : 1.0)),
        Math.round(pHeight * heightMultiplier)
      );

      let targetW = Math.round(targetH / targetAspect);
      if (targetW < cropW) {
        targetW = cropW;
        targetH = Math.round(targetW * targetAspect);
      }

      const padLeft = Math.floor((targetW - cropW) / 2);
      const padRight = targetW - cropW - padLeft;
      const padBottom = targetH - pHeight - topPad;

      // Section 6: Image Input Optimization
      // Token-optimized dimensions: reduces input tokens by ~44% while strictly preserving face/fabric details
      // Full-body person input: 768x1152 (2:3 portrait aspect ratio, crystal clear facial features & body proportions)
      // Upper-body person input: 768x768 (1:1 square)
      // Garment reference: max 768x768 inside box (preserves embroidery, prints, zari borders, texture)
      const inputPersonW = 768;
      const inputPersonH = isFullBodyGarment ? 1152 : 768;
      const inputGarmentMax = 768;

      // Prepare person and garment images in parallel to minimize CPU latency
      const [preparedPersonBuffer, garmentBuffer] = await Promise.all([
        sharp(cropped)
          .extend({
            top: topPad,
            bottom: Math.max(0, padBottom),
            left: Math.max(0, padLeft),
            right: Math.max(0, padRight),
            background: wallColor,
          })
          .resize(inputPersonW, inputPersonH, { fit: 'fill' })
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer(),
        sharp(finalGarmentPath)
          .resize(inputGarmentMax, inputGarmentMax, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer(),
      ]);

      const [personMetaOut, garmentMetaOut] = await Promise.all([
        sharp(preparedPersonBuffer).metadata(),
        sharp(garmentBuffer).metadata(),
      ]);
      const pInputW = personMetaOut.width || inputPersonW;
      const pInputH = personMetaOut.height || inputPersonH;
      const gInputW = garmentMetaOut.width || inputGarmentMax;
      const gInputH = garmentMetaOut.height || inputGarmentMax;

      // Convert buffers to OpenAI uploadable files in parallel
      const [personFile, garmentFile] = await Promise.all([
        toFile(preparedPersonBuffer, 'person.jpg', { type: 'image/jpeg' }),
        toFile(garmentBuffer, 'garment.jpg', { type: 'image/jpeg' }),
      ]);

      // Section 8 Mandatory Logging: Exactly formatted per audit requirements
      const requestStartTime = new Date().toISOString();
      logger.info(`OPENAI_CALL_COUNT=1`);
      logger.info(`OPENAI_MODEL=${this.model}`);
      logger.info(`OPENAI_QUALITY=${this.quality}`);
      logger.info(`OPENAI_SIZE=${targetSize}`);
      logger.info(`PERSON_INPUT_BYTES=${preparedPersonBuffer.length}`);
      logger.info(`GARMENT_INPUT_BYTES=${garmentBuffer.length}`);
      logger.info(`PERSON_IMAGE_DIMENSIONS=${pInputW}x${pInputH}`);
      logger.info(`GARMENT_IMAGE_DIMENSIONS=${gInputW}x${gInputH}`);
      // Legacy logs for backward compatibility with existing tests
      logger.info(`IMAGE_QUALITY=${this.quality}`);
      logger.info(`IMAGE_SIZE=${targetSize}`);
      logger.info(`INPUT_PERSON_SIZE=${preparedPersonBuffer.length} bytes (${pInputW}x${pInputH})`);
      logger.info(`INPUT_GARMENT_SIZE=${garmentBuffer.length} bytes (${gInputW}x${gInputH})`);
      logger.info(`OPENAI_REQUEST_START=${requestStartTime}`);

      if (input.onProgress) input.onProgress(50, `Transforming outfit with OpenAI (${this.model})...`);

      // Section 7 Cost Optimization: Exactly ONE call, n=1, strict image edit
      const response = await this.client.images.edit({
        model: this.model,
        image: [personFile, garmentFile],
        prompt: promptToUse,
        n: 1,
        quality: this.quality as any,
        size: targetSize as any,
        output_format: 'jpeg',
      });

      const requestEndTime = new Date().toISOString();
      // Section 8 Mandatory Logging: After receiving result
      logger.info(`OPENAI_REQUEST_END=${requestEndTime}`);
      logger.info(`OPENAI_CALL_COUNT=1`);
      if ((response as any).usage) {
        const usage = (response as any).usage;
        logger.info(`OPENAI_USAGE_INPUT_TOKENS=${usage.input_tokens || 0}`);
        logger.info(`OPENAI_USAGE_OUTPUT_TOKENS=${usage.output_tokens || 0}`);
        logger.info(`OPENAI_USAGE_TOTAL_TOKENS=${usage.total_tokens || 0}`);
      }
      logger.info(`TRYON_COMPLETE`);

      if (input.onProgress) input.onProgress(85, 'Processing transformed fashion photo...');

      const base64Data = response.data?.[0]?.b64_json;
      if (!base64Data) {
        throw new Error('OpenAI Image API did not return generated image data');
      }

      const generatedBuffer = Buffer.from(base64Data, 'base64');

      if (!generatedBuffer || generatedBuffer.length < 5000) {
        throw new Error('OpenAI returned an empty or corrupted image');
      }

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
