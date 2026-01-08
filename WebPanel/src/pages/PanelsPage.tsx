import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Server, MoreVertical, Pencil, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { StatusBadge } from '@/components/common/StatusBadge';
import { mockPanels, mockNodes, formatTimeAgo, Panel } from '@/lib/mock-data';
import { AddPanelModal } from '@/components/modals/AddPanelModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { toast } from 'sonner';

export default function PanelsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [deletingPanel, setDeletingPanel] = useState<Panel | null>(null);

  const filteredPanels = mockPanels
    .filter(panel => {
      const matchesSearch = 
        panel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        panel.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || panel.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'nodes':
          return b.nodeCount - a.nodeCount;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  const handleReconnect = (panel: Panel) => {
    toast.info(`Reconnecting to ${panel.name}...`);
    setTimeout(() => {
      toast.success(`Successfully reconnected to ${panel.name}`);
    }, 1500);
  };

  const handleDelete = () => {
    if (deletingPanel) {
      toast.success(`Panel "${deletingPanel.name}" deleted successfully`);
      setDeletingPanel(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Marzban Panels</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Marzban panel connections
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Panel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search panels..."
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
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="nodes">Node Count</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Panel Cards */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredPanels.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <Server className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-heading font-semibold text-foreground">
                No Panels Found
              </h3>
              <p className="text-muted-foreground mt-1 max-w-sm">
                {searchQuery || statusFilter !== 'all' 
                  ? "Try adjusting your search or filter criteria"
                  : "Add your first Marzban panel to get started"
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => setIsAddModalOpen(true)} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Add Panel
                </Button>
              )}
            </motion.div>
          ) : (
            filteredPanels.map((panel, index) => (
              <motion.div
                key={panel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="bg-card rounded-xl border border-border p-5 card-shadow hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <StatusBadge status={panel.status} showLabel={false} />
                    <div>
                      <Link 
                        to={`/panels/${panel.id}/nodes`}
                        className="text-lg font-heading font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {panel.name}
                      </Link>
                      <a 
                        href={panel.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-0.5"
                      >
                        {panel.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      
                      {/* Stats Row */}
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                        <span className="text-muted-foreground">
                          Nodes: <span className="text-foreground font-medium">{panel.nodeCount}</span>
                        </span>
                        <StatusBadge status={panel.status} />
                        <span className="text-muted-foreground">
                          Last sync: {panel.status === 'error' ? (
                            <span className="text-destructive">Failed</span>
                          ) : (
                            <span className="text-foreground">{formatTimeAgo(panel.lastSync)}</span>
                          )}
                        </span>
                      </div>
                      
                      {panel.statusMessage && (
                        <p className="text-sm text-destructive mt-2">
                          {panel.statusMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link to={`/panels/${panel.id}/nodes`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingPanel(panel)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleReconnect(panel)}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reconnect
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeletingPanel(panel)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AddPanelModal 
        open={isAddModalOpen || !!editingPanel} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setEditingPanel(null);
          }
        }}
        editPanel={editingPanel}
      />
      
      <DeleteConfirmModal
        open={!!deletingPanel}
        onOpenChange={(open) => !open && setDeletingPanel(null)}
        title="Delete Panel"
        description={`Are you sure you want to delete "${deletingPanel?.name}"?`}
        details={[
          "Panel connection and credentials",
          "All node associations (nodes won't be uninstalled)"
        ]}
        onConfirm={handleDelete}
      />
    </div>
  );
}
