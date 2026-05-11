/**
 * Constraint Evaluator
 *
 * Mirrors the hard-constraint portion of the GRPO Validity Score reward used
 * during training. Brick-level checks (library, collision, bounding volume)
 * require the original brick-line data; voxel-level checks (stability,
 * topology, floor) can fall back to voxel data alone.
 *
 * Each ConstraintResult carries i18n-friendly keys (nameKey, detailKey,
 * detailParams, structured violations) plus English fallback strings so
 * callers that don't care about i18n still get human-readable output.
 */

import { VoxelData } from '../types';
import { ALLOWED_BRICK_SET as ALLOWED_BRICKS } from './brickLibrary';

// ===== Input data =====

export interface BrickData {
  sizeX: number;
  sizeY: number;
  x: number;
  y: number;
  layer: number;
  /** Optional id matching the rendered BrickInstance (set by parseBrickData). */
  id?: string;
}

// ===== Output data =====

export interface ViolationDetail {
  key: string;
  params: Record<string, string | number>;
}

export interface ConstraintResult {
  /** Stable identifier — translated via i18n. */
  nameKey: string;
  /** Stable identifier for the details template — translated via i18n with detailParams. */
  detailKey: string;
  detailParams?: Record<string, string | number>;
  passed: boolean;
  score: number;
  /** Structured violations: { key, params } per entry; UI runs them through t(). */
  violations: ViolationDetail[];
  /** English fallback name (kept for non-i18n consumers / logging). */
  name: string;
  /** English fallback details. */
  details: string;
  /** English fallback violation strings. */
  violationsText: string[];
  /** Brick ids that participate in this constraint's violation (collision/uniqueness). */
  overlappingBrickIds?: string[];
  /** Voxel cells `[x, y, z]` that overlap (voxel-level uniqueness check). */
  overlappingCells?: Array<[number, number, number]>;
}

export interface ConstraintReport {
  overallValid: boolean;
  validityScore: number;
  constraints: ConstraintResult[];
  summary: string;
  summaryKey: string;
  summaryParams: Record<string, string | number>;
  hasBrickData: boolean;
}

// ===== Constants =====

const DEFAULT_BOUND = 20;
const MAX_VIOLATIONS_REPORTED = 10;

// ===== Helpers =====

function key3(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function expandBrickCells(brick: BrickData): Array<[number, number, number]> {
  const cells: Array<[number, number, number]> = [];
  for (let dx = 0; dx < brick.sizeX; dx += 1) {
    for (let dy = 0; dy < brick.sizeY; dy += 1) {
      cells.push([brick.x + dx, brick.y + dy, brick.layer]);
    }
  }
  return cells;
}

function summarize<T>(items: T[]): T[] {
  if (items.length <= MAX_VIOLATIONS_REPORTED) return items;
  return items.slice(0, MAX_VIOLATIONS_REPORTED);
}

function makeViolationsText(violations: ViolationDetail[], renderer: (v: ViolationDetail) => string): string[] {
  const visible = summarize(violations).map(renderer);
  if (violations.length > MAX_VIOLATIONS_REPORTED) {
    visible.push(`…and ${violations.length - MAX_VIOLATIONS_REPORTED} more`);
  }
  return visible;
}

// ===== Brick-line parser =====

const BRICK_LINE_REGEX = /(\d+)x(\d+)\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/;

export function parseBrickData(brickText: string): BrickData[] {
  const bricks: BrickData[] = [];
  const lines = brickText.split(/\r?\n/);
  let idx = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(BRICK_LINE_REGEX);
    if (!match) continue;
    bricks.push({
      sizeX: Number(match[1]),
      sizeY: Number(match[2]),
      x: Number(match[3]),
      y: Number(match[4]),
      layer: Number(match[5]),
      id: `b${idx}`,
    });
    idx += 1;
  }
  return bricks;
}

// ===== Brick-level checks =====

