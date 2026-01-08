/**
 * React Query Key Factory
 * 
 * Centralized query key management for consistent caching and invalidation.
 */

export const queryKeys = {
    // Panel queries
    panels: {
        all: ['panels'] as const,
        list: () => [...queryKeys.panels.all, 'list'] as const,
        detail: (id: string) => [...queryKeys.panels.all, 'detail', id] as const,
        certificate: (id: string) => [...queryKeys.panels.all, 'cert', id] as const,
    },

    // Node queries
    nodes: {
        all: ['nodes'] as const,
        byPanel: (panelId: string) => [...queryKeys.nodes.all, 'panel', panelId] as const,
        detail: (panelId: string, nodeId: number) =>
            [...queryKeys.nodes.all, panelId, nodeId] as const,
        logs: (panelId: string, nodeId: number) =>
            [...queryKeys.nodes.all, panelId, nodeId, 'logs'] as const,
    },

    // Template queries
    templates: {
        all: ['templates'] as const,
        list: () => [...queryKeys.templates.all, 'list'] as const,
        detail: (id: string) => [...queryKeys.templates.all, 'detail', id] as const,
    },

    // Xray config queries
    config: {
        byPanel: (panelId: string) => ['config', panelId] as const,
    },

    // Dashboard queries
    dashboard: {
        stats: ['dashboard', 'stats'] as const,
    },

    // SSH installation queries
    sshInstall: {
        status: (jobId: string) => ['ssh-install', jobId] as const,
    },
};
