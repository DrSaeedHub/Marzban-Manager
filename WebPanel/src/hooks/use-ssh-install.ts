/**
 * SSH Installation Hooks
 * 
 * React Query hooks for SSH-based node installation with polling support.
 */

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { startSSHInstall, getSSHInstallStatus } from '@/api/ssh';
import type { SSHInstallRequest, SSHInstallStatusResponse } from '@/types';
import { toast } from 'sonner';

// ============= Start SSH Installation =============

export function useStartSSHInstall(panelId: string) {
    return useMutation({
        mutationFn: (data: SSHInstallRequest) => startSSHInstall(panelId, data),
        onError: (error) => {
            toast.error(`Failed to start installation: ${error.message}`);
        },
    });
}

// ============= SSH Install Status with Polling =============

export function useSSHInstallStatus(jobId: string | null) {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: queryKeys.sshInstall.status(jobId!),
        queryFn: () => getSSHInstallStatus(jobId!),
        enabled: !!jobId,
        refetchInterval: (query) => {
            const data = query.state.data as SSHInstallStatusResponse | undefined;
            // Stop polling when complete or failed
            if (data?.status === 'completed' || data?.status === 'failed') {
                return false;
            }
            return 1000; // Poll every 1 second
        },
        // When installation completes, invalidate relevant queries
        select: (data) => {
            if (data.status === 'completed') {
                // Defer invalidation to avoid issues during render
                setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: queryKeys.nodes.all });
                    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
                }, 0);
            }
            return data;
        },
    });
}

// ============= Combined Hook for SSHInstallModal =============

interface UseSSHInstallOptions {
    panelId: string;
    onComplete?: (result: SSHInstallStatusResponse['result']) => void;
    onError?: (error: string) => void;
}

export function useSSHInstall({ panelId, onComplete, onError }: UseSSHInstallOptions) {
    const startMutation = useStartSSHInstall(panelId);
    const jobId = startMutation.data?.job_id ?? null;
    const statusQuery = useSSHInstallStatus(jobId);

    // Track if callbacks have been called to prevent duplicates
    const completedRef = useRef(false);
    const failedRef = useRef(false);

    const status = statusQuery.data?.status;
    const result = statusQuery.data?.result;
    const error = statusQuery.data?.error;

    // Handle completion/error callbacks in useEffect (NOT during render!)
    useEffect(() => {
        if (status === 'completed' && result && onComplete && !completedRef.current) {
            completedRef.current = true;
            onComplete(result);
        }
    }, [status, result, onComplete]);

    useEffect(() => {
        if (status === 'failed' && error && onError && !failedRef.current) {
            failedRef.current = true;
            onError(error);
        }
    }, [status, error, onError]);

    return {
        // Start installation
        start: startMutation.mutate,
        startAsync: startMutation.mutateAsync,
        isStarting: startMutation.isPending,
        startError: startMutation.error,

        // Status tracking
        jobId,
        status: statusQuery.data?.status ?? null,
        progress: statusQuery.data?.progress ?? 0,
        logs: statusQuery.data?.logs ?? [],
        result: statusQuery.data?.result,
        error: statusQuery.data?.error,

        // Loading states
        isPolling: statusQuery.isFetching && !!jobId,
        isCompleted: status === 'completed',
        isFailed: status === 'failed',
        isRunning: status === 'pending' || status === 'running',

        // Reset for new installation
        reset: () => {
            startMutation.reset();
            completedRef.current = false;
            failedRef.current = false;
        },
    };
}
