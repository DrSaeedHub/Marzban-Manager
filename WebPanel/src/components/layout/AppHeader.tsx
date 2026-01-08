import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Sun, Moon, User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogoutConfirmModal } from '@/components/modals/LogoutConfirmModal';
import { useSettings } from '@/hooks/use-settings';

export function AppHeader() {
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { theme, setTheme, resolvedTheme } = useSettings();
  
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Dashboard', path: '/' }];
    
    let currentPath = '';
    for (const path of paths) {
      currentPath += `/${path}`;
      if (path === 'panels') {
        breadcrumbs.push({ label: 'Panels', path: '/panels' });
      } else if (path === 'templates') {
        breadcrumbs.push({ label: 'Templates', path: '/templates' });
      } else if (path === 'settings') {
        breadcrumbs.push({ label: 'Settings', path: '/settings' });
      } else if (path.startsWith('panel-')) {
        breadcrumbs.push({ label: 'Panel Details', path: currentPath });
      } else if (path === 'nodes') {
        breadcrumbs.push({ label: 'Nodes', path: currentPath });
      } else if (path === 'config') {
        breadcrumbs.push({ label: 'Config', path: currentPath });
      }
    }
    
    return breadcrumbs;
  };

  const handleThemeToggle = () => {
    // Cycle through: light -> dark -> system -> light
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-background border-b border-border z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="font-heading font-semibold text-lg text-foreground hidden sm:block">
            Marzban Manager
          </span>
        </Link>
        
        {/* Breadcrumbs */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <Link
                to={crumb.path}
                className={index === breadcrumbs.length - 1 
                  ? "text-foreground font-medium" 
                  : "text-muted-foreground hover:text-foreground transition-colors"
                }
              >
                {crumb.label}
              </Link>
            </div>
          ))}
        </nav>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleThemeToggle}
          className="text-muted-foreground hover:text-foreground"
          title={`Current: ${theme} (click to change)`}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  AD
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem disabled className="text-muted-foreground">
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center">
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowLogoutModal(true)} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <LogoutConfirmModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
      />
    </header>
  );
}
