import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, FileCode, MoreVertical, Pencil, Copy, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTemplates, useDeleteTemplate, useDuplicateTemplate } from '@/hooks/use-templates';
import { TemplateBuilderModal } from '@/components/modals/TemplateBuilderModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import type { Template } from '@/types';

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<string>('all');
  const [transportFilter, setTransportFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);

  const { data: templates, isLoading } = useTemplates();
  const deleteMutation = useDeleteTemplate();
  const duplicateMutation = useDuplicateTemplate();

  const filteredTemplates = (templates ?? []).filter(template => {
    const matchesSearch = template.tag.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProtocol = protocolFilter === 'all' || template.protocol === protocolFilter;
    const matchesTransport = transportFilter === 'all' || template.transport === transportFilter;
    return matchesSearch && matchesProtocol && matchesTransport;
  });

  const handleDuplicate = (template: Template) => {
    duplicateMutation.mutate(template.id);
  };

  const handleDelete = () => {
    if (deletingTemplate) {
      deleteMutation.mutate(deletingTemplate.id, {
        onSuccess: () => setDeletingTemplate(null),
      });
    }
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

  const getSecurityColor = (security: string) => {
    switch (security) {
      case 'reality': return 'bg-accent/20 text-accent';
      case 'tls': return 'bg-primary/20 text-primary';
      case 'none': return 'bg-status-disabled/20 text-status-disabled';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Configuration Templates</h1>
          <p className="text-muted-foreground mt-1">
            Reusable Xray inbound configurations
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={protocolFilter} onValueChange={setProtocolFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Protocol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Protocols</SelectItem>
            <SelectItem value="vless">VLESS</SelectItem>
            <SelectItem value="vmess">VMess</SelectItem>
            <SelectItem value="trojan">Trojan</SelectItem>
            <SelectItem value="shadowsocks">Shadowsocks</SelectItem>
          </SelectContent>
        </Select>
        <Select value={transportFilter} onValueChange={setTransportFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Transport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transports</SelectItem>
            <SelectItem value="tcp">TCP</SelectItem>
            <SelectItem value="ws">WebSocket</SelectItem>
            <SelectItem value="grpc">gRPC</SelectItem>
            <SelectItem value="httpupgrade">HTTP Upgrade</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Template Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <FileCode className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-heading font-semibold text-foreground">
            No Templates Found
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            {searchQuery || protocolFilter !== 'all' || transportFilter !== 'all'
              ? "Try adjusting your search or filter criteria"
              : "Create reusable Xray configurations to quickly deploy to your panels"
            }
          </p>
          {!searchQuery && protocolFilter === 'all' && transportFilter === 'all' && (
            <Button onClick={() => setIsAddModalOpen(true)} className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="bg-card rounded-xl border border-border p-5 card-shadow hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-heading font-semibold text-foreground">
                    {template.tag}
                  </h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(template)}
                        disabled={duplicateMutation.isPending}
                      >
                        {duplicateMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeletingTemplate(template)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getProtocolColor(template.protocol)}>
                      {template.protocol.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      {template.transport.toUpperCase()}
                    </Badge>
                    <Badge className={getSecurityColor(template.security)}>
                      {template.security.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Port: <span className="text-foreground">{template.port}</span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Used by: <span className="text-foreground">{template.used_by_nodes} nodes</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <TemplateBuilderModal
        open={isAddModalOpen || !!editingTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setEditingTemplate(null);
          }
        }}
        editTemplate={editingTemplate}
      />

      <DeleteConfirmModal
        open={!!deletingTemplate}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
        title="Delete Template"
        description={`Are you sure you want to delete "${deletingTemplate?.tag}"?`}
        details={
          deletingTemplate?.used_by_nodes && deletingTemplate.used_by_nodes > 0
            ? [`This template is currently used by ${deletingTemplate.used_by_nodes} nodes`]
            : undefined
        }
        onConfirm={handleDelete}
        confirmLabel="Delete Template"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
