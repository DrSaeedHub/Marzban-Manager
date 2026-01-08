import { useState, useEffect } from 'react';
import { useParams, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil, MoreVertical, RefreshCw, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/common/StatusBadge';
import { mockPanels, formatTimeAgo, Panel } from '@/lib/mock-data';
import { AddPanelModal } from '@/components/modals/AddPanelModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { toast } from 'sonner';

export default function PanelDetailPage() {
  const { panelId } = useParams<{ panelId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const panel = mockPanels.find(p => p.id === panelId);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const getCurrentTab = () => {
    if (location.pathname.includes('/config')) return 'config';
    if (location.pathname.includes('/settings')) return 'settings';
    return 'nodes';
  };

  useEffect(() => {
    // Redirect to nodes tab if at base panel path
    if (location.pathname === `/panels/${panelId}`) {
      navigate(`/panels/${panelId}/nodes`, { replace: true });
    }
  }, [location.pathname, panelId, navigate]);

  if (!panel) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-heading font-semibold text-foreground">Panel not found</h2>
        <Link to="/panels" className="mt-4">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Panels
          </Button>
        </Link>
      </div>
    );
  }

  const handleDelete = () => {
    toast.success(`Panel "${panel.name}" deleted successfully`);
    navigate('/panels');
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link to="/panels" className="inline-flex">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back to Panels
        </Button>
      </Link>

      {/* Panel Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border p-6 card-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <StatusBadge status={panel.status} showLabel={false} />
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                {panel.name}
              </h1>
              <a
                href={panel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                {panel.url}
              </a>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <StatusBadge status={panel.status} />
                <span>{panel.nodeCount} nodes</span>
                <span>Last sync: {formatTimeAgo(panel.lastSync)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toast.info('Reconnecting...')}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reconnect
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Panel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={getCurrentTab()} className="w-full">
        <TabsList className="bg-card border border-border">
          <Link to={`/panels/${panelId}/nodes`}>
            <TabsTrigger value="nodes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Nodes
            </TabsTrigger>
          </Link>
          <Link to={`/panels/${panelId}/config`}>
            <TabsTrigger value="config" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Config
            </TabsTrigger>
          </Link>
          <Link to={`/panels/${panelId}/settings`}>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Settings
            </TabsTrigger>
          </Link>
        </TabsList>
      </Tabs>

      {/* Tab Content */}
      <Outlet />

      {/* Modals */}
      <AddPanelModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        editPanel={panel}
      />
      
      <DeleteConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Delete Panel"
        description={`Are you sure you want to delete "${panel.name}"?`}
        details={[
          "Panel connection and credentials",
          "All node associations (nodes won't be uninstalled)"
        ]}
        onConfirm={handleDelete}
      />
    </div>
  );
}
