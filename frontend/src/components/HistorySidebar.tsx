import { useHistoryStore, HistoryEntry } from '@/hooks/useHistoryStore';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import {
  SquarePen,
  Mic,
  Upload,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function groupEntries(entries: HistoryEntry[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOf7Days = startOfToday - 6 * 86400000;

  const groups: { label: string; items: HistoryEntry[] }[] = [
    { label: 'Hoje', items: [] },
    { label: 'Ontem', items: [] },
    { label: 'Últimos 7 dias', items: [] },
    { label: 'Mais antigos', items: [] },
  ];

  for (const entry of entries) {
    if (entry.createdAt >= startOfToday) {
      groups[0].items.push(entry);
    } else if (entry.createdAt >= startOfYesterday) {
      groups[1].items.push(entry);
    } else if (entry.createdAt >= startOf7Days) {
      groups[2].items.push(entry);
    } else {
      groups[3].items.push(entry);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

export const HistorySidebar = () => {
  const { entries, selectedId, sidebarOpen, selectEntry, removeEntry, toggleSidebar } =
    useHistoryStore();
  const navigate = useNavigate();

  const handleNewSession = () => {
    selectEntry(null);
  };

  const handleSelect = (entry: HistoryEntry) => {
    selectEntry(entry.id);
    navigate(entry.type === 'realtime' ? '/realtime' : '/');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeEntry(id);
  };

  const groups = groupEntries(entries);

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          flex flex-col border-r border-border/60 bg-background shrink-0 transition-all duration-200
          ${sidebarOpen ? 'w-60' : 'w-0 overflow-hidden border-r-0'}
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-3 h-12 shrink-0 border-b border-border/40">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Histórico
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewSession}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Nova sessão"
          >
            <SquarePen className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* History List */}
        <ScrollArea className="flex-1">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
              <Clock className="w-6 h-6 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                Suas transcrições salvas aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="py-2">
              {groups.map((group) => (
                <div key={group.label} className="mb-1">
                  <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.items.map((entry) => (
                    <HistoryItem
                      key={entry.id}
                      entry={entry}
                      isActive={entry.id === selectedId}
                      onSelect={() => handleSelect(entry)}
                      onDelete={(e) => handleDelete(e, entry.id)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Toggle button - always visible */}
      <button
        onClick={toggleSidebar}
        className="absolute left-0 top-[calc(3.5rem+3rem)] z-10 flex items-center justify-center w-5 h-8 rounded-r-md bg-border/80 hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
        title={sidebarOpen ? 'Fechar painel' : 'Abrir painel'}
        style={{ left: sidebarOpen ? '15rem' : '0' }}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="w-3 h-3" />
        ) : (
          <PanelLeftOpen className="w-3 h-3" />
        )}
      </button>
    </>
  );
};

const HistoryItem = ({
  entry,
  isActive,
  onSelect,
  onDelete,
}: {
  entry: HistoryEntry;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) => (
  <button
    onClick={onSelect}
    className={`
      group relative w-full flex items-start gap-2 px-3 py-2 text-left transition-colors
      ${isActive
        ? 'bg-accent text-accent-foreground'
        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      }
    `}
  >
    <span className="mt-0.5 shrink-0 text-muted-foreground/60">
      {entry.type === 'realtime' ? (
        <Mic className="w-3.5 h-3.5" />
      ) : (
        <Upload className="w-3.5 h-3.5" />
      )}
    </span>

    <span className="flex-1 min-w-0 text-xs leading-snug line-clamp-2 pr-4">
      {entry.title}
    </span>

    <button
      onClick={onDelete}
      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
      title="Remover"
    >
      <Trash2 className="w-3 h-3" />
    </button>
  </button>
);
