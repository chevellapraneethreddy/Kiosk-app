import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Track calls to OpenAI
let openAiImagesEditCalls: any[] = [];
let openAiChatCalls: any[] = [];

jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      images: {
        edit: jest.fn().mockImplementation((params) => {
          openAiImagesEditCalls.push(params);
          return Promise.resolve({
            data: [
              {
                b64_json: Buffer.from('mock_generated_image_bytes_over_5000_size_padding_long_string_1234567890'.repeat(100)).toString('base64'),
              },
            ],
          });
        }),
      },
      chat: {
        completions: {
          create: jest.fn().mockImplementation((params) => {
            openAiChatCalls.push(params);
            return Promise.resolve({ choices: [] });
          }),
        },
      },
    })),
    toFile: jest.fn().mockResolvedValue({ name: 'test.jpg' }),
  };
});

import { openAiVtonService, buildOpenAITryOnPrompt } from '../src/services/OpenAIVtonService';
import { garmentExtractionService } from '../src/services/ai/GarmentExtractionService';
import { logger } from '../src/utils/logger';

describe('URGENT: Single-Request Try-On & Strict Category Pipeline Tests', () => {
  let tempPersonPath: string;
  let tempGarmentPath: string;
  let loggedMessages: string[] = [];

  beforeAll(async () => {
    // Intercept logger messages for validation
    jest.spyOn(logger, 'info').mockImplementation((...args: any[]) => {
      loggedMessages.push(args.map(a => String(a)).join(' '));
    });

    // Create valid test JPEG files for person and garment
    const testDir = path.resolve(__dirname, '../uploads');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    tempPersonPath = path.join(testDir, 'test_single_call_person.jpg');
    tempGarmentPath = path.join(testDir, 'test_single_call_garment.jpg');

    const personBuffer = await sharp({
      create: { width: 800, height: 1200, channels: 3, background: { r: 210, g: 190, b: 180 } },
    }).jpeg().toBuffer();

    const garmentBuffer = await sharp({
      create: { width: 600, height: 600, channels: 3, background: { r: 50, g: 100, b: 200 } },
    }).jpeg().toBuffer();

    fs.writeFileSync(tempPersonPath, personBuffer);
    fs.writeFileSync(tempGarmentPath, garmentBuffer);
  });

  afterAll(() => {
    if (fs.existsSync(tempPersonPath)) fs.unlinkSync(tempPersonPath);
    if (fs.existsSync(tempGarmentPath)) fs.unlinkSync(tempGarmentPath);
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    openAiImagesEditCalls = [];
    openAiChatCalls = [];
    loggedMessages = [];
  });

  it('1. MUST make EXACTLY ONE OpenAI image API request per try-on', async () => {
    const output = await openAiVtonService.processTryOn({
      generationId: 'test_gen_single_call_1',
      userImagePath: tempPersonPath,
      garmentImagePath: tempGarmentPath,
      gender: 'MEN',
      category: 'Shirt',
    });

    expect(output.status).toBe('COMPLETED');
    expect(output.resultUrl).toBeDefined();

    // Verify EXACTLY ONE OpenAI images.edit call
    expect(openAiImagesEditCalls.length).toBe(1);

    // Verify ZERO Chat Completions calls
    expect(openAiChatCalls.length).toBe(0);

    // Verify parameters passed to images.edit
    const callParams = openAiImagesEditCalls[0];
    expect(callParams.n).toBe(1);
    expect(callParams.model).toBeDefined();
    expect(callParams.quality).toBeDefined();
    expect(callParams.size).toBe('1024x1024'); // Upper body shirt
    expect(Array.isArray(callParams.image)).toBe(true);
    expect(callParams.image.length).toBe(2);
  });

  it('2. MUST produce exact required structured logs', async () => {
    await openAiVtonService.processTryOn({
      generationId: 'test_gen_single_call_logging',
      userImagePath: tempPersonPath,
      garmentImagePath: tempGarmentPath,
      gender: 'WOMEN',
      category: 'Saree',
    });

    const allLogs = loggedMessages.join('\n');

    // Section 8 Mandatory logs
    expect(allLogs).toContain('TRYON_START');
    expect(allLogs).toContain('OPENAI_CALL_COUNT=0');
    expect(allLogs).toContain('OPENAI_CALL_COUNT=1');
    expect(allLogs).toContain('OPENAI_MODEL=');
    expect(allLogs).toContain('OPENAI_QUALITY=');
    expect(allLogs).toContain('OPENAI_SIZE=');
    expect(allLogs).toContain('PERSON_INPUT_BYTES=');
    expect(allLogs).toContain('GARMENT_INPUT_BYTES=');
    expect(allLogs).toContain('PERSON_IMAGE_DIMENSIONS=');
    expect(allLogs).toContain('GARMENT_IMAGE_DIMENSIONS=');
    expect(allLogs).toContain('IMAGE_QUALITY=');
    expect(allLogs).toContain('IMAGE_SIZE=');
    expect(allLogs).toContain('INPUT_PERSON_SIZE=');
    expect(allLogs).toContain('INPUT_GARMENT_SIZE=');
    expect(allLogs).toContain('OPENAI_REQUEST_START=');
    expect(allLogs).toContain('OPENAI_REQUEST_END=');
    expect(allLogs).toContain('TRYON_COMPLETE');

    // Must never log API key
    expect(allLogs).not.toContain('sk-proj-');
    expect(allLogs).not.toContain('OPENAI_API_KEY=sk-');
  });

  it('3. GarmentExtractionService must run 100% locally with 0 OpenAI calls', async () => {
    const res = await garmentExtractionService.extractGarmentInfo(tempPersonPath, 'Saree', 'WOMEN');
    expect(res.category).toBe('saree');
    expect(res.garmentPath).toBeDefined();
    expect(openAiChatCalls.length).toBe(0);
    expect(openAiImagesEditCalls.length).toBe(0);

    const validation = await garmentExtractionService.validateGarmentAgainstCategory(tempPersonPath, 'WOMEN', 'Saree');
    expect(validation.valid).toBe(true);
    expect(validation.conflict).toBe(false);
    expect(openAiChatCalls.length).toBe(0);
    expect(openAiImagesEditCalls.length).toBe(0);
  });

  describe('4. Strict Category Prompt Rules (All 6 Required Categories)', () => {
    it('MEN + Shirt: correct constraints, upper body size 1024x1024, relaxed hands', () => {
      const prompt = buildOpenAITryOnPrompt('Shirt', 'checks', undefined, 'MEN');
      expect(prompt).toContain('MEN • SHIRT');
      expect(prompt).toContain('ACTUALLY WEARING this SAME physical shirt');
      expect(prompt).toContain('DO NOT transfer the shirt pattern onto pants or legs');
      expect(prompt).toContain('DO NOT generate a T-shirt, kurtha, saree or dress');
      expect(prompt).toContain('Hands and arms holding the garment must NOT remain in the final result');
      expect(prompt).toContain('normal relaxed pose');
      expect(prompt).toContain('Do NOT simply paste the garment onto the original image');
    });

    it('MEN + T-Shirt: correct constraints, upper body size 1024x1024, relaxed hands', () => {
      const prompt = buildOpenAITryOnPrompt('T-Shirt', 'cotton print', undefined, 'MEN');
      expect(prompt).toContain('MEN • T-SHIRT');
      expect(prompt).toContain('ACTUALLY WEARING this SAME physical T-shirt');
      expect(prompt).toContain('DO NOT generate a shirt, kurtha, saree or dress');
      expect(prompt).toContain('DO NOT transfer the t-shirt pattern onto pants or legs');
      expect(prompt).toContain('Hands and arms holding the garment must NOT remain in the final result');
    });

    it('MEN + Pant: correct lower body constraints, separate top, relaxed hands', () => {
      const prompt = buildOpenAITryOnPrompt('Pant', 'denim wash', undefined, 'MEN');
      expect(prompt).toContain('MEN • PANT');
      expect(prompt).toContain('ACTUALLY WEARING this SAME physical pants/trousers');
      expect(prompt).toContain('Do NOT transfer the pant pattern onto the shirt');
      expect(prompt).toContain('DO NOT generate a saree or dress');
      expect(prompt).toContain('Hands and arms holding the garment must NOT remain in the final result');
    });

    it('MEN + Kurtha: classic long kurtha below knees, mandarin collar, relaxed hands', () => {
      const prompt = buildOpenAITryOnPrompt('Kurtha', 'silk embroidery', undefined, 'MEN');
      expect(prompt).toContain('MEN • KURTHA');
      expect(prompt).toContain('ACTUALLY WEARING this SAME physical kurtha');
      expect(prompt).toContain('DO NOT generate a shirt, T-shirt, saree or dress');
      expect(prompt).toContain('extending naturally below the knees');
      expect(prompt).toContain('Hands and arms holding the garment must NOT remain in the final result');
    });

    it('WOMEN + Saree: authentic drape, pallu, pleats, blouse, NOT holding saree', () => {
      const prompt = buildOpenAITryOnPrompt('Saree', 'zari silk', undefined, 'WOMEN');
      expect(prompt).toContain('WOMEN • SAREE');
      expect(prompt).toContain('ACTUALLY WEARING this SAME physical saree');
      expect(prompt).toContain('CREATE A REALISTIC TRADITIONAL SAREE DRAPE');
      expect(prompt).toContain('PALLU DRAPE');
      expect(prompt).toContain('WAIST & FRONT PLEATS');
      expect(prompt).toContain('MATCHING BLOUSE');
      expect(prompt).toContain('DO NOT generate a western dress');
      expect(prompt).toContain('MOST IMPORTANT: The person must NOT be shown holding the saree');
      expect(prompt).toContain('Hands and arms holding the garment must NOT remain in the final result');
    });

    it('WOMEN + Dress: full-length dress, tailored silhouette, relaxed hands', () => {
      const prompt = buildOpenAITryOnPrompt('Dress', 'floral satin', undefined, 'WOMEN');
      expect(prompt).toContain('WOMEN • DRESS');
      expect(prompt).toContain('ACTUALLY WEARING this SAME physical dress');
      expect(prompt).toContain('DO NOT generate a saree');
      expect(prompt).toContain('DO NOT generate a shirt');
      expect(prompt).toContain('The person must NOT still be holding the garment');
      expect(prompt).toContain('Hands and arms holding the garment must NOT remain in the final result');
    });
  });

  it('5. Full-Body garments use 1024x1536 resolution', async () => {
    await openAiVtonService.processTryOn({
      generationId: 'test_gen_full_body_resolution',
      userImagePath: tempPersonPath,
      garmentImagePath: tempGarmentPath,
      gender: 'WOMEN',
      category: 'Saree',
    });

    expect(openAiImagesEditCalls.length).toBe(1);
    expect(openAiImagesEditCalls[0].size).toBe('1024x1536');
  });
});
