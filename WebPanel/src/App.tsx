import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SettingsProvider } from "@/hooks/use-settings";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { OfflineIndicator } from "@/components/common/OfflineIndicator";
import { ApiClientError } from "@/api/client";
import { toast } from "sonner";
import Dashboard from "./pages/Dashboard";
import PanelsPage from "./pages/PanelsPage";
import PanelDetailPage from "./pages/PanelDetailPage";
import PanelNodesTab from "./pages/PanelNodesTab";
import PanelConfigTab from "./pages/PanelConfigTab";
import PanelSettingsTab from "./pages/PanelSettingsTab";
import TemplatesPage from "./pages/TemplatesPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

// Configure QueryClient with caching and error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30 seconds
      gcTime: 5 * 60 * 1000,     // 5 minutes
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
      onError: (error) => {
        if (error instanceof ApiClientError) {
          toast.error(error.detail);
        } else {
          toast.error('An unexpected error occurred');
        }
      },
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <TooltipProvider>
          <OfflineIndicator />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/panels" element={<PanelsPage />} />
                <Route path="/panels/:panelId" element={<PanelDetailPage />}>
                  <Route path="nodes" element={<PanelNodesTab />} />
                  <Route path="config" element={<PanelConfigTab />} />
                  <Route path="settings" element={<PanelSettingsTab />} />
                </Route>
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SettingsProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
