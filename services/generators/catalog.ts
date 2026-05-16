export interface GeneratorChildOption {
  key: string;
  label: string;
  enabled: boolean;
  modelCandidates?: readonly string[];
  /** Provider-specific model identifier sent in the API request body. Used by DeepSeek today. */
  apiId?: string;
}

export interface GeneratorSourceOption {
  key: string;
  label: string;
  enabled: boolean;
  children?: readonly GeneratorChildOption[];
}

export const GEMINI_MODEL_OPTIONS: readonly GeneratorChildOption[] = [
  {
    key: 'gemini-2.5-flash',
    label: '2.5 Flash',
    enabled: true,
    modelCandidates: ['gemini-2.5-flash', 'gemini-flash-latest'],
  },
  {
    key: 'gemini-2.5-flash-lite',
    label: '2.5 Flash-Lite',
    enabled: true,
    modelCandidates: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest'],
  },
  {
    key: 'gemini-2.5-pro',
    label: '2.5 Pro',
    enabled: true,
    modelCandidates: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  },
  {
    key: 'gemini-3.1-pro-preview',
    label: '3.1 Pro Preview',
    enabled: true,
    modelCandidates: ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'],
  },
] as const;

/**
 * DeepSeek model options.
 *
 * apiId values are the official V4 IDs (`deepseek-v4-pro` / `deepseek-v4-flash`).
 * The legacy `deepseek-chat` alias maps to V4 Flash today but is scheduled for
 * deprecation 2026-07-24, so we send the canonical IDs directly.
 */
export const DEEPSEEK_MODEL_OPTIONS: readonly GeneratorChildOption[] = [
  {
    key: 'deepseek-v4-flash',
    label: 'V4 Flash',
    enabled: true,
    apiId: 'deepseek-v4-flash',
  },
  {
    // V4 Pro is the 1.6T-parameter model; its "thinking" phase before the first
    // stream chunk can run 1–5 minutes on complex prompts. The UI marks it slower.
    key: 'deepseek-v4-pro',
    label: 'V4 Pro (slower)',
    enabled: true,
    apiId: 'deepseek-v4-pro',
  },
] as const;

export const SOURCE_OPTIONS: readonly GeneratorSourceOption[] = [
  {
    key: 'gemini',
    label: 'Gemini',
    enabled: true,
    children: GEMINI_MODEL_OPTIONS,
  },
  {
    key: 'deepseek',
    label: 'DeepSeek',
    enabled: true,
    children: DEEPSEEK_MODEL_OPTIONS,
  },
  {
    key: 'geo3d-grpo',
    label: 'Geo3D GRPO',
    enabled: true,
  },
  {
    key: 'mock',
    label: 'Mock',
    enabled: true,
  },
  {
    key: 'brickgpt',
    label: 'BrickGPT',
    enabled: false,
  },
  {
    key: 'voxelAI model',
    label: 'VoxelAI',
    enabled: false,
  },
  {
    key: '自定义',
    label: 'Custom',
    enabled: false,
  },
] as const;

/** Top-level sources shown when the user enables "all vendors" in settings (excludes disabled placeholders). */
const MODEL_PICKER_ALL_VENDOR_KEYS = new Set(['gemini', 'deepseek', 'geo3d-grpo', 'mock']);

/**
 * Options for the model-source dropdowns in the main UI and comparison view.
 * When `googleOnly` is true, only Gemini (Google) appears — for demos focused on the Gemini stack.
 */
export function modelPickerSourceOptions(googleOnly: boolean): readonly GeneratorSourceOption[] {
  if (googleOnly) {
    return SOURCE_OPTIONS.filter((o) => o.key === 'gemini');
  }
  return SOURCE_OPTIONS.filter((o) => MODEL_PICKER_ALL_VENDOR_KEYS.has(o.key));
}

export function normalizeGeneratorSelection(selection: string): string {
  if (selection === 'gemini') {
    return GEMINI_MODEL_OPTIONS[0].key;
  }
  if (selection === 'deepseek') {
    return DEEPSEEK_MODEL_OPTIONS[0].key;
  }
  return selection;
}

export function getGeminiModelOption(selection: string): GeneratorChildOption | undefined {
  return GEMINI_MODEL_OPTIONS.find((option) => option.key === selection);
}

export function isGeminiModelSelection(selection: string): boolean {
  return !!getGeminiModelOption(selection);
}

export function getDeepSeekModelOption(selection: string): GeneratorChildOption | undefined {
  return DEEPSEEK_MODEL_OPTIONS.find((option) => option.key === selection);
}

export function isDeepSeekModelSelection(selection: string): boolean {
  return !!getDeepSeekModelOption(selection);
}

export function getSelectionDisplay(selection: string): {
  primary: string;
  secondary?: string;
  fullLabel: string;
} {
  const normalized = normalizeGeneratorSelection(selection);
  const geminiOption = getGeminiModelOption(normalized);

  if (geminiOption) {
    return {
      primary: 'Gemini',
      secondary: geminiOption.label,
      fullLabel: `Gemini ${geminiOption.label}`,
    };
  }

  const deepseekOption = getDeepSeekModelOption(normalized);
  if (deepseekOption) {
    return {
      primary: 'DeepSeek',
      secondary: deepseekOption.label,
      fullLabel: `DeepSeek ${deepseekOption.label}`,
    };
  }

  if (normalized === 'geo3d-grpo') {
    return {
      primary: 'Geo3D',
      secondary: 'GRPO best-of-4',
      fullLabel: 'Geo3D GRPO',
    };
  }

  const option = SOURCE_OPTIONS.find((item) => item.key === normalized);
  if (option) {
    return {
      primary: option.label,
      fullLabel: option.label,
    };
  }

  return {
    primary: normalized,
    fullLabel: normalized,
  };
}