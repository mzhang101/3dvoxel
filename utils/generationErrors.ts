import type { Provider } from '../services/generators/keys';

type Translator = (key: string, params?: Record<string, string | number>) => string;

const FETCH_ERROR_PATTERNS = [
  /failed to fetch/i,
  /fetch failed/i,
  /networkerror/i,
  /load failed/i,
];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function isFetchNetworkError(error: unknown): boolean {
  const message = errorMessage(error);
  return FETCH_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function describeGenerationFailure(
  error: unknown,
  provider: Provider,
  t: Translator,
): string {
  const message = errorMessage(error);

  if (!isFetchNetworkError(error)) {
    return message;
  }

  if (provider === 'gemini') {
    return t('app.alert.network_error.gemini');
  }

  if (provider === 'deepseek') {
    return t('app.alert.network_error.deepseek');
  }

  return t('app.alert.network_error.generic', { message });
}
