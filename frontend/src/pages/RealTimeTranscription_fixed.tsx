import { useState, useRef, useEffect } from 'react';
import { useTranscriptionStore } from '@/hooks/useTranscriptionStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Square, Play, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ApiService } from '@/services/api';

const RealTimeTranscription = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [partialText, setPartialText] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { model, action, targetLanguage } = useTranscriptionStore();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      // Clean up slice timer if exists
      if (mediaRecorderRef.current) {
        const mediaRecorder = mediaRecorderRef.current as MediaRecorder & { __sliceTimer?: NodeJS.Timeout };
        if (mediaRecorder.__sliceTimer) {
          clearInterval(mediaRecorder.__sliceTimer);
        }
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const connectWebSocket = () => {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔗 Iniciando conexão WebSocket...');
        
        const wsUrl = `ws://localhost:8000/api/v1/transcribe/realtime`;
        console.log('🌐 Creating WebSocket connection to:', wsUrl);
        websocketRef.current = new WebSocket(wsUrl);
        
        // Track if config was acknowledged
        let configAcknowledged = false;
        
        websocketRef.current.onopen = () => {
          console.log('✅ WebSocket opened successfully, sending config...');
          console.log('🔍 WebSocket readyState:', websocketRef.current?.readyState);
          
          // Send configuration immediately
          const config = {
            type: 'config',
            model,
            action,
            target_language: action === 'translate_language' ? targetLanguage : null,
          };
          console.log('📤 Sending config:', config);
          
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            try {
              websocketRef.current.send(JSON.stringify(config));
              console.log('✅ Configuration sent successfully');
            } catch (error) {
              console.error('❌ Error sending configuration:', error);
              reject(error);
            }
          } else {
            console.error('❌ WebSocket not in OPEN state:', websocketRef.current?.readyState);
            reject(new Error('WebSocket not ready'));
          }
        };

        websocketRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📥 Received WebSocket message:', data);
            
            if (data.type === 'config_ack') {
              console.log('✅ Configuration acknowledged');
              if (!configAcknowledged) {
                configAcknowledged = true;
                setIsConnected(true);
                toast({
                  title: "Conectado!",
                  description: "Conexão estabelecida com o servidor de transcrição.",
                });
                resolve(true);
              }
              return;
            }
            
            if (data.type === 'error') {
              console.error('❌ WebSocket error:', data.message);
              toast({
                title: "Erro na transcrição",
                description: data.message,
                variant: "destructive"
              });
              return;
            }
            
            // Handle transcription messages
            if (data.text) {
              if (data.is_partial) {
                setPartialText(data.text);
              } else {
                setTranscriptionText(prev => prev + data.text + ' ');
                setPartialText('');
              }
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        websocketRef.current.onclose = (event) => {
          console.log('🔚 WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          toast({
            title: "Desconectado",
            description: "Conexão com o servidor foi perdida.",
          });
        };

        websocketRef.current.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          toast({
            title: "Erro de conexão",
            description: "Erro na conexão WebSocket.",
            variant: "destructive"
          });
          reject(error);
        };

        // Timeout para conexão
        setTimeout(() => {
          if (!configAcknowledged) {
            console.error('⏰ Configuration timeout - no config_ack received');
            console.log('🔍 WebSocket final state:', websocketRef.current?.readyState);
            websocketRef.current?.close();
            reject(new Error('Configuration timeout'));
          }
        }, 10000); // Aumentar timeout para 10 segundos

      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        toast({
          title: "Erro de conexão",
          description: "Não foi possível conectar ao servidor de transcrição.",
          variant: "destructive"
        });
        reject(error);
      }
    });
  };

  const startRecording = async () => {
    try {
      console.log('🎙️ Getting user media...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      audioStreamRef.current = stream;
      
      // Try OGG first as it tends to generate better standalone chunks
      let mimeType = 'audio/ogg;codecs=opus';
      
      // Fallback to WebM if OGG is not supported
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm;codecs=opus';
        console.log('📢 OGG not supported, using WebM');
      } else {
        console.log('📢 Using OGG format for better chunk compatibility');
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = async (event) => {
        console.log('📊 Audio data available:', event.data.size, 'bytes');
        
        if (event.data.size === 0) {
          console.warn('⚠️ Received empty audio data');
          return;
        }
        
        if (websocketRef.current?.readyState !== WebSocket.OPEN) {
          console.warn('⚠️ WebSocket not ready, current state:', websocketRef.current?.readyState);
          return;
        }
        
        try {
          // Convert blob to ArrayBuffer and send as binary data
          const arrayBuffer = await event.data.arrayBuffer();
          console.log('📤 Sending audio chunk:', arrayBuffer.byteLength, 'bytes');
          websocketRef.current.send(arrayBuffer);
        } catch (error) {
          console.error('❌ Error converting audio to ArrayBuffer:', error);
        }
      };
      
      // Connect WebSocket first and wait for config acknowledgment
      console.log('🔗 Connecting WebSocket...');
      await connectWebSocket();
      
      console.log('🎤 Starting MediaRecorder...');
      
      // Use stop/start approach to guarantee complete containers
      // This ensures each blob is a complete audio file with proper headers
      mediaRecorder.start();
      
      const SLICE_MS = 3000; // 3 seconds for better audio quality and valid containers
      let isSlicing = false;
      
      const sliceTimer = setInterval(() => {
        if (mediaRecorder.state === 'recording' && !isSlicing) {
          isSlicing = true;
          console.log('🪚 Creating new audio segment...');
          
          // Stop current recording to finalize the container
          mediaRecorder.stop();
        }
      }, SLICE_MS);
      
      // Restart recording immediately after stopping to create continuous stream
      mediaRecorder.onstop = () => {
        if (mediaRecorderRef.current && isSlicing) {
          console.log('🔄 Restarting MediaRecorder for next segment...');
          mediaRecorder.start();
          isSlicing = false;
        }
      };
      
      // Store timer reference for cleanup
      (mediaRecorder as MediaRecorder & { __sliceTimer?: NodeJS.Timeout }).__sliceTimer = sliceTimer;
      
      setIsRecording(true);
      startTimer();
      
      toast({
        title: "Gravação iniciada",
        description: "Fale próximo ao microfone para começar a transcrição.",
      });
      
    } catch (error) {
      console.error('❌ Error in startRecording:', error);
      toast({
        title: "Erro no microfone",
        description: "Não foi possível acessar o microfone. Verifique as permissões.",
        variant: "destructive"
      });
      
      // Cleanup on error
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Clear the slice timer
      const mediaRecorder = mediaRecorderRef.current as MediaRecorder & { __sliceTimer?: NodeJS.Timeout };
      if (mediaRecorder.__sliceTimer) {
        console.log('🧹 Clearing slice timer...');
        clearInterval(mediaRecorder.__sliceTimer);
        mediaRecorder.__sliceTimer = undefined;
      }
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
      
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (websocketRef.current) {
        websocketRef.current.close();
        setIsConnected(false);
      }
      
      toast({
        title: "Gravação finalizada",
        description: "A transcrição foi interrompida.",
      });
    }
  };

  const clearTranscription = () => {
    setTranscriptionText('');
    setPartialText('');
  };

  const testWebSocketConnection = async () => {
    try {
      console.log('🧪 Testing WebSocket connection...');
      await connectWebSocket();
      console.log('✅ WebSocket test successful');
    } catch (error) {
      console.error('❌ WebSocket test failed:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Transcrição em Tempo Real</h2>
        <p className="text-muted-foreground">
          Fale no microfone e veja a transcrição aparecer instantaneamente
        </p>
      </div>

      {/* Recording Controls */}
      <Card className="p-8">
        <div className="text-center space-y-6">
          {/* Status Badges */}
          <div className="flex justify-center gap-4">
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Conectado" : "Desconectado"}
            </Badge>
            <Badge variant={isRecording ? "destructive" : "secondary"}>
              {isRecording ? "Gravando" : "Parado"}
            </Badge>
            {isRecording && (
              <Badge variant="outline">
                {formatTime(recordingTime)}
              </Badge>
            )}
          </div>

          {/* Recording Button */}
          <div className="space-y-4">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                size="lg"
                className="w-48 h-16 text-lg"
              >
                <Play className="w-6 h-6 mr-2" />
                Iniciar Transcrição
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="lg"
                className="w-48 h-16 text-lg"
              >
                <Square className="w-6 h-6 mr-2" />
                Parar Transcrição
              </Button>
            )}
            
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={clearTranscription}
                disabled={isRecording}
              >
                Limpar Texto
              </Button>
              <Button
                variant="outline"
                onClick={testWebSocketConnection}
                disabled={isRecording}
              >
                Testar Conexão
              </Button>
            </div>
          </div>

          {/* Microphone Visualization */}
          <div className="flex justify-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording 
                ? 'bg-red-100 dark:bg-red-900/20 animate-pulse' 
                : 'bg-muted'
            }`}>
              {isRecording ? (
                <Mic className="w-12 h-12 text-red-600" />
              ) : (
                <MicOff className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Live Transcription */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Transcrição ao Vivo</h3>
          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processando...
            </div>
          )}
        </div>
        
        <Textarea
          value={transcriptionText + partialText}
          onChange={(e) => setTranscriptionText(e.target.value.replace(partialText, ''))}
          placeholder="A transcrição aparecerá aqui conforme você fala..."
          className="min-h-64 resize-y"
          readOnly={isRecording}
        />
        
        {partialText && (
          <p className="text-sm text-muted-foreground mt-2">
            <span className="font-medium">Processando:</span> {partialText}
          </p>
        )}

        {transcriptionText && (
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(transcriptionText)}
            >
              Copiar Texto
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RealTimeTranscription;
