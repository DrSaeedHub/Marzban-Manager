import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface Settings {
  theme: Theme;
  sidebarCollapsedByDefault: boolean;
  defaultServicePort: string;
  defaultApiPort: string;
  defaultCoefficient: string;
}

interface SettingsContextType extends Settings {
  setTheme: (theme: Theme) => void;
  setSidebarCollapsedByDefault: (collapsed: boolean) => void;
  setDefaultServicePort: (port: string) => void;
  setDefaultApiPort: (port: string) => void;
  setDefaultCoefficient: (coefficient: string) => void;
  resetSettings: () => void;
  exportSettings: () => void;
  importSettings: (data: Partial<Settings>) => void;
  resolvedTheme: 'light' | 'dark';
}

const defaultSettings: Settings = {
  theme: 'dark',
  sidebarCollapsedByDefault: false,
  defaultServicePort: '62050',
  defaultApiPort: '62051',
  defaultCoefficient: '1.0',
};

const STORAGE_KEY = 'marzban-manager-settings';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === 'undefined') return defaultSettings;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...defaultSettings, ...JSON.parse(stored) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Handle theme application
  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (theme: 'light' | 'dark') => {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      setResolvedTheme(theme);
    };

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      applyTheme(systemTheme);

      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(settings.theme);
    }
  }, [settings.theme]);

  const setTheme = (theme: Theme) => {
    setSettings(prev => ({ ...prev, theme }));
  };

  const setSidebarCollapsedByDefault = (sidebarCollapsedByDefault: boolean) => {
    setSettings(prev => ({ ...prev, sidebarCollapsedByDefault }));
  };

  const setDefaultServicePort = (defaultServicePort: string) => {
    setSettings(prev => ({ ...prev, defaultServicePort }));
  };

  const setDefaultApiPort = (defaultApiPort: string) => {
    setSettings(prev => ({ ...prev, defaultApiPort }));
  };

  const setDefaultCoefficient = (defaultCoefficient: string) => {
    setSettings(prev => ({ ...prev, defaultCoefficient }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
  };

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marzban-manager-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (data: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...data }));
  };

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setTheme,
        setSidebarCollapsedByDefault,
        setDefaultServicePort,
        setDefaultApiPort,
        setDefaultCoefficient,
        resetSettings,
        exportSettings,
        importSettings,
        resolvedTheme,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
