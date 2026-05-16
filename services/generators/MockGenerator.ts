import { VoxelData } from '../../types';
import { GeneratorAdapter } from './index';
import { Generators } from '../../utils/voxelGenerators';

const PRESET_KEYS = ['ModernSofa', 'ModernLamp', 'Table'] as const;

export class MockGenerator implements GeneratorAdapter {
  readonly name = 'mock';

  async generate(_prompt: string, _apiKey: string): Promise<VoxelData[]> {
    // Pick a random built-in preset
    const pick = PRESET_KEYS[Math.floor(Math.random() * PRESET_KEYS.length)];
    const base = Generators[pick]();

    // Apply small random perturbations to colors
    return base.map(v => ({
      ...v,
      color: perturbColor(v.color),
    }));
  }
}

function perturbColor(color: number): number {
  let r = (color >> 16) & 0xff;
  let g = (color >> 8) & 0xff;
  let b = color & 0xff;

  r = clamp(r + Math.floor((Math.random() - 0.5) * 30));
  g = clamp(g + Math.floor((Math.random() - 0.5) * 30));
  b = clamp(b + Math.floor((Math.random() - 0.5) * 30));

  return (r << 16) | (g << 8) | b;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, v));
}
