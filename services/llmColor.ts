import { GoogleGenAI, Type } from '@google/genai';
import { BrickPiece } from '../types';
import { GEMINI_GENERATION_MODELS, runWithGeminiModelFallback } from './geminiModelFallback';

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';

const SYSTEM_PROMPT = `You are a color artist for LEGO models. The user will give you a model description and a list of bricks with ids and sizes. Return a mapping from brick id to a hex color (#RRGGBB) that paints the model attractively given the prompt — respect prompt-level color cues ("red chair" → mostly red), introduce slight tonal variation for visual interest, and keep adjacent bricks distinguishable. Output JSON only.`;

/**
 * Ask an LLM to color the given bricks for the given prompt.
 * Returns a partial map: brick id → hex string ("#RRGGBB").
 *
 * Provider auto-pickers: Gemini if Gemini key is provided; otherwise DeepSeek.
 * Caller passes the key for the chosen provider.
 */
export async function suggestColors(
  prompt: string,
  bricks: BrickPiece[],
  apiKey: string,
  provider: 'gemini' | 'deepseek',
): Promise<Record<string, string>> {
  if (!apiKey) {
    throw new Error('Missing API key for AI coloring.');
  }
  if (bricks.length === 0) return {};

  // Truncate to first 200 bricks to keep prompt within budget.
  const sample = bricks.slice(0, 200);
  const compact = sample.map((b) => `${b.id}:${b.sizeX}x${b.sizeY}@(${b.baseX},${b.baseY},${b.layer})`).join('\n');
  const userMessage = `Prompt: "${prompt || 'colorful model'}"\nBricks (${bricks.length} total, showing first ${sample.length}):\n${compact}\n\nReturn JSON: { "colors": { "<brick_id>": "#RRGGBB", ... } }. Cover every brick id listed.`;

  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey });
    const result = await runWithGeminiModelFallback(GEMINI_GENERATION_MODELS, (model) =>
      ai.models.generateContent({
        model,
        contents: `${SYSTEM_PROMPT}\n\n${userMessage}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              colors: {
                type: Type.OBJECT,
                description: 'Map from brick id to hex color string.',
                properties: {},
              },
            },
            required: ['colors'],
          },
          maxOutputTokens: 8192,
          temperature: 0.7,
        },
      }),
    );
    if (!result.text) throw new Error('Empty Gemini color response.');
    const parsed = JSON.parse(result.text);
    return normalizeColorMap(parsed.colors);
  }

  // DeepSeek
  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek color API error (${response.status}): ${text.slice(0, 200)}`);
  }
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty DeepSeek color response.');
  const parsed = JSON.parse(content);
  return normalizeColorMap(parsed.colors);
}

function normalizeColorMap(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    const match = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
    if (!match) continue;
    out[k] = `#${match[1]}`;
  }
  return out;
}
