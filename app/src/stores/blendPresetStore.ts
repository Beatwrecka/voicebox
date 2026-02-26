import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LanguageCode } from '@/lib/constants/languages';

export interface BlendPreset {
  id: string;
  name: string;
  primaryProfileId: string | null;
  secondaryProfileId: string | null;
  secondaryWeight: number;
  pitchShift: number;
  formantShift: number;
  language: LanguageCode;
  modelSize: '1.7B' | '0.6B';
  createdAt: string;
}

interface BlendPresetStore {
  presets: BlendPreset[];
  savePreset: (preset: Omit<BlendPreset, 'id' | 'createdAt'>) => BlendPreset;
  deletePreset: (id: string) => void;
}

export const useBlendPresetStore = create<BlendPresetStore>()(
  persist(
    (set) => ({
      presets: [],
      savePreset: (preset) => {
        const savedPreset: BlendPreset = {
          ...preset,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          presets: [savedPreset, ...state.presets].slice(0, 30),
        }));

        return savedPreset;
      },
      deletePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((preset) => preset.id !== id),
        })),
    }),
    {
      name: 'voicebox-blend-presets',
    },
  ),
);
