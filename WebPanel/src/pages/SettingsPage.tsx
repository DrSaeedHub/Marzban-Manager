import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Download, Upload, Trash2, Github, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/use-settings';

export default function SettingsPage() {
  const {
    theme,
    sidebarCollapsedByDefault,
    defaultServicePort,
    defaultApiPort,
    defaultCoefficient,
    setTheme,
    setSidebarCollapsedByDefault,
    setDefaultServicePort,
    setDefaultApiPort,
    setDefaultCoefficient,
    resetSettings,
    exportSettings,
    importSettings,
  } = useSettings();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportSettings();
    toast.success('Settings exported successfully');
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          importSettings(data);
          toast.success('Settings imported successfully');
        } catch {
          toast.error('Invalid settings file');
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleReset = () => {
    toast.warning('This will reset all settings to defaults', {
      action: {
        label: 'Confirm Reset',
        onClick: () => {
          resetSettings();
          toast.success('All settings have been reset');
        }
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage application preferences and defaults
        </p>
      </div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border p-6 space-y-4"
      >
        <h2 className="text-lg font-heading font-semibold text-foreground">Appearance</h2>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Theme</Label>
            <RadioGroup 
              value={theme} 
              onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
                  <Sun className="w-4 h-4" />
                  Light
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
                  <Moon className="w-4 h-4" />
                  Dark
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
                  <Monitor className="w-4 h-4" />
                  System
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="collapsed"
              checked={sidebarCollapsedByDefault}
              onCheckedChange={(checked) => setSidebarCollapsedByDefault(checked as boolean)}
            />
            <Label htmlFor="collapsed" className="cursor-pointer">
              Sidebar collapsed by default
            </Label>
          </div>
        </div>
      </motion.div>

      {/* Defaults */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border p-6 space-y-4"
      >
        <h2 className="text-lg font-heading font-semibold text-foreground">Defaults</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="servicePort">Default Service Port</Label>
              <Input
                id="servicePort"
                type="number"
                value={defaultServicePort}
                onChange={(e) => setDefaultServicePort(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiPort">Default API Port</Label>
              <Input
                id="apiPort"
                type="number"
                value={defaultApiPort}
                onChange={(e) => setDefaultApiPort(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="coefficient">Default Usage Coefficient</Label>
            <Input
              id="coefficient"
              type="number"
              step="0.1"
              value={defaultCoefficient}
              onChange={(e) => setDefaultCoefficient(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      {/* Data Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl border border-border p-6 space-y-4"
      >
        <h2 className="text-lg font-heading font-semibold text-foreground">Data Management</h2>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export All Data
          </Button>
          <Button variant="outline" onClick={handleImport} className="gap-2">
            <Upload className="w-4 h-4" />
            Import Data
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
            Reset All
          </Button>
        </div>
      </motion.div>

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-xl border border-border p-6 space-y-4"
      >
        <h2 className="text-lg font-heading font-semibold text-foreground">About</h2>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="text-foreground font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">GitHub</span>
            <a 
              href="https://github.com/DrSaeedHub/Marzban-Manager" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Github className="w-4 h-4" />
              DrSaeedHub/Marzban-Manager
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