export function checkBrickLibrary(bricks: BrickData[]): ConstraintResult {
  if (bricks.length === 0) {
    return emptyResult('brick_library', 'Brick Library');
  }

  const violations: ViolationDetail[] = [];
  let valid = 0;

  for (const b of bricks) {
    const tag = `${b.sizeX}x${b.sizeY}`;
    if (ALLOWED_BRICKS.has(tag)) {
      valid += 1;
    } else {
      violations.push({
        key: 'constraint.violation.invalid_brick',
        params: { size: tag, x: b.x, y: b.y, layer: b.layer },
      });
    }
  }

  const score = valid / bricks.length;
  return {
    nameKey: 'constraint.brick_library.name',
    name: 'Brick Library',
    detailKey: 'constraint.brick_library.detail',
    detailParams: { valid, total: bricks.length },
    passed: score === 1,
    score,
    violations: summarize(violations),
    violationsText: makeViolationsText(violations, (v) => `Invalid brick ${v.params.size} at (${v.params.x},${v.params.y},${v.params.layer})`),
    details: `${valid}/${bricks.length} bricks belong to the allowed library.`,
  };
}

export function checkCollision(bricks: BrickData[]): ConstraintResult {
  if (bricks.length === 0) {
    return emptyResult('collision_free', 'Collision Free');
  }

  const occupied = new Map<string, BrickData>();
  const violations: ViolationDetail[] = [];
  const overlappingIds = new Set<string>();
  const overlappingCells: Array<[number, number, number]> = [];
  let totalCells = 0;
  let collisions = 0;

  for (const b of bricks) {
    const cells = expandBrickCells(b);
    totalCells += cells.length;
    for (const [cx, cy, cl] of cells) {
      const k = key3(cx, cy, cl);
      const prev = occupied.get(k);
      if (prev) {
        collisions += 1;
        violations.push({
          key: 'constraint.violation.collision',
          params: { x: cx, y: cy, layer: cl },
        });
        if (prev.id) overlappingIds.add(prev.id);
        if (b.id) overlappingIds.add(b.id);
        overlappingCells.push([cx, cy, cl]);
      } else {
        occupied.set(k, b);
      }
    }
  }

  const score = totalCells > 0 ? clamp01(1 - collisions / totalCells) : 1;
  const passed = collisions === 0;
  return {
    nameKey: 'constraint.collision_free.name',
    name: 'Collision Free',
    detailKey: passed
      ? 'constraint.collision_free.detail.ok'
      : 'constraint.collision_free.detail.fail',
    detailParams: { totalCells, collisions },
    passed,
    score,
    violations: summarize(violations),
    violationsText: makeViolationsText(violations, (v) => `Collision at (${v.params.x},${v.params.y},${v.params.layer})`),
    details: passed
      ? `No overlapping bricks across ${totalCells} occupied cells.`
      : `${collisions} cell collisions detected.`,
    overlappingBrickIds: overlappingIds.size > 0 ? Array.from(overlappingIds) : undefined,
    overlappingCells: overlappingCells.length > 0 ? overlappingCells : undefined,
  };
}

export function checkBoundingVolume(
  bricks: BrickData[],
  maxX: number = DEFAULT_BOUND,
  maxY: number = DEFAULT_BOUND,
  maxLayers: number = DEFAULT_BOUND,
): ConstraintResult {
  if (bricks.length === 0) {
    return emptyResult('bounding_volume', 'Bounding Volume');
  }

  const violations: ViolationDetail[] = [];
  let inside = 0;

  for (const b of bricks) {
    const cells = expandBrickCells(b);
    const violates = cells.some(([cx, cy, cl]) => (
      cx < 0 || cy < 0 || cl < 0 ||
      cx >= maxX || cy >= maxY || cl >= maxLayers
    ));
    if (violates) {
      violations.push({
        key: 'constraint.violation.brick_out_of_bounds',
        params: { size: `${b.sizeX}x${b.sizeY}`, x: b.x, y: b.y, layer: b.layer, maxX, maxY, maxLayers },
      });
    } else {
      inside += 1;
    }
  }

  const score = inside / bricks.length;
  return {
    nameKey: 'constraint.bounding_volume.name',
    name: 'Bounding Volume',
    detailKey: 'constraint.bounding_volume.detail',
    detailParams: { inside, total: bricks.length, maxX, maxY, maxLayers },
    passed: score === 1,
    score,
    violations: summarize(violations),
    violationsText: makeViolationsText(violations, (v) => `Brick ${v.params.size} at (${v.params.x},${v.params.y},${v.params.layer}) leaves [0..${v.params.maxX}) × [0..${v.params.maxY}) × [0..${v.params.maxLayers})`),
    details: `${inside}/${bricks.length} bricks fit inside ${maxX}×${maxY}×${maxLayers}.`,
  };
}

