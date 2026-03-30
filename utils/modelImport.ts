import { VoxelData } from '../types';

const DEFAULT_COLOR = 0xb6c27a;

const BRICK_COLORS: Record<string, number> = {
  '1x1': 0xf2e8cf,
  '1x2': 0xe07a5f,
  '1x4': 0x3d405b,
  '1x6': 0x81b29a,
  '1x8': 0x4f772d,
  '2x1': 0xf4f1de,
  '2x2': 0xd4a373,
  '2x4': 0xbc6c25,
  '2x6': 0x6d597a,
  '4x1': 0x457b9d,
  '6x1': 0x588157,
  '8x1': 0xa68a64,
};

function normalizeModel(voxels: VoxelData[]): VoxelData[] {
  if (voxels.length === 0) return [];

  const minY = Math.min(...voxels.map(v => v.y));
  const minX = Math.min(...voxels.map(v => v.x));
  const maxX = Math.max(...voxels.map(v => v.x));
  const minZ = Math.min(...voxels.map(v => v.z));
  const maxZ = Math.max(...voxels.map(v => v.z));

  const centerX = Math.round((minX + maxX) / 2);
  const centerZ = Math.round((minZ + maxZ) / 2);

  const dedup = new Map<string, VoxelData>();
  for (const v of voxels) {
    const normalized = {
      x: Math.round(v.x - centerX),
      y: Math.round(v.y - minY),
      z: Math.round(v.z - centerZ),
      color: Number.isFinite(v.color) ? v.color : DEFAULT_COLOR,
    };
    dedup.set(`${normalized.x},${normalized.y},${normalized.z}`, normalized);
  }

  return Array.from(dedup.values());
}

function parseColor(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const normalized = value.startsWith('#') ? value.slice(1) : value;
    const parsed = parseInt(normalized, 16);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return DEFAULT_COLOR;
}

function parseVoxelArray(input: unknown): VoxelData[] {
  if (!Array.isArray(input)) {
    throw new Error('Invalid voxel array format.');
  }

  const voxels: VoxelData[] = input
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      x: Number(item.x),
      y: Number(item.y),
      z: Number(item.z),
      color: parseColor(item.color ?? item.c),
    }))
    .filter((v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z));

  if (voxels.length === 0) {
    throw new Error('No valid voxels found in imported array.');
  }

  return normalizeModel(voxels);
}

function parseBrickLines(bricks: string): VoxelData[] {
  const lines = bricks
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const voxels: VoxelData[] = [];

  for (const line of lines) {
    const match = line.match(/^(\d+)x(\d+)\s*\((-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\)$/);
    if (!match) continue;

    const sizeX = Number(match[1]);
    const sizeY = Number(match[2]);
    const baseX = Number(match[3]);
    const baseY = Number(match[4]);
    const baseZ = Number(match[5]);

    const color = BRICK_COLORS[`${sizeX}x${sizeY}`] ?? BRICK_COLORS[`${sizeY}x${sizeX}`] ?? DEFAULT_COLOR;

    for (let dx = 0; dx < sizeX; dx += 1) {
      for (let dy = 0; dy < sizeY; dy += 1) {
        // Dataset coordinates are (x, y, layer). Convert layer to vertical y-axis.
        voxels.push({
          x: baseX + dx,
          y: baseZ,
          z: baseY + dy,
          color,
        });
      }
    }
  }

  if (voxels.length === 0) {
    throw new Error('No valid brick rows found. Expected rows like "2x6 (13,5,0)".');
  }

  return normalizeModel(voxels);
}

function parseNumericGrid(grid: unknown): VoxelData[] {
  if (!Array.isArray(grid)) {
    throw new Error('Invalid numeric grid format.');
  }

  const voxels: VoxelData[] = [];

  for (let y = 0; y < grid.length; y += 1) {
    const layer = grid[y];
    if (!Array.isArray(layer)) continue;

    for (let z = 0; z < layer.length; z += 1) {
      const row = layer[z];
      if (!Array.isArray(row)) continue;

      for (let x = 0; x < row.length; x += 1) {
        const value = Number(row[x]);
        if (!Number.isFinite(value) || value <= 0) continue;

        const shade = Math.max(40, Math.min(255, Math.round(value * 255)));
        const color = (shade << 16) | (Math.max(20, shade - 30) << 8) | Math.max(20, shade - 50);
        voxels.push({ x, y, z, color });
      }
    }
  }

  if (voxels.length === 0) {
    throw new Error('No positive values found in numeric grid.');
  }

  return normalizeModel(voxels);
}

export function parseImportedModel(rawText: string): VoxelData[] {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('Imported file is empty.');
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (Array.isArray(parsed)) {
      return parseVoxelArray(parsed);
    }

    if (parsed && typeof parsed === 'object') {
      const payload = parsed as Record<string, unknown>;

      if (Array.isArray(payload.data)) {
        return parseVoxelArray(payload.data);
      }

      if (typeof payload.bricks === 'string') {
        return parseBrickLines(payload.bricks);
      }

      if (Array.isArray(payload.stability_scores)) {
        return parseNumericGrid(payload.stability_scores);
      }
    }
  } catch {
    // Not JSON. Try plain brick-line text.
  }

  return parseBrickLines(trimmed);
}