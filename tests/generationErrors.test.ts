import assert from 'node:assert/strict';
import test from 'node:test';
import type { Provider } from '../services/generators/keys';
import { describeGenerationFailure } from '../utils/generationErrors';

const t = (key: string, params?: Record<string, string | number>): string => {
  if (!params) return key;
  return `${key}:${JSON.stringify(params)}`;
};

test('maps Gemini fetch failures to an actionable network message', () => {
  assert.equal(
    describeGenerationFailure(new TypeError('Failed to fetch'), 'gemini', t),
    'app.alert.network_error.gemini',
  );
});

test('maps generic fetch failures without losing the raw detail', () => {
  assert.equal(
    describeGenerationFailure(new Error('fetch failed'), 'mock' as Provider, t),
    'app.alert.network_error.generic:{"message":"fetch failed"}',
  );
});

test('keeps provider API errors readable', () => {
  const message = 'DeepSeek API error (401): invalid key';
  assert.equal(
    describeGenerationFailure(new Error(message), 'deepseek', t),
    message,
  );
});