/**
 * Brick-level structural stability check.
 * A brick is considered supported if it sits on the bottom layer OR ANY of
 * its cells has a cell from another brick directly beneath it. This matches
 * real LEGO physics: a 2×6 tabletop on four corner legs only needs one cell
 * over each leg to count as supported.
 */
export function checkBrickStability(bricks: BrickData[]): ConstraintResult {
  if (bricks.length === 0) {
    return emptyResult('structural_stability', 'Structural Stability');
  }

  // Build a Set of every cell occupied by every brick, keyed by "<x>,<y>,<layer>".
  const occupied = new Set<string>();
  for (const b of bricks) {
    for (const [cx, cy, cl] of expandBrickCells(b)) {
      occupied.add(key3(cx, cy, cl));
    }
  }

  let minLayer = Infinity;
  for (const b of bricks) {
    if (b.layer < minLayer) minLayer = b.layer;
  }

  let supported = 0;
  let aboveGround = 0;
  const violations: ViolationDetail[] = [];
  const unsupportedIds: string[] = [];

  for (const b of bricks) {
    if (b.layer === minLayer) continue;
    aboveGround += 1;
    const hasSupport = expandBrickCells(b).some(([cx, cy, cl]) =>
      occupied.has(key3(cx, cy, cl - 1)),
    );
    if (hasSupport) {
      supported += 1;
    } else {
      violations.push({
        key: 'constraint.violation.unsupported_brick',
        params: { size: `${b.sizeX}x${b.sizeY}`, x: b.x, y: b.y, layer: b.layer },
      });
      if (b.id) unsupportedIds.push(b.id);
    }
  }

  if (aboveGround === 0) {
    return {
      nameKey: 'constraint.structural_stability.name',
      name: 'Structural Stability',
      detailKey: 'constraint.structural_stability.detail.single_layer',
      detailParams: {},
      passed: true,
      score: 1,
      violations: [],
      violationsText: [],
      details: 'Single-layer model — no support required.',
    };
  }

  const score = supported / aboveGround;
  const passed = score >= 0.95;
  return {
    nameKey: 'constraint.structural_stability.name',
    name: 'Structural Stability',
    detailKey: 'constraint.structural_stability.detail.bricks',
    detailParams: { supported, aboveGround },
    passed,
    score,
    violations: summarize(violations),
    violationsText: makeViolationsText(violations, (v) => `Unsupported brick ${v.params.size} at (${v.params.x},${v.params.y},${v.params.layer})`),
    details: `${supported}/${aboveGround} non-base bricks rest on a supporting brick.`,
    overlappingBrickIds: unsupportedIds.length > 0 ? unsupportedIds : undefined,
  };
}

// ===== Voxel-level checks =====

export function checkStructuralStability(voxels: VoxelData[]): ConstraintResult {
  if (voxels.length === 0) {
    return emptyResult('structural_stability', 'Structural Stability');
  }

  const minY = voxels.reduce((m, v) => (v.y < m ? v.y : m), Infinity);
  const occupied = new Set<string>();
  for (const v of voxels) occupied.add(key3(v.x, v.y, v.z));

  const violations: ViolationDetail[] = [];
  let aboveGround = 0;
  let supported = 0;

  for (const v of voxels) {
    if (v.y === minY) continue;
    aboveGround += 1;
    if (occupied.has(key3(v.x, v.y - 1, v.z))) {
      supported += 1;
    } else {
      violations.push({
        key: 'constraint.violation.floating_voxel',
        params: { x: v.x, y: v.y, z: v.z },
      });
    }
  }

  if (aboveGround === 0) {
    return {
      nameKey: 'constraint.structural_stability.name',
      name: 'Structural Stability',
      detailKey: 'constraint.structural_stability.detail.single_layer',
      detailParams: {},
      passed: true,
      score: 1,
      violations: [],
      violationsText: [],
      details: 'Single-layer model — no support required.',
    };
  }

  const score = supported / aboveGround;
  return {
    nameKey: 'constraint.structural_stability.name',
    name: 'Structural Stability',
    detailKey: 'constraint.structural_stability.detail',
    detailParams: { supported, aboveGround },
    passed: score >= 0.95,
    score,
    violations: summarize(violations),
    violationsText: makeViolationsText(violations, (v) => `Floating voxel at (${v.params.x},${v.params.y},${v.params.z})`),
    details: `${supported}/${aboveGround} non-base voxels rest on a supporting voxel.`,
  };
}

const BFS_OFFSETS: Array<[number, number, number]> = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

