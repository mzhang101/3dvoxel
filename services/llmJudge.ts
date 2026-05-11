import { GoogleGenAI, Type } from '@google/genai';
import { VoxelData, LLMJudgeScores } from '../types';
import { GEMINI_JUDGE_MODELS, runWithGeminiModelFallback } from './geminiModelFallback';

export async function judgeGeneration(
  prompt: string,
  voxels: VoxelData[],
  apiKey: string,
): Promise<LLMJudgeScores> {
  const ai = new GoogleGenAI({ apiKey });

  // Summarise the voxel data compactly for the judge
  const summary = {
    voxelCount: voxels.length,
    sampleVoxels: voxels.slice(0, 30).map(v => ({
      x: v.x, y: v.y, z: v.z,
      color: '#' + v.color.toString(16).padStart(6, '0'),
    })),
    uniqueColors: [...new Set(voxels.map(v => v.color))].length,
    boundingBox: {
      x: [Math.min(...voxels.map(v => v.x)), Math.max(...voxels.map(v => v.x))],
      y: [Math.min(...voxels.map(v => v.y)), Math.max(...voxels.map(v => v.y))],
      z: [Math.min(...voxels.map(v => v.z)), Math.max(...voxels.map(v => v.z))],
    },
  };

  const response = await runWithGeminiModelFallback(GEMINI_JUDGE_MODELS, (model) =>
    ai.models.generateContent({
      model,
      contents: `You are an expert judge evaluating the quality of a 3D voxel art model.

The user asked the generator to create: "${prompt}"

Here is a summary of the generated model:
${JSON.stringify(summary, null, 2)}

Rate the model on these 4 dimensions (each 0-10, 10 = best):
1. promptAdherence — Does the structure look like what was requested?
2. structuralQuality — Is it physically plausible, well-supported, no floating parts?
3. aestheticScore — Are the colors well-chosen and proportions pleasing?
4. creativity — Is the design creative or generic?

Also provide a brief commentary (1-3 sentences).

Return ONLY a JSON object.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            promptAdherence: { type: Type.INTEGER },
            structuralQuality: { type: Type.INTEGER },
            aestheticScore: { type: Type.INTEGER },
            creativity: { type: Type.INTEGER },
            commentary: { type: Type.STRING },
          },
          required: ['promptAdherence', 'structuralQuality', 'aestheticScore', 'creativity', 'commentary'],
        },
      },
    }),
  );

  if (!response.text) {
    throw new Error('LLM judge returned an empty response.');
  }

  const parsed = JSON.parse(response.text);

  return {
    promptAdherence: clampScore(parsed.promptAdherence),
    structuralQuality: clampScore(parsed.structuralQuality),
    aestheticScore: clampScore(parsed.aestheticScore),
    creativity: clampScore(parsed.creativity),
    commentary: String(parsed.commentary ?? ''),
  };
}

function clampScore(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
}
