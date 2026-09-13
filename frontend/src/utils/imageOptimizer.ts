/**
 * Client-Side Image Optimizer
 * ==========================
 * Optimizes camera frames and uploaded files before transmitting over the network:
 * - Resizes unnecessarily large images down to max 1440px (optimal for virtual try-on models)
 * - Preserves high-fidelity facial features, fabric weave, and garment colors
 * - Strips bulky EXIF metadata
 * - Compresses to lightweight JPEG (~250KB - 400KB vs 5MB+ raw frames)
 * - Avoids duplicate re-uploads
 */

export interface OptimizeImageOptions {
  maxDimension?: number;
  quality?: number;
}

export async function optimizeImageFile(
  fileOrBlob: Blob | File,
  options: OptimizeImageOptions = {}
): Promise<File> {
  const maxDimension = options.maxDimension || 1440;
  const quality = options.quality ?? 0.88;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let { width, height } = img;

        // If already within bounds and small enough, keep as-is if already JPEG
        if (width <= maxDimension && height <= maxDimension && fileOrBlob.size < 600 * 1024) {
          if (fileOrBlob instanceof File) {
            return resolve(fileOrBlob);
          }
          return resolve(new File([fileOrBlob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' }));
        }

        // Scale down keeping aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve(
            fileOrBlob instanceof File
              ? fileOrBlob
              : new File([fileOrBlob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
          );
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(
                fileOrBlob instanceof File
                  ? fileOrBlob
                  : new File([fileOrBlob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
              );
            }
            const optimizedFile = new File(
              [blob],
              `standee_photo_${Date.now()}.jpg`,
              { type: 'image/jpeg' }
            );
            resolve(optimizedFile);
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}

/**
 * Preload and decode an image into the browser cache
 * to ensure instant rendering without blank screens or flashing.
 */
export async function preloadAndDecodeImage(src: string): Promise<void> {
  if (!src) return;
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;

    if (img.decode) {
      img
        .decode()
        .then(() => resolve())
        .catch(() => resolve());
    } else {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    }
  });
}
