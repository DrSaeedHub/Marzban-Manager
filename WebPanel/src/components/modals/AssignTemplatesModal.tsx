import { useState, useEffect } from 'react';
import { Loader2, FileCode } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useTemplates } from '@/hooks/use-templates';
import { useAssignTemplates } from '@/hooks/use-nodes';
import type { Node } from '@/types';

interface AssignTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: Node | null;
  panelId: string;
}

export function AssignTemplatesModal({
  open,
  onOpenChange,
  node,
  panelId
}: AssignTemplatesModalProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const assignMutation = useAssignTemplates(panelId);

  // Initialize selected templates when modal opens
  useEffect(() => {
    if (open && node) {
      setSelectedTemplates(node.assigned_templates || []);
    }
  }, [open, node]);

  const handleToggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSubmit = () => {
    if (!node) return;

    assignMutation.mutate(
      {
        nodeId: node.id,
        data: { template_ids: selectedTemplates },
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

  const getProtocolColor = (protocol: string) => {
    switch (protocol) {
      case 'vless': return 'bg-primary/20 text-primary';
      case 'vmess': return 'bg-accent/20 text-accent';
      case 'trojan': return 'bg-status-connecting/20 text-status-connecting';
      case 'shadowsocks': return 'bg-status-disabled/20 text-status-disabled';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Assign Templates</DialogTitle>
          <DialogDescription>
            Select templates to assign to "{node.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[400px] overflow-y-auto">
          {templatesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleToggleTemplate(template.id)}
                >
                  <Checkbox
                    checked={selectedTemplates.includes(template.id)}
                    onCheckedChange={() => handleToggleTemplate(template.id)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{template.tag}</span>
                      <Badge className={getProtocolColor(template.protocol)}>
                        {template.protocol.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {template.transport.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Port: {template.port} • Security: {template.security}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileCode className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No templates available</p>
              <p className="text-sm text-muted-foreground">Create some templates first</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              {selectedTemplates.length} template(s) selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={assignMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={assignMutation.isPending}>
                {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Assignments
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
