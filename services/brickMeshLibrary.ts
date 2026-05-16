import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { ALLOWED_BRICK_DIMENSIONS } from '../utils/brickLibrary';

/**
 * Brick mesh library — precomputed THREE.BufferGeometry for every allowed
 * brick size. Each geometry is a single connected mesh combining:
 *   - the brick body: BoxGeometry(sx-GAP, 1-GAP, sy-GAP)
 *   - LEGO-style studs: short cylinders on top of every 1×1 cell
 *
 * Geometries are origin-centered, sized in world units (1 unit per cell).
 * Callers position the mesh at the brick center (see comments in
 * VoxelEngine.loadBrickModel).
 */

const GAP = 0.08;
const STUD_RADIUS = 0.25;
const STUD_HEIGHT = 0.18;
const STUD_SEGMENTS = 12;

const cache = new Map<string, THREE.BufferGeometry>();

function buildBrickGeometry(sizeX: number, sizeY: number): THREE.BufferGeometry {
  const halfX = sizeX / 2;
  const halfY = sizeY / 2;
  const body = new THREE.BoxGeometry(sizeX - GAP, 1 - GAP, sizeY - GAP);

  const studGeometries: THREE.BufferGeometry[] = [];
  for (let dx = 0; dx < sizeX; dx += 1) {
    for (let dy = 0; dy < sizeY; dy += 1) {
      const stud = new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, STUD_SEGMENTS);
      // Position the stud: centred above its 1×1 cell.
      // Cell center (relative to brick center): (dx + 0.5 - halfX, 0, dy + 0.5 - halfY).
      // Stud sits on top of the brick: y = (1 - GAP)/2 + STUD_HEIGHT/2.
      stud.translate(
        dx + 0.5 - halfX,
        (1 - GAP) / 2 + STUD_HEIGHT / 2,
        dy + 0.5 - halfY,
      );
      studGeometries.push(stud);
    }
  }

  const merged = mergeGeometries([body, ...studGeometries], false);
  if (!merged) {
    // Fallback if merge fails for any reason (shouldn't happen with matching attributes).
    body.computeVertexNormals();
    return body;
  }
  // Dispose the temporary stud geometries since mergeGeometries copies their attributes.
  studGeometries.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

export function getBrickGeometry(sizeX: number, sizeY: number): THREE.BufferGeometry {
  const key = `${sizeX}x${sizeY}`;
  let geom = cache.get(key);
  if (!geom) {
    geom = buildBrickGeometry(sizeX, sizeY);
    cache.set(key, geom);
  }
  return geom;
}

export function disposeBrickLibrary(): void {
  cache.forEach((g) => g.dispose());
  cache.clear();
}

/** Pre-warm the cache (optional). */
export function warmBrickLibrary(): void {
  for (const dim of ALLOWED_BRICK_DIMENSIONS) {
    const [sx, sy] = dim.split('x').map(Number);
    getBrickGeometry(sx, sy);
  }
}
