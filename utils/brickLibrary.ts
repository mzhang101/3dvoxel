/**
 * Shared brick-library constants used by:
 *  - the constraint evaluator (validity check against allowed dimensions),
 *  - the LLM generator prompts (instructing models to stay within the library).
 *
 * Order matches the GRPO training prompt so generated outputs feel familiar
 * to the SFT/GRPO checkpoints.
 */

export const ALLOWED_BRICK_DIMENSIONS: readonly string[] = [
  '2x4', '4x2', '2x6', '6x2',
  '1x2', '2x1', '1x4', '4x1', '1x6', '6x1', '1x8', '8x1',
  '1x1', '2x2',
];

export const ALLOWED_BRICK_SET: ReadonlySet<string> = new Set(ALLOWED_BRICK_DIMENSIONS);

/** Comma-separated list ready to inline inside an LLM prompt. */
export const ALLOWED_BRICKS_LIST: string = ALLOWED_BRICK_DIMENSIONS.join(', ');
