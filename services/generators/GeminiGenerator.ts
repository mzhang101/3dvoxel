import { GoogleGenAI, Type } from '@google/genai';
import { VoxelData } from '../../types';
import { GeneratorAdapter } from './index';
import { GEMINI_GENERATION_MODELS, runWithGeminiModelFallback } from '../geminiModelFallback';

export class GeminiGenerator implements GeneratorAdapter {
  readonly name = 'gemini';

  constructor(private modelCandidates: readonly string[] = GEMINI_GENERATION_MODELS) {}

  async generate(prompt: string, apiKey: string): Promise<VoxelData[]> {
    const ai = new GoogleGenAI({ apiKey });

    const systemContext = `
      CONTEXT: You are creating a brand new voxel art scene from scratch.
      Be creative with colors.
    `;

    const response = await runWithGeminiModelFallback(this.modelCandidates, (model) =>
      ai.models.generateContent({
        model,
        contents: `
          ${systemContext}

          Task: Generate a 3D voxel art model of: "${prompt}".

          Strict Rules:
          1. Use approximately 150 to 600 voxels.
          2. The model must be centered at x=0, z=0.
          3. The bottom of the model must be at y=0 or slightly higher.
          4. Ensure the structure is physically plausible (connected).
          5. Coordinates should be integers.

          Return ONLY a JSON array of objects.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.INTEGER },
                y: { type: Type.INTEGER },
                z: { type: Type.INTEGER },
                color: { type: Type.STRING, description: 'Hex color code e.g. #FF5500' },
              },
              required: ['x', 'y', 'z', 'color'],
            },
          },
        },
      }),
    );

    if (!response.text) {
      throw new Error('Model returned an empty response.');
    }

    const rawData = JSON.parse(response.text);

    return rawData.map((v: any) => {
      let colorStr = v.color;
      if (colorStr.startsWith('#')) colorStr = colorStr.substring(1);
      const colorInt = parseInt(colorStr, 16);
      return {
        x: v.x,
        y: v.y,
        z: v.z,
        color: isNaN(colorInt) ? 0xcccccc : colorInt,
      };
    });
  }
}
