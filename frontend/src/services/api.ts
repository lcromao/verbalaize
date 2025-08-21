import { WhisperModel, TranscriptionAction } from '@/hooks/useTranscriptionStore';

// Resolve API base URL:
// - Prefer VITE_API_URL when provided at build time
// - Otherwise use the current page origin (same-origin requests avoid CORS/mismatch localhost vs 127.0.0.1)
const API_BASE_URL = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim())
  ? import.meta.env.VITE_API_URL.trim()
  : window.location.origin;

// Derive WS base URL from current location to avoid mixed origin issues
const WS_BASE_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

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
