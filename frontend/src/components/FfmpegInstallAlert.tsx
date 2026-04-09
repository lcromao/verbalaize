import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface FfmpegInstallAlertProps {
  detail: string;
  modeLabel: string;
}

export const FfmpegInstallAlert = ({
  detail,
  modeLabel,
}: FfmpegInstallAlertProps) => {
  return (
    <Alert variant="destructive" className="mt-6 p-5 text-left [&>svg~*]:pl-9">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-base font-semibold">
        FFmpeg não encontrado no sistema
      </AlertTitle>
      <AlertDescription className="mt-3 space-y-4 text-sm">
        <p>
          O backend não conseguiu processar o áudio em {modeLabel} porque o FFmpeg não
          está instalado ou não está disponível no `PATH` do sistema.
        </p>
        <p>
          Instale o FFmpeg no seu computador e tente novamente. Download oficial:
        </p>
        <a
          href="https://ffmpeg.org"
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-current px-4 py-3 font-medium underline-offset-4 transition-colors hover:bg-destructive/10 hover:underline"
        >
          Abrir https://ffmpeg.org
          <ExternalLink className="h-4 w-4" />
        </a>
        <p className="text-xs opacity-90">
          Detalhe retornado pelo backend: {detail}
        </p>
      </AlertDescription>
    </Alert>
  );
};
