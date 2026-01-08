import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Node } from '@/lib/mock-data';

interface EditNodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: Node | null;
}

export function EditNodeModal({ open, onOpenChange, node }: EditNodeModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [servicePort, setServicePort] = useState('');
  const [apiPort, setApiPort] = useState('');
  const [usageCoefficient, setUsageCoefficient] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (node) {
      setName(node.name);
      setAddress(node.address);
      setServicePort(node.port.toString());
      setApiPort(node.api_port.toString());
      setUsageCoefficient(node.usage_coefficient.toString());
      setIsEnabled(node.status !== 'disabled');
    }
  }, [node]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name || name.length < 2 || name.length > 50) {
      newErrors.name = 'Name must be 2-50 characters';
    }
    
    if (!address) {
      newErrors.address = 'Address is required';
    }
    
    const port = parseInt(servicePort);
    if (isNaN(port) || port < 1 || port > 65535) {
      newErrors.servicePort = 'Port must be 1-65535';
    }
    
    const aPort = parseInt(apiPort);
    if (isNaN(aPort) || aPort < 1 || aPort > 65535) {
      newErrors.apiPort = 'Port must be 1-65535';
    }
    
    if (servicePort === apiPort) {
      newErrors.apiPort = 'API port must be different from service port';
    }
    
    const coef = parseFloat(usageCoefficient);
    if (isNaN(coef) || coef <= 0) {
      newErrors.usageCoefficient = 'Must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    
    toast.success(`Node "${name}" updated successfully`);
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setErrors({});
  };

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Node</DialogTitle>
          <DialogDescription>
            Modify node configuration
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Node Name */}
          <div className="space-y-2">
            <Label htmlFor="editNodeName">Node Name *</Label>
            <Input
              id="editNodeName"
              placeholder="DE-Node-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>
          
          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="editAddress">Address *</Label>
            <Input
              id="editAddress"
              placeholder="185.123.45.67"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={cn(errors.address && 'border-destructive')}
            />
            {errors.address ? (
              <p className="text-xs text-destructive">{errors.address}</p>
            ) : (
              <p className="text-xs text-muted-foreground">IP address or hostname of the node server</p>
            )}
          </div>
          
          {/* Ports */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editServicePort">Service Port *</Label>
              <Input
                id="editServicePort"
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
              <Label htmlFor="editApiPort">API Port *</Label>
              <Input
                id="editApiPort"
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
          
          {/* Usage Coefficient */}
          <div className="space-y-2">
            <Label htmlFor="editUsageCoefficient">Usage Coefficient</Label>
            <Input
              id="editUsageCoefficient"
              type="number"
              step="0.1"
              placeholder="1.0"
              value={usageCoefficient}
              onChange={(e) => setUsageCoefficient(e.target.value)}
              className={cn(errors.usageCoefficient && 'border-destructive')}
            />
            {errors.usageCoefficient ? (
              <p className="text-xs text-destructive">{errors.usageCoefficient}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Traffic multiplier for this node</p>
            )}
          </div>
          
          {/* Enable/Disable */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="nodeEnabled" className="text-base cursor-pointer">
                Node Enabled
              </Label>
              <p className="text-xs text-muted-foreground">
                Disable to temporarily stop the node without deleting
              </p>
            </div>
            <Switch
              id="nodeEnabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
