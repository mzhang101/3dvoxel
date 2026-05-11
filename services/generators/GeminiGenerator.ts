import { GoogleGenAI, Type } from '@google/genai';
import { VoxelData, BrickPiece } from '../../types';
import { GeneratorAdapter, GenerationOptions } from './index';
import { GEMINI_GENERATION_MODELS, runWithGeminiModelFallback } from '../geminiModelFallback';
import { parseBrickLines, parseBrickPieces } from '../../utils/modelImport';
import { ALLOWED_BRICKS_LIST } from '../../utils/brickLibrary';

const GEMINI_MAX_OUTPUT_TOKENS = 65536; // 2.5 Flash / 2.5 Pro upper bound
const GEMINI_TEMPERATURE = 1.0;

const SYSTEM_INSTRUCTIONS = `Create a LEGO model of the input. Format your response as a list of bricks: <brick dimensions> <brick position>, where the brick position is (x,y,layer).
Allowed brick dimensions are ${ALLOWED_BRICKS_LIST}.
All bricks are 1 unit tall. Do not include colors — coloring is handled automatically by brick size.
Use the 0..19 range for x, y, and layer. Layer 0 is the floor.

Quality requirements (NON-NEGOTIABLE):
- The model MUST contain at least 60 bricks. Outputs with fewer than 40 bricks look empty and will be rejected.
- Use at least 4 distinct layers — flat single-layer outputs are NOT acceptable.
- Build the actual silhouette of the subject with recognisable features. Reference brick counts:
    * Furniture (chair, table, lamp): 60–120 bricks. A chair has legs (8–16), a seat (20–30), and a back (20–30).
    * Buildings / structures: 120–250 bricks. Include a base, walls with thickness, and a roof.
    * Characters / animals: 80–200 bricks. Build legs, body, head, and features (ears, tail, etc).
    * Vehicles: 80–200 bricks. Build chassis, wheels, body, and details.
- Connect every brick to the rest of the model (no floating chunks).
- Prefer mid-size bricks (2×4, 2×6, 4×2, 6×2) for body mass; use 1×1 / 1×2 for fine details.

Return JSON with a "bricks" string field containing one brick per line.`;

export class GeminiGenerator implements GeneratorAdapter {
  readonly name = 'gemini';
  lastBrickText: string | null = null;
  lastBricks: BrickPiece[] | null = null;

  constructor(private modelCandidates: readonly string[] = GEMINI_GENERATION_MODELS) {}

  async generate(prompt: string, apiKey: string, opts?: GenerationOptions): Promise<VoxelData[]> {
    const ai = new GoogleGenAI({ apiKey });

    const userMessage = `${SYSTEM_INSTRUCTIONS}\n\n### Input:\n${prompt}`;

    const accumulated = await runWithGeminiModelFallback(this.modelCandidates, async (model) => {
      const stream = await ai.models.generateContentStream({
        model,
        contents: userMessage,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bricks: {
                type: Type.STRING,
                description: 'Newline-separated brick-line text. Each line: "<sx>x<sy> (x,y,layer)".',
              },
            },
            required: ['bricks'],
          },
          maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
          temperature: GEMINI_TEMPERATURE,
        },
      });

      let buf = '';
      let lastProgressAt = 0;
      const PROGRESS_INTERVAL_MS = 50;
      for await (const chunk of stream) {
        const piece = (chunk as { text?: string }).text;
        if (!piece) continue;
        buf += piece;
        if (opts?.onProgress) {
          const now = Date.now();
          if (now - lastProgressAt >= PROGRESS_INTERVAL_MS) {
            lastProgressAt = now;
            opts.onProgress({
              chars: buf.length,
              lines: (buf.match(/\\n/g)?.length ?? 0) + (buf.match(/\n/g)?.length ?? 0),
              tail: buf.slice(-200),
            });
          }
        }
      }
      if (opts?.onProgress) {
        opts.onProgress({
          chars: buf.length,
          lines: (buf.match(/\\n/g)?.length ?? 0) + (buf.match(/\n/g)?.length ?? 0),
          tail: buf.slice(-200),
        });
      }
      return { text: buf };
    });

    if (!accumulated.text) {
      throw new Error('Model returned an empty response.');
    }

    let parsed: { bricks?: string };
    try {
      parsed = JSON.parse(accumulated.text);
    } catch (err) {
      throw new Error(`Gemini response was not valid JSON: ${(err as Error).message}`);
    }

    const brickText = parsed.bricks;
    if (!brickText || typeof brickText !== 'string') {
      throw new Error('Gemini response did not contain a "bricks" string field.');
    }

    this.lastBrickText = brickText;
    this.lastBricks = parseBrickPieces(brickText);
    return parseBrickLines(brickText);
  }
}
