import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Loader2, X, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePanel, useUpdatePanel, useTestPanelConnection } from '@/hooks/use-panels';
import type { Panel } from '@/types';
import { cn } from '@/lib/utils';

interface AddPanelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPanel?: Panel | null;
}

type ConnectionStatus = 'not_tested' | 'testing' | 'connected' | 'failed';

export function AddPanelModal({ open, onOpenChange, editPanel }: AddPanelModalProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('not_tested');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreatePanel();
  const updateMutation = useUpdatePanel();
  const testMutation = useTestPanelConnection();

  const isEditing = !!editPanel;

  // Reset form when modal opens/closes or editPanel changes
  useEffect(() => {
    if (open) {
      setUrl(editPanel?.url || '');
      setName(editPanel?.name || '');
      setUsername(editPanel?.username || '');
      setPassword(editPanel?.password || '');
      setConnectionStatus('not_tested');
      setErrors({});
    }
  }, [open, editPanel]);

  const handleTestConnection = async () => {
    setConnectionStatus('testing');

    testMutation.mutate(
      { url, username, password },
      {
        onSuccess: (data) => {
          if (data.connected) {
            setConnectionStatus('connected');
          } else {
            setConnectionStatus('failed');
          }
        },
        onError: () => {
          setConnectionStatus('failed');
        },
      }
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!url) {
      newErrors.url = 'Panel URL is required';
    } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
      newErrors.url = 'URL must start with http:// or https://';
    }

    if (!name) {
      newErrors.name = 'Panel name is required';
    } else if (name.length < 2 || name.length > 50) {
      newErrors.name = 'Name must be 2-50 characters';
    }

    if (!username) {
      newErrors.username = 'Username is required';
    }

    if (!password && !isEditing) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (isEditing && editPanel) {
      updateMutation.mutate(
        {
          id: editPanel.id,
          data: { name, url, username, ...(password ? { password } : {}) }
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      createMutation.mutate(
        { name, url, username, password },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEditing ? 'Edit Marzban Panel' : 'Add Marzban Panel'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update your panel connection details' : 'Connect to a new Marzban panel'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Panel URL */}
          <div className="space-y-2">
            <Label htmlFor="url">Panel URL *</Label>
            <Input
              id="url"
              placeholder="https://panel.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={cn(errors.url && 'border-destructive')}
            />
            {errors.url ? (
              <p className="text-xs text-destructive">{errors.url}</p>
            ) : (
              <p className="text-xs text-muted-foreground">The base URL of your Marzban panel</p>
            )}
          </div>

          {/* Panel Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Panel Name *</Label>
            <Input
              id="name"
              placeholder="Germany Panel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name}</p>
            ) : (
              <p className="text-xs text-muted-foreground">A friendly name for this panel</p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={cn(errors.username && 'border-destructive')}
            />
            {errors.username && (
              <p className="text-xs text-destructive">{errors.username}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password {!isEditing && '*'}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn('pr-10', errors.password && 'border-destructive')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Connection Status */}
          <div className={cn(
            "p-4 rounded-lg border",
            connectionStatus === 'not_tested' && "bg-muted/50 border-border",
            connectionStatus === 'testing' && "bg-primary/10 border-primary/20",
            connectionStatus === 'connected' && "bg-accent/10 border-accent/20",
            connectionStatus === 'failed' && "bg-destructive/10 border-destructive/20",
          )}>
            <div className="flex items-center gap-3">
              {connectionStatus === 'not_tested' && (
                <>
                  <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Connection not tested</span>
                </>
              )}
              {connectionStatus === 'testing' && (
                <>
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm text-primary">Testing connection...</span>
                </>
              )}
              {connectionStatus === 'connected' && (
                <>
                  <Check className="w-5 h-5 text-accent" />
                  <span className="text-sm text-accent">Connected successfully</span>
                </>
              )}
              {connectionStatus === 'failed' && (
                <>
                  <X className="w-5 h-5 text-destructive" />
                  <span className="text-sm text-destructive">Connection failed</span>
                </>
              )}

              {(connectionStatus === 'not_tested' || connectionStatus === 'failed') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testMutation.isPending}
                  className="ml-auto"
                >
                  {connectionStatus === 'failed' ? 'Retry' : 'Test Connection'}
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Save Panel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
