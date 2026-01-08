import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Server,
  FileCode,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useDashboardStats } from '@/hooks/use-panels';

interface NavItem {
  icon: React.ElementType;
  label: string;
  route: string;
  badgeKey?: 'panels' | 'templates';
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', route: '/' },
  { icon: Server, label: 'Panels', route: '/panels', badgeKey: 'panels' },
  { icon: FileCode, label: 'Templates', route: '/templates', badgeKey: 'templates' },
  { icon: SettingsIcon, label: 'Settings', route: '/settings' },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const { data: stats } = useDashboardStats();

  const getBadgeValue = (key: 'panels' | 'templates' | undefined): number | undefined => {
    if (!key || !stats) return undefined;
    if (key === 'panels') return stats.total_panels;
    if (key === 'templates') return stats.total_templates;
    return undefined;
  };

  const isActive = (route: string) => {
    if (route === '/') return location.pathname === '/';
    return location.pathname.startsWith(route);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-16 h-[calc(100vh-64px)] bg-sidebar border-r border-sidebar-border flex flex-col z-40"
    >
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.route);
          const badge = getBadgeValue(item.badgeKey);

          return (
            <Link
              key={item.route}
              to={item.route}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              {active && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                  initial={false}
                  transition={{ duration: 0.2 }}
                />
              )}
              <Icon className={cn("w-5 h-5 flex-shrink-0", active && "text-primary")} />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {!collapsed && badge !== undefined && badge > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="ml-auto"
                  >
                    <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-sidebar-accent">
                      {badge}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
