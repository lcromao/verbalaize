import { Loader2 } from 'lucide-react';

interface ProcessingStatusProps {
  title: string;
  progress?: number;
  stageLabel?: string;
}

export const ProcessingStatus = ({
  title,
  progress,
  stageLabel,
}: ProcessingStatusProps) => {
  return (
    <div className="mt-6 rounded-lg border bg-muted/40 px-4 py-3">
      <div className="flex items-start gap-3">
        <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary" />
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{title}</p>
            {typeof progress === 'number' && (
              <span className="text-sm font-semibold text-primary">
                {progress}%
              </span>
            )}
          </div>
          {stageLabel && (
            <p className="text-sm text-muted-foreground">{stageLabel}</p>
          )}
        </div>
      </div>
    </div>
  );
};
