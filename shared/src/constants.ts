export const PROGRESS_MESSAGES = [
  "Preparing your garment...",
  "Uploading your images...",
  "AI is creating your virtual try-on...",
  "Finalizing your result..."
];

export const DEFAULT_KIOSK_CONFIG = {
  welcomeTitle: "AI DIGITAL STANDEE",
  welcomeSubtitle: "Create Your AI Look in Seconds",
  brandName: "Royal AI Studio",
  inactivityTimeoutSeconds: 120,
  resultTimeoutSeconds: 60,
  maxUploadSizeBytes: 15 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]
};
