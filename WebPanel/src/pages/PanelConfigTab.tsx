import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Maximize2, RotateCcw, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JsonEditor } from '@/components/common/JsonEditor';
import { mockPanelConfig } from '@/lib/mock-data';
import { toast } from 'sonner';

export default function PanelConfigTab() {
  const { panelId } = useParams<{ panelId: string }>();
  const config = mockPanelConfig[panelId as keyof typeof mockPanelConfig] || {};
  
  const [configJson, setConfigJson] = useState(JSON.stringify(config, null, 2));
  const [hasChanges, setHasChanges] = useState(false);

  const handleConfigChange = (value: string) => {
    setConfigJson(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    try {
      JSON.parse(configJson);
      toast.success('Configuration saved successfully');
      setHasChanges(false);
    } catch (e) {
      toast.error('Invalid JSON format');
    }
  };

  const handleReset = () => {
    setConfigJson(JSON.stringify(config, null, 2));
    setHasChanges(false);
    toast.info('Configuration reset to last saved state');
  };

  const handleRestartCore = () => {
    toast.info('Restarting Xray core...');
    setTimeout(() => {
      toast.success('Xray core restarted successfully');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-heading font-semibold text-foreground">Xray Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Current panel Xray core configuration
        </p>
      </div>

      {/* JSON Editor */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
          <span className="text-sm font-medium text-muted-foreground">config.json</span>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs bg-[hsl(var(--status-connecting))] text-background px-2 py-1 rounded-full">
                Unsaved changes
              </span>
            )}
            <Button variant="ghost" size="sm" className="gap-1">
              <Maximize2 className="w-4 h-4" />
              Full Screen
            </Button>
          </div>
        </div>
        <JsonEditor
          value={configJson}
          onChange={handleConfigChange}
          height="500px"
          showLineNumbers
        />
      </motion.div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={!hasChanges} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
        <Button variant="outline" onClick={handleRestartCore} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Restart Core
        </Button>
      </div>
    </div>
  );
}
