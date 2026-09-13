import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface StorageProvider {
  saveFile(sourcePathOrBuffer: string | Buffer, targetFilename: string, subfolder: 'uploads' | 'generated'): Promise<string>;
  deleteFile(relativeFilePath: string): Promise<boolean>;
  getPublicUrl(relativeFilePath: string): string;
  getStorageDir(subfolder: 'uploads' | 'generated'): string;
}

class LocalStorageProvider implements StorageProvider {
  private uploadsDir: string;
  private generatedDir: string;

  constructor() {
    this.uploadsDir = path.resolve(__dirname, '../../../uploads');
    this.generatedDir = path.resolve(__dirname, '../../../generated');

    if (!fs.existsSync(this.uploadsDir)) fs.mkdirSync(this.uploadsDir, { recursive: true });
    if (!fs.existsSync(this.generatedDir)) fs.mkdirSync(this.generatedDir, { recursive: true });
  }

  getStorageDir(subfolder: 'uploads' | 'generated'): string {
    return subfolder === 'uploads' ? this.uploadsDir : this.generatedDir;
  }

  async saveFile(sourcePathOrBuffer: string | Buffer, targetFilename: string, subfolder: 'uploads' | 'generated'): Promise<string> {
    const targetDir = subfolder === 'uploads' ? this.uploadsDir : this.generatedDir;
    const destPath = path.join(targetDir, targetFilename);

    if (typeof sourcePathOrBuffer === 'string') {
      fs.copyFileSync(sourcePathOrBuffer, destPath);
    } else {
      fs.writeFileSync(destPath, sourcePathOrBuffer);
    }

    const relativePath = `/${subfolder}/${targetFilename}`;
    logger.info(`Saved file to local storage: ${relativePath}`);
    return relativePath;
  }

  async deleteFile(relativeFilePath: string): Promise<boolean> {
    try {
      const fullPath = path.resolve(__dirname, '../../..', relativeFilePath.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        logger.info(`Deleted file: ${relativeFilePath}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to delete file ${relativeFilePath}:`, error);
      return false;
    }
  }

  getPublicUrl(relativeFilePath: string): string {
    if (!relativeFilePath) return '';
    if (relativeFilePath.startsWith('http')) return relativeFilePath;
    return `${config.PUBLIC_BASE_URL.replace(/\/$/, '')}${relativeFilePath.startsWith('/') ? '' : '/'}${relativeFilePath}`;
  }
}

export const storageService = new LocalStorageProvider();
