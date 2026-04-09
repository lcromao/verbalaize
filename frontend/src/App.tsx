import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DesktopSetupProvider } from "./hooks/useDesktopSetup";
import { DesktopSetupGate } from "./components/DesktopSetupGate";
import { ThemeProviderWrapper } from "./components/ThemeProviderWrapper";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import RealTimeTranscription from "./pages/RealTimeTranscription";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProviderWrapper>
      <TooltipProvider>
        <DesktopSetupProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DesktopSetupGate>
              <Layout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/realtime" element={<RealTimeTranscription />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </DesktopSetupGate>
          </BrowserRouter>
        </DesktopSetupProvider>
      </TooltipProvider>
    </ThemeProviderWrapper>
  </QueryClientProvider>
);

export default App;
