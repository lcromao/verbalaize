import { create } from 'zustand';

export type WhisperModel = 'small' | 'medium' | 'turbo';
export type TranscriptionAction = 'transcribe' | 'translate_english' | 'translate_language';

interface TranscriptionState {
  model: WhisperModel;
  action: TranscriptionAction;
  targetLanguage: string;
  setModel: (model: WhisperModel) => void;
  setAction: (action: TranscriptionAction) => void;
  setTargetLanguage: (language: string) => void;
}

export const useTranscriptionStore = create<TranscriptionState>((set) => ({
  model: 'medium',
  action: 'transcribe',
  targetLanguage: 'pt',
  setModel: (model) => set({ model }),
  setAction: (action) => set({ action }),
  setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
}));