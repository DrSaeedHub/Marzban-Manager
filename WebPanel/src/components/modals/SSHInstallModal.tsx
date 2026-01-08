import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Check, X, Loader2, Eye, EyeOff, AlertCircle, RefreshCw } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useSSHInstall } from '@/hooks/use-ssh-install';
import { cn } from '@/lib/utils';

// Helper to detect port conflict errors
function isPortConflictError(error: string | undefined): boolean {
  if (!error) return false;
  const lowered = error.toLowerCase();
  return lowered.includes('port') && (
    lowered.includes('already in use') ||
    lowered.includes('in use') ||
    lowered.includes('occupied') ||
    lowered.includes('conflict')
  );
}

interface SSHInstallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelId: string;
}

type Step = 'credentials' | 'options' | 'installing' | 'complete' | 'failed';

export function SSHInstallModal({ open, onOpenChange, panelId }: SSHInstallModalProps) {
  const [step, setStep] = useState<Step>('credentials');
  
  // SSH Credentials
  const [sshHost, setSshHost] = useState('');
  const [sshPort, setSshPort] = useState('22');
  const [sshUsername, setSshUsername] = useState('root');
  const [sshPassword, setSshPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Node Options
  const [nodeName, setNodeName] = useState('');
  const [servicePort, setServicePort] = useState('62050');
  const [apiPort, setApiPort] = useState('62051');
  const [installDocker, setInstallDocker] = useState(true);
  const [startNode, setStartNode] = useState(true);
  const [autoPorts, setAutoPorts] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRetrying, setIsRetrying] = useState(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  const sshInstall = useSSHInstall({
    panelId,
    onComplete: () => setStep('complete'),
    onError: () => setStep('failed'),
  });

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current && sshInstall.logs.length > 0) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sshInstall.logs]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setStep('credentials');
      setSshHost('');
      setSshPort('22');
      setSshUsername('root');
      setSshPassword('');
      setNodeName('');
      setServicePort('62050');
      setApiPort('62051');
      setInstallDocker(true);
      setStartNode(true);
      setAutoPorts(false);
      setErrors({});
      setIsRetrying(false);
      sshInstall.reset();
    }
  }, [open]);
  
  // Check if current error is a port conflict
  const hasPortConflict = useMemo(
    () => isPortConflictError(sshInstall.error),
    [sshInstall.error]
  );

  // Update step based on install status
  useEffect(() => {
    if (sshInstall.isRunning && step !== 'installing') {
      setStep('installing');
    }
  }, [sshInstall.isRunning, step]);

  const validateCredentials = () => {
    const newErrors: Record<string, string> = {};
    
    if (!sshHost) {
      newErrors.sshHost = 'Host is required';
    }
    
    const port = parseInt(sshPort);
    if (isNaN(port) || port < 1 || port > 65535) {
      newErrors.sshPort = 'Port must be 1-65535';
    }
    
    if (!sshUsername) {
      newErrors.sshUsername = 'Username is required';
    }
    
    if (!sshPassword) {
      newErrors.sshPassword = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOptions = () => {
    const newErrors: Record<string, string> = {};
    
    if (!nodeName || nodeName.length < 2) {
      newErrors.nodeName = 'Node name is required (min 2 chars)';
    }
    
    const sPort = parseInt(servicePort);
    if (isNaN(sPort) || sPort < 1 || sPort > 65535) {
      newErrors.servicePort = 'Port must be 1-65535';
    }
    
    const aPort = parseInt(apiPort);
    if (isNaN(aPort) || aPort < 1 || aPort > 65535) {
      newErrors.apiPort = 'Port must be 1-65535';
    }
    
    if (servicePort === apiPort) {
      newErrors.apiPort = 'Must be different from service port';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const startInstallation = (useAutoPorts: boolean = false) => {
    sshInstall.start({
      ssh_host: sshHost,
      ssh_port: parseInt(sshPort),
      ssh_username: sshUsername,
      ssh_password: sshPassword,
      node_name: nodeName,
      service_port: parseInt(servicePort),
      api_port: parseInt(apiPort),
      install_docker: installDocker,
      start_node: startNode,
      auto_ports: useAutoPorts,
    });
    setStep('installing');
  };

  const handleNext = () => {
    if (step === 'credentials') {
      if (validateCredentials()) {
        setStep('options');
      }
    } else if (step === 'options') {
      if (validateOptions()) {
        startInstallation(autoPorts);
      }
    }
  };
  
  const handleRetryWithAutoPorts = () => {
    setIsRetrying(true);
    setAutoPorts(true);
    sshInstall.reset();
    // Small delay to ensure reset is complete
    setTimeout(() => {
      startInstallation(true);
      setIsRetrying(false);
    }, 100);
  };

  const handleBack = () => {
    if (step === 'options') {
      setStep('credentials');
    }
  };

  const handleClose = () => {
    // Don't allow closing during installation
    if (step !== 'installing') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            SSH Node Installation
          </DialogTitle>
          <DialogDescription>
            {step === 'credentials' && 'Enter SSH credentials for the remote server'}
            {step === 'options' && 'Configure node options'}
            {step === 'installing' && 'Installing Marzban node...'}
            {step === 'complete' && 'Installation completed successfully!'}
            {step === 'failed' && 'Installation failed'}
          </DialogDescription>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
          {/* Step 1: Credentials */}
          {step === 'credentials' && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SSH Host *</Label>
                  <Input
                    placeholder="192.168.1.100"
                    value={sshHost}
                    onChange={(e) => setSshHost(e.target.value)}
                    className={cn(errors.sshHost && 'border-destructive')}
                  />
                  {errors.sshHost && (
                    <p className="text-xs text-destructive">{errors.sshHost}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>SSH Port *</Label>
                  <Input
                    type="number"
                    placeholder="22"
                    value={sshPort}
                    onChange={(e) => setSshPort(e.target.value)}
                    className={cn(errors.sshPort && 'border-destructive')}
                  />
                  {errors.sshPort && (
                    <p className="text-xs text-destructive">{errors.sshPort}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  placeholder="root"
                  value={sshUsername}
                  onChange={(e) => setSshUsername(e.target.value)}
                  className={cn(errors.sshUsername && 'border-destructive')}
                />
                {errors.sshUsername && (
                  <p className="text-xs text-destructive">{errors.sshUsername}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={sshPassword}
                    onChange={(e) => setSshPassword(e.target.value)}
                    className={cn('pr-10', errors.sshPassword && 'border-destructive')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.sshPassword && (
                  <p className="text-xs text-destructive">{errors.sshPassword}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2: Options */}
          {step === 'options' && (
            <motion.div
              key="options"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label>Node Name *</Label>
                <Input
                  placeholder="DE-Node-1"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className={cn(errors.nodeName && 'border-destructive')}
                />
                {errors.nodeName && (
                  <p className="text-xs text-destructive">{errors.nodeName}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Port *</Label>
                  <Input
                    type="number"
                    placeholder="62050"
                    value={servicePort}
                    onChange={(e) => setServicePort(e.target.value)}
                    className={cn(errors.servicePort && 'border-destructive')}
                  />
                  {errors.servicePort && (
                    <p className="text-xs text-destructive">{errors.servicePort}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>API Port *</Label>
                  <Input
                    type="number"
                    placeholder="62051"
                    value={apiPort}
                    onChange={(e) => setApiPort(e.target.value)}
                    className={cn(errors.apiPort && 'border-destructive')}
                  />
                  {errors.apiPort && (
                    <p className="text-xs text-destructive">{errors.apiPort}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoPorts"
                    checked={autoPorts}
                    onCheckedChange={(checked) => setAutoPorts(checked as boolean)}
                  />
                  <Label htmlFor="autoPorts" className="text-sm">
                    Auto-assign available ports (if default ports are in use)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="installDocker"
                    checked={installDocker}
                    onCheckedChange={(checked) => setInstallDocker(checked as boolean)}
                  />
                  <Label htmlFor="installDocker" className="text-sm">
                    Install Docker if not present
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="startNode"
                    checked={startNode}
                    onCheckedChange={(checked) => setStartNode(checked as boolean)}
                  />
                  <Label htmlFor="startNode" className="text-sm">
                    Start node after installation
                  </Label>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Installing */}
          {step === 'installing' && (
            <motion.div
              key="installing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-foreground font-medium">{sshInstall.progress}%</span>
                </div>
                <Progress value={sshInstall.progress} />
              </div>
              
              <div className="bg-muted rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs">
                {sshInstall.logs.map((log, index) => (
                  <div key={index} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </motion.div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground">
                Installation Complete!
              </h3>
              {sshInstall.result && (
                <div className="mt-4 text-sm text-muted-foreground space-y-1">
                  <p><strong>Node:</strong> {sshInstall.result.node_name}</p>
                  <p><strong>Address:</strong> {sshInstall.result.address}</p>
                  <p><strong>Service Port:</strong> {sshInstall.result.service_port}</p>
                  <p><strong>API Port:</strong> {sshInstall.result.api_port}</p>
                  {sshInstall.result.auto_ports_used && (
                    <p className="text-accent text-xs mt-2">
                      (Ports were auto-assigned due to conflicts)
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 5: Failed */}
          {step === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground">
                Installation Failed
              </h3>
              {sshInstall.error && (
                <div className="mt-3 px-4 py-2 bg-destructive/10 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-destructive justify-center">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-left break-words">{sshInstall.error.replace(/\x1B\[[0-9;]*m/g, '')}</span>
                  </div>
                </div>
              )}
              
              {/* Port conflict - offer retry with auto ports */}
              {hasPortConflict && (
                <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-sm text-muted-foreground mb-3">
                    The specified port is already in use. Would you like to retry and let the system automatically assign available ports?
                  </p>
                  <Button
                    onClick={handleRetryWithAutoPorts}
                    disabled={isRetrying}
                    className="gap-2"
                  >
                    {isRetrying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Retry with Auto-Assigned Ports
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        <DialogFooter>
          {step === 'credentials' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleNext}>
                Next
              </Button>
            </>
          )}
          
          {step === 'options' && (
            <>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleNext} disabled={sshInstall.isStarting}>
                {sshInstall.isStarting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Start Installation
              </Button>
            </>
          )}
          
          {step === 'installing' && (
            <Button variant="outline" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Installing...
            </Button>
          )}
          
          {(step === 'complete' || step === 'failed') && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