export function checkTopologicalIntegrity(voxels: VoxelData[]): ConstraintResult {
  if (voxels.length === 0) {
    return emptyResult('topological_integrity', 'Topological Integrity');
  }

  const occupied = new Set<string>();
  for (const v of voxels) occupied.add(key3(v.x, v.y, v.z));

  const visited = new Set<string>();
  let components = 0;
  let largest = 0;

  for (const v of voxels) {
    const start = key3(v.x, v.y, v.z);
    if (visited.has(start)) continue;
    components += 1;
    let size = 0;
    const stack = [start];
    visited.add(start);
    while (stack.length) {
      const cur = stack.pop()!;
      size += 1;
      const [cx, cy, cz] = cur.split(',').map(Number);
      for (const [dx, dy, dz] of BFS_OFFSETS) {
        const nk = key3(cx + dx, cy + dy, cz + dz);
        if (occupied.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          stack.push(nk);
        }
      }
    }
    if (size > largest) largest = size;
  }

  const score = largest / voxels.length;
  const passed = components === 1;
  const violations: ViolationDetail[] = passed
    ? []
    : [{ key: 'constraint.violation.disconnected', params: { components } }];
  return {
    nameKey: 'constraint.topological_integrity.name',
    name: 'Topological Integrity',
    detailKey: passed
      ? 'constraint.topological_integrity.detail.ok'
      : 'constraint.topological_integrity.detail.fail',
    detailParams: { components, largest },
    passed,
    score,
    violations,
    violationsText: passed ? [] : [`${components} disconnected components`],
    details: passed
      ? 'Model is a single connected component.'
      : `Model splits into ${components} disconnected fragments (largest = ${largest} voxels).`,
  };
}

export function checkVoxelCollision(voxels: VoxelData[]): ConstraintResult {
  if (voxels.length === 0) {
    return emptyResult('voxel_uniqueness', 'Voxel Uniqueness');
  }

  const seen = new Set<string>();
  const violations: ViolationDetail[] = [];
  const overlappingCells: Array<[number, number, number]> = [];
  for (const v of voxels) {
    const k = key3(v.x, v.y, v.z);
    if (seen.has(k)) {
      violations.push({
        key: 'constraint.violation.duplicate_voxel',
        params: { x: v.x, y: v.y, z: v.z },
      });
      overlappingCells.push([v.x, v.y, v.z]);
    } else {
      seen.add(k);
    }
  }

  const score = clamp01(1 - violations.length / voxels.length);
  const passed = violations.length === 0;
  return {
    nameKey: 'constraint.voxel_uniqueness.name',
    name: 'Voxel Uniqueness',
    detailKey: passed
      ? 'constraint.voxel_uniqueness.detail.ok'
      : 'constraint.voxel_uniqueness.detail.fail',
    detailParams: { count: voxels.length, duplicates: violations.length },
    passed,
    score,
    violations: summarize(violations),
    violationsText: makeViolationsText(violations, (v) => `Duplicate voxel at (${v.params.x},${v.params.y},${v.params.z})`),
    details: passed
      ? `All ${voxels.length} voxels occupy unique cells.`
      : `${violations.length} duplicate voxel coordinates detected.`,
    overlappingCells: overlappingCells.length > 0 ? overlappingCells : undefined,
  };
}

export function checkVoxelBoundingVolume(
  voxels: VoxelData[],
  maxExtent: number = DEFAULT_BOUND,
): ConstraintResult {
  if (voxels.length === 0) {
    return emptyResult('bounding_volume', 'Bounding Volume');
  }

  const half = Math.floor(maxExtent / 2);
  const violations: ViolationDetail[] = [];
  let inside = 0;

  for (const v of voxels) {
    const xOk = v.x >= -half && v.x <= half;
    const yOk = v.y >= 0 && v.y < maxExtent;
    const zOk = v.z >= -half && v.z <= half;
    if (xOk && yOk && zOk) {
      inside += 1;
    } else {
      violations.push({
        key: 'constraint.violation.voxel_out_of_bounds',
        params: { x: v.x, y: v.y, z: v.z },
      });
    }
  }

  const score = inside / voxels.length;
  return {
    nameKey: 'constraint.voxel_bounding_volume.name',
    name: 'Bounding Volume',
    detailKey: 'constraint.voxel_bounding_volume.detail',
    detailParams: { inside, total: voxels.length, maxExtent },
    passed: score === 1,
    score,
    violations: summarize(violations),
    violationsText: makeViolationsText(violations, (v) => `Voxel out of bounds at (${v.params.x},${v.params.y},${v.params.z})`),
    details: `${inside}/${voxels.length} voxels fit inside the ${maxExtent}-unit envelope.`,
  };
}

