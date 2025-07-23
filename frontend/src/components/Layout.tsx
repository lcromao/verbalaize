import { Link, useLocation } from 'react-router-dom';
import { ModelSelector } from './ModelSelector';
import { ActionSelector } from './ActionSelector';
import { ThemeToggle } from './ThemeToggle';
import { ApiStatus } from './ApiStatus';
import { Button } from './ui/button';
import { Mic, Upload } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">
              VerbalAIze
            </h1>
            
            {/* Global Controls */}
            <div className="flex items-center gap-4">
              <ApiStatus />
              <ModelSelector />
              <ActionSelector />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex justify-center gap-1">
            <Link to="/">
              <Button 
                variant={location.pathname === '/' ? 'default' : 'ghost'}
                className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
                data-active={location.pathname === '/'}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload & Transcrever
              </Button>
            </Link>
            <Link to="/realtime">
              <Button 
                variant={location.pathname === '/realtime' ? 'default' : 'ghost'}
                className="rounded-none border-b-2 border-transparent data-[active=true]:border-primary"
                data-active={location.pathname === '/realtime'}
              >
                <Mic className="w-4 h-4 mr-2" />
                Tempo Real
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};