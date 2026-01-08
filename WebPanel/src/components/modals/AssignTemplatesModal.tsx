import { useState, useEffect } from 'react';
import { FileCode, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Node, Template, mockTemplates } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface AssignTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: Node | null;
}

export function AssignTemplatesModal({ open, onOpenChange, node }: AssignTemplatesModalProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  useEffect(() => {
    if (node) {
      setSelectedTemplates(node.assignedTemplates || []);
    }
  }, [node]);

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSave = () => {
    const count = selectedTemplates.length;
    toast.success(`${count} template${count !== 1 ? 's' : ''} assigned to "${node?.name}"`);
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const getProtocolColor = (protocol: string) => {
    switch (protocol) {
      case 'vless': return 'bg-primary/20 text-primary border-primary/30';
      case 'vmess': return 'bg-accent/20 text-accent border-accent/30';
      case 'trojan': return 'bg-status-connecting/20 text-status-connecting border-status-connecting/30';
      case 'shadowsocks': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Assign Templates
          </DialogTitle>
          <DialogDescription>
            Select templates to assign to "{node.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {mockTemplates.map(template => {
                const isSelected = selectedTemplates.includes(template.id);
                return (
                  <div
                    key={template.id}
                    onClick={() => toggleTemplate(template.id)}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30 hover:bg-card-hover/30"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleTemplate(template.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">{template.tag}</span>
                        <Badge variant="outline" className="text-xs">
                          Port {template.port}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={cn("text-xs", getProtocolColor(template.protocol))}>
                          {template.protocol.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.transport.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.security.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Used by {template.usedByNodes} node{template.usedByNodes !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {selectedTemplates.length} of {mockTemplates.length} templates selected
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTemplates(mockTemplates.map(t => t.id))}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTemplates([])}
            >
              Clear All
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