export function checkFloorCompliance(voxels: VoxelData[]): ConstraintResult {
  if (voxels.length === 0) {
    return emptyResult('floor_compliance', 'Floor Compliance');
  }

  const violations: ViolationDetail[] = [];
  for (const v of voxels) {
    if (v.y < 0) {
      violations.push({
        key: 'constraint.violation.below_floor',
        params: { x: v.x, y: v.y, z: v.z },
      });
    }
  }

  const score = clamp01(1 - violations.length / voxels.length);
  const passed = violations.length === 0;
  return {
    nameKey: 'constraint.floor_compliance.name',
    name: 'Floor Compliance',
    detailKey: passed
      ? 'constraint.floor_compliance.detail.ok'
      : 'constraint.floor_compliance.detail.fail',
    detailParams: { below: violations.length },
    passed,
    score,
    violations: summarize(violations),
    violationsText: makeViolationsText(violations, (v) => `Voxel below floor at (${v.params.x},${v.params.y},${v.params.z})`),
    details: passed
      ? 'All voxels rest on or above the ground plane.'
      : `${violations.length} voxels sit below y=0.`,
  };
}

// ===== Empty result helper =====

const EMPTY_NAME_FALLBACK: Record<string, string> = {
  brick_library: 'Brick Library',
  collision_free: 'Collision Free',
  bounding_volume: 'Bounding Volume',
  structural_stability: 'Structural Stability',
  topological_integrity: 'Topological Integrity',
  voxel_uniqueness: 'Voxel Uniqueness',
  floor_compliance: 'Floor Compliance',
};

function emptyResult(slug: string, fallbackName: string): ConstraintResult {
  return {
    nameKey: `constraint.${slug}.name`,
    name: EMPTY_NAME_FALLBACK[slug] ?? fallbackName,
    detailKey: 'constraint.empty.detail',
    detailParams: {},
    passed: true,
    score: 1,
    violations: [],
    violationsText: [],
    details: 'Nothing to evaluate.',
  };
}

// ===== Aggregator =====

interface WeightedResult {
  result: ConstraintResult;
  weight: number;
}

function aggregate(items: WeightedResult[]): { score: number; allPassed: boolean; constraints: ConstraintResult[] } {
  const totalWeight = items.reduce((s, x) => s + x.weight, 0) || 1;
  const score = items.reduce((s, x) => s + x.weight * x.result.score, 0) / totalWeight;
  const allPassed = items.every((x) => x.result.passed);
  return { score, allPassed, constraints: items.map((x) => x.result) };
}

export function evaluateConstraints(
  voxels: VoxelData[],
  bricks?: BrickData[],
): ConstraintReport {
  const items: WeightedResult[] = [];

  if (bricks && bricks.length > 0) {
    items.push({ result: checkBrickLibrary(bricks), weight: 0.25 });
    items.push({ result: checkCollision(bricks), weight: 0.25 });
    items.push({ result: checkBoundingVolume(bricks), weight: 0.15 });
    items.push({ result: checkBrickStability(bricks), weight: 0.20 });
    items.push({ result: checkTopologicalIntegrity(voxels), weight: 0.15 });
  } else {
    items.push({ result: checkVoxelCollision(voxels), weight: 0.20 });
    items.push({ result: checkVoxelBoundingVolume(voxels), weight: 0.15 });
    items.push({ result: checkFloorCompliance(voxels), weight: 0.15 });
    items.push({ result: checkStructuralStability(voxels), weight: 0.30 });
    items.push({ result: checkTopologicalIntegrity(voxels), weight: 0.20 });
  }

  const { score, allPassed, constraints } = aggregate(items);
  const passedCount = constraints.filter((c) => c.passed).length;
  const validityScore = clamp01(score);

  const summaryParams = {
    passed: passedCount,
    total: constraints.length,
    validity: validityScore.toFixed(2),
  };

  return {
    overallValid: allPassed,
    validityScore,
    constraints,
    hasBrickData: !!bricks && bricks.length > 0,
    summaryKey: 'constraint.summary',
    summaryParams,
    summary: `${passedCount}/${constraints.length} constraints passed (Validity ${validityScore.toFixed(2)}).`,
  };
}
