import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Check, ChevronRight, Loader2, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SSHInstallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'credentials' | 'options' | 'installing' | 'complete';

export function SSHInstallModal({ open, onOpenChange }: SSHInstallModalProps) {
  const [step, setStep] = useState<Step>('credentials');
  const [showPassword, setShowPassword] = useState(false);
  const [progress, setProgress] = useState(0);
  const [installLog, setInstallLog] = useState<string[]>([]);
  
  // Form state
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [servicePort, setServicePort] = useState('62050');
  const [apiPort, setApiPort] = useState('62051');
  const [installDocker, setInstallDocker] = useState(true);
  const [startNode, setStartNode] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { id: 'credentials', label: 'SSH Credentials' },
    { id: 'options', label: 'Node Options' },
    { id: 'installing', label: 'Installing' },
    { id: 'complete', label: 'Complete' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  const validateCredentials = () => {
    const newErrors: Record<string, string> = {};
    if (!host) newErrors.host = 'Host is required';
    if (!port || parseInt(port) < 1 || parseInt(port) > 65535) {
      newErrors.port = 'Valid port required (1-65535)';
    }
    if (!username) newErrors.username = 'Username is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOptions = () => {
    const newErrors: Record<string, string> = {};
    if (!nodeName || nodeName.length < 2) {
      newErrors.nodeName = 'Node name must be at least 2 characters';
    }
    if (!servicePort || parseInt(servicePort) < 1 || parseInt(servicePort) > 65535) {
      newErrors.servicePort = 'Valid port required';
    }
    if (!apiPort || parseInt(apiPort) < 1 || parseInt(apiPort) > 65535) {
      newErrors.apiPort = 'Valid port required';
    }
    if (servicePort === apiPort) {
      newErrors.apiPort = 'Ports must be different';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 'credentials') {
      if (validateCredentials()) {
        setStep('options');
        if (!nodeName) setNodeName(`Node-${host.split('.').slice(-1)[0]}`);
      }
    } else if (step === 'options') {
      if (validateOptions()) {
        startInstallation();
      }
    }
  };

  const handleBack = () => {
    if (step === 'options') setStep('credentials');
  };

  const startInstallation = () => {
    setStep('installing');
    setProgress(0);
    setInstallLog([]);

    const logs = [
      'Connecting to server...',
      `Connected to ${host}:${port}`,
      'Checking system requirements...',
      'System: Ubuntu 22.04 LTS',
      installDocker ? 'Installing Docker...' : 'Skipping Docker installation',
      installDocker ? 'Docker installed successfully' : '',
      'Downloading Marzban Node...',
      'Extracting files...',
      'Configuring node service...',
      `Setting service port: ${servicePort}`,
      `Setting API port: ${apiPort}`,
      startNode ? 'Starting Marzban Node service...' : 'Node service configured but not started',
      startNode ? 'Node service started' : '',
      'Verifying connection...',
      'Installation complete!'
    ].filter(Boolean);

    let currentLog = 0;
    const interval = setInterval(() => {
      if (currentLog < logs.length) {
        setInstallLog(prev => [...prev, logs[currentLog]]);
        setProgress(((currentLog + 1) / logs.length) * 100);
        currentLog++;
      } else {
        clearInterval(interval);
        setTimeout(() => setStep('complete'), 500);
      }
    }, 500);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setStep('credentials');
      setHost('');
      setPort('22');
      setUsername('root');
      setPassword('');
      setNodeName('');
      setServicePort('62050');
      setApiPort('62051');
      setInstallDocker(true);
      setStartNode(true);
      setErrors({});
      setProgress(0);
      setInstallLog([]);
    }, 300);
  };

  const handleComplete = () => {
    toast.success(`Node "${nodeName}" installed successfully`);
    handleClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            SSH Node Installation
          </DialogTitle>
          <DialogDescription>
            Install Marzban Node on a remote server via SSH
          </DialogDescription>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 py-4">
          {steps.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                index < currentStepIndex ? "bg-accent text-accent-foreground" :
                index === currentStepIndex ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              )}>
                {index < currentStepIndex ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-8 h-0.5 mx-1",
                  index < currentStepIndex ? "bg-accent" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Credentials */}
          {step === 'credentials' && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-2"
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="host">SSH Host *</Label>
                  <Input
                    id="host"
                    placeholder="192.168.1.100"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className={cn(errors.host && 'border-destructive')}
                  />
                  {errors.host && <p className="text-xs text-destructive">{errors.host}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sshPort">Port *</Label>
                  <Input
                    id="sshPort"
                    type="number"
                    placeholder="22"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className={cn(errors.port && 'border-destructive')}
                  />
                  {errors.port && <p className="text-xs text-destructive">{errors.port}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sshUsername">Username *</Label>
                <Input
                  id="sshUsername"
                  placeholder="root"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={cn(errors.username && 'border-destructive')}
                />
                {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sshPassword">Password *</Label>
                <div className="relative">
                  <Input
                    id="sshPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(errors.password && 'border-destructive', 'pr-10')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
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
              className="space-y-4 py-2"
            >
              <div className="space-y-2">
                <Label htmlFor="nodeName">Node Name *</Label>
                <Input
                  id="nodeName"
                  placeholder="DE-Node-1"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className={cn(errors.nodeName && 'border-destructive')}
                />
                {errors.nodeName && <p className="text-xs text-destructive">{errors.nodeName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="installServicePort">Service Port *</Label>
                  <Input
                    id="installServicePort"
                    type="number"
                    placeholder="62050"
                    value={servicePort}
                    onChange={(e) => setServicePort(e.target.value)}
                    className={cn(errors.servicePort && 'border-destructive')}
                  />
                  {errors.servicePort && <p className="text-xs text-destructive">{errors.servicePort}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installApiPort">API Port *</Label>
                  <Input
                    id="installApiPort"
                    type="number"
                    placeholder="62051"
                    value={apiPort}
                    onChange={(e) => setApiPort(e.target.value)}
                    className={cn(errors.apiPort && 'border-destructive')}
                  />
                  {errors.apiPort && <p className="text-xs text-destructive">{errors.apiPort}</p>}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="installDocker"
                    checked={installDocker}
                    onCheckedChange={(checked) => setInstallDocker(checked as boolean)}
                  />
                  <Label htmlFor="installDocker" className="text-sm cursor-pointer">
                    Install Docker if not present
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="startNode"
                    checked={startNode}
                    onCheckedChange={(checked) => setStartNode(checked as boolean)}
                  />
                  <Label htmlFor="startNode" className="text-sm cursor-pointer">
                    Start node service after installation
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
              className="space-y-4 py-2"
            >
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="bg-muted rounded-lg p-4 h-48 overflow-y-auto font-mono text-xs custom-scrollbar">
                {installLog.map((log, index) => (
                  <div key={index} className="flex items-start gap-2 py-0.5">
                    <span className="text-accent">$</span>
                    <span className="text-foreground">{log}</span>
                  </div>
                ))}
                {step === 'installing' && (
                  <div className="flex items-center gap-2 py-0.5 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center"
            >
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                Installation Complete!
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Node "{nodeName}" has been installed successfully.
              </p>
              
              <div className="bg-muted rounded-lg p-4 text-left space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Address</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-foreground">{host}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(host)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Service Port</span>
                  <span className="text-sm font-mono text-foreground">{servicePort}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">API Port</span>
                  <span className="text-sm font-mono text-foreground">{apiPort}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="gap-2">
          {step === 'credentials' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleNext} className="gap-2">
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          {step === 'options' && (
            <>
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button onClick={handleNext} className="gap-2">
                Install Node
                <Terminal className="w-4 h-4" />
              </Button>
            </>
          )}
          {step === 'installing' && (
            <Button variant="outline" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Installing...
            </Button>
          )}
          {step === 'complete' && (
            <Button onClick={handleComplete}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
