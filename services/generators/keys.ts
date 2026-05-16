export type Provider = 'gemini' | 'deepseek' | 'mock';

export function providerOf(modelKey: string): Provider {
  if (!modelKey) return 'gemini';
  if (modelKey === 'mock') return 'mock';
  if (modelKey === 'geo3d-grpo') return 'mock'; // local lookup, no API key required
  if (modelKey.startsWith('deepseek-') || modelKey === 'deepseek') return 'deepseek';
  return 'gemini';
}

export function storageKeyFor(provider: Provider): string {
  switch (provider) {
    case 'deepseek': return 'deepseek_api_key';
    case 'gemini':   return 'gemini_api_key';
    case 'mock':     return '';
  }
}

export function readSavedKey(provider: Provider): string {
  if (typeof window === 'undefined') return '';
  const storageKey = storageKeyFor(provider);
  if (!storageKey) return '';
  return window.localStorage.getItem(storageKey) ?? '';
}

export function writeSavedKey(provider: Provider, value: string): void {
  if (typeof window === 'undefined') return;
  const storageKey = storageKeyFor(provider);
  if (!storageKey) return;
  if (value) window.localStorage.setItem(storageKey, value);
  else window.localStorage.removeItem(storageKey);
}

export function missingKeyAlertKey(provider: Provider): string {
  return provider === 'deepseek'
    ? 'app.alert.missing_api_key.deepseek'
    : 'app.alert.missing_api_key.gemini';
}
