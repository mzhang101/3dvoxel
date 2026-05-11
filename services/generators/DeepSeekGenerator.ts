import { VoxelData, BrickPiece } from '../../types';
import { GeneratorAdapter, GenerationOptions } from './index';
import { parseBrickLines, parseBrickPieces } from '../../utils/modelImport';
import { ALLOWED_BRICKS_LIST } from '../../utils/brickLibrary';

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MAX_TOKENS = 32768; // V4 caps at 384K; 32K is ample headroom for ~2K bricks
const DEEPSEEK_TEMPERATURE = 1.0;

const SYSTEM_PROMPT = `Create a LEGO model of the input. Format your response as a list of bricks: <brick dimensions> <brick position>, where the brick position is (x,y,layer).
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

Output JSON only, no prose.`;

export class DeepSeekGenerator implements GeneratorAdapter {
  readonly name: string;
  lastBrickText: string | null = null;
  lastBricks: BrickPiece[] | null = null;

  constructor(private modelId: string, displayName: string = 'DeepSeek') {
    this.name = displayName;
  }

  async generate(prompt: string, apiKey: string, opts?: GenerationOptions): Promise<VoxelData[]> {
    if (!apiKey) {
      throw new Error('Missing DeepSeek API key.');
    }

    const userMessage = `### Input:\n${prompt}\n\nReturn JSON in the form { "bricks": "<brick-line text>" }.`;

    const response = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelId,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: DEEPSEEK_TEMPERATURE,
        max_tokens: DEEPSEEK_MAX_TOKENS,
        stream: true,
      }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = await response.json();
        detail = errBody?.error?.message || errBody?.message || JSON.stringify(errBody);
      } catch {
        detail = await response.text();
      }
      throw new Error(`DeepSeek API error (${response.status}): ${detail}`);
    }

    const content = await readSseContent(response, opts?.onProgress);

    let parsed: { bricks?: string };
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new Error(`DeepSeek response was not valid JSON: ${(err as Error).message}`);
    }

    const brickText = parsed.bricks;
    if (!brickText || typeof brickText !== 'string') {
      throw new Error('DeepSeek response did not contain a "bricks" string field.');
    }

    this.lastBrickText = brickText;
    this.lastBricks = parseBrickPieces(brickText);
    return parseBrickLines(brickText);
  }
}

/**
 * Consume a DeepSeek SSE chat-completion stream. Returns the concatenated
 * `choices[0].delta.content` string and fires onProgress every 50ms with a
 * cumulative {chars, lines, tail} snapshot.
 */
async function readSseContent(
  response: Response,
  onProgress?: (p: { chars: number; lines: number; tail: string }) => void,
): Promise<string> {
  if (!response.body) {
    throw new Error('DeepSeek returned an empty response body.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulated = '';
  let leftover = '';
  let lastProgressAt = 0;
  const PROGRESS_INTERVAL_MS = 50;

  const fireProgress = (force = false) => {
    if (!onProgress) return;
    const now = Date.now();
    if (!force && now - lastProgressAt < PROGRESS_INTERVAL_MS) return;
    lastProgressAt = now;
    onProgress({
      chars: accumulated.length,
      lines: (accumulated.match(/\\n/g)?.length ?? 0) + (accumulated.match(/\n/g)?.length ?? 0),
      tail: accumulated.slice(-200),
    });
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    leftover += decoder.decode(value, { stream: true });
    const events = leftover.split(/\r?\n\r?\n/);
    leftover = events.pop() ?? '';
    for (const evt of events) {
      const dataLine = evt.split(/\r?\n/).find((line) => line.startsWith('data:'));
      if (!dataLine) continue;
      const payload = dataLine.slice('data:'.length).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const piece = parsed.choices?.[0]?.delta?.content;
        if (piece) {
          accumulated += piece;
          fireProgress();
        }
      } catch {
        // skip malformed event
      }
    }
  }
  fireProgress(true);
  if (!accumulated) {
    throw new Error('DeepSeek returned an empty response.');
  }
  return accumulated;
}
