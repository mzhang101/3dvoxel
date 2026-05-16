/**
 * Geo3D GRPO benchmark loader.
 *
 * Lazily fetches the test-set prompts (`data/test_prompts.jsonl`) and the
 * GRPO inference dump (`data/grpo_results.json`), zips them by index, and
 * picks the best-of-4 sample by validity_score (tiebreak: voxel_score).
 *
 * The result is cached at module scope so the picker opens instantly after
 * the first use.
 */

// Vite static-asset imports. Ambient declarations live in `vite-env.d.ts`.
import promptsUrl from '../data/test_prompts.jsonl?url';
import grpoUrl from '../data/grpo_results.json?url';

export interface GrpoResponse {
  text_response: string;
  validity_score: number;
  voxel_score: number;
  num_bricks: number;
  qwen_score: number;
}

export interface BenchmarkEntry {
  promptIdx: number;
  prompt: string;
  groundTruthBricks: string;
  responses: GrpoResponse[];
  best: GrpoResponse;
  meanAt4: number;
}

interface RawJsonlLine {
  messages: Array<{ role: string; content: string }>;
}

interface RawGrpoEntry {
  prompt_idx: number;
  ground_truth: string;
  responses: GrpoResponse[];
  'mean@4': number;
}

const INPUT_MARKER = '### Input:';

function extractPrompt(userContent: string): string {
  const idx = userContent.indexOf(INPUT_MARKER);
  if (idx < 0) return userContent.trim();
  return userContent.slice(idx + INPUT_MARKER.length).trim();
}

function pickBest(responses: GrpoResponse[]): GrpoResponse {
  let best = responses[0];
  for (let i = 1; i < responses.length; i += 1) {
    const r = responses[i];
    if (r.validity_score > best.validity_score) {
      best = r;
    } else if (r.validity_score === best.validity_score && r.voxel_score > best.voxel_score) {
      best = r;
    }
  }
  return best;
}

let cache: Promise<BenchmarkEntry[]> | null = null;

export function loadBenchmarks(): Promise<BenchmarkEntry[]> {
  if (cache) return cache;

  cache = (async () => {
    const [promptsRes, grpoRes] = await Promise.all([
      fetch(promptsUrl),
      fetch(grpoUrl),
    ]);
    if (!promptsRes.ok) throw new Error(`Failed to fetch prompts (${promptsRes.status})`);
    if (!grpoRes.ok) throw new Error(`Failed to fetch GRPO results (${grpoRes.status})`);

    const [promptsText, grpoData] = await Promise.all([
      promptsRes.text(),
      grpoRes.json() as Promise<RawGrpoEntry[]>,
    ]);

    const promptsByIdx = new Map<number, string>();
    const lines = promptsText.split(/\r?\n/);
    let idx = 0;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      try {
        const parsed = JSON.parse(line) as RawJsonlLine;
        const userMsg = parsed.messages?.find((m) => m.role === 'user');
        if (userMsg) {
          promptsByIdx.set(idx, extractPrompt(userMsg.content));
        }
      } catch {
        // skip malformed line
      }
      idx += 1;
    }

    const entries: BenchmarkEntry[] = [];
    for (const raw of grpoData) {
      const prompt = promptsByIdx.get(raw.prompt_idx);
      if (!prompt) continue;
      if (!raw.responses || raw.responses.length === 0) continue;
      entries.push({
        promptIdx: raw.prompt_idx,
        prompt,
        groundTruthBricks: raw.ground_truth,
        responses: raw.responses,
        best: pickBest(raw.responses),
        meanAt4: raw['mean@4'],
      });
    }

    return entries;
  })();

  cache.catch(() => {
    cache = null;
  });

  return cache;
}

export function findByPrompt(prompt: string, entries: BenchmarkEntry[]): BenchmarkEntry | undefined {
  const target = prompt.trim();
  return entries.find((e) => e.prompt === target);
}

export function clearBenchmarkCache(): void {
  cache = null;
}
