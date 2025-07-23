import { useState, useRef } from 'react';
import { useTranscriptionStore } from '@/hooks/useTranscriptionStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Upload, FileAudio, X, Loader2, Copy, Download, Trash2, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ApiService } from '@/services/api';

const UploadTranscription = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { model, action, targetLanguage } = useTranscriptionStore();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Lista expandida de tipos suportados
      const validTypes = [
        'audio/mpeg', 'audio/mp3',           // MP3
        'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/mp4a',  // M4A/MP4
        'audio/wav', 'audio/wave', 'audio/x-wav',  // WAV
        'audio/opus', 'audio/ogg', 'audio/x-opus', // Opus/OGG
        'audio/webm',                        // WebM
        'audio/flac', 'audio/x-flac',        // FLAC
        'audio/aac', 'audio/x-aac',          // AAC
        'audio/3gpp', 'audio/3gpp2',         // 3GP
        'audio/amr', 'audio/x-amr',          // AMR
        'video/mp4',                         // MP4 video (com áudio)
        'application/octet-stream'           // Fallback
      ];
      
      // Extensões válidas como fallback
      const validExtensions = [
        '.mp3', '.m4a', '.wav', '.opus', '.ogg', '.flac', 
        '.aac', '.webm', '.mp4', '.3gp', '.amr'
      ];
      
      const hasValidType = validTypes.includes(file.type);
      const hasValidExtension = validExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );
      
      if (hasValidType || hasValidExtension) {
        setSelectedFile(file);
        setTranscriptionResult('');
      } else {
        toast({
          title: "Formato não suportado",
          description: "Formatos suportados: MP3, M4A, WAV, OPUS, OGG, FLAC, AAC, WebM, MP4, 3GP, AMR",
          variant: "destructive"
        });
      }
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setTranscriptionResult('');
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setTranscriptionResult('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const transcribeFile = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setProgress(0);
    
    // Simular progresso (substituir pela chamada real da API)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      // Chamada real para o backend
      const response = await ApiService.transcribeFile({
        file: selectedFile,
        model,
        action,
        target_language: action === 'translate_language' ? targetLanguage : undefined,
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Exibir resultado real
      setTranscriptionResult(response.text);
      
      toast({
        title: "Transcrição concluída!",
        description: "O áudio foi processado com sucesso.",
      });
      
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Transcription error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro na transcrição",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Upload & Transcrição</h2>
        <p className="text-muted-foreground">
          Envie um arquivo de áudio para transcrever ou traduzir
        </p>
      </div>

      {/* Upload Area */}
      <Card className="p-8">
        <div
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <FileAudio className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="ml-4"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-lg font-medium mb-2">
                  Arraste um arquivo aqui ou clique para selecionar
                </p>
                <p className="text-sm text-muted-foreground">
                  Suporte para MP3, M4A, WAV, OPUS, OGG, FLAC, AAC, WebM, MP4, 3GP, AMR (max. 100MB)
                </p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()}>
                Selecionar Arquivo
              </Button>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".mp3,.m4a,.wav,.opus,.ogg,.flac,.aac,.webm,.mp4,.3gp,.amr,audio/*"
            className="hidden"
          />
        </div>

        {/* Progress Bar */}
        {isLoading && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processando áudio...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Transcribe Button */}
        {selectedFile && (
          <div className="mt-6 text-center">
            <Button
              onClick={transcribeFile}
              disabled={isLoading}
              size="lg"
              className="min-w-48"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                `Transcrever com ${model.toUpperCase()}`
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Results */}
      {transcriptionResult && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Resultado da Transcrição</h3>
          <Textarea
            value={transcriptionResult}
            onChange={(e) => setTranscriptionResult(e.target.value)}
            placeholder="O resultado da transcrição aparecerá aqui..."
            className="min-h-48 resize-y"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(transcriptionResult)}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Texto
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([transcriptionResult], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transcricao_${selectedFile?.name || 'audio'}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                toast({
                  title: "Download iniciado",
                  description: "O arquivo de texto foi baixado com sucesso.",
                });
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTranscriptionResult('');
                toast({
                  title: "Texto limpo",
                  description: "O resultado da transcrição foi limpo.",
                });
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Simulação da sumarização
                const summary = `Resumo: ${transcriptionResult.substring(0, 100)}...`;
                setTranscriptionResult(summary);
                toast({
                  title: "Texto sumarizado",
                  description: "O texto foi sumarizado com sucesso.",
                });
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Sumarizar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default UploadTranscription;