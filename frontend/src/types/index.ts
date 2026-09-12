export type GenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Experience {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon?: string;
  enabled: boolean;
  order: number;
  styles?: Style[];
}

export interface Style {
  id: string;
  experienceId: string;
  name: string;
  category: string;
  thumbnailUrl: string;
  garmentImageUrl?: string;
  prompt: string;
  negativePrompt?: string;
  enabled: boolean;
  order: number;
}

export interface Generation {
  id: string;
  publicToken: string;
  sessionId?: string;
  experienceId?: string;
  styleId?: string;
  originalImagePath: string;
  garmentImagePath?: string;
  generatedImagePath?: string;
  provider: string;
  status: GenerationStatus;
  progress: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  style?: Style;
  experience?: Experience;
}

export interface SessionResponse {
  session: {
    id: string;
    sessionToken: string;
    status: string;
    uploadedPhotoUrl?: string;
  };
  mobileUploadUrl: string;
  qrDataUrl: string;
  lanUploadUrl?: string;
  lanQrDataUrl?: string;
  isTunnel?: boolean;
}

export interface ResultResponse {
  generation: Generation;
  publicResultUrl: string;
  qrDataUrl: string;
  lanResultUrl?: string;
  lanQrDataUrl?: string;
  isTunnel?: boolean;
}

export interface AdminStats {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  todayGenerations: number;
  topStyles: { name: string; count: number }[];
}
