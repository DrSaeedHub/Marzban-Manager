/**
 * Node Hooks
 * 
 * React Query hooks for node operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
    getNodes,
    getNode,
    createNode,
    updateNode,
    deleteNode,
    reconnectNode,
    assignTemplates,
    getNodeLogs,
    syncNodeStatuses,
} from '@/api/nodes';
import type {
    CreateNodeRequest,
    UpdateNodeRequest,
    AssignTemplatesRequest,
    DeleteNodeOptions,
} from '@/types';
import { toast } from 'sonner';

// ============= Node List =============

export function useNodes(panelId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.nodes.byPanel(panelId!),
        queryFn: () => getNodes(panelId!),
        enabled: !!panelId,
        staleTime: 10 * 1000, // 10 seconds - shorter to keep status fresh
        refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    });
}

// ============= Sync Node Statuses =============

export function useSyncNodeStatuses(panelId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => syncNodeStatuses(panelId),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.nodes.byPanel(panelId) });
            if (result.updated > 0) {
                toast.success(`Synced ${result.updated} node${result.updated !== 1 ? 's' : ''}`);
            } else {
                toast.info('Node statuses are up to date');
            }
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to sync nodes';
            toast.error(message);
        },
    });
}

// ============= Node Detail =============

export function useNode(panelId: string | undefined, nodeId: number | undefined) {
    return useQuery({
        queryKey: queryKeys.nodes.detail(panelId!, nodeId!),
        queryFn: () => getNode(panelId!, nodeId!),
        enabled: !!panelId && !!nodeId,
        staleTime: 15 * 1000, // 15 seconds
    });
}

// ============= Node Logs =============

export function useNodeLogs(panelId: string | undefined, nodeId: number | undefined) {
    return useQuery({
        queryKey: queryKeys.nodes.logs(panelId!, nodeId!),
        queryFn: () => getNodeLogs(panelId!, nodeId!),
        enabled: !!panelId && !!nodeId,
        staleTime: 5 * 1000, // 5 seconds - logs should refresh frequently
    });
}

// ============= Create Node =============

export function useCreateNode(panelId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateNodeRequest) => createNode(panelId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.nodes.byPanel(panelId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.panels.detail(panelId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
            toast.success('Node created successfully');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to create node';
            toast.error(message);
        },
    });
}

// ============= Update Node =============

export function useUpdateNode(panelId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ nodeId, data }: { nodeId: number; data: UpdateNodeRequest }) =>
            updateNode(panelId, nodeId, data),
        onSuccess: (_, { nodeId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.nodes.byPanel(panelId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.nodes.detail(panelId, nodeId) });
            toast.success('Node updated successfully');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to update node';
            toast.error(message);
        },
    });
}

// ============= Delete Node =============

export function useDeleteNode(panelId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ nodeId, options }: { nodeId: number; options?: DeleteNodeOptions }) => 
            deleteNode(panelId, nodeId, options),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.nodes.byPanel(panelId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.panels.detail(panelId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
            
            // Build success message based on what was deleted
            const deletedFrom: string[] = [];
            if (result.local) deletedFrom.push('local database');
            if (result.marzban) deletedFrom.push('Marzban panel');
            if (result.server) deletedFrom.push('node server');
            
            if (deletedFrom.length > 0) {
                toast.success(`Node deleted from: ${deletedFrom.join(', ')}`);
            }
            
            // Show warnings for any errors
            if (result.errors && result.errors.length > 0) {
                result.errors.forEach(error => toast.warning(error));
            }
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to delete node';
            toast.error(message);
        },
    });
}

// ============= Reconnect Node =============

export function useReconnectNode(panelId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (nodeId: number) => reconnectNode(panelId, nodeId),
        onSuccess: (_, nodeId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.nodes.byPanel(panelId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.nodes.detail(panelId, nodeId) });
            toast.success('Node reconnected successfully');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to reconnect node';
            toast.error(message);
        },
    });
}

// ============= Assign Templates =============

export function useAssignTemplates(panelId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ nodeId, data }: { nodeId: number; data: AssignTemplatesRequest }) =>
            assignTemplates(panelId, nodeId, data),
        onSuccess: (_, { nodeId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.nodes.byPanel(panelId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.nodes.detail(panelId, nodeId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
            toast.success('Templates assigned successfully');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to assign templates';
            toast.error(message);
        },
    });
}
