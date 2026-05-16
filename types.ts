/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import * as THREE from 'three';
import type { ConstraintReport } from './utils/constraintEvaluator';

export enum AppState {
  STABLE = 'STABLE',
  GENERATING = 'GENERATING'
}

export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: number;
}

export interface BrickPiece {
  id: string;
  sizeX: number;
  sizeY: number;
  baseX: number;
  baseY: number;
  layer: number;
  color: number;
}

export interface BrickInstance {
  id: string;
  sizeX: number;
  sizeY: number;
  baseX: number;
  baseY: number;
  layer: number;
  /** World-space brick center (after normalization). Animated. */
  x: number;
  y: number;
  z: number;
  /** Final-resting world-space brick center. */
  targetX: number;
  targetY: number;
  targetZ: number;
  baseColor: THREE.Color;
  color: THREE.Color;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  rvx: number;
  rvy: number;
  rvz: number;
  /** "<sizeX>x<sizeY>" — keys into brickMeshes. */
  sizeKey: string;
  /** Index inside its size group's InstancedMesh. */
  slotIdx: number;
}

export interface SimulationVoxel {
  id: number;
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  // Physics state
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  rvx: number;
  rvy: number;
  rvz: number;
}

export interface RebuildTarget {
  x: number;
  y: number;
  z: number;
  delay: number;
  isRubble?: boolean;
}

export interface SavedModel {
  name: string;
  data: VoxelData[];
  /** Brick-line text (if the model was saved while in brick mode). Preferred for high-fidelity reload. */
  brickText?: string;
  baseModel?: string;
}

// --- Evaluation & Comparison Types ---

export interface BoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
}

export interface ConnectivityResult {
  isFullyConnected: boolean;
  componentCount: number;
  largestComponentSize: number;
}

export interface ColorDiversityResult {
  uniqueColorCount: number;
  hslVariance: number;
  dominantColor: string;
}

export interface EvaluationScores {
  voxelCount: number;
  boundingBox: BoundingBox;
  connectivity: ConnectivityResult;
  symmetryScore: number;
  colorDiversity: ColorDiversityResult;
  centeringError: { xOffset: number; zOffset: number; distance: number };
  floorCompliance: boolean;
  surfaceRatio: number;
}

export interface LLMJudgeScores {
  promptAdherence: number;
  structuralQuality: number;
  aestheticScore: number;
  creativity: number;
  commentary: string;
}

export interface GenerationRecord {
  id: string;
  prompt: string;
  model: string;
  timestamp: number;
  generationTimeMs: number;
  voxelData: VoxelData[];
  evaluation: EvaluationScores;
  llmJudge?: LLMJudgeScores;
  constraintReport?: ConstraintReport;
  sourceBricks?: string;
}
