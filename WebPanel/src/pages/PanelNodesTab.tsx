import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Terminal, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  RefreshCw,
  FileCode,
  Eye,
  Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/common/StatusBadge';
import { mockNodes, Node } from '@/lib/mock-data';
import { AddNodeModal } from '@/components/modals/AddNodeModal';
import { EditNodeModal } from '@/components/modals/EditNodeModal';
import { NodeDetailDrawer } from '@/components/modals/NodeDetailDrawer';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { SSHInstallModal } from '@/components/modals/SSHInstallModal';
import { AssignTemplatesModal } from '@/components/modals/AssignTemplatesModal';
import { toast } from 'sonner';

export default function PanelNodesTab() {
  const { panelId } = useParams<{ panelId: string }>();
  const nodes = mockNodes[panelId || ''] || [];
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSSHModalOpen, setIsSSHModalOpen] = useState(false);
  const [viewingNode, setViewingNode] = useState<Node | null>(null);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [assigningNode, setAssigningNode] = useState<Node | null>(null);
  const [deletingNode, setDeletingNode] = useState<Node | null>(null);

  const filteredNodes = nodes.filter(node => {
    const matchesSearch = 
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || node.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectNode = (nodeId: number) => {
    setSelectedNodes(prev => 
      prev.includes(nodeId) 
        ? prev.filter(id => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedNodes.length === filteredNodes.length) {
      setSelectedNodes([]);
    } else {
      setSelectedNodes(filteredNodes.map(n => n.id));
    }
  };

  const handleDelete = () => {
    if (deletingNode) {
      toast.success(`Node "${deletingNode.name}" deleted successfully`);
      setDeletingNode(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-heading font-semibold text-foreground">Panel Nodes</h2>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Node
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setIsSSHModalOpen(true)}>
            <Terminal className="w-4 h-4" />
            SSH Install
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="connecting">Connecting</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Nodes Table */}
      {filteredNodes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-xl border border-border"
        >
          <Server className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-heading font-semibold text-foreground">
            No Nodes in This Panel
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Add nodes manually or install via SSH to connect remote servers
          </p>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Node
            </Button>
            <Button variant="outline" className="gap-2">
              <Terminal className="w-4 h-4" />
              SSH Install
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedNodes.length === filteredNodes.length && filteredNodes.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground">Address</TableHead>
                <TableHead className="text-muted-foreground">Port</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Xray</TableHead>
                <TableHead className="text-muted-foreground w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredNodes.map((node) => (
                  <motion.tr
                    key={node.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-border hover:bg-card-hover/30 cursor-pointer"
                    onClick={() => setViewingNode(node)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedNodes.includes(node.id)}
                        onCheckedChange={() => toggleSelectNode(node.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {node.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {node.address}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {node.port}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={node.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {node.xray_version || '-'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingNode(node)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingNode(node)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Node
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            toast.info(`Reconnecting to ${node.name}...`);
                            setTimeout(() => toast.success(`${node.name} reconnected successfully`), 1500);
                          }}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reconnect
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAssigningNode(node)}>
                            <FileCode className="w-4 h-4 mr-2" />
                            Assign Templates
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingNode(node)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
          
          <div className="p-4 border-t border-border text-sm text-muted-foreground">
            Showing {filteredNodes.length} of {nodes.length} nodes
          </div>
        </motion.div>
      )}

      {/* Modals */}
      <AddNodeModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />
      
      <SSHInstallModal
        open={isSSHModalOpen}
        onOpenChange={setIsSSHModalOpen}
      />
      
      <EditNodeModal
        open={!!editingNode}
        onOpenChange={(open) => !open && setEditingNode(null)}
        node={editingNode}
      />
      
      <AssignTemplatesModal
        open={!!assigningNode}
        onOpenChange={(open) => !open && setAssigningNode(null)}
        node={assigningNode}
      />
      
      <NodeDetailDrawer
        open={!!viewingNode}
        onOpenChange={(open) => !open && setViewingNode(null)}
        node={viewingNode}
        onEdit={(node) => { setViewingNode(null); setEditingNode(node); }}
        onDelete={(node) => { setViewingNode(null); setDeletingNode(node); }}
      />
      
      <DeleteConfirmModal
        open={!!deletingNode}
        onOpenChange={(open) => !open && setDeletingNode(null)}
        title="Delete Node"
        description={`Are you sure you want to delete "${deletingNode?.name}"?`}
        details={[
          "The node will be removed from this panel",
          "The actual node service will NOT be uninstalled"
        ]}
        onConfirm={handleDelete}
      />
    </div>
  );
}
