import {
  VoxelData,
  EvaluationScores,
  BoundingBox,
  ConnectivityResult,
  ColorDiversityResult,
} from '../types';

// ---- Helpers ----

function key(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function buildVoxelSet(voxels: VoxelData[]): Set<string> {
  return new Set(voxels.map(v => key(v.x, v.y, v.z)));
}

const NEIGHBOR_OFFSETS: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

// ---- Individual metrics ----

export function computeBoundingBox(voxels: VoxelData[]): BoundingBox {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const v of voxels) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.z < minZ) minZ = v.z;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
    if (v.z > maxZ) maxZ = v.z;
  }
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    dimensions: { width: maxX - minX + 1, height: maxY - minY + 1, depth: maxZ - minZ + 1 },
  };
}

export function computeConnectivity(voxels: VoxelData[]): ConnectivityResult {
  if (voxels.length === 0) {
    return { isFullyConnected: true, componentCount: 0, largestComponentSize: 0 };
  }

  const set = buildVoxelSet(voxels);
  const visited = new Set<string>();
  let componentCount = 0;
  let largestComponentSize = 0;

  for (const v of voxels) {
    const start = key(v.x, v.y, v.z);
    if (visited.has(start)) continue;

    // BFS flood fill
    componentCount++;
    let size = 0;
    const queue = [start];
    visited.add(start);

    while (queue.length > 0) {
      const cur = queue.pop()!;
      size++;
      const [cx, cy, cz] = cur.split(',').map(Number);
      for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
        const nk = key(cx + dx, cy + dy, cz + dz);
        if (set.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }

    if (size > largestComponentSize) largestComponentSize = size;
  }

  return {
    isFullyConnected: componentCount === 1,
    componentCount,
    largestComponentSize,
  };
}

export function computeSymmetry(voxels: VoxelData[]): number {
  if (voxels.length === 0) return 1;

  const set = buildVoxelSet(voxels);
  let matches = 0;

  for (const v of voxels) {
    // Mirror across x=0 plane
    if (set.has(key(-v.x, v.y, v.z))) {
      matches++;
    }
  }

  return matches / voxels.length;
}

function hexToHsl(color: number): [number, number, number] {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return [h, s, l];
}

export function computeColorDiversity(voxels: VoxelData[]): ColorDiversityResult {
  if (voxels.length === 0) {
    return { uniqueColorCount: 0, hslVariance: 0, dominantColor: '#000000' };
  }

  const colorCounts = new Map<number, number>();
  const hslValues: [number, number, number][] = [];

  for (const v of voxels) {
    colorCounts.set(v.color, (colorCounts.get(v.color) ?? 0) + 1);
    hslValues.push(hexToHsl(v.color));
  }

  // Dominant color
  let maxCount = 0;
  let dominantHex = 0;
  for (const [color, count] of colorCounts) {
    if (count > maxCount) { maxCount = count; dominantHex = color; }
  }

  // HSL variance (average of H, S, L variances)
  const n = hslValues.length;
  const means = [0, 0, 0];
  for (const [h, s, l] of hslValues) { means[0] += h; means[1] += s; means[2] += l; }
  means[0] /= n; means[1] /= n; means[2] /= n;

  const variances = [0, 0, 0];
  for (const [h, s, l] of hslValues) {
    variances[0] += (h - means[0]) ** 2;
    variances[1] += (s - means[1]) ** 2;
    variances[2] += (l - means[2]) ** 2;
  }
  const hslVariance = (variances[0] + variances[1] + variances[2]) / (3 * n);

  return {
    uniqueColorCount: colorCounts.size,
    hslVariance,
    dominantColor: '#' + dominantHex.toString(16).padStart(6, '0'),
  };
}

export function computeCenteringError(voxels: VoxelData[]): { xOffset: number; zOffset: number; distance: number } {
  if (voxels.length === 0) return { xOffset: 0, zOffset: 0, distance: 0 };

  let sumX = 0, sumZ = 0;
  for (const v of voxels) { sumX += v.x; sumZ += v.z; }
  const xOffset = sumX / voxels.length;
  const zOffset = sumZ / voxels.length;

  return { xOffset, zOffset, distance: Math.sqrt(xOffset * xOffset + zOffset * zOffset) };
}

export function computeFloorCompliance(voxels: VoxelData[]): boolean {
  if (voxels.length === 0) return true;
  return Math.min(...voxels.map(v => v.y)) >= 0;
}

export function computeSurfaceRatio(voxels: VoxelData[]): number {
  if (voxels.length === 0) return 0;

  const set = buildVoxelSet(voxels);
  let exposedFaces = 0;
  const totalFaces = voxels.length * 6;

  for (const v of voxels) {
    for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
      if (!set.has(key(v.x + dx, v.y + dy, v.z + dz))) {
        exposedFaces++;
      }
    }
  }

  return exposedFaces / totalFaces;
}

// ---- Aggregate ----

export function evaluateAll(voxels: VoxelData[]): EvaluationScores {
  return {
    voxelCount: voxels.length,
    boundingBox: computeBoundingBox(voxels),
    connectivity: computeConnectivity(voxels),
    symmetryScore: computeSymmetry(voxels),
    colorDiversity: computeColorDiversity(voxels),
    centeringError: computeCenteringError(voxels),
    floorCompliance: computeFloorCompliance(voxels),
    surfaceRatio: computeSurfaceRatio(voxels),
  };
}
