import { VoxelData } from '../../types';
import { getGeminiModelOption, normalizeGeneratorSelection } from './catalog';

export interface GeneratorAdapter {
  readonly name: string;
  generate(prompt: string, apiKey: string): Promise<VoxelData[]>;
}

export { GeminiGenerator } from './GeminiGenerator';
export { MockGenerator } from './MockGenerator';

const registry: Record<string, () => GeneratorAdapter> = {};

export function registerGenerator(key: string, factory: () => GeneratorAdapter) {
  registry[key] = factory;
}

export function getGenerator(key: string): GeneratorAdapter {
  const normalizedKey = normalizeGeneratorSelection(key);
  const geminiOption = getGeminiModelOption(normalizedKey);
  if (geminiOption) {
    return new GeminiGenerator(geminiOption.modelCandidates);
  }

  const factory = registry[normalizedKey];
  if (!factory) throw new Error(`Generator "${key}" is not registered.`);
  return factory();
}

// Register built-in generators at import time
import { GeminiGenerator } from './GeminiGenerator';
import { MockGenerator } from './MockGenerator';

registerGenerator('gemini', () => new GeminiGenerator());
registerGenerator('brickgpt', () => { throw new Error('BrickGPT generator is not yet implemented.'); });
registerGenerator('voxelAI model', () => { throw new Error('VoxelAI model generator is not yet implemented.'); });
registerGenerator('自定义', () => { throw new Error('Custom generator is not yet configured.'); });
registerGenerator('mock', () => new MockGenerator());
