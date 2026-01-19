'use client';

import { useCallback, useState } from 'react';
import { AIServiceManager } from './interface';
import { getMockProvider } from './mock-provider';
import type { AIGenerateRequest, AIGenerateResponse } from '@/types';

// Create default AI service manager with mock provider
const defaultManager = new AIServiceManager(getMockProvider());

export function useAIService() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateContent = useCallback(
    async (request: AIGenerateRequest): Promise<AIGenerateResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await defaultManager.generateContent(request);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('AI generation failed');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const isAvailable = useCallback(async (): Promise<boolean> => {
    return defaultManager.isAvailable();
  }, []);

  return {
    generateContent,
    isAvailable,
    isLoading,
    error,
    providerName: defaultManager.getProviderName(),
  };
}

// Export for direct access if needed
export { defaultManager as aiServiceManager };

