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
}

export interface TranscriptionJobAccepted {
  job_id: string;
  status: string;
  progress: number;
}

export interface TranscriptionJobStatus {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  model: string;
  action: string;
  text?: string | null;
  error?: string | null;
}

export interface TranscriptionRequest {
  file: File;
  model: WhisperModel;
  action: TranscriptionAction;
}

export class ApiService {
  static async startTranscriptionJob(
    request: TranscriptionRequest,
  ): Promise<TranscriptionJobAccepted> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('model', request.model);
    formData.append('action', request.action);

    const response = await fetch(`${API_BASE_URL}/api/v1/transcribe/upload/start`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  static async getTranscriptionJobStatus(jobId: string): Promise<TranscriptionJobStatus> {
    const response = await fetch(`${API_BASE_URL}/api/v1/transcribe/upload/status/${jobId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  static async transcribeFile(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('model', request.model);
    formData.append('action', request.action);

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
