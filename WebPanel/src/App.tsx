import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SettingsProvider } from "@/hooks/use-settings";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import PanelsPage from "./pages/PanelsPage";
import PanelDetailPage from "./pages/PanelDetailPage";
import PanelNodesTab from "./pages/PanelNodesTab";
import PanelConfigTab from "./pages/PanelConfigTab";
import PanelSettingsTab from "./pages/PanelSettingsTab";
import TemplatesPage from "./pages/TemplatesPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
      <TooltipProvider>
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
);

export default App;
