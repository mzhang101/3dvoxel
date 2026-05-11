import { VoxelData, BrickPiece } from '../../types';
import { GeneratorAdapter, GenerationOptions } from './index';
import { loadBenchmarks, findByPrompt } from '../../utils/benchmarkData';
import { parseImportedModel, parseBrickPieces } from '../../utils/modelImport';

/**
 * Returns precomputed Geo3D GRPO bricks (best-of-4 by validity_score) for a
 * known test-set prompt. Requires no API key — purely a local lookup.
 *
 * After a successful generate(), `lastBrickText` holds the original
 * brick-line text so the caller can run brick-level constraint checks via
 * `parseBrickData` from `utils/constraintEvaluator`.
 */
export class LocalBenchmarkGenerator implements GeneratorAdapter {
  readonly name = 'Geo3D GRPO';
  lastBrickText: string | null = null;
  lastBricks: BrickPiece[] | null = null;

  async generate(prompt: string, _apiKey: string, _opts?: GenerationOptions): Promise<VoxelData[]> {
    const entries = await loadBenchmarks();
    const hit = findByPrompt(prompt, entries);
    if (!hit) {
      throw new Error('No GRPO benchmark exists for this prompt. Open the Benchmark picker to choose one.');
    }
    this.lastBrickText = hit.best.text_response;
    this.lastBricks = parseBrickPieces(hit.best.text_response);
    return parseImportedModel(hit.best.text_response);
  }
}
