/**
 * Xray Config Hooks
 * 
 * React Query hooks for Xray configuration operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
    getXrayConfig,
    updateXrayConfig,
    restartXrayCore,
} from '@/api/xray-config';
import type { UpdateXrayConfigRequest } from '@/types';
import { toast } from 'sonner';

// ============= Get Xray Config =============

export function useXrayConfig(panelId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.config.byPanel(panelId!),
        queryFn: () => getXrayConfig(panelId!),
        enabled: !!panelId,
        staleTime: 0, // Always fetch fresh to avoid conflicts
    });
}

// ============= Update Xray Config =============

export function useUpdateXrayConfig(panelId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateXrayConfigRequest) => updateXrayConfig(panelId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.config.byPanel(panelId) });
            toast.success('Configuration saved successfully');
        },
    });
}

// ============= Restart Xray Core =============

export function useRestartXrayCore(panelId: string) {
    return useMutation({
        mutationFn: () => restartXrayCore(panelId),
        onSuccess: () => {
            toast.success('Xray core restarted successfully');
        },
        onError: () => {
            toast.error('Failed to restart Xray core');
        },
    });
}
