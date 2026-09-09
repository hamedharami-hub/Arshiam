'use client';

import { UserAiConfig, AiModelOption } from '@/types/pharmacy';
import { DEFAULT_AI_CONFIG, sanitizeModelId } from '@/lib/aiService';
import { saveUserAiConfigToFirestore, loadUserAiConfigFromFirestore } from '@/lib/firebase';

export const AI_CONFIG_STORAGE_KEY = 'pharmacy_ai_config_v4';

export function getClientAiConfig(): UserAiConfig {
  if (typeof window === 'undefined') return DEFAULT_AI_CONFIG;
  try {
    const raw =
      localStorage.getItem(AI_CONFIG_STORAGE_KEY) ||
      localStorage.getItem('pharmacy_ai_config_v3') ||
      localStorage.getItem('pharmacy_ai_config_v2');
    if (!raw) return DEFAULT_AI_CONFIG;
    const parsed = JSON.parse(raw);

    const modelList: AiModelOption[] = Array.isArray(parsed.customModels)
      ? parsed.customModels.filter((m: any) => m && m.id)
      : [];

    const validatedConfig: UserAiConfig = {
      preferredProvider:
        parsed.preferredProvider === 'groq' || parsed.preferredProvider === 'xai'
          ? parsed.preferredProvider
          : 'gemini',
      geminiApiKey: parsed.geminiApiKey || '',
      groqApiKey: parsed.groqApiKey || '',
      xaiApiKey: parsed.xaiApiKey || '',
      flashcardModel: parsed.flashcardModel || (modelList[0]?.id || ''),
      tutorModel: parsed.tutorModel || (modelList[0]?.id || ''),
      temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 0.2,
      customModels: modelList,
    };

    return validatedConfig;
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function saveClientAiConfig(config: UserAiConfig, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
    
    // If user is authenticated, also sync directly to Firebase Cloud
    if (userId) {
      saveUserAiConfigToFirestore(userId, config).catch((err) => {
        console.warn('Could not sync AI config to cloud:', err);
      });
    }
  } catch (err) {
    console.error('Failed to save AI config to localStorage', err);
  }
}

/**
 * Loads AI config from Cloud and merges with local storage upon user login
 */
export async function syncAiConfigFromCloud(userId: string): Promise<UserAiConfig | null> {
  if (!userId) return null;
  try {
    const cloudConfig = await loadUserAiConfigFromFirestore(userId);
    if (cloudConfig) {
      const local = getClientAiConfig();
      const merged: UserAiConfig = {
        preferredProvider: cloudConfig.preferredProvider || local.preferredProvider || 'gemini',
        // API keys are device-local secrets and are never restored from Firestore.
        geminiApiKey: local.geminiApiKey || '',
        groqApiKey: local.groqApiKey || '',
        xaiApiKey: local.xaiApiKey || '',
        flashcardModel: cloudConfig.flashcardModel || local.flashcardModel || '',
        tutorModel: cloudConfig.tutorModel || local.tutorModel || '',
        temperature: typeof cloudConfig.temperature === 'number' ? cloudConfig.temperature : local.temperature,
        customModels: Array.isArray(cloudConfig.customModels) && cloudConfig.customModels.length > 0
          ? cloudConfig.customModels
          : local.customModels,
      };
      
      saveClientAiConfig(merged, userId);
      return merged;
    }
  } catch (error) {
    console.error('Failed to sync AI config from cloud:', error);
  }
  return null;
}
