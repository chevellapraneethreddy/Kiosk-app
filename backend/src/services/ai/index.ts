import { AIProvider } from './AIProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { logger } from '../../utils/logger';

export function getAIProvider(): AIProvider {
  logger.info('Resolving active AI Provider: OpenAI');
  return new OpenAIProvider();
}
