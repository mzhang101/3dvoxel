import { VoxelData, BrickPiece } from '../types';

const DEFAULT_COLOR = 0xb6c27a;

export const BRICK_COLORS: Record<string, number> = {
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

const BRICK_LINE_REGEX = /(\d+)x(\d+)\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/;
const COMMON_PREFIX_PATTERNS = [
  /^bricks\s*[:=]\s*/i,
  /^output\s*[:=]\s*/i,
  /^result\s*[:=]\s*/i,
  /^###\s*output\s*/i,
];

function cleanBrickText(raw: string): string {
  let text = raw.trim();
  // Strip leading + trailing markdown fences (``` or ```text)
  text = text.replace(/^```[a-zA-Z0-9_-]*\s*\n?/, '');
  text = text.replace(/\n?```\s*$/, '');
  for (const pat of COMMON_PREFIX_PATTERNS) {
    text = text.replace(pat, '');
  }
  return text.trim();
}

function colorForSize(sizeX: number, sizeY: number): number {
  return BRICK_COLORS[`${sizeX}x${sizeY}`] ?? BRICK_COLORS[`${sizeY}x${sizeX}`] ?? DEFAULT_COLOR;
}

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

/**
 * Parse brick-line text into BrickPiece[]. Tolerant of markdown fences,
 * common prefixes (`Bricks:`, `Output:`, `### Output`), and trailing
 * junk per line (colors / comments). Each line must still contain a
 * `<sx>x<sy> (x,y,layer)` pattern somewhere.
 */
export function parseBrickPieces(rawText: string): BrickPiece[] {
  const text = cleanBrickText(rawText);
  const pieces: BrickPiece[] = [];
  const lines = text.split(/\r?\n/);
  let idx = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(BRICK_LINE_REGEX);
    if (!m) continue;
    const sizeX = Number(m[1]);
    const sizeY = Number(m[2]);
    const baseX = Number(m[3]);
    const baseY = Number(m[4]);
    const layer = Number(m[5]);
    pieces.push({
      id: `b${idx}`,
      sizeX,
      sizeY,
      baseX,
      baseY,
      layer,
      color: colorForSize(sizeX, sizeY),
    });
    idx += 1;
  }
  return pieces;
}

export function parseBrickLines(bricks: string): VoxelData[] {
  const pieces = parseBrickPieces(bricks);

  if (pieces.length === 0) {
    if (typeof console !== 'undefined') {
      console.warn('[parseBrickLines] no brick rows matched; raw payload (first 500 chars):', bricks.slice(0, 500));
    }
    throw new Error('No valid brick rows found. Expected rows like "2x6 (13,5,0)".');
  }

  const voxels: VoxelData[] = [];
  for (const p of pieces) {
    for (let dx = 0; dx < p.sizeX; dx += 1) {
      for (let dy = 0; dy < p.sizeY; dy += 1) {
        // Dataset coordinates are (x, y, layer). Convert layer to vertical y-axis.
        voxels.push({
          x: p.baseX + dx,
          y: p.layer,
          z: p.baseY + dy,
          color: p.color,
        });
      }
    }
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

/**
 * Wrap an arbitrary VoxelData[] as 1×1 BrickPiece[] so it can flow through
 * the brick rendering / coloring path. Used for presets, mock generator,
 * and free-form voxel imports that don't carry brick-line data.
 *
 * Mapping: brick.baseX = voxel.x; brick.baseY = voxel.z; brick.layer = voxel.y.
 * (matches the inverse transform in parseBrickLines)
 */
export function voxelsToBricks(voxels: VoxelData[]): BrickPiece[] {
  return voxels.map((v, i) => ({
    id: `v${i}`,
    sizeX: 1,
    sizeY: 1,
    baseX: v.x,
    baseY: v.z,
    layer: v.y,
    color: Number.isFinite(v.color) ? v.color : DEFAULT_COLOR,
  }));
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

      if (typeof payload.model_3d_bricks === 'string') {
        return parseBrickLines(payload.model_3d_bricks);
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