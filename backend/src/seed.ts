import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed with garment reference images...');

  // 1. Seed Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@standee.com';
  const defaultPassword = 'admin123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      passwordHash,
    },
  });
  console.log(`✅ Admin user seeded: ${adminEmail} (password: ${defaultPassword})`);

  // 2. Seed Default Settings
  const defaultSettings = [
    { key: 'brandName', value: 'Royal AI Studio' },
    { key: 'welcomeTitle', value: 'AI DIGITAL STANDEE' },
    { key: 'welcomeSubtitle', value: 'Create Your AI Look' },
    { key: 'qrExpirationMinutes', value: '60' },
    { key: 'cleanupHours', value: '24' },
    { key: 'resultTimeoutSeconds', value: '60' },
  ];

  for (const s of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log('✅ Settings seeded');

  // 3. Seed Experiences
  const expSaree = await prisma.experience.upsert({
    where: { slug: 'ai-saree-tryon' },
    update: {},
    create: {
      slug: 'ai-saree-tryon',
      name: 'AI SAREE TRY-ON',
      description: 'See yourself in beautiful saree styles and vibrant silk drapes.',
      icon: 'Sparkles',
      enabled: true,
      order: 1,
    },
  });

  const expOutfit = await prisma.experience.upsert({
    where: { slug: 'ai-outfit-change' },
    update: {},
    create: {
      slug: 'ai-outfit-change',
      name: 'AI OUTFIT CHANGE',
      description: 'Transform your outfit into wedding suits, traditional sherwanis, or modern wear.',
      icon: 'Shirt',
      enabled: true,
      order: 2,
    },
  });

  const expPortrait = await prisma.experience.upsert({
    where: { slug: 'ai-portrait' },
    update: {},
    create: {
      slug: 'ai-portrait',
      name: 'AI PORTRAIT',
      description: 'Create a studio-quality royal portrait with lighting effects.',
      icon: 'UserCheck',
      enabled: true,
      order: 3,
    },
  });

  console.log('✅ Experiences seeded');

  // 4. Seed Styles for Saree Experience with garment reference images
  const sareeStyles = [
    {
      name: 'Pink Silk Saree',
      category: 'Sarees',
      thumbnailUrl: '/assets/sample-pink-saree.jpg',
      garmentImageUrl: '/assets/sample-pink-saree.jpg',
      prompt: 'A stunning Indian woman wearing a luxurious royal magenta pink Kanjivaram silk saree with golden zari embroidery, royal palace background, cinematic lighting, 8k photo',
      negativePrompt: 'blurry, low quality, deformed hands, distorted face',
      order: 1,
    },
    {
      name: 'Red Bridal Saree',
      category: 'Sarees',
      thumbnailUrl: '/assets/sample-red-saree.jpg',
      garmentImageUrl: '/assets/sample-red-saree.jpg',
      prompt: 'A graceful Indian woman in a rich crimson red bridal banarasi saree with intricate gold floral motif weave, elegant jewelry, festive grand wedding background',
      negativePrompt: 'blurry, distorted, dull colors',
      order: 2,
    },
    {
      name: 'Royal Blue Saree',
      category: 'Sarees',
      thumbnailUrl: '/assets/sample-blue-saree.jpg',
      garmentImageUrl: '/assets/sample-blue-saree.jpg',
      prompt: 'A glamorous woman wearing a deep royal blue designer chiffon saree with sparkling diamond border, luxury evening party setting, soft dramatic lighting',
      negativePrompt: 'oversaturated, blurry, bad anatomy',
      order: 3,
    },
    {
      name: 'Emerald Green Saree',
      category: 'Sarees',
      thumbnailUrl: '/assets/sample-green-saree.jpg',
      garmentImageUrl: '/assets/sample-green-saree.jpg',
      prompt: 'An elegant portrait of a woman wearing an emerald green tissue silk saree with Kundan neckpiece, heritage palace courtyard, soft morning glow',
      negativePrompt: 'low resolution, artifacts, extra limbs',
      order: 4,
    },
    {
      name: 'Traditional Temple Saree',
      category: 'Sarees',
      thumbnailUrl: '/assets/sample-traditional-saree.jpg',
      garmentImageUrl: '/assets/sample-traditional-saree.jpg',
      prompt: 'A traditional Indian woman wearing an authentic South Indian mustard yellow and maroon border silk saree with Temple gold jewelry',
      negativePrompt: 'modern clothes, western look, blurry',
      order: 5,
    },
    {
      name: 'Grand Wedding Saree',
      category: 'Sarees',
      thumbnailUrl: '/assets/sample-wedding-saree.jpg',
      garmentImageUrl: '/assets/sample-wedding-saree.jpg',
      prompt: 'High fashion bridal portrait in a heavy pastel peach organza saree with pearls and zardozi work, grand venue background',
      negativePrompt: 'cartoon, low quality',
      order: 6,
    },
  ];

  for (const s of sareeStyles) {
    const existing = await prisma.style.findFirst({
      where: { name: s.name, experienceId: expSaree.id },
    });
    if (!existing) {
      await prisma.style.create({
        data: {
          experienceId: expSaree.id,
          name: s.name,
          category: s.category,
          thumbnailUrl: s.thumbnailUrl,
          garmentImageUrl: s.garmentImageUrl,
          prompt: s.prompt,
          negativePrompt: s.negativePrompt,
          order: s.order,
          enabled: true,
        } as any,
      });
    } else {
      await prisma.style.update({
        where: { id: existing.id },
        data: { garmentImageUrl: s.garmentImageUrl } as any,
      });
    }
  }

  // 5. Seed Styles for Outfit Experience
  const outfitStyles = [
    {
      name: 'Royal Golden Sherwani',
      category: 'Traditional',
      thumbnailUrl: '/assets/sample-sherwani.jpg',
      garmentImageUrl: '/assets/sample-sherwani.jpg',
      prompt: 'A distinguished royal man in a heavily embroidered ivory and gold silk wedding sherwani, royal courtyard setting',
      negativePrompt: 'casual wear, jeans, low quality',
      order: 1,
    },
    {
      name: 'Velvet Black Tuxedo',
      category: 'Formal',
      thumbnailUrl: '/assets/sample-tuxedo.jpg',
      garmentImageUrl: '/assets/sample-tuxedo.jpg',
      prompt: 'A sharp gentleman in a tailored midnight black velvet tuxedo with satin lapel, red carpet gala backdrop',
      negativePrompt: 'wrinkled, messy hair',
      order: 2,
    },
    {
      name: 'Festive Indo-Western Suit',
      category: 'Modern',
      thumbnailUrl: '/assets/sample-indowestern.jpg',
      garmentImageUrl: '/assets/sample-indowestern.jpg',
      prompt: 'A modern fashion icon in an asymmetrical maroon indo-western jacket with gold buttons, luxury lounge atmosphere',
      negativePrompt: 'blurry, noise',
      order: 3,
    },
  ];

  for (const s of outfitStyles) {
    const existing = await prisma.style.findFirst({
      where: { name: s.name, experienceId: expOutfit.id },
    });
    if (!existing) {
      await prisma.style.create({
        data: {
          experienceId: expOutfit.id,
          name: s.name,
          category: s.category,
          thumbnailUrl: s.thumbnailUrl,
          garmentImageUrl: s.garmentImageUrl,
          prompt: s.prompt,
          negativePrompt: s.negativePrompt,
          order: s.order,
          enabled: true,
        } as any,
      });
    } else {
      await prisma.style.update({
        where: { id: existing.id },
        data: { garmentImageUrl: s.garmentImageUrl } as any,
      });
    }
  }

  // 6. Seed Styles for Portrait Experience
  const portraitStyles = [
    {
      name: 'Vogue Royal Cover Portrait',
      category: 'Portrait',
      thumbnailUrl: '/assets/sample-portrait.jpg',
      garmentImageUrl: '/assets/sample-portrait.jpg',
      prompt: 'A high-end editorial magazine cover portrait with golden hour Rembrandt lighting and smooth bokeh background',
      negativePrompt: 'amateur photo, harsh shadow',
      order: 1,
    },
  ];

  for (const s of portraitStyles) {
    const existing = await prisma.style.findFirst({
      where: { name: s.name, experienceId: expPortrait.id },
    });
    if (!existing) {
      await prisma.style.create({
        data: {
          experienceId: expPortrait.id,
          name: s.name,
          category: s.category,
          thumbnailUrl: s.thumbnailUrl,
          garmentImageUrl: s.garmentImageUrl,
          prompt: s.prompt,
          negativePrompt: s.negativePrompt,
          order: s.order,
          enabled: true,
        } as any,
      });
    } else {
      await prisma.style.update({
        where: { id: existing.id },
        data: { garmentImageUrl: s.garmentImageUrl } as any,
      });
    }
  }

  console.log('✅ Styles seeded with garment images successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
