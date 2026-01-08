import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Download, Copy, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { mockPanels } from '@/lib/mock-data';
import { toast } from 'sonner';

export default function PanelSettingsTab() {
  const { panelId } = useParams<{ panelId: string }>();
  const navigate = useNavigate();
  const panel = mockPanels.find(p => p.id === panelId);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleCopyCertificate = () => {
    if (panel.certificate) {
      navigator.clipboard.writeText(panel.certificate);
      toast.success('Certificate copied to clipboard');
    }
  };

  const handleDownloadCertificate = () => {
    if (panel.certificate) {
      const blob = new Blob([panel.certificate], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ssl_client_cert.pem';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Certificate downloaded');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-heading font-semibold text-foreground">Panel Settings</h2>

      {/* Connection Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border p-6 space-y-4"
      >
        <h3 className="text-sm font-medium text-foreground">Connection Details</h3>
        
        <div className="grid gap-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-muted-foreground">Panel URL</Label>
            <div className="col-span-2">
              <Input value={panel.url} disabled className="bg-muted" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-muted-foreground">Username</Label>
            <div className="col-span-2">
              <Input value={panel.username} disabled className="bg-muted" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-muted-foreground">Password</Label>
            <div className="col-span-2 flex gap-2">
              <div className="relative flex-1">
                <Input 
                  type={showPassword ? 'text' : 'password'} 
                  value="••••••••" 
                  disabled 
                  className="bg-muted pr-10" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-muted-foreground">Status</Label>
            <div className="col-span-2">
              <StatusBadge status={panel.status} />
            </div>
          </div>
          
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-muted-foreground">Last Token</Label>
            <div className="col-span-2 text-sm text-foreground">
              {panel.lastSync ? new Date(panel.lastSync).toLocaleString() : 'Never'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* TLS Certificate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border p-6 space-y-4"
      >
        <h3 className="text-sm font-medium text-foreground">TLS Certificate</h3>
        
        {panel.certificate ? (
          <>
            <p className="text-sm text-muted-foreground">ssl_client_cert.pem</p>
            <div className="bg-muted rounded-lg p-4">
              <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                {showCertificate 
                  ? panel.certificate 
                  : panel.certificate.substring(0, 50) + '...'
                }
              </pre>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadCertificate}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyCertificate}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowCertificate(!showCertificate)}
                className="gap-2"
              >
                {showCertificate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showCertificate ? 'Hide' : 'Show'}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No certificate available</p>
        )}
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl border border-destructive/30 p-6 space-y-4"
      >
        <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
        
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-2"
            onClick={() => setShowDisconnectModal(true)}
          >
            <RefreshCw className="w-4 h-4" />
            Disconnect Panel
          </Button>
          <Button 
            variant="destructive"
            className="gap-2"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="w-4 h-4" />
            Delete Panel
          </Button>
        </div>
      </motion.div>

      <DeleteConfirmModal
        open={showDisconnectModal}
        onOpenChange={setShowDisconnectModal}
        title="Disconnect Panel"
        description={`Are you sure you want to disconnect "${panel.name}"?`}
        details={["Panel will be disconnected but configuration preserved", "You can reconnect later"]}
        onConfirm={() => { toast.success(`Panel "${panel.name}" disconnected`); setShowDisconnectModal(false); }}
      />

      <DeleteConfirmModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Panel"
        description={`Are you sure you want to delete "${panel.name}"?`}
        details={["All panel data will be removed", "This action cannot be undone"]}
        onConfirm={() => { toast.success(`Panel "${panel.name}" deleted`); navigate('/panels'); }}
      />
    </div>
  );
}
