import { useState } from 'react';
import { AlertTriangle, Loader2, Server, Globe, HardDrive, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { Node, DeleteNodeOptions, DeleteNodeResponse } from '@/types';

interface DeleteNodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: Node | null;
  onConfirm: (options: DeleteNodeOptions) => void;
  isLoading?: boolean;
  result?: DeleteNodeResponse | null;
  onResultClose?: () => void;
}

type StepStatus = 'success' | 'error' | 'skipped' | 'pending';

interface StepResult {
  label: string;
  status: StepStatus;
  error?: string;
}

function getStepIcon(status: StepStatus) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-destructive" />;
    case 'skipped':
      return <MinusCircle className="w-5 h-5 text-muted-foreground" />;
    case 'pending':
      return <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />;
  }
}

export function DeleteNodeModal({
  open,
  onOpenChange,
  node,
  onConfirm,
  isLoading = false,
  result,
  onResultClose,
}: DeleteNodeModalProps) {
  const [deleteFromMarzban, setDeleteFromMarzban] = useState(false);
  const [deleteFromServer, setDeleteFromServer] = useState(false);

  // Determine if we're showing results or confirmation
  const showResults = result !== null && result !== undefined;

  // Reset options when modal opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDeleteFromMarzban(false);
      setDeleteFromServer(false);
      if (showResults && onResultClose) {
        onResultClose();
      }
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    onConfirm({
      delete_from_marzban: deleteFromMarzban,
      delete_from_server: deleteFromServer,
    });
  };

  const handleClose = () => {
    setDeleteFromMarzban(false);
    setDeleteFromServer(false);
    if (onResultClose) {
      onResultClose();
    }
    onOpenChange(false);
  };

  const hasSSHProfile = node?.ssh_profile_id != null;

  // Build steps for results view
  const getSteps = (): StepResult[] => {
    if (!result) return [];

    const steps: StepResult[] = [];

    // Local database deletion (always attempted)
    steps.push({
      label: 'Removed from Marzban Manager',
      status: result.local ? 'success' : 'error',
      error: result.local ? undefined : result.errors?.find(e => e.toLowerCase().includes('local') || e.toLowerCase().includes('database')),
    });

    // Marzban panel deletion
    if (result.marzban !== null && result.marzban !== undefined) {
      steps.push({
        label: 'Deleted from Marzban Panel',
        status: result.marzban ? 'success' : 'error',
        error: result.marzban ? undefined : result.errors?.find(e => e.toLowerCase().includes('marzban')),
      });
    } else if (deleteFromMarzban) {
      // Was requested but returned null - treat as skipped/error
      steps.push({
        label: 'Deleted from Marzban Panel',
        status: 'skipped',
      });
    }

    // Server uninstallation
    if (result.server !== null && result.server !== undefined) {
      steps.push({
        label: 'Uninstalled from Node Server',
        status: result.server ? 'success' : 'error',
        error: result.server ? undefined : result.errors?.find(e => e.toLowerCase().includes('server') || e.toLowerCase().includes('ssh') || e.toLowerCase().includes('uninstall')),
      });
    } else if (deleteFromServer) {
      // Was requested but returned null - treat as skipped/error
      steps.push({
        label: 'Uninstalled from Node Server',
        status: 'skipped',
      });
    }

    return steps;
  };

  const getOverallStatus = (): { text: string; className: string } => {
    if (!result) return { text: '', className: '' };

    const steps = getSteps();
    const hasErrors = steps.some(s => s.status === 'error');
    const allSuccess = steps.every(s => s.status === 'success' || s.status === 'skipped');

    if (allSuccess && !hasErrors) {
      return { text: 'Completed successfully', className: 'text-green-600' };
    } else if (result.local) {
      return { text: 'Completed with warnings', className: 'text-yellow-600' };
    } else {
      return { text: 'Failed', className: 'text-destructive' };
    }
  };

  // Results Phase
  if (showResults) {
    const steps = getSteps();
    const overallStatus = getOverallStatus();

    return (
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-heading">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              Deleting Node "{node?.name}"
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {/* Step Results */}
                <div className="space-y-2 pt-2">
                  {steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      {getStepIcon(step.status)}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          step.status === 'success' ? 'text-foreground' :
                          step.status === 'error' ? 'text-destructive' :
                          'text-muted-foreground'
                        }`}>
                          {step.label}
                        </p>
                        {step.error && (
                          <p className="text-xs text-destructive mt-1 break-words">
                            {step.error}
                          </p>
                        )}
                        {step.status === 'skipped' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Skipped
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Overall Status */}
                <div className="pt-2 border-t">
                  <p className={`text-sm font-medium ${overallStatus.className}`}>
                    {overallStatus.text}
                  </p>
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {result.errors.map((error, idx) => (
                        <p key={idx} className="text-xs text-destructive">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={handleClose}>
              Close
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Confirmation Phase (existing behavior)
  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 font-heading">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete Node
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete <span className="font-semibold text-foreground">"{node?.name}"</span>?
              </p>

              {/* Delete Options */}
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium text-foreground">Delete Options:</p>
                
                {/* Always delete from local (shown as info, not checkbox) */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <HardDrive className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Remove from Marzban Manager
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This will always be applied
                    </p>
                  </div>
                  <Checkbox checked={true} disabled className="mt-0.5" />
                </div>

                {/* Delete from Marzban Panel */}
                <div 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => !isLoading && setDeleteFromMarzban(!deleteFromMarzban)}
                >
                  <Globe className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="delete-marzban" className="text-sm font-medium cursor-pointer">
                      Delete from Marzban Panel
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Remove node from the Marzban panel via API
                    </p>
                  </div>
                  <Checkbox 
                    id="delete-marzban"
                    checked={deleteFromMarzban}
                    onCheckedChange={(checked) => setDeleteFromMarzban(checked === true)}
                    disabled={isLoading}
                    className="mt-0.5"
                  />
                </div>

                {/* Delete from Node Server */}
                <div 
                  className={`flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border transition-colors ${
                    hasSSHProfile && !isLoading
                      ? 'cursor-pointer hover:bg-muted/70' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => hasSSHProfile && !isLoading && setDeleteFromServer(!deleteFromServer)}
                >
                  <Server className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <Label 
                      htmlFor="delete-server" 
                      className={`text-sm font-medium ${hasSSHProfile ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                      Uninstall from Node Server
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {hasSSHProfile 
                        ? 'Remove node software via SSH connection'
                        : 'Not available - No SSH profile linked to this node'
                      }
                    </p>
                  </div>
                  <Checkbox 
                    id="delete-server"
                    checked={deleteFromServer}
                    onCheckedChange={(checked) => setDeleteFromServer(checked === true)}
                    disabled={isLoading || !hasSSHProfile}
                    className="mt-0.5"
                  />
                </div>
              </div>

              {/* Warning */}
              <div className="pt-2">
                <p className="text-destructive text-sm font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Delete Node
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
