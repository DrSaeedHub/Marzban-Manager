import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
import { useUpdateNode } from '@/hooks/use-nodes';
import type { Node } from '@/types';
import { cn } from '@/lib/utils';

interface EditNodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: Node | null;
  panelId: string;
}

export function EditNodeModal({ open, onOpenChange, node, panelId }: EditNodeModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [servicePort, setServicePort] = useState('');
  const [apiPort, setApiPort] = useState('');
  const [usageCoefficient, setUsageCoefficient] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateMutation = useUpdateNode(panelId);

  // Reset form when modal opens
  useEffect(() => {
    if (open && node) {
      setName(node.name);
      setAddress(node.address);
      setServicePort(String(node.service_port));
      setApiPort(String(node.api_port));
      setUsageCoefficient(String(node.usage_coefficient));
      setErrors({});
    }
  }, [open, node]);

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
    if (!validate() || !node) return;

    updateMutation.mutate(
      {
        nodeId: node.id,
        data: {
          name,
          address,
          port: parseInt(servicePort),
          api_port: parseInt(apiPort),
          usage_coefficient: parseFloat(usageCoefficient),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit Node</DialogTitle>
          <DialogDescription>
            Update node configuration
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
            {errors.address && (
              <p className="text-xs text-destructive">{errors.address}</p>
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
              <p className="text-xs text-muted-foreground">Traffic multiplier for this node (default: 1.0)</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
