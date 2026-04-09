import { create } from 'zustand';

export type WhisperModel = 'small' | 'medium' | 'turbo';
export type TranscriptionAction = 'transcribe' | 'translate_english';

interface TranscriptionState {
  model: WhisperModel;
  action: TranscriptionAction;
  setModel: (model: WhisperModel) => void;
  setAction: (action: TranscriptionAction) => void;
}

export const useTranscriptionStore = create<TranscriptionState>((set) => ({
  model: 'turbo',
  action: 'transcribe',
  setModel: (model) => set({ model }),
  setAction: (action) => set({ action }),
}));
