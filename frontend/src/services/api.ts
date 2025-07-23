import { WhisperModel, TranscriptionAction } from '@/hooks/useTranscriptionStore';

// Use environment variable or fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');

export interface TranscriptionResponse {
  model: string;
  action: string;
  text: string;
  target_language?: string;
}

export interface TranscriptionRequest {
  file: File;
  model: WhisperModel;
  action: TranscriptionAction;
  target_language?: string;
}

export class ApiService {
  static async transcribeFile(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('model', request.model);
    formData.append('action', request.action);
    
    if (request.action === 'translate_language' && request.target_language) {
      formData.append('target_language', request.target_language);
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/transcribe/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  static createRealtimeWebSocket(): WebSocket {
    const wsUrl = `${WS_BASE_URL}/api/v1/transcribe/realtime`;
    console.log('🌐 Creating WebSocket connection to:', wsUrl);
    return new WebSocket(wsUrl);
  }

  static async healthCheck(): Promise<{ status: string; service: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return response.json();
  }
}
