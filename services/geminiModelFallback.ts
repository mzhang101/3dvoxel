export const GEMINI_GENERATION_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
] as const;

export const GEMINI_JUDGE_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest',
] as const;

export async function runWithGeminiModelFallback<T>(
  models: readonly string[],
  runner: (model: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];

    try {
      return await runner(model);
    } catch (error) {
      lastError = error;

      const canFallback = index < models.length - 1 && shouldFallbackToNextModel(error);
      if (!canFallback) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('All Gemini model attempts failed.');
}

function shouldFallbackToNextModel(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes('NOT_FOUND') ||
    message.includes('UNAVAILABLE') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('"code":404') ||
    message.includes('"code":429') ||
    message.includes('"code":503')
  );
}