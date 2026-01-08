/**
 * Node API Endpoints
 */

import { apiClient } from './client';
import type {
    Node,
    CreateNodeRequest,
    UpdateNodeRequest,
    AssignTemplatesRequest,
    NodeLogsResponse,
    DeleteNodeOptions,
    DeleteNodeResponse,
} from '@/types';

// ============= Nodes CRUD =============

export const getNodes = (panelId: string, sync: boolean = true): Promise<Node[]> => {
    return apiClient.get(`/api/panels/${panelId}/nodes`, { params: { sync } });
};

// ============= Node Status Sync =============

export interface SyncNodesResponse {
    updated: number;
    errors?: string[];
    error?: string;
}

export const syncNodeStatuses = (panelId: string): Promise<SyncNodesResponse> => {
    return apiClient.post(`/api/panels/${panelId}/nodes/sync`);
};

export const getNode = (panelId: string, nodeId: number): Promise<Node> => {
    return apiClient.get(`/api/panels/${panelId}/nodes/${nodeId}`);
};

export const createNode = (panelId: string, data: CreateNodeRequest): Promise<Node> => {
    return apiClient.post(`/api/panels/${panelId}/nodes`, data);
};

export const updateNode = (
    panelId: string,
    nodeId: number,
    data: UpdateNodeRequest
): Promise<Node> => {
    return apiClient.put(`/api/panels/${panelId}/nodes/${nodeId}`, data);
};

export const deleteNode = (
    panelId: string, 
    nodeId: number,
    options?: DeleteNodeOptions
): Promise<DeleteNodeResponse> => {
    return apiClient.delete(`/api/panels/${panelId}/nodes/${nodeId}`, {
        data: options ?? { delete_from_marzban: false, delete_from_server: false }
    });
};

// ============= Node Actions =============

export const reconnectNode = (panelId: string, nodeId: number): Promise<SuccessResponse> => {
    return apiClient.post(`/api/panels/${panelId}/nodes/${nodeId}/reconnect`);
};

// ============= Template Assignment =============

export const assignTemplates = (
    panelId: string,
    nodeId: number,
    data: AssignTemplatesRequest
): Promise<SuccessResponse> => {
    return apiClient.put(`/api/panels/${panelId}/nodes/${nodeId}/templates`, data);
};

// ============= Node Logs =============

export const getNodeLogs = (panelId: string, nodeId: number): Promise<NodeLogsResponse> => {
    return apiClient.get(`/api/panels/${panelId}/nodes/${nodeId}/logs`);
};
