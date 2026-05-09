export interface GeneratorChildOption {
  key: string;
  label: string;
  enabled: boolean;
  modelCandidates?: readonly string[];
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

export const SOURCE_OPTIONS: readonly GeneratorSourceOption[] = [
  {
    key: 'gemini',
    label: 'Gemini',
    enabled: true,
    children: GEMINI_MODEL_OPTIONS,
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

export function normalizeGeneratorSelection(selection: string): string {
  if (selection === 'gemini') {
    return GEMINI_MODEL_OPTIONS[0].key;
  }

  return selection;
}

export function getGeminiModelOption(selection: string): GeneratorChildOption | undefined {
  return GEMINI_MODEL_OPTIONS.find((option) => option.key === selection);
}

export function isGeminiModelSelection(selection: string): boolean {
  return !!getGeminiModelOption(selection);
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