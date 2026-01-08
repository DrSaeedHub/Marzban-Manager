import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'connected' | 'connecting' | 'error' | 'disabled';
  showLabel?: boolean;
  className?: string;
}

export function StatusBadge({ status, showLabel = true, className }: StatusBadgeProps) {
  const statusConfig = {
    connected: { label: 'Connected', color: 'bg-status-connected' },
    connecting: { label: 'Connecting', color: 'bg-status-connecting' },
    error: { label: 'Error', color: 'bg-status-error' },
    disabled: { label: 'Disabled', color: 'bg-status-disabled' },
  };

  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.div
        animate={status === 'connecting' ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1, repeat: status === 'connecting' ? Infinity : 0 }}
        className={cn("w-2.5 h-2.5 rounded-full", config.color)}
      />
      {showLabel && (
        <span className="text-sm text-muted-foreground">{config.label}</span>
      )}
    </div>
  );
}
