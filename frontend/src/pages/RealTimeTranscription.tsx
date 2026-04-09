import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranscriptionStore } from '@/hooks/useTranscriptionStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Square, Loader2, Copy, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ApiService } from '@/services/api';

const RealTimeTranscription = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [segments, setSegments] = useState<string[]>([]);
  const [partialText, setPartialText] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { model, action } = useTranscriptionStore();
  const [, setFfmpegNotice] = useState<string | null>(null);

  const liveText = useMemo(() => {
    return [...segments, partialText].filter(t => t.trim()).join(' ');
  }, [segments, partialText]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (websocketRef.current) websocketRef.current.close();
      if (audioStreamRef.current)
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      if (mediaRecorderRef.current) {
        const mr = mediaRecorderRef.current as MediaRecorder & { __sliceTimer?: ReturnType<typeof setTimeout> };
        if (mr.__sliceTimer) clearInterval(mr.__sliceTimer);
      }
    };
  }, []);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const connectWebSocket = () => {
    return new Promise((resolve, reject) => {
      try {
        websocketRef.current = ApiService.createRealtimeWebSocket();

        let configAcknowledged = false;

        websocketRef.current.onopen = () => {
          const config = {
            type: 'config',
            model,
            action,
          };
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            try {
              websocketRef.current.send(JSON.stringify(config));
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error('WebSocket not ready'));
          }
        };

        websocketRef.current.onmessage = event => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'config_ack') {
              if (!configAcknowledged) {
                configAcknowledged = true;
                setIsConnected(true);
                toast({ title: 'Conectado ao servidor de transcrição' });
                resolve(true);
              }
              return;
            }

            if (data.type === 'error') {
              toast({ title: 'Erro na transcrição', description: data.message, variant: 'destructive' });
              return;
            }

            if (data.text) {
              if (data.is_final_segment) {
                setSegments(prev => [...prev, data.text]);
                setPartialText('');
              } else if (data.is_partial) {
                setPartialText(data.text);
              } else {
                setSegments(prev => {
                  const last = prev[prev.length - 1] || '';
                  if (last.endsWith(data.text.trim())) return prev;
                  return [...prev, data.text];
                });
                setPartialText('');
              }
            }
          } catch {
            // ignore parse errors
          }
        };

        websocketRef.current.onclose = () => {
          setIsConnected(false);
        };

        websocketRef.current.onerror = error => {
          toast({ title: 'Erro de conexão', description: 'Não foi possível conectar.', variant: 'destructive' });
          reject(error);
        };

        setTimeout(() => {
          if (!configAcknowledged) {
            websocketRef.current?.close();
            reject(new Error('Configuration timeout'));
          }
        }, 10000);
      } catch (error) {
        toast({ title: 'Erro de conexão', variant: 'destructive' });
        reject(error);
      }
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      audioStreamRef.current = stream;

      let mimeType = 'audio/ogg;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm;codecs=opus';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async event => {
        if (event.data.size === 0) return;
        if (websocketRef.current?.readyState !== WebSocket.OPEN) return;

        try {
          const arrayBuffer = await event.data.arrayBuffer();
          websocketRef.current.send(arrayBuffer);
        } catch {
          // ignore send errors
        }
      };

      await connectWebSocket();

      mediaRecorder.start();

      const SLICE_MS = 3000;
      let isSlicing = false;

      const sliceTimer = setInterval(() => {
        if (mediaRecorder.state === 'recording' && !isSlicing) {
          isSlicing = true;
          mediaRecorder.stop();
        }
      }, SLICE_MS);

      mediaRecorder.onstop = () => {
        if (mediaRecorderRef.current && isSlicing) {
          mediaRecorder.start();
          isSlicing = false;
        }
      };

      (mediaRecorder as MediaRecorder & { __sliceTimer?: ReturnType<typeof setTimeout> }).__sliceTimer = sliceTimer;

      setIsRecording(true);
      setFfmpegNotice(null);
      startTimer();

      toast({ title: 'Gravação iniciada', description: 'Fale próximo ao microfone.' });
    } catch {
      toast({ title: 'Erro no microfone', description: 'Verifique as permissões.', variant: 'destructive' });
      if (audioStreamRef.current)
        audioStreamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    const mediaRecorder = mediaRecorderRef.current as MediaRecorder & { __sliceTimer?: ReturnType<typeof setTimeout> };
    if (mediaRecorder.__sliceTimer) {
      clearInterval(mediaRecorder.__sliceTimer);
      mediaRecorder.__sliceTimer = undefined;
    }

    mediaRecorderRef.current.requestData();
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    stopTimer();

    if (audioStreamRef.current)
      audioStreamRef.current.getTracks().forEach(t => t.stop());

    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      try {
        await new Promise<void>(resolve => {
          const ws = websocketRef.current;
          if (!ws) { resolve(); return; }

          let timeoutId: ReturnType<typeof setTimeout>;

          const flushHandler = (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'done') {
                ws.removeEventListener('message', flushHandler);
                clearTimeout(timeoutId);
                resolve();
              }
              if (data.text && data.is_final_segment) {
                setSegments(prev => [...prev, data.text]);
                setPartialText('');
              }
            } catch {
              ws.removeEventListener('message', flushHandler);
              clearTimeout(timeoutId);
              resolve();
            }
          };

          timeoutId = setTimeout(() => {
            ws.removeEventListener('message', flushHandler);
            resolve();
          }, 10000);

          ws.addEventListener('message', flushHandler);
          ws.send(JSON.stringify({ type: 'flush' }));
        });
      } catch {
        // ignore
      }

      websocketRef.current.close(1000, 'client-finished');
      setIsConnected(false);
    }

    toast({ title: 'Gravação finalizada' });
  };

  const clearTranscription = () => {
    setSegments([]);
    setPartialText('');
    setFfmpegNotice(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Transcrição em Tempo Real</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fale no microfone e veja a transcrição aparecer instantaneamente
        </p>
      </div>

      {/* Recording Control */}
      <div className="flex flex-col items-center gap-6 py-6">
        {/* Mic Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`
            relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            ${isRecording
              ? 'bg-destructive text-destructive-foreground animate-recording shadow-lg shadow-destructive/30'
              : 'bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20'
            }
          `}
          aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
        >
          {isRecording ? (
            <Square className="w-7 h-7 fill-current" />
          ) : (
            <Mic className="w-7 h-7" />
          )}
        </button>

        {/* Status Row */}
        <div className="flex items-center gap-3 text-sm">
          {isRecording ? (
            <>
              <span className="flex items-center gap-1.5 text-destructive font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                Gravando
              </span>
              <span className="text-muted-foreground font-mono">{formatTime(recordingTime)}</span>
            </>
          ) : (
            <span className={`flex items-center gap-1.5 text-muted-foreground`}>
              <MicOff className="w-3.5 h-3.5" />
              Clique para iniciar
            </span>
          )}

          {isConnected && !isRecording && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Conectado
            </span>
          )}
        </div>
      </div>

      {/* Live Transcription */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Transcrição ao Vivo</h3>
            {isRecording && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Processando
              </span>
            )}
          </div>

          {(liveText || partialText) && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(liveText);
                  toast({ title: 'Copiado para a área de transferência' });
                }}
                className="h-7 px-2 text-xs gap-1.5"
              >
                <Copy className="w-3 h-3" />
                Copiar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearTranscription}
                disabled={isRecording}
                className="h-7 px-2 text-xs gap-1.5 text-muted-foreground"
              >
                <Trash2 className="w-3 h-3" />
                Limpar
              </Button>
            </div>
          )}
        </div>

        <Textarea
          value={liveText}
          onChange={e => {
            if (!isRecording) {
              const text = e.target.value;
              setSegments(text ? [text] : []);
              setPartialText('');
            }
          }}
          placeholder="A transcrição aparecerá aqui conforme você fala..."
          className="min-h-64 resize-y text-sm leading-relaxed bg-card"
          readOnly={isRecording}
        />

        {partialText && (
          <p className="text-xs text-muted-foreground px-1">
            <span className="font-medium">Processando:</span> {partialText}
          </p>
        )}
      </div>
    </div>
  );
};

export default RealTimeTranscription;
