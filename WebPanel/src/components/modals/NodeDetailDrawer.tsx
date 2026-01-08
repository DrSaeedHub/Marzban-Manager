import { useState } from 'react';
import { RefreshCw, Trash2, FileText, Pencil } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Node, formatBytes, mockTemplates } from '@/lib/mock-data';
import { NodeLogsDrawer } from './NodeLogsDrawer';
import { toast } from 'sonner';

interface NodeDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: Node | null;
  onEdit?: (node: Node) => void;
  onDelete?: (node: Node) => void;
}

export function NodeDetailDrawer({ open, onOpenChange, node, onEdit, onDelete }: NodeDetailDrawerProps) {
  const [showLogs, setShowLogs] = useState(false);
  
  if (!node) return null;

  const assignedTemplates = mockTemplates.filter(t => 
    node.assignedTemplates.includes(t.id)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <StatusBadge status={node.status} showLabel={false} />
            <div>
              <SheetTitle className="font-heading">{node.name}</SheetTitle>
              <SheetDescription className="font-mono">{node.address}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Connection Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Connection Information</h3>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={node.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Address</span>
                <span className="text-sm font-mono text-foreground">{node.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Service Port</span>
                <span className="text-sm text-foreground">{node.port}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">API Port</span>
                <span className="text-sm text-foreground">{node.api_port}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Xray Version</span>
                <span className="text-sm text-foreground">{node.xray_version || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Usage Coefficient</span>
                <span className="text-sm text-foreground">{node.usage_coefficient}x</span>
              </div>
            </div>
            
            {node.message && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
                {node.message}
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Assigned Templates */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Assigned Templates</h3>
            {assignedTemplates.length > 0 ? (
              <div className="space-y-2">
                {assignedTemplates.map(template => (
                  <div 
                    key={template.id}
                    className="bg-muted rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{template.tag}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.protocol.toUpperCase()} • {template.transport.toUpperCase()} • {template.security.toUpperCase()}
                      </p>
                    </div>
                    <Badge variant="outline">{template.port}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No templates assigned</p>
            )}
          </div>
          
          <Separator />
          
          {/* Usage Statistics */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Usage Statistics</h3>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Uplink</span>
                <span className="text-sm text-foreground">{formatBytes(node.uplink)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Downlink</span>
                <span className="text-sm text-foreground">{formatBytes(node.downlink)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-sm font-medium text-foreground">
                  {formatBytes(node.uplink + node.downlink)}
                </span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => setShowLogs(true)}
            >
              <FileText className="w-4 h-4" />
              View Logs
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => onEdit?.(node)}
            >
              <Pencil className="w-4 h-4" />
              Edit Node
            </Button>
            <Button 
              variant="destructive" 
              className="w-full justify-start gap-2"
              onClick={() => onDelete?.(node)}
            >
              <Trash2 className="w-4 h-4" />
              Delete Node
            </Button>
          </div>
        </div>
      </SheetContent>
      
      <NodeLogsDrawer
        open={showLogs}
        onOpenChange={setShowLogs}
        node={node}
      />
    </Sheet>
  );
}
