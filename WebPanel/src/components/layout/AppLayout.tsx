import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { useSettings } from '@/hooks/use-settings';

export function AppLayout() {
  const { sidebarCollapsedByDefault } = useSettings();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(sidebarCollapsedByDefault);

  useEffect(() => {
    setSidebarCollapsed(sidebarCollapsedByDefault);
  }, [sidebarCollapsedByDefault]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <AppSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="pt-16 min-h-screen"
      >
        <div className="p-6">
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
}
