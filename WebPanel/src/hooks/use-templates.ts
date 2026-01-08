/**
 * Template Hooks
 * 
 * React Query hooks for template operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import {
    getTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
} from '@/api/templates';
import type {
    CreateTemplateRequest,
    UpdateTemplateRequest,
} from '@/types';
import { toast } from 'sonner';

// ============= Template List =============

export function useTemplates() {
    return useQuery({
        queryKey: queryKeys.templates.list(),
        queryFn: getTemplates,
        staleTime: 60 * 1000, // 1 minute
    });
}

// ============= Template Detail =============

export function useTemplate(id: string | undefined) {
    return useQuery({
        queryKey: queryKeys.templates.detail(id!),
        queryFn: () => getTemplate(id!),
        enabled: !!id,
        staleTime: 60 * 1000, // 1 minute
    });
}

// ============= Create Template =============

export function useCreateTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateTemplateRequest) => createTemplate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
            toast.success('Template created successfully');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to create template';
            toast.error(message);
        },
    });
}

// ============= Update Template =============

export function useUpdateTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateTemplateRequest }) =>
            updateTemplate(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.templates.detail(id) });
            toast.success('Template updated successfully');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to update template';
            toast.error(message);
        },
    });
}

// ============= Delete Template =============

export function useDeleteTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
            toast.success('Template deleted successfully');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to delete template';
            toast.error(message);
        },
    });
}

// ============= Duplicate Template =============

export function useDuplicateTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => duplicateTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
            toast.success('Template duplicated successfully');
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to duplicate template';
            toast.error(message);
        },
    });
}
