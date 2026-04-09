import { useState, useRef, useEffect, useMemo } from 'react';
import { WhisperModel, useTranscriptionStore } from '@/hooks/useTranscriptionStore';
import { useHistoryStore } from '@/hooks/useHistoryStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Square, Loader2, Copy, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ApiService } from '@/services/api';
import { getPreferredModelForAction } from '@/lib/modelCatalog';

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
  const segmentsRef = useRef<string[]>([]);
  const partialTextRef = useRef('');
  const activeModelRef = useRef<WhisperModel>('turbo');

  const { model, action } = useTranscriptionStore();
  const { entries, selectedId, addEntry, selectEntry } = useHistoryStore();

  const updateSegments = (
    next:
      | string[]
      | ((previous: string[]) => string[]),
  ) => {
    setSegments((previous) => {
      const resolved =
        typeof next === 'function'
          ? next(previous)
          : next;
      segmentsRef.current = resolved;
      return resolved;
    });
  };

  const updatePartialText = (next: string) => {
    partialTextRef.current = next;
    setPartialText(next);
  };

  const liveText = useMemo(() => {
    return [...segments, partialText].filter(t => t.trim()).join(' ');
  }, [segments, partialText]);

  useEffect(() => {
    if (isRecording) return;

    if (!selectedId) {
      updateSegments([]);
      updatePartialText('');
      return;
    }

    const entry = entries.find((item) => item.id === selectedId && item.type === 'realtime');
    if (!entry) return;

    updateSegments(entry.text ? [entry.text] : []);
    updatePartialText('');
  }, [entries, isRecording, selectedId]);

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

  const getCurrentTranscript = () => {
    return [...segmentsRef.current, partialTextRef.current]
      .filter(text => text.trim())
      .join(' ');
  };

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

  const connectWebSocket = (resolvedModel: typeof model) => {
    return new Promise((resolve, reject) => {
      let configAcknowledged = false;
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const rejectConnection = (error: unknown) => {
        if (settled) return;
        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(error instanceof Error ? error : new Error('WebSocket connection failed'));
      };

      const resolveConnection = () => {
        if (settled) return;
        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(true);
      };

      try {
        websocketRef.current = ApiService.createRealtimeWebSocket();

        websocketRef.current.onopen = () => {
          const config = {
            type: 'config',
            model: resolvedModel,
            action,
          };
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            try {
              websocketRef.current.send(JSON.stringify(config));
            } catch (error) {
              rejectConnection(error);
            }
          } else {
            rejectConnection(new Error('WebSocket not ready'));
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
                resolveConnection();
              }
              return;
            }

            if (data.type === 'error') {
              toast({ title: 'Erro na transcrição', description: data.message, variant: 'destructive' });
              if (!configAcknowledged) {
                websocketRef.current?.close();
                rejectConnection(new Error(data.message || 'Invalid realtime configuration'));
              }
              return;
            }

            if (data.text) {
              if (data.is_final_segment) {
                updateSegments(prev => [...prev, data.text]);
                updatePartialText('');
              } else if (data.is_partial) {
                updatePartialText(data.text);
              } else {
                updateSegments(prev => {
                  const last = prev[prev.length - 1] || '';
                  if (last.endsWith(data.text.trim())) return prev;
                  return [...prev, data.text];
                });
                updatePartialText('');
              }
            }
          } catch {
            // ignore parse errors
          }
        };

        websocketRef.current.onclose = () => {
          setIsConnected(false);
          if (!configAcknowledged) {
            rejectConnection(new Error('Connection closed before configuration was acknowledged'));
          }
        };

        websocketRef.current.onerror = error => {
          toast({ title: 'Erro de conexão', description: 'Não foi possível conectar.', variant: 'destructive' });
          rejectConnection(error);
        };

        timeoutId = setTimeout(() => {
          if (!configAcknowledged) {
            websocketRef.current?.close();
            rejectConnection(new Error('Configuration timeout'));
          }
        }, 10000);
      } catch (error) {
        toast({ title: 'Erro de conexão', variant: 'destructive' });
        rejectConnection(error);
      }
    });
  };

  const startRecording = async () => {
    try {
      const resolvedModel = getPreferredModelForAction(
        action,
        ['small', 'medium', 'turbo'],
      );
      if (!resolvedModel) {
        toast({
          title: 'Modelo incompatível',
          description: 'Selecione um modelo compatível com a ação escolhida.',
          variant: 'destructive',
        });
        return;
      }

      selectEntry(null);
      updateSegments([]);
      updatePartialText('');

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

      await connectWebSocket(resolvedModel);
      activeModelRef.current = resolvedModel;

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
      startTimer();

      toast({ title: 'Gravação iniciada', description: 'Fale próximo ao microfone.' });
    } catch (error) {
      const description =
        error instanceof Error && error.message
          ? error.message
          : 'Verifique as permissões do microfone e a conexão com o backend.';

      toast({
        title: 'Erro ao iniciar gravação',
        description,
        variant: 'destructive',
      });
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

          const flushHandler = (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'done') {
                ws.removeEventListener('message', flushHandler);
                clearTimeout(timeoutId);
                resolve();
              }
            } catch {
              ws.removeEventListener('message', flushHandler);
              clearTimeout(timeoutId);
              resolve();
            }
          };

          const timeoutId = setTimeout(() => {
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

    const finalTranscript = getCurrentTranscript();
    if (finalTranscript) {
      addEntry({
        title: finalTranscript.slice(0, 80),
        text: finalTranscript,
        type: 'realtime',
        model: activeModelRef.current,
        action,
      });
    }

    toast({ title: 'Gravação finalizada' });
  };

  const clearTranscription = () => {
    selectEntry(null);
    updateSegments([]);
    updatePartialText('');
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
        <div className="relative flex items-center justify-center">
          {/* Outer animated rings when recording */}
          {isRecording && (
            <>
              <span className="absolute w-24 h-24 rounded-full bg-destructive/20 animate-ping" />
              <span className="absolute w-28 h-28 rounded-full border-2 border-destructive/30 animate-pulse" />
            </>
          )}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`
              relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              ${isRecording
                ? 'bg-destructive text-destructive-foreground animate-recording shadow-lg shadow-destructive/40 scale-110'
                : 'bg-primary text-primary-foreground hover:opacity-90 hover:scale-105 shadow-md shadow-primary/20'
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
        </div>

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
              updateSegments(text ? [text] : []);
              updatePartialText('');
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
