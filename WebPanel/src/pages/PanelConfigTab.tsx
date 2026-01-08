import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Maximize2, RotateCcw, Save, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JsonEditor } from '@/components/common/JsonEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { useXrayConfig, useUpdateXrayConfig, useRestartXrayCore } from '@/hooks/use-xray-config';
import { toast } from 'sonner';

export default function PanelConfigTab() {
  const { panelId } = useParams<{ panelId: string }>();

  const { data: configData, isLoading, error } = useXrayConfig(panelId);
  const updateMutation = useUpdateXrayConfig(panelId!);
  const restartMutation = useRestartXrayCore(panelId!);

  const [configJson, setConfigJson] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalJson, setOriginalJson] = useState('');

  // Update local state when config is loaded
  useEffect(() => {
    if (configData?.config) {
      const json = JSON.stringify(configData.config, null, 2);
      setConfigJson(json);
      setOriginalJson(json);
      setHasChanges(false);
    }
  }, [configData]);

  const handleConfigChange = (value: string) => {
    setConfigJson(value);
    setHasChanges(value !== originalJson);
  };

  const handleSave = () => {
    try {
      const parsedConfig = JSON.parse(configJson);
      updateMutation.mutate({ config: parsedConfig }, {
        onSuccess: () => {
          setOriginalJson(configJson);
          setHasChanges(false);
        },
      });
    } catch (e) {
      toast.error('Invalid JSON format');
    }
  };

  const handleReset = () => {
    setConfigJson(originalJson);
    setHasChanges(false);
    toast.info('Configuration reset to last saved state');
  };

  const handleRestartCore = () => {
    restartMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-destructive">Failed to load configuration</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

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
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          className="gap-2"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={!hasChanges} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
        <Button
          variant="outline"
          onClick={handleRestartCore}
          disabled={restartMutation.isPending}
          className="gap-2"
        >
          {restartMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Restart Core
        </Button>
      </div>
    </div>
  );
}
