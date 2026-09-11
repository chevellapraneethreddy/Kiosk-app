import { AIProvider } from './AIProvider';
import { DecartAIProvider } from './DecartAIProvider';
import { logger } from '../../utils/logger';

export function getAIProvider(): AIProvider {
  logger.info('Resolving active AI Provider: Decart (Lucy Virtual Try-On 3.5)');
  return new DecartAIProvider();
}
