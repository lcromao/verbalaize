import { useEffect, useRef, useState } from 'react';
import { useTranscriptionStore } from '@/hooks/useTranscriptionStore';
import { useHistoryStore } from '@/hooks/useHistoryStore';
import { FfmpegInstallAlert } from '@/components/FfmpegInstallAlert';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Upload, FileAudio, X, Loader2, Copy, Download, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ApiService } from '@/services/api';
import { isFfmpegMissingError } from '@/lib/transcriptionErrors';
import { getStageLabel } from '@/lib/transcriptionProgress';

const UploadTranscription = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [displayProgress, setDisplayProgress] = useState<number>(0);
  const [stageLabel, setStageLabel] = useState<string>('');
  const [transcriptionResult, setTranscriptionResult] = useState('');
  const [ffmpegNotice, setFfmpegNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { model, action, targetLanguage } = useTranscriptionStore();
  const { entries, selectedId, addEntry, selectEntry } = useHistoryStore();

  // Load selected history entry or reset on new session
  useEffect(() => {
    if (!selectedId) {
      setSelectedFile(null);
      setTranscriptionResult('');
      setFfmpegNotice(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const entry = entries.find((e) => e.id === selectedId && e.type === 'upload');
    if (entry) {
      setTranscriptionResult(entry.text);
    }
  }, [selectedId]);

  const validTypes = [
    'audio/mpeg', 'audio/mp3',
    'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/mp4a',
    'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/opus', 'audio/ogg', 'audio/x-opus',
    'audio/webm',
    'audio/flac', 'audio/x-flac',
    'audio/aac', 'audio/x-aac',
    'audio/3gpp', 'audio/3gpp2',
    'audio/amr', 'audio/x-amr',
    'video/mp4',
    'application/octet-stream',
  ];

  const validExtensions = [
    '.mp3', '.m4a', '.wav', '.opus', '.ogg', '.flac',
    '.aac', '.webm', '.mp4', '.3gp', '.amr',
  ];

  const handleFileSelect = (file: File) => {
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (hasValidType || hasValidExtension) {
      setSelectedFile(file);
      setTranscriptionResult('');
    } else {
      toast({
        title: 'Formato não suportado',
        description: 'Use MP3, M4A, WAV, OPUS, OGG, FLAC, AAC, WebM, MP4, 3GP ou AMR.',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeFile = () => {
    setSelectedFile(null);
    setTranscriptionResult('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const transcribeFile = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setProgress(0);

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
      const response = await ApiService.transcribeFile({
        file: selectedFile,
        model,
        action,
        target_language: action === 'translate_language' ? targetLanguage : undefined,
      });

      clearInterval(progressInterval);
      setProgress(100);
      setTranscriptionResult(response.text);

      const title = selectedFile.name || response.text.slice(0, 50);
      addEntry({
        title,
        text: response.text,
        type: 'upload',
        model,
        action,
        fileName: selectedFile.name,
      });

      toast({
        title: 'Transcrição concluída',
        description: 'O áudio foi processado com sucesso.',
      });
    } catch (error) {
      clearInterval(progressInterval);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro na transcrição',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
      setStageLabel('');
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(transcriptionResult);
    toast({ title: 'Copiado para a área de transferência' });
  };

  const downloadText = () => {
    const blob = new Blob([transcriptionResult], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcricao_${selectedFile?.name || 'audio'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Download iniciado' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Upload & Transcrição</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Envie um arquivo de áudio para transcrever ou traduzir
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer
          ${isDragging
            ? 'border-primary bg-primary/5'
            : selectedFile
            ? 'border-border bg-card'
            : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
      >
        {selectedFile ? (
          <div className="flex items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileAudio className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => { e.stopPropagation(); removeFile(); }}
              className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Arraste um arquivo ou{' '}
                <span className="text-primary underline-offset-2 hover:underline">clique para selecionar</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                MP3, M4A, WAV, OPUS, OGG, FLAC, AAC, WebM, MP4 — até 100 MB
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleInputChange}
          accept=".mp3,.m4a,.wav,.opus,.ogg,.flac,.aac,.webm,.mp4,.3gp,.amr,audio/*"
          className="hidden"
        />
      </div>

      {/* Progress */}
      {isLoading && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Processando áudio...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      )}

      {/* Transcribe Button */}
      {selectedFile && (
        <Button
          onClick={transcribeFile}
          disabled={isLoading}
          className="w-full"
          size="lg"
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
      )}

      {/* Results */}
      {transcriptionResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Resultado</h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={copyText} className="h-7 px-2 text-xs gap-1.5">
                <Copy className="w-3 h-3" />
                Copiar
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadText} className="h-7 px-2 text-xs gap-1.5">
                <Download className="w-3 h-3" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTranscriptionResult('')}
                className="h-7 px-2 text-xs gap-1.5 text-muted-foreground"
              >
                <Trash2 className="w-3 h-3" />
                Limpar
              </Button>
            </div>
          </div>
          <Textarea
            value={transcriptionResult}
            onChange={e => setTranscriptionResult(e.target.value)}
            className="min-h-52 resize-y text-sm leading-relaxed bg-card"
          />
        </div>
      )}
    </div>
  );
};

export default UploadTranscription;
