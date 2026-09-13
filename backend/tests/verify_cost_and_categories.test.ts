import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

let openAiImagesEditCalls: any[] = [];
let capturedLogs: string[] = [];

jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      images: {
        edit: jest.fn().mockImplementation((params) => {
          openAiImagesEditCalls.push(params);
          return Promise.resolve({
            data: [
              {
                b64_json: Buffer.from('mock_generated_image_bytes_over_5000_size_padding_1234567890'.repeat(100)).toString('base64'),
              },
            ],
            usage: {
              input_tokens: 1729,
              output_tokens: 1372,
              total_tokens: 3101,
            },
          });
        }),
      },
    })),
    toFile: jest.fn().mockResolvedValue({ name: 'test.jpg' }),
  };
});

import { openAiVtonService } from '../src/services/OpenAIVtonService';
import { logger } from '../src/utils/logger';

describe('Audit & Cost Optimization Verification Across All Categories', () => {
  let tempPersonPath: string;
  let tempGarmentPath: string;

  beforeAll(async () => {
    jest.spyOn(logger, 'info').mockImplementation((...args: any[]) => {
      capturedLogs.push(args.map(a => String(a)).join(' '));
    });

    const testDir = path.resolve(__dirname, '../uploads');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    tempPersonPath = path.join(testDir, 'test_audit_person.jpg');
    tempGarmentPath = path.join(testDir, 'test_audit_garment.jpg');

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
    capturedLogs = [];
  });

  const categories = [
    { gender: 'MEN', category: 'Shirt', expectedSize: '1024x1024' },
    { gender: 'MEN', category: 'T-Shirt', expectedSize: '1024x1024' },
    { gender: 'MEN', category: 'Pant', expectedSize: '1024x1536' },
    { gender: 'MEN', category: 'Kurtha', expectedSize: '1024x1536' },
    { gender: 'WOMEN', category: 'Saree', expectedSize: '1024x1536' },
    { gender: 'WOMEN', category: 'Dress', expectedSize: '1024x1536' },
  ];

  for (const tc of categories) {
    it(`should process ${tc.gender} • ${tc.category} with EXACTLY ONE call, medium quality, and complete audit logs`, async () => {
      const output = await openAiVtonService.processTryOn({
        generationId: `audit_${tc.gender}_${tc.category}`,
        userImagePath: tempPersonPath,
        garmentImagePath: tempGarmentPath,
        gender: tc.gender,
        category: tc.category,
      });

      expect(output.status).toBe('COMPLETED');
      expect(openAiImagesEditCalls.length).toBe(1);

      const call = openAiImagesEditCalls[0];
      expect(call.model).toBe('gpt-image-2');
      expect(call.quality).toBe('medium');
      expect(call.size).toBe(tc.expectedSize);
      expect(call.n).toBe(1);

      const logs = capturedLogs.join('\n');
      expect(logs).toContain('OPENAI_MODEL=gpt-image-2');
      expect(logs).toContain('OPENAI_QUALITY=medium');
      expect(logs).toContain(`OPENAI_SIZE=${tc.expectedSize}`);
      expect(logs).toContain('OPENAI_CALL_COUNT=1');
      expect(logs).toContain('PERSON_INPUT_BYTES=');
      expect(logs).toContain('GARMENT_INPUT_BYTES=');
      expect(logs).toContain('PERSON_IMAGE_DIMENSIONS=');
      expect(logs).toContain('GARMENT_IMAGE_DIMENSIONS=');
      expect(logs).toContain('OPENAI_USAGE_INPUT_TOKENS=1729');
      expect(logs).toContain('OPENAI_USAGE_OUTPUT_TOKENS=1372');
      expect(logs).toContain('OPENAI_USAGE_TOTAL_TOKENS=3101');
      expect(logs).toContain('TRYON_COMPLETE');
    });
  }
});
