/**
 * Panel API Endpoints
 */

import { apiClient } from './client';
import type {
    Panel,
    CreatePanelRequest,
    UpdatePanelRequest,
    TestPanelConnectionRequest,
    TestPanelConnectionResponse,
    UpdatePanelCredentialsRequest,
    PanelCertificateResponse,
    DashboardStats,
    SuccessResponse,
} from '@/types';

// ============= Dashboard =============

export const getDashboardStats = (): Promise<DashboardStats> => {
    return apiClient.get('/api/dashboard/stats');
};

// ============= Panels CRUD =============

export const getPanels = async (): Promise<Panel[]> => {
    const response = await apiClient.get<{ panels: Panel[] }>('/api/panels');
    return response.panels ?? [];
};

export const getPanel = (id: string): Promise<Panel> => {
    return apiClient.get(`/api/panels/${id}`);
};

export const createPanel = (data: CreatePanelRequest): Promise<Panel> => {
    return apiClient.post('/api/panels', data);
};

export const updatePanel = (id: string, data: UpdatePanelRequest): Promise<Panel> => {
    return apiClient.put(`/api/panels/${id}`, data);
};

export const deletePanel = (id: string): Promise<SuccessResponse> => {
    return apiClient.delete(`/api/panels/${id}`);
};

// ============= Panel Actions =============

export const testPanelConnection = (
    data: TestPanelConnectionRequest
): Promise<TestPanelConnectionResponse> => {
    return apiClient.post('/api/panels/test', data);
};

export const reconnectPanel = (id: string): Promise<SuccessResponse> => {
    return apiClient.post(`/api/panels/${id}/reconnect`);
};

export const disconnectPanel = (id: string): Promise<SuccessResponse> => {
    return apiClient.post(`/api/panels/${id}/disconnect`);
};

// ============= Panel Credentials =============

export const updatePanelCredentials = (
    id: string,
    data: UpdatePanelCredentialsRequest
): Promise<SuccessResponse> => {
    return apiClient.put(`/api/panels/${id}/credentials`, data);
};

// ============= Panel Certificate =============

export const getPanelCertificate = (id: string): Promise<PanelCertificateResponse> => {
    return apiClient.get(`/api/panels/${id}/certificate`);
};
