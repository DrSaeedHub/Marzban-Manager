import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Server, FileCode, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useDashboardStats, usePanels } from '@/hooks/use-panels';
import { formatTimeAgo } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: panels, isLoading: panelsLoading } = usePanels();

  const totalPanels = stats?.total_panels ?? 0;
  const totalNodes = stats?.total_nodes ?? 0;
  const connectedNodes = stats?.connected_nodes ?? 0;
  const totalTemplates = stats?.total_templates ?? 0;
  const connectionPercentage = totalNodes > 0
    ? Math.round((connectedNodes / totalNodes) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your Marzban infrastructure
          </p>
        </div>
        <Link to="/panels">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Panel
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </>
        ) : (
          <>
            <StatCard
              label="Total Panels"
              value={totalPanels}
              icon={<Server className="w-6 h-6" />}
            />
            <StatCard
              label="Total Nodes"
              value={totalNodes}
              icon={<Server className="w-6 h-6" />}
            />
            <StatCard
              label="Templates"
              value={totalTemplates}
              icon={<FileCode className="w-6 h-6" />}
            />
            <StatCard
              label="Connected Nodes"
              value={`${connectedNodes}`}
              icon={<Server className="w-6 h-6" />}
              trend={{ value: `${connectionPercentage}%`, positive: connectionPercentage > 70 }}
            />
          </>
        )}
      </div>

      {/* Panel Status Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-card rounded-xl border border-border card-shadow"
      >
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-heading font-semibold text-foreground">
            Panel Status Overview
          </h2>
        </div>
        {panelsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : panels && panels.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Panel Name</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Nodes</TableHead>
                <TableHead className="text-muted-foreground">Last Sync</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {panels.map((panel) => (
                <TableRow key={panel.id} className="border-border hover:bg-card-hover/30">
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={panel.status} showLabel={false} />
                      {panel.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={panel.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {panel.node_count}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {panel.status === 'error' ? (
                      <span className="text-destructive">Failed</span>
                    ) : (
                      formatTimeAgo(panel.last_sync)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/panels/${panel.id}/nodes`}>
                      <Button variant="ghost" size="sm" className="gap-1">
                        View <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Server className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No panels configured yet</p>
            <Link to="/panels" className="mt-4">
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Panel
              </Button>
            </Link>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="flex flex-wrap gap-3"
      >
        <Link to="/panels">
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Panel
          </Button>
        </Link>
        <Link to="/templates">
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Template
          </Button>
        </Link>
        <Link to="/panels">
          <Button variant="outline" className="gap-2">
            <Server className="w-4 h-4" />
            View All Nodes
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
