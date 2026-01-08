import { useState, useEffect, useRef } from 'react';
import { FileText, Download, Trash2, RefreshCw, Search, Pause, Play } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Node } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface NodeLogsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: Node | null;
}

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

// Mock log entries
const generateMockLogs = (nodeName: string): LogEntry[] => {
  const messages = [
    { level: 'info' as const, msg: 'Connection established' },
    { level: 'info' as const, msg: 'Xray core started successfully' },
    { level: 'debug' as const, msg: 'Processing inbound request' },
    { level: 'info' as const, msg: 'User session started' },
    { level: 'warn' as const, msg: 'High memory usage detected' },
    { level: 'info' as const, msg: 'Traffic routing updated' },
    { level: 'error' as const, msg: 'Failed to connect to upstream' },
    { level: 'info' as const, msg: 'Certificate renewed' },
    { level: 'debug' as const, msg: 'Health check passed' },
    { level: 'info' as const, msg: 'Configuration reloaded' },
    { level: 'warn' as const, msg: 'Rate limit approaching' },
    { level: 'info' as const, msg: 'New client connected' },
    { level: 'debug' as const, msg: 'DNS query resolved' },
    { level: 'info' as const, msg: 'Traffic stats updated' },
    { level: 'error' as const, msg: 'TLS handshake failed' },
  ];

  const now = new Date();
  return Array.from({ length: 50 }, (_, i) => {
    const entry = messages[Math.floor(Math.random() * messages.length)];
    const timestamp = new Date(now.getTime() - i * 5000);
    return {
      id: i,
      timestamp: timestamp.toISOString(),
      level: entry.level,
      message: `[${nodeName}] ${entry.msg}`,
    };
  });
};

export function NodeLogsDrawer({ open, onOpenChange, node }: NodeLogsDrawerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open && node) {
      setLogs(generateMockLogs(node.name));
    }
    return () => {
      if (streamRef.current) {
        clearInterval(streamRef.current);
      }
    };
  }, [open, node]);

  useEffect(() => {
    if (isStreaming && open && node) {
      streamRef.current = setInterval(() => {
        const messages = [
          { level: 'info' as const, msg: 'Connection established' },
          { level: 'debug' as const, msg: 'Processing request' },
          { level: 'info' as const, msg: 'Traffic routed successfully' },
        ];
        const entry = messages[Math.floor(Math.random() * messages.length)];
        const newLog: LogEntry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          level: entry.level,
          message: `[${node.name}] ${entry.msg}`,
        };
        setLogs(prev => [newLog, ...prev.slice(0, 99)]);
      }, 3000);
    } else if (streamRef.current) {
      clearInterval(streamRef.current);
    }
    return () => {
      if (streamRef.current) {
        clearInterval(streamRef.current);
      }
    };
  }, [isStreaming, open, node]);

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDownload = () => {
    const content = logs.map(log =>
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${node?.name}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs downloaded');
  };

  const handleClear = () => {
    setLogs([]);
    toast.info('Logs cleared');
  };

  const handleRefresh = () => {
    if (node) {
      setLogs(generateMockLogs(node.name));
      toast.info('Logs refreshed');
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-destructive';
      case 'warn': return 'text-status-connecting';
      case 'info': return 'text-accent';
      case 'debug': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'error': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'warn': return 'bg-status-connecting/20 text-status-connecting border-status-connecting/30';
      case 'info': return 'bg-accent/20 text-accent border-accent/30';
      case 'debug': return 'bg-muted text-muted-foreground border-border';
      default: return '';
    }
  };

  if (!node) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-heading flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Node Logs
          </SheetTitle>
          <SheetDescription>
            Real-time logs for "{node.name}"
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-4 flex-1 overflow-hidden">
          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant={isStreaming ? "default" : "outline"}
              size="sm"
              onClick={() => setIsStreaming(!isStreaming)}
              className="gap-2"
            >
              {isStreaming ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Resume
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} className="gap-2 text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          </div>

          {/* Logs list */}
          <div className="flex-1 bg-muted rounded-lg overflow-hidden">
            <div className="h-full overflow-y-auto p-4 font-mono text-xs custom-scrollbar">
              {filteredLogs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No logs to display
                </div>
              ) : (
                filteredLogs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 py-1 hover:bg-background/50 rounded px-2 -mx-2"
                  >
                    <span className="text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5 py-0", getLevelBadgeVariant(log.level))}
                    >
                      {log.level.toUpperCase()}
                    </Badge>
                    <span className={cn("flex-1", getLevelColor(log.level))}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between text-xs text-muted-foreground py-2 border-t border-border">
            <span>{filteredLogs.length} entries</span>
            <span className="flex items-center gap-2">
              {isStreaming && (
                <>
                  <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  Live streaming
                </>
              )}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
