/**
 * Panel Hooks
 * 
 * React Query hooks for panel operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
    getDashboardStats,
    getPanels,
    getPanel,
    createPanel,
    updatePanel,
    deletePanel,
    testPanelConnection,
    reconnectPanel,
    disconnectPanel,
    updatePanelCredentials,
    getPanelCertificate,
} from '@/api/panels';
import type {
    CreatePanelRequest,
    UpdatePanelRequest,
    TestPanelConnectionRequest,
    UpdatePanelCredentialsRequest,
} from '@/types';
import { toast } from 'sonner';

// ============= Dashboard Stats =============

export function useDashboardStats() {
    return useQuery({
        queryKey: queryKeys.dashboard.stats,
        queryFn: getDashboardStats,
        staleTime: 30 * 1000, // 30 seconds
    });
}

// ============= Panel List =============

export function usePanels() {
    return useQuery({
        queryKey: queryKeys.panels.list(),
        queryFn: getPanels,
        staleTime: 30 * 1000, // 30 seconds
    });
}

// ============= Panel Detail =============

export function usePanel(id: string | undefined) {
    return useQuery({
        queryKey: queryKeys.panels.detail(id!),
        queryFn: () => getPanel(id!),
        enabled: !!id,
        staleTime: 30 * 1000, // 30 seconds
    });
}

// ============= Panel Certificate =============

export function usePanelCertificate(id: string | undefined) {
    return useQuery({
        queryKey: queryKeys.panels.certificate(id!),
        queryFn: () => getPanelCertificate(id!),
        enabled: !!id,
        staleTime: 60 * 1000, // 1 minute
    });
}

// ============= Create Panel =============

export function useCreatePanel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePanelRequest) => createPanel(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.panels.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
            toast.success('Panel created successfully');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to create panel';
            toast.error(message);
        },
    });
}

// ============= Update Panel =============

export function useUpdatePanel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdatePanelRequest }) =>
            updatePanel(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.panels.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.panels.detail(id) });
            toast.success('Panel updated successfully');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to update panel';
            toast.error(message);
        },
    });
}

// ============= Delete Panel =============

export function useDeletePanel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deletePanel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.panels.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
            toast.success('Panel deleted successfully');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to delete panel';
            toast.error(message);
        },
    });
}

// ============= Test Connection =============

export function useTestPanelConnection() {
    return useMutation({
        mutationFn: (data: TestPanelConnectionRequest) => testPanelConnection(data),
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Connection test failed';
            toast.error(message);
        },
    });
}

// ============= Reconnect Panel =============

export function useReconnectPanel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => reconnectPanel(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.panels.detail(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.panels.list() });
            toast.success('Panel reconnected successfully');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to reconnect panel';
            toast.error(message);
        },
    });
}

// ============= Disconnect Panel =============

export function useDisconnectPanel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => disconnectPanel(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.panels.detail(id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.panels.list() });
            toast.success('Panel disconnected');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to disconnect panel';
            toast.error(message);
        },
    });
}

// ============= Update Credentials =============

export function useUpdatePanelCredentials() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdatePanelCredentialsRequest }) =>
            updatePanelCredentials(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.panels.detail(id) });
            toast.success('Credentials updated successfully');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to update credentials';
            toast.error(message);
        },
    });
}
