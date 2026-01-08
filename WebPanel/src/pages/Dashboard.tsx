import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Server, FileCode, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { 
  mockPanels, 
  mockTemplates, 
  getTotalNodes, 
  getConnectedNodes,
  formatTimeAgo 
} from '@/lib/mock-data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Dashboard() {
  const totalPanels = mockPanels.length;
  const totalNodes = getTotalNodes();
  const connectedNodes = getConnectedNodes();
  const connectionPercentage = Math.round((connectedNodes / totalNodes) * 100);

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
        <StatCard
          label="Total Panels"
          value={totalPanels}
          icon={<Server className="w-6 h-6" />}
          trend={{ value: '+1 new', positive: true }}
        />
        <StatCard
          label="Total Nodes"
          value={totalNodes}
          icon={<Server className="w-6 h-6" />}
          trend={{ value: '+3 new', positive: true }}
        />
        <StatCard
          label="Templates"
          value={mockTemplates.length}
          icon={<FileCode className="w-6 h-6" />}
        />
        <StatCard
          label="Connected Nodes"
          value={`${connectedNodes}`}
          icon={<Server className="w-6 h-6" />}
          trend={{ value: `${connectionPercentage}%`, positive: connectionPercentage > 70 }}
        />
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
            {mockPanels.map((panel) => (
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
                  {panel.nodeCount}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {panel.status === 'error' ? (
                    <span className="text-destructive">Failed</span>
                  ) : (
                    formatTimeAgo(panel.lastSync)
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
