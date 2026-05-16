import { VoxelData, BrickPiece } from '../../types';
import { getGeminiModelOption, getDeepSeekModelOption, normalizeGeneratorSelection } from './catalog';

export interface GenerationProgress {
  /** Total characters streamed so far. */
  chars: number;
  /** Best-effort count of complete brick-line rows seen so far. */
  lines: number;
  /** Last ~200 chars of the stream, for live preview. */
  tail: string;
}

export interface GenerationOptions {
  onProgress?: (progress: GenerationProgress) => void;
  /** Abort signal; if aborted, the generator should bail out ASAP. */
  signal?: AbortSignal;
}

export interface GeneratorAdapter {
  readonly name: string;
  generate(prompt: string, apiKey: string, opts?: GenerationOptions): Promise<VoxelData[]>;
  /**
   * brick-line text from the last successful generate() call, if the generator
   * produces bricks (Gemini, DeepSeek, LocalBenchmark). Enables brick-level
   * constraint evaluation in the caller without an instanceof check.
   */
  lastBrickText?: string | null;
  /**
   * Parsed BrickPiece[] from the last successful generate() call. Lets the
   * caller render via the brick mesh library instead of expanded voxels.
   */
  lastBricks?: BrickPiece[] | null;
}

export { GeminiGenerator } from './GeminiGenerator';
export { MockGenerator } from './MockGenerator';
export { DeepSeekGenerator } from './DeepSeekGenerator';
export { LocalBenchmarkGenerator } from './LocalBenchmarkGenerator';

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

  const deepseekOption = getDeepSeekModelOption(normalizedKey);
  if (deepseekOption) {
    return new DeepSeekGenerator(deepseekOption.apiId ?? 'deepseek-v4-flash', `DeepSeek ${deepseekOption.label}`);
  }

  const factory = registry[normalizedKey];
  if (!factory) throw new Error(`Generator "${key}" is not registered.`);
  return factory();
}

// Register built-in generators at import time
import { GeminiGenerator } from './GeminiGenerator';
import { MockGenerator } from './MockGenerator';
import { DeepSeekGenerator } from './DeepSeekGenerator';
import { LocalBenchmarkGenerator } from './LocalBenchmarkGenerator';

registerGenerator('gemini', () => new GeminiGenerator());
registerGenerator('deepseek', () => new DeepSeekGenerator('deepseek-v4-flash', 'DeepSeek'));
registerGenerator('geo3d-grpo', () => new LocalBenchmarkGenerator());
registerGenerator('brickgpt', () => { throw new Error('BrickGPT generator is not yet implemented.'); });
registerGenerator('voxelAI model', () => { throw new Error('VoxelAI model generator is not yet implemented.'); });
registerGenerator('自定义', () => { throw new Error('Custom generator is not yet configured.'); });
registerGenerator('mock', () => new MockGenerator());
