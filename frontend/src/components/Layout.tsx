import { Link, useLocation } from 'react-router-dom';
import { ModelSelector } from './ModelSelector';
import { ActionSelector } from './ActionSelector';
import { ThemeToggle } from './ThemeToggle';
import { ApiStatus } from './ApiStatus';
import { HistorySidebar } from './HistorySidebar';
import { ModelManagerDialog } from './ModelManagerDialog';
import { useDesktopSetup } from '@/hooks/useDesktopSetup';
import { Button } from './ui/button';
import { Download, Mic, Upload } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { isDesktop, openManager } = useDesktopSetup();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md shrink-0 z-50">
        <div className="px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Mic className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">VerbalAIze</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <ModelSelector />
            <ActionSelector />
            <div className="w-px h-4 bg-border mx-1" />
            {isDesktop && (
              <Button
                variant="ghost"
                size="sm"
                onClick={openManager}
                className="h-7 gap-1.5 px-2 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Modelos
              </Button>
            )}
            <ApiStatus />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <HistorySidebar />

        {/* Right column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Navigation */}
          <nav className="border-b border-border/60 bg-background/60 backdrop-blur-sm shrink-0">
            <div className="px-6 flex gap-0">
              <NavLink to="/" active={location.pathname === '/'}>
                <Upload className="w-3.5 h-3.5" />
                Upload
              </NavLink>
              <NavLink to="/realtime" active={location.pathname === '/realtime'}>
                <Mic className="w-3.5 h-3.5" />
                Tempo Real
              </NavLink>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-10">
              {children}
            </div>
          </main>
        </div>
      </div>

      <ModelManagerDialog />
    </div>
  );
};

const NavLink = ({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) => (
  <Link
    to={to}
    className={`
      flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors
      ${active
        ? 'border-primary text-foreground'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      }
    `}
  >
    {children}
  </Link>
);
