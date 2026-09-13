import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Mock OpenAI
let callCount = 0;
let lastCallParams: any = null;

jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      images: {
        edit: jest.fn().mockImplementation((params) => {
          callCount++;
          lastCallParams = params;
          return Promise.resolve({
            data: [
              {
                b64_json: Buffer.from('mock_result_image_over_5000_bytes_padding_1234567890'.repeat(100)).toString('base64'),
              },
            ],
          });
        }),
      },
    })),
    toFile: jest.fn().mockImplementation((buf, name, opts) => Promise.resolve({ name, size: buf.length })),
  };
});

import { openAiVtonService, buildOpenAITryOnPrompt } from '../src/services/OpenAIVtonService';
import { garmentExtractionService } from '../src/services/ai/GarmentExtractionService';
import { logger } from '../src/utils/logger';

describe('6-Category Pipeline Verification (MEN: Shirt, T-Shirt, Pant, Kurtha; WOMEN: Saree, Dress)', () => {
  let testPerson: string;
  let testGarment: string;
  let capturedLogs: string[] = [];

  beforeAll(async () => {
    const testDir = path.resolve(__dirname, '../uploads');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    testPerson = path.join(testDir, 'verify_cat_person.jpg');
    testGarment = path.join(testDir, 'verify_cat_garment.jpg');

    await sharp({
      create: { width: 900, height: 1300, channels: 3, background: { r: 215, g: 195, b: 180 } },
    }).jpeg().toFile(testPerson);

    await sharp({
      create: { width: 700, height: 700, channels: 3, background: { r: 180, g: 40, b: 60 } },
    }).jpeg().toFile(testGarment);

    jest.spyOn(logger, 'info').mockImplementation((...args: any[]) => {
      capturedLogs.push(args.map(a => String(a)).join(' '));
    });
  });

  afterAll(() => {
    if (fs.existsSync(testPerson)) fs.unlinkSync(testPerson);
    if (fs.existsSync(testGarment)) fs.unlinkSync(testGarment);
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    callCount = 0;
    lastCallParams = null;
    capturedLogs = [];
  });

  const categories = [
    { gender: 'MEN', category: 'Shirt', expectedSize: '1024x1024', mustContain: ['MEN • SHIRT', 'ACTUALLY WEARING this SAME physical shirt', 'DO NOT transfer the shirt pattern onto pants or legs', 'DO NOT generate a T-shirt, kurtha, saree or dress'] },
    { gender: 'MEN', category: 'T-Shirt', expectedSize: '1024x1024', mustContain: ['MEN • T-SHIRT', 'ACTUALLY WEARING this SAME physical T-shirt', 'DO NOT generate a shirt, kurtha, saree or dress'] },
    { gender: 'MEN', category: 'Pant', expectedSize: '1024x1536', mustContain: ['MEN • PANT', 'ACTUALLY WEARING this SAME physical pants/trousers', 'Do NOT transfer the pant pattern onto the shirt'] },
    { gender: 'MEN', category: 'Kurtha', expectedSize: '1024x1536', mustContain: ['MEN • KURTHA', 'ACTUALLY WEARING this SAME physical kurtha', 'extending naturally below the knees'] },
    { gender: 'WOMEN', category: 'Saree', expectedSize: '1024x1536', mustContain: ['WOMEN • SAREE', 'ACTUALLY WEARING this SAME physical saree', 'CREATE A REALISTIC TRADITIONAL SAREE DRAPE', 'PALLU DRAPE', 'MOST IMPORTANT: The person must NOT be shown holding the saree'] },
    { gender: 'WOMEN', category: 'Dress', expectedSize: '1024x1536', mustContain: ['WOMEN • DRESS', 'ACTUALLY WEARING this SAME physical dress', 'DO NOT generate a saree'] },
  ];

  for (const tc of categories) {
    it(`should process ${tc.gender} → ${tc.category} with EXACTLY ONE OpenAI call and correct parameters`, async () => {
      // 1. Validation (0 AI calls)
      const val = await garmentExtractionService.validateGarmentAgainstCategory(testPerson, tc.gender, tc.category);
      expect(val.valid).toBe(true);
      expect(val.conflict).toBe(false);

      // 2. Swatch extraction (0 AI calls)
      const ext = await garmentExtractionService.extractGarmentInfo(testPerson, tc.category, tc.gender);
      expect(ext.garmentPath).toBeDefined();

      // 3. Virtual Try-on (EXACTLY 1 OpenAI call)
      const res = await openAiVtonService.processTryOn({
        generationId: `verify_${tc.gender}_${tc.category}`,
        userImagePath: testPerson,
        garmentImagePath: testGarment,
        gender: tc.gender,
        category: tc.category,
      });

      expect(res.status).toBe('COMPLETED');
      expect(callCount).toBe(1);

      // Verify parameters
      expect(lastCallParams.n).toBe(1);
      expect(lastCallParams.size).toBe(tc.expectedSize);

      // Verify prompt constraints
      const prompt = lastCallParams.prompt;
      for (const reqText of tc.mustContain) {
        expect(prompt).toContain(reqText);
      }
      expect(prompt).toContain('Hands and arms holding the garment must NOT remain in the final result');
      expect(prompt).toContain('normal relaxed pose');
      expect(prompt).toContain('Do NOT simply paste the garment onto the original image');

      // Verify logs
      const fullLogs = capturedLogs.join('\n');
      expect(fullLogs).toContain('TRYON_START');
      expect(fullLogs).toContain('OPENAI_CALL_COUNT=0');
      expect(fullLogs).toContain('OPENAI_CALL_COUNT=1');
      expect(fullLogs).toContain('OPENAI_REQUEST_START=');
      expect(fullLogs).toContain('OPENAI_REQUEST_END=');
      expect(fullLogs).toContain('TRYON_COMPLETE');
      expect(fullLogs).toContain('INPUT_PERSON_SIZE=');
      expect(fullLogs).toContain('INPUT_GARMENT_SIZE=');
    });
  }
});
