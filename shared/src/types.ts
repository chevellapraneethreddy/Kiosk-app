export type GenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED';

export interface ExperienceDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon?: string;
  enabled: boolean;
  order: number;
}

export interface StyleDto {
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

export interface GenerationRequestInput {
  sessionId?: string;
  experienceId: string;
  styleId: string;
  originalImagePath: string;
  customPrompt?: string;
}

export interface GenerationDto {
  id: string;
  publicToken: string;
  sessionId?: string;
  experienceId: string;
  styleId: string;
  originalImagePath: string;
  generatedImagePath?: string;
  provider: string;
  providerJobId?: string;
  status: GenerationStatus;
  progress: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  style?: StyleDto;
  experience?: ExperienceDto;
}

export interface MobileSessionDto {
  sessionToken: string;
  uploadUrl: string;
  status: string;
  uploadedPhotoUrl?: string;
  expiresAt: string;
}

export interface AdminStatsDto {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  todayGenerations: number;
  topStyles: { name: string; count: number }[];
}

export interface AppHealthDto {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  aiProvider: string;
  version: string;
  timestamp: string;
}
