import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddNodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddNodeModal({ open, onOpenChange }: AddNodeModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [servicePort, setServicePort] = useState('62050');
  const [apiPort, setApiPort] = useState('62051');
  const [usageCoefficient, setUsageCoefficient] = useState('1.0');
  const [addAsNewHost, setAddAsNewHost] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    
    toast.success('Node added successfully');
    onOpenChange(false);
    
    // Reset form
    setName('');
    setAddress('');
    setServicePort('62050');
    setApiPort('62051');
    setUsageCoefficient('1.0');
    setAddAsNewHost(true);
    setErrors({});
  };

  const handleClose = () => {
    onOpenChange(false);
    setName('');
    setAddress('');
    setServicePort('62050');
    setApiPort('62051');
    setUsageCoefficient('1.0');
    setAddAsNewHost(true);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Add Node Manually</DialogTitle>
          <DialogDescription>
            Add a new node to this panel
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Node Name */}
          <div className="space-y-2">
            <Label htmlFor="nodeName">Node Name *</Label>
            <Input
              id="nodeName"
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
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
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
              <Label htmlFor="servicePort">Service Port *</Label>
              <Input
                id="servicePort"
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
              <Label htmlFor="apiPort">API Port *</Label>
              <Input
                id="apiPort"
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
            <Label htmlFor="usageCoefficient">Usage Coefficient</Label>
            <Input
              id="usageCoefficient"
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
              <p className="text-xs text-muted-foreground">Traffic multiplier for this node (default: 1.0)</p>
            )}
          </div>
          
          {/* Add as New Host */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="addAsNewHost"
              checked={addAsNewHost}
              onCheckedChange={(checked) => setAddAsNewHost(checked as boolean)}
            />
            <Label htmlFor="addAsNewHost" className="text-sm">
              Add as new host for every inbound
            </Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Add Node
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
